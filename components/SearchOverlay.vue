<script setup lang="ts">
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const config = useRuntimeConfig()
const router = useRouter()
const searchInput = ref<HTMLInputElement | null>(null)

const query = ref('')
const isLoading = ref(false)
const results = ref<Array<{
  id: number
  name: string
  slug: string
  fabric_type: string | null
  piece_type: string | null
  base_price: number
  sale_price: number | null
  primary_image: string | null
}>>([])

const popularSearches = [
  'Luxury Lawn',
  'Raw Silk Co-ord',
  'Chiffon Festive',
  'Velvet Shawl',
  'Organza Dupatta',
  'Custom Stitching',
]

let debounceTimer: ReturnType<typeof setTimeout> | null = null

const handleInput = () => {
  if (debounceTimer) clearTimeout(debounceTimer)
  const trimmed = query.value.trim()
  if (trimmed.length < 2) {
    results.value = []
    isLoading.value = false
    return
  }

  isLoading.value = true
  debounceTimer = setTimeout(async () => {
    try {
      const res = await $fetch<{ data: typeof results.value }>(
        `${config.public.apiBase}/search/suggest`,
        { params: { q: trimmed } }
      )
      results.value = res.data || []
    } catch (e) {
      console.error('Search suggestion error:', e)
      results.value = []
    } finally {
      isLoading.value = false
    }
  }, 300)
}

const close = () => {
  emit('update:modelValue', false)
  if (debounceTimer) clearTimeout(debounceTimer)
}

const selectPopular = (term: string) => {
  query.value = term
  handleInput()
}

const submitSearch = () => {
  if (!query.value.trim()) return
  const q = query.value.trim()
  close()
  router.push(`/shop?search=${encodeURIComponent(q)}`)
}

const navigateToProduct = (slug: string) => {
  close()
  router.push(`/products/${slug}`)
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(
  () => props.modelValue,
  (val) => {
    if (val) {
      nextTick(() => {
        searchInput.value?.focus()
      })
    } else {
      query.value = ''
      results.value = []
    }
  }
)

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (debounceTimer) clearTimeout(debounceTimer)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="modelValue"
        class="fixed inset-0 z-50 overflow-y-auto bg-brand-charcoal/60 backdrop-blur-sm flex flex-col justify-start"
        @click.self="close"
      >
        <!-- Search Container Card -->
        <div class="w-full bg-brand-white border-b border-brand-border shadow-2xl transition-all">
          <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <!-- Header Row with Input -->
            <div class="flex items-center justify-between pb-4 border-b border-brand-border gap-4">
              <div class="flex items-center flex-1 space-x-3">
                <svg class="w-6 h-6 text-brand-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref="searchInput"
                  v-model="query"
                  type="text"
                  placeholder="Search our luxury collection by fabric, color, silhouette..."
                  class="w-full text-base sm:text-lg text-brand-charcoal placeholder-brand-muted focus:outline-none font-sans"
                  @input="handleInput"
                  @keydown.enter="submitSearch"
                >
                <div v-if="isLoading" class="shrink-0 animate-spin text-brand-gold">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
                <button
                  v-else-if="query"
                  type="button"
                  class="p-1 text-brand-muted hover:text-brand-charcoal transition-colors shrink-0"
                  aria-label="Clear input"
                  @click="query = ''; results = []"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <!-- Close Button -->
              <button
                type="button"
                class="p-2 -mr-2 text-brand-muted hover:text-brand-charcoal transition-colors flex items-center space-x-1.5 text-xs uppercase tracking-luxury font-medium"
                aria-label="Close search overlay"
                @click="close"
              >
                <span class="hidden sm:inline">Close</span>
                <span class="text-xs border border-brand-border px-1.5 py-0.5 rounded font-mono text-[10px] hidden sm:inline">ESC</span>
                <svg class="w-5 h-5 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Content Area: Popular Searches OR Live Results -->
            <div class="py-6">
              <!-- When No Query Entered: Quick Suggestions -->
              <div v-if="!query.trim()" class="space-y-4">
                <span class="text-[11px] font-semibold uppercase tracking-luxury text-brand-muted block">
                  Trending & Popular Searches
                </span>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="term in popularSearches"
                    :key="term"
                    type="button"
                    class="px-3.5 py-1.5 rounded-full text-xs bg-brand-cream hover:bg-brand-charcoal hover:text-white transition-all text-brand-charcoal border border-brand-border"
                    @click="selectPopular(term)"
                  >
                    {{ term }}
                  </button>
                </div>
              </div>

              <!-- When Query Has Results -->
              <div v-else-if="results.length > 0" class="space-y-4">
                <div class="flex items-center justify-between">
                  <span class="text-[11px] font-semibold uppercase tracking-luxury text-brand-muted">
                    Found {{ results.length }} Match{{ results.length > 1 ? 'es' : '' }}
                  </span>
                  <button
                    type="button"
                    class="text-xs font-semibold text-brand-gold hover:underline flex items-center space-x-1"
                    @click="submitSearch"
                  >
                    <span>View all results in Shop</span>
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 pt-2">
                  <div
                    v-for="item in results"
                    :key="item.id"
                    class="group cursor-pointer flex flex-col bg-brand-cream/40 border border-brand-border/60 hover:border-brand-gold/60 p-2.5 transition-all duration-200"
                    @click="navigateToProduct(item.slug)"
                  >
                    <div class="aspect-[3/4] w-full overflow-hidden bg-brand-cream mb-2 relative">
                      <img
                        :src="item.primary_image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=500&q=80'"
                        :alt="item.name"
                        class="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                      >
                      <span
                        v-if="item.fabric_type"
                        class="absolute bottom-1 left-1 bg-brand-charcoal/85 text-white text-[9px] px-1.5 py-0.5 uppercase tracking-wider font-light"
                      >
                        {{ item.fabric_type }}
                      </span>
                    </div>

                    <div class="flex-1 flex flex-col justify-between">
                      <h4 class="text-xs font-serif font-medium text-brand-charcoal group-hover:text-brand-gold transition-colors line-clamp-2 leading-snug">
                        {{ item.name }}
                      </h4>
                      <div class="mt-2 text-xs font-medium text-brand-charcoal">
                        <template v-if="item.sale_price">
                          <span class="text-red-700 mr-1.5">Rs. {{ Number(item.sale_price).toLocaleString() }}</span>
                          <span class="text-brand-muted text-[10px] line-through">Rs. {{ Number(item.base_price).toLocaleString() }}</span>
                        </template>
                        <template v-else>
                          <span>Rs. {{ Number(item.base_price).toLocaleString() }}</span>
                        </template>
                      </div>
                    </div>
                  </div>
                </div>

                <div class="pt-4 text-center border-t border-brand-border/50">
                  <button
                    type="button"
                    class="inline-flex items-center px-6 py-2.5 bg-brand-charcoal hover:bg-brand-gold text-white text-xs uppercase tracking-luxury font-medium transition-colors"
                    @click="submitSearch"
                  >
                    View All Matching Products for "{{ query }}"
                  </button>
                </div>
              </div>

              <!-- When Query Has No Results -->
              <div v-else-if="!isLoading && query.trim().length >= 2" class="py-10 text-center space-y-3">
                <p class="text-brand-charcoal font-serif text-base">
                  No matching garments found for "<span class="italic">{{ query }}</span>"
                </p>
                <p class="text-xs text-brand-muted max-w-md mx-auto">
                  Try checking for typos, searching for broader terms like "silk", "lawn", or "kurta", or browse our full catalogue.
                </p>
                <button
                  type="button"
                  class="mt-2 inline-block px-5 py-2 bg-brand-cream border border-brand-border text-xs uppercase tracking-luxury font-medium text-brand-charcoal hover:border-brand-charcoal transition-colors"
                  @click="close(); router.push('/shop')"
                >
                  Browse All Collections
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
