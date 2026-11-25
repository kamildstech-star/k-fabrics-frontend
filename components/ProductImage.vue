<script setup lang="ts">
defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  src: string
  alt: string
  width: number
  height: number
  sizes?: string
  loading?: 'lazy' | 'eager'
}>(), { loading: 'lazy' })

const failedOptimization = ref(false)
watch(() => props.src, () => { failedOptimization.value = false })

const safeSource = computed(() => {
  if (props.src.startsWith('/') && !props.src.startsWith('//') && !props.src.includes('\\')) {
    return props.src
  }
  try {
    const url = new URL(props.src)
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.href
    }
  } catch {
    // Never hand an unrecognized URL scheme to the browser.
  }
  return '/images/product-placeholder.svg'
})

const isOptimizable = computed(() => {
  if (safeSource.value.startsWith('/')) return true
  const url = new URL(safeSource.value)
  return url.origin === 'https://images.unsplash.com'
})
</script>

<template>
  <NuxtImg
    v-if="isOptimizable && !failedOptimization"
    v-bind="$attrs"
    :src="safeSource"
    :alt="alt"
    :width="width"
    :height="height"
    :sizes="sizes"
    :loading="loading"
    decoding="async"
    format="webp"
    fit="cover"
    @error="failedOptimization = true"
  />
  <img
    v-else
    v-bind="$attrs"
    :src="safeSource"
    :alt="alt"
    :width="width"
    :height="height"
    :loading="loading"
    decoding="async"
  >
</template>
