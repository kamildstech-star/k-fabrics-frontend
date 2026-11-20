<script setup lang="ts">
import { useRecentlyViewed, type RecentlyViewedItem } from '~/composables/useRecentlyViewed'
import { useCartStore } from '~/stores/cart'

const props = withDefaults(
  defineProps<{
    excludeId?: number
    limit?: number
    layout?: 'grid' | 'compact'
  }>(),
  {
    excludeId: undefined,
    limit: 4,
    layout: 'grid',
  }
)

const { getRecent, loadFromStorage } = useRecentlyViewed()
const cart = useCartStore()
const displayItems = ref<RecentlyViewedItem[]>([])

const refresh = () => {
  displayItems.value = getRecent(props.excludeId, props.limit)
}

onMounted(() => {
  loadFromStorage()
  refresh()
})

watch(
  () => props.excludeId,
  () => {
    refresh()
  }
)

const formatPrice = (amount: number) => {
  return 'Rs. ' + Number(amount).toLocaleString('en-PK')
}
</script>

<template>
  <div v-if="displayItems.length > 0" class="w-full">
    <!-- Grid Layout (For PDP) -->
    <section v-if="layout === 'grid'" class="py-12 border-t border-brand-border/60">
      <div class="flex items-center justify-between mb-8">
        <div>
          <span class="text-[10px] uppercase tracking-widest text-brand-gold font-semibold block mb-1">
            Your Browsing History
          </span>
          <h3 class="font-serif text-2xl text-brand-charcoal">
            Recently Viewed
          </h3>
        </div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <ProductCard
          v-for="item in displayItems"
          :key="item.id"
          :product="item"
        />
      </div>
    </section>

    <!-- Compact Layout (For CartDrawer) -->
    <div v-else-if="layout === 'compact'" class="py-4 border-t border-brand-border">
      <div class="flex items-center justify-between mb-3 px-1">
        <span class="text-[11px] uppercase tracking-wider font-semibold text-brand-charcoal">
          Recently Viewed
        </span>
      </div>

      <div class="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin">
        <NuxtLink
          v-for="item in displayItems"
          :key="item.id"
          :to="`/products/${item.slug}`"
          class="shrink-0 w-28 group"
          @click="cart.closeCart()"
        >
          <div class="aspect-[3/4] w-full overflow-hidden bg-brand-cream border border-brand-border/50 relative mb-1.5">
            <img
              :src="item.primary_image || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=300&q=80'"
              :alt="item.name"
              class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
            >
          </div>
          <p class="text-[11px] font-serif text-brand-charcoal truncate group-hover:text-brand-gold transition-colors">
            {{ item.name }}
          </p>
          <p class="text-[10px] font-medium text-brand-muted">
            {{ formatPrice(item.sale_price || item.base_price) }}
          </p>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
