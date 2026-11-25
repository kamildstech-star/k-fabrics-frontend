<script setup lang="ts">
import { priceRange } from '~/utils/discovery'
import type { FilterGroup, FilterKey } from '~/utils/discovery'

const props = defineProps<{
  groups: FilterGroup[]
  selected: Record<FilterKey, string>
  minPrice: string
  maxPrice: string
  facetsPending: boolean
  facetsFailed: boolean
}>()

const emit = defineEmits<{
  change: [key: FilterKey, value: string]
  price: [min: string, max: string]
  retry: []
}>()

const filterId = useId()
const minInput = ref(props.minPrice)
const maxInput = ref(props.maxPrice)
const priceError = ref('')

watch(() => [props.minPrice, props.maxPrice], () => {
  minInput.value = props.minPrice
  maxInput.value = props.maxPrice
  priceError.value = ''
})

const submit = () => {
  priceError.value = ''
  try {
    const { min, max } = priceRange(String(minInput.value).trim(), String(maxInput.value).trim())
    emit('price', min, max)
  } catch (error) {
    priceError.value = error instanceof Error ? error.message : 'Check the price range.'
  }
}

function groupOptions(group: FilterGroup) {
  const value = props.selected[group.key]
  return value && !group.options.some(option => option.id === value)
    ? [...group.options, { id: value, label: value }]
    : group.options
}
</script>

<template>
  <div class="min-w-0 space-y-5">
    <p v-if="facetsPending" role="status" class="text-sm">{{ $tr("Loading available filters…") }}</p>
    <div v-else-if="facetsFailed" role="alert" class="space-y-2 text-sm text-red-800">
      <p>{{ $tr("Some filters could not be loaded.") }}</p>
      <button type="button" class="catalog-outline" @click="emit('retry')">{{ $tr("Retry filters") }}</button>
    </div>

    <div v-for="group in groups" :key="group.key" v-show="group.options.length || selected[group.key]">
      <label :for="`${filterId}-${group.key}`" class="block text-sm font-semibold mb-1">{{ $tr(group.name) }}</label>
      <select
        :id="`${filterId}-${group.key}`"
        :value="selected[group.key]"
        class="catalog-field"
        @change="emit('change', group.key, ($event.target as HTMLSelectElement).value)"
      >
        <option value="">{{ $tr("Any") }} {{ group.name.toLowerCase() }}</option>
        <option v-for="option in groupOptions(group)" :key="option.id" :value="option.id">{{ $tr(option.label) }}</option>
      </select>
    </div>

    <form class="border-t border-brand-border pt-4 space-y-3" @submit.prevent="submit">
      <fieldset>
        <legend class="font-semibold text-sm mb-2">{{ $tr("Price range (PKR)") }}</legend>
        <div class="grid grid-cols-2 gap-2">
          <div class="min-w-0">
            <label :for="`${filterId}-min`" class="block text-xs mb-1">{{ $tr("Minimum") }}</label>
            <input :id="`${filterId}-min`" v-model="minInput" class="catalog-field" type="text" inputmode="decimal" maxlength="11" :aria-invalid="Boolean(priceError)" :aria-describedby="priceError ? `${filterId}-price-error` : undefined">
          </div>
          <div class="min-w-0">
            <label :for="`${filterId}-max`" class="block text-xs mb-1">{{ $tr("Maximum") }}</label>
            <input :id="`${filterId}-max`" v-model="maxInput" class="catalog-field" type="text" inputmode="decimal" maxlength="11" :aria-invalid="Boolean(priceError)" :aria-describedby="priceError ? `${filterId}-price-error` : undefined">
          </div>
        </div>
      </fieldset>
      <p v-if="priceError" :id="`${filterId}-price-error`" role="alert" class="text-red-800 text-sm">{{ $tr(priceError) }}</p>
      <button type="submit" class="catalog-outline">{{ $tr("Apply price range") }}</button>
    </form>
  </div>
</template>

<style scoped>
.catalog-field { @apply w-full min-w-0 rounded-sm border border-brand-border bg-white p-2 text-sm; }
.catalog-outline { @apply rounded-sm border border-brand-charcoal bg-white px-3 py-2 text-sm text-brand-charcoal; }
:where(button, input, select):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
