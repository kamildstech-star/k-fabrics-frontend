import type { CartItem, CustomFittingMeasurements } from '../stores/cart'
import type { OrderReceipt } from './order-receipt'

type Money = number | string

export interface PaymentOption {
  id: string
  label: string
  requires_otp: boolean
}

export interface CheckoutQuote {
  subtotal: Money
  shipping_fee: Money
  discount_amount: Money
  total_amount: Money
  advance_due: Money
  requires_deposit: boolean
  payment_options: PaymentOption[]
  items: Array<{ product_id: number; variant_id: number; quantity: number; unit_price: Money; total_price: Money }>
  standalone_stitchings: Array<{ stitching_service_id: number; stitching_fee: Money }>
}

export interface PlacedOrder {
  order_number: string
  receipt?: OrderReceipt | null
  tracking_token?: string | null
  payment_method: string
  payment_status: string
  total_amount: Money
  advance_due?: Money | null
  payment_instructions?: string | null
}

export interface OrderTracking {
  order_number: string
  order_status: string
  payment_status: string
  courier_name?: string | null
  tracking_number?: string | null
  created_at: string
  stitching_requests: Array<{ request_type: string; status: string }>
}

export interface CheckoutCustomer {
  customer_name: string
  customer_phone: string
  customer_email: string
  shipping_address: string
  city: string
  notes: string
  payment_method: string
}

export const formatPrice = (amount: Money) => 'Rs. ' + Number(amount).toLocaleString('en-PK', {
  maximumFractionDigits: 2,
})

const measurementFields = [
  'shirt_length', 'shoulder', 'chest', 'waist', 'hips', 'sleeve_length', 'armhole', 'daman',
  'neck_front', 'neck_back', 'trouser_length', 'trouser_waist', 'pancha',
] as const

export function convertMeasurements(measurements: CustomFittingMeasurements, unit: CustomFittingMeasurements['unit']) {
  if (measurements.unit === unit) return
  const factor = unit === 'cm' ? 2.54 : 1 / 2.54
  for (const field of measurementFields) {
    const value = measurements[field]
    if (value == null || String(value).trim() === '' || !Number.isFinite(Number(value))) continue
    measurements[field] = Math.round(Number(value) * factor * 100) / 100
  }
  measurements.unit = unit
}

export function hasNumericMeasurements(measurements: CustomFittingMeasurements) {
  return measurementFields.some(field => typeof measurements[field] === 'number' && measurements[field]! > 0)
}

const shirtMeasurements = {
  shirt_length: 'shirt length',
  shoulder: 'shoulder width',
  chest: 'chest/bust',
  waist: 'shirt waist',
  hips: 'hips',
  sleeve_length: 'sleeve length',
} as const

const trouserMeasurements = {
  trouser_length: 'trouser length',
  trouser_waist: 'trouser waist',
} as const

export function requiredMeasurementLabels(measurements?: CustomFittingMeasurements | null, includeTrousers = true): string[] {
  const required = includeTrousers ? { ...shirtMeasurements, ...trouserMeasurements } : shirtMeasurements
  return Object.entries(required)
    .filter(([field]) => {
      const value = measurements?.[field as keyof typeof shirtMeasurements | keyof typeof trouserMeasurements]
      return typeof value !== 'number' || !Number.isFinite(value) || value <= 0
    })
    .map(([, label]) => label)
}

export function measurementPayload(measurements?: CustomFittingMeasurements | null, includeStyle = false) {
  if (!measurements) return null
  const result: CustomFittingMeasurements = { unit: measurements.unit }
  for (const field of measurementFields) {
    const value = measurements[field]
    if (value == null || String(value).trim() === '') continue
    const number = Number(value)
    if (!Number.isFinite(number) || number < 0.01 || number > 300 || Number(number.toFixed(2)) !== number) {
      throw new Error('Measurement values must be between 0.01 and 300, with up to two decimal places. Please update your tailoring details.')
    }
    result[field] = number
  }
  if (includeStyle) {
    for (const field of ['neck_style', 'sleeve_style', 'trouser_style', 'special_instructions'] as const) {
      if (measurements[field]?.trim()) result[field] = measurements[field]?.trim()
    }
  }
  return result
}

export function checkoutCart(items: CartItem[], coupon?: string) {
  const unsupported = items.find(item =>
    item.type === 'product'
      ? !item.productId || !item.variantId || item.isAddon || item.addonId || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20
      : !item.serviceId || item.quantity !== 1 || !item.measurementMethod,
  )
  if (unsupported) {
    throw new Error(`Please remove “${unsupported.name}” from your bag or add it again as a supported product or tailoring booking.`)
  }

  const products = items.filter(item => item.type === 'product')
  const bookings = items.filter(item => item.type === 'stitching')
  if (products.length > 25 || bookings.length > 5) throw new Error('A single order can have up to 25 product lines and 5 stitching bookings. Remove an item or split your order.')
  return {
    products,
    bookings,
    body: {
      items: products.map(item => ({
        product_id: item.productId!,
        variant_id: item.variantId!,
        quantity: item.quantity,
        custom_fitting: measurementPayload(item.customFitting, true),
      })),
      standalone_stitchings: bookings.map(item => ({
        stitching_service_id: item.serviceId!,
        fabric_delivery_method: 'courier_by_customer',
        measurement_method: item.measurementMethod!,
        neck_style: item.neckStyle || null,
        sleeve_style: item.sleeveStyle || null,
        trouser_style: item.trouserStyle || null,
        special_instructions: item.specialInstructions || null,
        measurements: item.measurementMethod === 'manual' ? measurementPayload(item.measurements) : null,
      })),
      ...(coupon ? { coupon_code: coupon } : {}),
    },
  }
}

const imageExtensions: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
}

function designImage(data: string) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(data)
  if (!match) throw new Error('Please reattach your design reference as a JPEG, PNG or WebP image.')
  const bytes = Uint8Array.from(atob(match[2]!), char => char.charCodeAt(0))
  if (bytes.length > 5 * 1024 * 1024) throw new Error('Design reference images cannot be larger than 5 MB.')
  const mime = match[1]!
  return { blob: new Blob([bytes], { type: mime }), extension: imageExtensions[mime] }
}

export function orderForm(input: {
  customer: CheckoutCustomer
  items: CartItem[]
  quote: CheckoutQuote
  coupon?: string
  verificationToken?: string
}) {
  const { body, bookings } = checkoutCart(input.items, input.coupon)
  const form = new FormData()
  for (const [key, value] of Object.entries(input.customer)) {
    const trimmed = value.trim()
    if (trimmed) form.append(key, trimmed)
  }
  form.append('expected_total_amount', Number(input.quote.total_amount).toFixed(2))
  if (input.verificationToken) form.append('verification_token', input.verificationToken)
  if (body.items.length) form.append('items', JSON.stringify(body.items))
  if (input.coupon) form.append('coupon_code', input.coupon)
  if (body.standalone_stitchings.length) {
    form.append('standalone_stitchings', JSON.stringify(body.standalone_stitchings))
    bookings.forEach((booking, index) => {
      if (!booking.designReferenceImage) return
      const { blob, extension } = designImage(booking.designReferenceImage)
      form.append(`design_reference_images[${index}]`, blob, `reference-${index + 1}.${extension}`)
    })
  }
  return form
}

export function requestKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(24)), byte => byte.toString(16).padStart(2, '0')).join('')
}
