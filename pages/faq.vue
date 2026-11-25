<script setup lang="ts">
const { whatsapp, emailHref } = useStoreContact()
const chatUrl = computed(() => whatsapp('Hello K. Fabrics, I have a question about your collection.'))
useSeoMeta({
  title: 'Frequently Asked Questions & Support | K. Fabrics Pakistan',
  description: 'Everything you need to know about bespoke stitching, measurement profiles, Cash on Delivery, courier handover, and exchange policies at K. Fabrics.',
  ogTitle: 'FAQs & Concierge Support | K. Fabrics Minimalist Luxury',
  ogDescription: 'Instant answers on custom tailoring, sizing, COD rules, and order delivery across Pakistan.',
})

interface FaqItem {
  id: string
  category: 'stitching' | 'orders' | 'payment' | 'exchanges'
  question: string
  answer: string
}

const activeCategory = ref<'all' | 'stitching' | 'orders' | 'payment' | 'exchanges'>('all')
const openItem = ref<string | null>('stitching-1')

const faqs: FaqItem[] = [
  // Stitching
  {
    id: 'stitching-1',
    category: 'stitching',
    question: 'How does your Bespoke Custom Stitching service work?',
    answer: 'When purchasing any piece from our collection, you can select standard sizes (XS–XL) or check "Bespoke Custom Fit (+Rs. 300)". This opens our interactive tailor form where you can submit your exact shirt, trouser, shoulder, and sleeve measurements. Our master atelier patterns and stitches your outfit exclusively to your profile.',
  },
  {
    id: 'stitching-2',
    category: 'stitching',
    question: 'Can I send you my own unstitched fabric from another brand?',
    answer: 'Yes! Through our Standalone Stitching wizard (/stitching), you can commission our atelier to tailor your own unstitched 2-piece or 3-piece suits. Book online, then wait for the atelier to confirm the address and send your fabric by courier. Rider pickup and studio drop-off are not available through online booking.',
  },
  {
    id: 'stitching-3',
    category: 'stitching',
    question: 'What if I don\'t know my exact body measurements?',
    answer: 'You have two easy choices: you can refer to our Size Guide on any product page with instructions on using a measuring tape, or choose "Send Sample Fitting Suit" during stitching checkout. Courier your fitted shirt and trousers with the unstitched fabric after the atelier confirms the address. The team will measure the samples and return them with your finished order.',
  },
  {
    id: 'stitching-4',
    category: 'stitching',
    question: 'Can I save multiple measurement profiles in my customer account?',
    answer: 'Absolutely. Registered customers can save and name multiple profiles (e.g. "Formal Fitted", "Summer Relaxed", "Mom\'s Measurements") in their Customer Dashboard under Saved Measurements to load into the fitting or stitching form. Filling a form does not automatically save new or edited measurements to your account.',
  },

  // Orders & Shipping
  {
    id: 'orders-1',
    category: 'orders',
    question: 'What are the delivery charges and transit timelines?',
    answer: 'Standard nationwide shipping is flat Rs. 250 across Pakistan. Orders of Rs. 5,000 or above receive Free Delivery. Ready-to-wear orders arrive in 2–4 working days. Custom tailored orders require 3–4 days in the atelier and arrive in 5–7 working days total.',
  },
  {
    id: 'orders-2',
    category: 'orders',
    question: 'How do I track my parcel once shipped?',
    answer: 'Enter your order number and the private tracking code shown at checkout on the Track Order page. Courier details will appear there once they are available.',
  },

  // Payments
  {
    id: 'payment-1',
    category: 'payment',
    question: 'Do you offer Cash on Delivery (COD)?',
    answer: 'Available payment options are shown at checkout. Cash on Delivery orders are confirmed before dispatch.',
  },
  {
    id: 'payment-2',
    category: 'payment',
    question: 'How do I pay the advance for custom tailoring?',
    answer: 'Checkout shows the amount due in advance and the available payment options. The atelier starts cutting after payment is verified.',
  },

  // Exchanges
  {
    id: 'exchanges-1',
    category: 'exchanges',
    question: 'What is your exchange policy if a ready-to-wear size does not fit?',
    answer: 'Submit a return or exchange request for your delivered order in Returns & Exchanges. Keep the item unworn and unwashed with its tags and packaging while the store reviews your request. Do not send it back before receiving verified instructions.',
  },
  {
    id: 'exchanges-2',
    category: 'exchanges',
    question: 'What happens if my custom stitched suit needs minor adjustments?',
    answer: 'If a custom garment differs from the agreed measurements or arrives with a problem, describe the issue in a request. Staff will review the original tailoring instructions and available options.',
  },
]

const filteredFaqs = computed(() => {
  if (activeCategory.value === 'all') return faqs
  return faqs.filter(f => f.category === activeCategory.value)
})

const toggleFaq = (id: string) => {
  openItem.value = openItem.value === id ? null : id
}
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Breadcrumb -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">FAQs & Support</span>
      </nav>
    </div>

    <!-- Header Section -->
    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
      <span class="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold block mb-2">
        Concierge & Help Desk
      </span>
      <h1 class="font-serif text-3xl sm:text-5xl text-brand-charcoal font-normal">
        Frequently Asked Questions
      </h1>
      <p class="text-xs sm:text-sm text-brand-muted mt-4 max-w-xl mx-auto font-light leading-relaxed">
        Have questions about custom fitting, COD delivery timelines, or sending a fitting sample? Find instant answers below.
      </p>

      <!-- Category Filter Tabs -->
      <div class="flex flex-wrap items-center justify-center gap-2 mt-8">
        <button
          type="button"
          class="px-4 py-2 text-xs uppercase tracking-luxury transition-all border"
          :class="[activeCategory === 'all' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
          @click="activeCategory = 'all'"
        >
          All Topics
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs uppercase tracking-luxury transition-all border"
          :class="[activeCategory === 'stitching' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
          @click="activeCategory = 'stitching'"
        >
          Custom Stitching
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs uppercase tracking-luxury transition-all border"
          :class="[activeCategory === 'orders' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
          @click="activeCategory = 'orders'"
        >
          Shipping & Orders
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs uppercase tracking-luxury transition-all border"
          :class="[activeCategory === 'payment' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
          @click="activeCategory = 'payment'"
        >
          Payments & COD
        </button>
        <button
          type="button"
          class="px-4 py-2 text-xs uppercase tracking-luxury transition-all border"
          :class="[activeCategory === 'exchanges' ? 'bg-brand-charcoal text-white border-brand-charcoal font-semibold' : 'bg-brand-cream border-brand-border text-brand-charcoal hover:border-brand-charcoal']"
          @click="activeCategory = 'exchanges'"
        >
          Exchanges & Care
        </button>
      </div>
    </section>

    <!-- FAQ Accordion List -->
    <section class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
      <div class="divide-y divide-brand-border border-y border-brand-border">
        <div
          v-for="item in filteredFaqs"
          :key="item.id"
          class="py-5"
        >
          <button
            type="button"
            class="w-full flex items-center justify-between text-left focus:outline-none group"
            @click="toggleFaq(item.id)"
          >
            <span class="font-serif text-base sm:text-lg text-brand-charcoal font-medium group-hover:text-brand-gold transition-colors pr-4">
              {{ item.question }}
            </span>
            <span class="text-brand-charcoal font-serif text-xl shrink-0 leading-none">
              {{ openItem === item.id ? '−' : '+' }}
            </span>
          </button>

          <Transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 -translate-y-1 max-h-0"
            enter-to-class="opacity-100 translate-y-0 max-h-96"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 max-h-96"
            leave-to-class="opacity-0 -translate-y-1 max-h-0"
          >
            <div v-show="openItem === item.id" class="pt-3 text-xs sm:text-sm text-brand-muted leading-relaxed font-light">
              <p>{{ item.answer }}</p>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- WhatsApp / Contact Callout Card -->
    <section class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
      <div class="bg-brand-cream/50 border border-brand-border p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
        <div class="space-y-2 text-center md:text-left">
          <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block">
            Still Have Questions?
          </span>
          <h3 class="font-serif text-xl sm:text-2xl text-brand-charcoal">
            Speak Directly with our Atelier Stylist
          </h3>
          <p class="text-xs text-brand-muted max-w-md font-light leading-relaxed">
            Need guidance on measuring, neck styling, or fabric matching? Use a support option below when available.
          </p>
        </div>

        <div v-if="chatUrl || emailHref" class="flex flex-col sm:flex-row items-center gap-3 shrink-0">
          <a
            v-if="chatUrl"
            :href="chatUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="px-6 py-3.5 bg-[#25D366] text-white text-xs uppercase tracking-luxury font-medium hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
            </svg>
            <span>WhatsApp Concierge</span>
          </a>
          <a
            v-if="emailHref"
            :href="emailHref"
            class="px-6 py-3.5 bg-white border border-brand-border text-brand-charcoal text-xs uppercase tracking-luxury font-medium hover:border-brand-charcoal transition-colors"
          >
            Email Support
          </a>
        </div>
      </div>
    </section>
  </div>
</template>
