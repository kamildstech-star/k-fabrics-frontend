<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { apiError, apiStatus } from '~/utils/api-error'
import { checkoutCart, formatPrice, orderForm, requestKey } from '~/utils/checkout'
import type { CheckoutCustomer, CheckoutQuote, PlacedOrder } from '~/utils/checkout'

const cart = useCartStore()
const auth = useAuthStore()
const trackingHandoff = useTrackingHandoff()
const router = useRouter()
const route = useRoute()

useSeoMeta({ title: 'Checkout | K. Fabrics', robots: 'noindex, nofollow' })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })

const customer = reactive<CheckoutCustomer>({
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  shipping_address: '',
  city: '',
  notes: '',
  payment_method: '',
})

const ready = ref(false)
const quote = ref<CheckoutQuote | null>(null)
const quoteLoading = ref(false)
const quoteError = ref('')
const couponInput = ref('')
const appliedCoupon = ref('')
const couponError = ref('')
let quoteRun = 0
let quoteRequest: AbortController | undefined
let cartTimer: ReturnType<typeof setTimeout> | undefined

const paymentOption = computed(() => quote.value?.payment_options.find(option => option.id === customer.payment_method))
const requiresOtp = computed(() => paymentOption.value?.requires_otp === true)
const pendingOrder = ref<PlacedOrder | null>(null)
const submitError = ref('')
const submitting = ref(false)
const orderTitle = ref<HTMLElement | null>(null)
const retryWithSameDetails = ref(false)
let submission: { key: string; fingerprint: string } | undefined

const itemCount = computed(() => cart.items.reduce((count, item) => count + item.quantity, 0))
const quotedLines = computed(() => {
  if (!quote.value) return new Map<string, number>()
  let productIndex = 0
  let bookingIndex = 0
  return new Map(cart.items.flatMap(item => {
    const amount = item.type === 'product'
      ? quote.value!.items[productIndex++]?.total_price
      : quote.value!.standalone_stitchings[bookingIndex++]?.stitching_fee
    return amount == null ? [] : [[item.id, Number(amount)] as const]
  }))
})

const updateQuote = async (coupon = appliedCoupon.value, isCouponAttempt = false) => {
  clearTimeout(cartTimer)
  const run = ++quoteRun
  quoteRequest?.abort()
  quoteLoading.value = false
  if (!cart.items.length) {
    quote.value = null
    quoteError.value = ''
    return
  }
  const request = new AbortController()
  quoteRequest = request
  quoteLoading.value = true
  quoteError.value = ''
  couponError.value = ''
  try {
    const { body } = checkoutCart(cart.items, coupon)
    const response = await auth.apiFetch<{ data: CheckoutQuote }>('/checkout/quote', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body,
      signal: request.signal,
      retry: false,
    })
    if (run !== quoteRun) return
    const received = response.data
    if (!received || !Number.isFinite(Number(received.total_amount)) || !Array.isArray(received.payment_options)) {
      throw new Error('Checkout quote was unavailable.')
    }
    quote.value = received
    appliedCoupon.value = coupon
    if (isCouponAttempt) couponInput.value = ''
    if (!received.payment_options.some(option => option.id === customer.payment_method)) {
      customer.payment_method = received.payment_options[0]?.id || ''
    }
  } catch (error) {
    if (run !== quoteRun) return
    if (isCouponAttempt && coupon !== appliedCoupon.value) {
      couponError.value = apiError(error, 'We could not apply that promo code. Try again.', 'coupon_code')
    } else {
      quote.value = null
      quoteError.value = apiError(error, error instanceof Error ? error.message : 'Could not calculate your order total. Try again.')
    }
  } finally {
    if (run === quoteRun) quoteLoading.value = false
  }
}

const applyCoupon = () => {
  const code = couponInput.value.trim().toUpperCase()
  if (code) void updateQuote(code, true)
}
const removeCoupon = () => {
  appliedCoupon.value = ''
  quote.value = null
  void updateQuote('')
}

watch(() => cart.items, () => {
  if (!ready.value || pendingOrder.value) return
  quote.value = null
  quoteError.value = ''
  quoteRun++
  quoteRequest?.abort()
  clearTimeout(cartTimer)
  cartTimer = setTimeout(() => void updateQuote(), 200)
}, { deep: true, flush: 'sync' })

const otpSent = ref(false)
const otpSending = ref(false)
const otpVerifying = ref(false)
const otpCode = ref('')
const otpInput = ref<HTMLInputElement | null>(null)
const otpToken = ref('')
const verifiedPhone = ref('')
const otpError = ref('')
const otpMessage = ref('')
const cooldown = ref(0)
let otpTimer: ReturnType<typeof setInterval> | undefined
let otpCycle = 0

const resetOtp = () => {
  otpCycle++
  otpSent.value = false
  otpSending.value = false
  otpVerifying.value = false
  otpCode.value = ''
  otpToken.value = ''
  verifiedPhone.value = ''
  otpError.value = ''
  otpMessage.value = ''
  cooldown.value = 0
  clearInterval(otpTimer)
}

watch(() => customer.customer_phone.trim(), resetOtp)
watch(() => customer.payment_method, resetOtp)

const sendOtp = async () => {
  if (!customer.customer_phone.trim() || otpSending.value || cooldown.value > 0) return
  const cycle = ++otpCycle
  otpError.value = ''
  otpMessage.value = ''
  otpSending.value = true
  try {
    const response = await auth.apiFetch<{ success: boolean; cooldown_seconds?: number }>('/checkout/send-otp', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: { phone: customer.customer_phone.trim(), channel: 'sms' },
      retry: false,
    })
    if (cycle !== otpCycle) return
    if (!response.success) throw new Error('OTP was not sent')
    otpCode.value = ''
    otpSent.value = true
    otpMessage.value = 'Verification code sent by SMS.'
    cooldown.value = response.cooldown_seconds || 60
    clearInterval(otpTimer)
    otpTimer = setInterval(() => {
      cooldown.value = Math.max(0, cooldown.value - 1)
      if (cooldown.value === 0) clearInterval(otpTimer)
    }, 1000)
    await nextTick()
    otpInput.value?.focus()
  } catch (error) {
    if (cycle === otpCycle) otpError.value = apiError(error, 'Could not send a verification code. Try again.', 'phone')
  } finally {
    if (cycle === otpCycle) otpSending.value = false
  }
}

const verifyOtp = async () => {
  if (!/^\d{4}$/.test(otpCode.value) || otpVerifying.value || otpSending.value) return
  const cycle = otpCycle
  const phone = customer.customer_phone.trim()
  otpError.value = ''
  otpMessage.value = ''
  otpVerifying.value = true
  try {
    const response = await auth.apiFetch<{ success: boolean; verification_token?: string }>('/checkout/verify-otp', {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: { phone, code: otpCode.value },
      retry: false,
    })
    if (cycle !== otpCycle) return
    if (!response.success || !response.verification_token) throw new Error('No verification token returned')
    otpToken.value = response.verification_token
    verifiedPhone.value = phone
    otpCode.value = ''
    otpMessage.value = 'Phone number verified.'
  } catch (error) {
    if (cycle === otpCycle) otpError.value = apiError(error, 'Could not verify this code. Try again.', 'code')
  } finally {
    if (cycle === otpCycle) otpVerifying.value = false
  }
}

const phoneVerified = computed(() => Boolean(otpToken.value && verifiedPhone.value === customer.customer_phone.trim()))
const submitDisabled = computed(() => submitting.value || quoteLoading.value || !quote.value || !paymentOption.value || (requiresOtp.value && !phoneVerified.value))

const placeOrder = async () => {
  if (submitDisabled.value || !quote.value) return
  const form = orderFormSafely(quote.value)
  if (!form) return
  submitting.value = true
  submitError.value = ''
  const fingerprint = JSON.stringify({
    customer: { ...customer },
    cart: cart.items,
    coupon: appliedCoupon.value,
    total: Number(quote.value.total_amount).toFixed(2),
  })

  if (retryWithSameDetails.value && submission?.fingerprint !== fingerprint) {
    submitError.value = 'The previous request may have succeeded. Restore the original order details before retrying, or contact the store to check the order before trying again.'
    submitting.value = false
    return
  }
  if (!submission || submission.fingerprint !== fingerprint) submission = { fingerprint, key: requestKey() }
  const headers = { Accept: 'application/json', 'Idempotency-Key': submission.key }
  try {
    const response = await auth.apiFetch<{ data: PlacedOrder }>('/orders', { method: 'POST', body: form, headers, retry: false })
    if (!response.data?.order_number) throw new Error('No order receipt returned')
    pendingOrder.value = response.data
    cart.clearCart()
    submission = undefined
    retryWithSameDetails.value = false
    await nextTick()
    orderTitle.value?.focus()
  } catch (error) {
    const status = apiStatus(error)
    if (!status || status >= 500 || status === 409) {
      retryWithSameDetails.value = true
      submitError.value = 'We could not confirm whether your order was placed. Retry with the same details to get the result without submitting a duplicate.'
    } else {
      retryWithSameDetails.value = false
      submitError.value = apiError(error, 'Could not place the order. Check your details and try again.')
      const data = (error as { data?: { errors?: Record<string, string[]> } })?.data
      if (data?.errors?.verification_token) resetOtp()
      if (status === 422) void updateQuote()
    }
  } finally {
    submitting.value = false
  }
}

function orderFormSafely(currentQuote: CheckoutQuote) {
  try {
    return orderForm({
      customer,
      items: cart.items,
      quote: currentQuote,
      coupon: appliedCoupon.value,
      verificationToken: requiresOtp.value ? otpToken.value : undefined,
    })
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Could not prepare the order. Check the items in your bag.'
    return null
  }
}

const copyMessage = ref('')
const copyTrackingCode = async () => {
  const token = pendingOrder.value?.tracking_token
  if (!token) return
  try {
    await navigator.clipboard.writeText(token)
    copyMessage.value = 'Tracking code copied.'
  } catch {
    copyMessage.value = 'Clipboard unavailable. Select and copy the tracking code above.'
  }
}

const openTracking = () => {
  const order = pendingOrder.value
  if (order?.tracking_token) trackingHandoff.value = { orderNumber: order.order_number, token: order.tracking_token }
  return navigateTo('/track-order')
}

onMounted(async () => {
  cart.initCart()
  ready.value = true
  void updateQuote()
  if (route.query.recover) {
    const { recover, ...rest } = route.query
    void router.replace({ query: rest })
  }
  await auth.initAuth()
  if (!auth.isLoggedIn || !auth.user) return
  customer.customer_name ||= auth.user.name
  customer.customer_phone ||= auth.user.phone || ''
  customer.customer_email ||= auth.user.email
  try {
    const response = await auth.apiFetch<{ data: Array<{ address: string; city: string; phone?: string; is_default: boolean }> }>('/user/addresses')
    const address = response.data.find(item => item.is_default) || response.data[0]
    if (address) {
      customer.shipping_address ||= address.address
      customer.city ||= address.city
      customer.customer_phone ||= address.phone || ''
    }
  } catch {
    // Guest entry fields remain available when a saved address cannot be retrieved.
  }
})

onBeforeUnmount(() => {
  ++quoteRun
  ++otpCycle
  quoteRequest?.abort()
  clearTimeout(cartTimer)
  clearInterval(otpTimer)
})
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <nav aria-label="Breadcrumb" class="flex items-center gap-2 text-xs uppercase text-brand-muted mb-8">
        <NuxtLink to="/">Home</NuxtLink><span aria-hidden="true">/</span>
        <NuxtLink to="/shop">Shop</NuxtLink><span aria-hidden="true">/</span>
        <span aria-current="page" class="font-semibold text-brand-charcoal">Checkout</span>
      </nav>

      <section v-if="pendingOrder" class="max-w-2xl mx-auto border border-brand-border bg-brand-cream/40 p-6 sm:p-12 space-y-6">
        <h1 ref="orderTitle" tabindex="-1" class="font-serif text-3xl font-bold">Order received</h1>
        <p>Your order has been submitted. Check its status before making any additional payment.</p>
        <dl class="grid grid-cols-2 gap-3 border border-brand-border bg-white p-4">
          <dt>Order number</dt><dd class="font-bold">{{ pendingOrder.order_number }}</dd>
          <dt>Total</dt><dd class="font-bold">{{ formatPrice(pendingOrder.total_amount) }}</dd>
        </dl>
        <div v-if="Number(pendingOrder.advance_due) > 0" class="border border-brand-border bg-white p-4 space-y-2">
          <p class="font-semibold">Tailoring advance: {{ formatPrice(pendingOrder.advance_due!) }}</p>
          <p>Your tailoring work starts after the store verifies the deposit.</p>
        </div>
        <div v-if="pendingOrder.payment_instructions" class="border border-brand-border bg-white p-4">
          <h2 class="font-semibold">Payment instructions</h2>
          <p class="whitespace-pre-wrap break-words">{{ pendingOrder.payment_instructions }}</p>
        </div>
        <p v-else-if="Number(pendingOrder.advance_due) > 0">Wait for the store to provide verified deposit instructions. Do not transfer funds using unofficial payment details.</p>
        <p v-else-if="pendingOrder.payment_method === 'cod'">Cash on delivery. The store may contact you to confirm your order before dispatch.</p>
        <div v-if="pendingOrder.tracking_token" class="space-y-2">
          <label for="order-tracking-code" class="block font-semibold">Private tracking code</label>
          <p id="save-tracking-note">Save this code with your order number. Keep it private.</p>
          <input id="order-tracking-code" readonly :value="pendingOrder.tracking_token" aria-describedby="save-tracking-note" class="w-full px-3 py-2 bg-white border border-brand-border font-mono">
          <button type="button" class="outline-action" @click="copyTrackingCode">Copy tracking code</button>
          <p aria-live="polite">{{ copyMessage }}</p>
        </div>
        <button v-if="pendingOrder.tracking_token" type="button" class="block w-fit primary-action" @click="openTracking">Track order status</button>
        <NuxtLink v-else to="/track-order" class="block w-fit primary-action">Track order status</NuxtLink>
      </section>

      <p v-else-if="!ready" role="status">Loading your bag…</p>
      <section v-else-if="!cart.items.length" class="max-w-md mx-auto text-center py-16 space-y-5">
        <h1 class="font-serif text-3xl">Your bag is empty</h1>
        <NuxtLink to="/shop" class="inline-block primary-action">Explore the collection</NuxtLink>
      </section>

      <form v-else class="grid grid-cols-1 lg:grid-cols-12 gap-12" @submit.prevent="placeOrder">
        <div class="lg:col-span-7 space-y-8">
          <h1 class="font-serif text-3xl font-bold">Checkout &amp; delivery</h1>
          <fieldset class="space-y-4" :disabled="submitting || retryWithSameDetails">
            <legend class="font-serif font-bold mb-3">1. Contact and delivery details</legend>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><label for="customer-name">Full name *</label><input id="customer-name" v-model="customer.customer_name" class="checkout-input" autocomplete="name" maxlength="255" required></div>
              <div><label for="customer-phone">Mobile phone *</label><input id="customer-phone" v-model="customer.customer_phone" class="checkout-input" type="tel" autocomplete="tel" maxlength="50" required></div>
              <div><label for="customer-email">Email (optional)</label><input id="customer-email" v-model="customer.customer_email" class="checkout-input" type="email" autocomplete="email" maxlength="255"></div>
              <div><label for="customer-city">City *</label><input id="customer-city" v-model="customer.city" class="checkout-input" autocomplete="address-level2" maxlength="100" required></div>
            </div>
            <div><label for="customer-address">Street address *</label><textarea id="customer-address" v-model="customer.shipping_address" class="checkout-input" autocomplete="street-address" rows="2" maxlength="500" required /></div>
            <div><label for="customer-notes">Delivery notes (optional)</label><textarea id="customer-notes" v-model="customer.notes" class="checkout-input" rows="2" maxlength="1000" /></div>
          </fieldset>

          <fieldset class="space-y-3" :disabled="submitting || retryWithSameDetails">
            <legend class="font-serif font-bold mb-3">2. Payment method</legend>
            <label v-for="option in quote?.payment_options || []" :key="option.id" class="flex items-center gap-3 border border-brand-border p-4 cursor-pointer">
              <input v-model="customer.payment_method" name="payment_method" type="radio" :value="option.id" class="accent-brand-charcoal">
              <span>{{ option.label }}</span>
            </label>
            <p v-if="quote && !quote.payment_options.length" role="alert">No payment method is available for this bag.</p>
            <p v-if="quote?.requires_deposit" class="text-sm bg-brand-cream border border-brand-border p-4">Advance due: <strong>{{ formatPrice(quote.advance_due) }}</strong>. Tailoring begins after the store verifies the deposit.</p>
          </fieldset>

          <section v-if="requiresOtp" aria-labelledby="otp-heading" class="border border-brand-border bg-brand-cream p-4 space-y-3">
            <h2 id="otp-heading" class="font-semibold">Verify your mobile number</h2>
            <p v-if="!phoneVerified">We’ll send a four-digit code by SMS.</p>
            <button v-if="!phoneVerified" type="button" class="outline-action" :disabled="otpSending || cooldown > 0 || !customer.customer_phone.trim()" @click="sendOtp">
              {{ otpSending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : otpSent ? 'Resend code' : 'Send SMS code' }}
            </button>
            <div v-if="otpSent && !phoneVerified" class="space-y-2">
              <label for="otp-code">Verification code</label>
              <input id="otp-code" ref="otpInput" v-model="otpCode" type="text" inputmode="numeric" pattern="[0-9]{4}" autocomplete="one-time-code" maxlength="4" class="checkout-input" @keydown.enter.prevent="verifyOtp">
              <button type="button" :disabled="otpSending || otpVerifying || otpCode.length !== 4" class="outline-action" @click="verifyOtp">{{ otpVerifying ? 'Verifying…' : 'Verify code' }}</button>
            </div>
            <p v-if="otpMessage" role="status">{{ otpMessage }}</p>
            <p v-if="otpError" role="alert" class="text-red-800">{{ otpError }}</p>
          </section>
        </div>

        <section class="lg:col-span-5 space-y-4 border border-brand-border bg-brand-cream/40 p-5 sm:p-7 self-start" aria-labelledby="order-summary">
          <h2 id="order-summary" class="font-serif text-xl font-bold">Order summary ({{ itemCount }})</h2>
          <ul class="divide-y divide-brand-border">
            <li v-for="item in cart.items" :key="item.id" class="flex justify-between gap-3 py-2">
              <div class="min-w-0">
                {{ item.name }}<span v-if="item.size"> · {{ item.size }}</span> × {{ item.quantity }}
              </div>
              <span v-if="quotedLines.has(item.id)" class="shrink-0">{{ formatPrice(quotedLines.get(item.id)!) }}</span>
              <button v-if="quoteError" type="button" :aria-label="`Remove ${item.name}`" class="underline text-red-800 shrink-0" :disabled="submitting || retryWithSameDetails" @click="cart.removeItem(item.id)">Remove</button>
            </li>
          </ul>

          <div class="space-y-2 border-t border-brand-border pt-3">
            <div v-if="appliedCoupon" class="flex items-center justify-between gap-2">
              <span>Promo code: <strong>{{ appliedCoupon }}</strong></span>
              <button type="button" class="outline-action" :disabled="quoteLoading || submitting || retryWithSameDetails" @click="removeCoupon">Remove promo code</button>
            </div>
            <template v-else>
              <label for="promo-code">Promo code (optional)</label>
              <div class="flex gap-2">
                <input id="promo-code" v-model="couponInput" class="checkout-input !mt-0 min-w-0" maxlength="50" @keydown.enter.prevent="applyCoupon">
                <button type="button" class="outline-action" :disabled="quoteLoading || submitting || retryWithSameDetails || !couponInput.trim()" @click="applyCoupon">Apply</button>
              </div>
            </template>
            <p v-if="couponError" role="alert" class="text-sm text-red-800">{{ couponError }}</p>
          </div>

          <p v-if="quoteLoading" role="status">Checking prices and availability…</p>
          <div v-if="quoteError" role="alert" class="text-sm text-red-800 space-y-2">
            <p>{{ quoteError }}</p>
            <button type="button" class="outline-action" @click="updateQuote()">Retry price check</button>
          </div>
          <dl v-if="quote" class="space-y-2 border-t border-brand-border pt-3">
            <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ formatPrice(quote.subtotal) }}</dd></div>
            <div class="flex justify-between"><dt>Shipping</dt><dd>{{ Number(quote.shipping_fee) === 0 ? 'Free' : formatPrice(quote.shipping_fee) }}</dd></div>
            <div v-if="Number(quote.discount_amount) > 0" class="flex justify-between"><dt>Discount</dt><dd>−{{ formatPrice(quote.discount_amount) }}</dd></div>
            <div class="flex justify-between font-bold text-lg"><dt>Total</dt><dd>{{ formatPrice(quote.total_amount) }}</dd></div>
          </dl>
          <p v-if="submitError" role="alert" class="text-red-800 text-sm">{{ submitError }}</p>
          <button type="submit" :disabled="submitDisabled" class="w-full primary-action">
            {{ submitting ? 'Submitting order…' : retryWithSameDetails ? 'Retry order safely' : 'Place order' }}
          </button>
        </section>
      </form>
    </div>
  </div>
</template>

<style scoped>
.checkout-input { @apply block mt-1 w-full bg-white border border-brand-border px-3 py-2; }
.primary-action { @apply py-3 px-5 bg-brand-charcoal text-white font-semibold disabled:opacity-50; }
.outline-action { @apply py-2 px-3 bg-white border border-brand-charcoal text-brand-charcoal disabled:opacity-50; }
:where(input, textarea, button, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
