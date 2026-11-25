import assert from 'node:assert/strict'
import test from 'node:test'
import { receiptDocument, receiptMarkup } from '../utils/order-receipt.ts'

const receipt = {
  order_number: 'KF-2026-FIXTURE',
  created_at: '2026-11-25T21:00:00Z',
  currency: 'PKR',
  lines: [{ description: 'Fixture <Lawn & "Silk">', variant: 'M / Ivory', quantity: 2, amount: '1000.00', custom_fitting_included: true }],
  subtotal: '1000.00',
  shipping_fee: '250.00',
  discount_amount: '0.00',
  total_amount: '1250.00',
  advance_due: '625.00',
  payment_method: 'cod',
  payment_status: 'pending',
  order_status: 'confirmed',
}

test('receipt includes the known itemized totals and keeps notes outside the printable copy', () => {
  const markup = receiptMarkup({ ...receipt, customer_phone: 'fixture private', notes: 'fixture confidential' }, null, 'https://shop.example.test/track-order')
  assert.match(markup, /Fixture &lt;Lawn &amp; &quot;Silk&quot;&gt;/)
  assert.match(markup, /Custom fitting included/)
  assert.match(markup, /PKR\s1,250\.00/)
  assert.match(markup, /advance required at checkout \(included in total\)/i)
  assert.match(markup, /not proof of payment/)
  assert.doesNotMatch(markup, /fixture private|fixture confidential|Private tracking/)
})

test('explicitly saved document puts the private code in text, not in a link or storage', () => {
  const code = 'f'.repeat(64)
  const html = receiptDocument(receiptMarkup(receipt, code, 'https://shop.example.test/track-order'))
  assert.match(html, new RegExp(`class="kf-private-code">${code}</strong>`))
  assert.match(html, /content="default-src 'none'/)
  assert.match(html, /shop\.example\.test\/track-order/)
  assert.doesNotMatch(html, /href=|src=|<script|localStorage|sessionStorage/)
  assert.doesNotMatch(html, new RegExp(`track-order[^<]*${code}`))
})
