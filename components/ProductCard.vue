<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useWishlistStore } from '~/stores/wishlist'
import { useTracking } from '~/composables/useTracking'

const props = defineProps<{
  product: {
    id: number
    name: string
    slug: string
    fabric_type: string
    piece_type: string
    base_price: number
    sale_price?: number | null
    is_featured?: boolean
    primary_image?: string
    hover_image?: string
    variants?: Array<{
      id: number
      size: string
      stock_quantity: number
      is_active: boolean
    }>
  }
}>()

const cart = useCartStore()
const wishlist = useWishlistStore()
const { trackAddToCart } = useTracking()

const isInWishlist = computed(() => wishlist.isInWishlist(props.product.id))

const toggleWishlist = (e: Event) => {
  e.preventDefault()
  e.stopPropagation()
  wishlist.toggle(props.product as any)
}

const formatPrice = (amount: number) => {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK')
}

const availableSizes = computed(() => {
  if (!props.product.variants) return []
  return props.product.variants
    .filter(v => v.is_active && v.stock_quantity > 0)
    .map(v => v.size)
})

const quickAddSize = (size: string, event: Event) => {
  event.preventDefault()
  event.stopPropagation()

  const variant = props.product.variants?.find(v => v.size === size && v.is_active)
  if (!variant) return

  cart.addProduct({
    productId: props.product.id,
    variantId: variant.id,
    name: props.product.name,
    slug: props.product.slug,
    size: variant.size,
    price: props.product.sale_price ?? props.product.base_price,
    image: props.product.primary_image,
    quantity: 1,
  })

  trackAddToCart({
    productId: props.product.id,
    name: props.product.name,
    price: props.product.sale_price ?? props.product.base_price,
    quantity: 1,
    size: variant.size,
  })
}
</script>

<template>
  <div class="group relative flex flex-col bg-brand-white">
    <!-- Clickable Card Image Container -->
    <NuxtLink
      :to="`/products/${product.slug}`"
      class="relative overflow-hidden aspect-[3/4] bg-brand-cream block"
    >
      <!-- Badges -->
      <div class="absolute top-3 left-3 z-20 flex flex-col space-y-1">
        <span
          v-if="product.sale_price"
          class="bg-brand-charcoal text-white text-[9px] uppercase tracking-luxury font-semibold px-2 py-0.5"
        >
          Sale
        </span>
        <span
          v-if="product.is_featured"
          class="bg-brand-gold text-white text-[9px] uppercase tracking-luxury font-semibold px-2 py-0.5"
        >
          Featured
        </span>
      </div>

      <!-- Luxury Wishlist Heart Button -->
      <button
        type="button"
        class="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-brand-charcoal hover:text-brand-gold backdrop-blur-sm transition-all shadow-sm flex items-center justify-center group/btn"
        :aria-label="isInWishlist ? 'Remove from Wishlist' : 'Save to Wishlist'"
        :title="isInWishlist ? 'Saved in Wishlist' : 'Add to Wishlist'"
        @click="toggleWishlist"
      >
        <svg
          class="w-4 h-4 transition-transform group-hover/btn:scale-110"
          :class="[isInWishlist ? 'fill-brand-gold text-brand-gold' : 'fill-none stroke-current']"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      <!-- Primary Image -->
      <img
        v-if="product.primary_image"
        :src="product.primary_image"
        :alt="product.name"
        class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
        loading="lazy"
      >
      <div v-else class="absolute inset-0 flex items-center justify-center bg-brand-cream text-brand-muted text-xs">
        No Image
      </div>

      <!-- Secondary Hover Image -->
      <img
        v-if="product.hover_image && product.hover_image !== product.primary_image"
        :src="product.hover_image"
        :alt="product.name + ' - Alternative view'"
        class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
        loading="lazy"
      >

      <!-- Slide-Up Quick Size Selector / Action Bar -->
      <div
        class="absolute bottom-0 inset-x-0 bg-brand-white/95 backdrop-blur-sm p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 border-t border-brand-border"
        @click.stop
      >
        <p class="text-[10px] uppercase tracking-luxury text-brand-muted text-center mb-1.5 font-medium">
          Quick Add
        </p>
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            v-for="size in availableSizes"
            :key="size"
            class="text-[10px] font-medium border border-brand-border hover:border-brand-charcoal hover:bg-brand-charcoal hover:text-white px-2 py-1 transition-colors min-w-[28px]"
            :title="`Add size ${size} to bag`"
            @click="quickAddSize(size, $event)"
          >
            {{ size }}
          </button>
        </div>
      </div>
    </NuxtLink>

    <!-- Product Text Meta -->
    <div class="pt-3 pb-1 flex flex-col">
      <!-- Fabric and Piece Meta -->
      <span class="text-[10px] uppercase tracking-luxury text-brand-muted font-medium mb-1">
        {{ product.fabric_type }} · {{ product.piece_type }}
      </span>

      <!-- Title -->
      <NuxtLink
        :to="`/products/${product.slug}`"
        class="font-serif text-sm font-medium text-brand-charcoal hover:text-brand-gold transition-colors line-clamp-1 mb-1"
      >
        {{ product.name }}
      </NuxtLink>

      <!-- Price -->
      <div class="flex items-baseline space-x-2 text-xs">
        <span v-if="product.sale_price" class="font-medium text-brand-charcoal text-sm">
          {{ formatPrice(product.sale_price) }}
        </span>
        <span
          :class="[
            product.sale_price ? 'line-through text-brand-muted text-xs' : 'font-medium text-brand-charcoal text-sm'
          ]"
        >
          {{ formatPrice(product.base_price) }}
        </span>
      </div>
    </div>
  </div>
</template>
