<script setup lang="ts">
import { useCartStore, type CustomFittingMeasurements } from '~/stores/cart'
import { useWishlistStore } from '~/stores/wishlist'
import { useAuthStore } from '~/stores/auth'
import { convertMeasurements, measurementPayload, requiredMeasurementLabels } from '~/utils/checkout'
import { useRecentlyViewed } from '~/composables/useRecentlyViewed'
import { productPageStatus, productSeo, seoJson } from '~/utils/seo'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const route = useRoute()
const router = useRouter()
const slug = computed(() => route.params.slug as string)
const cart = useCartStore()
const wishlist = useWishlistStore()
const auth = useAuthStore()
const { recordView } = useRecentlyViewed()
const { whatsapp } = useStoreContact()

const savedProfiles = ref<any[]>([])
const selectedSavedProfileId = ref<number | null>(null)

onMounted(async () => {
  await auth.initAuth()
  if (auth.isAuthenticated) {
    try {
      const res = await auth.apiFetch<{ data: any[] }>('/user/measurements')
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

// Only a confirmed upstream absence is a 404. A failed request or malformed
// success payload is a temporary problem and must not look like a removed item.
const productApiUrl = computed(() => `${apiBase}/products/${encodeURIComponent(slug.value)}`)
const { data: productResponse, pending, error, refresh } = await useFetch<any>(
  productApiUrl, { lazy: false, retry: 0, timeout: 8_000 },
)
const httpStatus = computed(() => productPageStatus(productResponse.value?.data, error.value))
const product = computed(() => !pending.value && httpStatus.value === 200 ? productResponse.value?.data : null)
const notFound = computed(() => httpStatus.value === 404)
if (import.meta.server && httpStatus.value !== 200) {
  setResponseStatus(httpStatus.value)
  useResponseHeader('Cache-Control').value = 'no-store'
  if (httpStatus.value === 503) useResponseHeader('Retry-After').value = '60'
}

// State for active image in mobile gallery
const activeImageIndex = ref(0)
const gallery = computed<{ image_url: string | null; alt_text?: string; id: number }[]>(() =>
  product.value?.images?.length ? product.value.images : [{ id: 0, image_url: product.value?.primary_image ?? null }])
watch(slug, () => { activeImageIndex.value = 0 })
let swipeStart: { x: number; y: number } | undefined
function beginSwipe(event: TouchEvent) {
  const point = event.touches[0]
  swipeStart = event.touches.length === 1 && point ? { x: point.clientX, y: point.clientY } : undefined
}
function endSwipe(event: TouchEvent) {
  const point = event.changedTouches[0]
  const start = swipeStart
  swipeStart = undefined
  if (!point || !start) return
  const x = point.clientX - start.x
  if (Math.abs(x) < 44 || Math.abs(x) <= Math.abs(point.clientY - start.y)) return
  const count = gallery.value.length
  activeImageIndex.value = (activeImageIndex.value + (x > 0 ? -1 : 1) + count) % count
}

// Active color selection
const selectedColor = ref('')

// Initialize selected color once product loads
watch(
  product,
  (p) => {
    const active = p?.variants?.filter((v: any) => v.is_active) || []
    const firstVariant = active.find((v: any) => v.size !== 'Custom' && v.stock_quantity > 0)
      ?? active.find((v: any) => v.size !== 'Custom') ?? active[0]
    selectedColor.value = firstVariant?.color || ''
  },
  { immediate: true }
)

// Unique colors from active variants
const availableColors = computed(() => {
  if (!product.value?.variants) return []
  const map = new Map<string, { color: string; color_hex?: string }>()
  for (const v of product.value.variants) {
    const color = v.color || ''
    if (v.is_active && !map.has(color)) {
      map.set(color, { color, color_hex: v.color_hex || '#1A1A1A' })
    }
  }
  return Array.from(map.values()).filter(option => option.color || map.size === 1 || product.value.variants
    .some((variant: any) => variant.is_active && variant.size !== 'Custom' && !variant.color))
})

// Active size selection
const selectedSize = ref<string>('')
const sizeError = ref(false)
const sizeSelector = ref<HTMLElement | null>(null)
const selectionError = ref('')

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
watch(measurementUnit, unit => convertMeasurements(measurements, unit), { flush: 'sync' })

// Custom Fit Fee
const customFitFee = computed(() => Number(product.value?.custom_fitting_fee ?? 0))

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

// Size guidance must come from the actual garment; do not guess missing sizes.
const sizeChart = computed<{ size: string; bust?: number; waist?: number; hips?: number; length?: number }[]>(() =>
  ['garment', 'body'].includes(product.value?.size_chart_type) && Array.isArray(product.value?.size_chart)
    ? product.value.size_chart : [])
function chartMeasurement(value?: number) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return '—'
  return sizeGuideUnit.value === 'inches' ? `${amount}″` : `${Math.round(amount * 25.4) / 10} cm`
}

// Price calculation
const effectiveBasePrice = computed(() => {
  if (!product.value) return 0
  return activeVariant.value?.price_override ?? product.value.sale_price ?? product.value.base_price
})

const finalUnitPrice = computed(() => {
  let price = effectiveBasePrice.value
  if (isCustomFit.value) {
    price += customFitFee.value
  }
  return price
})

const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')

// Available sizes for the product
const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
const colorVariants = computed(() => (product.value?.variants || [])
  .filter((v: any) => v.is_active && v.size !== 'Custom' && (v.color || '') === selectedColor.value))
const colorSizes = computed(() => {
  const sizes = Array.from(new Set<string>(colorVariants.value.map((v: { size: string }) => v.size)))
  const rank = (size: string) => sizeOrder.includes(size) ? sizeOrder.indexOf(size) : sizeOrder.length
  return sizes.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b, 'en', { numeric: true }))
})
const getVariantForSize = (size: string) => colorVariants.value.find((v: any) => v.size === size) || null

const isSizeAvailable = (size: string) => {
  const variant = getVariantForSize(size)
  return Boolean(variant && variant.stock_quantity > 0)
}

// Custom measurements require both an active SKU and verified payment availability.
const customVariant = computed(() => {
  const variants = product.value?.variants?.filter((variant: { size: string; is_active: boolean }) => variant.size === 'Custom' && variant.is_active) || []
  if (!selectedColor.value) return variants.find((variant: { color?: string | null }) => !variant.color) || null
  return variants.find((variant: { color?: string | null }) => variant.color === selectedColor.value)
    ?? variants.find((variant: { color?: string | null }) => !variant.color)
    ?? null
})
const customFitAvailable = computed(() => Boolean(customVariant.value && product.value?.tailoring_checkout_available === true))
const activeVariant = computed(() => isCustomFit.value && customFitAvailable.value ? customVariant.value : getVariantForSize(selectedSize.value))
watch(customFitAvailable, available => { if (!available) isCustomFit.value = false })

// A colour change starts a new selection. Never silently substitute a different size.
watch([slug, selectedColor], () => {
  selectedSize.value = ''
  sizeError.value = false
  selectionError.value = ''
})
const isOutOfStock = computed(() => !isCustomFit.value && activeVariant.value && activeVariant.value.stock_quantity <= 0)
const includeTrousers = computed(() => product.value?.piece_type !== '1-piece')

function focusSizeChoice() {
  const node = sizeSelector.value
  if (!node) return
  const target = colorSizes.value.length
    ? node.querySelector<HTMLElement>('button[data-size]')
    : document.querySelector<HTMLElement>('#custom-fit-checkbox')
  const focusTarget = target ?? node
  focusTarget.focus({ preventScroll: true })
  node.scrollIntoView({ block: 'center' })
}

// Stock Alert Subscription
const restockAlertsEnabled = computed(() => product.value?.restock_alerts_enabled === true)
const stockAlertContact = ref('')
const stockAlertLoading = ref(false)
const stockAlertSuccess = ref(false)
const stockAlertError = ref('')
watch(activeVariant, () => {
  stockAlertSuccess.value = false
  stockAlertError.value = ''
})

const handleStockAlert = async () => {
  if (!restockAlertsEnabled.value || !stockAlertContact.value.trim() || !activeVariant.value || stockAlertLoading.value) return
  const variantId = activeVariant.value.id
  stockAlertLoading.value = true
  stockAlertError.value = ''
  try {
    await auth.apiFetch('/stock-alerts', {
      method: 'POST',
      body: {
        product_variant_id: variantId,
        contact: stockAlertContact.value.trim(),
      },
    })
    if (activeVariant.value?.id === variantId) {
      stockAlertSuccess.value = true
      stockAlertContact.value = ''
    }
  } catch (err: any) {
    if (activeVariant.value?.id === variantId) stockAlertError.value = err?.data?.errors?.product_variant_id?.[0] || 'Could not save your request. Check the address and try again.'
  } finally {
    stockAlertLoading.value = false
  }
}

const scrollToStockAlert = () => {
  const el = document.getElementById('stock-alert-section')
  el?.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
  el?.scrollIntoView({ block: 'center' })
}

// Optional panels should not block or fetch for unavailable products.
const [{ data: reviewsResponse }, { data: relatedResponse }] = await Promise.all([
  useAsyncData(
    () => `pdp-reviews:${slug.value}`,
    () => product.value ? $fetch<any>(`${productApiUrl.value}/reviews`, { retry: 0, timeout: 3_000 }) : Promise.resolve({ data: [] }),
    { watch: [product] },
  ),
  useAsyncData(
    () => `pdp-related:${slug.value}`,
    () => product.value ? $fetch<any>(`${productApiUrl.value}/related`, { retry: 0, timeout: 3_000 }) : Promise.resolve({ data: [] }),
    { watch: [product] },
  ),
])
const reviews = computed(() => reviewsResponse.value?.data || [])
const reviewsMeta = computed(() => reviewsResponse.value?.meta || { average_rating: null, total_reviews: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } })
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


    }
  },
  { immediate: true }
)

// Use the catalog record rather than request parameters or invented fallback offers.
const seo = computed(() => productSeo(product.value, config.public.siteUrl))
useSeoMeta({
  title: () => seo.value?.title ?? (notFound.value ? 'Item not found | K. Fabrics' : 'Item temporarily unavailable | K. Fabrics'),
  description: () => seo.value?.description?.slice(0, 160),
  ogTitle: () => seo.value?.title,
  ogDescription: () => seo.value?.description?.slice(0, 200),
  ogUrl: () => seo.value?.url,
  ogImage: () => seo.value?.primaryImage,
  ogType: () => seo.value ? 'website' : undefined,
  twitterCard: () => seo.value?.primaryImage ? 'summary_large_image' : 'summary',
  robots: () => notFound.value ? 'noindex, follow' : undefined,
})
useHead(() => seo.value ? {
  link: [{ rel: 'canonical', href: seo.value.url }],
  script: [{ key: 'product-data', type: 'application/ld+json', innerHTML: seoJson(seo.value.schema) }],
} : {})

// Review Form & Lightbox State
const writeReviewOpen = ref(false)
const reviewFilter = ref<'all' | 'photos' | number>('all')
const activePhotoModal = ref<string | null>(null)
const dialogContent = ref<HTMLElement | null>(null)
let previousFocus: HTMLElement | null = null
watch([sizeGuideOpen, activePhotoModal], async ([size, photo]) => {
  if (!import.meta.client) return
  if (size || photo) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    await nextTick()
    dialogContent.value?.querySelector<HTMLElement>('button')?.focus()
  } else {
    await nextTick()
    previousFocus?.focus()
    previousFocus = null
  }
})
function dialogKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault()
    sizeGuideOpen.value = false
    activePhotoModal.value = null
  }
  if (event.key !== 'Tab') return
  const controls = dialogContent.value?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]')
  if (!controls?.length) return
  const first = controls[0]
  const last = controls[controls.length - 1]
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}


const reviewForm = reactive({
  reviewer_name: '',
  rating: 5,
  comment: '',
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
      reviewForm.reviewer_name = name.split(/\s+/)[0] || ''
    }
  },
  { immediate: true }
)

const onPhotoSelected = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  removeReviewPhoto()
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    reviewError.value = 'Choose a JPEG, PNG or WebP image up to 5 MB.'
    target.value = ''
    return
  }
  reviewError.value = ''
  reviewPhotoFile.value = file
  reviewPhotoPreview.value = URL.createObjectURL(file)
}

const removeReviewPhoto = () => {
  reviewPhotoFile.value = null
  if (reviewPhotoPreview.value) {
    URL.revokeObjectURL(reviewPhotoPreview.value)
    reviewPhotoPreview.value = null
  }
}

onBeforeUnmount(removeReviewPhoto)

const submitReview = async () => {
  if (reviewSubmitting.value) return
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
    if (reviewPhotoFile.value) {
      formData.append('photo', reviewPhotoFile.value)
    }

    await auth.apiFetch(`/products/${encodeURIComponent(slug.value)}/reviews`, {
      method: 'POST',
      body: formData,
    })

    reviewSuccess.value = true
    reviewForm.comment = ''
    removeReviewPhoto()
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
  if (isCustomFit.value && !customFitAvailable.value) {
    selectionError.value = 'Custom fitting is unavailable online right now.'
    return
  }
  if (!selectedSize.value && !isCustomFit.value) {
    sizeError.value = true
    focusSizeChoice()
    return
  }
  sizeError.value = false

  if (!product.value || !activeVariant.value || isOutOfStock.value) {
    selectionError.value = 'Choose an available size and colour.'
    return
  }
  selectionError.value = ''
  let fitting: CustomFittingMeasurements | null = null
  if (isCustomFit.value) {
    try {
      fitting = measurementPayload(measurements, true)
      const missing = requiredMeasurementLabels(fitting, includeTrousers.value)
      if (missing.length) throw new Error(`Complete these measurements: ${missing.join(', ')}.`)
    } catch (error) {
      selectionError.value = error instanceof Error ? error.message : 'Check the measurements you entered.'
      document.getElementById('fit-shirt-length')?.focus()
      return
    }
  }

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
    customFitting: fitting,
  })

}

const productWhatsApp = computed(() => product.value
  ? whatsapp(`Hello K. Fabrics, I have a question about ${product.value.name}.`)
  : null)
</script>

<template>
  <div class="pdp-shell bg-brand-white min-h-screen">
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
    <div v-else-if="!product" class="max-w-xl mx-auto text-center py-24 px-4">
      <div class="w-16 h-16 mx-auto text-brand-muted/40 mb-4">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1 class="font-serif text-2xl font-bold text-brand-charcoal mb-2">{{ notFound ? 'Item not found' : 'Could not load this item' }}</h1>
      <p class="text-sm text-brand-muted mb-6">{{ notFound ? 'This item may no longer be available.' : 'Try again in a moment.' }}</p>
      <button v-if="!notFound" type="button" class="inline-block px-5 py-3 mr-3 border border-brand-charcoal" @click="refresh()">Try again</button>
      <NuxtLink
        to="/shop"
        class="inline-block px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors"
      >
        Return to Shop
      </NuxtLink>
    </div>

    <!-- Product Detail Container -->
    <div v-else class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-8 sm:pt-6 lg:py-12">
      <nav aria-label="Breadcrumb" class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-muted mb-2 lg:mb-8">
        <NuxtLink to="/shop" class="inline-flex items-center gap-1 min-h-9 hover:underline">
          <span aria-hidden="true" class="lg:hidden">‹</span> Shop
        </NuxtLink>
        <template v-if="product.category">
          <span aria-hidden="true">/</span>
          <NuxtLink :to="`/shop?category=${product.category.slug}`" class="inline-flex items-center min-h-9 hover:underline">
            {{ product.category.name }}
          </NuxtLink>
        </template>
        <span aria-hidden="true" class="hidden lg:inline">/</span>
        <span aria-current="page" class="sr-only lg:not-sr-only lg:max-w-full lg:truncate">{{ product.name }}</span>
      </nav>

      <!-- Heading and price are first for mobile shoppers and assistive technology.
           Desktop keeps the full gallery next to the buying information. -->
      <div class="pdp-grid grid gap-y-4 lg:gap-x-14 lg:gap-y-6">
        <header class="pdp-intro min-w-0 space-y-1.5 lg:space-y-4 lg:border-b lg:border-brand-border lg:pb-5">
          <p v-if="product.fabric_type || product.piece_type || (availableColors.length === 1 && selectedColor)" class="text-xs uppercase tracking-wider text-brand-gold font-semibold">
            {{ [product.fabric_type, product.piece_type, availableColors.length === 1 ? selectedColor : ''].filter(Boolean).join(' · ') }}
          </p>
          <h1 class="font-serif text-[1.65rem] sm:text-4xl font-bold text-brand-charcoal leading-tight break-words">{{ product.name }}</h1>
          <div class="flex flex-wrap items-baseline gap-x-3 gap-y-1" aria-live="polite" aria-atomic="true">
            <span class="font-serif text-xl sm:text-3xl font-bold text-brand-charcoal">{{ formatPrice(finalUnitPrice) }}</span>
            <template v-if="product.sale_price != null && Number(product.sale_price) < Number(product.base_price) && activeVariant?.price_override == null && !isCustomFit">
              <del class="text-brand-muted text-sm"><span class="sr-only">Original price </span>{{ formatPrice(product.base_price) }}</del>
              <span class="bg-brand-charcoal text-white text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5">Sale</span>
            </template>
            <span v-if="isCustomFit" class="text-xs text-brand-gold font-medium">Includes {{ formatPrice(customFitFee) }} custom fitting</span>
          </div>
        </header>

        <div class="pdp-gallery min-w-0">
          <!-- Desktop Layout: Vertical Stack of High-Res Images -->
          <div class="hidden lg:flex flex-col space-y-6">
            <div
              v-for="(img, idx) in gallery"
              :key="img.id"
              class="relative aspect-[3/4] bg-brand-cream overflow-hidden border border-brand-border"
            >
              <ProductImage
                :src="img.image_url" :alt="img.alt_text || product.name"
                :width="720" :height="960" sizes="lg:55vw"
                :loading="idx === 0 ? 'eager' : 'lazy'"
                class="w-full h-full object-cover"
              />
            </div>
          </div>

          <!-- Mobile gallery supports touch and keyboard controls. -->
          <div class="lg:hidden">
            <div class="pdp-mobile-photo relative bg-brand-cream overflow-hidden border border-brand-border"
              @touchstart.passive="beginSwipe" @touchend.passive="endSwipe">
              <ProductImage
                :src="gallery[activeImageIndex]?.image_url" :alt="gallery[activeImageIndex]?.alt_text || product.name"
                :width="600" :height="800" sizes="95vw" loading="eager" fit="inside" fetchpriority="high"
                class="w-full h-full object-contain"
              />

              <!-- Carousel Controls if multiple images -->
              <div
                v-if="gallery.length > 1"
                class="absolute inset-y-0 inset-x-2 flex items-center justify-between pointer-events-none"
              >
                <button
                  type="button" class="pointer-events-auto grid place-items-center min-w-11 min-h-11 bg-white/90 backdrop-blur-sm text-brand-charcoal hover:bg-white shadow"
                  aria-label="Previous image"
                  @click="activeImageIndex = (activeImageIndex - 1 + gallery.length) % gallery.length"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button
                  type="button" class="pointer-events-auto grid place-items-center min-w-11 min-h-11 bg-white/90 backdrop-blur-sm text-brand-charcoal hover:bg-white shadow"
                  aria-label="Next image"
                  @click="activeImageIndex = (activeImageIndex + 1) % gallery.length"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

            </div>
            <p v-if="gallery.length > 1" aria-live="polite" aria-atomic="true" class="mt-1 text-center text-xs text-brand-muted">
              Photo {{ activeImageIndex + 1 }} of {{ gallery.length }}
            </p>
          </div>
        </div>

        <div class="pdp-buy min-w-0">
          <div class="space-y-4 lg:space-y-6">
            <!-- Color Swatches (if available) -->
            <div v-if="availableColors.length > 1" class="space-y-1.5 lg:space-y-2.5">
              <div class="flex items-center justify-between">
                <span class="text-xs uppercase tracking-luxury text-brand-charcoal font-medium">
                  Color: <span class="font-semibold text-brand-charcoal">{{ selectedColor || 'Not specified' }}</span>
                </span>
              </div>
              <div role="group" aria-label="Colour" class="flex flex-wrap items-center gap-2">
                <button
                  v-for="item in availableColors"
                  :key="item.color"
                  type="button"
                  class="w-11 h-11 rounded-full border-2 transition-all p-1.5"
                  :class="[
                    selectedColor === item.color
                      ? 'border-brand-charcoal ring-2 ring-brand-charcoal/30'
                      : 'border-brand-border hover:border-brand-charcoal'
                  ]"
                  :title="item.color || 'Colour not specified'"
                  :aria-label="item.color || 'Colour not specified'"
                  :aria-pressed="selectedColor === item.color"
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
            <div id="product-sizing" ref="sizeSelector" tabindex="-1" class="space-y-2 lg:space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="text-xs uppercase tracking-luxury text-brand-charcoal font-medium">
                  {{ colorSizes.length ? 'Select size' : 'Sizing' }}
                </span>
                <button
                  type="button"
                  class="inline-flex items-center min-h-9 px-1 text-sm text-brand-charcoal underline underline-offset-4 hover:text-brand-gold transition-colors font-medium"
                  @click="sizeGuideOpen = true"
                >
                  Size Guide
                </button>
              </div>

              <!-- Sharp Size Boxes -->
              <div v-if="colorSizes.length" role="group" aria-label="Select size" class="pdp-size-grid grid gap-1 lg:gap-2">
                <button
                  v-for="size in colorSizes"
                  data-size
                  :key="size"
                  type="button"
                  class="min-h-11 px-1 py-1 text-sm font-medium uppercase border transition-colors flex flex-col items-center justify-center break-all"
                  :class="[
                    selectedSize === size && !isCustomFit
                      ? 'border-brand-charcoal bg-brand-charcoal text-white font-bold'
                      : isSizeAvailable(size)
                        ? 'border-brand-border bg-white text-brand-charcoal hover:border-brand-charcoal'
                        : 'border-brand-border bg-brand-cream/60 text-brand-muted hover:border-brand-charcoal'
                  ]"
                  :aria-pressed="selectedSize === size && !isCustomFit"
                  @click="selectedSize = size; isCustomFit = false; sizeError = false; selectionError = ''"
                >
                  <span>{{ size }}</span>
                  <span
                    v-if="!isSizeAvailable(size)"
                    class="text-[9px] leading-tight"
                    :class="[selectedSize === size && !isCustomFit ? 'text-amber-200' : 'text-amber-700 font-semibold']"
                  >
                    Sold Out
                  </span>
                </button>
              </div>

              <p v-if="!colorSizes.length && !customFitAvailable" role="status" class="text-sm">This item is currently unavailable.</p>
              <p v-if="sizeError" role="alert" class="text-sm text-red-800 font-medium">
                {{ customFitAvailable ? 'Select a size or choose Custom Fit.' : 'Select a size before adding to bag.' }}
              </p>
            </div>

            <!-- Custom Fit Atelier Toggle -->
            <p v-if="customVariant && !customFitAvailable" class="border border-brand-border p-4 bg-brand-cream/40 text-sm">Custom fitting is paused until verified bank-transfer payment is available. You can still choose an available ready-to-wear size.</p>
            <div v-if="customFitAvailable" class="border border-brand-border p-4 bg-brand-cream/40 transition-colors">
              <div class="flex items-start justify-between">
                <div class="flex items-start space-x-3">
                  <input
                    id="custom-fit-checkbox"
                    v-model="isCustomFit"
                    @change="sizeError = false; selectionError = ''"
                    type="checkbox"
                    class="mt-1 h-4 w-4 accent-brand-charcoal cursor-pointer"
                    @click.stop
                  >
                  <div>
                    <label for="custom-fit-checkbox" class="font-serif text-sm font-bold text-brand-charcoal cursor-pointer flex items-center space-x-2">
                      <span>Bespoke Custom Fit</span>
                      <span class="text-[10px] font-sans font-semibold bg-brand-gold text-white px-2 py-0.5 tracking-luxury">
                        +{{ formatPrice(customFitFee) }}
                      </span>
                    </label>
                    <p class="text-xs text-brand-muted mt-0.5 leading-relaxed">
                      Enter all shirt measurements and, for sets, trouser length and waist. Pancha and notes are optional. Unsent measurements are not saved when you reload.
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
                        :aria-pressed="measurementUnit === 'inches'"
                        @click="measurementUnit = 'inches'"
                      >
                        Inches
                      </button>
                      <button
                        class="px-3 py-1 font-medium transition-colors"
                        :class="[measurementUnit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                        :aria-pressed="measurementUnit === 'cm'"
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
                        <label for="fit-shirt-length" class="text-[10px] uppercase text-brand-muted block mb-0.5">Length</label>
                        <input
                          id="fit-shirt-length"
                          v-model.number="measurements.shirt_length"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 40"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-shoulder" class="text-[10px] uppercase text-brand-muted block mb-0.5">Shoulder</label>
                        <input
                          id="fit-shoulder"
                          v-model.number="measurements.shoulder"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 14.5"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-chest" class="text-[10px] uppercase text-brand-muted block mb-0.5">Chest / Bust</label>
                        <input
                          id="fit-chest"
                          v-model.number="measurements.chest"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 38"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-waist" class="text-[10px] uppercase text-brand-muted block mb-0.5">Waist</label>
                        <input
                          id="fit-waist"
                          v-model.number="measurements.waist"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 34"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-hips" class="text-[10px] uppercase text-brand-muted block mb-0.5">Hips</label>
                        <input
                          id="fit-hips"
                          v-model.number="measurements.hips"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 42"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-sleeve-length" class="text-[10px] uppercase text-brand-muted block mb-0.5">Sleeve</label>
                        <input
                          id="fit-sleeve-length"
                          v-model.number="measurements.sleeve_length"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 21"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Trouser Fields -->
                  <div v-if="includeTrousers">
                    <p class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold mb-2">
                      Trouser / Shalwar ({{ measurementUnit }})
                    </p>
                    <div class="grid grid-cols-3 gap-2.5">
                      <div>
                        <label for="fit-trouser-length" class="text-[10px] uppercase text-brand-muted block mb-0.5">Length</label>
                        <input
                          id="fit-trouser-length"
                          v-model.number="measurements.trouser_length"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 38"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-trouser-waist" class="text-[10px] uppercase text-brand-muted block mb-0.5">Waist</label>
                        <input
                          id="fit-trouser-waist"
                          v-model.number="measurements.trouser_waist"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 32"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                      <div>
                        <label for="fit-pancha" class="text-[10px] uppercase text-brand-muted block mb-0.5">Pancha</label>
                        <input
                          id="fit-pancha"
                          v-model.number="measurements.pancha"
                          type="number"
                          min="0.01"
                          max="300"
                          step="0.01"
                          placeholder="e.g. 6.5"
                          class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                        >
                      </div>
                    </div>
                  </div>

                  <!-- Extra Notes -->
                  <div>
                    <label for="fitting-notes" class="text-[10px] uppercase text-brand-muted block mb-1">Special Tailoring Instructions (optional)</label>
                    <textarea
                      id="fitting-notes"
                      v-model="measurements.special_instructions"
                      rows="2"
                      placeholder="e.g. Boat neckline, bell sleeves, loose silhouette..."
                      class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                    />
                  </div>
                </div>
              </Transition>
            </div>

            <p v-if="selectionError" role="alert" class="text-red-800">{{ selectionError }}</p>

            <!-- Actions: ADD TO BAG / NOTIFY ME & VERIFIED SUPPORT -->
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
                <p v-if="!restockAlertsEnabled" class="text-sm text-brand-muted">Choose another size or <NuxtLink to="/shop" class="underline">browse similar pieces</NuxtLink>.</p>
                <p v-else class="text-sm text-brand-muted leading-relaxed">
                  Leave your email so the store team can contact you about this size if it returns. This does not reserve stock.
                </p>

                <div v-if="restockAlertsEnabled && stockAlertSuccess" role="status" class="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                  <svg class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Request saved for the store team.</span>
                </div>

                <form v-else-if="restockAlertsEnabled" class="flex flex-col sm:flex-row gap-2" @submit.prevent="handleStockAlert">
                  <input
                    v-model="stockAlertContact"
                    aria-label="Email address for restock"
                    type="email" autocomplete="email" maxlength="254"
                    placeholder="Email address"
                    required
                    class="flex-1 min-w-0 bg-white border border-brand-border px-3 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted focus:outline-none focus:border-brand-gold"
                  >
                  <button
                    type="submit"
                    :disabled="stockAlertLoading"
                    class="px-5 py-2.5 bg-brand-charcoal hover:bg-brand-gold text-white text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-50 shrink-0"
                  >
                    {{ stockAlertLoading ? 'Saving…' : 'Request restock email' }}
                  </button>
                </form>
                <p v-if="restockAlertsEnabled && stockAlertError" role="alert" class="text-sm text-red-800">
                  {{ stockAlertError }}
                </p>
              </div>

              <!-- Standard Add to Bag (When in stock) -->
              <button
                v-else-if="colorSizes.length || customVariant"
                class="w-full py-4 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-300 shadow-md flex items-center justify-center space-x-2"
                @click="handleAddToCart"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>{{ activeVariant ? 'Add to Bag' : 'Choose a size' }}</span>
              </button>

              <a
                v-if="productWhatsApp"
                :href="productWhatsApp"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full py-3.5 border border-[#25D366] text-brand-charcoal hover:bg-[#25D366] hover:text-white text-xs uppercase tracking-luxury font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <svg class="w-4 h-4 fill-[#25D366] group-hover:fill-white" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                </svg>
                <span>Ask about this item on WhatsApp</span>
              </a>

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

            <div class="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              <NuxtLink to="/policies/shipping" class="underline underline-offset-4">Delivery estimates</NuxtLink>
              <NuxtLink to="/policies/returns" class="underline underline-offset-4">{{ isCustomFit ? 'Custom order policy' : 'Ready-to-wear returns and exchanges' }}</NuxtLink>
            </div>

            <!-- Collapsible Luxury Accordions -->
            <div class="border-t border-brand-border divide-y divide-brand-border pt-4">
              <!-- 1. Fabric & Product Details -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  :aria-expanded="activeAccordions.details" aria-controls="pdp-details"
                  @click="toggleAccordion('details')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Fabric & Product Details
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.details ? '−' : '+' }}
                  </span>
                </button>
                <div id="pdp-details" v-show="activeAccordions.details" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-2">
                  <p>{{ product.description }}</p>
                  <p v-if="product.fit_notes" class="whitespace-pre-line"><strong>Fit:</strong> {{ product.fit_notes }}</p>
                  <ul class="list-disc pl-4 space-y-1 text-brand-charcoal">
                    <li><strong class="font-medium">Fabric:</strong> {{ product.fabric_type }}</li>
                    <li v-if="product.piece_type"><strong class="font-medium">Pieces:</strong> {{ product.piece_type }}</li>
                    <li v-if="product.category"><strong class="font-medium">Category:</strong> {{ product.category.name }}</li>
                  </ul>
                </div>
              </div>

              <!-- 2. Delivery & Exchange Policy -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  :aria-expanded="activeAccordions.delivery" aria-controls="pdp-delivery"
                  @click="toggleAccordion('delivery')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Delivery & Exchange Policy
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.delivery ? '−' : '+' }}
                  </span>
                </button>
                <div id="pdp-delivery" v-show="activeAccordions.delivery" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-2">
                  <p>Check the <NuxtLink to="/policies/shipping" class="underline">delivery policy</NuxtLink> for estimated timing. Shipping and any tailoring advance are confirmed at checkout.</p>
                  <p>See the <NuxtLink to="/policies/returns" class="underline">exchange policy</NuxtLink> for garment condition and custom-order eligibility.</p>
                </div>
              </div>

              <!-- 3. Care Instructions -->
              <div class="py-4">
                <button
                  class="w-full flex items-center justify-between text-left"
                  :aria-expanded="activeAccordions.care" aria-controls="pdp-care"
                  @click="toggleAccordion('care')"
                >
                  <span class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal">
                    Care Instructions
                  </span>
                  <span class="text-brand-charcoal font-serif text-lg leading-none">
                    {{ activeAccordions.care ? '−' : '+' }}
                  </span>
                </button>
                <div id="pdp-care" v-show="activeAccordions.care" class="pt-3 text-xs text-brand-muted leading-relaxed space-y-1.5">
                  <p v-if="product.care_instructions" class="whitespace-pre-line">{{ product.care_instructions }}</p>
                  <p v-else>Follow the care label supplied with the garment.</p>
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
              Customer Reviews & Fits
            </h2>
          </div>

          <!-- Overall Rating Metrics -->
          <div class="flex items-center gap-6">
            <div class="text-center">
              <span class="font-serif text-4xl font-bold text-brand-charcoal block leading-none">
                {{ reviewsMeta.total_reviews && reviewsMeta.average_rating !== null ? Number(reviewsMeta.average_rating).toFixed(1) : '—' }}
              </span>
              <div v-if="reviewsMeta.total_reviews" class="flex items-center justify-center space-x-1 my-1 text-brand-gold text-sm" aria-hidden="true">
                <span v-for="star in 5" :key="star">
                  {{ star <= Math.round(reviewsMeta.average_rating || 0) ? '★' : '☆' }}
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
              role="status"
              class="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs flex items-center space-x-3 mb-4"
            >
              <svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Thank you. Your review has been submitted for moderation.</span>
            </div>

            <form v-else class="space-y-4" @submit.prevent="submitReview">
              <!-- Rating Selector -->
              <div>
                <p id="rating-label" class="block text-xs uppercase tracking-luxury text-brand-charcoal font-medium mb-1.5">
                  Rating (1 to 5 Stars) *
                </p>
                <div role="group" aria-labelledby="rating-label" class="flex flex-wrap items-center gap-2">
                  <button
                    v-for="star in 5"
                    :key="star"
                    type="button"
                    class="text-2xl transition-transform hover:scale-110 focus:outline-none"
                    :class="[star <= reviewForm.rating ? 'text-brand-gold' : 'text-gray-300']"
                    :aria-label="`Rate ${star} out of 5`"
                    :aria-pressed="reviewForm.rating === star"
                    @click="reviewForm.rating = star"
                  >
                    ★
                  </button>
                  <span class="ml-2 text-xs text-brand-muted font-medium">
                    {{ reviewForm.rating }} of 5 Stars
                  </span>
                </div>
              </div>

              <div>
                <label for="reviewer-name" class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">Display name *</label>
                <input id="reviewer-name" v-model="reviewForm.reviewer_name" type="text" maxlength="255" required class="w-full bg-white border border-brand-border px-3 py-2 text-xs">
                <p class="mt-1 text-xs text-brand-muted">Your display name will appear publicly if your review is approved.</p>
              </div>

              <!-- Comment -->
              <div>
                <label for="review-comment" class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                  Your Review / Fit Feedback *
                </label>
                <textarea
                  id="review-comment" v-model="reviewForm.comment"
                  rows="4"
                  required
                  placeholder="How did the fabric feel? How was the bespoke stitching, drape, and sizing? Share your honest thoughts..."
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
                />
              </div>

              <!-- Customer Photo Upload -->
              <div>
                <label for="review-photo" class="block text-[11px] uppercase tracking-luxury text-brand-charcoal font-medium mb-1">
                  Upload Fit Photo <span class="text-brand-muted lowercase text-[10px]">(optional, see your dress on our storefront)</span>
                </label>
                <div class="flex items-center space-x-4">
                  <input
                    id="review-photo" type="file"
                    accept="image/jpeg,image/png,image/webp"
                    class="min-w-0 max-w-full text-xs text-brand-charcoal file:mr-3 file:py-2 file:px-4 file:border-0 file:text-xs file:uppercase file:tracking-luxury file:bg-brand-charcoal file:text-white hover:file:bg-brand-gold file:transition-colors file:cursor-pointer"
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
                    <h3 class="font-serif text-sm font-semibold text-brand-charcoal">
                      {{ rev.reviewer_name }}
                    </h3>
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
            <h2 class="font-serif text-2xl sm:text-3xl text-brand-charcoal">
              You May Also Like
            </h2>
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
    <div v-if="!pending && product && !error && (colorSizes.length || customFitAvailable)" class="pdp-sticky-buy lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t border-brand-border p-3 z-30 flex items-center gap-2 shadow-2xl">
      <div class="flex-1">
        <p class="text-xs text-brand-muted leading-none">{{ isCustomFit ? 'Custom fit' : selectedSize ? `Size ${selectedSize}` : 'Select a size' }}</p>
        <p class="font-serif text-base font-bold text-brand-charcoal leading-tight">
          {{ formatPrice(finalUnitPrice) }}
        </p>
      </div>

      <div v-if="isOutOfStock" class="flex-1">
        <button
          v-if="restockAlertsEnabled"
          class="w-full py-3 bg-brand-gold hover:bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium transition-colors"
          @click="scrollToStockAlert"
        >
          Request restock
        </button>
        <button v-else type="button" class="w-full py-3 border border-brand-charcoal text-xs uppercase tracking-luxury font-medium" @click="focusSizeChoice">See other sizes</button>
      </div>
      <button
        v-else
        type="button"
        class="flex-1 min-h-11 px-2 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-wider font-medium"
        @click="activeVariant ? handleAddToCart() : focusSizeChoice()"
      >
        {{ activeVariant ? 'Add to Bag' : 'Choose a size' }}
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
          ref="dialogContent"
          role="dialog"
          aria-modal="true"
          aria-labelledby="size-guide-title"
          class="bg-brand-white max-w-2xl w-full border border-brand-border p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto"
          @click.stop
          @keydown="dialogKey"
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
          <div class="flex flex-wrap items-center gap-3 border-b border-brand-border pb-4 mb-6 pr-6">
            <div>
              <h2 id="size-guide-title" class="font-serif text-xl sm:text-2xl font-bold uppercase tracking-luxury text-brand-charcoal">
                Size Guide
              </h2>
              <p class="text-sm text-brand-muted">{{ product?.name }}</p>
            </div>

            <!-- Unit switch -->
            <div v-if="sizeChart.length" class="flex border border-brand-border bg-white text-xs">
              <button
                class="px-3 py-1 font-medium transition-colors"
                :class="[sizeGuideUnit === 'inches' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                :aria-pressed="sizeGuideUnit === 'inches'"
                @click="sizeGuideUnit = 'inches'"
              >
                Inches
              </button>
              <button
                class="px-3 py-1 font-medium transition-colors"
                :class="[sizeGuideUnit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal hover:bg-brand-cream']"
                :aria-pressed="sizeGuideUnit === 'cm'"
                @click="sizeGuideUnit = 'cm'"
              >
                CM
              </button>
            </div>
          </div>

          <p v-if="!sizeChart.length" class="mb-4 text-sm text-brand-muted">
            A verified size chart is not available for this item yet.
            <a v-if="productWhatsApp" :href="productWhatsApp" target="_blank" rel="noopener noreferrer" class="underline">Ask the store for measurements</a>
            <NuxtLink v-else to="/faq" class="underline">See fit and support FAQs</NuxtLink>.
          </p>
          <template v-else>
            <p id="chart-measurement-type" class="mb-3 text-sm text-brand-muted">
              {{ product?.size_chart_type === 'garment'
                ? 'Finished garment measurements. Compare with a similar garment that fits you. The bust, waist and hip figures are full circumferences, not flat widths.'
                : 'Recommended body measurements. Measure around your body, not the garment.' }}
            </p>
            <div class="overflow-x-auto mb-4" tabindex="0" role="region" aria-label="Size measurements">
              <table aria-describedby="chart-measurement-type" class="w-full text-xs text-left">
                <thead>
                  <tr class="border-b border-brand-border text-xs text-brand-charcoal bg-brand-cream/50">
                    <th scope="col" class="p-2">Size</th>
                    <th scope="col" class="p-2">Bust</th>
                    <th scope="col" class="p-2">Waist</th>
                    <th scope="col" class="p-2">Hips</th>
                    <th scope="col" class="p-2">Shirt length</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-brand-border">
                  <tr v-for="row in sizeChart" :key="row.size">
                    <th scope="row" class="p-2 text-brand-charcoal">{{ row.size }}</th>
                    <td class="p-2">{{ chartMeasurement(row.bust) }}</td>
                    <td class="p-2">{{ chartMeasurement(row.waist) }}</td>
                    <td class="p-2">{{ chartMeasurement(row.hips) }}</td>
                    <td class="p-2">{{ chartMeasurement(row.length) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
          <p v-if="product?.fit_notes" class="whitespace-pre-line text-sm"><strong>Fit notes:</strong> {{ product.fit_notes }}</p>
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
        <div ref="dialogContent" role="dialog" aria-modal="true" aria-label="Customer fit photo" class="relative max-w-2xl max-h-[90vh] bg-black p-1 shadow-2xl" @click.stop @keydown="dialogKey">
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
<style scoped>
.pdp-shell { padding-bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px)); }
.pdp-sticky-buy { padding-bottom: calc(.75rem + env(safe-area-inset-bottom, 0px)); }
.pdp-mobile-photo { height: clamp(10rem, 32vh, 26rem); height: clamp(10rem, 32svh, 26rem); }
.pdp-size-grid { grid-template-columns: repeat(auto-fit, minmax(44px, 1fr)); }
@media (min-width: 1024px) {
  .pdp-shell { padding-bottom: 0; }
  .pdp-grid {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas: "photos intro" "photos buy";
    align-items: start;
  }
  .pdp-intro { grid-area: intro; }
  .pdp-gallery { grid-area: photos; }
  .pdp-buy { grid-area: buy; }
}
:where(input, textarea, select, button, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
