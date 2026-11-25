<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import AppFooter from '~/components/AppFooter.vue'
import CartDrawer from '~/components/CartDrawer.vue'
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useWishlistStore } from '~/stores/wishlist'

const auth = useAuthStore()
const wishlist = useWishlistStore()
const cart = useCartStore()
useTailoringUnloadWarning(() => cart.hasTailoring)

onMounted(async () => {
  await auth.initAuth()
  await wishlist.initWishlist()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-brand-white text-brand-charcoal antialiased">
    <a href="#main-content" class="skip-link">Skip to main content</a>

    <!-- Sticky Navigation & Announcement Bar -->
    <AppHeader />

    <!-- Main Dynamic Page Content -->
    <main id="main-content" class="min-w-0 flex-1" tabindex="-1">
      <slot />
    </main>

    <!-- Slide-over Cart Drawer -->
    <CartDrawer />

    <!-- Minimalist Luxury Footer -->
    <AppFooter />
  </div>
</template>
