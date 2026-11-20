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

export const useWishlistStore = defineStore('wishlist', {
  state: () => ({
    productIds: [] as number[],
    items: [] as WishlistProduct[],
    isLoading: false,
    initialized: false,
  }),

  getters: {
    totalItems: (state): number => state.productIds.length,
    isInWishlist: (state) => (productId: number): boolean => {
      return state.productIds.includes(productId)
    },
  },

  actions: {
    async initWishlist() {
      if (this.initialized) return

      const auth = useAuthStore()

      // 1. Load local guest wishlist
      if (import.meta.client) {
        try {
          const savedIds = localStorage.getItem('k_fabrics_wishlist_ids')
          const savedItems = localStorage.getItem('k_fabrics_wishlist_items')
          if (savedIds) this.productIds = JSON.parse(savedIds)
          if (savedItems) this.items = JSON.parse(savedItems)
        } catch (e) {
          console.error('Failed to parse wishlist from localStorage', e)
        }
      }

      // 2. If authenticated, sync with backend
      if (auth.token) {
        await this.syncWithBackend()
      }

      this.initialized = true
    },

    persistLocal() {
      if (import.meta.client) {
        try {
          localStorage.setItem('k_fabrics_wishlist_ids', JSON.stringify(this.productIds))
          localStorage.setItem('k_fabrics_wishlist_items', JSON.stringify(this.items))
        } catch (e) {
          console.error('Failed to save wishlist to localStorage', e)
        }
      }
    },

    async syncWithBackend() {
      const auth = useAuthStore()
      if (!auth.token) return

      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

      this.isLoading = true
      try {
        // First sync any guest IDs that aren't yet on server
        if (this.productIds.length > 0) {
          const idsRes = await $fetch<any>(`${apiBase}/user/wishlist/ids`, {
            headers: {
              Authorization: `Bearer ${auth.token}`,
              Accept: 'application/json',
            },
          })
          const serverIds: number[] = idsRes.product_ids || []

          for (const localId of this.productIds) {
            if (!serverIds.includes(localId)) {
              await $fetch<any>(`${apiBase}/user/wishlist/toggle`, {
                method: 'POST',
                body: { product_id: localId },
                headers: {
                  Authorization: `Bearer ${auth.token}`,
                  Accept: 'application/json',
                },
              })
            }
          }
        }

        // Now load full wishlist from server
        const res = await $fetch<any>(`${apiBase}/user/wishlist`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            Accept: 'application/json',
          },
        })

        const serverItems = res.data || []
        this.items = serverItems
        this.productIds = serverItems.map((p: any) => p.id)
        this.persistLocal()
      } catch (e) {
        console.error('Failed to sync wishlist with backend', e)
      } finally {
        this.isLoading = false
      }
    },

    async toggle(product: WishlistProduct) {
      const auth = useAuthStore()
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

      const index = this.productIds.indexOf(product.id)

      if (index > -1) {
        // Remove locally
        this.productIds.splice(index, 1)
        this.items = this.items.filter(item => item.id !== product.id)
      } else {
        // Add locally
        this.productIds.push(product.id)
        if (!this.items.some(item => item.id === product.id)) {
          this.items.push(product)
        }
      }
      this.persistLocal()

      // If user is logged in, sync to backend
      if (auth.token) {
        try {
          const res = await $fetch<any>(`${apiBase}/user/wishlist/toggle`, {
            method: 'POST',
            body: { product_id: product.id },
            headers: {
              Authorization: `Bearer ${auth.token}`,
              Accept: 'application/json',
            },
          })
          if (res.product_ids) {
            this.productIds = res.product_ids
            this.persistLocal()
          }
        } catch (e) {
          console.error('Failed to toggle wishlist on backend', e)
        }
      }
    },

    async remove(productId: number) {
      const auth = useAuthStore()
      const config = useRuntimeConfig()
      const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'

      this.productIds = this.productIds.filter(id => id !== productId)
      this.items = this.items.filter(item => item.id !== productId)
      this.persistLocal()

      if (auth.token) {
        try {
          await $fetch<any>(`${apiBase}/user/wishlist/toggle`, {
            method: 'POST',
            body: { product_id: productId },
            headers: {
              Authorization: `Bearer ${auth.token}`,
              Accept: 'application/json',
            },
          })
        } catch (e) {
          console.error('Failed to remove item from wishlist on backend', e)
        }
      }
    },

    clearWishlist() {
      this.productIds = []
      this.items = []
      this.persistLocal()
    },
  },
})
