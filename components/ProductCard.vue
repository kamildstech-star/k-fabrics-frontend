<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useWishlistStore } from '~/stores/wishlist'

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
      color?: string | null
      stock_quantity: number
      price_override?: number | null
      is_active: boolean
    }>
  }
}>()

const cart = useCartStore()
const wishlist = useWishlistStore()

const isInWishlist = computed(() => wishlist.isInWishlist(props.product.id))

const toggleWishlist = () => {
  wishlist.toggle(props.product)
}

const formatPrice = (amount: number) => {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK')
}

const readyVariants = computed(() => (props.product.variants || []).filter(
  v => v.is_active && v.stock_quantity > 0 && v.size !== 'Custom',
))
const availableSizes = computed(() => [...new Set(readyVariants.value.map(v => v.size))])

const variantCountForSize = (size: string) => readyVariants.value.filter(v => v.size === size).length

const quickAddSize = (size: string) => {
  const variants = readyVariants.value.filter(v => v.size === size)
  if (variants.length > 1) return navigateTo(`/products/${props.product.slug}`)
  const variant = variants[0]
  if (!variant) return

  cart.addProduct({
    productId: props.product.id,
    variantId: variant.id,
    name: props.product.name,
    slug: props.product.slug,
    size: variant.size,
    color: variant.color || undefined,
    price: variant.price_override ?? props.product.sale_price ?? props.product.base_price,
    image: props.product.primary_image,
    quantity: 1,
  })
}
</script>

<template>
  <div class="group relative flex flex-col bg-brand-white">
    <div class="relative overflow-hidden aspect-[3/4] bg-brand-cream">
      <NuxtLink
        :to="`/products/${product.slug}`"
        :aria-label="$tr('View {arg0}', { arg0: product.name })"
        class="absolute inset-0 block focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-charcoal"
      >
        <!-- Primary Image -->
        <ProductImage
          v-if="product.primary_image"
          :src="product.primary_image"
          alt=""
          class="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          :width="480"
          :height="640"
          sizes="50vw md:33vw lg:25vw"
        />
        <div v-else class="absolute inset-0 flex items-center justify-center bg-brand-cream text-brand-muted text-xs">
          {{ $tr("No Image") }}
        </div>

        <!-- Secondary Hover Image -->
        <ProductImage
          v-if="product.hover_image && product.hover_image !== product.primary_image"
          :src="product.hover_image"
          alt=""
          class="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out"
          :width="480"
          :height="640"
          sizes="50vw md:33vw lg:25vw"
        />

      </NuxtLink>

      <!-- Badges -->
      <div class="absolute top-3 start-3 z-20 flex flex-col space-y-1">
        <span
          v-if="product.sale_price"
          class="bg-brand-charcoal text-white text-[9px] uppercase tracking-luxury font-semibold px-2 py-0.5"
        >
          {{ $tr("Sale") }}
        </span>
        <span
          v-if="product.is_featured"
          class="bg-brand-gold text-white text-[9px] uppercase tracking-luxury font-semibold px-2 py-0.5"
        >
          {{ $tr("Featured") }}
        </span>
      </div>

      <!-- Luxury Wishlist Heart Button -->
      <button
        type="button"
        class="absolute top-3 end-3 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-brand-charcoal hover:text-brand-gold backdrop-blur-sm transition-all shadow-sm flex items-center justify-center group/btn"
        :aria-label="isInWishlist ? $tr('Remove from Wishlist') : $tr('Save to Wishlist')"
        :aria-pressed="isInWishlist"
        :title="isInWishlist ? $tr('Saved in Wishlist') : $tr('Add to Wishlist')"
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

      <!-- Slide-Up Quick Size Selector / Action Bar -->
      <div
        v-if="availableSizes.length"
        role="group"
        :aria-label="$tr('Quick add {arg0}', { arg0: product.name })"
        class="absolute bottom-0 inset-x-0 z-20 border-t border-brand-border bg-brand-white/95 p-2 backdrop-blur-sm transition-transform duration-300 [@media(hover:hover)]:translate-y-full [@media(hover:hover)]:group-hover:translate-y-0 [@media(hover:hover)]:group-focus-within:translate-y-0"
      >
        <p class="text-[10px] uppercase tracking-luxury text-brand-muted text-center mb-1.5 font-medium">
          {{ $tr("Quick Add") }}
        </p>
        <div class="flex items-center justify-center gap-1.5 flex-wrap">
          <button
            v-for="size in availableSizes"
            :key="size"
            type="button"
            class="min-h-[28px] text-[10px] font-medium border border-brand-border hover:border-brand-charcoal hover:bg-brand-charcoal hover:text-white px-2 py-1 transition-colors min-w-[28px]"
            :aria-label="variantCountForSize(size) > 1 ? $tr('Choose options for size {arg0}', { arg0: size }) : $tr('Add size {arg0} to bag', { arg0: size })"
            @click="quickAddSize(size)"
          >
            {{ size }}
          </button>
        </div>
      </div>
    </div>

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
      <div class="flex items-baseline space-x-2 rtl:space-x-reverse text-xs">
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
