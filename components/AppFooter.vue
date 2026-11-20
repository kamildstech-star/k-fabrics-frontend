<template>
  <footer class="bg-brand-cream border-t border-brand-border text-brand-charcoal pt-16 pb-12 mt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <!-- 4-Column Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-brand-border">
        <!-- Col 1: Brand Info -->
        <div class="space-y-4">
          <span class="font-serif text-2xl font-bold tracking-luxury text-brand-charcoal uppercase block">
            K. Fabrics
          </span>
          <p class="text-xs text-brand-muted leading-relaxed">
            Minimalist luxury ready-to-wear ladies clothing and bespoke custom tailoring. Crafted with fine organic lawn, linen, and silk for the modern silhouette.
          </p>
          <div class="pt-2 text-xs text-brand-charcoal font-medium">
            <span class="text-brand-gold mr-1">●</span> Nationwide Delivery Across Pakistan
          </div>
        </div>

        <!-- Col 2: Collections -->
        <div>
          <h4 class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal mb-4">
            Collections
          </h4>
          <ul class="space-y-2.5 text-xs text-brand-muted uppercase tracking-wider">
            <li>
              <NuxtLink to="/shop?sort=newest" class="hover:text-brand-charcoal transition-colors">
                New Arrivals
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/shop?category=daily-pret" class="hover:text-brand-charcoal transition-colors">
                Daily Pret
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/shop?category=co-ord-sets" class="hover:text-brand-charcoal transition-colors">
                Co-ord Sets
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/shop?category=festive-edit" class="hover:text-brand-charcoal transition-colors">
                Festive Edit
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/stitching" class="text-brand-gold font-medium hover:underline">
                Custom Tailoring Atelier
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Col 3: Customer Care -->
        <div>
          <h4 class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal mb-4">
            Customer Care
          </h4>
          <ul class="space-y-2.5 text-xs text-brand-muted uppercase tracking-wider">
            <li>
              <NuxtLink to="/track-order" class="hover:text-brand-charcoal transition-colors">
                Track Your Order
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/about" class="hover:text-brand-charcoal transition-colors">
                Our Craft & Atelier
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/policies/returns" class="hover:text-brand-charcoal transition-colors">
                Returns & Exchanges
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/policies/shipping" class="hover:text-brand-charcoal transition-colors">
                Shipping & Delivery
              </NuxtLink>
            </li>
            <li>
              <NuxtLink to="/faq" class="hover:text-brand-charcoal transition-colors">
                FAQs & Contact
              </NuxtLink>
            </li>
          </ul>
        </div>

        <!-- Col 4: Atelier & Support -->
        <div>
          <h4 class="font-serif text-sm font-semibold uppercase tracking-luxury text-brand-charcoal mb-4">
            Concierge & Atelier
          </h4>
          <div class="space-y-3 text-xs text-brand-muted">
            <p>
              <strong class="text-brand-charcoal">Design Studio:</strong><br>
              Gulberg III, Lahore, Pakistan
            </p>
            <p>
              <strong class="text-brand-charcoal">Hours:</strong><br>
              Monday – Saturday, 10:00 AM – 8:00 PM PKT
            </p>
            <p>
              <strong class="text-brand-charcoal">WhatsApp Styling Hotline:</strong><br>
              <a
                href="https://wa.me/923001234567"
                target="_blank"
                class="text-brand-gold font-medium hover:underline inline-block mt-0.5"
              >
                +92 300 1234567
              </a>
            </p>
          </div>
        </div>
      </div>

      <!-- Bottom Credits -->
      <div class="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-brand-muted space-y-4 sm:space-y-0">
        <p>© 2026 K. Fabrics. All rights reserved.</p>
        <div class="flex space-x-6 uppercase tracking-wider text-[10px]">
          <NuxtLink to="/policies/privacy" class="hover:text-brand-charcoal transition-colors">
            Privacy Policy & Terms
          </NuxtLink>
          <NuxtLink to="/policies/returns" class="hover:text-brand-charcoal transition-colors">
            7-Day Exchange
          </NuxtLink>
          <NuxtLink to="/policies/shipping" class="hover:text-brand-charcoal transition-colors">
            Shipping Policy
          </NuxtLink>
        </div>
      </div>
    </div>

    <!-- Floating Luxury WhatsApp Concierge Button -->
    <a
      href="https://wa.me/923001234567?text=Hello%20K.%20Fabrics%2C%20I%20would%20like%20to%20inquire%20about%20your%20collection."
      target="_blank"
      rel="noopener noreferrer"
      class="fixed bottom-6 right-6 z-40 bg-[#25D366] text-white p-3.5 rounded-full shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center group"
      aria-label="Chat on WhatsApp with K. Fabrics concierge"
    >
      <svg class="w-6 h-6 fill-current" viewBox="0 0 24 24">
        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.592 2.654-.696c1.002.547 1.799.821 2.806.821h.005c3.18 0 5.767-2.586 5.768-5.766.001-3.182-2.585-5.77-5.773-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.69.058-1.12-.08-.415-.133-.94-.317-1.616-.615-1.396-.616-2.298-2.025-2.368-2.118-.07-.093-.568-.756-.568-1.442s.36-1.025.488-1.164c.129-.139.281-.174.375-.174s.188.005.27.009c.087.004.204-.033.319.245.12.289.41 1.002.446 1.075.036.073.06.158.01.255-.05.097-.075.158-.15.244-.075.086-.157.192-.224.258-.075.074-.153.155-.066.305.087.15.387.638.83 1.032.571.508 1.052.665 1.202.739.15.074.238.065.326-.036.088-.101.376-.438.476-.588.1-.15.2-.125.337-.074.137.051.874.412 1.024.487.15.075.25.112.287.175.037.063.037.367-.107.772zM12 2C6.477 2 2 6.477 2 12c0 1.891.526 3.66 1.439 5.174L2 22l4.981-1.306C8.423 21.547 10.15 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
      </svg>
      <span class="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-medium pl-0 group-hover:pl-2">
        Chat with Stylist
      </span>
    </a>
  </footer>
</template>
