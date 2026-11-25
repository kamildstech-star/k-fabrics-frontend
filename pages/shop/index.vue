<script setup lang="ts">
import ProductCard from '~/components/ProductCard.vue'
import CatalogFilters from '~/components/CatalogFilters.vue'
import type { LocationQueryRaw } from 'vue-router'
import { catalogSort, defaultCatalogSort, normalizeDiscoverySearch, normalizedFacet } from '~/utils/discovery'
import type { FacetOption, FilterGroup, FilterKey, ProductFacets } from '~/utils/discovery'
import { collectionPath, storefrontUrl, upstreamHttpStatus } from '~/utils/seo'

type CatalogProduct = InstanceType<typeof ProductCard>['$props']['product']
type CatalogCategory = { name: string; slug: string; children?: CatalogCategory[] }
type CatalogResults = { data: CatalogProduct[]; meta: { current_page: number; last_page: number; total: number } }

const { public: { apiBase, siteUrl } } = useRuntimeConfig()
const route = useRoute()
const router = useRouter()
const mobileFilterOpen = ref(false)
const closeFilters = () => { mobileFilterOpen.value = false }
const { dialog: filterDialog, onCancel, onKeydown } = useStorefrontDialog(
  () => mobileFilterOpen.value, closeFilters, '#mobile-filter-trigger',
)

const queryString = (key: string) => {
  const value = route.query[key]
  return typeof value === 'string' ? value.trim().slice(0, 100) : ''
}
const search = computed(() => normalizeDiscoverySearch(queryString('search')))
const selected = computed<Record<FilterKey, string>>(() => ({
  category: normalizedFacet(queryString('category')),
  size: normalizedFacet(queryString('size')),
  fabric_type: normalizedFacet(queryString('fabric_type')),
  piece_type: normalizedFacet(queryString('piece_type')),
  color: normalizedFacet(queryString('color')),
}))
const minPrice = computed(() => queryString('min_price'))
const maxPrice = computed(() => queryString('max_price'))
const sort = computed(() => catalogSort(queryString('sort'), search.value))
const page = computed(() => Math.max(1, Math.min(100_000, Number.parseInt(queryString('page'), 10) || 1)))

const params = computed(() => ({
  per_page: 12,
  page: page.value,
  sort: sort.value,
  ...Object.fromEntries(Object.entries({
    ...selected.value,
    search: search.value,
    min_price: minPrice.value,
    max_price: maxPrice.value,
  }).filter(([, value]) => value)),
}))
const facetParams = computed(() => ({
  category: selected.value.category || undefined, search: search.value || undefined,
}))

const [catalog, facetData, categoryData] = await Promise.all([
  useFetch<CatalogResults>(`${apiBase}/products`, { query: params, retry: 0, timeout: 10_000 }),
  useFetch<{ data: ProductFacets }>(`${apiBase}/products/facets`, { query: facetParams, retry: 0, timeout: 10_000 }),
  useFetch<{ data: CatalogCategory[] }>(`${apiBase}/categories`, { retry: 0, timeout: 10_000 }),
])

function flattenCategories(list: CatalogCategory[], map = new Map<string, FacetOption>()) {
  for (const category of list) {
    map.set(category.slug, { id: category.slug, label: category.name })
    if (category.children?.length) flattenCategories(category.children, map)
  }
  return [...map.values()]
}
const facets = computed(() => facetData.data.value?.data)
const categories = computed(() => facets.value?.categories || flattenCategories(categoryData.data.value?.data || []))
const groups = computed<FilterGroup[]>(() => [
  { key: 'category', name: 'Collection', options: categories.value },
  { key: 'size', name: 'Size', options: facets.value?.sizes || [] },
  { key: 'fabric_type', name: 'Fabric', options: facets.value?.fabrics || [] },
  { key: 'piece_type', name: 'Piece type', options: facets.value?.pieces || [] },
  { key: 'color', name: 'Color', options: facets.value?.colors || [] },
])
const products = computed(() => catalog.data.value?.data || [])
const validCatalog = computed(() => {
  const result = catalog.data.value
  return Array.isArray(result?.data)
    && Number.isInteger(result.meta?.current_page)
    && Number.isInteger(result.meta?.last_page) && result.meta.last_page >= 1
    && Number.isInteger(result.meta?.total) && result.meta.total >= 0
})
const catalogFailed = computed(() => Boolean(catalog.error.value)
  || (catalog.status.value === 'success' && !validCatalog.value))
const meta = computed(() => catalog.data.value?.meta || { current_page: 1, last_page: 1, total: 0 })
const activeChips = computed(() => groups.value.flatMap(group => {
  const value = selected.value[group.key]
  if (!value) return []
  const label = group.options.find(option => option.id === value)?.label || value
  return [{ key: group.key, text: `${group.name}: ${label}` }]
}))
const filterCount = computed(() => activeChips.value.length + Number(Boolean(minPrice.value || maxPrice.value)))
const pageTitle = computed(() => {
  if (search.value) return `Search results for “${search.value}”`
  return categories.value.find(category => category.id === selected.value.category)?.label || 'Ready-to-Wear Collection'
})
const title = computed(() => `${pageTitle.value}${page.value > 1 ? ` – Page ${page.value}` : ''} | K. Fabrics`)
const adHocFilters = computed(() => Boolean(
  selected.value.size || selected.value.fabric_type || selected.value.piece_type
    || selected.value.color || minPrice.value || maxPrice.value,
))
const shopStatus = computed<200 | 400 | 404 | 503>(() => {
  if (catalogFailed.value) {
    return [400, 422].includes(upstreamHttpStatus(catalog.error.value) ?? 0) ? 400 : 503
  }
  if (!catalog.pending.value && validCatalog.value
    && (page.value > meta.value.last_page
      || (!products.value.length && (adHocFilters.value || Boolean(selected.value.category && !search.value))))) {
    return 404
  }
  return 200
})
const keepIndexed = computed(() => shopStatus.value === 200 && !catalog.pending.value
  && validCatalog.value && products.value.length > 0 && !search.value && !adHocFilters.value
  && sort.value === defaultCatalogSort(''))
const canonical = computed(() => keepIndexed.value
  ? storefrontUrl(siteUrl, collectionPath(selected.value.category, page.value))
  : undefined)
if (import.meta.server && shopStatus.value !== 200) {
  setResponseStatus(shopStatus.value)
  useResponseHeader('Cache-Control').value = 'no-store'
  if (shopStatus.value === 503) useResponseHeader('Retry-After').value = '60'
}
useSeoMeta({
  title,
  ogTitle: title,
  ogUrl: canonical,
  description: 'Browse ready-to-wear fabrics and discover your preferred sizes, colors, and collections.',
  robots: () => keepIndexed.value || shopStatus.value === 503 ? undefined : 'noindex, follow',
})
useHead(() => canonical.value ? { link: [{ rel: 'canonical', href: canonical.value }] } : {})

function patchQuery(changes: Record<string, string>, resetPage = true) {
  const next: LocationQueryRaw = { ...route.query }
  for (const [key, value] of Object.entries(changes)) {
    if (!value || (key === 'sort' && value === defaultCatalogSort(search.value)) || (key === 'page' && value === '1')) delete next[key]
    else next[key] = value
  }
  if (resetPage) delete next.page
  return router.push({ query: next })
}
const changeFilter = (key: FilterKey, value: string) => void patchQuery({ [key]: value })
const changeSort = (event: Event) => void patchQuery({ sort: (event.target as HTMLSelectElement).value })
function pageLocation(value: number) {
  const query: LocationQueryRaw = Object.fromEntries(Object.entries({
    ...selected.value,
    search: search.value,
    min_price: minPrice.value,
    max_price: maxPrice.value,
    sort: sort.value === defaultCatalogSort(search.value) ? '' : sort.value,
    page: value > 1 ? String(value) : '',
  }).filter(([, value]) => value))
  return { path: '/shop', query }
}
const changePage = (value: number) => void router.push(pageLocation(value))
const changePrice = (min: string, max: string) => { void patchQuery({ min_price: min, max_price: max }); closeFilters() }
const clearFilters = () => { void patchQuery({ category: '', size: '', fabric_type: '', piece_type: '', color: '', min_price: '', max_price: '' }); closeFilters() }
const retryFacets = () => { void facetData.refresh(); if (categoryData.error.value) void categoryData.refresh() }

</script>

<template>
  <div class="min-h-screen bg-brand-white">
    <div class="border-b border-brand-border bg-brand-cream/50">
      <header class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <nav aria-label="Breadcrumb" class="flex items-center flex-wrap gap-2 text-xs text-brand-muted">
          <NuxtLink to="/">Home</NuxtLink><span aria-hidden="true">/</span><NuxtLink to="/shop" aria-current="page">Shop</NuxtLink>
        </nav>
        <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div class="min-w-0">
            <h1 class="font-serif text-3xl sm:text-4xl font-bold break-words">{{ pageTitle }}</h1>
            <p class="mt-1 text-sm" role="status">
              <template v-if="catalog.pending.value">Loading products…</template>
              <template v-else-if="!catalogFailed">{{ meta.total }} {{ meta.total === 1 ? 'product' : 'products' }}</template>
            </p>
          </div>
          <div class="flex min-w-0 flex-wrap gap-2 items-end">
            <button
              id="mobile-filter-trigger" type="button" class="catalog-outline lg:hidden shrink-0"
              aria-haspopup="dialog" :aria-expanded="mobileFilterOpen" aria-controls="mobile-catalog-filters"
              @click="mobileFilterOpen = true"
            >Filters{{ filterCount ? ` (${filterCount})` : '' }}</button>
            <div class="min-w-0 flex-1 md:flex-none">
              <label for="catalog-sort" class="block text-xs font-semibold mb-1">Sort by</label>
              <select id="catalog-sort" :value="sort" class="catalog-outline w-full min-w-0" @change="changeSort">
                <option v-if="search" value="relevance">Best match</option><option value="newest">Newest</option>
                <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
              </select>
            </div>
          </div>
        </div>

        <ul v-if="activeChips.length || minPrice || maxPrice || search" aria-label="Active filters" class="flex flex-wrap gap-2">
          <li v-if="search" class="max-w-full"><button type="button" class="catalog-outline break-words max-w-full" aria-label="Remove search" @click="patchQuery({ search: '', sort: '' })">Search: {{ search }} <span aria-hidden="true">×</span></button></li>
          <li v-for="chip in activeChips" :key="chip.key" class="max-w-full">
            <button type="button" :aria-label="`Remove filter ${chip.text}`" class="catalog-outline break-words max-w-full" @click="changeFilter(chip.key, '')">{{ chip.text }} <span aria-hidden="true">×</span></button>
          </li>
          <li v-if="minPrice || maxPrice"><button type="button" class="catalog-outline" aria-label="Remove price range" @click="changePrice('', '')">Price: {{ minPrice || '0' }}–{{ maxPrice || 'any' }} <span aria-hidden="true">×</span></button></li>
          <li v-if="filterCount"><button type="button" class="catalog-outline underline" @click="clearFilters">Clear filters</button></li>
        </ul>
      </header>
    </div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
      <aside aria-label="Catalog filters" class="hidden lg:block">
        <CatalogFilters :groups="groups" :selected="selected" :min-price="minPrice" :max-price="maxPrice"
          :facets-pending="facetData.pending.value" :facets-failed="Boolean(facetData.error.value)"
          @retry="retryFacets" @change="changeFilter" @price="changePrice" />
      </aside>

      <section class="min-w-0" aria-label="Product results" :aria-busy="catalog.pending.value">
        <div v-if="catalog.pending.value" class="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-6" aria-hidden="true">
          <div v-for="i in 6" :key="i" class="aspect-[3/4] bg-brand-cream animate-pulse" />
        </div>
        <div v-else-if="catalogFailed" role="alert" class="space-y-3 border border-brand-border p-6">
          <h2 class="font-serif text-xl">We couldn’t load the collection</h2>
          <p>Your search and filters are still selected.</p>
          <button type="button" class="catalog-outline" @click="catalog.refresh()">Retry products</button>
        </div>
        <div v-else-if="!products.length && page > 1 && meta.total > 0" class="space-y-3 border border-brand-border p-6">
          <h2 class="font-serif text-xl">No products on this page</h2>
          <button type="button" class="catalog-outline" @click="changePage(1)">Go to first page</button>
        </div>
        <div v-else-if="!products.length" class="space-y-3 border border-brand-border p-6">
          <h2 class="font-serif text-xl">No products match your selection</h2>
          <p>Try a different search or remove a filter.</p>
          <button v-if="filterCount" type="button" class="catalog-outline" @click="clearFilters">Clear filters</button>
          <button v-else-if="search" type="button" class="catalog-outline" @click="patchQuery({ search: '', sort: '' })">Browse all products</button>
        </div>
        <div v-else class="grid grid-cols-[repeat(2,minmax(0,1fr))] md:grid-cols-[repeat(3,minmax(0,1fr))] gap-2 sm:gap-6">
          <ProductCard v-for="product in products" :key="product.id" :product="product" class="min-w-0" />
        </div>

        <nav v-if="!catalogFailed && !catalog.pending.value && meta.last_page > 1" aria-label="Product pages" class="flex flex-wrap items-center justify-between gap-2 mt-8">
          <NuxtLink v-if="page > 1" :to="pageLocation(page - 1)" class="catalog-outline" prefetch-on="interaction" aria-label="Previous product page">Previous</NuxtLink>
          <span v-else class="catalog-outline opacity-50" aria-disabled="true">Previous</span>
          <span class="text-sm">Page {{ meta.current_page }} of {{ meta.last_page }}</span>
          <NuxtLink v-if="page < meta.last_page" :to="pageLocation(page + 1)" class="catalog-outline" prefetch-on="interaction" aria-label="Next product page">Next</NuxtLink>
          <span v-else class="catalog-outline opacity-50" aria-disabled="true">Next</span>
        </nav>
      </section>
    </div>

    <dialog
      id="mobile-catalog-filters" ref="filterDialog" class="max-h-[90vh] p-0 overflow-auto backdrop:bg-black/50"
      aria-modal="true" aria-labelledby="mobile-filter-title" @cancel="onCancel" @keydown="onKeydown" @click.self="closeFilters"
    >
      <div class="p-4 sm:p-6 min-w-0">
        <div class="flex items-center justify-between gap-2 mb-4">
          <h2 id="mobile-filter-title" class="font-serif text-xl font-bold">Filters</h2>
          <button data-dialog-initial-focus type="button" class="catalog-outline" aria-label="Close filters" @click="closeFilters">Close</button>
        </div>
        <CatalogFilters :groups="groups" :selected="selected" :min-price="minPrice" :max-price="maxPrice"
          :facets-pending="facetData.pending.value" :facets-failed="Boolean(facetData.error.value)"
          @retry="retryFacets" @change="changeFilter" @price="changePrice" />
        <div class="mt-5 flex flex-wrap gap-2"><button type="button" class="catalog-outline" @click="closeFilters">Show products</button>
          <button v-if="filterCount" type="button" class="catalog-outline" @click="clearFilters">Clear filters</button></div>
      </div>
    </dialog>
  </div>
</template>

<style scoped>
dialog { width: min(25rem, calc(100% - 2rem)); }
.catalog-outline { @apply border border-brand-charcoal bg-white px-3 py-2 text-sm disabled:opacity-50; }
:where(button, select, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
