import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { checkoutCart, convertMeasurements, formatPrice, measurementPayload, orderForm, requestKey } from '../utils/checkout.ts'
import { standardCartItems } from '../utils/cart-privacy.ts'

const kurta = { id: 'ready', type: 'product', name: 'Lawn Kurta', productId: 11, variantId: 22, price: 3900, quantity: 1 }
const custom = { ...kurta, id: 'tailored', variantId: 23, customFitting: { unit: 'inches', chest: 37, special_instructions: 'Loose fit' } }
const reference = 'data:image/png;base64,iVBORw0KGgo='
const firstBooking = { id: 'booking-1', type: 'stitching', name: 'Basic tailoring', serviceId: 32, price: 500, quantity: 1 }
const secondBooking = { id: 'booking-2', type: 'stitching', name: 'Bespoke tailoring', serviceId: 33, price: 1250, quantity: 1, designReferenceImage: reference, neckStyle: 'Boat neck', measurements: { unit: 'cm', chest: 91, neck_style: 'Do not duplicate' } }
const customer = { customer_name: 'Test Customer', customer_phone: '03000000000', customer_email: '', shipping_address: ' Test address ', city: 'Lahore', payment_method: 'cod', notes: '' }

test('authoritative quote sends ids, quantities, measurements and coupon, not prices or uploads', () => {
  const { body } = checkoutCart([kurta, custom, firstBooking, secondBooking], 'FIRST')
  assert.deepEqual(body.items.map(({ product_id, variant_id, quantity }) => ({ product_id, variant_id, quantity })), [
    { product_id: 11, variant_id: 22, quantity: 1 },
    { product_id: 11, variant_id: 23, quantity: 1 },
  ])
  assert.equal(body.items[1].custom_fitting.special_instructions, 'Loose fit')
  assert.deepEqual(body.standalone_stitchings.map(item => item.stitching_service_id), [32, 33])
  assert.deepEqual(body.standalone_stitchings[1].measurements, { unit: 'cm', chest: 91 })
  assert.equal(body.standalone_stitchings[1].neck_style, 'Boat neck')
  assert.equal(body.coupon_code, 'FIRST')
  assert.doesNotMatch(JSON.stringify(body), /price|design_reference|customer_phone/)
})

test('order form keeps indexed attachments, confirmed total and optional OTP', async () => {
  const form = orderForm({ customer, items: [custom, firstBooking, secondBooking], quote: { total_amount: 5012.5 }, coupon: 'FIRST', verificationToken: 'test-only-otp' })
  assert.equal(form.get('expected_total_amount'), '5012.50')
  assert.equal(form.get('shipping_address'), 'Test address')
  assert.equal(form.get('verification_token'), 'test-only-otp')
  assert.equal(form.get('customer_email'), null)
  assert.equal(form.get('coupon_code'), 'FIRST')
  assert.equal(JSON.parse(form.get('standalone_stitchings')).length, 2)
  assert.equal(form.get('design_reference_images[0]'), null)
  const file = form.get('design_reference_images[1]')
  assert.equal(file.type, 'image/png')
  assert.equal(file.name, 'reference-2.png')
  assert.equal((await file.arrayBuffer()).byteLength, 8)
})

test('incomplete add-ons, unsupported reference images and excessive bookings fail before submission', () => {
  assert.throws(() => checkoutCart([{ ...kurta, isAddon: true }]), /remove/)
  assert.throws(() => checkoutCart(Array(6).fill(firstBooking)), /up to/)
  assert.throws(() => checkoutCart([{ ...firstBooking, quantity: 2 }]), /remove/)
  assert.throws(() => orderForm({
    customer, items: [{ ...secondBooking, designReferenceImage: 'https://example.com/reference.png' }], quote: { total_amount: 10 },
  }), /reattach/)
})

test('browser storage preserves ordinary products only and scrubs earlier sensitive fields', () => {
  const saved = standardCartItems([
    { ...kurta, image: reference, specialInstructions: 'private note', measurements: { unit: 'inches', chest: 41 } },
    custom, firstBooking, secondBooking, { ...kurta, addonId: 10 }, null,
  ])
  assert.equal(saved.length, 1)
  assert.equal(saved[0].name, kurta.name)
  assert.doesNotMatch(JSON.stringify(saved), /private note|measurements|base64/)
})

test('measurement sanitization drops blank strings and rejects nonpositive values', () => {
  assert.deepEqual(measurementPayload({ unit: 'inches', chest: '  ', waist: 27.5 }), { unit: 'inches', waist: 27.5 })
  assert.throws(() => measurementPayload({ unit: 'inches', chest: -1 }), /0\.01 and 300/)
})

test('switching measurement units converts values instead of relabelling them', () => {
  const measurements = { unit: 'inches', chest: 37, sleeve_length: null, special_instructions: 'Do not convert notes' }
  convertMeasurements(measurements, 'cm')
  assert.deepEqual(measurements, { unit: 'cm', chest: 93.98, sleeve_length: null, special_instructions: 'Do not convert notes' })
  convertMeasurements(measurements, 'inches')
  assert.equal(measurements.chest, 37)
})

test('order request keys are high-entropy and prices preserve sub-rupee precision', () => {
  const first = requestKey()
  assert.match(first, /^[0-9a-f]{48}$/)
  assert.notEqual(first, requestKey())
  assert.match(formatPrice(123.5), /123\.5$/)
})
