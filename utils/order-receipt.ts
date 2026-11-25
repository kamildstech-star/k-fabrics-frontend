export interface OrderReceipt {
  order_number: string
  created_at: string | null
  currency: 'PKR'
  lines: Array<{
    description: string
    variant: string | null
    quantity: number
    amount: number | string
    custom_fitting_included: boolean
  }>
  subtotal: number | string
  shipping_fee: number | string
  discount_amount: number | string
  total_amount: number | string
  advance_due: number | string
  payment_method: string
  payment_status: string
  order_status: string
}

const escape = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]!))

const currency = (value: number | string) => escape(new Intl.NumberFormat('en-PK', {
  style: 'currency', currency: 'PKR', currencyDisplay: 'code', minimumFractionDigits: 2,
}).format(Number(value)))

const label = (text: string) => text === 'cod' ? 'Cash on delivery'
  : text === 'bank_transfer' ? 'Bank transfer' : text.replaceAll('_', ' ')

export const receiptStyles = `
.kf-receipt { max-width: 46rem; margin: auto; padding: 1.4rem; box-sizing: border-box; color: #202020; background: #fff; font: 15px/1.45 system-ui, sans-serif; }
.kf-receipt h1 { margin: 0 0 .35rem; font: bold 2rem Georgia, serif; }
.kf-receipt h2 { margin: 1.2rem 0 .3rem; font-size: 1.1rem; }
.kf-receipt p { margin: .3rem 0; }
.kf-receipt table { width: 100%; border-collapse: collapse; margin: 1rem 0; break-inside: auto; }
.kf-receipt th, .kf-receipt td { border-bottom: 1px solid #ccc; padding: .45rem .25rem; text-align: left; vertical-align: top; }
.kf-receipt tr { break-inside: avoid; }
.kf-receipt th:last-child, .kf-receipt td:last-child { text-align: right; white-space: nowrap; }
.kf-receipt small { display: block; }
.kf-receipt dl { display: grid; grid-template-columns: 1fr auto; gap: .25rem .8rem; margin: .7rem 0; }
.kf-receipt dd { margin: 0; text-align: right; }
.kf-receipt .kf-private-code { display: block; overflow-wrap: anywhere; font-family: monospace; border: 1px solid #777; padding: .35rem; margin: .35rem 0; }
.kf-receipt .kf-receipt-total { font-weight: 700; }
@media print { .kf-receipt { max-width: none; margin: 0; padding: 0; } }
`

export function receiptMarkup(receipt: OrderReceipt, trackingCode: string | null, trackingUrl: string) {
  const date = receipt.created_at && new Date(receipt.created_at)
  const formatted = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-PK', { dateStyle: 'long', timeZone: 'Asia/Karachi' }).format(date)
    : null
  const lines = receipt.lines.map(line => `<tr><td>${escape(line.description)}
    ${line.variant ? `<small>${escape(line.variant)}</small>` : ''}
    ${line.custom_fitting_included ? '<small>Custom fitting included</small>' : ''}
  </td><td>${escape(line.quantity)}</td><td>${currency(line.amount)}</td></tr>`).join('')
  const discount = Number(receipt.discount_amount) > 0 ? `<dt>Discount</dt><dd>−${currency(receipt.discount_amount)}</dd>` : ''
  const advance = Number(receipt.advance_due) > 0
    ? `<dt>Tailoring advance required at checkout (included in total)</dt><dd>${currency(receipt.advance_due)}</dd>` : ''
  const privateCode = trackingCode ? `<h2>Private tracking</h2>
    <p>At ${escape(trackingUrl)}, enter the order number above and this code. Keep this copy private.</p>
    <strong class="kf-private-code">${escape(trackingCode)}</strong>` : ''

  return `<article class="kf-receipt">
    <header><h1>K. Fabrics order receipt</h1>
    <p><strong>Order number:</strong> ${escape(receipt.order_number)}</p>
    ${formatted ? `<p><strong>Placed:</strong> ${escape(formatted)}</p>` : ''}</header>
    <table><thead><tr><th scope="col">Item</th><th scope="col">Qty</th><th scope="col">Amount</th></tr></thead>
      <tbody>${lines}</tbody></table>
    <dl><dt>Subtotal</dt><dd>${currency(receipt.subtotal)}</dd>
      <dt>Shipping</dt><dd>${currency(receipt.shipping_fee)}</dd>
      ${discount}<dt class="kf-receipt-total">Order total</dt><dd class="kf-receipt-total">${currency(receipt.total_amount)}</dd>
      ${advance}<dt>Payment method</dt><dd>${escape(label(receipt.payment_method))}</dd>
      <dt>Payment status</dt><dd>${escape(label(receipt.payment_status))}</dd>
      <dt>Order status</dt><dd>${escape(label(receipt.order_status))}</dd>
    </dl>
    <p>This receipt acknowledges your order. It is not proof of payment.</p>${privateCode}
  </article>`
}

export function receiptDocument(markup: string) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'">
    <meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1">
    <title>K. Fabrics order receipt</title><style>${receiptStyles}</style>
  </head><body>${markup}</body></html>`
}
