<script setup lang="ts">
import { useCartStore, type CustomFittingMeasurements } from '~/stores/cart'
import { useWishlistStore } from '~/stores/wishlist'
import { useAuthStore } from '~/stores/auth'
import { useRecentlyViewed } from '~/composables/useRecentlyViewed'
import { useTracking } from '~/composables/useTracking'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)
const cart = useCartStore()
const wishlist = useWishlistStore()
const auth = useAuthStore()
const { recordView } = useRecentlyViewed()
const { trackViewContent, trackAddToCart } = useTracking()

const savedProfiles = ref<any[]>([])
const selectedSavedProfileId = ref<number | null>(null)

onMounted(async () => {
  await auth.initAuth()
  if (auth.token) {
    try {
      const res = await $fetch<any>(`${apiBase}/user/measurements`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json',
        },
      })
      savedProfiles.value = res.data || []
    } catch (e) {
      // ignore
    }
  }
})

const applySavedProfile = (profileId: number) => {
  const profile = savedProfiles.value.find(p => p.id === profileId)
  if (!profile) return
  measurementUnit.value = profile.unit || 'inches'
  measurements.unit = profile.unit || 'inches'
  measurements.shirt_length = profile.shirt_length
  measurements.shoulder = profile.shoulder
  measurements.chest = profile.chest
  measurements.waist = profile.waist
  measurements.hips = profile.hips
  measurements.sleeve_length = profile.sleeve_length
  measurements.trouser_length = profile.trouser_length
  measurements.trouser_waist = profile.trouser_waist
  measurements.pancha = profile.pancha
  measurements.special_instructions = profile.extra_notes || ''
}

const isInWishlist = computed(() => {
  if (!product.value) return false
  return wishlist.isInWishlist(product.value.id)
})

const handleToggleWishlist = () => {
  if (!product.value) return
  wishlist.toggle(product.value as any)
}

// Fetch product data from API
const { data: productResponse, pending, error } = await useFetch<any>(
  `${apiBase}/products/${slug.value}`,
  {
    lazy: false,
  }
)

const product = computed(() => productResponse.value?.data || null)

// State for active image in mobile gallery
const activeImageIndex = ref(0)

// Active color selection
const selectedColor = ref('')

// Initialize selected color once product loads
watch(
  product,
  (p) => {
    if (p?.variants?.length) {
      const activeVariant = p.variants.find((v: any) => v.is_active && v.size !== 'Custom')
      if (activeVariant) {
        selectedColor.value = activeVariant.color || ''
      }
    }
  },
  { immediate: true }
)

// Unique colors from active variants
const availableColors = computed(() => {
  if (!product.value?.variants) return []
  const map = new Map<string, { color: string; color_hex?: string }>()
  for (const v of product.value.variants) {
    if (v.is_active && v.color && !map.has(v.color)) {
      map.set(v.color, { color: v.color, color_hex: v.color_hex || '#1A1A1A' })
    }
  }
  return Array.from(map.values())
})

// Active size selection
const selectedSize = ref<string>('S')
const sizeError = ref(false)

// Custom Fit toggle & measurement form state
const isCustomFit = ref(false)
const measurementUnit = ref<'inches' | 'cm'>('inches')
const measurements = reactive<CustomFittingMeasurements>({
  unit: 'inches',
  shirt_length: null,
  shoulder: null,
  chest: null,
  waist: null,
  hips: null,
  sleeve_length: null,
  trouser_length: null,
  trouser_waist: null,
  pancha: null,
  special_instructions: '',
})

// Sync measurement unit change
watch(measurementUnit, (u) => {
  measurements.unit = u
})

// Custom Fit Fee
const CUSTOM_FIT_FEE = 300

// Accordion Open/Closed States
const activeAccordions = reactive({
  details: true,
  delivery: false,
  care: false,
})

const toggleAccordion = (key: 'details' | 'delivery' | 'care') => {
  activeAccordions[key] = !activeAccordions[key]
}

// Size Guide Modal State
const sizeGuideOpen = ref(false)
const sizeGuideUnit = ref<'inches' | 'cm'>('inches')

// Standard Size Chart Data
const sizeChart = computed(() => {
  if (sizeGuideUnit.value === 'inches') {
    return [
      { size: 'XS', chest: '34"', waist: '28"', hips: '36"', shoulder: '13.5"', length: '38"' },
      { size: 'S', chest: '36"', waist: '30"', hips: '38"', shoulder: '14"', length: '39"' },
      { size: 'M', chest: '38"', waist: '32"', hips: '41"', shoulder: '14.5"', length: '40"' },
      { size: 'L', chest: '42"', waist: '36"', hips: '45"', shoulder: '15"', length: '41"' },
      { size: 'XL', chest: '45"', waist: '40"', hips: '48"', shoulder: '16"', length: '42"' },
    ]
  } else {
    return [
      { size: 'XS', chest: '86 cm', waist: '71 cm', hips: '91 cm', shoulder: '34 cm', length: '97 cm' },
      { size: 'S', chest: '91 cm', waist: '76 cm', hips: '97 cm', shoulder: '36 cm', length: '99 cm' },
      { size: 'M', chest: '97 cm', waist: '81 cm', hips: '104 cm', shoulder: '37 cm', length: '102 cm' },
      { size: 'L', chest: '107 cm', waist: '91 cm', hips: '114 cm', shoulder: '38 cm', length: '104 cm' },
      { size: 'XL', chest: '114 cm', waist: '102 cm', hips: '122 cm', shoulder: '41 cm', length: '107 cm' },
    ]
  }
})

// Price calculation
const effectiveBasePrice = computed(() => {
  if (!product.value) return 0
  return product.value.sale_price ?? product.value.base_price
})

const finalUnitPrice = computed(() => {
  let price = effectiveBasePrice.value
  if (isCustomFit.value) {
    price += CUSTOM_FIT_FEE
  }
  return price
})

const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')

// Complete the Look Add-ons State (Phase 14)
const selectedAddonSizes = reactive<Record<number, string>>({})
const addedAddonIds = ref<Set<number>>(new Set())

watch(
  product,
  (p) => {
    if (p?.addons?.length) {
      for (const addon of p.addons) {
        if (addon.sizes?.length && !selectedAddonSizes[addon.id]) {
          selectedAddonSizes[addon.id] = addon.sizes[0]
        }
      }
    }
  },
  { immediate: true }
)

const handleAddAddon = (addon: any) => {
  const chosenSize = selectedAddonSizes[addon.id] || addon.sizes?.[0] || 'One Size'
  cart.addAddon({
    addonId: addon.id,
    productId: product.value.id,
    title: addon.title,
    price: addon.price,
    image: addon.image_url,
    size: chosenSize,
  })

  addedAddonIds.value.add(addon.id)
  setTimeout(() => {
    addedAddonIds.value.delete(addon.id)
  }, 2500)
}

// Available sizes for the product
const standardSizes = ['XS', 'S', 'M', 'L', 'XL']

const getVariantForSize = (size: string) => {
  if (!product.value?.variants) return null
  return product.value.variants.find((v: any) => {
    const matchSize = v.size === size
    const matchColor = selectedColor.value ? v.color === selectedColor.value : true
    return matchSize && matchColor && v.is_active
  })
}

const isSizeAvailable = (size: string) => {
  const variant = getVariantForSize(size)
  return Boolean(variant && variant.stock_quantity > 0)
}

// Find matched variant to add
const activeVariant = computed(() => {
  if (!product.value?.variants) return null

  // If custom fit is selected, check if a dedicated Custom variant exists
  if (isCustomFit.value) {
    const customVar = product.value.variants.find((v: any) => v.size === 'Custom' && v.is_active)
    if (customVar) return customVar
  }

  // Otherwise, match the selected size
  return getVariantForSize(selectedSize.value) || product.value.variants[0]
})

// Out of stock evaluation for selected size
const isOutOfStock = computed(() => {
  if (isCustomFit.value) return false
  if (!activeVariant.value) return false
  return activeVariant.value.stock_quantity <= 0
})

// Stock Alert Subscription
const stockAlertContact = ref('')
const stockAlertLoading = ref(false)
const stockAlertSuccess = ref(false)
const stockAlertError = ref('')

const handleStockAlert = async () => {
  if (!stockAlertContact.value.trim() || !activeVariant.value) return
  stockAlertLoading.value = true
  stockAlertError.value = ''
  try {
    await $fetch(`${apiBase}/stock-alerts`, {
      method: 'POST',
      body: {
        product_variant_id: activeVariant.value.id,
        contact: stockAlertContact.value.trim(),
      },
    })
    stockAlertSuccess.value = true
    stockAlertContact.value = ''
  } catch (err: any) {
    stockAlertError.value = err?.data?.message || 'Unable to register stock alert. Please try again.'
  } finally {
    stockAlertLoading.value = false
  }
}

const scrollToStockAlert = () => {
  const el = document.getElementById('stock-alert-section')
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
}

// Reviews & Ratings
const { data: reviewsResponse, refresh: refreshReviews } = await useFetch<any>(
  () => `${apiBase}/products/${slug.value}/reviews`
)
const reviews = computed(() => reviewsResponse.value?.data || [])
const reviewsMeta = computed(() => reviewsResponse.value?.meta || { average_rating: 5, total_reviews: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })

// Related Products
const { data: relatedResponse } = await useFetch<any>(
  () => `${apiBase}/products/${slug.value}/related`
)
const relatedProducts = computed(() => relatedResponse.value?.data || [])

// Record product view into Recently Viewed & fire ViewContent Pixel
watch(
  product,
  (p) => {
    if (p) {
      const primaryImg = p.images?.find((i: any) => i.is_primary)?.image_url || p.images?.[0]?.image_url || p.primary_image
      recordView({
        id: p.id,
        name: p.name,
        slug: p.slug,
        fabric_type: p.fabric_type,
        piece_type: p.piece_type,
        base_price: p.base_price,
        sale_price: p.sale_price,
        primary_image: primaryImg,
        variants: p.variants,
      })

      // Fire Pixel
      trackViewContent({
        id: p.id,
        name: p.name,
        price: p.sale_price ?? p.base_price,
        category: p.category?.name,
        fabric_type: p.fabric_type,
      })
    }
  },
  { immediate: true }
)

// Dynamic OpenGraph & Meta Tags for Social Previews (WhatsApp, Instagram, Search)
useSeoMeta({
  title: () => product.value ? `${product.value.name} | K. Fabrics Minimalist Luxury` : 'Luxury Ready-to-Wear | K. Fabrics',
  description: () => product.value?.description?.slice(0, 160) || 'Pure organic lawn, raw silk co-ords, and bespoke custom stitching across Pakistan.',
  ogTitle: () => product.value ? `${product.value.name} · Rs. ${Number(product.value.sale_price || product.value.base_price).toLocaleString('en-PK')} | K. Fabrics` : 'K. Fabrics Minimalist Luxury',
  ogDescription: () => product.value?.description?.slice(0, 200) || 'Hand-tailored luxury ladies pret with optional custom fitting.',
  ogImage: () => {
    if (!product.value) return 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80'
    const img = product.value.images?.find((i: any) => i.is_primary)?.image_url || product.value.images?.[0]?.image_url || product.value.primary_image
    return img || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80'
  },
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

// Review Form & Lightbox State
const writeReviewOpen = ref(false)
const reviewFilter = ref<'all' | 'photos' | number>('all')
const activePhotoModal = ref<string | null>(null)

const reviewForm = reactive({
  reviewer_name: '',
  rating: 5,
  comment: '',
  order_number: '',
})
const reviewPhotoFile = ref<File | null>(null)
const reviewPhotoPreview = ref<string | null>(null)
const reviewSubmitting = ref(false)
const reviewSuccess = ref(false)
const reviewError = ref('')

watch(
  () => auth.userName,
  (name) => {
    if (name && !reviewForm.reviewer_name) {
      reviewForm.reviewer_name = name
    }
  },
  { immediate: true }
)

const onPhotoSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  if (target.files && target.files[0]) {
    reviewPhotoFile.value = target.files[0]
    reviewPhotoPreview.value = URL.createObjectURL(target.files[0])
  }
}

const removeReviewPhoto = () => {
  reviewPhotoFile.value = null
  if (reviewPhotoPreview.value) {
    URL.revokeObjectURL(reviewPhotoPreview.value)
    reviewPhotoPreview.value = null
  }
}

const submitReview = async () => {
  if (!reviewForm.reviewer_name.trim() || !reviewForm.comment.trim()) {
    reviewError.value = 'Please provide your name and review comment.'
    return
  }
  reviewSubmitting.value = true
  reviewError.value = ''
  try {
    const formData = new FormData()
    formData.append('reviewer_name', reviewForm.reviewer_name.trim())
    formData.append('rating', String(reviewForm.rating))
    formData.append('comment', reviewForm.comment.trim())
    if (reviewForm.order_number.trim()) {
      formData.append('order_number', reviewForm.order_number.trim())
    }
    if (reviewPhotoFile.value) {
      formData.append('photo', reviewPhotoFile.value)
    }

    const headers: Record<string, string> = {}
    if (auth.token) {
      headers['Authorization'] = `Bearer ${auth.token}`
    }

    await $fetch(`${apiBase}/products/${slug.value}/reviews`, {
      method: 'POST',
      body: formData,
      headers,
    })

    reviewSuccess.value = true
    reviewForm.comment = ''
    removeReviewPhoto()
    await refreshReviews()
    setTimeout(() => {
      writeReviewOpen.value = false
      reviewSuccess.value = false
    }, 3000)
  } catch (err: any) {
    reviewError.value = err?.data?.message || 'Failed to submit review. Please try again.'
  } finally {
    reviewSubmitting.value = false
  }
}

const filteredReviews = computed(() => {
  const list = reviews.value
  if (reviewFilter.value === 'all') return list
  if (reviewFilter.value === 'photos') return list.filter((r: any) => Boolean(r.photo_url))
  return list.filter((r: any) => r.rating === reviewFilter.value)
})

// Add to Cart
const handleAddToCart = () => {
  if (!selectedSize.value && !isCustomFit.value) {
    sizeError.value = true
    return
  }
  sizeError.value = false

  if (!product.value || !activeVariant.value) return

  cart.addProduct({
    productId: product.value.id,
    variantId: activeVariant.value.id,
    name: product.value.name,
    slug: product.value.slug,
    size: isCustomFit.value ? 'Custom Fit' : selectedSize.value,
    color: selectedColor.value || activeVariant.value.color,
    price: finalUnitPrice.value,
    image: product.value.primary_image,
    quantity: 1,
    customFitting: isCustomFit.value ? { ...measurements } : null,
  })

  // Pixel AddToCart event
  trackAddToCart({
    productId: product.value.id,
    name: product.value.name,
    price: finalUnitPrice.value,
    quantity: 1,
    size: isCustomFit.value ? 'Custom Fit' : selectedSize.value,
  })
}

// WhatsApp Order
const handleWhatsAppOrder = () => {
  if (!product.value) return
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''
  const sizeText = isCustomFit.value ? 'Custom Tailored Fit' : `Standard ${selectedSize.value}`
  const priceText = formatPrice(finalUnitPrice.value)

  let msg = `Hello K. Fabrics Concierge, I would like to order the following piece:\n\n`
  msg += `• *Product:* ${product.value.name}\n`
  msg += `• *Price:* ${priceText}\n`
  msg += `• *Fabric:* ${product.value.fabric_type} (${product.value.piece_type})\n`
  msg += `• *Size/Fit:* ${sizeText}\n`
  if (selectedColor.value) {
    msg += `• *Color:* ${selectedColor.value}\n`
  }
  if (isCustomFit.value) {
    msg += `• *Custom Fitting Details:* Yes, measurements attached (${measurements.unit})\n`
    if (measurements.chest) msg += `  - Chest: ${measurements.chest} ${measurements.unit}\n`
    if (measurements.waist) msg += `  - Waist: ${measurements.waist} ${measurements.unit}\n`
    if (measurements.shirt_length) msg += `  - Shirt Length: ${measurements.shirt_length} ${measurements.unit}\n`
  }
  msg += `\n*Product Link:* ${currentUrl}\n`
  msg += `Please confirm availability and booking assistance.`

  const encoded = encodeURIComponent(msg)
  window.open(`https://wa.me/923001234567?text=${encoded}`, '_blank')
}
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Loading State -->
    <div v-if="pending" class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div class="lg:col-span-7 space-y-4">
          <div class="aspect-[3/4] bg-brand-border/40 animate-pulse" />
        </div>
        <div class="lg:col-span-5 space-y-6">
          <div class="h-6 w-1/3 bg-brand-border/40 animate-pulse" />
          <div class="h-10 w-3/4 bg-brand-border/40 animate-pulse" />
          <div class="h-8 w-1/4 bg-brand-border/40 animate-pulse" />
          <div class="h-32 bg-brand-border/40 animate-pulse" />
        </div>
      </div>
    </div>

    <!-- Error / Not Found State -->
    <div v-else-if="error || !product" class="max-w-xl mx-auto text-center py-24 px-4">
      <div class="w-16 h-16 mx-auto text-brand-muted/40 mb-4">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 class="font-serif text-2xl font-bold text-brand-charcoal mb-2">Design Piece Not Found</h1>
      <p class="text-xs text-brand-muted mb-6">The luxury garment you are seeking might have been archived or is temporarily out of season.</p>
      <NuxtLink
        to="/shop"
        class="inline-block px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors"
      >
        Return to Shop
      </NuxtLink>
    </div>

    <!-- Product Detail Container -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-8">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <NuxtLink to="/shop" class="hover:text-brand-charcoal transition-colors">Shop</NuxtLink>
        <template v-if="product.category">
          <span>/</span>
          <NuxtLink :to="`/shop?category=${product.category.slug}`" class="hover:text-brand-charcoal transition-colors">
            {{ product.category.name }}
          </NuxtLink>
        </template>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold truncate max-w-[200px] sm:max-w-none">{{ product.name }}</span>
      </nav>

      <!-- 2-Column Split: Left 60% Images | Right 40% Sticky Buy Box -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
        <!-- ================= LEFT: Images Gallery ================= -->
        <div class="lg:col-span-7">
          <!-- Desktop Layout: Vertical Stack of High-Res Images -->
          <div class="hidden lg:flex flex-col space-y-6">
            <div
              v-for="img in product.images"
              :key="img.id"
              class="relative aspect-[3/4] bg-brand-cream overflow-hidden border border-brand-border"
            >
              <img
                :src="img.image_url"
                :alt="img.alt_text || product.name"
                class="w-full h-full object-cover"
                loading="lazy"
              >
            </div>
            <!-- If no images array but primary_image exists -->
            <div
              v-if="!product.images || product.images.length === 0"
              class="relative aspect-[3/4] bg-brand-cream overflow-hidden border border-brand-border"
            >
              <img
                :src="product.primary_image"
                :alt="product.name"
                class="w-full h-full object-cover"
              >
            </div>
          </div>

          <!-- Mobile Layout: Swipeable Carousel with Dot Indicators -->
          <div class="lg:hidden">
            <div class="relative aspect-[3/4] bg-brand-cream overflow-hidden border border-brand-border">
              <img
                v-if="product.images && product.images.length > 0"
                :src="product.images[activeImageIndex]?.image_url || product.primary_image"
                :alt="product.name"
                class="w-full h-full object-cover transition-opacity duration-300"
              >
              <img
                v-else
                :src="product.primary_image"
                :alt="product.name"
                class="w-full h-full object-cover"
              >

              <!-- Carousel Controls if multiple images -->
              <div
                v-if="product.images && product.images.length > 1"
                class="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none"
              >
                <button
                  class="pointer-events-auto p-2 bg-white/80 backdrop-blur-sm text-brand-charcoal hover:bg-white shadow"
                  aria-label="Previous image"
                  @click="activeImageIndex = (activeImageIndex - 1 + product.images.length) % product.images.length"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  class="pointer-events-auto p-2 bg-white/80 backdrop-blur-sm text-brand-charcoal hover:bg-white shadow"
                  aria-label="Next image"
                  @click="activeImageIndex = (activeImageIndex + 1) % product.images.length"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <!-- Indicators -->
              <div
                v-if="product.images && product.images.length > 1"
                class="absolute bottom-3 inset-x-0 flex items-center justify-center space-x-1.5"
              >
                <button
                  v-for="(img, idx) in product.images"
                  :key="img.id"
                  class="w-2 h-2 rounded-full transition-all"
                  :class="[idx === activeImageIndex ? 'bg-brand-charcoal w-5' : 'bg-brand-charcoal/40']"
                  :aria-label="`Slide to image ${idx + 1}`"
                  @click="activeImageIndex = idx"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- ================= RIGHT: Sticky Buy Box (40%) ================= -->
        <div class="lg:col-span-5">
          <div class="sticky top-28 space-y-6 self-start">
            <!-- Header Meta: Fabric Badge & Collection -->
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold">
                {{ product.fabric_type }} · {{ product.piece_type }}
              </span>
              <span
                v-if="product.sale_price"
                class="bg-brand-charcoal text-white text-[9px] uppercase tracking-luxury font-semibold px-2 py-0.5"
              >
                Sale
              </span>
            </div>

            <!-- Product Title -->
            <h1 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal leading-tight">
              {{ product.name }}
            </h1>

            <!-- Price Display -->
            <div class="flex items-baseline space-x-3 border-b border-brand-border pb-6">
              <span class="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
                {{ formatPrice(finalUnitPrice) }}
              </span>
              <span
                v-if="product.sale_price"
                class="line-through text-brand-muted text-sm"
              >
                {{ formatPrice(product.base_price) }}
              </span>
              <span
                v-if="isCustomFit"
                class="text-[11px] text-brand-gold font-medium uppercase tracking-wider"
              >
                (Includes +Rs. 300 Custom Fitting)
              </span>
            </div>

            <!-- Color Swatches (if available) -->
            <div v-if="availableColors.length > 0" class="space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-luxury text-brand-charcoal font-medium">
                  Color: <span class="font-semibold text-brand-charcoal">{{ selectedColor }}</span>
                </span>
              </div>
              <div class="flex items-center space-x-3">
                <button
                  v-for="item in availableColors"
                  :key="item.color"
                  class="w-7 h-7 rounded-full border-2 transition-all p-0.5"
                  :class="[
                    selectedColor === item.color
                      ? 'border-brand-charcoal ring-2 ring-brand-charcoal/30'
                      : 'border-brand-border hover:border-brand-charcoal'
                  ]"
                  :title="item.color"
                  @click="selectedColor = item.color"
                >
                  <span
                    class="block w-full h-full rounded-full border border-black/10"
                    :style="{ backgroundColor: item.color_hex || '#FFFFFF' }"
                  />
                </button>
              </div>
            </div>

            <!-- Size Selector & Size Guide Trigger -->
            <div class="space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-luxury text-brand-charcoal font-medium">
                  Select Size
                </span>
                <button
                  class="text-xs text-brand-charcoal underline underline-offset-4 hover:text-brand-gold transition-colors font-medium"
                  @click="sizeGuideOpen = true"
                >
                  Size Guide
                </button>
              </div>

              <!-- Sharp Size Boxes -->
              <div class="grid grid-cols-5 gap-2">
                <button
                  v-for="size in standardSizes"
                  :key="size"
                  class="py-2.5 sm:py-3 text-xs font-medium uppercase border transition-colors relative flex flex-col items-center justify-center"
                  :class="[
                    selectedSize === size && !isCustomFit
                      ? 'border-brand-charcoal bg-brand-charcoal text-white font-bold'
                      : isSizeAvailable(size)
                        ? 'border-brand-border bg-white text-brand-charcoal hover:border-brand-charcoal'
                        : 'border-brand-border bg-brand-cream/60 text-brand-muted hover:border-brand-charcoal'
                  ]"
                  @click="() => { selectedSize = size; isCustomFit = false; sizeError = false; }"
                >
                  <span>{{ size }}</span>
                  <span
                    v-if="!isSizeAvailable(size)"
                    class="text-[8px] uppercase tracking-tighter"
                    :class="[selectedSize === size && !isCustomFit ? 'text-amber-200' : 'text-amber-700 font-semibold']"
                  >
                    Sold Out
                  </span>
                </button>
              </div>

              <p v-if="sizeError" class="text-xs text-red-600 font-medium">
                Please select a standard size or toggle Custom Fit.
              </p>
            </div>

            <!-- Custom Fit (+Rs. 300) Atelier Toggle -->
            <div class="border border-brand-border p-4 bg-brand-cream/40 transition-colors">
              <div class="flex items-start justify-between cursor-pointer" @click="isCustomFit = !isCustomFit">
                <div class="flex items-start space-x-3">
                  <input
                    id="custom-fit-checkbox"
                    v-model="isCustomFit"
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-brand-charcoal cursor-pointer"
                    @click.stop
                  >
                  <div>
                    <label for="custom-fit-checkbox" class="font-serif text-sm font-bold text-brand-charcoal cursor-pointer flex items-center space-x-2">
                      <span>Bespoke Custom Fit</span>
                      <span class="text-[10px] font-sans font-semibold bg-brand-gold text-white px-2 py-0.5 tracking-luxury">
                        +Rs. 300
                      </span>
                    </label>
                    <p class="text-xs text-brand-muted mt-0.5 leading-relaxed">
                      Hand-tailored to your exact body measurements by our master craftsmen.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Smooth Expandable Measurement Form -->
              <Transition
                enter-active-class="transition duration-300 ease-out"
                enter-from-class="opacity-0 -translate-y-2 max-h-0"
                enter-to-class="opacity-100 translate-y-0 max-h-[1000px]"
                leave-active-class="transition duration-200 ease-in"
                leave-from-class="opacity-100 translate-y-0 max-h-[1000px]"
                leave-to-class="opacity-0 -translate-y-2 max-h-0"
              >
                <div v-if="isCustomFit" class="mt-5 pt-4 border-t border-brand-border space-y-4">
                  <!-- Saved Profile Quick-Fill (if logged in and has profiles) -->
                  <div v-if="savedProfiles.length > 0" class="bg-brand-white p-2.5 border border-brand-border/80">
                    <label class="text-[10px] uppercase tracking-luxury text-brand-gold font-bold block mb-1">
                      Load Saved Measurement Profile
                    </label>
                    <select
                      v-model="selectedSavedProfileId"
                      class="w-full bg-brand-cream/60 border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
                      @change="selectedSavedProfileId && applySavedProfile(selectedSavedProfileId)"
                    >
                      <option :value="null">-- Select a Profile --</option>
                      <option v-for="prof in savedProfiles" :key="prof.id" :value="prof.id">
                        {{ prof.profile_name }} ({{ prof.unit }})
                      </option>
                    </select>
                  </div>

                  <!-- Measurement Unit Toggle -->
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold">
                      Measurement Unit
                    </span>
                    <div class="flex border border-brand-border bg-white text-xs">
                      <button
                        class="px-3 py-1 font-medium transition-colors"
                        :class="[measurementUnit === 'inches' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                        @click="measurementUnit = 'inches'"
                      >
                        Inches
                      </button>
                      <button
                        class="px-3 py-1 font-medium transition-colors"
                        :class="[measurementUnit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                        @click="measurementUnit = 'cm'"
                      >
                        Centimeters
                      </button>
                    </div>
                  </div>

                  <!-- Shirt Fields -->
                  <div>
                    <p class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold mb-2">
                      Shirt Specifications ({{ measurementUnit }})
                    </p>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Length</label>
                        <input
                          v-model.number="measurements.shirt_length"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 40"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Shoulder</label>
                        <input
                          v-model.number="measurements.shoulder"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 14.5"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Chest / Bust</label>
                        <input
                          v-model.number="measurements.chest"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 38"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Waist</label>
                        <input
                          v-model.number="measurements.waist"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 34"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Hips</label>
                        <input
                          v-model.number="measurements.hips"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 42"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Sleeve</label>
                        <input
                          v-model.number="measurements.sleeve_length"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 21"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Trouser Fields -->
                  <div>
                    <p class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold mb-2">
                      Trouser / Shalwar ({{ measurementUnit }})
                    </p>
                    <div class="grid grid-cols-3 gap-2.5">
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Length</label>
                        <input
                          v-model.number="measurements.trouser_length"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 38"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Waist</label>
                        <input
                          v-model.number="measurements.trouser_waist"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 32"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label class="text-[10px] uppercase text-brand-muted block mb-0.5">Pancha</label>
                        <input
                          v-model.number="measurements.pancha"
                          type="number"
                          step="0.5"
                          placeholder="e.g. 6.5"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Extra Notes -->
                  <div>
                    <label class="text-[10px] uppercase text-brand-muted block mb-1">Special Tailoring Instructions</label>
                    <textarea
                      v-model="measurements.special_instructions"
                      rows="2"
                      placeholder="e.g. Boat neckline, bell sleeves, loose silhouette..."
                      class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                    />
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Actions: ADD TO BAG / NOTIFY ME & ORDER VIA WHATSAPP -->
            <div class="space-y-3 pt-2">
              <!-- Out of Stock Back-in-Stock Alert Box -->
              <div
                v-if="isOutOfStock"
                id="stock-alert-section"
                class="p-4 bg-brand-cream border border-brand-border space-y-3 transition-all"
              >
                <div class="flex items-center space-x-2 text-brand-charcoal">
                  <svg class="w-4 h-4 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p class="text-xs font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Size {{ selectedSize }} is Currently Sold Out
                  </p>
                </div>
                <p class="text-[11px] text-brand-muted leading-relaxed">
                  Enter your WhatsApp number or email to receive an instant back-in-stock notification when restocked.
                </p>

                <div v-if="stockAlertSuccess" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Thank you! We will alert you as soon as Size {{ selectedSize }} is back in stock.</span>
                </div>

                <form v-else class="flex flex-col sm:flex-row gap-2" @submit.prevent="handleStockAlert">
                  <input
                    v-model="stockAlertContact"
                    type="text"
                    placeholder="WhatsApp (+923...) or Email address"
                    required
                    class="flex-1 bg-white border border-brand-border px-3 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted focus:outline-none focus:border-brand-gold"
                  >
                  <button
                    type="submit"
                    :disabled="stockAlertLoading"
                    class="px-5 py-2.5 bg-brand-charcoal hover:bg-brand-gold text-white text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-50 shrink-0"
                  >
                    {{ stockAlertLoading ? 'Subscribing...' : 'Notify Me' }}
                  </button>
                </form>
                <p v-if="stockAlertError" class="text-[11px] text-red-600">
                  {{ stockAlertError }}
                </p>
              </div>

              <!-- Standard Add to Bag (When in stock) -->
              <button
                v-else
                class="w-full py-4 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-300 shadow-md flex items-center justify-center space-x-2"
                @click="handleAddToCart"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>Add to Bag</span>
              </button>

              <button
                class="w-full py-3.5 border border-[#25D366] text-brand-charcoal hover:bg-[#25D366] hover:text-white text-xs uppercase tracking-luxury font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                @click="handleWhatsAppOrder"
              >
                <svg class="w-4 h-4 fill-[#25D366] group-hover:fill-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
                <span>Order via WhatsApp</span>
              </button>

              <!-- Save to Wishlist Toggle Button -->
              <button
                type="button"
                class="w-full py-3 border border-brand-border text-brand-charcoal hover:border-brand-charcoal text-xs uppercase tracking-luxury font-medium transition-colors flex items-center justify-center space-x-2"
                @click="handleToggleWishlist"
              >
                <svg
                  class="w-4 h-4 transition-colors"
                  :class="[isInWishlist ? 'fill-brand-gold text-brand-gold' : 'fill-none stroke-current']"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{{ isInWishlist ? 'Saved in Wishlist' : 'Add to Wishlist' }}</span>
              </button>
            </div>

            <!-- "Complete the Look" Cross-Sell Add-Ons (Phase 14) -->
            <div
              v-if="product.addons && product.addons.length > 0"
              class="border border-brand-gold/40 bg-brand-cream/60 p-5 space-y-4 my-6"
            >
              <div class="flex items-center justify-between border-b border-brand-border/60 pb-2.5">
                <div>
                  <span class="text-[9px] uppercase tracking-[0.25em] text-brand-gold font-semibold block">
                    Atelier Styling Pairings
                  </span>
                  <h3 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal">
                    Complete the Look
                  </h3>
                </div>
                <span class="text-[10px] text-brand-muted uppercase tracking-wider font-medium">
                  1-Click Add
                </span>
              </div>

              <div class="divide-y divide-brand-border/60">
                <div
                  v-for="addon in product.addons"
                  :key="addon.id"
                  class="py-3 flex items-center space-x-3 first:pt-0 last:pb-0"
                >
                  <!-- Thumbnail -->
                  <div class="w-14 h-16 bg-white border border-brand-border overflow-hidden shrink-0">
                    <img
                      v-if="addon.image_url"
                      :src="addon.image_url"
                      :alt="addon.title"
                      class="w-full h-full object-cover"
                    >
                    <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-brand-muted">
                      Add-on
                    </div>
                  </div>

                  <!-- Info & Size Selector -->
                  <div class="flex-1 min-w-0 text-xs">
                    <h4 class="font-serif font-bold text-brand-charcoal truncate">
                      {{ addon.title }}
                    </h4>
                    <div class="text-[11px] text-brand-gold font-medium mt-0.5">
                      {{ formatPrice(addon.price) }}
                    </div>

                    <!-- Size options if footwear / khussa -->
                    <div v-if="addon.sizes && addon.sizes.length > 0" class="flex items-center space-x-1 mt-1.5 flex-wrap gap-y-1">
                      <span class="text-[9px] uppercase text-brand-muted mr-1">Size:</span>
                      <button
                        v-for="sz in addon.sizes"
                        :key="sz"
                        type="button"
                        class="px-1.5 py-0.5 text-[10px] border transition-colors"
                        :class="[
                          selectedAddonSizes[addon.id] === sz
                            ? 'border-brand-charcoal bg-brand-charcoal text-white font-medium'
                            : 'border-brand-border bg-white text-brand-charcoal hover:border-brand-gold'
                        ]"
                        @click="selectedAddonSizes[addon.id] = sz"
                      >
                        {{ sz }}
                      </button>
                    </div>
                  </div>

                  <!-- 1-Click Add Button -->
                  <button
                    type="button"
                    class="shrink-0 px-3.5 py-2 text-[10px] uppercase tracking-luxury font-medium transition-colors"
                    :class="[
                      addedAddonIds.has(addon.id)
                        ? 'bg-green-700 text-white'
                        : 'bg-brand-charcoal text-white hover:bg-brand-gold'
                    ]"
                    @click="handleAddAddon(addon)"
                  >
                    <span v-if="addedAddonIds.has(addon.id)">✓ Added</span>
                    <span v-else>+ Add</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- Collapsible Luxury Accordions -->
            <div class="border-t border-brand-border divide-y divide-brand-border pt-4">
              <!-- 1. Fabric & Product Details -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  @click="toggleAccordion('details')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Fabric & Product Details
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.details ? '−' : '+' }}
                  </span>
                </button>
                <div v-show="activeAccordions.details" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-2">
                  <p>{{ product.description }}</p>
                  <ul class="list-disc pl-4 space-y-1 text-brand-charcoal">
                    <li><strong class="font-medium">Fabric:</strong> Pure {{ product.fabric_type }}</li>
                    <li><strong class="font-medium">Silhouette:</strong> {{ product.piece_type }} Designer Set</li>
                    <li><strong class="font-medium">Category:</strong> {{ product.category?.name }}</li>
                    <li><strong class="font-medium">Finish:</strong> Delicate contrast piping & tailored seams</li>
                  </ul>
                </div>
              </div>

              <!-- 2. Delivery & Exchange Policy -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  @click="toggleAccordion('delivery')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Delivery & Exchange Policy
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.delivery ? '−' : '+' }}
                  </span>
                </button>
                <div v-show="activeAccordions.delivery" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-2">
                  <p>• <strong class="text-brand-charcoal">Delivery Time:</strong> 3–5 working days nationwide across Pakistan.</p>
                  <p>• <strong class="text-brand-charcoal">Free Shipping:</strong> Automatically applied to orders above Rs. 5,000.</p>
                  <p>• <strong class="text-brand-charcoal">Exchanges:</strong> 7-day hassle-free exchange window for unworn ready-to-wear items with original tags intact.</p>
                  <p>• <strong class="text-brand-charcoal">Custom Tailored Pieces:</strong> Made specifically to your measurement profile; requires 50% advance confirmation.</p>
                </div>
              </div>

              <!-- 3. Care Instructions -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  @click="toggleAccordion('care')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Care Instructions
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.care ? '−' : '+' }}
                  </span>
                </button>
                <div v-show="activeAccordions.care" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-1.5">
                  <p>• Dry clean recommended for silk, chiffon, and embroidered organza.</p>
                  <p>• Gentle hand wash in cold water using mild detergent for pure lawn & linen.</p>
                  <p>• Do not wring or tumble dry; dry in shade to maintain color longevity.</p>
                  <p>• Warm iron inside out.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= SECTION: Verified Product Reviews & Customer Fits ================= -->
      <section id="reviews-section" class="mt-16 pt-12 border-t border-brand-border">
        <!-- Section Header & Rating Summary -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-8 pb-10 border-b border-brand-border/60">
          <div>
            <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-1">
              Storefront Feedback & Transparency
            </span>
            <h2 class="font-serif text-2xl sm:text-3xl text-brand-charcoal">
              Verified Reviews & Customer Fits
            </h2>
          </div>

          <!-- Overall Rating Metrics -->
          <div class="flex items-center gap-6">
            <div class="text-center">
              <span class="font-serif text-4xl font-bold text-brand-charcoal block leading-none">
                {{ Number(reviewsMeta.average_rating || 5).toFixed(1) }}
              </span>
              <div class="flex items-center justify-center space-x-1 my-1 text-brand-gold text-sm">
                <span v-for="star in 5" :key="star">
                  {{ star <= Math.round(reviewsMeta.average_rating || 5) ? '★' : '☆' }}
                </span>
              </div>
              <span class="text-[11px] text-brand-muted block">
                {{ reviewsMeta.total_reviews }} {{ reviewsMeta.total_reviews === 1 ? 'Review' : 'Reviews' }}
              </span>
            </div>

            <!-- Distribution Progress Bars -->
            <div class="w-44 sm:w-56 space-y-1 text-xs">
              <div v-for="star in [5, 4, 3, 2, 1]" :key="star" class="flex items-center space-x-2 text-[11px]">
                <span class="w-3 text-brand-muted font-medium">{{ star }}</span>
                <span class="text-brand-gold text-[10px]">★</span>
                <div class="flex-1 h-1.5 bg-brand-cream border border-brand-border overflow-hidden">
                  <div
                    class="h-full bg-brand-gold"
                    :style="{
                      width: reviewsMeta.total_reviews > 0
                        ? `${((reviewsMeta.distribution?.[star] || 0) / reviewsMeta.total_reviews) * 100}%`
                        : '0%'
                    }"
                  />
                </div>
                <span class="w-5 text-right text-brand-muted text-[10px]">
                  {{ reviewsMeta.distribution?.[star] || 0 }}
                </span>
              </div>
            </div>

            <!-- Write a Review Button -->
            <button
              type="button"
              class="hidden sm:inline-flex items-center px-6 py-3 bg-brand-charcoal hover:bg-brand-gold text-white text-xs uppercase tracking-luxury font-medium transition-colors shrink-0"
              @click="writeReviewOpen = !writeReviewOpen"
            >
              <span>{{ writeReviewOpen ? 'Close Form' : 'Write a Review' }}</span>
            </button>
          </div>

          <!-- Mobile Write Review Button -->
          <button
            type="button"
            class="sm:hidden w-full py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium"
            @click="writeReviewOpen = !writeReviewOpen"
          >
            {{ writeReviewOpen ? 'Close Form' : 'Write a Review' }}
          </button>
        </div>

        <!-- Slide-Down "Write a Review" Form -->
        <Transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="opacity-0 -translate-y-4"
          enter-to-class="opacity-100 translate-y-0"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="opacity-100 translate-y-0"
          leave-to-class="opacity-0 -translate-y-4"
        >
          <div
            v-if="writeReviewOpen"
            class="my-8 p-6 sm:p-8 bg-brand-cream/50 border border-brand-gold/40 max-w-3xl mx-auto shadow-sm"
          >
            <div class="flex items-center justify-between pb-4 mb-4 border-b border-brand-border/60">
              <h3 class="font-serif text-lg font-bold text-brand-charcoal uppercase tracking-luxury">
                Share Your Experience
              </h3>
              <span class="text-[10px] text-brand-gold uppercase tracking-wider font-semibold">
                Customer Fit & Fabric Review
              </span>
            </div>

            <!-- Success Alert -->
            <div
              v-if="reviewSuccess"
              class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-3 mb-4"
            >
              <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Thank you! Your verified review has been submitted and published.</span>
            </div>

            <form v-else class="space-y-4" @submit.prevent="submitReview">
              <!-- Rating Selector -->
              <div>
                <label class="block text-xs uppercase tracking-luxury text-brand-charcoal font-medium mb-1.5">
                  Rating (1 to 5 Stars) *
                </label>
                <div class="flex items-center space-x-2">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    :class="[star <= reviewForm.rating ? 'text-brand-gold' : 'text-gray-300']"
                    @click="reviewForm.rating = star"
                  >
                    ★
                  </button>
                  <span class="ml-2 text-xs text-brand-muted font-medium">
                    {{ reviewForm.rating }} of 5 Stars
                  </span>
                </div>
              </div>

              <!-- Name and Order Number -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                    Your Name *
                  </label>
                  <input
                    v-model="reviewForm.reviewer_name"
                    type="text"
                    required
                    placeholder="e.g. Mahnoor Khan"
                    class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
                  >
                </div>
                <div>
                  <label class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                    Order Number <span class="text-brand-muted lowercase text-[10px]">(optional, for verified badge)</span>
                  </label>
                  <input
                    v-model="reviewForm.order_number"
                    type="text"
                    placeholder="e.g. KF-2026-0001"
                    class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
                  >
                </div>
              </div>

              <!-- Comment -->
              <div>
                <label class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                  Your Review / Fit Feedback *
                </label>
                <textarea
                  v-model="reviewForm.comment"
                  rows="4"
                  required
                  placeholder="How did the fabric feel? How was the bespoke stitching, drape, and sizing? Share your honest thoughts..."
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
                />
              </div>

              <!-- Customer Photo Upload -->
              <div>
                <label class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                  Upload Fit Photo <span class="text-brand-muted lowercase text-[10px]">(optional, see your dress on our storefront)</span>
                </label>
                <div class="flex items-center space-x-4">
                  <input
                    type="file"
                    accept="image/*"
                    class="text-xs text-brand-charcoal file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:uppercase file:tracking-luxury file:bg-brand-charcoal file:text-white hover:file:bg-brand-gold file:transition-colors file:cursor-pointer"
                    @change="onPhotoSelected"
                  >
                  <div v-if="reviewPhotoPreview" class="relative w-12 h-16 border border-brand-border overflow-hidden">
                    <img :src="reviewPhotoPreview" alt="Preview" class="w-full h-full object-cover">
                    <button
                      type="button"
                      class="absolute top-0 right-0 bg-red-600 text-white text-[9px] p-0.5"
                      title="Remove image"
                      @click="removeReviewPhoto"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <p v-if="reviewError" class="text-xs text-red-600">
                {{ reviewError }}
              </p>

              <!-- Form Submit -->
              <div class="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  class="px-5 py-2 text-xs uppercase tracking-luxury text-brand-muted hover:text-brand-charcoal"
                  @click="writeReviewOpen = false"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  :disabled="reviewSubmitting"
                  class="px-8 py-2.5 bg-brand-charcoal hover:bg-brand-gold text-white text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-50"
                >
                  {{ reviewSubmitting ? 'Submitting...' : 'Post Verified Review' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>

        <!-- Filter Chips Bar -->
        <div class="flex flex-wrap items-center gap-2 my-6">
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-full text-xs transition-all border"
            :class="[reviewFilter === 'all' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
            @click="reviewFilter = 'all'"
          >
            All Reviews ({{ reviews.length }})
          </button>
          <button
            type="button"
            class="px-3.5 py-1.5 rounded-full text-xs transition-all border flex items-center space-x-1"
            :class="[reviewFilter === 'photos' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
            @click="reviewFilter = 'photos'"
          >
            <span>📷 With Customer Photos</span>
            <span class="text-[10px] opacity-80">({{ reviews.filter((r: any) => Boolean(r.photo_url)).length }})</span>
          </button>
          <button
            v-for="st in [5, 4, 3]"
            :key="st"
            type="button"
            class="px-3 py-1.5 rounded-full text-xs transition-all border"
            :class="[reviewFilter === st ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
            @click="reviewFilter = st"
          >
            {{ st }} Stars ({{ reviews.filter((r: any) => r.rating === st).length }})
          </button>
        </div>

        <!-- Reviews Grid -->
        <div v-if="filteredReviews.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          <div
            v-for="rev in filteredReviews"
            :key="rev.id"
            class="bg-brand-cream/30 border border-brand-border/70 p-6 flex flex-col justify-between"
          >
            <div>
              <div class="flex items-start justify-between mb-3">
                <div>
                  <div class="flex items-center space-x-2">
                    <h4 class="font-serif text-sm font-semibold text-brand-charcoal">
                      {{ rev.reviewer_name }}
                    </h4>
                    <span
                      v-if="rev.is_verified_purchase"
                      class="inline-flex items-center space-x-1 text-[9px] uppercase tracking-wider font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5"
                    >
                      <svg class="w-3 h-3 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                      </svg>
                      <span>Verified Buyer</span>
                    </span>
                  </div>
                  <span class="text-[10px] text-brand-muted block mt-0.5">
                    {{ new Date(rev.created_at).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' }) }}
                  </span>
                </div>

                <div class="flex items-center text-brand-gold text-xs">
                  <span v-for="s in 5" :key="s">
                    {{ s <= rev.rating ? '★' : '☆' }}
                  </span>
                </div>
              </div>

              <p class="text-xs text-brand-charcoal leading-relaxed whitespace-pre-line mb-4 font-sans">
                {{ rev.comment }}
              </p>
            </div>

            <!-- Customer Fit Photo Thumbnail -->
            <div v-if="rev.photo_url" class="pt-2 border-t border-brand-border/40 flex items-center space-x-3">
              <button
                type="button"
                class="group relative w-16 h-20 bg-brand-cream border border-brand-border overflow-hidden shrink-0 cursor-pointer focus:outline-none"
                title="Click to view customer photo"
                @click="activePhotoModal = rev.photo_url"
              >
                <img
                  :src="rev.photo_url"
                  :alt="`Fit photo by ${rev.reviewer_name}`"
                  class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                >
                <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors flex items-center justify-center">
                  <svg class="w-4 h-4 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </button>
              <div class="text-[11px] text-brand-muted">
                <span class="font-medium text-brand-charcoal block">Customer Fit Photo</span>
                <span>Click image to view in full resolution</span>
              </div>
            </div>
          </div>
        </div>

        <!-- No Reviews in Filter State -->
        <div v-else class="py-12 text-center bg-brand-cream/20 border border-brand-border/50">
          <p class="font-serif text-brand-charcoal text-base mb-1">
            No customer reviews match this filter.
          </p>
          <p class="text-xs text-brand-muted mb-4">
            Be the first to share your fitting experience with other shoppers.
          </p>
          <button
            type="button"
            class="px-5 py-2 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium"
            @click="writeReviewOpen = true"
          >
            Write a Review
          </button>
        </div>
      </section>

      <!-- ================= SECTION: You May Also Like (Related Products) ================= -->
      <section v-if="relatedProducts.length > 0" class="mt-16 pt-12 border-t border-brand-border">
        <div class="flex items-center justify-between mb-8">
          <div>
            <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-1">
              Curated Complements
            </span>
            <h3 class="font-serif text-2xl sm:text-3xl text-brand-charcoal">
              You May Also Like
            </h3>
          </div>
          <NuxtLink
            to="/shop"
            class="text-xs font-semibold text-brand-charcoal hover:text-brand-gold transition-colors flex items-center space-x-1 uppercase tracking-luxury"
          >
            <span>View All</span>
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </NuxtLink>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <ProductCard
            v-for="rel in relatedProducts"
            :key="rel.id"
            :product="rel"
          />
        </div>
      </section>

      <!-- ================= SECTION: Recently Viewed Products ================= -->
      <RecentlyViewed :exclude-id="product.id" layout="grid" />
    </div>

    <!-- Mobile Sticky Bottom Action Bar -->
    <div class="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-brand-border p-3 z-30 flex items-center gap-2 shadow-2xl">
      <div class="flex-1">
        <p class="text-[10px] uppercase text-brand-muted leading-none">Total</p>
        <p class="font-serif text-base font-bold text-brand-charcoal leading-tight">
          {{ formatPrice(finalUnitPrice) }}
        </p>
      </div>

      <div v-if="isOutOfStock" class="flex-1">
        <button
          class="w-full py-3 bg-brand-gold hover:bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium transition-colors"
          @click="scrollToStockAlert"
        >
          Notify Me
        </button>
      </div>
      <button
        v-else
        class="flex-1 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium"
        @click="handleAddToCart"
      >
        Add to Bag
      </button>

      <button
        class="p-3 bg-[#25D366] text-white rounded-none flex items-center justify-center shrink-0"
        aria-label="Order on WhatsApp"
        @click="handleWhatsAppOrder"
      >
        <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
        </svg>
      </button>
    </div>

    <!-- Size Guide Modal -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="sizeGuideOpen"
        class="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click="sizeGuideOpen = false"
      >
        <div
          class="bg-brand-white max-w-2xl w-full border border-brand-border p-6 sm:p-8 shadow-2xl relative"
          @click.stop
        >
          <!-- Close button -->
          <button
            class="absolute top-4 right-4 text-brand-charcoal hover:text-brand-gold p-1"
            aria-label="Close size guide"
            @click="sizeGuideOpen = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Modal Title -->
          <div class="flex items-center justify-between border-b border-brand-border pb-4 mb-6">
            <div>
              <h2 class="font-serif text-xl sm:text-2xl font-bold uppercase tracking-luxury text-brand-charcoal">
                Size Guide
              </h2>
              <p class="text-xs text-brand-muted">Standard Pakistani Ready-to-Wear Sizing</p>
            </div>

            <!-- Unit switch -->
            <div class="flex border border-brand-border bg-white text-xs mr-6">
              <button
                class="px-3 py-1 font-medium transition-colors"
                :class="[sizeGuideUnit === 'inches' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                @click="sizeGuideUnit = 'inches'"
              >
                Inches
              </button>
              <button
                class="px-3 py-1 font-medium transition-colors"
                :class="[sizeGuideUnit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                @click="sizeGuideUnit = 'cm'"
              >
                CM
              </button>
            </div>
          </div>

          <!-- Measurement Table -->
          <div class="overflow-x-auto mb-6">
            <table class="w-full text-xs text-left">
              <thead>
                <tr class="border-b border-brand-border text-[10px] uppercase tracking-luxury text-brand-muted bg-brand-cream/50">
                  <th class="py-2.5 px-3">Size</th>
                  <th class="py-2.5 px-3">Chest</th>
                  <th class="py-2.5 px-3">Waist</th>
                  <th class="py-2.5 px-3">Hips</th>
                  <th class="py-2.5 px-3">Shoulder</th>
                  <th class="py-2.5 px-3">Shirt Length</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border">
                <tr
                  v-for="row in sizeChart"
                  :key="row.size"
                  class="hover:bg-brand-cream/30"
                >
                  <td class="py-3 px-3 font-bold text-brand-charcoal">{{ row.size }}</td>
                  <td class="py-3 px-3 text-brand-muted">{{ row.chest }}</td>
                  <td class="py-3 px-3 text-brand-muted">{{ row.waist }}</td>
                  <td class="py-3 px-3 text-brand-muted">{{ row.hips }}</td>
                  <td class="py-3 px-3 text-brand-muted">{{ row.shoulder }}</td>
                  <td class="py-3 px-3 text-brand-muted">{{ row.length }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- How to Measure Tip -->
          <div class="bg-brand-cream/50 border border-brand-border p-4 text-xs text-brand-muted space-y-1.5">
            <h4 class="font-serif font-bold text-brand-charcoal uppercase tracking-wider text-[11px]">
              How to Measure
            </h4>
            <p>• <strong class="text-brand-charcoal">Chest / Bust:</strong> Measure across the fullest part of your chest, keeping the tape horizontal.</p>
            <p>• <strong class="text-brand-charcoal">Waist:</strong> Measure around your natural waistline, keeping tape comfortably loose.</p>
            <p>• <strong class="text-brand-charcoal">Hips:</strong> Measure around the fullest part of your hips.</p>
            <p>• For tailored perfection, toggle our <strong class="text-brand-gold">Bespoke Custom Fit</strong> to enter your exact measurements.</p>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Customer Fit Photo Lightbox Modal -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="activePhotoModal"
        class="fixed inset-0 bg-brand-charcoal/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        @click="activePhotoModal = null"
      >
        <div class="relative max-w-2xl max-h-[90vh] bg-black p-1 shadow-2xl" @click.stop>
          <button
            class="absolute -top-10 right-0 text-white hover:text-brand-gold p-1 flex items-center space-x-1 text-xs uppercase tracking-luxury font-medium"
            @click="activePhotoModal = null"
          >
            <span>Close</span>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img
            :src="activePhotoModal"
            alt="Customer Dress Fit"
            class="max-w-full max-h-[85vh] object-contain"
          >
        </div>
      </div>
    </Transition>
  </div>
</template>