<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { apiError } from '~/utils/api-error'

useSeoMeta({ title: 'Forgot your password? | K. Fabrics', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const auth = useAuthStore()
const available = useRecoveryAvailability()
const email = ref('')
const busy = ref(false)
const submitted = ref(false)
const error = ref('')

async function requestCode() {
  if (busy.value || !available.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.apiFetch('/password/forgot', { method: 'POST', body: { email: email.value.trim() } })
    email.value = ''
    submitted.value = true
  } catch (err) {
    error.value = apiError(err, 'Could not request the reset code. Please try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg px-5 py-12">
    <section class="space-y-5 border border-brand-border bg-brand-cream/40 p-5 sm:p-8">
      <h1 class="font-serif text-3xl font-bold">{{ $tr("Forgot your password?") }}</h1>
      <p v-if="available === null" role="status">{{ $tr("Checking email recovery…") }}</p>
      <p v-if="submitted" role="status">{{ $tr("If the email matches an account, we’ll send a private reset code. Check your inbox and spam folder.") }}</p>
      <form v-else-if="available" class="space-y-3" @submit.prevent="requestCode">
        <p>{{ $tr("Enter the email address you use to sign in.") }}</p>
        <label for="password-recovery-email" class="block font-semibold">{{ $tr("Account email") }}</label>
        <input dir="ltr" id="password-recovery-email" v-model="email" class="w-full border border-brand-border bg-white p-3" type="email" autocomplete="email" maxlength="255" required>
        <p v-if="error" role="alert" class="text-red-800">{{ $tr(error) }}</p>
        <button class="bg-brand-charcoal px-4 py-3 font-semibold text-white disabled:opacity-50" :disabled="busy" type="submit">{{ busy ? $tr("Requesting…") : $tr("Request a reset code") }}</button>
      </form>
      <p><NuxtLink class="underline font-semibold" to="/reset-password">{{ $tr("Enter a reset code") }}</NuxtLink> · <NuxtLink class="underline" to="/login">{{ $tr("Back to sign in") }}</NuxtLink></p>
      <RecoverySupport :unavailable="available === false" />
    </section>
  </div>
</template>
