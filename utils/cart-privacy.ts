import type { CartItem } from '../stores/cart'

// Only ordinary ready-to-wear lines survive reload. Measurements, reference images,
// style instructions and legacy/incomplete add-on records remain out of browser storage.
export function standardCartItems(input: unknown): CartItem[] {
  if (!Array.isArray(input)) return []
  return input.flatMap((item: Partial<CartItem> | null) => {
    if (!item || item.type !== 'product' || item.customFitting || item.isAddon || item.addonId ||
        !Number.isInteger(item.productId) || !Number.isInteger(item.variantId) ||
        typeof item.id !== 'string' || typeof item.name !== 'string' ||
        typeof item.price !== 'number' || !Number.isFinite(item.price) ||
        typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity < 1) return []

    return [{
      id: item.id,
      type: 'product' as const,
      productId: item.productId,
      variantId: item.variantId,
      name: item.name,
      slug: item.slug,
      size: item.size,
      color: item.color,
      price: item.price,
      image: typeof item.image === 'string' && !item.image.startsWith('data:') ? item.image : undefined,
      quantity: item.quantity,
    }]
  })
}
