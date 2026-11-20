<script setup lang="ts">
import { useWishlistStore } from '~/stores/wishlist'
import { useCartStore } from '~/stores/cart'
import ProductCard from '~/components/ProductCard.vue'

const wishlist = useWishlistStore()
const cart = useCartStore()

onMounted(() => {
  wishlist.initWishlist()
})

const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-8">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">Wishlist</span>
      </nav>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-end justify-between border-b border-brand-border pb-6 mb-10">
        <div>
          <span class="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold block mb-1">
            Personal Curation
          </span>
          <h1 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
            Saved Pieces
          </h1>
          <p class="text-xs text-brand-muted mt-1 font-light">
            {{ wishlist.items.length }} {{ wishlist.items.length === 1 ? 'garment' : 'garments' }} saved to your personal atelier wishlist
          </p>
        </div>

        <button
          v-if="wishlist.items.length > 0"
          class="text-xs uppercase tracking-luxury text-brand-muted hover:text-red-600 transition-colors mt-4 sm:mt-0 underline underline-offset-4"
          @click="wishlist.clearWishlist()"
        >
          Clear All
        </button>
      </div>

      <!-- Empty State -->
      <div
        v-if="wishlist.items.length === 0"
        class="max-w-md mx-auto text-center py-20 border border-brand-border bg-brand-cream/30 p-8"
      >
        <div class="w-12 h-12 mx-auto text-brand-muted/40 mb-3">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 class="font-serif text-xl font-bold text-brand-charcoal mb-2">
          Your Wishlist is Empty
        </h2>
        <p class="text-xs text-brand-muted max-w-xs mx-auto mb-6">
          Explore our latest Pret collection or bespoke tailored ensembles and tap the heart icon to save your favorites.
        </p>
        <NuxtLink
          to="/shop"
          class="inline-block px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
        >
          Explore Collection
        </NuxtLink>
      </div>

      <!-- Wishlist Product Grid -->
      <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        <ProductCard
          v-for="product in wishlist.items"
          :key="product.id"
          :product="product"
        />
      </div>
    </div>
  </div>
</template>
