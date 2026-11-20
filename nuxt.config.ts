// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxtjs/google-fonts',
    '@nuxt/image',
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:8000/api/v1',
      metaPixelId: process.env.NUXT_PUBLIC_META_PIXEL_ID || '',
      tiktokPixelId: process.env.NUXT_PUBLIC_TIKTOK_PIXEL_ID || '',
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL || 'https://kfabrics.com',
    },
  },

  googleFonts: {
    families: {
      'Playfair+Display': [400, 500, 600, 700],
      'Plus+Jakarta+Sans': [300, 400, 500, 600, 700],
    },
    display: 'swap',
  },

  image: {
    domains: [
      'images.unsplash.com',
      'localhost',
      '127.0.0.1',
    ],
  },

  app: {
    head: {
      title: 'K. Fabrics | Minimalist Luxury Ladies Clothing & Custom Fitting',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          name: 'description',
          content: 'Timeless Silhouettes, Tailored to You. Luxury Ready-to-Wear Ladies Pret and Standalone Custom Tailoring across Pakistan.',
        },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
      ],
    },
  },
})
