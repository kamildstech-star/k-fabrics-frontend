<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useWishlistStore } from '~/stores/wishlist'

const { $storefrontLanguage: { isUrdu, toggle: toggleLanguage } } = useNuxtApp()
const cart = useCartStore()
const auth = useAuthStore()
const wishlist = useWishlistStore()

const mobileMenuOpen = ref(false)
const searchOpen = ref(false)
const closeMobileMenu = () => { mobileMenuOpen.value = false }
const { dialog: menuDialog, onCancel: onMenuCancel, onKeydown: onMenuKeydown } = useStorefrontDialog(
  () => mobileMenuOpen.value, closeMobileMenu, '#mobile-navigation-trigger',
)
let desktopViewport: MediaQueryList | undefined
function onViewportChange(event: MediaQueryListEvent) {
  if (event.matches) closeMobileMenu()
}
onMounted(() => {
  desktopViewport = window.matchMedia('(min-width: 1024px)')
  desktopViewport.addEventListener('change', onViewportChange)
})
onBeforeUnmount(() => desktopViewport?.removeEventListener('change', onViewportChange))
const { whatsapp } = useStoreContact()
const chatUrl = computed(() => whatsapp())
</script>

<template>
  <header class="sticky top-0 z-40 bg-brand-white border-b border-brand-border">
    <!-- Top Announcement Bar -->
    <div class="bg-brand-charcoal text-white text-[11px] py-2 px-4 text-center text-center tracking-wider font-light flex items-center justify-center">
      <span>{{ $tr("Free Delivery on Orders Above Rs. 5,000 | Custom Stitching Available") }}</span>
    </div>

    <!-- Main Navigation Bar -->
    <div class="mx-auto flex h-20 max-w-7xl items-center justify-between gap-1 px-2 min-[360px]:gap-2 min-[360px]:px-3 sm:px-6 lg:px-8">
      <!-- Mobile Menu Trigger -->
      <div class="flex shrink-0 items-center lg:hidden">
        <button
          id="mobile-navigation-trigger"
          type="button"
          class="-ms-1 p-1.5 text-brand-charcoal"
          :aria-label="$tr('Open navigation menu')"
          aria-haspopup="dialog"
          aria-controls="mobile-navigation-dialog"
          :aria-expanded="mobileMenuOpen"
          @click="mobileMenuOpen = true"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      <!-- Desktop Left Navigation Links -->
      <nav :aria-label="$tr('Main navigation')" class="hidden lg:flex items-center space-x-8 rtl:space-x-reverse text-xs font-medium uppercase tracking-luxury text-brand-charcoal">
        <NuxtLink to="/shop?sort=newest" class="hover:text-brand-gold transition-colors">
          {{ $tr("New In") }}
        </NuxtLink>
        <NuxtLink to="/shop?category=daily-pret" class="hover:text-brand-gold transition-colors">
          {{ $tr("Pret") }}
        </NuxtLink>
        <NuxtLink to="/shop?category=co-ord-sets" class="hover:text-brand-gold transition-colors">
          {{ $tr("Co-ords") }}
        </NuxtLink>
        <NuxtLink to="/stitching" class="hover:text-brand-gold transition-colors text-brand-gold">
          {{ $tr("Custom Stitching") }}
        </NuxtLink>
        <NuxtLink to="/track-order" class="hover:text-brand-gold transition-colors">
          {{ $tr("Track Order") }}
        </NuxtLink>
      </nav>

      <!-- Center Luxury Serif Logo -->
      <div class="min-w-0 text-center">
        <NuxtLink to="/" class="inline-block">
          <span class="whitespace-nowrap font-serif text-base min-[360px]:text-2xl sm:text-3xl font-bold tracking-luxury text-brand-charcoal uppercase select-none" lang="en" dir="ltr">
            K. Fabrics
          </span>
          <span class="block whitespace-nowrap text-[7px] min-[360px]:text-[8px] tracking-[0.12em] min-[360px]:tracking-[0.3em] uppercase text-brand-muted -mt-1 font-sans">
            {{ $tr("Minimalist Luxury") }}
          </span>
        </NuxtLink>
      </div>

      <!-- Right Utility Actions -->
      <div class="flex shrink-0 items-center gap-0.5 text-brand-charcoal min-[360px]:gap-2 sm:gap-5">
        <button
          type="button"
          data-language-switch
          class="min-h-11 min-w-11 shrink-0 rounded border border-brand-border px-1.5 text-xs font-semibold hover:border-brand-charcoal sm:px-2"
          :lang="isUrdu ? 'en-PK' : 'ur-PK'"
          :dir="isUrdu ? 'ltr' : 'rtl'"
          :aria-label="isUrdu ? 'Switch to English' : 'ویب سائٹ اردو میں دیکھیں'"
          @click="toggleLanguage"
        >
          {{ isUrdu ? 'EN' : 'اردو' }}
        </button>
        <!-- Search Trigger -->
        <button
          id="site-search-trigger"
          type="button"
          class="p-1.5 transition-colors hover:text-brand-gold"
          :aria-label="$tr('Search collection')"
          aria-haspopup="dialog"
          aria-controls="storefront-search-dialog"
          :aria-expanded="searchOpen"
          @click="searchOpen = !searchOpen"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <!-- Wishlist Link with Live Counter -->
        <NuxtLink
          to="/wishlist"
          class="relative flex items-center p-1.5 transition-colors hover:text-brand-gold"
          :aria-label="$tr('Saved Wishlist')"
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
            class="absolute -top-1.5 end-0 bg-brand-charcoal text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
          >
            {{ wishlist.totalItems }}
          </span>
        </NuxtLink>

        <!-- Account Link -->
        <NuxtLink
          :to="auth.isAuthenticated ? '/account' : '/login'"
          class="flex items-center space-x-1 rtl:space-x-reverse p-1.5 transition-colors hover:text-brand-gold"
          :aria-label="auth.isAuthenticated ? $tr('Customer Account') : $tr('Sign In')"
          :title="auth.isAuthenticated ? $tr('Signed in as {arg0}', { arg0: auth.userName }) : $tr('Sign In')"
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
          class="relative flex items-center p-1.5 transition-colors hover:text-brand-gold"
          id="site-cart-trigger"
          type="button"
          :aria-label="$tr('Open shopping bag')"
          aria-haspopup="dialog"
          aria-controls="shopping-bag-dialog"
          :aria-expanded="cart.isOpen"
          @click="cart.openCart()"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span
            v-if="cart.totalItems > 0"
            class="absolute -top-1.5 end-0 bg-brand-gold text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold"
          >
            {{ cart.totalItems }}
          </span>
        </button>
      </div>
    </div>

    <!-- Live Predictive Search Modal/Overlay -->
    <SearchOverlay v-model="searchOpen" />

    <!-- Mobile slide-over navigation -->
    <Teleport to="body">
      <dialog
        id="mobile-navigation-dialog"
        ref="menuDialog"
        aria-labelledby="mobile-navigation-title"
        aria-modal="true"
        class="storefront-dialog storefront-dialog--left fixed inset-y-0 start-0 end-auto m-0 h-[100dvh] max-h-none w-4/5 max-w-sm overflow-y-auto overscroll-contain border-e border-brand-border bg-brand-white p-0 text-brand-charcoal shadow-2xl"
        @cancel="onMenuCancel"
        @keydown="onMenuKeydown"
        @click.self="closeMobileMenu"
      >
       <div v-if="mobileMenuOpen" class="flex min-h-full flex-col justify-between p-5 sm:p-6">
        <div>
          <!-- Close button -->
          <div class="flex items-center justify-between pb-6 border-b border-brand-border">
            <h2 id="mobile-navigation-title" class="font-serif text-lg font-bold tracking-luxury text-brand-charcoal">{{ $tr("Menu") }}</h2>
            <button
              type="button"
              class="p-2 text-brand-charcoal"
              :aria-label="$tr('Close menu')"
              data-dialog-initial-focus
              @click="closeMobileMenu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Nav Items -->
          <nav :aria-label="$tr('Mobile navigation')" class="flex flex-col space-y-5 py-6 text-sm font-medium uppercase tracking-luxury">
            <NuxtLink
              to="/shop?sort=newest"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $tr("New In") }}
            </NuxtLink>
            <NuxtLink
              to="/shop?category=daily-pret"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $tr("Daily Pret") }}
            </NuxtLink>
            <NuxtLink
              to="/shop?category=co-ord-sets"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $tr("Co-ord Sets") }}
            </NuxtLink>
            <NuxtLink
              to="/shop?category=festive-edit"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $tr("Festive Edit") }}
            </NuxtLink>
            <NuxtLink
              to="/stitching"
              class="text-brand-gold font-semibold flex items-center space-x-1 rtl:space-x-reverse"
              @click="mobileMenuOpen = false"
            >
              <span>{{ $tr("Custom Stitching") }}</span>
              <span class="text-[9px] bg-brand-gold text-white px-1.5 py-0.2 tracking-normal">{{ $tr("Bespoke") }}</span>
            </NuxtLink>
            <NuxtLink
              to="/track-order"
              class="text-brand-charcoal hover:text-brand-gold transition-colors"
              @click="mobileMenuOpen = false"
            >
              {{ $tr("Track Order") }}
            </NuxtLink>
            <NuxtLink
              to="/wishlist"
              class="text-brand-charcoal hover:text-brand-gold transition-colors flex items-center justify-between"
              @click="mobileMenuOpen = false"
            >
              <span>{{ $tr("Wishlist") }}</span>
              <span v-if="wishlist.totalItems > 0" class="text-xs font-bold text-brand-gold">
                ({{ wishlist.totalItems }})
              </span>
            </NuxtLink>
            <NuxtLink
              :to="auth.isAuthenticated ? '/account' : '/login'"
              class="text-brand-charcoal hover:text-brand-gold transition-colors font-semibold"
              @click="mobileMenuOpen = false"
            >
              {{ auth.isAuthenticated ? $tr("My Account") : $tr("Sign In / Register") }}
            </NuxtLink>
          </nav>
        </div>

        <!-- Mobile Footer Contact -->
        <div v-if="chatUrl" class="pt-6 border-t border-brand-border text-xs text-brand-muted space-y-2">
          <p>{{ $tr("Assistance & Styling Advice:") }}</p>
          <a
            :href="chatUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="flex items-center space-x-2 rtl:space-x-reverse text-brand-charcoal font-medium hover:text-brand-gold"
          >
            <span>{{ $tr("Chat on WhatsApp") }}</span>
          </a>
        </div>
       </div>
      </dialog>
    </Teleport>
  </header>
</template>
