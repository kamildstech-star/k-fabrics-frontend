<script setup lang="ts">
import { receiptDocument, receiptMarkup, receiptStyles } from '~/utils/order-receipt'
import type { OrderReceipt } from '~/utils/order-receipt'

const props = defineProps<{
  receipt?: OrderReceipt | null
  trackingCode?: string | null
  load?: () => Promise<OrderReceipt>
}>()

const { $storefrontLanguage: { language } } = useNuxtApp()
const busy = ref(false)
const error = ref('')
const message = ref('')
const printMarkup = ref('')
const loadedReceipt = shallowRef<OrderReceipt | null>(null)
let active = true

const getReceipt = async () => {
  const receipt = props.receipt || loadedReceipt.value || await props.load?.()
  if (!receipt || !Array.isArray(receipt.lines)) throw new Error('Receipt is unavailable.')
  loadedReceipt.value = receipt
  return receipt
}

const stopPrint = () => {
  if (!import.meta.client) return
  window.removeEventListener('afterprint', stopPrint)
  document.body.classList.remove('kf-is-printing-receipt')
  printMarkup.value = ''
}

const saveReceipt = async (mode: 'download' | 'print') => {
  if (!import.meta.client || busy.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    const receipt = await getReceipt()
    if (!active) return
    const trackingUrl = new URL('/track-order', window.location.origin).href
    const receiptLanguage = language.value
    const markup = receiptMarkup(receipt, props.trackingCode || null, trackingUrl, receiptLanguage)
    if (mode === 'print') {
      stopPrint()
      printMarkup.value = `<style>${receiptStyles}</style>${markup}`
      document.body.classList.add('kf-is-printing-receipt')
      window.addEventListener('afterprint', stopPrint, { once: true })
      await nextTick()
      window.print()
    } else {
      const url = URL.createObjectURL(new Blob([receiptDocument(markup, receiptLanguage)], { type: 'text/html;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `K-Fabrics-receipt-${receipt.order_number.replace(/[^A-Za-z0-9-]/g, '_')}.html`
      document.body.appendChild(link)
      try {
        link.click()
      } finally {
        link.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 15000)
      }
      message.value = 'Receipt prepared for download.'
    }
  } catch {
    stopPrint()
    error.value = 'We could not prepare the receipt. Try again or contact the store.'
  } finally {
    busy.value = false
  }
}

onBeforeUnmount(() => {
  active = false
  stopPrint()
})
</script>

<template>
  <div class="space-y-2">
    <p v-if="trackingCode" class="text-sm text-brand-charcoal">{{ $tr("The saved or printed copy includes your private tracking code. Keep it somewhere safe.") }}</p>
    <div class="flex flex-wrap gap-2">
      <button type="button" class="border border-brand-charcoal px-3 py-2 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" :disabled="busy" @click="saveReceipt('download')">{{ $tr("Download receipt") }}</button>
      <button type="button" class="border border-brand-charcoal px-3 py-2 font-semibold disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" :disabled="busy" @click="saveReceipt('print')">{{ $tr("Print receipt") }}</button>
    </div>
    <p v-if="busy" role="status">{{ $tr("Preparing receipt…") }}</p>
    <p v-if="message" role="status">{{ $tr(message) }}</p>
    <p v-if="error" role="alert" class="text-red-800">{{ $tr(error) }}</p>
    <Teleport v-if="printMarkup" to="body">
      <!-- The builder escapes dynamic values before it produces the printable fragment. -->
      <div class="kf-guest-receipt-print" v-html="printMarkup" />
    </Teleport>
  </div>
</template>

<style>
.kf-guest-receipt-print { display: none; }
@media print {
  body.kf-is-printing-receipt > :not(.kf-guest-receipt-print) { display: none !important; }
  body.kf-is-printing-receipt .kf-guest-receipt-print { display: block; }
}
</style>
