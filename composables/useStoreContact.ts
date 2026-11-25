/** Public support contacts supplied by the store operator at deployment. */
export const useStoreContact = () => {
  const config = useRuntimeConfig()
  const email = computed(() => {
    const value = String(config.public.supportEmail || '').trim()
    return /^[a-z0-9.!_+%-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value) ? value : null
  })
  const emailHref = computed(() => (email.value ? `mailto:${email.value}` : null))
  const whatsappNumber = computed(() => {
    const value = String(config.public.supportWhatsapp || '').trim()
    if (!/^\+?[\d ().-]+$/.test(value)) return null
    const digits = value.replace(/\D/g, '')
    return /^[1-9]\d{7,14}$/.test(digits) ? digits : null
  })

  function whatsapp(message?: string): string | null {
    if (!whatsappNumber.value) return null
    const base = `https://wa.me/${whatsappNumber.value}`
    return message ? `${base}?text=${encodeURIComponent(message)}` : base
  }

  return { email, emailHref, whatsappNumber, whatsapp }
}
