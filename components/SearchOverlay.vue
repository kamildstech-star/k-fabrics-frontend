<script setup lang="ts">
import { normalizeDiscoverySearch, searchMaxLength, searchMinLength } from '~/utils/discovery'
import { formatPrice } from '~/utils/checkout'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [open: boolean] }>()

interface SuggestedProduct {
  id: number
  name: string
  slug: string
  fabric_type: string | null
  piece_type: string | null
  base_price: number
  sale_price: number | null
  primary_image: string | null
}

const { public: { apiBase } } = useRuntimeConfig()
const searchInput = ref<HTMLInputElement | null>(null)
const query = ref('')
const term = computed(() => normalizeDiscoverySearch(query.value))
const canSearch = computed(() => term.value.length >= searchMinLength)
const status = ref<'idle' | 'pending' | 'empty' | 'success' | 'error'>('idle')
const results = ref<SuggestedProduct[]>([])
let debounceTimer: ReturnType<typeof setTimeout> | undefined
let request: AbortController | undefined
let revision = 0

function stopSearch() {
  ++revision
  clearTimeout(debounceTimer)
  request?.abort()
}
function searchSuggestions(immediate = false) {
  stopSearch()
  results.value = []
  if (!props.modelValue || !canSearch.value) {
    status.value = 'idle'
    return
  }
  const inputTerm = term.value
  const run = revision
  status.value = 'pending'
  debounceTimer = setTimeout(async () => {
    const controller = new AbortController()
    request = controller
    try {
      const response = await $fetch<{ data: SuggestedProduct[] }>(`${apiBase}/search/suggest`, {
        query: { q: inputTerm }, signal: controller.signal, retry: 0, timeout: 5_000,
      })
      if (run !== revision) return
      if (!Array.isArray(response.data)) throw new Error('Unrecognized search response.')
      results.value = response.data
      status.value = results.value.length ? 'success' : 'empty'
    } catch {
      if (run === revision) status.value = 'error'
    }
  }, immediate ? 0 : 250)
}

function close() {
  stopSearch()
  emit('update:modelValue', false)
}
function submitSearch() {
  if (!canSearch.value) return
  const search = term.value
  close()
  return navigateTo({ path: '/shop', query: { search } })
}
function clearSearch() {
  query.value = ''
  searchInput.value?.focus()
}
const { dialog, onCancel, onKeydown } = useStorefrontDialog(
  () => props.modelValue, close, '#site-search-trigger',
)
watch(term, () => searchSuggestions())
watch(() => props.modelValue, open => {
  if (open) return
  stopSearch()
  status.value = 'idle'
  query.value = ''
  results.value = []
})
onBeforeUnmount(stopSearch)
</script>

<template>
  <Teleport to="body">
    <dialog
      id="storefront-search-dialog"
      ref="dialog"
      aria-modal="true"
      aria-labelledby="search-dialog-title"
      class="storefront-dialog fixed inset-x-0 top-0 bottom-auto m-0 max-h-[85dvh] w-full max-w-none overflow-y-auto overscroll-contain border-b border-brand-border bg-brand-white p-0 text-brand-charcoal shadow-xl"
      @cancel="onCancel"
      @keydown="onKeydown"
      @click.self="close"
    >
      <div v-if="modelValue">
          <div class="mx-auto max-w-4xl px-4 sm:px-6 py-5 space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 id="search-dialog-title" class="font-serif text-xl font-bold">{{ $tr("Search the collection") }}</h2>
              <button type="button" :aria-label="$tr('Close search')" class="search-button" @click="close">{{ $tr("Close") }}</button>
            </div>

            <form class="space-y-2" role="search" @submit.prevent="submitSearch">
              <label for="global-catalog-search" class="block font-semibold text-sm">{{ $tr("Product search") }}</label>
              <div class="flex flex-wrap gap-2">
                <input id="global-catalog-search" ref="searchInput" v-model="query" type="search" :maxlength="searchMaxLength"
                  :placeholder="$tr('Try a product, fabric or color')" autocomplete="off" class="grow w-full sm:w-auto sm:min-w-0 px-3 py-2 border border-brand-border bg-white"
                  aria-describedby="global-search-help" data-dialog-initial-focus>
                <button type="submit" class="search-primary" :disabled="!canSearch">{{ $tr("Search") }}</button>
                <button v-if="query" type="button" class="search-button" @click="clearSearch">{{ $tr("Clear") }}</button>
              </div>
              <p id="global-search-help" class="text-sm text-brand-muted">{{ $tr("Enter at least two characters to search.") }}</p>
            </form>

            <div :aria-busy="status === 'pending'" class="space-y-3">
              <p v-if="status === 'pending'" class="text-sm" role="status">{{ $tr("Looking for products…") }}</p>
              <div v-else-if="status === 'error'" role="alert" class="space-y-2 text-red-800">
                <p>{{ $tr("Suggestions are temporarily unavailable. You can retry or search the full collection.") }}</p>
                <button type="button" class="search-button" @click="searchSuggestions(true)">{{ $tr("Retry suggestions") }}</button>
              </div>
              <p v-else-if="status === 'empty'" role="status" class="text-sm">{{ $tr("No products match “{query}”. Try a different product, fabric, or color.", { query: term }) }}</p>
              <template v-else-if="status === 'success'">
                <p role="status" class="text-sm">{{ $tr(results.length === 1 ? "{count} quick match" : "{count} quick matches", { count: results.length }) }}</p>
                <ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  <li v-for="item in results" :key="item.id" class="min-w-0">
                    <NuxtLink :to="`/products/${encodeURIComponent(item.slug)}`" class="flex items-center gap-3 min-w-0 border border-brand-border bg-brand-cream/30 p-2 hover:border-brand-charcoal" @click="close">
                      <img v-if="item.primary_image" :src="item.primary_image" alt="" loading="lazy" width="48" height="60" class="w-12 h-[60px] object-cover shrink-0">
                      <span class="min-w-0">
                        <span class="block break-words font-semibold">{{ item.name }}</span>
                        <span class="block text-sm">{{ formatPrice(item.sale_price ?? item.base_price) }}</span>
                      </span>
                    </NuxtLink>
                  </li>
                </ul>
                <NuxtLink :to="{ path: '/shop', query: { search: term } }" class="inline-block underline font-semibold" @click="close">{{ $tr("View all search results") }}</NuxtLink>
              </template>
            </div>
          </div>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.search-button { @apply border border-brand-charcoal bg-white px-3 py-2 text-sm text-brand-charcoal; }
.search-primary { @apply border border-brand-charcoal bg-brand-charcoal px-3 py-2 text-sm text-white disabled:opacity-50; }
:where(button, input, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
