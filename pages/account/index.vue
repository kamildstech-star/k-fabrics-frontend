<script setup lang="ts">
import { useAuthStore } from '~/stores/auth'
import { useCartStore } from '~/stores/cart'

definePageMeta({
  middleware: 'auth',
})

const auth = useAuthStore()
const cart = useCartStore()
const router = useRouter()

// Active tab
const activeTab = ref<'orders' | 'measurements' | 'addresses' | 'profile'>('orders')

// Formatters
const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ================= TAB 1: ORDERS =================
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const reorderMessage = ref('')

const fetchOrders = async () => {
  if (!auth.isAuthenticated) return
  ordersLoading.value = true
  try {
    const res = await auth.apiFetch<any>('/user/orders')
    orders.value = res.data || []
  } catch (e) {
    console.error('Failed to load orders', e)
  } finally {
    ordersLoading.value = false
  }
}

// Reorder only ready-to-wear variants still sold, at current catalog price.
const reordering = ref(false)
const customReorderLinks = ref<Array<{ name: string; slug: string }>>([])
const handleReorder = async (order: {
  items?: Array<{ product_id: number | null; variant_id: number | null; product_slug?: string | null; product_name: string; size: string | null; quantity: number; stitching_request?: { id?: number; request_type?: string } | null }>
  stitching_requests?: Array<{ request_type: string }>
}) => {
  if (reordering.value) return
  reordering.value = true
  customReorderLinks.value = []
  const messages: string[] = []

  try {
    let added = 0
    let unavailable = 0
    let custom = order.stitching_requests?.some(request => request.request_type === 'standalone_stitching') ?? false
    for (const item of order.items ?? []) {
      if (item.stitching_request?.id || item.size?.toLowerCase().startsWith('custom')) {
        custom = true
        if (item.product_slug && !customReorderLinks.value.some(link => link.slug === item.product_slug)) {
          customReorderLinks.value.push({ name: item.product_name, slug: item.product_slug })
        }
        continue
      }
      if (!item.product_id || !item.variant_id || !item.product_slug) {
        unavailable++
        continue
      }
      try {
        const { data: product } = await auth.apiFetch<{ data: {
          id: number; slug: string; name: string; base_price: number; sale_price: number | null; primary_image?: string
          variants: Array<{ id: number; size: string; color: string | null; stock_quantity: number; is_active: boolean; price_override: number | null }>
        } }>(`/products/${encodeURIComponent(item.product_slug)}`)
        const variant = product.variants.find(candidate => candidate.id === item.variant_id && candidate.is_active)
        if (product.id !== item.product_id || !variant || variant.size.toLowerCase().startsWith('custom')) {
          unavailable++
          continue
        }
        const inCart = cart.items.filter(line => line.variantId === variant.id)
          .reduce((quantity, line) => quantity + line.quantity, 0)
        const quantity = Math.min(item.quantity, Math.max(0, variant.stock_quantity - inCart))
        if (quantity < item.quantity) unavailable++
        if (quantity === 0) continue
        cart.addProduct({
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          slug: product.slug,
          size: variant.size,
          color: variant.color ?? undefined,
          price: variant.price_override ?? product.sale_price ?? product.base_price,
          image: product.primary_image,
          quantity,
        })
        added += quantity
      } catch {
        unavailable++
      }
    }
    if (added) messages.push(`Added ${added} ${added === 1 ? 'item' : 'items'} at current prices.`)
    if (unavailable) messages.push('Some items are no longer available in the original quantity or size.')
    if (custom) messages.push('Start a new fitting for custom items or a new stitching booking so you can confirm measurements.')
    reorderMessage.value = messages.join(' ') || 'There are no items available to reorder.'
  } finally {
    reordering.value = false
  }
}

// ================= TAB 2: MEASUREMENTS =================
const measurements = ref<any[]>([])
const measurementsLoading = ref(false)
const measurementModalOpen = ref(false)
const editingMeasurementId = ref<number | null>(null)
const measurementFormError = ref('')

const measurementForm = reactive({
  profile_name: '',
  unit: 'inches' as 'inches' | 'cm',
  shirt_length: null as number | null,
  shoulder: null as number | null,
  chest: null as number | null,
  waist: null as number | null,
  hips: null as number | null,
  sleeve_length: null as number | null,
  armhole: null as number | null,
  daman: null as number | null,
  neck_front: null as number | null,
  neck_back: null as number | null,
  trouser_length: null as number | null,
  trouser_waist: null as number | null,
  pancha: null as number | null,
  extra_notes: '',
})

const fetchMeasurements = async () => {
  if (!auth.isAuthenticated) return
  measurementsLoading.value = true
  try {
    const res = await auth.apiFetch<any>('/user/measurements')
    measurements.value = res.data || []
  } catch (e) {
    console.error('Failed to load measurements', e)
  } finally {
    measurementsLoading.value = false
  }
}

const openNewMeasurementModal = () => {
  editingMeasurementId.value = null
  measurementForm.profile_name = ''
  measurementForm.unit = 'inches'
  measurementForm.shirt_length = null
  measurementForm.shoulder = null
  measurementForm.chest = null
  measurementForm.waist = null
  measurementForm.hips = null
  measurementForm.sleeve_length = null
  measurementForm.armhole = null
  measurementForm.daman = null
  measurementForm.neck_front = null
  measurementForm.neck_back = null
  measurementForm.trouser_length = null
  measurementForm.trouser_waist = null
  measurementForm.pancha = null
  measurementForm.extra_notes = ''
  measurementFormError.value = ''
  measurementModalOpen.value = true
}

const editMeasurement = (m: any) => {
  editingMeasurementId.value = m.id
  measurementForm.profile_name = m.profile_name
  measurementForm.unit = m.unit || 'inches'
  measurementForm.shirt_length = m.shirt_length
  measurementForm.shoulder = m.shoulder
  measurementForm.chest = m.chest
  measurementForm.waist = m.waist
  measurementForm.hips = m.hips
  measurementForm.sleeve_length = m.sleeve_length
  measurementForm.armhole = m.armhole
  measurementForm.daman = m.daman
  measurementForm.neck_front = m.neck_front
  measurementForm.neck_back = m.neck_back
  measurementForm.trouser_length = m.trouser_length
  measurementForm.trouser_waist = m.trouser_waist
  measurementForm.pancha = m.pancha
  measurementForm.extra_notes = m.extra_notes || ''
  measurementFormError.value = ''
  measurementModalOpen.value = true
}

const saveMeasurement = async () => {
  if (!measurementForm.profile_name.trim()) {
    measurementFormError.value = 'Please provide a profile name.'
    return
  }

  measurementFormError.value = ''
  try {
    const endpoint = editingMeasurementId.value
      ? `/user/measurements/${editingMeasurementId.value}`
      : `/user/measurements`
    const method = editingMeasurementId.value ? 'PUT' : 'POST'

    await auth.apiFetch<any>(endpoint, {
      method,
      body: measurementForm,
    })

    measurementModalOpen.value = false
    await fetchMeasurements()
  } catch (err: any) {
    measurementFormError.value = err.data?.message || 'Failed to save measurement profile.'
  }
}

const deleteMeasurement = async (id: number) => {
  if (!confirm('Are you sure you want to delete this measurement profile?')) return
  try {
    await auth.apiFetch<any>(`/user/measurements/${id}`, {
      method: 'DELETE',
    })
    await fetchMeasurements()
  } catch (e) {
    console.error('Failed to delete measurement', e)
  }
}

// ================= TAB 3: ADDRESSES =================
const addresses = ref<any[]>([])
const addressesLoading = ref(false)
const addressModalOpen = ref(false)
const editingAddressId = ref<number | null>(null)
const addressFormError = ref('')

const addressForm = reactive({
  label: 'Home',
  recipient_name: '',
  phone: '',
  address: '',
  city: 'Lahore',
  is_default: false,
})

const fetchAddresses = async () => {
  if (!auth.isAuthenticated) return
  addressesLoading.value = true
  try {
    const res = await auth.apiFetch<any>('/user/addresses')
    addresses.value = res.data || []
  } catch (e) {
    console.error('Failed to load addresses', e)
  } finally {
    addressesLoading.value = false
  }
}

const openNewAddressModal = () => {
  editingAddressId.value = null
  addressForm.label = 'Home'
  addressForm.recipient_name = auth.user?.name || ''
  addressForm.phone = auth.user?.phone || ''
  addressForm.address = ''
  addressForm.city = 'Lahore'
  addressForm.is_default = addresses.value.length === 0
  addressFormError.value = ''
  addressModalOpen.value = true
}

const editAddress = (addr: any) => {
  editingAddressId.value = addr.id
  addressForm.label = addr.label
  addressForm.recipient_name = addr.recipient_name
  addressForm.phone = addr.phone
  addressForm.address = addr.address
  addressForm.city = addr.city
  addressForm.is_default = addr.is_default
  addressFormError.value = ''
  addressModalOpen.value = true
}

const saveAddress = async () => {
  if (!addressForm.recipient_name || !addressForm.phone || !addressForm.address) {
    addressFormError.value = 'Please fill in all required address fields.'
    return
  }

  addressFormError.value = ''
  try {
    const endpoint = editingAddressId.value
      ? `/user/addresses/${editingAddressId.value}`
      : `/user/addresses`
    const method = editingAddressId.value ? 'PUT' : 'POST'

    await auth.apiFetch<any>(endpoint, {
      method,
      body: addressForm,
    })

    addressModalOpen.value = false
    await fetchAddresses()
  } catch (err: any) {
    addressFormError.value = err.data?.message || 'Failed to save address.'
  }
}

const deleteAddress = async (id: number) => {
  if (!confirm('Are you sure you want to remove this address?')) return
  try {
    await auth.apiFetch<any>(`/user/addresses/${id}`, {
      method: 'DELETE',
    })
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to delete address', e)
  }
}

const setAsDefaultAddress = async (addr: any) => {
  try {
    await auth.apiFetch<any>(`/user/addresses/${addr.id}`, {
      method: 'PUT',
      body: { ...addr, is_default: true },
    })
    await fetchAddresses()
  } catch (e) {
    console.error('Failed to set default address', e)
  }
}

// Initial Data Fetch
onMounted(async () => {
  await auth.initAuth()
  if (auth.isAuthenticated) {
    fetchOrders()
    fetchMeasurements()
    fetchAddresses()
  }
})

// Logout Action
const logoutError = ref('')
const handleLogout = async () => {
  logoutError.value = ''
  try {
    await auth.logout()
    orders.value = []
    await router.push('/')
  } catch (error: unknown) {
    logoutError.value = (error as Error).message
  }
}
</script>

<template>
  <div v-if="!auth.isAuthenticated" class="min-h-screen py-10 text-center text-sm" role="status">Checking your session…</div>
  <div v-else class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Breadcrumbs -->
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted mb-8">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">My Account</span>
      </nav>

      <!-- Reorder Success Notice -->
      <Transition
        enter-active-class="transition duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="reorderMessage"
          class="mb-6 p-4 bg-brand-cream border border-brand-gold text-brand-charcoal text-xs flex items-center justify-between"
        >
          <div role="status">
            <p>{{ reorderMessage }}</p>
            <ul v-if="customReorderLinks.length" class="mt-2 space-y-1">
              <li v-for="product in customReorderLinks" :key="product.slug">
                <NuxtLink :to="`/products/${encodeURIComponent(product.slug)}`" class="underline">
                  Start a new fitting for {{ product.name }}
                </NuxtLink>
              </li>
            </ul>
          </div>
          <button
            class="text-[10px] uppercase tracking-luxury font-semibold underline"
            @click="cart.openCart()"
          >
            View Bag
          </button>
        </div>
      </Transition>

      <!-- Account Header Banner -->
      <div class="bg-brand-cream/60 border border-brand-border p-6 sm:p-8 mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span class="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold block mb-1">
            Client Atelier Profile
          </span>
          <h1 class="font-serif text-2xl sm:text-3xl font-bold text-brand-charcoal">
            Welcome, {{ auth.userName || 'Valued Client' }}
          </h1>
          <p class="text-xs text-brand-muted mt-0.5">
            {{ auth.userEmail }}
          </p>
        </div>

        <button
          class="px-5 py-2.5 border border-brand-border text-xs uppercase tracking-luxury text-brand-charcoal hover:bg-brand-charcoal hover:text-white transition-colors self-start sm:self-auto"
          @click="handleLogout"
        >
          Sign Out
        </button>
      </div>
      <p v-if="logoutError" role="alert" class="my-3 text-sm text-red-700">{{ logoutError }}</p>


      <!-- Dashboard Grid: Sidebar Navigation + Tab Content -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <!-- Sidebar Navigation (3 Cols) -->
        <aside class="lg:col-span-3 space-y-2">
          <button
            class="w-full text-left px-4 py-3 text-xs uppercase tracking-luxury font-semibold transition-colors flex items-center justify-between border"
            :class="[
              activeTab === 'orders'
                ? 'bg-brand-charcoal text-white border-brand-charcoal'
                : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal'
            ]"
            @click="activeTab = 'orders'"
          >
            <span>My Orders</span>
            <span v-if="orders.length > 0" class="text-[10px] font-bold">({{ orders.length }})</span>
          </button>

          <button
            class="w-full text-left px-4 py-3 text-xs uppercase tracking-luxury font-semibold transition-colors flex items-center justify-between border"
            :class="[
              activeTab === 'measurements'
                ? 'bg-brand-charcoal text-white border-brand-charcoal'
                : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal'
            ]"
            @click="activeTab = 'measurements'"
          >
            <span>Saved Measurements</span>
            <span v-if="measurements.length > 0" class="text-[10px] font-bold">({{ measurements.length }})</span>
          </button>

          <button
            class="w-full text-left px-4 py-3 text-xs uppercase tracking-luxury font-semibold transition-colors flex items-center justify-between border"
            :class="[
              activeTab === 'addresses'
                ? 'bg-brand-charcoal text-white border-brand-charcoal'
                : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal'
            ]"
            @click="activeTab = 'addresses'"
          >
            <span>Saved Addresses</span>
            <span v-if="addresses.length > 0" class="text-[10px] font-bold">({{ addresses.length }})</span>
          </button>

          <button
            class="w-full text-left px-4 py-3 text-xs uppercase tracking-luxury font-semibold transition-colors flex items-center justify-between border"
            :class="[
              activeTab === 'profile'
                ? 'bg-brand-charcoal text-white border-brand-charcoal'
                : 'bg-white text-brand-charcoal border-brand-border hover:border-brand-charcoal'
            ]"
            @click="activeTab = 'profile'"
          >
            <span>Profile Details</span>
          </button>
        </aside>

        <!-- Main Content Area (9 Cols) -->
        <section aria-label="Account details" class="min-w-0 lg:col-span-9">
          <!-- ================= TAB 1: MY ORDERS ================= -->
          <div v-if="activeTab === 'orders'" class="space-y-6">
            <div class="flex items-center justify-between border-b border-brand-border pb-4">
              <h2 class="font-serif text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
                Order History & Reorder
              </h2>
              <span class="text-xs text-brand-muted">
                {{ orders.length }} {{ orders.length === 1 ? 'order' : 'orders' }} placed
              </span>
            </div>

            <div v-if="ordersLoading" class="space-y-4">
              <div v-for="i in 2" :key="i" class="h-44 bg-brand-cream/50 border border-brand-border animate-pulse" />
            </div>

            <!-- Empty Orders State -->
            <div
              v-else-if="orders.length === 0"
              class="text-center py-16 border border-brand-border bg-brand-cream/20 p-8"
            >
              <div class="w-12 h-12 mx-auto text-brand-muted/40 mb-3">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 class="font-serif text-lg font-bold text-brand-charcoal mb-1">No Orders Yet</h3>
              <p class="text-xs text-brand-muted mb-6">Discover our ready-to-wear collections or book custom bespoke tailoring.</p>
              <NuxtLink
                to="/shop"
                class="inline-block px-6 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
              >
                Shop Now
              </NuxtLink>
            </div>

            <!-- Order Cards List -->
            <div v-else class="space-y-6">
              <div
                v-for="order in orders"
                :key="order.id"
                class="border border-brand-border bg-white shadow-sm"
              >
                <!-- Card Header -->
                <div class="bg-brand-cream/50 p-4 sm:p-5 border-b border-brand-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div class="flex items-center space-x-3">
                      <span class="font-serif text-lg font-bold text-brand-charcoal">
                        {{ order.order_number }}
                      </span>
                      <span
                        class="px-2 py-0.5 text-[9px] uppercase tracking-wider font-semibold border"
                        :class="[
                          order.order_status === 'delivered'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : 'bg-brand-gold/10 text-brand-gold border-brand-gold/30'
                        ]"
                      >
                        {{ order.order_status.replace(/_/g, ' ') }}
                      </span>
                    </div>
                    <p class="text-[11px] text-brand-muted mt-0.5">
                      Placed on {{ formatDate(order.created_at) }} · Total: <strong class="text-brand-charcoal font-semibold">{{ formatPrice(order.total_amount) }}</strong>
                    </p>
                    <p v-if="order.tracking_number" class="text-xs text-brand-charcoal mt-1">
                      <span v-if="order.courier_name">{{ order.courier_name }} · </span>Tracking: {{ order.tracking_number }}
                    </p>
                  </div>

                  <div class="flex items-center space-x-3">
                    <NuxtLink
                      v-if="order.order_status === 'delivered'"
                      to="/policies/returns#request"
                      class="px-3 py-2 border border-brand-border text-sm"
                    >Return or exchange</NuxtLink>
                    <button
                      class="px-4 py-2 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors shadow-sm"
                      title="Add available ready-to-wear items at current prices"
                      :disabled="reordering"
                      @click="handleReorder(order)"
                    >
                      Reorder
                    </button>
                  </div>
                </div>

                <!-- Items in this Order -->
                <div class="p-4 sm:p-5 divide-y divide-brand-border/60">
                  <div
                    v-for="item in order.items"
                    :key="item.id"
                    class="py-3 flex items-center justify-between first:pt-0 last:pb-0 text-xs"
                  >
                    <div>
                      <h4 class="font-serif font-bold text-brand-charcoal">
                        {{ item.product_name }}
                      </h4>
                      <p class="text-[11px] text-brand-muted mt-0.5 space-x-2">
                        <span v-if="item.size">Size: {{ item.size }}</span>
                        <span v-if="item.color">Color: {{ item.color }}</span>
                        <span>Qty: {{ item.quantity }}</span>
                      </p>
                    </div>
                    <span class="font-bold text-brand-charcoal">
                      {{ formatPrice(item.total_price) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 2: SAVED MEASUREMENTS ================= -->
          <div v-else-if="activeTab === 'measurements'" class="space-y-6">
            <div class="flex items-center justify-between border-b border-brand-border pb-4">
              <div>
                <h2 class="font-serif text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
                  Measurement Profiles
                </h2>
                <p class="text-xs text-brand-muted">Reusable custom tailoring profiles for instant fitting</p>
              </div>

              <button
                class="px-5 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors shadow-sm"
                @click="openNewMeasurementModal"
              >
                + Add Profile
              </button>
            </div>

            <div v-if="measurementsLoading" class="space-y-4">
              <div v-for="i in 2" :key="i" class="h-36 bg-brand-cream/50 border border-brand-border animate-pulse" />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="measurements.length === 0"
              class="text-center py-16 border border-brand-border bg-brand-cream/20 p-8"
            >
              <h3 class="font-serif text-lg font-bold text-brand-charcoal mb-1">No Saved Measurements</h3>
              <p class="text-xs text-brand-muted mb-6">Create a measurement profile once and reuse it across all custom stitching orders.</p>
              <button
                class="px-6 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
                @click="openNewMeasurementModal"
              >
                + Create Measurement Profile
              </button>
            </div>

            <!-- Measurements Cards -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                v-for="m in measurements"
                :key="m.id"
                class="border border-brand-border bg-white p-6 relative flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div class="flex items-start justify-between mb-4 border-b border-brand-border/60 pb-3">
                    <div>
                      <h3 class="font-serif text-base font-bold text-brand-charcoal">
                        {{ m.profile_name }}
                      </h3>
                      <span class="text-[10px] uppercase tracking-wider text-brand-gold font-semibold">
                        Unit: {{ m.unit || 'inches' }}
                      </span>
                    </div>

                    <div class="flex items-center space-x-2">
                      <button
                        class="text-xs text-brand-muted hover:text-brand-charcoal underline"
                        @click="editMeasurement(m)"
                      >
                        Edit
                      </button>
                      <button
                        class="text-xs text-red-600 hover:underline"
                        @click="deleteMeasurement(m.id)"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <!-- Grid of specs -->
                  <div class="grid grid-cols-3 gap-2.5 text-[11px] mb-4">
                    <div v-if="m.shirt_length"><span class="text-brand-muted">Length:</span> {{ m.shirt_length }}</div>
                    <div v-if="m.shoulder"><span class="text-brand-muted">Shoulder:</span> {{ m.shoulder }}</div>
                    <div v-if="m.chest"><span class="text-brand-muted">Chest:</span> {{ m.chest }}</div>
                    <div v-if="m.waist"><span class="text-brand-muted">Waist:</span> {{ m.waist }}</div>
                    <div v-if="m.hips"><span class="text-brand-muted">Hips:</span> {{ m.hips }}</div>
                    <div v-if="m.sleeve_length"><span class="text-brand-muted">Sleeve:</span> {{ m.sleeve_length }}</div>
                    <div v-if="m.trouser_length"><span class="text-brand-muted">Trouser:</span> {{ m.trouser_length }}</div>
                    <div v-if="m.pancha"><span class="text-brand-muted">Pancha:</span> {{ m.pancha }}</div>
                  </div>

                  <p v-if="m.extra_notes" class="text-[11px] text-brand-muted italic bg-brand-cream/60 p-2 border border-brand-border/40">
                    "{{ m.extra_notes }}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 3: SAVED ADDRESSES ================= -->
          <div v-else-if="activeTab === 'addresses'" class="space-y-6">
            <div class="flex items-center justify-between border-b border-brand-border pb-4">
              <div>
                <h2 class="font-serif text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
                  Delivery Addresses
                </h2>
                <p class="text-xs text-brand-muted">Save your delivery locations for swift one-step checkout</p>
              </div>

              <button
                class="px-5 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors shadow-sm"
                @click="openNewAddressModal"
              >
                + Add Address
              </button>
            </div>

            <div v-if="addressesLoading" class="space-y-4">
              <div v-for="i in 2" :key="i" class="h-32 bg-brand-cream/50 border border-brand-border animate-pulse" />
            </div>

            <!-- Empty State -->
            <div
              v-else-if="addresses.length === 0"
              class="text-center py-16 border border-brand-border bg-brand-cream/20 p-8"
            >
              <h3 class="font-serif text-lg font-bold text-brand-charcoal mb-1">No Saved Addresses</h3>
              <p class="text-xs text-brand-muted mb-6">Add a home or office address to speed up your future orders.</p>
              <button
                class="px-6 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
                @click="openNewAddressModal"
              >
                + Add New Address
              </button>
            </div>

            <!-- Address Cards Grid -->
            <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                v-for="addr in addresses"
                :key="addr.id"
                class="border p-6 bg-white flex flex-col justify-between shadow-sm"
                :class="[addr.is_default ? 'border-brand-charcoal ring-1 ring-brand-charcoal' : 'border-brand-border']"
              >
                <div>
                  <div class="flex items-center justify-between mb-3 border-b border-brand-border/60 pb-2">
                    <span class="font-serif font-bold text-sm text-brand-charcoal uppercase tracking-wider">
                      {{ addr.label }}
                    </span>
                    <span
                      v-if="addr.is_default"
                      class="text-[9px] uppercase tracking-wider font-semibold bg-brand-gold text-white px-2 py-0.5"
                    >
                      Default
                    </span>
                  </div>

                  <p class="text-xs font-semibold text-brand-charcoal mb-1">{{ addr.recipient_name }}</p>
                  <p class="text-xs text-brand-muted leading-relaxed mb-2">{{ addr.address }}, {{ addr.city }}</p>
                  <p class="text-xs text-brand-muted font-mono">Phone: {{ addr.phone }}</p>
                </div>

                <div class="pt-4 mt-4 border-t border-brand-border/60 flex items-center justify-between text-xs">
                  <button
                    v-if="!addr.is_default"
                    class="text-[11px] text-brand-gold hover:underline font-medium"
                    @click="setAsDefaultAddress(addr)"
                  >
                    Set as Default
                  </button>
                  <div v-else class="text-[11px] text-brand-muted">Primary Address</div>

                  <div class="flex items-center space-x-3">
                    <button class="hover:underline text-brand-charcoal" @click="editAddress(addr)">Edit</button>
                    <button class="text-red-600 hover:underline" @click="deleteAddress(addr.id)">Delete</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ================= TAB 4: PROFILE DETAILS ================= -->
          <div v-else-if="activeTab === 'profile'" class="space-y-6">
            <div class="border-b border-brand-border pb-4">
              <h2 class="font-serif text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
                Account Information
              </h2>
              <p class="text-xs text-brand-muted">Your registered details at K. Fabrics Atelier</p>
            </div>

            <div class="border border-brand-border bg-white p-6 sm:p-8 space-y-4 max-w-xl text-xs">
              <div class="grid grid-cols-2 gap-4 pb-4 border-b border-brand-border/60">
                <div>
                  <span class="text-brand-muted uppercase text-[10px] block">Full Name</span>
                  <span class="font-bold text-brand-charcoal text-sm">{{ auth.userName }}</span>
                </div>
                <div>
                  <span class="text-brand-muted uppercase text-[10px] block">Email Address</span>
                  <span class="font-medium text-brand-charcoal">{{ auth.userEmail }}</span>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4 pb-4 border-b border-brand-border/60">
                <div>
                  <span class="text-brand-muted uppercase text-[10px] block">Phone Number</span>
                  <span class="font-medium text-brand-charcoal">{{ auth.user?.phone || 'Not provided' }}</span>
                </div>
                <div>
                  <span class="text-brand-muted uppercase text-[10px] block">Account Status</span>
                  <span class="text-brand-gold font-semibold uppercase">Verified Client</span>
                </div>
              </div>

              <div class="pt-2">
                <button
                  class="px-6 py-3 border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white text-xs uppercase tracking-luxury font-medium transition-colors"
                  @click="handleLogout"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- ================= MEASUREMENT MODAL ================= -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="measurementModalOpen"
        class="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
        @click="measurementModalOpen = false"
      >
        <div
          class="bg-brand-white max-w-2xl w-full border border-brand-border p-6 sm:p-8 shadow-2xl relative my-8"
          @click.stop
        >
          <button
            class="absolute top-4 right-4 text-brand-charcoal hover:text-brand-gold p-1"
            aria-label="Close modal"
            @click="measurementModalOpen = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="font-serif text-xl sm:text-2xl font-bold text-brand-charcoal mb-1">
            {{ editingMeasurementId ? 'Edit Measurement Profile' : 'New Measurement Profile' }}
          </h2>
          <p class="text-xs text-brand-muted mb-6">Enter specifications in {{ measurementForm.unit }}</p>

          <div v-if="measurementFormError" class="p-3 bg-red-50 text-red-700 text-xs mb-4">
            {{ measurementFormError }}
          </div>

          <form class="space-y-4" @submit.prevent="saveMeasurement">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Profile Name *</label>
                <input
                  v-model="measurementForm.profile_name"
                  type="text"
                  required
                  placeholder="e.g. Standard Lawn Fit"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>

              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Scale Unit</label>
                <div class="flex border border-brand-border bg-white text-xs h-[38px]">
                  <button
                    type="button"
                    class="flex-1 font-medium transition-colors"
                    :class="[measurementForm.unit === 'inches' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal']"
                    @click="measurementForm.unit = 'inches'"
                  >
                    Inches
                  </button>
                  <button
                    type="button"
                    class="flex-1 font-medium transition-colors"
                    :class="[measurementForm.unit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal']"
                    @click="measurementForm.unit = 'cm'"
                  >
                    CM
                  </button>
                </div>
              </div>
            </div>

            <!-- Shirt fields -->
            <div class="pt-2">
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-bold block mb-2">Shirt / Kameez</span>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="text-[10px] text-brand-muted block">Length</label>
                  <input v-model.number="measurementForm.shirt_length" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Shoulder</label>
                  <input v-model.number="measurementForm.shoulder" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Chest / Bust</label>
                  <input v-model.number="measurementForm.chest" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Waist</label>
                  <input v-model.number="measurementForm.waist" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Hips</label>
                  <input v-model.number="measurementForm.hips" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Sleeve Length</label>
                  <input v-model.number="measurementForm.sleeve_length" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
              </div>
            </div>

            <!-- Trouser fields -->
            <div class="pt-2">
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-bold block mb-2">Trouser / Shalwar</span>
              <div class="grid grid-cols-3 gap-3">
                <div>
                  <label class="text-[10px] text-brand-muted block">Length</label>
                  <input v-model.number="measurementForm.trouser_length" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Waist</label>
                  <input v-model.number="measurementForm.trouser_waist" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
                <div>
                  <label class="text-[10px] text-brand-muted block">Pancha</label>
                  <input v-model.number="measurementForm.pancha" type="number" step="0.5" class="w-full border border-brand-border p-1.5 text-xs">
                </div>
              </div>
            </div>

            <!-- Extra Notes -->
            <div>
              <label class="text-[10px] uppercase text-brand-muted block mb-1">Fitting Notes / Preferences</label>
              <textarea v-model="measurementForm.extra_notes" rows="2" placeholder="e.g. Keep shoulder loose, add lace to sleeves..." class="w-full border border-brand-border p-2 text-xs" />
            </div>

            <div class="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                class="px-5 py-2.5 border border-brand-border text-xs uppercase"
                @click="measurementModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ================= ADDRESS MODAL ================= -->
    <Transition
      enter-active-class="transition-opacity duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="addressModalOpen"
        class="fixed inset-0 bg-brand-charcoal/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        @click="addressModalOpen = false"
      >
        <div
          class="bg-brand-white max-w-lg w-full border border-brand-border p-6 sm:p-8 shadow-2xl relative"
          @click.stop
        >
          <button
            class="absolute top-4 right-4 text-brand-charcoal hover:text-brand-gold p-1"
            aria-label="Close modal"
            @click="addressModalOpen = false"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <h2 class="font-serif text-xl sm:text-2xl font-bold text-brand-charcoal mb-1">
            {{ editingAddressId ? 'Edit Address' : 'Add Delivery Address' }}
          </h2>
          <p class="text-xs text-brand-muted mb-6">Saved addresses appear directly at checkout</p>

          <div v-if="addressFormError" class="p-3 bg-red-50 text-red-700 text-xs mb-4">
            {{ addressFormError }}
          </div>

          <form class="space-y-4" @submit.prevent="saveAddress">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Label</label>
                <input
                  v-model="addressForm.label"
                  type="text"
                  placeholder="Home, Office, Studio..."
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>

              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Recipient Name *</label>
                <input
                  v-model="addressForm.recipient_name"
                  type="text"
                  required
                  placeholder="Full Name"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Phone Number *</label>
                <input
                  v-model="addressForm.phone"
                  type="tel"
                  required
                  placeholder="0300 1234567"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>

              <div>
                <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">City *</label>
                <input
                  v-model="addressForm.city"
                  type="text"
                  required
                  placeholder="Lahore, Karachi..."
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>

            <div>
              <label class="text-[10px] uppercase text-brand-charcoal font-semibold block mb-1">Street Address *</label>
              <textarea
                v-model="addressForm.address"
                rows="2"
                required
                placeholder="House #, Street, Block, Area..."
                class="w-full bg-white border border-brand-border p-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              />
            </div>

            <div class="flex items-center space-x-2 pt-1">
              <input
                id="default-address-cb"
                v-model="addressForm.is_default"
                type="checkbox"
                class="h-4 w-4 accent-brand-charcoal"
              >
              <label for="default-address-cb" class="text-xs text-brand-charcoal cursor-pointer">
                Set as my default shipping address
              </label>
            </div>

            <div class="pt-4 flex justify-end space-x-3">
              <button
                type="button"
                class="px-5 py-2.5 border border-brand-border text-xs uppercase"
                @click="addressModalOpen = false"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="px-6 py-2.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold"
              >
                Save Address
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>
