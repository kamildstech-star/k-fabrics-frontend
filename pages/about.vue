<script setup lang="ts">
useSeoMeta({
  title: 'Our Craft & Heritage | K. Fabrics Pakistan',
  description: 'Discover the story of K. Fabrics — rooted in Faisalabad, Pakistan. Master tailoring craftsmanship, pure unadulterated fabrics, and bespoke atelier fitting for the modern woman.',
  ogTitle: 'Our Craft & Heritage | K. Fabrics Minimalist Luxury',
  ogDescription: 'From pure organic lawn to bespoke tailor ateliers in Pakistan. Discover our heritage of slow fashion and master craftsmanship.',
  ogImage: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1200&q=80',
  twitterCard: 'summary_large_image',
})
</script>

<template>
  <div class="bg-brand-white min-h-screen">
    <!-- Breadcrumb -->
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
      <nav class="flex items-center space-x-2 text-[10px] uppercase tracking-luxury text-brand-muted">
        <NuxtLink to="/" class="hover:text-brand-charcoal transition-colors">Home</NuxtLink>
        <span>/</span>
        <span class="text-brand-charcoal font-semibold">About Us</span>
      </nav>
    </div>

    <!-- Editorial Hero -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
      <span class="text-[11px] uppercase tracking-[0.3em] text-brand-gold font-semibold block mb-3">
        The K. Fabrics Atelier
      </span>
      <h1 class="font-serif text-3xl sm:text-5xl lg:text-6xl text-brand-charcoal font-normal max-w-4xl mx-auto leading-tight">
        Pure Textures. Tailored Mastery. Timeless Silhouettes.
      </h1>
      <p class="mt-6 text-xs sm:text-sm text-brand-muted max-w-2xl mx-auto leading-relaxed font-light">
        Born in the textile heart of Pakistan, K. Fabrics was founded on an unapologetic standard: 
        never compromise on the purity of the weave, and treat every stitched garment as an individual bespoke commission.
      </p>
    </section>

    <!-- Visual Story Split 1 -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div class="lg:col-span-6 relative aspect-[4/5] bg-brand-cream overflow-hidden border border-brand-border">
          <img
            src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=80"
            alt="Artisanal Fabric Weaving"
            class="w-full h-full object-cover"
          >
          <div class="absolute bottom-4 left-4 bg-brand-white/95 px-4 py-2 border border-brand-border text-[10px] uppercase tracking-luxury font-medium text-brand-charcoal">
            Textile Roots · Faisalabad, Pakistan
          </div>
        </div>

        <div class="lg:col-span-6 space-y-6">
          <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block">
            Chapter 01 · The Fiber Standard
          </span>
          <h2 class="font-serif text-2xl sm:text-4xl text-brand-charcoal leading-snug">
            Weaving with Zero Synthetic Fillers
          </h2>
          <p class="text-xs sm:text-sm text-brand-muted leading-relaxed font-light">
            In an era dominated by rapid synthetic blends and disposable fast-fashion polyester, 
            K. Fabrics takes a defiant stance. Our combed organic lawn is spun from premium long-staple cotton, 
            breathing effortlessly through Pakistan’s sweltering summers.
          </p>
          <p class="text-xs sm:text-sm text-brand-muted leading-relaxed font-light">
            From our weighted raw silk co-ords with hand-dyed earthy undertones to our featherlight festive chiffons, 
            each textile is rigorously tested for drape, washability, and colorfastness before reaching the cutting room.
          </p>
          <div class="pt-4 border-t border-brand-border grid grid-cols-2 gap-4">
            <div>
              <p class="font-serif text-2xl text-brand-charcoal font-bold">100%</p>
              <p class="text-[11px] uppercase tracking-wider text-brand-muted">Pure Natural Fibers</p>
            </div>
            <div>
              <p class="font-serif text-2xl text-brand-charcoal font-bold">AATCC</p>
              <p class="text-[11px] uppercase tracking-wider text-brand-muted">Colorfast Certified</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Visual Story Split 2 -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-brand-cream/40 my-12 border-y border-brand-border">
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div class="lg:col-span-6 order-2 lg:order-1 space-y-6">
          <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block">
            Chapter 02 · The Bespoke Atelier
          </span>
          <h2 class="font-serif text-2xl sm:text-4xl text-brand-charcoal leading-snug">
            Precision Tailoring, Individualized to You
          </h2>
          <p class="text-xs sm:text-sm text-brand-muted leading-relaxed font-light">
            No two women possess the same silhouette, yet mass-produced off-the-rack sizing forces compromise. 
            At K. Fabrics, our master tailors (*Ustaads*) bridge centuries of eastern dressmaking tradition with modern minimalist design.
          </p>
          <p class="text-xs sm:text-sm text-brand-muted leading-relaxed font-light">
            Whether selecting standard Pret or entering your bespoke measurements for a modest +Rs. 300 surcharge, 
            every seam is reinforced with double French stitching, matched thread counts, and organza hem inlays.
          </p>
          <div class="pt-2">
            <NuxtLink
              to="/stitching"
              class="inline-flex items-center px-6 py-3 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors font-medium space-x-2"
            >
              <span>Explore Bespoke Stitching</span>
              <span>→</span>
            </NuxtLink>
          </div>
        </div>

        <div class="lg:col-span-6 order-1 lg:order-2 relative aspect-[4/5] bg-brand-cream overflow-hidden border border-brand-border">
          <img
            src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1000&q=80"
            alt="Tailoring Atelier Craftsmanship"
            class="w-full h-full object-cover"
          >
          <div class="absolute bottom-4 right-4 bg-brand-white/95 px-4 py-2 border border-brand-border text-[10px] uppercase tracking-luxury font-medium text-brand-charcoal">
            The Cutting Table · Master Pattern Drafting
          </div>
        </div>
      </div>
    </section>

    <!-- 3 Pillars of K. Fabrics -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div class="text-center max-w-xl mx-auto mb-12">
        <span class="text-[10px] uppercase tracking-luxury text-brand-gold font-semibold block mb-2">
          Core Commitments
        </span>
        <h3 class="font-serif text-2xl sm:text-3xl text-brand-charcoal">
          The Three Pillars of Our Promise
        </h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="p-8 border border-brand-border bg-brand-cream/20 space-y-3">
          <span class="text-xs font-mono text-brand-gold font-bold">01 / INTEGRITY</span>
          <h4 class="font-serif text-lg text-brand-charcoal font-semibold">Authentic Fabrics Only</h4>
          <p class="text-xs text-brand-muted leading-relaxed font-light">
            Every thread count, fabric composition, and dye method stated on our product pages is exact. What you read is what touches your skin.
          </p>
        </div>

        <div class="p-8 border border-brand-border bg-brand-cream/20 space-y-3">
          <span class="text-xs font-mono text-brand-gold font-bold">02 / ARTISAN FAIRNESS</span>
          <h4 class="font-serif text-lg text-brand-charcoal font-semibold">Dignified Craftsmanship</h4>
          <p class="text-xs text-brand-muted leading-relaxed font-light">
            Our atelier masters, stitchers, and hand-embroiders earn fair living wages in comfortable, well-lit workshops, upholding generational pride.
          </p>
        </div>

        <div class="p-8 border border-brand-border bg-brand-cream/20 space-y-3">
          <span class="text-xs font-mono text-brand-gold font-bold">03 / FIT GUARANTEE</span>
          <h4 class="font-serif text-lg text-brand-charcoal font-semibold">Post-Delivery Fit Care</h4>
          <p class="text-xs text-brand-muted leading-relaxed font-light">
            Should your bespoke tailored garment require slight fine-tuning, our atelier provides complimentary alteration support within 7 days.
          </p>
        </div>
      </div>
    </section>

    <!-- Bottom CTA Strip -->
    <section class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center border-t border-brand-border">
      <h3 class="font-serif text-2xl sm:text-3xl text-brand-charcoal mb-4">
        Experience the Art of Eastern Tailoring
      </h3>
      <p class="text-xs text-brand-muted max-w-md mx-auto mb-6">
        Browse our newest Pret collection or submit your unstitched fabric for expert atelier finishing.
      </p>
      <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
        <NuxtLink
          to="/shop"
          class="w-full sm:w-auto px-8 py-3.5 bg-brand-charcoal text-white text-xs uppercase tracking-luxury hover:bg-brand-gold transition-colors font-medium"
        >
          View Collection
        </NuxtLink>
        <NuxtLink
          to="/stitching"
          class="w-full sm:w-auto px-8 py-3.5 bg-white border border-brand-charcoal text-brand-charcoal text-xs uppercase tracking-luxury hover:bg-brand-cream transition-colors font-medium"
        >
          Book Custom Stitching
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
