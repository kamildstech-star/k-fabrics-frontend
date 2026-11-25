export type FacetOption = { id: string; label: string }
export type ProductFacets = {
  sizes: FacetOption[]
  fabrics: FacetOption[]
  pieces: FacetOption[]
  colors: FacetOption[]
  categories?: FacetOption[]
}
export type FilterKey = 'category' | 'size' | 'fabric_type' | 'piece_type' | 'color'
export type FilterGroup = { key: FilterKey; name: string; options: FacetOption[] }
export type CatalogSort = 'relevance' | 'newest' | 'price_asc' | 'price_desc'

export const searchMaxLength = 100
export const searchMinLength = 2
export const normalizedFacet = (value: string) =>
  value.trim().toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean).join('-')
export const normalizeDiscoverySearch = (value: string) => value.trim().replace(/\s+/g, ' ').slice(0, searchMaxLength).trim()

export const defaultCatalogSort = (search: string): CatalogSort => search ? 'relevance' : 'newest'

export function catalogSort(value: string, search: string): CatalogSort {
  if (value === 'price_asc' || value === 'price_desc' || value === 'newest') return value
  return defaultCatalogSort(search)
}

export function priceRange(min: string, max: string) {
  for (const value of [min, max]) {
    if (value && (!/^\d+(?:\.\d{1,2})?$/.test(value) || Number(value) > 99_999_999)) {
      throw new Error('Enter a valid nonnegative price in rupees, with up to two decimal places.')
    }
  }
  if (min && max && Number(min) > Number(max)) {
    throw new Error('Minimum price cannot be higher than maximum price.')
  }
  return { min, max }
}
