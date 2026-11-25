<script setup lang="ts">
defineProps<{ unavailable?: boolean }>()
const { emailHref, whatsapp } = useStoreContact()
const whatsappLink = computed(() => whatsapp())
</script>

<template>
  <div class="space-y-2">
    <p v-if="unavailable" role="status">Email recovery is unavailable right now.</p>
    <p v-if="emailHref || whatsappLink">
      Need help? Contact K. Fabrics support.
      <a v-if="emailHref" class="underline font-semibold" :href="emailHref">Email support</a>
      <span v-if="emailHref && whatsappLink"> or </span>
      <a v-if="whatsappLink" class="underline font-semibold" :href="whatsappLink" target="_blank" rel="noopener noreferrer">Message support</a>.
      Never share a password or private code with anyone.
    </p>
    <p v-else>
      <template v-if="unavailable">Use an official K. Fabrics contact from your receipt, if available.</template>
      <template v-else>Never share a password or private code with anyone.</template>
    </p>
  </div>
</template>
