import { readStorefrontLanguage, storefrontLanguageCookie, translateStorefront } from '~/utils/storefront-language'

export default defineNuxtPlugin(() => {
  const preference = useCookie<string | null>(storefrontLanguageCookie, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const language = computed(() => readStorefrontLanguage(preference.value))
  const isUrdu = computed(() => language.value === 'ur')

  if (import.meta.server) {
    const vary = useResponseHeader('Vary')
    if (!vary.value) vary.value = 'Cookie'
    else if (!String(vary.value).split(',').some(value => ['cookie', '*'].includes(value.trim().toLowerCase()))) {
      vary.value = `${vary.value}, Cookie`
    }
  }

  return {
    provide: {
      storefrontLanguage: {
        language,
        isUrdu,
        toggle: () => { preference.value = isUrdu.value ? 'en' : 'ur' },
      },
      tr: (english: string, values?: Record<string, string | number>) => translateStorefront(language.value, english, values),
    },
  }
})
