<script setup lang="ts">
const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const route = useRoute()
const router = useRouter()

// Search input states
const orderNumberInput = ref((route.query.order_number as string) || '')
const phoneInput = ref((route.query.phone as string) || '')

const isSearching = ref(false)
const searchError = ref('')
const trackedOrder = ref<any>(null)

// Format Price
const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')

// Format Date
const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Lifecycle Stepper Stages for Main Order
const orderStages = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'stitching', label: 'Atelier Tailoring' },
  { key: 'packed', label: 'Quality Check & Packed' },
  { key: 'shipped', label: 'Dispatched / In Transit' },
  { key: 'delivered', label: 'Delivered' },
]

// Stitching Stepper Stages for Tailoring Requests
const stitchingStages = [
  { key: 'awaiting_fabric', label: 'Awaiting Fabric' },
  { key: 'cutting', label: 'Cutting & Styling' },
  { key: 'stitching', label: 'Hand Tailoring' },
  { key: 'finishing', label: 'Borders & Finishing' },
  { key: 'ready', label: 'Ready for Dispatch' },
]

const getOrderStageIndex = (status: string) => {
  const index = orderStages.findIndex(s => s.key === status)
  return index !== -1 ? index : 0
}

const getStitchingStageIndex = (status: string) => {
  const index = stitchingStages.findIndex(s => s.key === status)
  return index !== -1 ? index : 0
}

// Track Order API Call
const handleTrackOrder = async () => {
  if (!orderNumberInput.value.trim() || !phoneInput.value.trim()) {
    searchError.value = 'Please provide both your Order Number and Phone Number.'
    return
  }

  isSearching.value = true
  searchError.value = ''

  try {
    const res = await $fetch<any>(`${apiBase}/orders/track`, {
      params: {
        order_number: orderNumberInput.value.trim().toUpperCase(),
        customer_phone: phoneInput.value.trim(),
      },
    })

    trackedOrder.value = res.data

    // Update query params in URL without reloading
    router.replace({
      query: {
        order_number: orderNumberInput.value.trim().toUpperCase(),
        phone: phoneInput.value.trim(),
      },
    })
  } catch (err: any) {
    trackedOrder.value = null
    searchError.value = err.data?.message || 'Order not found. Please verify your order number and phone number.'
  } finally {
    isSearching.value = false
  }
}

// Auto-run if query params present
onMounted(() => {
  if (orderNumberInput.value && phoneInput.value) {
    handleTrackOrder()
  }
})
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-8">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">Track Order</span>
      </nav>

      <!-- Header -->
      <div class="text-center max-w-xl mx-auto mb-10">
        <span class="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-semibold block mb-2">
          Real-Time Order & Stitching Tracking
        </span>
        <h1 class="font-serif text-3xl sm:text-5xl font-bold text-brand-charcoal">
          Track Your Order
        </h1>
        <p class="text-xs text-brand-muted mt-2 font-light leading-relaxed">
          Follow your luxury ready-to-wear shipment and monitor your bespoke tailoring progress at every stage of the atelier process.
        </p>
      </div>

      <!-- Search Box Card -->
      <div class="border border-brand-border bg-brand-cream/50 p-6 sm:p-8 mb-12 shadow-sm">
        <form class="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end" @submit.prevent="handleTrackOrder">
          <div class="sm:col-span-5">
            <label class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1.5">
              Order Number *
            </label>
            <input
              v-model="orderNumberInput"
              type="text"
              placeholder="e.g. KF-2026-0001"
              required
              class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs uppercase text-brand-charcoal font-medium tracking-wider focus:border-brand-gold focus:outline-none"
            >
          </div>

          <div class="sm:col-span-4">
            <label class="text-[10px] uppercase tracking-luxury text-brand-charcoal font-semibold block mb-1.5">
              Phone Number *
            </label>
            <input
              v-model="phoneInput"
              type="tel"
              placeholder="e.g. 0321 1234567"
              required
              class="w-full bg-white border border-brand-border px-3.5 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
            >
          </div>

          <div class="sm:col-span-3">
            <button
              type="submit"
              :disabled="isSearching"
              class="w-full py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors duration-200 disabled:opacity-50"
            >
              {{ isSearching ? 'Tracking...' : 'Track Order' }}
            </button>
          </div>
        </form>

        <p v-if="searchError" class="text-xs text-red-600 mt-3 font-medium">
          {{ searchError }}
        </p>
      </div>

      <!-- ================= TRACKED ORDER RESULT ================= -->
      <div v-if="trackedOrder" class="space-y-10">
        <!-- Order Header Bar -->
        <div class="border border-brand-border bg-brand-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center space-x-3">
              <span class="font-serif text-2xl font-bold text-brand-charcoal">
                {{ trackedOrder.order_number }}
              </span>
              <span
                class="px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-semibold"
                :class="[
                  trackedOrder.order_status === 'delivered'
                    ? 'bg-green-100 text-green-800'
                    : trackedOrder.order_status === 'shipped'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-brand-gold/15 text-brand-gold border border-brand-gold/30'
                ]"
              >
                {{ trackedOrder.order_status.replace(/_/g, ' ') }}
              </span>
            </div>
            <p class="text-xs text-brand-muted mt-1">
              Placed on {{ formatDate(trackedOrder.created_at) }} · Customer: {{ trackedOrder.customer_name }}
            </p>
          </div>

          <div class="text-left sm:text-right text-xs">
            <span class="text-brand-muted uppercase text-[10px] block">Payment Method</span>
            <span class="font-semibold text-brand-charcoal uppercase">{{ trackedOrder.payment_method }}</span>
            <span
              class="block text-[10px] font-medium mt-0.5"
              :class="[trackedOrder.payment_status === 'paid' ? 'text-green-600' : 'text-brand-gold']"
            >
              Payment: {{ trackedOrder.payment_status.toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- 1. Main Order Visual Stepper -->
        <div class="border border-brand-border bg-brand-cream/30 p-6 sm:p-8">
          <h2 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal mb-6">
            Order Dispatch Lifecycle
          </h2>

          <div class="relative">
            <!-- Stepper Items -->
            <div class="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
              <div
                v-for="(st, idx) in orderStages"
                :key="st.key"
                class="flex flex-col items-center text-center space-y-2"
              >
                <!-- Icon Circle -->
                <div
                  class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                  :class="[
                    idx < getOrderStageIndex(trackedOrder.order_status)
                      ? 'bg-brand-charcoal text-white'
                      : idx === getOrderStageIndex(trackedOrder.order_status)
                        ? 'bg-brand-gold text-white ring-4 ring-brand-gold/20'
                        : 'bg-white border border-brand-border text-brand-muted/60'
                  ]"
                >
                  <span v-if="idx < getOrderStageIndex(trackedOrder.order_status)">✓</span>
                  <span v-else>{{ idx + 1 }}</span>
                </div>

                <!-- Label -->
                <span
                  class="text-[10px] uppercase tracking-wider leading-tight"
                  :class="[
                    idx <= getOrderStageIndex(trackedOrder.order_status)
                      ? 'font-bold text-brand-charcoal'
                      : 'text-brand-muted'
                  ]"
                >
                  {{ st.label }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 2. Courier Tracking Details (if assigned) -->
        <div
          v-if="trackedOrder.courier_name || trackedOrder.tracking_number"
          class="border border-brand-border bg-brand-cream p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div class="flex items-center space-x-4">
            <div class="w-10 h-10 rounded-full bg-brand-charcoal text-white flex items-center justify-center">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
            </div>
            <div>
              <span class="text-[10px] uppercase tracking-luxury text-brand-muted block">Courier Service</span>
              <span class="font-serif text-base font-bold text-brand-charcoal">
                {{ trackedOrder.courier_name || 'Designated Courier' }}
              </span>
              <p class="text-xs text-brand-muted mt-0.5 font-mono">
                Tracking #: <strong class="text-brand-charcoal">{{ trackedOrder.tracking_number }}</strong>
              </p>
            </div>
          </div>

          <div class="text-xs text-brand-muted max-w-xs">
            Shipment dispatched with real-time courier milestone updates.
          </div>
        </div>

        <!-- 3. Bespoke Stitching Progress Stepper (if stitching requests exist) -->
        <div
          v-if="trackedOrder.stitching_requests && trackedOrder.stitching_requests.length > 0"
          class="border border-brand-gold bg-brand-cream/40 p-6 sm:p-8 space-y-6"
        >
          <div class="flex items-center justify-between border-b border-brand-gold/30 pb-4">
            <div>
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-bold block">
                Atelier Workshop Status
              </span>
              <h3 class="font-serif text-lg font-bold text-brand-charcoal">
                Bespoke Tailoring Progress
              </h3>
            </div>
            <span class="text-xs uppercase tracking-wider text-brand-charcoal font-semibold bg-white border border-brand-border px-3 py-1">
              {{ trackedOrder.stitching_requests[0].status.replace(/_/g, ' ') }}
            </span>
          </div>

          <!-- Stitching Stages -->
          <div class="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div
              v-for="(st, idx) in stitchingStages"
              :key="st.key"
              class="flex flex-col items-center text-center space-y-2"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors"
                :class="[
                  idx < getStitchingStageIndex(trackedOrder.stitching_requests[0].status)
                    ? 'bg-brand-charcoal text-white'
                    : idx === getStitchingStageIndex(trackedOrder.stitching_requests[0].status)
                      ? 'bg-brand-gold text-white ring-4 ring-brand-gold/20'
                      : 'bg-white border border-brand-border text-brand-muted/60'
                ]"
              >
                <span v-if="idx < getStitchingStageIndex(trackedOrder.stitching_requests[0].status)">✓</span>
                <span v-else>{{ idx + 1 }}</span>
              </div>
              <span
                class="text-[10px] uppercase tracking-wider"
                :class="[
                  idx <= getStitchingStageIndex(trackedOrder.stitching_requests[0].status)
                    ? 'font-bold text-brand-charcoal'
                    : 'text-brand-muted'
                ]"
              >
                {{ st.label }}
              </span>
            </div>
          </div>

          <!-- Stitching Details Grid -->
          <div class="pt-4 border-t border-brand-gold/20 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div v-if="trackedOrder.stitching_requests[0].neck_style">
              <span class="text-[10px] uppercase text-brand-muted block">Neck Style</span>
              <span class="text-brand-charcoal font-medium">{{ trackedOrder.stitching_requests[0].neck_style }}</span>
            </div>
            <div v-if="trackedOrder.stitching_requests[0].sleeve_style">
              <span class="text-[10px] uppercase text-brand-muted block">Sleeve Cut</span>
              <span class="text-brand-charcoal font-medium">{{ trackedOrder.stitching_requests[0].sleeve_style }}</span>
            </div>
            <div v-if="trackedOrder.stitching_requests[0].trouser_style">
              <span class="text-[10px] uppercase text-brand-muted block">Trouser Cut</span>
              <span class="text-brand-charcoal font-medium">{{ trackedOrder.stitching_requests[0].trouser_style }}</span>
            </div>
          </div>
        </div>

        <!-- 4. Ordered Items Breakdown -->
        <div class="border border-brand-border bg-brand-white p-6 sm:p-8">
          <h3 class="font-serif text-base font-bold uppercase tracking-luxury text-brand-charcoal mb-4">
            Items in This Order
          </h3>

          <div class="divide-y divide-brand-border">
            <div
              v-for="item in trackedOrder.items"
              :key="item.id"
              class="py-3 flex items-center justify-between text-xs"
            >
              <div>
                <h4 class="font-serif font-bold text-brand-charcoal text-sm">
                  {{ item.product_name }}
                </h4>
                <div class="text-brand-muted text-[11px] space-x-3 mt-0.5">
                  <span v-if="item.size">Size: {{ item.size }}</span>
                  <span v-if="item.color">Color: {{ item.color }}</span>
                  <span>Quantity: {{ item.quantity }}</span>
                </div>
              </div>
              <div class="text-right">
                <span class="font-bold text-brand-charcoal text-sm">{{ formatPrice(item.total_price) }}</span>
                <span class="block text-[10px] text-brand-muted">({{ formatPrice(item.unit_price) }} each)</span>
              </div>
            </div>
          </div>

          <!-- Total Calculation -->
          <div class="pt-4 border-t border-brand-border mt-4 space-y-1.5 text-xs text-brand-muted max-w-xs ml-auto">
            <div class="flex justify-between">
              <span>Subtotal:</span>
              <span class="text-brand-charcoal font-medium">{{ formatPrice(trackedOrder.subtotal) }}</span>
            </div>
            <div class="flex justify-between">
              <span>Shipping:</span>
              <span class="text-brand-charcoal font-medium">{{ formatPrice(trackedOrder.shipping_fee) }}</span>
            </div>
            <div v-if="trackedOrder.discount_amount > 0" class="flex justify-between text-brand-gold">
              <span>Discount:</span>
              <span>-{{ formatPrice(trackedOrder.discount_amount) }}</span>
            </div>
            <div class="border-t border-brand-border pt-2 flex justify-between font-serif text-sm font-bold text-brand-charcoal">
              <span>Total Amount:</span>
              <span class="font-sans text-base">{{ formatPrice(trackedOrder.total_amount) }}</span>
            </div>
          </div>
        </div>

        <!-- WhatsApp Support Banner -->
        <div class="border border-brand-border bg-brand-cream/50 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 class="font-serif text-sm font-bold text-brand-charcoal">
              Need Help With Your Shipment?
            </h4>
            <p class="text-xs text-brand-muted">
              Connect directly with our atelier support team on WhatsApp for adjustments or expedited requests.
            </p>
          </div>
          <a
            :href="`https://wa.me/923001234567?text=Hello%20K.%20Fabrics%2C%20I%20have%20an%20inquiry%20regarding%20Order%20${trackedOrder.order_number}`"
            target="_blank"
            rel="noopener noreferrer"
            class="px-6 py-2.5 bg-[#25D366] text-white text-xs uppercase tracking-luxury font-medium hover:bg-[#20ba59] transition-colors flex items-center space-x-2 shrink-0 shadow"
          >
            <span>WhatsApp Atelier</span>
          </a>
        </div>
      </div>
    </div>
  </div>
</template>