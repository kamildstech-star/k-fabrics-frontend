<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  src?: string | null
  alt: string
  width: number
  height: number
  sizes?: string
  loading?: 'lazy' | 'eager'
  fit?: 'cover' | 'inside'
}>(), { loading: 'lazy', fit: 'cover' })

const placeholder = '/images/product-placeholder.svg'
const rawImage = ref<HTMLImageElement | null>(null)
const loadStage = ref<'optimized' | 'original' | 'placeholder'>('optimized')
watch(() => props.src, () => { loadStage.value = 'optimized' })

const safeSource = computed(() => {
  const source = props.src?.trim()
  if (!source) return placeholder
  if (source.startsWith('/') && !source.startsWith('//') && !source.includes('\\')) {
    return source
  }
  try {
    const url = new URL(source)
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.href
    }
  } catch {
    // Never hand an unrecognized URL scheme to the browser.
  }
  return placeholder
})

onMounted(() => {
  if (rawImage.value?.complete && rawImage.value.naturalWidth === 0) loadStage.value = 'placeholder'
})
const isOptimizable = computed(() => {
  if (safeSource.value === placeholder) return false
  if (safeSource.value.startsWith('/')) return true
  const url = new URL(safeSource.value)
  return url.origin === 'https://images.unsplash.com'
})
</script>

<template>
  <NuxtImg
    v-if="isOptimizable && loadStage === 'optimized'"
    v-bind="$attrs"
    :src="safeSource"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :loading="loading"
    decoding="async"
    format="webp"
    :fit="fit"
    @error="loadStage = 'original'"
  />
  <img
    v-else
    ref="rawImage"
    v-bind="$attrs"
    :src="loadStage === 'placeholder' ? placeholder : safeSource"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    decoding="async"
    @error="loadStage = 'placeholder'"
  >
</template>
