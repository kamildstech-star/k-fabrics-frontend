<script setup lang="ts">
import AppHeader from '~/components/AppHeader.vue'
import AppFooter from '~/components/AppFooter.vue'
import CartDrawer from '~/components/CartDrawer.vue'
import { useAuthStore } from '~/stores/auth'
import { useWishlistStore } from '~/stores/wishlist'

const auth = useAuthStore()
const wishlist = useWishlistStore()

onMounted(() => {
  auth.initAuth()
  wishlist.initWishlist()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-brand-white text-brand-charcoal antialiased">
    <!-- Sticky Navigation & Announcement Bar -->
    <AppHeader />

    <!-- Main Dynamic Page Content -->
    <main class="flex-1">
      <slot />
    </main>

    <!-- Slide-over Cart Drawer -->
    <CartDrawer />

    <!-- Minimalist Luxury Footer -->
    <AppFooter />
  </div>
</template>
