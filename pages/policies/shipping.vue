<script setup lang="ts">
useSeoMeta({
  title: 'Shipping & Delivery Policy | K. Fabrics Pakistan',
  description: 'Nationwide shipping timelines, courier partners, and free delivery thresholds across Pakistan. 2–4 days for Pret, 5–7 days for Custom Atelier Stitching.',
  ogTitle: 'Shipping & Delivery Policy | K. Fabrics',
  ogDescription: 'Nationwide COD delivery timelines, courier partners, and free delivery terms for luxury ladies wear in Pakistan.',
})
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Breadcrumb -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">Shipping & Delivery</span>
      </nav>
    </div>

    <!-- Main Content Container -->
    <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="border-b border-brand-border pb-8 mb-10">
        <span class="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold block mb-2">
          Nationwide Logistics & Fulfillment
        </span>
        <h1 class="font-serif text-3xl sm:text-4xl text-brand-charcoal font-normal">
          Shipping & Delivery Policy
        </h1>
        <p class="text-xs text-brand-muted mt-2">
          Delivering with care across 150+ cities and towns across Pakistan
        </p>
      </div>

      <div class="space-y-10 text-xs sm:text-sm text-brand-charcoal font-light leading-relaxed">
        <!-- 1. Rates & Free Shipping -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">01.</span>
            <span>Delivery Rates & Free Shipping</span>
          </h2>
          <p>
            We strive to keep premium delivery transparent and accessible nationwide:
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div class="p-4 border border-brand-border bg-brand-cream/30 space-y-1">
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block">Flat Standard Delivery</span>
              <p class="font-serif text-xl font-bold text-brand-charcoal">Rs. 250</p>
              <p class="text-xs text-brand-muted">Applied to orders below Rs. 5,000 anywhere in Pakistan.</p>
            </div>
            <div class="p-4 border border-brand-gold/50 bg-brand-cream/50 space-y-1">
              <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block">Complimentary Shipping</span>
              <p class="font-serif text-xl font-bold text-brand-charcoal">FREE</p>
              <p class="text-xs text-brand-muted">Automatically applied on orders of Rs. 5,000 or above.</p>
            </div>
          </div>
        </section>

        <!-- 2. Delivery Timelines -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">02.</span>
            <span>Dispatch & Transit Timelines</span>
          </h2>
          <div class="overflow-x-auto border border-brand-border">
            <table class="w-full text-xs text-left">
              <thead class="bg-brand-cream/70 text-[10px] uppercase tracking-luxury text-brand-muted border-b border-brand-border">
                <tr>
                  <th class="py-3 px-4">Order Category</th>
                  <th class="py-3 px-4">Production / Processing</th>
                  <th class="py-3 px-4">Courier Transit Time</th>
                  <th class="py-3 px-4">Total Estimated Arrival</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-brand-border text-brand-charcoal">
                <tr>
                  <td class="py-3 px-4 font-semibold">Ready-to-Wear (Pret)</td>
                  <td class="py-3 px-4 text-brand-muted">Same-Day / Next-Day Dispatch</td>
                  <td class="py-3 px-4 text-brand-muted">2–3 Working Days</td>
                  <td class="py-3 px-4 font-medium">2–4 Working Days</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-semibold">Bespoke Custom Fit</td>
                  <td class="py-3 px-4 text-brand-muted">3–4 Days Atelier Stitching</td>
                  <td class="py-3 px-4 text-brand-muted">2–3 Working Days</td>
                  <td class="py-3 px-4 font-medium text-brand-gold">5–7 Working Days</td>
                </tr>
                <tr>
                  <td class="py-3 px-4 font-semibold">Standalone Stitching</td>
                  <td class="py-3 px-4 text-brand-muted">4–5 Days From Fabric Arrival</td>
                  <td class="py-3 px-4 text-brand-muted">2–3 Working Days</td>
                  <td class="py-3 px-4 font-medium text-brand-gold">6–8 Working Days</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="text-[11px] text-brand-muted italic">
            * Note: Public holidays, festive peak seasons (Eid), or regional weather disruptions may occasionally add 1–2 business days.
          </p>
        </section>

        <!-- 3. Logistics Partners & Tracking -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">03.</span>
            <span>Courier and Order Tracking</span>
          </h2>
          <p>
            The courier name and tracking number appear after staff have recorded the dispatch details.
          </p>
          <p>
            Use your order number and private tracking code to view the latest available order status on the
            <NuxtLink to="/track-order" class="text-brand-gold font-semibold underline underline-offset-2">Track Order page</NuxtLink>.
          </p>
        </section>

        <!-- 4. Payment Methods & Cash on Delivery -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">04.</span>
            <span>Cash on Delivery (COD) Rules</span>
          </h2>
          <ul class="list-disc pl-5 space-y-1.5 text-brand-muted">
            <li><strong class="text-brand-charcoal font-medium">Standard Pret:</strong> Cash on Delivery is available when shown at checkout and requires order confirmation.</li>
            <li><strong class="text-brand-charcoal font-medium">Custom Tailored Orders:</strong> Checkout shows the required advance and available payment options. Cutting begins only once the advance has been verified.</li>
            <li>Please have exact cash ready at the time of rider arrival to ensure a smooth handover.</li>
          </ul>
        </section>

        <!-- 5. Rider Delivery Protocol -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">05.</span>
            <span>Delivery Verification</span>
          </h2>
          <p>
            The courier rider will attempt delivery up to two times. As per standard logistics security guidelines in Pakistan, 
            parcels cannot be opened before payment is handed over to the courier representative. 
            However, you can <NuxtLink to="/policies/returns" class="text-brand-gold underline">submit a request</NuxtLink> if something is wrong after opening the parcel.
          </p>
        </section>
      </div>
    </article>
  </div>
</template>
