<script setup lang="ts">
import { useCartStore } from '~/stores/cart'

const cart = useCartStore()

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
  <div>
    <!-- Backdrop Overlay -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="cart.isOpen"
        class="fixed inset-0 bg-brand-charcoal/50 backdrop-blur-sm z-50"
        @click="cart.closeCart()"
      />
    </Transition>

    <!-- Slide-Over Panel -->
    <Transition
      enter-active-class="transform transition duration-300 ease-out"
      enter-from-class="translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="translate-x-full"
    >
      <div
        v-if="cart.isOpen"
        class="fixed top-0 right-0 bottom-0 w-full max-w-md bg-brand-white z-50 shadow-2xl flex flex-col border-l border-brand-border"
      >
        <!-- Drawer Header -->
        <div class="p-6 border-b border-brand-border flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <h2 class="font-serif text-lg tracking-luxury uppercase text-brand-charcoal">
              Shopping Bag
            </h2>
            <span class="text-xs font-medium text-brand-muted">({{ cart.totalItems }})</span>
          </div>
          <button
            class="text-brand-charcoal hover:text-brand-gold transition-colors p-1"
            aria-label="Close bag"
            @click="cart.closeCart()"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Free Delivery Threshold Bar -->
        <div class="px-6 py-3 bg-brand-cream border-b border-brand-border text-xs">
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
              class="bg-brand-gold h-full transition-all duration-300"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
        </div>

        <!-- Cart Items List -->
        <div class="flex-1 overflow-y-auto p-6 divide-y divide-brand-border">
          <!-- Empty State -->
          <div v-if="cart.items.length === 0" class="h-full flex flex-col items-center justify-center text-center py-12">
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
            class="py-4 first:pt-0 last:pb-0 flex space-x-4"
          >
            <!-- Thumbnail -->
            <div class="w-20 h-28 bg-brand-cream border border-brand-border overflow-hidden shrink-0 relative">
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
            <div class="flex-1 flex flex-col justify-between">
              <div>
                <div class="flex items-start justify-between">
                  <h3 class="font-serif text-sm font-medium text-brand-charcoal line-clamp-1">
                    {{ item.name }}
                  </h3>
                  <button
                    class="text-brand-muted hover:text-red-600 transition-colors ml-2"
                    title="Remove item"
                    @click="cart.removeItem(item.id)"
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
              <div class="flex items-center justify-between mt-3">
                <!-- Quantity Controls for Ready-to-Wear -->
                <div v-if="item.type === 'product'" class="flex items-center border border-brand-border">
                  <button
                    class="px-2 py-1 text-xs text-brand-charcoal hover:bg-brand-cream transition-colors"
                    @click="cart.updateQuantity(item.id, -1)"
                  >
                    -
                  </button>
                  <span class="px-2 py-1 text-xs font-medium text-brand-charcoal min-w-[24px] text-center">
                    {{ item.quantity }}
                  </span>
                  <button
                    class="px-2 py-1 text-xs text-brand-charcoal hover:bg-brand-cream transition-colors"
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
        <div v-if="cart.items.length > 0" class="p-6 border-t border-brand-border bg-brand-white space-y-4">
          <!-- Tailoring 50% Advance Notice -->
          <div
            v-if="cart.hasTailoring"
            class="p-3 bg-brand-cream border border-brand-gold/40 text-[11px] text-brand-charcoal leading-relaxed"
          >
            <span class="font-semibold text-brand-gold uppercase tracking-wider block mb-0.5">Custom Tailoring Notice</span>
            Orders with custom tailoring require a 50% advance payment via JazzCash, EasyPaisa, or Bank Transfer.
          </div>

          <!-- Price Calculation -->
          <div class="space-y-1.5 text-xs text-brand-muted">
            <div class="flex justify-between">
              <span>Subtotal</span>
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
              class="block w-full text-center text-xs text-brand-muted hover:text-brand-charcoal underline underline-offset-4 py-1"
              @click="cart.closeCart()"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>
