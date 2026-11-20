<script setup lang="ts">
import { useCartStore } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { useTracking } from '~/composables/useTracking'
import { useAbandonedCart } from '~/composables/useAbandonedCart'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const router = useRouter()
const route = useRoute()
const cart = useCartStore()
const auth = useAuthStore()
const { trackInitiateCheckout, trackPurchase } = useTracking()
const { sessionToken, isSyncing, isOptedOut, getOrCreateSessionToken, syncCart, recoverCart, optOut } = useAbandonedCart()

const recoveryBanner = ref('')

useSeoMeta({
  title: 'Secure Checkout | K. Fabrics Pakistan',
  description: 'Complete your luxury pret or custom tailoring order securely. Cash on Delivery and online advance options across Pakistan.',
})

onMounted(async () => {
  cart.initCart()
  await auth.initAuth()
  getOrCreateSessionToken()

  // 1. Abandoned Cart Recovery via ?recover=<session_token>
  const recoverToken = route.query.recover as string
  if (recoverToken) {
    const recovered = await recoverCart(recoverToken)
    if (recovered) {
      if (recovered.customer_name) customerForm.customer_name = recovered.customer_name
      if (recovered.customer_phone) customerForm.customer_phone = recovered.customer_phone
      if (recovered.customer_email) customerForm.customer_email = recovered.customer_email
      recoveryBanner.value = 'Welcome back! We restored your saved bag and active items.'
    }
  }

  // 2. Pre-fill & Auto-apply coupon via ?coupon=... (or COMPLETE5 if recovery link)
  const couponParam = (route.query.coupon as string) || (recoverToken ? 'COMPLETE5' : '')
  if (couponParam) {
    couponCodeInput.value = couponParam.toUpperCase()
    await handleApplyCoupon()
  }

  if (cart.items.length > 0) {
    trackInitiateCheckout(cart.items, cart.total)
  }

  if (auth.isAuthenticated && auth.user) {
    if (!customerForm.customer_name) customerForm.customer_name = auth.user.name || ''
    if (!customerForm.customer_phone) customerForm.customer_phone = auth.user.phone || ''
    if (!customerForm.customer_email) customerForm.customer_email = auth.user.email || ''

    // Try fetching default address
    try {
      const addrRes = await $fetch<any>(`${apiBase}/user/addresses`, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json',
        },
      })
      const defaultAddr = addrRes.data?.find((a: any) => a.is_default) || addrRes.data?.[0]
      if (defaultAddr) {
        if (!customerForm.shipping_address) customerForm.shipping_address = defaultAddr.address
        if (!customerForm.city) customerForm.city = defaultAddr.city
        if (defaultAddr.phone && !customerForm.customer_phone) customerForm.customer_phone = defaultAddr.phone
      }
    } catch (e) {
      // ignore
    }
  }
})

// Customer Form State
const customerForm = reactive({
  customer_name: '',
  customer_phone: '',
  customer_email: '',
  shipping_address: '',
  city: 'Lahore',
  notes: '',
  payment_method: 'cod' as 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa',
})

// Pakistani major cities list
const cities = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Quetta',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Abbottabad',
  'Other City / Town',
]

// Coupon state
const couponCodeInput = ref('')
const couponPending = ref(false)
const couponError = ref('')
const appliedCoupon = ref<{
  code: string
  discount_amount: number
  discount_type?: string
  discount_value?: number
} | null>(null)

// Apply Coupon Action
const handleApplyCoupon = async () => {
  if (!couponCodeInput.value.trim()) return

  couponPending.value = true
  couponError.value = ''

  try {
    const res = await $fetch<any>(`${apiBase}/coupons/validate`, {
      method: 'POST',
      body: {
        code: couponCodeInput.value.trim().toUpperCase(),
        subtotal: cart.subtotal,
      },
    })

    if (res.valid) {
      appliedCoupon.value = {
        code: res.coupon.code,
        discount_amount: Number(res.discount_amount),
        discount_type: res.coupon.discount_type,
        discount_value: Number(res.coupon.discount_value),
      }
      couponCodeInput.value = ''
    } else {
      couponError.value = res.message || 'Invalid coupon code.'
    }
  } catch (err: any) {
    couponError.value = err.data?.message || 'Failed to validate coupon.'
  } finally {
    couponPending.value = false
  }
}

const removeCoupon = () => {
  appliedCoupon.value = null
  couponError.value = ''
}

// Financial calculations
const discountAmount = computed(() => appliedCoupon.value?.discount_amount || 0)
const finalTotal = computed(() => {
  const tot = cart.subtotal + cart.shippingFee - discountAmount.value
  return Math.max(0, tot)
})

// 50% advance for tailoring
const isTailoring = computed(() => cart.hasTailoring)
const advanceAmount = computed(() => {
  if (!isTailoring.value) return 0
  return Math.round(finalTotal.value / 2)
})
const remainingBalance = computed(() => {
  return finalTotal.value - advanceAmount.value
})

const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')

// Order submission state
const isSubmitting = ref(false)
const submitError = ref('')
const placedOrder = ref<any>(null)

// Convert Data URL to Blob helper
const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(',')
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg'
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

// ==========================================
// Phase 13: COD 4-Digit OTP Verification State & Logic
// ==========================================
const otpChannel = ref<'whatsapp' | 'sms'>('whatsapp')
const otpSent = ref(false)
const otpSending = ref(false)
const otpVerifying = ref(false)
const otpDigits = reactive(['', '', '', ''])
const otpCooldown = ref(0)
const otpError = ref('')
const otpSuccessMsg = ref('')
const isPhoneVerified = ref(false)
const otpVerificationToken = ref('')
const verifiedPhone = ref('')
const otpInputRefs = ref<HTMLInputElement[]>([])
let cooldownTimer: any = null

const startCooldown = (seconds = 60) => {
  otpCooldown.value = seconds
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    if (otpCooldown.value > 0) {
      otpCooldown.value--
    } else {
      clearInterval(cooldownTimer)
    }
  }, 1000)
}

watch(() => customerForm.customer_phone, (newVal) => {
  if (isPhoneVerified.value && newVal.trim() !== verifiedPhone.value) {
    isPhoneVerified.value = false
    otpVerificationToken.value = ''
    otpSent.value = false
    otpDigits[0] = ''
    otpDigits[1] = ''
    otpDigits[2] = ''
    otpDigits[3] = ''
    otpSuccessMsg.value = ''
    otpError.value = 'Phone number changed. Please re-verify for COD.'
  }
})

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

const handleDigitInput = (index: number, event: Event) => {
  const input = event.target as HTMLInputElement
  const val = input.value.replace(/[^0-9]/g, '')
  otpDigits[index] = val ? val.slice(-1) : ''

  if (val && index < 3) {
    nextTick(() => {
      otpInputRefs.value[index + 1]?.focus()
    })
  }

  if (index === 3 && otpDigits.every(d => d !== '')) {
    handleVerifyOtp()
  }
}

const handleDigitKeydown = (index: number, event: KeyboardEvent) => {
  if (event.key === 'Backspace' && !otpDigits[index] && index > 0) {
    otpInputRefs.value[index - 1]?.focus()
  }
}

const handleDigitPaste = (event: ClipboardEvent) => {
  event.preventDefault()
  const pasted = event.clipboardData?.getData('text') || ''
  const digits = pasted.replace(/[^0-9]/g, '').slice(0, 4).split('')
  digits.forEach((d, i) => {
    otpDigits[i] = d
  })
  if (digits.length === 4) {
    otpInputRefs.value[3]?.focus()
    handleVerifyOtp()
  } else if (digits.length > 0) {
    otpInputRefs.value[Math.min(digits.length, 3)]?.focus()
  }
}

const handleSendOtp = async () => {
  if (!customerForm.customer_phone.trim()) {
    otpError.value = 'Please enter your mobile phone number first.'
    return
  }

  otpError.value = ''
  otpSuccessMsg.value = ''
  otpSending.value = true

  try {
    const res = await $fetch<any>(`${apiBase}/checkout/send-otp`, {
      method: 'POST',
      body: {
        phone: customerForm.customer_phone.trim(),
        channel: otpChannel.value,
      },
    })

    if (res.success) {
      otpSent.value = true
      startCooldown(res.cooldown_seconds || 60)
      otpSuccessMsg.value = res.message || `4-digit OTP sent to ${res.phone} via ${otpChannel.value}.`

      if (res.debug_code) {
        const chars = String(res.debug_code).split('')
        chars.forEach((c, i) => { otpDigits[i] = c })
      }

      nextTick(() => {
        otpInputRefs.value[0]?.focus()
      })
    }
  } catch (err: any) {
    otpError.value = err.data?.message || err.data?.errors?.phone?.[0] || 'Failed to dispatch verification code.'
  } finally {
    otpSending.value = false
  }
}

const handleVerifyOtp = async () => {
  const code = otpDigits.join('')
  if (code.length < 4) {
    otpError.value = 'Please enter all 4 digits of the verification code.'
    return
  }

  otpError.value = ''
  otpVerifying.value = true

  try {
    const res = await $fetch<any>(`${apiBase}/checkout/verify-otp`, {
      method: 'POST',
      body: {
        phone: customerForm.customer_phone.trim(),
        code,
      },
    })

    if (res.success) {
      isPhoneVerified.value = true
      otpVerificationToken.value = res.verification_token
      verifiedPhone.value = customerForm.customer_phone.trim()
      otpSuccessMsg.value = '✓ Mobile number successfully verified.'
      otpError.value = ''
    }
  } catch (err: any) {
    otpError.value = err.data?.message || err.data?.errors?.code?.[0] || 'Invalid verification code.'
  } finally {
    otpVerifying.value = false
  }
}

// Auto-sync cart to backend for 2-hour abandoned cart recovery (Phase 14)
watch(
  [
    () => customerForm.customer_name,
    () => customerForm.customer_phone,
    () => customerForm.customer_email,
    () => cart.items,
  ],
  () => {
    syncCart({
      name: customerForm.customer_name,
      phone: customerForm.customer_phone,
      email: customerForm.customer_email,
    })
  },
  { deep: true }
)

// Submit Order to backend API
const handleSubmitOrder = async () => {
  if (cart.items.length === 0) return

  // Basic validation
  if (!customerForm.customer_name.trim() || !customerForm.customer_phone.trim() || !customerForm.shipping_address.trim()) {
    submitError.value = 'Please fill in all required customer details (Name, Phone & Address).'
    return
  }

  // COD OTP Verification Check
  if (customerForm.payment_method === 'cod' && !isPhoneVerified.value) {
    submitError.value = 'Please verify your phone number with the 4-digit OTP before placing a Cash on Delivery order.'
    return
  }

  submitError.value = ''
  isSubmitting.value = true

  try {
    // Separate ready-to-wear items and standalone stitching (including addons)
    const readyToWearItems = cart.items
      .filter(item => item.type === 'product' && (item.variantId || item.addonId))
      .map(item => ({
        product_id: item.productId,
        variant_id: item.variantId || null,
        addon_id: item.addonId || null,
        is_addon: Boolean(item.isAddon),
        parent_product_id: item.parentProductId || null,
        selected_size: item.selectedSize || item.size || null,
        quantity: item.quantity,
        custom_fitting: item.customFitting || null,
      }))

    const standaloneItem = cart.items.find(item => item.type === 'stitching' && item.serviceId)

    const formData = new FormData()
    formData.append('customer_name', customerForm.customer_name.trim())
    formData.append('customer_phone', customerForm.customer_phone.trim())
    if (customerForm.customer_email.trim()) {
      formData.append('customer_email', customerForm.customer_email.trim())
    }
    formData.append('shipping_address', customerForm.shipping_address.trim())
    formData.append('city', customerForm.city)
    formData.append('payment_method', customerForm.payment_method)
    if (sessionToken.value) {
      formData.append('session_token', sessionToken.value)
    }
    if (otpVerificationToken.value) {
      formData.append('verification_token', otpVerificationToken.value)
    }
    if (customerForm.notes.trim()) {
      formData.append('notes', customerForm.notes.trim())
    }
    if (appliedCoupon.value?.code) {
      formData.append('coupon_code', appliedCoupon.value.code)
    }

    if (readyToWearItems.length > 0) {
      formData.append('items', JSON.stringify(readyToWearItems))
    }

    if (standaloneItem) {
      const standaloneData: Record<string, any> = {
        stitching_service_id: standaloneItem.serviceId,
        fabric_delivery_method: standaloneItem.fabricDeliveryMethod || 'courier_by_customer',
        neck_style: standaloneItem.neckStyle || null,
        sleeve_style: standaloneItem.sleeveStyle || null,
        trouser_style: standaloneItem.trouserStyle || null,
        special_instructions: standaloneItem.specialInstructions || null,
        measurements: standaloneItem.measurements || null,
      }

      // Check if reference image is a data URL or file
      if (standaloneItem.designReferenceImage && standaloneItem.designReferenceImage.startsWith('data:')) {
        const imageBlob = dataURLtoBlob(standaloneItem.designReferenceImage)
        formData.append('design_reference_image', imageBlob, 'reference.jpg')
      } else if (standaloneItem.designReferenceImage) {
        standaloneData.design_reference_image = standaloneItem.designReferenceImage
      }

      formData.append('standalone_stitching', JSON.stringify(standaloneData))
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    }
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`
    }

    const response = await $fetch<any>(`${apiBase}/orders`, {
      method: 'POST',
      body: formData,
      headers,
    })

    // On success
    placedOrder.value = response.data

    // Fire Purchase Pixel Event
    trackPurchase({
      orderNumber: response.data.order_number,
      totalAmount: Number(response.data.total_amount),
      items: (response.data.items || []).map((it: any) => ({
        id: it.product_id,
        name: it.product_name,
        price: Number(it.unit_price),
        quantity: it.quantity,
      })),
      currency: 'PKR',
    })

    cart.clearCart()
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  } catch (err: any) {
    console.error('Order creation failed:', err)
    submitError.value = err.data?.message || err.message || 'Failed to place order. Please check your details.'
  } finally {
    isSubmitting.value = false
  }
}

// WhatsApp confirmation link generator
const generateWhatsAppConfirmationLink = () => {
  if (!placedOrder.value) return '#'
  const ord = placedOrder.value
  let text = `Hello K. Fabrics Concierge, I just placed an order!\n\n`
  text += `• *Order Number:* ${ord.order_number}\n`
  text += `• *Customer:* ${ord.customer_name}\n`
  text += `• *Total Amount:* ${formatPrice(ord.total_amount)}\n`
  text += `• *Payment Method:* ${ord.payment_method.toUpperCase()}\n`
  if (isTailoring.value) {
    text += `• *Tailoring Advance Due (50%):* ${formatPrice(advanceAmount.value)}\n`
  }
  text += `\nPlease confirm receipt of order.`
  return `https://wa.me/923001234567?text=${encodeURIComponent(text)}`
}
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-8">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <NuxtLink to="/shop" class="hover:text-brand-charcoal transition-colors">Shop</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">Checkout</span>
      </nav>

      <!-- Recovery Banner (Phase 14) -->
      <div
        v-if="recoveryBanner"
        class="mb-6 p-4 bg-brand-gold/15 border border-brand-gold text-brand-charcoal text-xs flex items-center justify-between"
      >
        <div class="flex items-center space-x-2">
          <svg class="w-4 h-4 text-brand-gold shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
          </svg>
          <span class="font-medium">{{ recoveryBanner }}</span>
          <span v-if="appliedCoupon?.code === 'COMPLETE5'" class="text-brand-gold font-semibold ml-2">
            (5% discount applied!)
          </span>
        </div>
        <button
          type="button"
          class="text-brand-muted hover:text-brand-charcoal text-sm ml-4 font-bold"
          @click="recoveryBanner = ''"
        >
          ✕
        </button>
      </div>

      <!-- ================= SUCCESS CONFIRMATION SCREEN ================= -->
      <div
        v-if="placedOrder"
        class="max-w-2xl mx-auto border border-brand-border bg-brand-cream/40 p-8 sm:p-12 text-center shadow-lg"
      >
        <div class="w-16 h-16 rounded-full bg-brand-charcoal text-white flex items-center justify-center mx-auto mb-6">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <span class="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-semibold block mb-1">
          Order Confirmed
        </span>
        <h1 class="font-serif text-3xl sm:text-4xl font-bold text-brand-charcoal mb-3">
          Thank You, {{ placedOrder.customer_name }}
        </h1>
        <p class="text-xs text-brand-muted mb-8 max-w-md mx-auto">
          Your bespoke order has been registered in our atelier system. We have sent confirmation details to your phone.
        </p>

        <!-- Order Number Display -->
        <div class="bg-white border border-brand-border p-6 mb-8 inline-block w-full max-w-md">
          <span class="text-[10px] uppercase tracking-luxury text-brand-muted block mb-1">Your Order Number</span>
          <span class="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal tracking-wider">
            {{ placedOrder.order_number }}
          </span>
          <div class="mt-4 pt-4 border-t border-brand-border flex items-center justify-between text-xs text-brand-muted">
            <span>Total Payable:</span>
            <span class="font-bold text-brand-charcoal text-sm">{{ formatPrice(placedOrder.total_amount) }}</span>
          </div>
        </div>

        <!-- WhatsApp Bot Confirmation Notice for COD -->
        <div
          v-if="placedOrder.payment_method === 'cod'"
          class="bg-brand-cream/90 border border-brand-gold/60 p-5 mb-8 text-left text-xs text-brand-charcoal space-y-2"
        >
          <div class="flex items-center space-x-2 text-brand-charcoal font-semibold uppercase tracking-luxury text-[11px]">
            <svg class="w-4 h-4 text-green-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10c0 4.418-3.582 8-8 8a8.956 8.956 0 01-4.996-1.505l-3.297.868.885-3.218A8.961 8.961 0 012 10c0-4.418 3.582-8 8-8s8 3.582 8 8zm-8 4a1 1 0 100-2 1 1 0 000 2zm1-9a1 1 0 00-2 0v5a1 1 0 002 0V5z" clip-rule="evenodd" />
            </svg>
            <span>WhatsApp Bot Order Confirmation</span>
          </div>
          <p class="leading-relaxed text-brand-muted">
            We have dispatched an automated WhatsApp confirmation message to <strong class="text-brand-charcoal font-semibold">{{ placedOrder.customer_phone }}</strong>. Please reply with <strong class="text-brand-charcoal font-semibold">1 to confirm</strong> or <strong class="text-brand-charcoal font-semibold">2 to cancel</strong> before workshop dispatch.
          </p>
        </div>

        <!-- 50% Advance Notice if Tailoring -->
        <div
          v-if="placedOrder.stitching_requests?.length > 0"
          class="border border-brand-gold bg-brand-cream p-5 mb-8 text-left text-xs text-brand-charcoal space-y-3"
        >
          <div class="flex items-center space-x-2 text-brand-gold font-semibold uppercase tracking-luxury text-[11px]">
            <span>● Tailoring Advance Payment Required</span>
          </div>
          <p class="leading-relaxed">
            As this order contains bespoke custom tailoring, please transfer <strong class="text-brand-charcoal font-semibold">{{ formatPrice(placedOrder.total_amount * 0.5) }}</strong> (50% deposit) to activate cutting at our atelier.
          </p>
          <div class="bg-white p-3 border border-brand-border space-y-1 font-mono text-[11px]">
            <p><strong>Meezan Bank:</strong> 02010102345678 (K Fabrics Atelier)</p>
            <p><strong>JazzCash:</strong> 0300 1234567 (K. Fabrics)</p>
            <p><strong>EasyPaisa:</strong> 0300 1234567 (K. Fabrics)</p>
          </div>
        </div>

        <!-- Action CTAs -->
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            :href="generateWhatsAppConfirmationLink()"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full sm:w-auto px-8 py-3.5 bg-[#25D366] text-white hover:bg-[#20ba59] text-xs uppercase tracking-luxury font-medium transition-colors flex items-center justify-center space-x-2 shadow"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
            <span>Confirm on WhatsApp</span>
          </a>

          <NuxtLink
            :to="`/track-order?order_number=${placedOrder.order_number}&phone=${placedOrder.customer_phone}`"
            class="w-full sm:w-auto px-8 py-3.5 bg-brand-charcoal text-white hover:bg-brand-gold text-xs uppercase tracking-luxury font-medium transition-colors"
          >
            Track Status
          </NuxtLink>
        </div>
      </div>

      <!-- ================= EMPTY BAG FALLBACK ================= -->
      <div
        v-else-if="cart.items.length === 0"
        class="max-w-md mx-auto text-center py-20 border border-brand-border p-8"
      >
        <div class="w-12 h-12 mx-auto text-brand-muted/40 mb-3">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h2 class="font-serif text-xl font-bold text-brand-charcoal mb-2">Your Bag is Empty</h2>
        <p class="text-xs text-brand-muted mb-6">Add ready-to-wear dresses or book custom tailoring to proceed with checkout.</p>
        <NuxtLink
          to="/shop"
          class="inline-block px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors"
        >
          Explore Collection
        </NuxtLink>
      </div>

      <!-- ================= MAIN CHECKOUT 2-COLUMN VIEW ================= -->
      <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <!-- LEFT COLUMN: Customer, Shipping & Payment Form (7 Cols) -->
        <div class="lg:col-span-7 space-y-10">
          <div>
            <h1 class="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal mb-1">
              Checkout & Delivery
            </h1>
            <p class="text-xs text-brand-muted font-light">
              Enter your shipping information and preferred payment method.
            </p>
          </div>

          <!-- Section 1: Customer Details -->
          <div class="space-y-4">
            <h2 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal border-b border-brand-border pb-2">
              1. Customer Information
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block mb-1">
                  Full Name *
                </label>
                <input
                  v-model="customerForm.customer_name"
                  type="text"
                  required
                  placeholder="e.g. Ayesha Khan"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block">
                    Phone Number (WhatsApp) *
                  </label>
                  <span
                    v-if="customerForm.payment_method === 'cod' && isPhoneVerified"
                    class="text-[9px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 uppercase font-medium flex items-center space-x-1"
                  >
                    <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                    </svg>
                    <span>Verified for COD</span>
                  </span>
                  <span
                    v-else-if="customerForm.payment_method === 'cod'"
                    class="text-[9px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 uppercase font-medium"
                  >
                    OTP Required for COD
                  </span>
                </div>
                <input
                  v-model="customerForm.customer_phone"
                  type="tel"
                  required
                  placeholder="e.g. 0300 1234567"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>

            <div>
              <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block mb-1">
                Email Address (Optional)
              </label>
              <input
                v-model="customerForm.customer_email"
                type="email"
                placeholder="ayesha@example.com"
                class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              >
            </div>

            <!-- Cart Recovery Notification Opt-Out -->
            <div class="pt-1 flex items-center justify-between text-[11px] text-brand-muted">
              <label class="inline-flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  :checked="isOptedOut"
                  class="accent-brand-charcoal rounded text-brand-gold"
                  @change="optOut"
                >
                <span>Opt out of automated WhatsApp cart recovery reminders</span>
              </label>
            </div>
          </div>

          <!-- Section 2: Shipping Address -->
          <div class="space-y-4">
            <h2 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal border-b border-brand-border pb-2">
              2. Shipping Details
            </h2>

            <div>
              <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block mb-1">
                Street Address / House No. *
              </label>
              <textarea
                v-model="customerForm.shipping_address"
                rows="2"
                required
                placeholder="House #, Street, Phase / Block, Area..."
                class="w-full bg-white border border-brand-border p-3 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block mb-1">
                  City *
                </label>
                <select
                  v-model="customerForm.city"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
                  <option v-for="c in cities" :key="c" :value="c">
                    {{ c }}
                  </option>
                </select>
              </div>

              <div>
                <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block mb-1">
                  Special Delivery Instructions
                </label>
                <input
                  v-model="customerForm.notes"
                  type="text"
                  placeholder="e.g. Leave with security guard..."
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>
          </div>

          <!-- Section 3: Payment Method -->
          <div class="space-y-4">
            <h2 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal border-b border-brand-border pb-2">
              3. Payment Method
            </h2>

            <div class="space-y-3">
              <!-- COD -->
              <div>
                <label
                  class="border p-4 flex items-start space-x-3 cursor-pointer transition-colors block"
                  :class="[customerForm.payment_method === 'cod' ? 'border-brand-charcoal bg-brand-cream/60' : 'border-brand-border bg-white']"
                >
                  <input
                    v-model="customerForm.payment_method"
                    type="radio"
                    value="cod"
                    class="mt-1 accent-brand-charcoal"
                  >
                  <div class="flex-1">
                    <span class="text-xs font-bold uppercase tracking-luxury text-brand-charcoal block">
                      Cash on Delivery (COD)
                    </span>
                    <span class="text-xs text-brand-muted">
                      Pay cash upon delivery at your doorstep across Pakistan.
                    </span>
                  </div>
                </label>

                <!-- COD 4-Digit OTP Verification Box -->
                <div
                  v-if="customerForm.payment_method === 'cod'"
                  class="mt-2 p-4 bg-brand-cream/90 border border-brand-border/80 space-y-4"
                >
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-brand-border/60 pb-3">
                    <div>
                      <h4 class="font-serif text-xs font-bold uppercase tracking-luxury text-brand-charcoal flex items-center space-x-1.5">
                        <svg class="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>4-Digit Phone Verification</span>
                      </h4>
                      <p class="text-[11px] text-brand-muted mt-0.5">
                        To protect against fake orders, verify your mobile number before placing COD.
                      </p>
                    </div>

                    <!-- Verified Badge -->
                    <div
                      v-if="isPhoneVerified"
                      class="inline-flex items-center space-x-1.5 text-xs text-green-700 bg-green-50 border border-green-300 px-3 py-1 font-medium shrink-0"
                    >
                      <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <span>Phone Verified</span>
                    </div>
                  </div>

                  <!-- Verification Flow if not yet verified -->
                  <div v-if="!isPhoneVerified" class="space-y-3">
                    <!-- Channel Selector & Send Button -->
                    <div class="flex flex-wrap items-center gap-2">
                      <!-- WhatsApp / SMS Toggle -->
                      <div class="inline-flex border border-brand-border bg-white p-0.5 text-[10px] uppercase font-medium">
                        <button
                          type="button"
                          :class="[otpChannel === 'whatsapp' ? 'bg-brand-charcoal text-white' : 'text-brand-muted hover:text-brand-charcoal']"
                          class="px-3 py-1.5 transition-colors"
                          @click="otpChannel = 'whatsapp'"
                        >
                          WhatsApp (Instant)
                        </button>
                        <button
                          type="button"
                          :class="[otpChannel === 'sms' ? 'bg-brand-charcoal text-white' : 'text-brand-muted hover:text-brand-charcoal']"
                          class="px-3 py-1.5 transition-colors"
                          @click="otpChannel = 'sms'"
                        >
                          SMS
                        </button>
                      </div>

                      <button
                        type="button"
                        :disabled="otpSending || otpCooldown > 0 || !customerForm.customer_phone.trim()"
                        class="px-4 py-2 bg-brand-charcoal text-white text-[11px] uppercase tracking-luxury hover:bg-brand-gold disabled:opacity-50 transition-colors font-medium shrink-0"
                        @click="handleSendOtp"
                      >
                        <span v-if="otpSending">Sending...</span>
                        <span v-else-if="otpCooldown > 0">Resend in {{ otpCooldown }}s</span>
                        <span v-else-if="otpSent">Resend Code</span>
                        <span v-else>Send 4-Digit Code</span>
                      </button>

                      <span v-if="!customerForm.customer_phone.trim()" class="text-[10px] text-amber-700 italic">
                        * Please fill in phone number in Section 1
                      </span>
                    </div>

                    <!-- 4-Box Numeric OTP Input -->
                    <div v-if="otpSent" class="pt-2 space-y-2">
                      <label class="text-[10px] uppercase tracking-wider text-brand-charcoal font-medium block">
                        Enter 4-Digit Code sent to {{ customerForm.customer_phone }}:
                      </label>

                      <div class="flex items-center space-x-2">
                        <input
                          v-for="(digit, idx) in otpDigits"
                          :key="idx"
                          :ref="el => { if (el) otpInputRefs[idx] = el as HTMLInputElement }"
                          v-model="otpDigits[idx]"
                          type="text"
                          inputmode="numeric"
                          pattern="[0-9]*"
                          maxlength="1"
                          class="w-12 h-12 text-center text-lg font-serif font-bold text-brand-charcoal bg-white border border-brand-border focus:border-brand-gold focus:outline-none transition-colors"
                          @input="handleDigitInput(idx, $event)"
                          @keydown="handleDigitKeydown(idx, $event)"
                          @paste="handleDigitPaste($event)"
                        >

                        <button
                          type="button"
                          :disabled="otpVerifying || otpDigits.some(d => !d)"
                          class="px-5 h-12 bg-brand-gold text-brand-charcoal hover:bg-brand-charcoal hover:text-white text-xs uppercase tracking-luxury font-medium transition-colors disabled:opacity-50"
                          @click="handleVerifyOtp"
                        >
                          <span v-if="otpVerifying">Verifying...</span>
                          <span v-else>Verify Code</span>
                        </button>
                      </div>
                    </div>

                    <!-- Feedback Alert Messages -->
                    <div v-if="otpError" class="text-xs text-red-600 bg-red-50 p-2.5 border border-red-200">
                      {{ otpError }}
                    </div>
                    <div v-if="otpSuccessMsg && !isPhoneVerified" class="text-xs text-brand-charcoal bg-white p-2.5 border border-brand-border">
                      {{ otpSuccessMsg }}
                    </div>
                  </div>

                  <!-- Verified Status Info -->
                  <div v-else class="text-xs text-brand-muted space-y-1">
                    <p>
                      Phone <strong class="text-brand-charcoal">{{ verifiedPhone }}</strong> is successfully verified.
                    </p>
                    <p class="text-[11px] text-brand-muted/80">
                      After checkout, our WhatsApp bot will dispatch an order confirmation prompt. Simply reply <strong>1 to confirm</strong> or <strong>2 to cancel</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <!-- Bank Transfer -->
              <label
                class="border p-4 flex items-start space-x-3 cursor-pointer transition-colors block"
                :class="[customerForm.payment_method === 'bank_transfer' ? 'border-brand-charcoal bg-brand-cream/60' : 'border-brand-border bg-white']"
              >
                <input
                  v-model="customerForm.payment_method"
                  type="radio"
                  value="bank_transfer"
                  class="mt-1 accent-brand-charcoal"
                >
                <div class="flex-1">
                  <span class="text-xs font-bold uppercase tracking-luxury text-brand-charcoal block">
                    Direct Bank Transfer (Meezan / HBL)
                  </span>
                  <span class="text-xs text-brand-muted">
                    Transfer online and share receipt on WhatsApp for instant confirmation.
                  </span>
                </div>
              </label>

              <!-- JazzCash -->
              <label
                class="border p-4 flex items-start space-x-3 cursor-pointer transition-colors block"
                :class="[customerForm.payment_method === 'jazzcash' ? 'border-brand-charcoal bg-brand-cream/60' : 'border-brand-border bg-white']"
              >
                <input
                  v-model="customerForm.payment_method"
                  type="radio"
                  value="jazzcash"
                  class="mt-1 accent-brand-charcoal"
                >
                <div class="flex-1">
                  <span class="text-xs font-bold uppercase tracking-luxury text-brand-charcoal block">
                    JazzCash Mobile Wallet
                  </span>
                  <span class="text-xs text-brand-muted">
                    Send funds instantly to our merchant account (0300 1234567).
                  </span>
                </div>
              </label>

              <!-- EasyPaisa -->
              <label
                class="border p-4 flex items-start space-x-3 cursor-pointer transition-colors block"
                :class="[customerForm.payment_method === 'easypaisa' ? 'border-brand-charcoal bg-brand-cream/60' : 'border-brand-border bg-white']"
              >
                <input
                  v-model="customerForm.payment_method"
                  type="radio"
                  value="easypaisa"
                  class="mt-1 accent-brand-charcoal"
                >
                <div class="flex-1">
                  <span class="text-xs font-bold uppercase tracking-luxury text-brand-charcoal block">
                    EasyPaisa Mobile Account
                  </span>
                  <span class="text-xs text-brand-muted">
                    Fast transfer to our verified EasyPaisa account (0300 1234567).
                  </span>
                </div>
              </label>
            </div>

            <!-- Tailoring 50% Advance Notice Box -->
            <div
              v-if="isTailoring"
              class="border border-brand-gold bg-brand-cream p-5 text-xs text-brand-charcoal space-y-2 mt-4"
            >
              <div class="flex items-center space-x-1.5 text-brand-gold font-bold uppercase tracking-luxury text-[11px]">
                <svg class="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>50% Advance Required for Atelier Stitching</span>
              </div>
              <p class="leading-relaxed">
                Your order includes bespoke tailoring. A 50% advance deposit of <strong class="text-brand-charcoal font-semibold">{{ formatPrice(advanceAmount) }}</strong> is required via Bank Transfer, JazzCash, or EasyPaisa. The remaining balance of <strong class="text-brand-charcoal font-semibold">{{ formatPrice(remainingBalance) }}</strong> can be paid via Cash on Delivery upon receipt.
              </p>
              <div class="bg-white/80 p-2.5 border border-brand-border/60 text-[11px] font-mono">
                <p>Meezan Bank: 02010102345678 (K Fabrics)</p>
                <p>JazzCash / EasyPaisa: 0300 1234567</p>
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT COLUMN: Order Summary & Coupon (5 Cols) -->
        <div class="lg:col-span-5">
          <div class="sticky top-28 border border-brand-border bg-brand-cream/40 p-6 sm:p-8 space-y-6">
            <h2 class="font-serif text-lg font-bold uppercase tracking-luxury text-brand-charcoal border-b border-brand-border pb-4">
              Order Summary ({{ cart.totalItems }})
            </h2>

            <!-- Cart Items List -->
            <div class="max-h-72 overflow-y-auto divide-y divide-brand-border pr-2">
              <div
                v-for="item in cart.items"
                :key="item.id"
                class="py-3 flex items-center space-x-3 first:pt-0 last:pb-0"
              >
                <div class="w-14 h-18 bg-white border border-brand-border overflow-hidden shrink-0">
                  <img
                    v-if="item.image || item.designReferenceImage"
                    :src="item.image || item.designReferenceImage || ''"
                    :alt="item.name"
                    class="w-full h-full object-cover"
                  >
                  <div v-else class="w-full h-full flex items-center justify-center text-brand-muted text-[10px]">
                    Atelier
                  </div>
                </div>

                <div class="flex-1 text-xs">
                  <h3 class="font-serif font-bold text-brand-charcoal line-clamp-1">
                    {{ item.name }}
                  </h3>
                  <div class="text-[10px] text-brand-muted mt-0.5 space-x-2">
                    <span v-if="item.size">Size: {{ item.size }}</span>
                    <span>Qty: {{ item.quantity }}</span>
                  </div>
                  <span
                    v-if="item.customFitting || item.type === 'stitching'"
                    class="inline-block text-[9px] bg-brand-gold/10 border border-brand-gold/30 text-brand-gold px-1.5 py-0.2 uppercase font-medium mt-1"
                  >
                    Custom Fit
                  </span>
                </div>

                <div class="text-xs font-bold text-brand-charcoal shrink-0">
                  {{ formatPrice(item.price * item.quantity) }}
                </div>
              </div>
            </div>

            <!-- Coupon Code Section -->
            <div class="pt-4 border-t border-brand-border">
              <label class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1.5">
                Have a Promo Code?
              </label>

              <!-- If applied -->
              <div
                v-if="appliedCoupon"
                class="flex items-center justify-between bg-white border border-brand-gold p-2.5 text-xs"
              >
                <div class="flex items-center space-x-2">
                  <span class="text-brand-gold font-bold">✓ {{ appliedCoupon.code }}</span>
                  <span class="text-brand-muted">(-{{ formatPrice(discountAmount) }})</span>
                </div>
                <button
                  class="text-[10px] uppercase tracking-wider text-red-600 hover:underline"
                  @click="removeCoupon"
                >
                  Remove
                </button>
              </div>

              <!-- Input form -->
              <div v-else class="flex space-x-2">
                <input
                  v-model="couponCodeInput"
                  type="text"
                  placeholder="Enter code (e.g. WELCOME10)"
                  class="flex-1 bg-white border border-brand-border px-3 py-2 text-xs uppercase text-brand-charcoal focus:border-brand-gold focus:outline-none"
                  @keyup.enter="handleApplyCoupon"
                >
                <button
                  :disabled="couponPending || !couponCodeInput.trim()"
                  class="px-4 py-2 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold disabled:opacity-40 transition-colors"
                  @click="handleApplyCoupon"
                >
                  {{ couponPending ? '...' : 'Apply' }}
                </button>
              </div>

              <p v-if="couponError" class="text-[11px] text-red-600 mt-1.5 font-medium">
                {{ couponError }}
              </p>
            </div>

            <!-- Price Breakdown -->
            <div class="pt-4 border-t border-brand-border space-y-2 text-xs text-brand-muted">
              <div class="flex justify-between">
                <span>Subtotal</span>
                <span class="font-medium text-brand-charcoal">{{ formatPrice(cart.subtotal) }}</span>
              </div>

              <div class="flex justify-between">
                <span>Nationwide Shipping</span>
                <span v-if="cart.shippingFee === 0" class="text-brand-gold font-medium">Free</span>
                <span v-else class="text-brand-charcoal">{{ formatPrice(cart.shippingFee) }}</span>
              </div>

              <div v-if="discountAmount > 0" class="flex justify-between text-brand-gold font-medium">
                <span>Promo Discount</span>
                <span>-{{ formatPrice(discountAmount) }}</span>
              </div>

              <div class="pt-3 border-t border-brand-border flex justify-between items-baseline text-sm font-bold text-brand-charcoal">
                <span class="font-serif uppercase tracking-luxury">Total Payable</span>
                <span class="font-serif text-xl font-bold">{{ formatPrice(finalTotal) }}</span>
              </div>

              <div v-if="isTailoring" class="flex justify-between text-[11px] text-brand-gold font-medium pt-1">
                <span>50% Advance Due Now:</span>
                <span>{{ formatPrice(advanceAmount) }}</span>
              </div>
            </div>

            <!-- Submit Error message -->
            <div v-if="submitError" class="p-3 bg-red-50 border border-red-200 text-red-700 text-xs">
              {{ submitError }}
            </div>

            <!-- Submit Button -->
            <button
              :disabled="isSubmitting || (customerForm.payment_method === 'cod' && !isPhoneVerified)"
              class="w-full py-4 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200 disabled:opacity-50 shadow-md"
              @click="handleSubmitOrder"
            >
              <span v-if="isSubmitting">Placing Order...</span>
              <span v-else-if="customerForm.payment_method === 'cod' && !isPhoneVerified">Verify Phone to Place COD Order</span>
              <span v-else-if="customerForm.payment_method === 'cod'">Place Cash on Delivery Order →</span>
              <span v-else>Place Order Now →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>