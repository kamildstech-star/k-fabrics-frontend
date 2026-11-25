<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()
const { dialog, focusInitial, onCancel, onKeydown } = useStorefrontDialog(
  () => cart.isOpen, () => cart.closeCart(), '#site-cart-trigger',
)

const restoreFocusIfRemoved = async (action: () => void) => {
  action()
  await nextTick()
  if (dialog.value?.open && !dialog.value.contains(document.activeElement)) focusInitial()
}

onMounted(() => {
  cart.initCart()
})

const freeShippingThreshold = 5000
const progressPercent = computed(() => {
  return Math.min(100, Math.round((cart.subtotal / freeShippingThreshold) * 100))
})
const remainingForFreeShipping = computed(() => {
  return Math.max(0, freeShippingThreshold - cart.subtotal)
})

const formatPrice = (value: number) => {
  return 'Rs. ' + Number(value).toLocaleString('en-PK')
}
</script>

<template>
  <Teleport to="body">
    <dialog
      id="shopping-bag-dialog"
      ref="dialog"
      aria-labelledby="shopping-bag-title"
      aria-modal="true"
      class="storefront-dialog storefront-dialog--right fixed inset-y-0 left-auto right-0 m-0 h-[100dvh] max-h-none w-full max-w-md border-l border-brand-border bg-brand-white p-0 text-brand-charcoal shadow-2xl"
      @cancel="onCancel"
      @keydown="onKeydown"
      @click.self="cart.closeCart()"
    >
      <div v-if="cart.isOpen" class="flex h-full min-h-0 flex-col">
        <!-- Drawer Header -->
        <div class="flex shrink-0 items-center justify-between border-b border-brand-border p-4 sm:p-6">
          <div class="flex items-center space-x-2">
            <h2 id="shopping-bag-title" class="font-serif text-lg tracking-luxury uppercase text-brand-charcoal">
              Shopping Bag
            </h2>
            <span class="text-xs font-medium text-brand-muted" aria-live="polite">({{ cart.totalItems }})</span>
          </div>
          <button
            type="button"
            class="text-brand-charcoal hover:text-brand-gold transition-colors p-2"
            aria-label="Close bag"
            data-dialog-initial-focus
            @click="cart.closeCart()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Free Delivery Threshold Bar -->
        <div class="shrink-0 border-b border-brand-border bg-brand-cream px-4 py-3 text-xs sm:px-6">
          <div v-if="remainingForFreeShipping > 0" class="text-brand-muted">
            Add <span class="font-semibold text-brand-charcoal">{{ formatPrice(remainingForFreeShipping) }}</span> more for <span class="text-brand-gold font-medium">Free Delivery</span>
          </div>
          <div v-else class="text-brand-gold font-medium flex items-center space-x-1">
            <svg class="w-4 h-4 text-brand-gold inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>You have unlocked Free Nationwide Delivery!</span>
          </div>
          <div class="w-full bg-brand-border h-1 mt-2 overflow-hidden">
            <div
              class="bg-brand-gold-decoration h-full transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <!-- Cart Items List -->
        <div class="min-h-0 flex-1 divide-y divide-brand-border overflow-y-auto overscroll-contain p-4 sm:p-6">
          <!-- Empty State -->
          <div v-if="cart.items.length === 0" class="flex min-h-full flex-col items-center justify-center py-6 text-center sm:py-12">
            <div class="w-16 h-16 mb-4 text-brand-muted/40">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <p class="font-serif text-lg text-brand-charcoal mb-2">Your Bag is Empty</p>
            <p class="text-xs text-brand-muted max-w-xs mb-6">Discover our latest Pret collection or book custom bespoke stitching tailored to your measurements.</p>
            <NuxtLink
              to="/shop"
              class="inline-block px-8 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors duration-200"
              @click="cart.closeCart()"
            >
              Explore Collection
            </NuxtLink>
          </div>

          <!-- Items -->
          <div
            v-for="item in cart.items"
            :key="item.id"
            class="flex gap-3 py-4 first:pt-0 last:pb-0 sm:gap-4"
          >
            <!-- Thumbnail -->
            <div class="h-24 w-16 sm:h-28 sm:w-20 bg-brand-cream border border-brand-border overflow-hidden shrink-0 relative">
              <img
                v-if="item.image || item.designReferenceImage"
                :src="item.image || item.designReferenceImage || ''"
                :alt="item.name"
                class="w-full h-full object-cover"
              >
              <div v-else class="w-full h-full flex items-center justify-center bg-brand-cream text-brand-gold">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              </div>
            </div>

            <!-- Details -->
            <div class="flex min-w-0 flex-1 flex-col justify-between">
              <div>
                <div class="flex items-start justify-between">
                  <h3 class="font-serif text-sm font-medium text-brand-charcoal line-clamp-1">
                    {{ item.name }}
                  </h3>
                  <button
                    type="button"
                    class="ml-0.5 shrink-0 p-1.5 text-brand-muted transition-colors hover:text-red-700"
                    :aria-label="`Remove ${item.name} from your bag`"
                    @click="restoreFocusIfRemoved(() => cart.removeItem(item.id))"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <!-- Attributes -->
                <div class="text-xs text-brand-muted mt-1 space-x-2">
                  <span v-if="item.size" class="border border-brand-border px-1.5 py-0.5">Size: {{ item.size }}</span>
                  <span v-if="item.color">{{ item.color }}</span>
                </div>

                <!-- Custom Fitting Tag -->
                <div v-if="item.customFitting" class="mt-2 inline-flex items-center space-x-1 text-[10px] uppercase font-medium tracking-wider text-brand-gold bg-brand-gold/10 px-2 py-0.5 border border-brand-gold/30">
                  <span>Custom Fitted</span>
                </div>

                <!-- Standalone Tailoring Tag -->
                <div v-if="item.type === 'stitching'" class="mt-2 text-[10px] text-brand-muted space-y-0.5">
                  <p v-if="item.estimatedDays">Turnaround: {{ item.estimatedDays }} days</p>
                  <p v-if="item.neckStyle">Neck: {{ item.neckStyle }}</p>
                </div>
              </div>

              <!-- Price & Quantity -->
              <div class="mt-3 flex flex-wrap items-center justify-between gap-1">
                <!-- Quantity Controls for Ready-to-Wear -->
                <div v-if="item.type === 'product' && !item.customFitting" class="flex items-center border border-brand-border">
                  <button
                    type="button"
                    class="min-h-7 min-w-7 px-2 py-1 text-xs text-brand-charcoal hover:bg-brand-cream transition-colors"
                    :aria-label="`Decrease quantity of ${item.name}`"
                    @click="restoreFocusIfRemoved(() => cart.updateQuantity(item.id, -1))"
                  >
                    -
                  </button>
                  <span class="px-2 py-1 text-xs font-medium text-brand-charcoal min-w-[24px] text-center">
                    {{ item.quantity }}
                  </span>
                  <button
                    type="button"
                    class="min-h-7 min-w-7 px-2 py-1 text-xs text-brand-charcoal hover:bg-brand-cream transition-colors"
                    :aria-label="`Increase quantity of ${item.name}`"
                    @click="cart.updateQuantity(item.id, 1)"
                  >
                    +
                  </button>
                </div>
                <div v-else class="text-xs text-brand-muted">
                  Bespoke Stitching
                </div>

                <div class="text-sm font-medium text-brand-charcoal">
                  {{ formatPrice(item.price * item.quantity) }}
                </div>
              </div>
            </div>
          </div>

          <!-- Recently Viewed Strip -->
          <RecentlyViewed layout="compact" />
        </div>

        <!-- Drawer Footer -->
        <div v-if="cart.items.length > 0" class="max-h-[45dvh] shrink-0 space-y-3 overflow-y-auto border-t border-brand-border bg-brand-white p-4 sm:space-y-4 sm:p-6">
          <!-- Tailoring 50% Advance Notice -->
          <div
            v-if="cart.hasTailoring"
            class="p-3 bg-brand-cream border border-brand-gold/40 text-[11px] text-brand-charcoal leading-relaxed"
          >
            <span class="font-semibold text-brand-gold uppercase tracking-wider block mb-0.5">Custom Tailoring Notice</span>
            Checkout will show the exact advance and available payment instructions. For privacy, tailoring measurements and reference photos are not saved if you reload or close this tab.
          </div>

          <!-- Price Calculation -->
          <div class="space-y-1.5 text-xs text-brand-muted">
            <div class="flex justify-between">
              <span>Estimated subtotal</span>
              <span class="text-brand-charcoal font-medium">{{ formatPrice(cart.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Estimated Shipping</span>
              <span v-if="cart.shippingFee === 0" class="text-brand-gold font-medium">Free</span>
              <span v-else class="text-brand-charcoal">{{ formatPrice(cart.shippingFee) }}</span>
            </div>
            <div class="border-t border-brand-border pt-2 flex justify-between text-sm font-serif font-bold text-brand-charcoal">
              <span>Estimated Total</span>
              <span class="font-sans text-brand-charcoal">{{ formatPrice(cart.totalAmount) }}</span>
            </div>
          </div>

          <!-- Checkout CTA -->
          <div class="space-y-2 pt-2">
            <NuxtLink
              to="/checkout"
              class="block w-full text-center py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200"
              @click="cart.closeCart()"
            >
              Proceed to Checkout
            </NuxtLink>
            <button
              type="button"
              class="block w-full text-center text-xs text-brand-muted hover:text-brand-charcoal underline underline-offset-4 py-1"
              @click="cart.closeCart()"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>
