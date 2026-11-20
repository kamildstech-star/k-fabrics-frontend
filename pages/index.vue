<script setup lang="ts">
import ProductCard from '~/components/ProductCard.vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

// Fetch featured products from Laravel REST API
const { data: featuredData, pending: productsPending } = await useFetch<any>(`${apiBase}/products?is_featured=true&per_page=4`, {
  lazy: false,
})

// Fetch active categories
const { data: categoriesData } = await useFetch<any>(`${apiBase}/categories`, {
  lazy: false,
})

const featuredProducts = computed(() => featuredData.value?.data || [])
const categories = computed(() => {
  const all = categoriesData.value?.data || []
  // Ensure the top 3 featured categories (Daily Pret, Co-ord Sets, Festive Edit) appear nicely
  return all.slice(0, 3)
})

// Curated aesthetic fallback visuals if categories don't have custom image URLs
const getCategoryFallbackImage = (slug: string, index: number) => {
  const images: Record<string, string> = {
    'daily-pret': 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80',
    'co-ord-sets': 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80',
    'festive-edit': 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80',
  }
  return images[slug] || (index === 0 
    ? 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=80'
    : index === 1
      ? 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=1000&q=80'
      : 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1000&q=80')
}
</script>

<template>
  <div class="bg-brand-white">
    <!-- 1. Full-Bleed Hero Banner (85vh) -->
    <section class="relative h-[85vh] min-h-[580px] max-h-[880px] flex items-center justify-center overflow-hidden border-b border-brand-border">
      <!-- High-Fashion Editorial Background Image with Subtle Parallax / Fill -->
      <img
        src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=2000&q=85"
        alt="K. Fabrics Autumn Collection"
        class="absolute inset-0 w-full h-full object-cover object-[center_35%] scale-105"
      >
      <!-- Luxury Gradient & Dark Tint Overlay for High Text Contrast -->
      <div class="absolute inset-0 bg-gradient-to-t from-brand-charcoal/85 via-brand-charcoal/45 to-brand-charcoal/50" />

      <!-- Center Hero Content -->
      <div class="relative z-10 max-w-4xl mx-auto text-center px-4 sm:px-6">
        <span class="inline-block text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-brand-gold font-semibold mb-4 drop-shadow-sm">
          Autumn / Festive Atelier 2026
        </span>
        <h1 class="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white mb-6 leading-tight drop-shadow-md">
          Timeless Silhouettes, <br class="hidden sm:block">
          <span class="italic font-normal font-serif">Tailored to You</span>
        </h1>
        <p class="text-xs sm:text-sm text-gray-200 max-w-xl mx-auto mb-10 leading-relaxed font-light drop-shadow-sm">
          Minimalist ready-to-wear clothing in refined lawns, linens, and pure silks, paired with bespoke tailoring to your exact body measurements.
        </p>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <NuxtLink
            to="/shop"
            class="w-full sm:w-auto px-9 py-4 bg-white text-brand-charcoal hover:bg-brand-gold hover:text-white text-xs uppercase tracking-luxury font-medium transition-all duration-300 shadow-md"
          >
            Shop Ready-to-Wear
          </NuxtLink>
          <NuxtLink
            to="/stitching"
            class="w-full sm:w-auto px-9 py-4 border border-white text-white hover:bg-white hover:text-brand-charcoal text-xs uppercase tracking-luxury font-medium transition-all duration-300 backdrop-blur-sm"
          >
            Book Custom Stitching
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- 2. 3-Column Editorial Category Grid -->
    <section class="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="text-center max-w-xl mx-auto mb-14">
        <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-1">
          Curation
        </span>
        <h2 class="font-serif text-2xl sm:text-4xl font-bold text-brand-charcoal">
          Shop by Aesthetic
        </h2>
        <div class="w-12 h-0.5 bg-brand-gold mx-auto mt-4" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div
          v-for="(cat, idx) in categories"
          :key="cat.id"
          class="group relative aspect-[3/4] bg-brand-cream overflow-hidden border border-brand-border"
        >
          <img
            :src="cat.image_url || getCategoryFallbackImage(cat.slug, idx)"
            :alt="cat.name"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-brand-charcoal/80 via-brand-charcoal/20 to-transparent" />
          
          <div class="absolute bottom-0 inset-x-0 p-8 text-white text-center flex flex-col items-center">
            <h3 class="font-serif text-2xl font-bold tracking-luxury uppercase mb-3 drop-shadow-sm">
              {{ cat.name }}
            </h3>
            <NuxtLink
              :to="`/shop?category=${cat.slug}`"
              class="inline-block text-[11px] uppercase tracking-luxury border-b border-white/60 pb-1 hover:border-white hover:text-brand-gold transition-colors"
            >
              Explore Collection →
            </NuxtLink>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Featured Collection Grid -->
    <section class="py-20 bg-brand-cream/60 border-y border-brand-border">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-center justify-between mb-12">
          <div>
            <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-1">
              Curated Pret
            </span>
            <h2 class="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
              Featured Edition
            </h2>
          </div>
          <NuxtLink
            to="/shop"
            class="text-xs uppercase tracking-luxury text-brand-charcoal hover:text-brand-gold transition-colors border-b border-brand-charcoal hover:border-brand-gold pb-0.5 mt-4 sm:mt-0 font-medium"
          >
            View All Collection →
          </NuxtLink>
        </div>

        <div v-if="productsPending" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div v-for="i in 4" :key="i" class="animate-pulse aspect-[3/4] bg-brand-border/40" />
        </div>

        <div v-else-if="featuredProducts.length > 0" class="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <ProductCard
            v-for="product in featuredProducts"
            :key="product.id"
            :product="product"
          />
        </div>

        <div v-else class="text-center py-12 text-xs text-brand-muted">
          No featured products found.
        </div>
      </div>
    </section>

    <!-- 4. Bespoke Stitching Spotlight (50/50 Split on #F9F8F6) -->
    <section class="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center bg-brand-cream border border-brand-border p-8 sm:p-14">
        <div>
          <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-2">
            Signature Tailoring Service
          </span>
          <h2 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal mb-6 leading-tight">
            Online Custom Tailoring for Your Unstitched Fabric
          </h2>
          <p class="text-xs sm:text-sm text-brand-muted leading-relaxed mb-6 font-light">
            Have favorite unstitched fabric from any brand? Send it to our atelier. Our master tailors cut, style, and hand-finish each garment according to your personal measurement profile or sample suit.
          </p>
          <ul class="space-y-3.5 text-xs text-brand-charcoal mb-8">
            <li class="flex items-center space-x-2.5">
              <span class="w-1.5 h-1.5 bg-brand-gold rounded-full" />
              <span>Rider Pickup in Lahore, Karachi & Islamabad or Courier Inbound</span>
            </li>
            <li class="flex items-center space-x-2.5">
              <span class="w-1.5 h-1.5 bg-brand-gold rounded-full" />
              <span>Submit precise measurements online or send a sample suit</span>
            </li>
            <li class="flex items-center space-x-2.5">
              <span class="w-1.5 h-1.5 bg-brand-gold rounded-full" />
              <span>Fast 5–7 working days turnaround with doorstep delivery</span>
            </li>
          </ul>

          <NuxtLink
            to="/stitching"
            class="inline-block px-9 py-4 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200"
          >
            Book Custom Stitching
          </NuxtLink>
        </div>

        <div class="relative aspect-square sm:aspect-[4/3] overflow-hidden border border-brand-border">
          <img
            src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80"
            alt="K. Fabrics Custom Tailoring"
            class="w-full h-full object-cover"
          >
        </div>
      </div>
    </section>

    <!-- 5. Trust Strip (4 Clean Blocks with Minimalist Icons) -->
    <section class="border-t border-brand-border py-14 bg-brand-white">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        <!-- Block 1: COD -->
        <div class="flex flex-col items-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-brand-cream border border-brand-border flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <h4 class="font-serif text-sm font-semibold text-brand-charcoal uppercase tracking-luxury">Nationwide COD</h4>
          <p class="text-xs text-brand-muted max-w-[200px]">Cash on delivery available across all cities and towns in Pakistan.</p>
        </div>

        <!-- Block 2: Custom Fitting -->
        <div class="flex flex-col items-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-brand-cream border border-brand-border flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <h4 class="font-serif text-sm font-semibold text-brand-charcoal uppercase tracking-luxury">Custom Fitting</h4>
          <p class="text-xs text-brand-muted max-w-[200px]">Tailored precisely to your body measurements or sample suit.</p>
        </div>

        <!-- Block 3: Quality Check -->
        <div class="flex flex-col items-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-brand-cream border border-brand-border flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h4 class="font-serif text-sm font-semibold text-brand-charcoal uppercase tracking-luxury">Quality Check</h4>
          <p class="text-xs text-brand-muted max-w-[200px]">Every stitch, seam, and hem inspected before luxury packaging.</p>
        </div>

        <!-- Block 4: WhatsApp Support -->
        <div class="flex flex-col items-center space-y-3">
          <div class="w-10 h-10 rounded-full bg-brand-cream border border-brand-border flex items-center justify-center text-brand-gold">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 class="font-serif text-sm font-semibold text-brand-charcoal uppercase tracking-luxury">Stylist Assistance</h4>
          <p class="text-xs text-brand-muted max-w-[200px]">Live WhatsApp styling advice, measurement help & updates.</p>
        </div>
      </div>
    </section>
  </div>
</template>