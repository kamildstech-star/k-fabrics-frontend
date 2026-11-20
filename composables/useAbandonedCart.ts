import { ref } from 'vue'
import { useCartStore } from '~/stores/cart'

export const useAbandonedCart = () => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
  const cart = useCartStore()

  const sessionToken = ref<string>('')
  const isSyncing = ref(false)
  const isOptedOut = ref(false)
  let syncTimeout: any = null

  // Initialize or generate persistent session token
  const getOrCreateSessionToken = (): string => {
    if (import.meta.client) {
      let token = localStorage.getItem('k_fabrics_cart_session')
      if (!token) {
        token = 'cart_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36)
        localStorage.setItem('k_fabrics_cart_session', token)
      }
      sessionToken.value = token
      return token
    }
    return ''
  }

  // Debounced sync cart data to backend
  const syncCart = (customerInfo?: { name?: string; phone?: string; email?: string }) => {
    if (!import.meta.client || isOptedOut.value) return
    const token = sessionToken.value || getOrCreateSessionToken()
    if (!token) return

    if (syncTimeout) {
      clearTimeout(syncTimeout)
    }

    syncTimeout = setTimeout(async () => {
      if (cart.items.length === 0) return

      isSyncing.value = true
      try {
        await $fetch(`${apiBase}/cart/sync`, {
          method: 'POST',
          body: {
            session_token: token,
            customer_name: customerInfo?.name || null,
            customer_phone: customerInfo?.phone || null,
            customer_email: customerInfo?.email || null,
            cart_items: cart.items.map(item => ({
              id: item.id,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              size: item.size,
              color: item.color,
              productId: item.productId,
              variantId: item.variantId,
              addonId: item.addonId,
              isAddon: item.isAddon,
              image: item.image,
            })),
            subtotal: cart.subtotal,
          },
        })
      } catch (err) {
        // Silently fail for background analytics sync
      } finally {
        isSyncing.value = false
      }
    }, 1500)
  }

  // Recover an abandoned cart by token
  const recoverCart = async (token: string) => {
    try {
      const res = await $fetch<any>(`${apiBase}/cart/recover/${encodeURIComponent(token)}`)
      if (res.success && res.data) {
        const data = res.data

        // Update local session token
        if (import.meta.client) {
          localStorage.setItem('k_fabrics_cart_session', token)
        }
        sessionToken.value = token

        // Restore items to Pinia store if available
        if (Array.isArray(data.cart_items) && data.cart_items.length > 0) {
          cart.setCartItems(data.cart_items)
        }

        return {
          customer_name: data.customer_name || '',
          customer_phone: data.customer_phone || '',
          customer_email: data.customer_email || '',
          cart_items: data.cart_items || [],
          subtotal: data.subtotal || 0,
        }
      }
    } catch (err) {
      console.error('Failed to recover cart session:', err)
    }
    return null
  }

  // Customer opt-out
  const optOut = async () => {
    const token = sessionToken.value || getOrCreateSessionToken()
    try {
      await $fetch(`${apiBase}/cart/opt-out`, {
        method: 'POST',
        body: { session_token: token },
      })
      isOptedOut.value = true
    } catch (e) {
      // ignore
    }
  }

  return {
    sessionToken,
    isSyncing,
    isOptedOut,
    getOrCreateSessionToken,
    syncCart,
    recoverCart,
    optOut,
  }
}
