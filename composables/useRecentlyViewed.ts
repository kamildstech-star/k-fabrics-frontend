export interface RecentlyViewedItem {
  id: number
  name: string
  slug: string
  fabric_type: string
  piece_type: string
  base_price: number
  sale_price?: number | null
  primary_image?: string
  hover_image?: string
  variants?: Array<{
    id: number
    size: string
    stock_quantity: number
    is_active: boolean
  }>
}

const STORAGE_KEY = 'k_fabrics_recently_viewed'
const MAX_STORED = 8

export const useRecentlyViewed = () => {
  const items = useState<RecentlyViewedItem[]>('recently_viewed_items', () => [])

  const loadFromStorage = () => {
    if (import.meta.server) return
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        items.value = JSON.parse(raw)
      }
    } catch (e) {
      console.warn('Failed to parse recently viewed products', e)
    }
  }

  const recordView = (product: RecentlyViewedItem) => {
    if (import.meta.server || !product || !product.id) return

    try {
      loadFromStorage()
      // Remove if already present so it moves to index 0
      const filtered = items.value.filter(item => item.id !== product.id)
      const updated = [product, ...filtered].slice(0, MAX_STORED)
      items.value = updated
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    } catch (e) {
      console.warn('Failed to save recently viewed product', e)
    }
  }

  const getRecent = (excludeId?: number, limit = 4): RecentlyViewedItem[] => {
    loadFromStorage()
    return items.value
      .filter(item => item.id !== excludeId)
      .slice(0, limit)
  }

  const clearAll = () => {
    if (import.meta.server) return
    items.value = []
    localStorage.removeItem(STORAGE_KEY)
  }

  return {
    items,
    recordView,
    getRecent,
    loadFromStorage,
    clearAll,
  }
}
