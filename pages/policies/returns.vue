<script setup lang="ts">
import { apiError } from '~/utils/api-error'
import { useAuthStore } from '~/stores/auth'

type ReturnType = 'exchange' | 'return' | 'problem'
type ReturnStatus = 'submitted' | 'under_review' | 'approved' | 'declined' | 'closed'
interface ReturnCase {
  reference: string
  type: ReturnType
  status: ReturnStatus
  submitted_at: string
  updated_at: string
}

const auth = useAuthStore()
const { emailHref, whatsapp } = useStoreContact()
const chatUrl = computed(() => whatsapp('Hello K. Fabrics, I have a question about a return or exchange.'))

useSeoMeta({
  title: 'Returns & Exchanges | K. Fabrics',
  description: 'Learn how to privately request or check the status of a return, exchange, or problem with a delivered K. Fabrics order.',
})
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const typeLabels: Record<ReturnType, string> = { exchange: 'Exchange', return: 'Return', problem: 'Problem report' }
const statuses: Record<ReturnStatus, string> = {
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved for handling',
  declined: 'Declined',
  closed: 'Closed',
}
const statusDescriptions: Record<ReturnStatus, string> = {
  submitted: 'The store has your request. Saving it does not arrange a return shipment, replacement or refund.',
  under_review: 'Staff are checking your request. Keep the item and wait for instructions before sending anything.',
  approved: 'Staff approved handling your request. This does not mean a pickup, shipment or refund has been completed. Confirm the instructions with the store before sending anything.',
  declined: 'The store declined this request. Use verified support details if you need more information.',
  closed: 'Staff closed the case. Confirm any outstanding questions with the store.',
}

const mode = ref<'request' | 'status'>('request')
const orderNumber = ref('')
const trackingCode = ref('')
const type = ref<ReturnType | ''>('')
const reason = ref('')
const description = ref('')
const busy = ref(false)
const result = ref<ReturnCase | null>(null)
const noRequest = ref(false)
const resultHeading = ref<HTMLElement | null>(null)
const errorMessage = ref('')

onMounted(() => { void auth.initAuth() })

function selectMode(next: 'request' | 'status') {
  mode.value = next
  result.value = null
  noRequest.value = false
  errorMessage.value = ''
}

async function submit() {
  if (busy.value) return
  result.value = null
  noRequest.value = false
  errorMessage.value = ''
  const proof = {
    order_number: orderNumber.value.trim().toUpperCase(),
    ...(trackingCode.value.trim() ? { tracking_token: trackingCode.value.trim() } : {}),
  }
  if (!proof.order_number || (!auth.isAuthenticated && !proof.tracking_token)) {
    errorMessage.value = 'Enter your order number and, for a guest order, its private tracking code.'
    return
  }
  const isRequest = mode.value === 'request'
  if (isRequest && (!type.value || !reason.value || !description.value.trim())) {
    errorMessage.value = 'Choose the request type and explain what happened.'
    return
  }
  busy.value = true
  try {
    const payload = isRequest ? { ...proof, type: type.value, reason: reason.value, description: description.value.trim() } : proof
    const response = await auth.apiFetch<{ data: ReturnCase | null }>(`/orders/returns/${mode.value}`, {
      method: 'POST', body: payload, retry: false,
    })
    response.data ? result.value = response.data : noRequest.value = true
    trackingCode.value = ''
    if (isRequest) description.value = ''
    await nextTick()
    resultHeading.value?.focus()
  } catch (error) {
    errorMessage.value = apiError(error, 'We could not check this order. Check your details and try again.')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-brand-white">
    <article class="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
      <nav :aria-label="$tr('Breadcrumb')" class="flex flex-wrap items-center gap-2 text-sm">
        <NuxtLink to="/">{{ $tr("Home") }}</NuxtLink>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{{ $tr("Returns & exchanges") }}</span>
      </nav>

      <header class="border-b border-brand-border pb-6 space-y-3">
        <h1 class="font-serif text-3xl sm:text-4xl font-semibold">{{ $tr("Returns & exchanges") }}</h1>
        <p>{{ $tr("If an item is damaged, incorrect, or does not fit, submit a request below. The store will review what happened and what options are available.") }}</p>
        <a href="#request" class="inline-block underline font-semibold">{{ $tr("Submit or check a request") }}</a>
      </header>

      <section class="space-y-2" aria-labelledby="ready-to-wear-policy">
        <h2 id="ready-to-wear-policy" class="font-serif text-xl font-semibold">{{ $tr("Ready-to-wear") }}</h2>
        <p>{{ $tr("If you need a different size or want to request a return, keep the garment unworn and unwashed and retain its labels and packaging while the store reviews your request. An exchange depends on the item’s condition and replacement availability.") }}</p>
      </section>

      <section class="space-y-2" aria-labelledby="custom-order-policy">
        <h2 id="custom-order-policy" class="font-serif text-xl font-semibold">{{ $tr("Custom fitting and stitching") }}</h2>
        <p>{{ $tr("Custom garments are made to your order. If a garment differs from the agreed measurements, arrives damaged, or is not what you ordered, describe the issue so staff can check the original tailoring instructions and review the options.") }}</p>
      </section>

      <section class="space-y-2" aria-labelledby="prepare-return-policy">
        <h2 id="prepare-return-policy" class="font-serif text-xl font-semibold">{{ $tr("Before sending anything back") }}</h2>
        <p>{{ $tr("Keep your order details, the item and packaging. If an item is damaged or incorrect, take a photo for your records. Do not share tracking codes, bank details or card information in the description.") }}</p>
        <p>{{ $tr("Do not ship the item until you have verified instructions from the store. Submitting a request does not book a pickup, reserve a replacement or issue a refund.") }}</p>
      </section>

      <section id="request" class="scroll-mt-28 p-4 sm:p-6 border border-brand-border bg-brand-cream/40 space-y-4" aria-labelledby="request-heading">
        <h2 id="request-heading" class="font-serif text-2xl font-semibold">{{ $tr("Request help with an order") }}</h2>
        <p>{{ $tr("Submit one request per delivered order. To check a request, use the same order number and the account that placed it or its private tracking code.") }}</p>
        <div role="group" class="flex flex-wrap gap-2" :aria-label="$tr('Request options')">
          <button type="button" class="return-outline" :aria-pressed="mode === 'request'" :disabled="busy" @click="selectMode('request')">{{ $tr("Submit a request") }}</button>
          <button type="button" class="return-outline" :aria-pressed="mode === 'status'" :disabled="busy" @click="selectMode('status')">{{ $tr("Check request status") }}</button>
        </div>

        <form @submit.prevent="submit">
          <fieldset :disabled="busy" class="space-y-4">
            <div class="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="min-w-0">
                <label for="return-order-number" class="return-label">{{ $tr("Order number") }}</label>
                <input dir="ltr" id="return-order-number" v-model="orderNumber" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="50" required class="return-field">
              </div>
              <div class="min-w-0">
                <label for="return-tracking-code" class="return-label">{{ $tr("Private tracking code") }}</label>
                <input dir="ltr" id="return-tracking-code" v-model="trackingCode" type="password" autocomplete="off" spellcheck="false" maxlength="255" aria-describedby="return-tracking-help" :required="!auth.isAuthenticated" class="return-field">
              </div>
            </div>
            <p id="return-tracking-help" class="text-sm">{{ $tr("Required for guest orders. For an order placed from this account, you can leave it blank.") }}</p>

            <template v-if="mode === 'request'">
              <div class="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="min-w-0">
                  <label for="return-type" class="return-label">{{ $tr("Request type") }}</label>
                  <select id="return-type" v-model="type" class="return-field" required>
                    <option value="" disabled>{{ $tr("Choose request type") }}</option>
                    <option value="exchange">{{ $tr("Exchange") }}</option>
                    <option value="return">{{ $tr("Return") }}</option>
                    <option value="problem">{{ $tr("Report a problem") }}</option>
                  </select>
                </div>
                <div class="min-w-0">
                  <label for="return-reason" class="return-label">{{ $tr("Reason") }}</label>
                  <select id="return-reason" v-model="reason" class="return-field" required>
                    <option value="" disabled>{{ $tr("Choose a reason") }}</option>
                    <option value="fit">{{ $tr("Size or fit") }}</option>
                    <option value="incorrect_item">{{ $tr("Wrong or missing item") }}</option>
                    <option value="damaged">{{ $tr("Damage or defect") }}</option>
                    <option value="other">{{ $tr("Other") }}</option>
                  </select>
                </div>
              </div>
              <div>
                <label for="return-description" class="return-label">{{ $tr("Which item is affected, and what happened?") }}</label>
                <textarea id="return-description" v-model="description" class="return-field" required rows="4" maxlength="1000" />
              </div>
            </template>

            <p v-if="errorMessage" role="alert" class="text-red-800">{{ $tr(errorMessage) }}</p>
            <button type="submit" :disabled="busy" class="return-primary">
              {{ busy ? $tr("Checking order…") : mode === 'request' ? $tr("Save request") : $tr("Look up request") }}
            </button>
          </fieldset>
        </form>

        <div v-if="result" class="border border-brand-border bg-white p-4 space-y-2">
          <h3 ref="resultHeading" tabindex="-1" class="font-semibold">{{ $tr("Request") }} {{ result.reference }}</h3>
          <p>{{ $tr(typeLabels[result.type]) }} · <strong>{{ $tr(statuses[result.status]) }}</strong></p>
          <p>{{ $tr(statusDescriptions[result.status]) }}</p>
        </div>
        <h3 v-if="noRequest" ref="resultHeading" tabindex="-1" class="font-semibold">{{ $tr("There is no return or exchange request for this order yet.") }}</h3>
      </section>

      <section class="space-y-2" aria-labelledby="returns-support">
        <h2 id="returns-support" class="font-serif text-xl font-semibold">{{ $tr("If you cannot use the form") }}</h2>
        <p>{{ $tr("Use the verified support details provided with your order. Do not send your private tracking code to a support contact.") }}</p>
        <a v-if="emailHref" :href="emailHref" class="inline-block underline">{{ $tr("Email support") }}</a>
        <a v-else-if="chatUrl" :href="chatUrl" target="_blank" rel="noopener noreferrer" class="inline-block underline">{{ $tr("WhatsApp support") }}</a>
      </section>
    </article>
  </div>
</template>

<style scoped>
.return-outline { @apply border border-brand-charcoal bg-white px-3 py-2 text-sm aria-pressed:bg-brand-cream disabled:opacity-50; }
.return-primary { @apply border border-brand-charcoal bg-brand-charcoal px-4 py-2 font-semibold text-white disabled:opacity-50; }
.return-label { @apply block text-sm font-semibold mb-1; }
.return-field { @apply block w-full min-w-0 border border-brand-border bg-white px-3 py-2; }
:where(a, button, select, input, textarea):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
