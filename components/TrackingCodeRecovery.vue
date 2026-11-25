<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { apiError } from '~/utils/api-error'

const props = defineProps<{ orderNumber: string }>()
const auth = useAuthStore()
const available = useRecoveryAvailability()
const form = reactive({ order_number: props.orderNumber || '', email: '', phone: '' })
const busy = ref(false)
const submitted = ref(false)
const error = ref('')

async function resend() {
  if (busy.value || !available.value) return
  busy.value = true
  error.value = ''
  try {
    await auth.apiFetch('/orders/recover-tracking', {
      method: 'POST',
      body: { order_number: form.order_number.trim().toUpperCase(), email: form.email.trim(), phone: form.phone.trim() },
    })
    Object.assign(form, { order_number: '', email: '', phone: '' })
    submitted.value = true
  } catch (err) {
    error.value = apiError(err, 'Could not submit the recovery request. Please try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-4">
    <p v-if="available === null" role="status">Checking email recovery…</p>
    <p v-if="submitted" role="status">If the details match and recovery is available, the private code will be sent to the checkout email. Check your inbox and spam folder.</p>
    <form v-else-if="available" class="space-y-3" @submit.prevent="resend">
      <p>Enter your order number and the email and mobile number used at checkout.</p>
      <div>
        <label for="recovery-order-number" class="block font-semibold">Order number</label>
        <input id="recovery-order-number" v-model="form.order_number" class="w-full border border-brand-border bg-white p-3" maxlength="50" autocomplete="off" spellcheck="false" required>
      </div>
      <div>
        <label for="recovery-order-email" class="block font-semibold">Checkout email</label>
        <input id="recovery-order-email" v-model="form.email" class="w-full border border-brand-border bg-white p-3" type="email" maxlength="255" autocomplete="off" required>
      </div>
      <div>
        <label for="recovery-order-phone" class="block font-semibold">Checkout mobile number</label>
        <input id="recovery-order-phone" v-model="form.phone" class="w-full border border-brand-border bg-white p-3" type="tel" maxlength="25" autocomplete="off" required>
      </div>
      <p v-if="error" role="alert" class="text-red-800">{{ error }}</p>
      <button class="bg-brand-charcoal px-4 py-3 font-semibold text-white disabled:opacity-50" :disabled="busy" type="submit">{{ busy ? 'Requesting…' : 'Request tracking code' }}</button>
    </form>
    <p v-if="available !== null">If no checkout email was provided, contact support. Signed-in customers can check order status in <NuxtLink class="underline" to="/account">their account</NuxtLink>.</p>
    <RecoverySupport :unavailable="available === false" />
  </div>
</template>
