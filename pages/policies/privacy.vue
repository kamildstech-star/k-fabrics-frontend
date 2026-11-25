<script setup lang="ts">
const { email, emailHref } = useStoreContact()
useSeoMeta({
  title: 'Privacy Policy & Terms of Service | K. Fabrics Pakistan',
  description: 'Read how K. Fabrics handles customer, order and tailoring information.',
  ogTitle: 'Privacy Policy & Terms of Service | K. Fabrics',
  ogDescription: 'Transparent data protection and terms of service for K. Fabrics customers across Pakistan.',
})
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Breadcrumb -->
    <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">Privacy Policy & Terms</span>
      </nav>
    </div>

    <!-- Main Content Container -->
    <article class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
      <div class="border-b border-brand-border pb-8 mb-10">
        <span class="text-[10px] uppercase tracking-[0.25em] text-brand-gold font-semibold block mb-2">
          Legal & Compliance
        </span>
        <h1 class="font-serif text-3xl sm:text-4xl text-brand-charcoal font-normal">
          Privacy Policy & Terms of Service
        </h1>
        <p class="text-xs text-brand-muted mt-2">
          Effective Date: November 2026 · Compliant with Payment Provider & Advertising Standards
        </p>
      </div>

      <div class="space-y-10 text-xs sm:text-sm text-brand-charcoal font-light leading-relaxed">
        <!-- 1. Introduction -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">01.</span>
            <span>Introduction & Scope</span>
          </h2>
          <p>
            Welcome to K. Fabrics ("we," "our," or "us"). We respect your privacy and are committed to protecting the personal data of our customers. 
            This Privacy Policy and Terms of Service explains how we collect, utilize, store, and safeguard your information when you browse our website, 
            purchase ready-to-wear garments, or submit custom tailoring measurement profiles.
          </p>
        </section>

        <!-- 2. Data We Collect -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">02.</span>
            <span>Information We Collect</span>
          </h2>
          <p>We collect only the essential information necessary to deliver exceptional garments to your doorstep:</p>
          <ul class="list-disc pl-5 space-y-1.5 text-brand-muted">
            <li><strong class="text-brand-charcoal font-medium">Contact & Shipping Details:</strong> Full name, telephone number (for SMS/WhatsApp delivery updates), email address, and complete physical delivery address with city and postal code.</li>
            <li><strong class="text-brand-charcoal font-medium">Measurement Data:</strong> Body measurements (shirt length, chest, waist, hips, etc.) submitted for Bespoke Stitching or saved in your account profile.</li>
            <li><strong class="text-brand-charcoal font-medium">Transaction Records:</strong> Order history, payment method, payment status, and order tracking numbers. We <span class="font-medium text-brand-charcoal">never</span> store your debit/credit card numbers or banking passwords on our servers.</li>
            <li><strong class="text-brand-charcoal font-medium">Device & Usage Information:</strong> Basic request information such as IP address or browser type can appear in service logs used to operate and protect the store.</li>
          </ul>
        </section>

        <!-- 3. Essential Cookies -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">03.</span>
            <span>Cookies & Shopping Bag</span>
          </h2>
          <p>We use essential cookies to keep you signed in and protect checkout. Your browser can remember ordinary items in your shopping bag. Tailoring measurements and design reference photos in the bag are not written to browser storage. Refreshing or closing the tab clears unfinished tailoring bookings. Saved account measurement profiles can be loaded again.</p>
          <p>Advertising pixels and abandoned-cart marketing are not enabled on this storefront.</p>
        </section>

        <!-- 4. Data Sharing & Security -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">04.</span>
            <span>Third-Party Sharing & Security</span>
          </h2>
          <p>
            <strong class="font-semibold text-brand-charcoal">We do not sell, rent, or lease your personal information to third parties.</strong> 
            Your shipping details are shared strictly with our contracted courier partners (Trax, Call Courier, TCS, Leopards) solely for the purpose of parcel delivery.
          </p>
          <p>
            We protect account and order details using access controls. Keep your order tracking code private.
          </p>
        </section>

        <!-- 5. Terms of Service -->
        <section class="space-y-3">
          <h2 class="font-serif text-lg sm:text-xl font-semibold text-brand-charcoal flex items-center space-x-2">
            <span class="text-brand-gold font-mono text-sm">05.</span>
            <span>Terms of Service & Atelier Rules</span>
          </h2>
          <ul class="list-disc pl-5 space-y-2 text-brand-muted">
            <li><strong class="text-brand-charcoal font-medium">Pricing & Stock:</strong> All prices are displayed in Pakistani Rupees (PKR) and are inclusive of standard local taxes. We reserve the right to correct accidental pricing or typographical errors.</li>
            <li><strong class="text-brand-charcoal font-medium">Custom Tailoring Accuracy:</strong> While our master ateliers adhere to high precision tolerances (±0.5 inches), slight nuances may occur due to the organic drape of natural fabrics (pure lawn vs. heavy raw silk).</li>
            <li><strong class="text-brand-charcoal font-medium">Intellectual Property:</strong> All imagery, photography, styling, bespoke patterns, and branding displayed on kfabrics.com are the exclusive intellectual property of K. Fabrics. Unauthorized reproduction or commercial use is prohibited.</li>
          </ul>
        </section>

        <!-- 6. Inquiries -->
        <section class="pt-6 border-t border-brand-border">
          <p class="font-serif text-base text-brand-charcoal font-semibold mb-1">Privacy Officer & Legal Inquiries</p>
          <p v-if="emailHref" class="text-xs text-brand-muted">
            For privacy questions or a profile deletion request, contact
            <a :href="emailHref" class="text-brand-charcoal font-medium underline">{{ email }}</a>.
          </p>
          <p v-else class="text-xs text-brand-muted">
            For privacy questions or a profile deletion request, use the verified support contact provided with your order. Do not send your private order tracking code.
          </p>
        </section>
      </div>
    </article>
  </div>
</template>
