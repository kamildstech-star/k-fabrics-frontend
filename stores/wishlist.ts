import { defineStore } from 'pinia'
import { useAuthStore } from './auth'

export interface WishlistProduct {
  id: number
  name: string
  slug: string
  fabric_type: string
  piece_type: string
  base_price: number
  sale_price?: number | null
  primary_image?: string
  hover_image?: string
  is_featured?: boolean
  variants?: Array<{
    id: number
    size: string
    stock_quantity: number
    is_active: boolean
  }>
}

const guestKey = 'k_fabrics_guest_wishlist_v2'

export const useWishlistStore = defineStore('wishlist', {
  state: () => ({
    productIds: [] as number[],
    items: [] as WishlistProduct[],
    isLoading: false,
    initialized: false,
  }),

  getters: {
    totalItems: (state): number => state.productIds.length,
    isInWishlist: (state) => (productId: number): boolean => state.productIds.includes(productId),
  },

  actions: {
    async initWishlist() {
      if (this.initialized || !import.meta.client) return
      const auth = useAuthStore()
      await auth.initAuth()
      if (this.initialized) return
      this.initialized = true
      if (auth.isAuthenticated) await this.syncWithBackend()
      else this.resetForGuest()
    },

    readGuest(): WishlistProduct[] {
      if (!import.meta.client) return []
      try {
        const items: unknown = JSON.parse(localStorage.getItem(guestKey) || '[]')
        return Array.isArray(items) ? items.filter((item) => Number.isInteger(item?.id)) : []
      } catch {
        return []
      }
    },

    resetForGuest() {
      this.items = this.readGuest()
      this.productIds = this.items.map(item => item.id)
    },

    persistGuest() {
      if (!import.meta.client) return
      try {
        localStorage.setItem(guestKey, JSON.stringify(this.items))
      } catch { /* Storage can be disabled. */ }
    },

    async syncWithBackend() {
      const auth = useAuthStore()
      const userId = auth.user?.id
      if (!userId || this.isLoading) return

      this.isLoading = true
      try {
        const guestItems = this.readGuest()
        if (guestItems.length) {
          const server = await auth.apiFetch<{ product_ids: number[] }>('/user/wishlist/ids')
          const ids = new Set(server.product_ids)
          for (const local of guestItems) {
            if (auth.user?.id !== userId) return
            if (ids.has(local.id)) continue
            await auth.apiFetch('/user/wishlist/toggle', { method: 'POST', body: { product_id: local.id } })
            ids.add(local.id)
          }
          if (auth.user?.id !== userId) return
          try { localStorage.removeItem(guestKey) } catch { /* Storage can be disabled. */ }
        }
        const response = await auth.apiFetch<{ data: WishlistProduct[] }>('/user/wishlist')
        if (auth.user?.id !== userId) return
        this.items = response.data
        this.productIds = response.data.map(item => item.id)
      } catch {
        // Leave the existing wishlist unchanged if it cannot be synchronized.
      } finally {
        this.isLoading = false
      }
    },

    async toggle(product: WishlistProduct) {
      const auth = useAuthStore()
      const userId = auth.user?.id
      if (this.isLoading) return

      if (!userId) {
        this.items = this.isInWishlist(product.id)
          ? this.items.filter(item => item.id !== product.id)
          : [...this.items, product]
        this.productIds = this.items.map(item => item.id)
        this.persistGuest()
        return
      }

      this.isLoading = true
      try {
        const response = await auth.apiFetch<{ product_ids: number[] }>('/user/wishlist/toggle', {
          method: 'POST', body: { product_id: product.id },
        })
        if (auth.user?.id !== userId) return
        this.productIds = response.product_ids
        this.items = this.items.filter(item => this.productIds.includes(item.id))
        if (this.isInWishlist(product.id) && !this.items.some(item => item.id === product.id)) this.items.push(product)
      } catch {
        // Keep the last server-confirmed state on failure.
      } finally {
        this.isLoading = false
      }
    },

    async remove(productId: number) {
      const product = this.items.find(item => item.id === productId)
      if (product) await this.toggle(product)
    },

    async clearWishlist() {
      const auth = useAuthStore()
      if (!auth.isAuthenticated) {
        this.items = []
        this.productIds = []
        this.persistGuest()
        return
      }
      for (const product of [...this.items]) {
        if (!auth.isAuthenticated) return
        await this.remove(product.id)
      }
    },
  },
})
