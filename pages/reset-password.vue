<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { apiError } from '~/utils/api-error'

useSeoMeta({ title: 'Reset your password | K. Fabrics', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const form = reactive({ email: '', code: '', password: '', password_confirmation: '' })
const busy = ref(false)
const submitted = ref(false)
const error = ref('')

onMounted(() => {
  if (route.hash || Object.keys(route.query).length) {
    void router.replace({ path: '/reset-password', query: {}, hash: '' })
  }
})

async function resetPassword() {
  if (busy.value) return
  const code = form.code.trim().toLowerCase()
  if (!/^[a-f0-9]{64}$/.test(code)) {
    error.value = 'Copy the full code from your K. Fabrics email.'
    return
  }
  if (form.password !== form.password_confirmation) {
    error.value = 'The passwords do not match.'
    return
  }
  if (new TextEncoder().encode(form.password).byteLength > 72) {
    error.value = 'Choose a shorter password (a maximum of 72 bytes).'
    return
  }
  busy.value = true
  error.value = ''
  try {
    await auth.apiFetch('/password/reset', {
      method: 'POST',
      body: { ...form, code, email: form.email.trim() },
    })
    Object.assign(form, { email: '', code: '', password: '', password_confirmation: '' })
    // Refresh cleared session state, especially if this browser was signed in to the reset account.
    await auth.fetchUser().catch(() => {})
    submitted.value = true
  } catch (err) {
    error.value = apiError(err, 'Could not reset the password. Try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-lg px-5 py-12">
    <section class="space-y-5 border border-brand-border bg-brand-cream/40 p-5 sm:p-8">
      <h1 class="font-serif text-3xl font-bold">{{ $tr("Reset your password") }}</h1>
      <p v-if="submitted" role="status">{{ $tr("Your password has been reset.") }} <NuxtLink class="underline font-semibold" to="/login">{{ $tr("Sign in with your new password") }}</NuxtLink>.</p>
      <form v-else class="space-y-4" @submit.prevent="resetPassword">
        <p>{{ $tr("Enter your account email and the private code from your K. Fabrics email.") }}</p>
        <div>
          <label for="reset-email" class="block font-semibold">{{ $tr("Account email") }}</label>
          <input dir="ltr" id="reset-email" v-model="form.email" class="w-full border border-brand-border bg-white p-3" type="email" autocomplete="username" maxlength="255" required>
        </div>
        <div>
          <label for="reset-code" class="block font-semibold">{{ $tr("Reset code") }}</label>
          <input dir="ltr" id="reset-code" v-model="form.code" class="w-full border border-brand-border bg-white p-3 font-mono" type="text" autocomplete="one-time-code" autocapitalize="off" spellcheck="false" maxlength="128" required>
        </div>
        <div>
          <label for="new-password" class="block font-semibold">{{ $tr("New password") }}</label>
          <p id="new-password-hint" class="text-sm">{{ $tr("Use at least 12 characters.") }}</p>
          <input dir="ltr" id="new-password" v-model="form.password" class="w-full border border-brand-border bg-white p-3" type="password" autocomplete="new-password" minlength="12" maxlength="72" aria-describedby="new-password-hint" required>
        </div>
        <div>
          <label for="new-password-confirmation" class="block font-semibold">{{ $tr("Confirm new password") }}</label>
          <input dir="ltr" id="new-password-confirmation" v-model="form.password_confirmation" class="w-full border border-brand-border bg-white p-3" type="password" autocomplete="new-password" minlength="12" maxlength="72" required>
        </div>
        <p v-if="error" role="alert" class="text-red-800">{{ $tr(error) }}</p>
        <button class="bg-brand-charcoal px-4 py-3 font-semibold text-white disabled:opacity-50" :disabled="busy" type="submit">{{ busy ? $tr("Resetting…") : $tr("Reset password") }}</button>
      </form>
      <p v-if="!submitted"><NuxtLink class="underline font-semibold" to="/forgot-password">{{ $tr("Request a new code") }}</NuxtLink> · <NuxtLink class="underline" to="/login">{{ $tr("Back to sign in") }}</NuxtLink></p>
      <RecoverySupport />
    </section>
  </div>
</template>
