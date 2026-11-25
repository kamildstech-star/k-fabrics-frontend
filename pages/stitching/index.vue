<script setup lang="ts">
import { useCartStore, type CustomFittingMeasurements } from '~/stores/cart'
import { useAuthStore } from '~/stores/auth'
import { convertMeasurements, hasNumericMeasurements, measurementPayload } from '~/utils/checkout'

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

const router = useRouter()
const cart = useCartStore()
const auth = useAuthStore()

const savedProfiles = ref<any[]>([])
const selectedSavedProfileId = ref<number | null>(null)

onMounted(async () => {
  await auth.initAuth()
  if (auth.isAuthenticated) {
    try {
      const res = await auth.apiFetch<{ data: any[] }>('/user/measurements')
      savedProfiles.value = res.data || []
    } catch (e) {
      // ignore
    }
  }
})

const applySavedProfile = (profileId: number) => {
  const profile = savedProfiles.value.find(p => p.id === profileId)
  if (!profile) return
  measurementUnit.value = profile.unit || 'inches'
  manualMeasurements.unit = profile.unit || 'inches'
  manualMeasurements.shirt_length = profile.shirt_length
  manualMeasurements.shoulder = profile.shoulder
  manualMeasurements.chest = profile.chest
  manualMeasurements.waist = profile.waist
  manualMeasurements.hips = profile.hips
  manualMeasurements.sleeve_length = profile.sleeve_length
  manualMeasurements.armhole = profile.armhole
  manualMeasurements.daman = profile.daman
  manualMeasurements.neck_front = profile.neck_front
  manualMeasurements.neck_back = profile.neck_back
  manualMeasurements.trouser_length = profile.trouser_length
  manualMeasurements.trouser_waist = profile.trouser_waist
  manualMeasurements.pancha = profile.pancha
  if (profile.extra_notes) specialInstructions.value = profile.extra_notes
}

// Fetch active stitching services from backend API
const { data: servicesResponse, pending: servicesPending } = await useFetch<any>(
  `${apiBase}/stitching-services`,
  { lazy: false }
)

const services = computed(() => servicesResponse.value?.data || [])

// Wizard Step (1, 2, or 3)
const currentStep = ref(1)

// Step 1: Service & Styling State
const selectedServiceId = ref<number | null>(null)
const selectedServiceName = ref('')
const selectedServicePrice = ref(0)
const selectedServiceDays = ref(7)

// Preselect first service when loaded
watch(
  services,
  (list) => {
    if (list?.length && !selectedServiceId.value) {
      selectedServiceId.value = list[0].id
      selectedServiceName.value = list[0].name
      selectedServicePrice.value = list[0].base_price
      selectedServiceDays.value = list[0].estimated_days
    }
  },
  { immediate: true }
)

const selectService = (service: any) => {
  selectedServiceId.value = service.id
  selectedServiceName.value = service.name
  selectedServicePrice.value = service.base_price
  selectedServiceDays.value = service.estimated_days
}

// Styling options
const neckStyles = [
  'Round Neck with Slit',
  'Boat Neck',
  'V-Neck with Delicate Lace',
  'Mandarin / Ban Collar',
  'Overlap Angrakha Neck',
  'Plain Classic Round',
]

const sleeveStyles = [
  'Full Straight Sleeves',
  'Bell Sleeves with Organza Finishing',
  'Cuffed Sleeves with Fabric Buttons',
  'Quarter (3/4) Sleeves',
  'Loose Cut with Border Lace',
]

const trouserStyles = [
  'Straight Cigarette Pants',
  'Culottes / Relaxed Capri',
  'Classic Pleated Shalwar',
  'Flared Trousers',
  'Bell Bottoms with Pintucks',
]

const neckStyle = ref(neckStyles[0])
const sleeveStyle = ref(sleeveStyles[0])
const trouserStyle = ref(trouserStyles[0])
const specialInstructions = ref('')

// Image upload state
const designReferencePreview = ref<string | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const referenceError = ref('')
let referenceRead = 0

const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return
  const read = ++referenceRead
  referenceError.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    referenceError.value = 'Choose a JPEG, PNG or WebP image up to 5 MB.'
    target.value = ''
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    if (read === referenceRead && typeof reader.result === 'string') designReferencePreview.value = reader.result
  }
  reader.onerror = () => {
    if (read === referenceRead) referenceError.value = 'Could not read this image. Try another file.'
  }
  reader.readAsDataURL(file)
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const removeReferenceImage = () => {
  ++referenceRead
  referenceError.value = ''
  designReferencePreview.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

// Step 2: Measurements State
const measurementMode = ref<'manual' | 'sample'>('manual')
const measurementUnit = ref<'inches' | 'cm'>('inches')

const manualMeasurements = reactive<CustomFittingMeasurements>({
  unit: 'inches',
  shirt_length: null,
  shoulder: null,
  chest: null,
  waist: null,
  hips: null,
  sleeve_length: null,
  armhole: null,
  daman: null,
  neck_front: null,
  neck_back: null,
  trouser_length: null,
  trouser_waist: null,
  pancha: null,
})

watch(measurementUnit, unit => convertMeasurements(manualMeasurements, unit), { flush: 'sync' })

// Step 3: Fabric Handover Method
const fabricDeliveryMethod = 'courier_by_customer'

// Validation before step transition
const step1Valid = computed(() => selectedServiceId.value !== null)
const measurementError = ref('')
const checkMeasurements = () => {
  measurementError.value = ''
  if (measurementMode.value === 'sample') return true
  try {
    const details = measurementPayload(manualMeasurements)
    if (!details || !hasNumericMeasurements(details)) throw new Error('Enter a measurement, or choose to send a sample garment instead.')
    return true
  } catch (error) {
    measurementError.value = error instanceof Error ? error.message : 'Check the measurements you entered.'
    return false
  }
}

const goToStep = (step: number) => {
  if (step === 2 && !step1Valid.value) return
  if (step === 3 && !checkMeasurements()) return
  currentStep.value = step
  if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

// Formatting
const formatPrice = (val: number) => 'Rs. ' + Number(val).toLocaleString('en-PK')

// Finish Booking & Add to Bag
const finalizeBooking = (proceedToCheckout = false) => {
  if (!selectedServiceId.value || !checkMeasurements()) return

  const measurementsPayload: CustomFittingMeasurements | null =
    measurementMode.value === 'manual'
      ? {
          ...manualMeasurements,
        }
      : null

  cart.addStitchingService({
    serviceId: selectedServiceId.value,
    serviceName: selectedServiceName.value,
    price: selectedServicePrice.value,
    estimatedDays: selectedServiceDays.value,
    fabricDeliveryMethod,
    designReferenceImage: designReferencePreview.value,
    neckStyle: neckStyle.value,
    sleeveStyle: sleeveStyle.value,
    trouserStyle: trouserStyle.value,
    specialInstructions:
      measurementMode.value === 'sample'
        ? `[SENDING SAMPLE SUIT] ${specialInstructions.value}`.trim()
        : specialInstructions.value,
    measurements: measurementsPayload,
  })

  if (proceedToCheckout) {
    cart.closeCart()
    router.push('/checkout')
  }
}
</script>

<template>
  <div class="bg-brand-white min-h-screen py-10 sm:py-16">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Title Header -->
      <div class="text-center max-w-xl mx-auto mb-10">
        <span class="text-[10px] uppercase tracking-[0.3em] text-brand-gold font-semibold block mb-2">
          Atelier Bespoke Service
        </span>
        <h1 class="font-serif text-3xl sm:text-5xl font-bold text-brand-charcoal">
          Bespoke Stitching Atelier
        </h1>
        <p class="text-xs text-brand-muted mt-2 font-light leading-relaxed">
          Send your unstitched lawn, linen, or luxury silk from any brand. Our master tailors craft garments to your precise measurements.
        </p>
      </div>

      <!-- 3-Step Luxury Progress Stepper -->
      <div class="mb-12">
        <div class="flex items-center justify-between max-w-xl mx-auto mb-3">
          <!-- Step 1 -->
          <div class="flex items-center space-x-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
              :class="[
                currentStep >= 1 ? 'bg-brand-charcoal text-white' : 'bg-brand-cream border border-brand-border text-brand-muted'
              ]"
            >
              1
            </div>
            <span
              class="text-xs uppercase tracking-luxury hidden sm:inline"
              :class="[currentStep === 1 ? 'font-bold text-brand-charcoal' : 'text-brand-muted']"
            >
              Service & Design
            </span>
          </div>

          <!-- Divider 1-2 -->
          <div class="flex-1 mx-4 h-0.5 transition-colors" :class="[currentStep >= 2 ? 'bg-brand-gold' : 'bg-brand-border']" />

          <!-- Step 2 -->
          <div class="flex items-center space-x-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
              :class="[
                currentStep >= 2 ? 'bg-brand-charcoal text-white' : 'bg-brand-cream border border-brand-border text-brand-muted'
              ]"
            >
              2
            </div>
            <span
              class="text-xs uppercase tracking-luxury hidden sm:inline"
              :class="[currentStep === 2 ? 'font-bold text-brand-charcoal' : 'text-brand-muted']"
            >
              Measurements
            </span>
          </div>

          <!-- Divider 2-3 -->
          <div class="flex-1 mx-4 h-0.5 transition-colors" :class="[currentStep >= 3 ? 'bg-brand-gold' : 'bg-brand-border']" />

          <!-- Step 3 -->
          <div class="flex items-center space-x-2">
            <div
              class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors"
              :class="[
                currentStep >= 3 ? 'bg-brand-charcoal text-white' : 'bg-brand-cream border border-brand-border text-brand-muted'
              ]"
            >
              3
            </div>
            <span
              class="text-xs uppercase tracking-luxury hidden sm:inline"
              :class="[currentStep === 3 ? 'font-bold text-brand-charcoal' : 'text-brand-muted']"
            >
              Handover & Review
            </span>
          </div>
        </div>

        <!-- Gold Progress Bar Line -->
        <div class="w-full bg-brand-border h-1 overflow-hidden max-w-xl mx-auto">
          <div
            class="bg-brand-gold h-full transition-all duration-300"
            :style="{ width: currentStep === 1 ? '33.3%' : currentStep === 2 ? '66.6%' : '100%' }"
          />
        </div>
      </div>

      <!-- ================= STEP 1: SERVICE & STYLING ================= -->
      <div v-if="currentStep === 1" class="space-y-10">
        <!-- Service Selection Cards -->
        <div>
          <h2 class="font-serif text-lg sm:text-xl font-bold uppercase tracking-luxury text-brand-charcoal mb-4">
            1. Select Stitching Package
          </h2>

          <div v-if="servicesPending" class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div v-for="i in 3" :key="i" class="h-44 bg-brand-cream/60 border border-brand-border animate-pulse" />
          </div>

          <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              v-for="service in services"
              :key="service.id"
              class="border p-5 cursor-pointer transition-all duration-200 relative flex flex-col justify-between"
              :class="[
                selectedServiceId === service.id
                  ? 'border-brand-charcoal bg-brand-cream/70 ring-1 ring-brand-charcoal shadow-sm'
                  : 'border-brand-border bg-white hover:border-brand-charcoal/40'
              ]"
              @click="selectService(service)"
            >
              <div>
                <div class="flex items-start justify-between mb-2">
                  <h3 class="font-serif text-base font-bold text-brand-charcoal leading-snug">
                    {{ service.name }}
                  </h3>
                  <span
                    v-if="selectedServiceId === service.id"
                    class="w-5 h-5 rounded-full bg-brand-charcoal text-white text-[10px] flex items-center justify-center shrink-0 ml-2"
                  >
                    ✓
                  </span>
                </div>
                <p class="text-xs text-brand-muted leading-relaxed mb-4">
                  {{ service.description }}
                </p>
              </div>

              <div class="pt-3 border-t border-brand-border/60 flex items-baseline justify-between">
                <div>
                  <span class="text-[10px] uppercase tracking-wider text-brand-muted block">Fee</span>
                  <span class="font-serif text-lg font-bold text-brand-charcoal">
                    {{ formatPrice(service.base_price) }}
                  </span>
                </div>
                <span class="text-[10px] uppercase tracking-wider text-brand-gold font-medium">
                  ~{{ service.estimated_days }} Working Days
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Design Reference Image Upload -->
        <div class="border-t border-brand-border pt-8">
          <div class="flex items-center justify-between mb-2">
            <h2 class="font-serif text-lg sm:text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
              2. Design Reference Photo (Optional)
            </h2>
            <span class="text-[10px] uppercase text-brand-muted">JPEG, PNG, WebP</span>
          </div>
          <p class="text-xs text-brand-muted mb-4 font-light">
            Upload a picture from Instagram, Pinterest, or catalogue showing how you would like your sleeves, neck, or silhouette styled.
          </p>

          <input
            ref="fileInputRef"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="hidden"
            @change="handleFileUpload"
          >

          <button
            v-if="!designReferencePreview"
            type="button"
            class="w-full border-2 border-dashed border-brand-border hover:border-brand-gold bg-brand-cream/30 p-8 text-center cursor-pointer transition-colors"
            @click="triggerFileInput"
          >
            <div class="w-10 h-10 mx-auto text-brand-gold mb-2">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-xs font-medium text-brand-charcoal uppercase tracking-luxury">
              Click to upload design reference image
            </p>
            <p class="text-[10px] text-brand-muted mt-1">
              JPEG, PNG or WebP up to 5 MB. Not saved if you reload this page.
            </p>
          </button>

          <div v-else class="relative w-48 aspect-[3/4] border border-brand-border overflow-hidden bg-brand-cream">
            <img
              :src="designReferencePreview"
              alt="Design reference"
              class="w-full h-full object-cover"
            >
            <button
              class="absolute top-2 right-2 p-1 bg-brand-charcoal/80 text-white hover:bg-red-600 transition-colors"
              aria-label="Remove design reference image"
              type="button"
              @click="removeReferenceImage"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p v-if="referenceError" role="alert" class="mt-2 text-xs text-red-800">{{ referenceError }}</p>
        </div>

        <!-- Neck, Sleeve & Trouser Cut Selectors -->
        <div class="border-t border-brand-border pt-8 space-y-6">
          <h2 class="font-serif text-lg sm:text-xl font-bold uppercase tracking-luxury text-brand-charcoal">
            3. Style Preferences
          </h2>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Neckline -->
            <div>
              <label class="text-xs uppercase tracking-luxury text-brand-charcoal font-semibold block mb-2">
                Neckline Style
              </label>
              <select
                v-model="neckStyle"
                class="w-full bg-white border border-brand-border px-3 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              >
                <option v-for="opt in neckStyles" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>

            <!-- Sleeve Style -->
            <div>
              <label class="text-xs uppercase tracking-luxury text-brand-charcoal font-semibold block mb-2">
                Sleeve Styling
              </label>
              <select
                v-model="sleeveStyle"
                class="w-full bg-white border border-brand-border px-3 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              >
                <option v-for="opt in sleeveStyles" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>

            <!-- Trouser Style -->
            <div>
              <label class="text-xs uppercase tracking-luxury text-brand-charcoal font-semibold block mb-2">
                Trouser Cut
              </label>
              <select
                v-model="trouserStyle"
                class="w-full bg-white border border-brand-border px-3 py-2.5 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
              >
                <option v-for="opt in trouserStyles" :key="opt" :value="opt">
                  {{ opt }}
                </option>
              </select>
            </div>
          </div>

          <!-- Special Tailor Instructions -->
          <div>
            <label class="text-xs uppercase tracking-luxury text-brand-charcoal font-semibold block mb-2">
              Tailor Instructions & Custom Details
            </label>
            <textarea
              v-model="specialInstructions"
              maxlength="930"
              rows="3"
              placeholder="e.g. Include contrast piping on neckline, add loops with fabric buttons, double lining for trousers..."
              class="w-full bg-white border border-brand-border p-3 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
            />
          </div>
        </div>

        <!-- Navigation Buttons -->
        <div class="pt-6 border-t border-brand-border flex justify-end">
          <button
            class="px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors flex items-center space-x-2"
            @click="goToStep(2)"
          >
            <span>Proceed to Measurements</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- ================= STEP 2: MEASUREMENTS ================= -->
      <div v-else-if="currentStep === 2" class="space-y-8">
        <!-- Tabs for Mode: Enter Measurements vs Send Sample Suit -->
        <div class="flex border-b border-brand-border">
          <button
            class="pb-3 px-6 text-xs uppercase tracking-luxury font-semibold transition-colors border-b-2"
            :class="[
              measurementMode === 'manual'
                ? 'border-brand-charcoal text-brand-charcoal'
                : 'border-transparent text-brand-muted hover:text-brand-charcoal'
            ]"
            @click="measurementMode = 'manual'"
          >
            Enter Measurements Online
          </button>
          <button
            class="pb-3 px-6 text-xs uppercase tracking-luxury font-semibold transition-colors border-b-2"
            :class="[
              measurementMode === 'sample'
                ? 'border-brand-charcoal text-brand-charcoal'
                : 'border-transparent text-brand-muted hover:text-brand-charcoal'
            ]"
            @click="measurementMode = 'sample'"
          >
            Send Physical Sample Suit
          </button>
        </div>

        <!-- Tab A: Manual Measurements Form -->
        <div v-if="measurementMode === 'manual'" class="space-y-8">
          <!-- Saved Profile Quick-Fill (if user has saved profiles) -->
          <div v-if="savedProfiles.length > 0" class="bg-brand-cream/80 p-4 border border-brand-border">
            <label class="text-[10px] uppercase tracking-luxury text-brand-gold font-bold block mb-1">
              Load From Your Saved Measurement Profiles
            </label>
            <div class="flex items-center space-x-3">
              <select
                v-model="selectedSavedProfileId"
                class="flex-1 bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                @change="selectedSavedProfileId && applySavedProfile(selectedSavedProfileId)"
              >
                <option :value="null">-- Choose a Saved Profile --</option>
                <option v-for="prof in savedProfiles" :key="prof.id" :value="prof.id">
                  {{ prof.profile_name }} ({{ prof.unit }})
                </option>
              </select>
              <button
                v-if="selectedSavedProfileId"
                type="button"
                class="px-4 py-2 bg-brand-charcoal text-white text-xs uppercase tracking-luxury"
                @click="applySavedProfile(selectedSavedProfileId)"
              >
                Apply
              </button>
            </div>
          </div>

          <!-- Unit Toggle -->
          <div class="flex items-center justify-between bg-brand-cream/50 p-4 border border-brand-border">
            <div>
              <h3 class="font-serif text-sm font-bold uppercase tracking-luxury text-brand-charcoal">
                Measurement Unit
              </h3>
              <p class="text-xs text-brand-muted">Select your preferred measuring scale</p>
            </div>
            <div class="flex border border-brand-border bg-white text-xs">
              <button
                class="px-4 py-1.5 font-medium transition-colors"
                :class="[measurementUnit === 'inches' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal']"
                :aria-pressed="measurementUnit === 'inches'"
                        @click="measurementUnit = 'inches'"
              >
                Inches
              </button>
              <button
                class="px-4 py-1.5 font-medium transition-colors"
                :class="[measurementUnit === 'cm' ? 'bg-brand-charcoal text-white' : 'text-brand-charcoal']"
                :aria-pressed="measurementUnit === 'cm'"
                        @click="measurementUnit = 'cm'"
              >
                Centimeters
              </button>
            </div>
          </div>

          <!-- Shirt Measurements (2 Columns) -->
          <div>
            <h4 class="font-serif text-base font-bold text-brand-charcoal uppercase tracking-luxury mb-4 text-brand-gold">
              Shirt / Kameez ({{ measurementUnit }})
            </h4>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label for="stitch-shirt-length" class="text-[10px] uppercase text-brand-muted block mb-1">Shirt Length</label>
                <input
                  id="stitch-shirt-length"
                  v-model.number="manualMeasurements.shirt_length"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 40"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-shoulder" class="text-[10px] uppercase text-brand-muted block mb-1">Shoulder Width</label>
                <input
                  id="stitch-shoulder"
                  v-model.number="manualMeasurements.shoulder"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 14.5"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-chest" class="text-[10px] uppercase text-brand-muted block mb-1">Chest / Bust</label>
                <input
                  id="stitch-chest"
                  v-model.number="manualMeasurements.chest"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 38"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-waist" class="text-[10px] uppercase text-brand-muted block mb-1">Waist</label>
                <input
                  id="stitch-waist"
                  v-model.number="manualMeasurements.waist"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 34"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-hips" class="text-[10px] uppercase text-brand-muted block mb-1">Hips</label>
                <input
                  id="stitch-hips"
                  v-model.number="manualMeasurements.hips"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 42"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-sleeve-length" class="text-[10px] uppercase text-brand-muted block mb-1">Sleeve Length</label>
                <input
                  id="stitch-sleeve-length"
                  v-model.number="manualMeasurements.sleeve_length"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 21"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-armhole" class="text-[10px] uppercase text-brand-muted block mb-1">Armhole</label>
                <input
                  id="stitch-armhole"
                  v-model.number="manualMeasurements.armhole"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 8.5"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-daman" class="text-[10px] uppercase text-brand-muted block mb-1">Daman (Flair)</label>
                <input
                  id="stitch-daman"
                  v-model.number="manualMeasurements.daman"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 24"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>
          </div>

          <!-- Trouser Measurements -->
          <div>
            <h4 class="font-serif text-base font-bold text-brand-charcoal uppercase tracking-luxury mb-4 text-brand-gold">
              Trouser / Shalwar ({{ measurementUnit }})
            </h4>
            <div class="grid grid-cols-3 gap-4">
              <div>
                <label for="stitch-trouser-length" class="text-[10px] uppercase text-brand-muted block mb-1">Trouser Length</label>
                <input
                  id="stitch-trouser-length"
                  v-model.number="manualMeasurements.trouser_length"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 38"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-trouser-waist" class="text-[10px] uppercase text-brand-muted block mb-1">Trouser Waist</label>
                <input
                  id="stitch-trouser-waist"
                  v-model.number="manualMeasurements.trouser_waist"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 32"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
              <div>
                <label for="stitch-pancha" class="text-[10px] uppercase text-brand-muted block mb-1">Pancha / Opening</label>
                <input
                  id="stitch-pancha"
                  v-model.number="manualMeasurements.pancha"
                  type="number"
                  min="0.01"
                          max="300"
                          step="0.01"
                  placeholder="e.g. 6.5"
                  class="w-full bg-white border border-brand-border px-3 py-2 text-xs text-brand-charcoal focus:border-brand-gold focus:outline-none"
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Tab B: Sample Suit Information -->
        <div v-else class="p-8 border border-brand-border bg-brand-cream/60 space-y-4">
          <div class="w-12 h-12 text-brand-gold mb-2">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-full h-full">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
            </svg>
          </div>
          <h3 class="font-serif text-lg font-bold text-brand-charcoal">
            Send a Well-Fitted Sample Suit
          </h3>
          <p class="text-xs text-brand-muted leading-relaxed">
            No need to measure yourself! Pack an existing dress that fits you impeccably with your unstitched fabric. Our master cutting masters will match every inch, flare, and neckline contour exactly.
          </p>
          <ul class="text-xs text-brand-charcoal space-y-2 pt-2">
            <li>✔ Your sample suit is safely tagged with your Order Number and returned undamaged with your stitched dress.</li>
            <li>✔ We save your measured specifications to your customer profile for all future orders.</li>
          </ul>
        </div>

        <p v-if="measurementError" role="alert" class="text-red-800">{{ measurementError }}</p>
        <!-- Navigation Buttons -->
        <div class="pt-6 border-t border-brand-border flex items-center justify-between">
          <button
            class="px-6 py-3 border border-brand-border text-xs uppercase tracking-luxury text-brand-charcoal hover:bg-brand-cream"
            @click="goToStep(1)"
          >
            ← Back to Styling
          </button>
          <button
            class="px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury font-medium hover:bg-brand-gold transition-colors"
            @click="goToStep(3)"
          >
            Review & Handover →
          </button>
        </div>
      </div>

      <!-- ================= STEP 3: HANDOVER & SUMMARY ================= -->
      <div v-else-if="currentStep === 3" class="space-y-10">
        <!-- Fabric Handover Selection -->
        <div>
          <h2 class="font-serif text-lg sm:text-xl font-bold uppercase tracking-luxury text-brand-charcoal mb-4">
            Fabric Delivery Method
          </h2>
          <div class="border border-brand-border p-4">
            <p class="font-semibold">Send fabric by courier</p>
            <p>Wait for the atelier to confirm the shipping address and handover instructions before sending any fabric or sample garment.</p>
          </div>
        </div>

        <!-- Stitching Order Summary Card on #F9F8F6 Cream -->
        <div class="bg-brand-cream border border-brand-border p-6 sm:p-8 space-y-6">
          <div class="border-b border-brand-border pb-4">
            <h3 class="font-serif text-lg font-bold uppercase tracking-luxury text-brand-charcoal">
              Custom Stitching Summary
            </h3>
            <p class="text-xs text-brand-muted">Review your specifications before booking</p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span class="text-brand-muted uppercase text-[10px] block">Selected Package</span>
              <span class="font-serif font-bold text-brand-charcoal text-sm">{{ selectedServiceName }}</span>
            </div>
            <div>
              <span class="text-brand-muted uppercase text-[10px] block">Estimated Turnaround</span>
              <span class="font-medium text-brand-charcoal">{{ selectedServiceDays }} working days</span>
            </div>
            <div>
              <span class="text-brand-muted uppercase text-[10px] block">Styling Choices</span>
              <span class="text-brand-charcoal">
                {{ neckStyle }} · {{ sleeveStyle }} · {{ trouserStyle }}
              </span>
            </div>
            <div>
              <span class="text-brand-muted uppercase text-[10px] block">Measurement Method</span>
              <span class="text-brand-charcoal font-medium">
                {{ measurementMode === 'manual' ? 'Online Custom Form' : 'Physical Sample Suit Included' }}
              </span>
            </div>
          </div>

          <!-- Total Stitching Fee -->
          <div class="pt-4 border-t border-brand-border flex items-baseline justify-between">
            <span class="font-serif text-base font-bold text-brand-charcoal uppercase tracking-luxury">
              Estimated Stitching Fee
            </span>
            <span class="font-serif text-2xl font-bold text-brand-charcoal">
              {{ formatPrice(selectedServicePrice) }}
            </span>
          </div>
        </div>

        <!-- Advance notice -->
        <div class="border border-brand-gold bg-brand-cream p-5 text-xs text-brand-charcoal leading-relaxed flex items-start space-x-3">
          <div class="text-brand-gold shrink-0 mt-0.5">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <strong class="text-brand-charcoal uppercase tracking-wider block mb-1">
              Advance Payment Policy for Atelier Stitching
            </strong>
            <span>
              Checkout will show your advance and which payment method is available. Tailoring starts after the atelier verifies the advance and receives your fabric.
            </span>
          </div>
        </div>

        <!-- Action CTAs: Add to Bag & Proceed to Checkout -->
        <div class="pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            class="w-full sm:w-auto px-6 py-3 border border-brand-border text-xs uppercase tracking-luxury text-brand-charcoal hover:bg-brand-cream"
            @click="goToStep(2)"
          >
            ← Back to Measurements
          </button>

          <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              class="w-full sm:w-auto px-8 py-4 border border-brand-charcoal text-brand-charcoal hover:bg-brand-charcoal hover:text-white text-xs uppercase tracking-luxury font-medium transition-colors"
              @click="finalizeBooking(false)"
            >
              Add to Shopping Bag
            </button>
            <button
              class="w-full sm:w-auto px-8 py-4 bg-brand-charcoal text-white hover:bg-brand-gold text-xs uppercase tracking-luxury font-medium transition-colors shadow-md"
              @click="finalizeBooking(true)"
            >
              Book & Checkout Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
:where(input, textarea, select, button, a):focus-visible { outline: 2px solid #202020; outline-offset: 3px; }
</style>
