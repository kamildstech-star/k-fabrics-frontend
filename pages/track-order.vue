<script setup lang="ts">
import { apiError, apiStatus } from '~/utils/api-error'
import { formatPrice } from '~/utils/checkout'
import type { OrderTracking } from '~/utils/checkout'
import type { OrderReceipt } from '~/utils/order-receipt'
import { useAuthStore } from '~/stores/auth'

const handoff = useTrackingHandoff()
const auth = useAuthStore()
const route = useRoute()
const router = useRouter()
const orderNumber = ref('')
const trackingToken = ref('')
const receiptCode = ref('')
const searching = ref(false)
const recoveryOpen = ref(false)
const searchError = ref('')
const result = ref<OrderTracking | null>(null)
const resultTitle = ref<HTMLElement | null>(null)

useSeoMeta({ title: 'Track an Order | K. Fabrics', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const stages = [
  { key: 'pending', label: 'Order received' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'stitching', label: 'Tailoring' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
]

const { $tr: tr } = useNuxtApp()
const statusLabel = (status: string) => tr(status === 'awaiting_fabric' ? 'awaiting fabric or deposit' : status.replaceAll('_', ' '))
const orderStage = computed(() => stages.findIndex(stage => stage.key === result.value?.order_status))
const formattedDate = computed(() => {
  if (!result.value?.created_at) return ''
  return new Intl.DateTimeFormat('en-PK', { dateStyle: 'medium', timeZone: 'Asia/Karachi' }).format(new Date(result.value.created_at))
})

const trackOrder = async () => {
  const supplied = { order_number: orderNumber.value.trim().toUpperCase(), tracking_token: trackingToken.value.trim() }
  if (searching.value || !supplied.order_number || !supplied.tracking_token) return
  searching.value = true
  searchError.value = ''
  result.value = null
  receiptCode.value = ''
  try {
    const response = await auth.apiFetch<{ data: OrderTracking }>('/orders/track', {
      method: 'POST',
      body: supplied,
      headers: { Accept: 'application/json' },
      retry: false,
    })
    result.value = response.data
    // Hold the secret only in this mounted page, not in the URL or browser storage.
    receiptCode.value = supplied.tracking_token
    trackingToken.value = ''
    await nextTick()
    resultTitle.value?.focus()
  } catch (error) {
    searchError.value = apiStatus(error) === 404
      ? 'We could not find an order with those details. Check the order number and tracking code.'
      : apiError(error, 'Could not look up this order. Please try again.')
  } finally {
    searching.value = false
  }
}

const loadReceipt = async (): Promise<OrderReceipt> => {
  if (!result.value || !receiptCode.value) throw new Error('Track the order to access its receipt.')
  const { data } = await auth.apiFetch<{ data: OrderReceipt }>('/orders/receipt', {
    method: 'POST',
    body: { order_number: result.value.order_number, tracking_token: receiptCode.value },
    headers: { Accept: 'application/json' },
    retry: false,
  })
  return data
}

onMounted(() => {
  // Strip legacy tracking links instead of using any phone number or token from the URL.
  if (route.hash || Object.keys(route.query).length) void router.replace({ path: '/track-order', query: {}, hash: '' })
  if (!handoff.value) return
  orderNumber.value = handoff.value.orderNumber
  trackingToken.value = handoff.value.token
  handoff.value = null
  void trackOrder()
})
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      <nav :aria-label="$tr('Breadcrumb')" class="flex items-center gap-2 text-xs uppercase text-brand-muted">
        <NuxtLink to="/">{{ $tr("Home") }}</NuxtLink><span aria-hidden="true">/</span>
        <span class="font-semibold text-brand-charcoal" aria-current="page">{{ $tr("Track order") }}</span>
      </nav>

      <header class="space-y-2">
        <h1 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal">{{ $tr("Track your order") }}</h1>
        <p>{{ $tr("Enter the order number and the private tracking code from your checkout confirmation or saved order receipt.") }}</p>
      </header>

      <form class="border border-brand-border bg-brand-cream/40 p-5 sm:p-8 space-y-4" @submit.prevent="trackOrder">
        <div>
          <label for="tracking-order-number" class="block font-semibold mb-1">{{ $tr("Order number") }}</label>
          <input dir="ltr" id="tracking-order-number" v-model="orderNumber" class="w-full p-2 bg-white border border-brand-border" type="text" required maxlength="50" spellcheck="false" autocomplete="off" autocapitalize="characters">
        </div>
        <div>
          <label for="private-tracking-code" class="block font-semibold mb-1">{{ $tr("Private tracking code") }}</label>
          <input dir="ltr" id="private-tracking-code" v-model="trackingToken" class="w-full p-2 bg-white border border-brand-border font-mono" type="text" required maxlength="255" spellcheck="false" autocomplete="off" autocapitalize="off">
        </div>
        <p v-if="searchError" role="alert" class="text-red-800">{{ $tr(searchError) }}</p>
        <button type="submit" :disabled="searching" class="px-5 py-3 font-semibold bg-brand-charcoal text-white disabled:opacity-50">
          {{ searching ? $tr("Looking up order…") : $tr("Track order") }}
        </button>
      </form>

      <p v-if="searching" role="status">{{ $tr("Checking order status…") }}</p>
      <section v-if="result" aria-labelledby="tracking-result" class="border border-brand-border p-5 sm:p-8 space-y-5">
        <h2 id="tracking-result" ref="resultTitle" tabindex="-1" class="font-serif text-2xl">{{ $tr("Order") }} <bdi dir="ltr">{{ result.order_number }}</bdi></h2>
        <dl class="grid gap-2 grid-cols-2">
          <dt>{{ $tr("Order status") }}</dt><dd class="capitalize font-semibold">{{ statusLabel(result.order_status) }}</dd>
          <dt>{{ $tr("Payment status") }}</dt><dd class="capitalize">{{ statusLabel(result.payment_status) }}</dd>
          <template v-if="formattedDate"><dt>{{ $tr("Placed") }}</dt><dd>{{ formattedDate }}</dd></template>
          <template v-if="result.courier_name"><dt>{{ $tr("Courier") }}</dt><dd>{{ result.courier_name }}</dd></template>
          <template v-if="result.tracking_number"><dt>{{ $tr("Tracking number") }}</dt><dd class="break-all"><bdi dir="ltr">{{ result.tracking_number }}</bdi></dd></template>
        </dl>
        <div v-if="result.bank_balance" class="space-y-2 border-t border-brand-border pt-4">
          <h3 class="font-semibold">{{ $tr("Bank transfer balance") }}</h3>
          <template v-if="result.bank_balance.advance_remaining > 0 || result.bank_balance.balance_remaining > 0">
            <dl class="grid grid-cols-2 gap-2">
              <template v-if="result.bank_balance.advance_remaining > 0">
                <dt>{{ $tr("Advance still due") }}</dt><dd>{{ formatPrice(result.bank_balance.advance_remaining) }}</dd>
              </template>
              <template v-if="result.bank_balance.balance_remaining > 0">
                <dt>{{ result.bank_balance.advance_remaining > 0 ? $tr("Balance after advance") : $tr("Balance still due") }}</dt>
                <dd>{{ formatPrice(result.bank_balance.balance_remaining) }}</dd>
              </template>
            </dl>
            <p>{{ $tr("Confirm the amount with the store before sending it. Use the same verified bank-transfer method and this order number as the reference.") }}</p>
          </template>
          <p v-else>{{ $tr("No bank-transfer balance due.") }}</p>
        </div>
        <ol v-if="orderStage >= 0" class="space-y-1 border-t border-brand-border pt-4" :aria-label="$tr('Order progress')">
          <li v-for="(stage, index) in stages" :key="stage.key" :aria-current="index === orderStage ? 'step' : undefined" :class="{ 'font-bold': index === orderStage }">
            <span aria-hidden="true">{{ index < orderStage ? '✓' : index === orderStage ? '●' : '○' }}</span>
            {{ $tr(stage.label) }}<span v-if="index === orderStage" class="sr-only"> {{ $tr("(current)") }}</span>
          </li>
        </ol>
        <div v-if="result.stitching_requests.length" class="border-t border-brand-border pt-4">
          <h3 class="font-semibold">{{ $tr("Tailoring progress") }}</h3>
          <ul class="list-disc ps-5">
            <li v-for="(booking, index) in result.stitching_requests" :key="index">
              {{ booking.request_type === 'custom_fitting' ? $tr("Custom fitting") : $tr("Standalone stitching") }}: <strong class="capitalize">{{ statusLabel(booking.status) }}</strong>
            </li>
          </ul>
        </div>
        <div class="border-t border-brand-border pt-4">
          <h3 class="mb-2 font-semibold">{{ $tr("Order receipt") }}</h3>
          <OrderReceiptActions v-if="receiptCode" :tracking-code="receiptCode" :load="loadReceipt" />
        </div>
        <div v-if="result.order_status === 'delivered'" class="border-t border-brand-border pt-4">
          <NuxtLink class="font-semibold underline" to="/policies/returns#request">{{ $tr("Request a return") }}</NuxtLink>
        </div>
      </section>

      <section class="space-y-3 border-t border-brand-border pt-4">
        <button type="button" class="font-semibold underline" aria-controls="tracking-code-recovery" :aria-expanded="recoveryOpen" @click="recoveryOpen = !recoveryOpen">{{ $tr("Lost your private tracking code?") }}</button>
        <div id="tracking-code-recovery" :hidden="!recoveryOpen">
          <TrackingCodeRecovery v-if="recoveryOpen" :order-number="orderNumber" />
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
:where(input, button, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
