// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  // Keep the existing root-level pages, components and stores on Nuxt 4.
  srcDir: '.',

  css: [
    '@fontsource-variable/playfair-display',
    '@fontsource-variable/plus-jakarta-sans',
    '@fontsource-variable/noto-sans-arabic',
    '~/assets/css/main.css',
  ],

  modules: [
    '@nuxtjs/tailwindcss',
    '@nuxt/image',
    '@pinia/nuxt',
  ],

  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:8000/api/v1',
      siteUrl: 'https://kfabrics.com',
      supportEmail: '',
      supportWhatsapp: '',
      heroImage: '',
    },
  },

  image: {
    domains: [
      'images.unsplash.com',
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
