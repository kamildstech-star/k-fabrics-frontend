import { defineStore } from 'pinia'

export interface CustomFittingMeasurements {
  unit: 'inches' | 'cm'
  shirt_length?: number | null
  shoulder?: number | null
  chest?: number | null
  waist?: number | null
  hips?: number | null
  sleeve_length?: number | null
  armhole?: number | null
  daman?: number | null
  neck_front?: number | null
  neck_back?: number | null
  trouser_length?: number | null
  trouser_waist?: number | null
  pancha?: number | null
  neck_style?: string
  sleeve_style?: string
  trouser_style?: string
  special_instructions?: string
}

export interface CartItem {
  id: string
  type: 'product' | 'stitching'
  productId?: number
  variantId?: number
  serviceId?: number
  name: string
  slug?: string
  size?: string
  color?: string
  price: number
  image?: string
  quantity: number
  estimatedDays?: number
  customFitting?: CustomFittingMeasurements | null
  fabricDeliveryMethod?: string
  designReferenceImage?: string | null
  neckStyle?: string
  sleeveStyle?: string
  trouserStyle?: string
  specialInstructions?: string
  measurements?: CustomFittingMeasurements | null
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    isOpen: false,
  }),

  getters: {
    totalItems: (state): number => {
      return state.items.reduce((total, item) => total + item.quantity, 0)
    },

    subtotal: (state): number => {
      return state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
    },

    hasTailoring: (state): boolean => {
      return state.items.some(item => 
        item.type === 'stitching' || (item.type === 'product' && Boolean(item.customFitting))
      )
    },

    shippingFee: (state): number => {
      const subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0)
      if (subtotal === 0) return 0
      return subtotal >= 5000 ? 0 : 250
    },

    totalAmount(): number {
      return this.subtotal + this.shippingFee
    },
  },

  actions: {
    initCart() {
      if (import.meta.client) {
        try {
          const saved = localStorage.getItem('k_fabrics_cart')
          if (saved) {
            this.items = JSON.parse(saved)
          }
        } catch (e) {
          console.error('Failed to parse cart from localStorage', e)
        }
      }
    },

    persist() {
      if (import.meta.client) {
        try {
          localStorage.setItem('k_fabrics_cart', JSON.stringify(this.items))
        } catch (e) {
          console.error('Failed to save cart to localStorage', e)
        }
      }
    },

    toggleCart(open?: boolean) {
      this.isOpen = open !== undefined ? open : !this.isOpen
    },

    openCart() {
      this.isOpen = true
    },

    closeCart() {
      this.isOpen = false
    },

    addProduct(product: {
      productId: number
      variantId: number
      name: string
      slug: string
      size: string
      color?: string
      price: number
      image?: string
      quantity?: number
      customFitting?: CustomFittingMeasurements | null
    }) {
      const isCustom = Boolean(product.customFitting)
      const qty = product.quantity || 1

      if (!isCustom) {
        // Standard item - check if identical line item already exists
        const existing = this.items.find(
          item => item.type === 'product' && item.variantId === product.variantId && !item.customFitting
        )
        if (existing) {
          existing.quantity += qty
          this.persist()
          this.openCart()
          return
        }
      }

      // Add as new line item
      const lineId = `product-${product.productId}-${product.variantId}-${Date.now()}`
      this.items.push({
        id: lineId,
        type: 'product',
        productId: product.productId,
        variantId: product.variantId,
        name: product.name,
        slug: product.slug,
        size: product.size,
        color: product.color,
        price: product.price,
        image: product.image,
        quantity: qty,
        customFitting: product.customFitting || null,
      })

      this.persist()
      this.openCart()
    },

    addStitchingService(booking: {
      serviceId: number
      serviceName: string
      price: number
      estimatedDays: number
      fabricDeliveryMethod?: string
      designReferenceImage?: string | null
      neckStyle?: string
      sleeveStyle?: string
      trouserStyle?: string
      specialInstructions?: string
      measurements?: CustomFittingMeasurements | null
    }) {
      const lineId = `stitching-${booking.serviceId}-${Date.now()}`
      this.items.push({
        id: lineId,
        type: 'stitching',
        serviceId: booking.serviceId,
        name: booking.serviceName,
        price: booking.price,
        quantity: 1,
        estimatedDays: booking.estimatedDays,
        fabricDeliveryMethod: booking.fabricDeliveryMethod,
        designReferenceImage: booking.designReferenceImage,
        neckStyle: booking.neckStyle,
        sleeveStyle: booking.sleeveStyle,
        trouserStyle: booking.trouserStyle,
        specialInstructions: booking.specialInstructions,
        measurements: booking.measurements,
      })

      this.persist()
      this.openCart()
    },

    updateQuantity(id: string, delta: number) {
      const item = this.items.find(i => i.id === id)
      if (!item) return

      const newQty = item.quantity + delta
      if (newQty <= 0) {
        this.removeItem(id)
      } else {
        item.quantity = newQty
        this.persist()
      }
    },

    removeItem(id: string) {
      this.items = this.items.filter(i => i.id !== id)
      this.persist()
    },

    clearCart() {
      this.items = []
      this.persist()
    },
  },
})
