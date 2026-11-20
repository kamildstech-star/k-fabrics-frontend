<script setup lang="ts">
import ProductCard from '~/components/ProductCard.vue'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const route = useRoute()
const router = useRouter()

// Mobile filter slide-over state
const mobileFiltersOpen = ref(false)

// Price filter temporary state for inputs
const minPriceInput = ref(route.query.min_price ? String(route.query.min_price) : '')
const maxPriceInput = ref(route.query.max_price ? String(route.query.max_price) : '')

// Watch route changes to sync price inputs if URL changes externally
watch(
  () => route.query,
  (newQuery) => {
    minPriceInput.value = newQuery.min_price ? String(newQuery.min_price) : ''
    maxPriceInput.value = newQuery.max_price ? String(newQuery.max_price) : ''
  }
)

// Active filter getters from route
const currentCategory = computed(() => (route.query.category as string) || '')
const currentSize = computed(() => (route.query.size as string) || '')
const currentFabric = computed(() => (route.query.fabric_type as string) || '')
const currentPiece = computed(() => (route.query.piece_type as string) || '')
const currentMinPrice = computed(() => (route.query.min_price as string) || '')
const currentMaxPrice = computed(() => (route.query.max_price as string) || '')
const currentSort = computed(() => (route.query.sort as string) || 'newest')
const currentSearch = computed(() => (route.query.search as string) || '')
const currentPage = computed(() => Number(route.query.page) || 1)

// Fetch Categories for the filter sidebar
const { data: categoriesData } = await useFetch<any>(`${apiBase}/categories`, {
  lazy: false,
})
const categories = computed(() => categoriesData.value?.data || [])

// Dynamic SEO Meta
const seoPageTitle = computed(() => {
  if (currentSearch.value) return `Search: "${currentSearch.value}" | K. Fabrics Shop`
  if (currentCategory.value) {
    const matched = categories.value.find((c: any) => c.slug === currentCategory.value)
    if (matched) return `${matched.name} | K. Fabrics Minimalist Luxury`
  }
  return 'Shop Luxury Pret, Co-ords & Festive Suits | K. Fabrics Pakistan'
})

useSeoMeta({
  title: seoPageTitle,
  description: 'Browse K. Fabrics catalog of organic lawn suits, raw silk co-ords, and formal embroidered chiffon with bespoke fitting options across Pakistan.',
  ogTitle: seoPageTitle,
  ogDescription: 'Handcrafted minimalist luxury ladies garments. Pure natural fabrics and bespoke tailor ateliers.',
  ogImage: 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=80',
  ogType: 'website',
  twitterCard: 'summary_large_image',
})

// Build query object for API request
const apiQueryParams = computed(() => {
  const params: Record<string, any> = {
    page: currentPage.value,
    per_page: 12,
    sort: currentSort.value,
  }
  if (currentCategory.value) params.category = currentCategory.value
  if (currentSize.value) params.size = currentSize.value
  if (currentFabric.value) params.fabric_type = currentFabric.value
  if (currentPiece.value) params.piece_type = currentPiece.value
  if (currentMinPrice.value) params.min_price = currentMinPrice.value
  if (currentMaxPrice.value) params.max_price = currentMaxPrice.value
  if (currentSearch.value) params.search = currentSearch.value
  return params
})

// Fetch Products with reactive query params
const { data: productsResponse, pending: productsPending, refresh } = await useFetch<any>(
  `${apiBase}/products`,
  {
    params: apiQueryParams,
    watch: [apiQueryParams],
  }
)

const products = computed(() => productsResponse.value?.data || [])
const meta = computed(() => productsResponse.value?.meta || { current_page: 1, last_page: 1, total: 0 })

// Helper to push updated query params to route
const setQueryParam = (key: string, value: string | null) => {
  const newQuery = { ...route.query }
  if (value === null || value === '' || (key === 'sort' && value === 'newest') || (key === 'page' && value === '1')) {
    delete newQuery[key]
  } else {
    newQuery[key] = value
  }

  // Reset page to 1 whenever non-page filter changes
  if (key !== 'page') {
    delete newQuery.page
  }

  router.push({ query: newQuery })
}

const toggleFilter = (key: string, value: string) => {
  const current = route.query[key] as string
  if (current === value) {
    setQueryParam(key, null)
  } else {
    setQueryParam(key, value)
  }
}

const applyPriceFilter = () => {
  const newQuery = { ...route.query }
  if (minPriceInput.value) {
    newQuery.min_price = minPriceInput.value
  } else {
    delete newQuery.min_price
  }

  if (maxPriceInput.value) {
    newQuery.max_price = maxPriceInput.value
  } else {
    delete newQuery.max_price
  }

  delete newQuery.page
  router.push({ query: newQuery })
  mobileFiltersOpen.value = false
}

const clearAllFilters = () => {
  minPriceInput.value = ''
  maxPriceInput.value = ''
  router.push({ query: {} })
  mobileFiltersOpen.value = false
}

// Check count of active filters
const activeFiltersCount = computed(() => {
  let count = 0
  if (currentCategory.value) count++
  if (currentSize.value) count++
  if (currentFabric.value) count++
  if (currentPiece.value) count++
  if (currentMinPrice.value || currentMaxPrice.value) count++
  if (currentSearch.value) count++
  return count
})

// Current display title
const pageTitle = computed(() => {
  if (currentSearch.value) return `Search: "${currentSearch.value}"`
  if (currentCategory.value) {
    const matched = categories.value.find((c: any) => c.slug === currentCategory.value)
    if (matched) return matched.name
    return currentCategory.value.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }
  return 'Ready-to-Wear Collection'
})

// Filter constants
const availableSizes = ['XS', 'S', 'M', 'L', 'XL']
const availableFabrics = ['Lawn', 'Linen', 'Cotton', 'Organza', 'Silk', 'Chiffon']
const availablePieces = ['1-piece', '2-piece', '3-piece']

// Format Price
const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Breadcrumbs & Category Hero Bar -->
    <div class="border-b border-brand-border bg-brand-cream/50 py-8 px-4 sm:px-6 lg:px-8">
      <div class="max-w-7xl mx-auto">
        <!-- Breadcrumbs -->
        <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-3">
          <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
          <span>/</span>
          <NuxtLink to="/shop" :class="[currentCategory ? 'hover:text-brand-charcoal' : 'text-brand-charcoal font-semibold']">Shop</NuxtLink>
          <template v-if="currentCategory">
            <span>/</span>
            <span class="text-brand-charcoal font-semibold">{{ pageTitle }}</span>
          </template>
        </nav>

        <!-- Header Content -->
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">
              {{ pageTitle }}
            </h1>
            <p class="text-xs text-brand-muted mt-1 font-light">
              Showing {{ meta.total }} luxury designer pieces
            </p>
          </div>

          <!-- Controls: Sort & Mobile Filter Trigger -->
          <div class="flex items-center space-x-3">
            <!-- Mobile Filter Button -->
            <button
              class="lg:hidden flex items-center space-x-2 border border-brand-charcoal px-4 py-2.5 text-xs uppercase tracking-luxury font-medium text-brand-charcoal bg-white"
              @click="mobileFiltersOpen = true"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              <span>Filters</span>
              <span
                v-if="activeFiltersCount > 0"
                class="w-4 h-4 rounded-full bg-brand-gold text-white text-[10px] flex items-center justify-center font-bold"
              >
                {{ activeFiltersCount }}
              </span>
            </button>

            <!-- Sort Dropdown -->
            <div class="flex items-center space-x-2">
              <label for="sort-select" class="text-xs uppercase tracking-luxury text-brand-muted hidden sm:inline">
                Sort By:
              </label>
              <select
                id="sort-select"
                :value="currentSort"
                class="bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal font-medium uppercase tracking-wider focus:outline-none focus:border-brand-gold"
                @change="setQueryParam('sort', ($event.target as HTMLSelectElement).value)"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Active Filter Pills Bar -->
        <div v-if="activeFiltersCount > 0" class="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-brand-border/60">
          <span class="text-[10px] uppercase tracking-luxury text-brand-muted mr-1">Active Filters:</span>
          
          <button
            v-if="currentSearch"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="setQueryParam('search', null)"
          >
            <span>Search: {{ currentSearch }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            v-if="currentCategory"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="setQueryParam('category', null)"
          >
            <span>Category: {{ currentCategory }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            v-if="currentSize"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="setQueryParam('size', null)"
          >
            <span>Size: {{ currentSize }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            v-if="currentFabric"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="setQueryParam('fabric_type', null)"
          >
            <span>Fabric: {{ currentFabric }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            v-if="currentPiece"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="setQueryParam('piece_type', null)"
          >
            <span>Piece: {{ currentPiece }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            v-if="currentMinPrice || currentMaxPrice"
            class="inline-flex items-center text-[10px] uppercase tracking-wider bg-brand-cream border border-brand-border px-2.5 py-1 text-brand-charcoal hover:border-brand-charcoal"
            @click="() => { setQueryParam('min_price', null); setQueryParam('max_price', null); minPriceInput = ''; maxPriceInput = ''; }"
          >
            <span>Price: {{ currentMinPrice ? formatPrice(Number(currentMinPrice)) : '0' }} - {{ currentMaxPrice ? formatPrice(Number(currentMaxPrice)) : 'Any' }}</span>
            <span class="ml-1.5 text-xs">×</span>
          </button>

          <button
            class="text-[10px] uppercase tracking-luxury text-brand-gold underline underline-offset-4 ml-2 hover:text-brand-charcoal font-medium"
            @click="clearAllFilters"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>

    <!-- Main Content Area: Sidebar + Products Grid -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="flex flex-col lg:flex-row gap-10">
        <!-- Desktop Sticky Filter Sidebar -->
        <aside class="hidden lg:block w-64 shrink-0 space-y-8 sticky top-28 self-start">
          <!-- Categories Filter -->
          <div class="border-b border-brand-border pb-6">
            <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal mb-4">
              Categories
            </h3>
            <div class="space-y-2">
              <button
                class="w-full text-left text-xs uppercase tracking-wider transition-colors flex items-center justify-between"
                :class="[!currentCategory ? 'font-bold text-brand-gold' : 'text-brand-charcoal hover:text-brand-gold']"
                @click="setQueryParam('category', null)"
              >
                <span>All Collections</span>
                <span v-if="!currentCategory" class="text-brand-gold">●</span>
              </button>
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="w-full text-left text-xs uppercase tracking-wider transition-colors flex items-center justify-between"
                :class="[currentCategory === cat.slug ? 'font-bold text-brand-gold' : 'text-brand-charcoal hover:text-brand-gold']"
                @click="toggleFilter('category', cat.slug)"
              >
                <span>{{ cat.name }}</span>
                <span v-if="currentCategory === cat.slug" class="text-brand-gold">●</span>
              </button>
            </div>
          </div>

          <!-- Size Filter -->
          <div class="border-b border-brand-border pb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal">
                Size
              </h3>
              <button
                v-if="currentSize"
                class="text-[10px] text-brand-muted hover:underline"
                @click="setQueryParam('size', null)"
              >
                Reset
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sz in availableSizes"
                :key="sz"
                class="w-10 h-10 border text-xs font-medium uppercase transition-colors flex items-center justify-center"
                :class="[
                  currentSize === sz
                    ? 'border-brand-charcoal bg-brand-charcoal text-white font-bold'
                    : 'border-brand-border bg-white text-brand-charcoal hover:border-brand-charcoal'
                ]"
                @click="toggleFilter('size', sz)"
              >
                {{ sz }}
              </button>
            </div>
          </div>

          <!-- Fabric Type Filter -->
          <div class="border-b border-brand-border pb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal">
                Fabric Type
              </h3>
              <button
                v-if="currentFabric"
                class="text-[10px] text-brand-muted hover:underline"
                @click="setQueryParam('fabric_type', null)"
              >
                Reset
              </button>
            </div>
            <div class="space-y-2">
              <button
                v-for="fabric in availableFabrics"
                :key="fabric"
                class="w-full text-left text-xs uppercase tracking-wider transition-colors flex items-center justify-between"
                :class="[currentFabric === fabric ? 'font-bold text-brand-gold' : 'text-brand-charcoal hover:text-brand-gold']"
                @click="toggleFilter('fabric_type', fabric)"
              >
                <span>{{ fabric }}</span>
                <span v-if="currentFabric === fabric" class="text-brand-gold">●</span>
              </button>
            </div>
          </div>

          <!-- Piece Type Filter -->
          <div class="border-b border-brand-border pb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal">
                Piece Type
              </h3>
              <button
                v-if="currentPiece"
                class="text-[10px] text-brand-muted hover:underline"
                @click="setQueryParam('piece_type', null)"
              >
                Reset
              </button>
            </div>
            <div class="space-y-2">
              <button
                v-for="piece in availablePieces"
                :key="piece"
                class="w-full text-left text-xs uppercase tracking-wider transition-colors flex items-center justify-between"
                :class="[currentPiece === piece ? 'font-bold text-brand-gold' : 'text-brand-charcoal hover:text-brand-gold']"
                @click="toggleFilter('piece_type', piece)"
              >
                <span class="capitalize">{{ piece }}</span>
                <span v-if="currentPiece === piece" class="text-brand-gold">●</span>
              </button>
            </div>
          </div>

          <!-- Price Range Filter -->
          <div class="pb-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal">
                Price (PKR)
              </h3>
              <button
                v-if="currentMinPrice || currentMaxPrice"
                class="text-[10px] text-brand-muted hover:underline"
                @click="() => { setQueryParam('min_price', null); setQueryParam('max_price', null); minPriceInput = ''; maxPriceInput = ''; }"
              >
                Reset
              </button>
            </div>
            <div class="flex items-center space-x-2 mb-3">
              <input
                v-model="minPriceInput"
                type="number"
                placeholder="Min"
                class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
              >
              <span class="text-xs text-brand-muted">-</span>
              <input
                v-model="maxPriceInput"
                type="number"
                placeholder="Max"
                class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal focus:outline-none focus:border-brand-gold"
              >
            </div>
            <button
              class="w-full py-2 bg-brand-charcoal text-white text-[10px] uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
              @click="applyPriceFilter"
            >
              Apply Price
            </button>
          </div>
        </aside>

        <!-- Product Grid & Pagination Area -->
        <main class="flex-1">
          <!-- Pending Skeleton -->
          <div v-if="productsPending" class="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div
              v-for="i in 6"
              :key="i"
              class="aspect-[3/4] bg-brand-border/40 animate-pulse"
            />
          </div>

          <!-- Empty State -->
          <div
            v-else-if="products.length === 0"
            class="text-center py-20 border border-brand-border bg-brand-cream/30 p-8"
          >
            <div class="w-12 h-12 mx-auto text-brand-muted/50 mb-3">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 class="font-serif text-xl font-bold text-brand-charcoal mb-2">
              No Pieces Match Your Selection
            </h3>
            <p class="text-xs text-brand-muted max-w-sm mx-auto mb-6">
              Try adjusting your size, fabric type, or price filters to explore more of our luxury collection.
            </p>
            <button
              class="px-6 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
              @click="clearAllFilters"
            >
              Clear All Filters
            </button>
          </div>

          <!-- Products Listing Grid -->
          <div v-else class="grid grid-cols-2 md:grid-cols-3 gap-6">
            <ProductCard
              v-for="product in products"
              :key="product.id"
              :product="product"
            />
          </div>

          <!-- Pagination Controls -->
          <div
            v-if="meta.last_page > 1"
            class="mt-14 pt-8 border-t border-brand-border flex items-center justify-between"
          >
            <button
              :disabled="currentPage <= 1"
              class="px-4 py-2 border border-brand-border text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-charcoal hover:text-white"
              @click="setQueryParam('page', String(currentPage - 1))"
            >
              ← Previous
            </button>

            <!-- Page Indicators -->
            <div class="flex items-center space-x-1.5">
              <button
                v-for="p in meta.last_page"
                :key="p"
                class="w-8 h-8 text-xs font-medium transition-colors border"
                :class="[
                  p === currentPage
                    ? 'bg-brand-charcoal border-brand-charcoal text-white font-bold'
                    : 'border-brand-border text-brand-charcoal hover:border-brand-charcoal'
                ]"
                @click="setQueryParam('page', String(p))"
              >
                {{ p }}
              </button>
            </div>

            <button
              :disabled="currentPage >= meta.last_page"
              class="px-4 py-2 border border-brand-border text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-brand-charcoal hover:text-white"
              @click="setQueryParam('page', String(currentPage + 1))"
            >
              Next →
            </button>
          </div>
        </main>
      </div>
    </div>

    <!-- Mobile Filter Slide-Over Drawer -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="mobileFiltersOpen"
        class="fixed inset-0 bg-brand-charcoal/50 backdrop-blur-sm z-50 lg:hidden"
        @click="mobileFiltersOpen = false"
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
        v-if="mobileFiltersOpen"
        class="fixed top-0 left-0 bottom-0 w-4/5 max-w-sm bg-brand-white z-50 shadow-2xl flex flex-col justify-between border-r border-brand-border lg:hidden"
      >
        <div class="p-6 overflow-y-auto divide-y divide-brand-border">
          <!-- Drawer Header -->
          <div class="flex items-center justify-between pb-4">
            <h2 class="font-serif text-lg font-bold uppercase tracking-luxury text-brand-charcoal">
              Refine Collection
            </h2>
            <button
              class="text-brand-charcoal p-1"
              aria-label="Close filters"
              @click="mobileFiltersOpen = false"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Mobile Categories -->
          <div class="py-4">
            <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal mb-3">
              Categories
            </h3>
            <div class="space-y-2">
              <button
                class="w-full text-left text-xs uppercase tracking-wider flex justify-between"
                :class="[!currentCategory ? 'font-bold text-brand-gold' : 'text-brand-charcoal']"
                @click="setQueryParam('category', null)"
              >
                <span>All Collections</span>
                <span v-if="!currentCategory">●</span>
              </button>
              <button
                v-for="cat in categories"
                :key="cat.id"
                class="w-full text-left text-xs uppercase tracking-wider flex justify-between"
                :class="[currentCategory === cat.slug ? 'font-bold text-brand-gold' : 'text-brand-charcoal']"
                @click="toggleFilter('category', cat.slug)"
              >
                <span>{{ cat.name }}</span>
                <span v-if="currentCategory === cat.slug">●</span>
              </button>
            </div>
          </div>

          <!-- Mobile Sizes -->
          <div class="py-4">
            <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal mb-3">
              Size
            </h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="sz in availableSizes"
                :key="sz"
                class="w-10 h-10 border text-xs font-medium uppercase flex items-center justify-center"
                :class="[
                  currentSize === sz
                    ? 'border-brand-charcoal bg-brand-charcoal text-white font-bold'
                    : 'border-brand-border bg-white text-brand-charcoal'
                ]"
                @click="toggleFilter('size', sz)"
              >
                {{ sz }}
              </button>
            </div>
          </div>

          <!-- Mobile Fabric -->
          <div class="py-4">
            <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal mb-3">
              Fabric Type
            </h3>
            <div class="space-y-2">
              <button
                v-for="fabric in availableFabrics"
                :key="fabric"
                class="w-full text-left text-xs uppercase tracking-wider flex justify-between"
                :class="[currentFabric === fabric ? 'font-bold text-brand-gold' : 'text-brand-charcoal']"
                @click="toggleFilter('fabric_type', fabric)"
              >
                <span>{{ fabric }}</span>
                <span v-if="currentFabric === fabric">●</span>
              </button>
            </div>
          </div>

          <!-- Mobile Price -->
          <div class="py-4">
            <h3 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal mb-3">
              Price Range (PKR)
            </h3>
            <div class="flex items-center space-x-2 mb-3">
              <input
                v-model="minPriceInput"
                type="number"
                placeholder="Min"
                class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal"
              >
              <span class="text-xs text-brand-muted">-</span>
              <input
                v-model="maxPriceInput"
                type="number"
                placeholder="Max"
                class="w-full bg-white border border-brand-border px-2.5 py-1.5 text-xs text-brand-charcoal"
              >
            </div>
            <button
              class="w-full py-2 bg-brand-charcoal text-white text-[10px] uppercase tracking-luxury font-medium"
              @click="applyPriceFilter"
            >
              Apply Price
            </button>
          </div>
        </div>

        <!-- Mobile Drawer Bottom CTA -->
        <div class="p-6 border-t border-brand-border bg-brand-cream/40 flex items-center gap-3">
          <button
            class="flex-1 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium"
            @click="mobileFiltersOpen = false"
          >
            Show {{ meta.total }} Results
          </button>
          <button
            v-if="activeFiltersCount > 0"
            class="px-4 py-3 border border-brand-border text-xs uppercase tracking-luxury text-brand-muted"
            @click="clearAllFilters"
          >
            Clear
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>