<script setup lang="ts">
const { $storefrontLanguage: { isUrdu } } = useNuxtApp()
useHead(() => ({ htmlAttrs: { lang: isUrdu.value ? 'ur-PK' : 'en-PK', dir: isUrdu.value ? 'rtl' : 'ltr' } }))
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
