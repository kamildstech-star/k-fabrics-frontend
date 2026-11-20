<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useWishlistStore } from '~/stores/wishlist'

const cart = useCartStore()
const auth = useAuthStore()
const wishlist = useWishlistStore()

const mobileMenuOpen = ref(false)
const searchOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-40 bg-brand-white border-b border-brand-border">
    <!-- Top Announcement Bar -->
    <div class="bg-brand-charcoal text-white text-[11px] py-2 px-4 text-center tracking-wider font-light flex items-center justify-center">
      <span>Free Delivery on Orders Above Rs. 5,000 | Custom Stitching Available</span>
    </div>

    <!-- Main Navigation Bar -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
      <!-- Mobile Menu Trigger -->
      <div class="flex items-center lg:hidden">
        <button
          class="text-brand-charcoal p-2 -ml-2"
          aria-label="Open navigation menu"
          @click="mobileMenuOpen = true"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Desktop Left Navigation Links -->
      <nav class="hidden lg:flex items-center space-x-8 text-xs font-medium uppercase tracking-luxury text-brand-charcoal">
        <NuxtLink to="/shop?sort=newest" class="hover:text-brand-gold transition-colors">
          New In
        </NuxtLink>
        <NuxtLink to="/shop?category=daily-pret" class="hover:text-brand-gold transition-colors">
          Pret
        </NuxtLink>
        <NuxtLink to="/shop?category=co-ord-sets" class="hover:text-brand-gold transition-colors">
          Co-ords
        </NuxtLink>
        <NuxtLink to="/stitching" class="hover:text-brand-gold transition-colors text-brand-gold">
          Custom Stitching
        </NuxtLink>
        <NuxtLink to="/track-order" class="hover:text-brand-gold transition-colors">
          Track Order
        </NuxtLink>
      </nav>

      <!-- Center Luxury Serif Logo -->
      <div class="text-center">
        <NuxtLink to="/" class="inline-block">
          <span class="font-serif text-2xl sm:text-3xl font-bold tracking-luxury text-brand-charcoal uppercase select-none">
            K. Fabrics
          </span>
          <span class="block text-[8px] tracking-[0.3em] uppercase text-brand-muted -mt-1 font-sans">
            Minimalist Luxury
          </span>
        </NuxtLink>
      </div>

      <!-- Right Utility Actions -->
      <div class="flex items-center space-x-3 sm:space-x-5 text-brand-charcoal">
        <!-- Search Trigger -->
        <button
          class="p-1 hover:text-brand-gold transition-colors"
          aria-label="Search collection"
          @click="searchOpen = !searchOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <!-- Wishlist Link with Live Counter -->
        <NuxtLink
          to="/wishlist"
          class="p-1 hover:text-brand-gold transition-colors relative flex items-center"
          aria-label="Saved Wishlist"
        >
          <svg
            class="w-5 h-5 transition-colors"
            :class="[wishlist.totalItems > 0 ? 'fill-brand-gold text-brand-gold' : 'fill-none stroke-current']"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <span
            v-if="wishlist.totalItems > 0"
            class="absolute -top-1.5 -right-2 bg-brand-charcoal text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
          >
            {{ wishlist.totalItems }}
          </span>
        </NuxtLink>

        <!-- Account Link -->
        <NuxtLink
          :to="auth.isAuthenticated ? '/account' : '/login'"
          class="p-1 hover:text-brand-gold transition-colors flex items-center space-x-1"
          :aria-label="auth.isAuthenticated ? 'Customer Account' : 'Sign In'"
          :title="auth.isAuthenticated ? `Signed in as ${auth.userName}` : 'Sign In'"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span v-if="auth.isAuthenticated" class="hidden xl:inline text-[11px] font-medium tracking-wider text-brand-charcoal max-w-[80px] truncate">
            {{ auth.userName.split(' ')[0] }}
          </span>
        </NuxtLink>

        <!-- Shopping Bag Trigger with Live Counter -->
        <button
          class="p-1 hover:text-brand-gold transition-colors relative flex items-center"
          aria-label="Open shopping bag"
          @click="cart.openCart()"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span
            v-if="cart.totalItems > 0"
            class="absolute -top-1.5 -right-2 bg-brand-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
          >
            {{ cart.totalItems }}
          </span>
        </button>
      </div>
    </div>

    <!-- Live Predictive Search Modal/Overlay -->
    <SearchOverlay v-model="searchOpen" />

    <!-- Mobile Slide-over Menu -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 bg-brand-charcoal/50 backdrop-blur-sm z-50 lg:hidden"
        @click="mobileMenuOpen = false"
      />
    </Transition>

    <Transition
      enter-active-class="transform transition duration-300 ease-out"
      enter-from-class="-translate-x-full"
      enter-to-class="translate-x-0"
      leave-active-class="transform transition duration-200 ease-in"
      leave-from-class="translate-x-0"
      leave-to-class="-translate-x-full"
    >
      <div
        v-if="mobileMenuOpen"
        class="fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-brand-white z-50 shadow-2xl p-6 flex flex-col justify-between border-r border-brand-border lg:hidden"
      >
        <div>
          <!-- Close button -->
          <div class="flex items-center justify-between pb-6 border-b border-brand-border">
            <span class="font-serif text-lg font-bold tracking-luxury text-brand-charcoal uppercase">
              K. Fabrics
            </span>
            <button
              class="text-brand-charcoal p-1"
              aria-label="Close menu"
              @click="mobileMenuOpen = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Nav Items -->
          <div class="py-6 flex flex-col space-y-5 text-sm uppercase tracking-luxury font-medium">
            <NuxtLink
              to="/shop?sort=newest"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              New In
            </NuxtLink>
            <NuxtLink
              to="/shop?category=daily-pret"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              Daily Pret
            </NuxtLink>
            <NuxtLink
              to="/shop?category=co-ord-sets"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              Co-ord Sets
            </NuxtLink>
            <NuxtLink
              to="/shop?category=festive-edit"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              Festive Edit
            </NuxtLink>
            <NuxtLink
              to="/stitching"
              class="text-brand-gold font-semibold flex items-center space-x-1"
              @click="mobileMenuOpen = false"
            >
              <span>Custom Stitching</span>
              <span class="text-[9px] bg-brand-gold text-white px-1.5 py-0.2 tracking-normal">Bespoke</span>
            </NuxtLink>
            <NuxtLink
              to="/track-order"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              Track Order
            </NuxtLink>
            <NuxtLink
              to="/wishlist"
              class="text-brand-charcoal hover:text-brand-gold transition-colors flex items-center justify-between"
              @click="mobileMenuOpen = false"
            >
              <span>Wishlist</span>
              <span v-if="wishlist.totalItems > 0" class="text-xs font-bold text-brand-gold">
                ({{ wishlist.totalItems }})
              </span>
            </NuxtLink>
            <NuxtLink
              :to="auth.isAuthenticated ? '/account' : '/login'"
              class="text-brand-charcoal hover:text-brand-gold transition-colors font-semibold"
              @click="mobileMenuOpen = false"
            >
              {{ auth.isAuthenticated ? 'My Account' : 'Sign In / Register' }}
            </NuxtLink>
          </div>
        </div>

        <!-- Mobile Footer Contact -->
        <div class="pt-6 border-t border-brand-border text-xs text-brand-muted space-y-2">
          <p>Assistance & Styling Advice:</p>
          <a
            href="https://wa.me/923001234567"
            target="_blank"
            class="flex items-center space-x-2 text-brand-charcoal font-medium hover:text-brand-gold"
          >
            <span>WhatsApp: +92 300 1234567</span>
          </a>
        </div>
      </div>
    </Transition>
  </header>
</template>
