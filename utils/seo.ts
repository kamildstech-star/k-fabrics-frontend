export const indexableStaticPaths = [
  '/', '/stitching', '/about', '/faq',
  '/policies/returns', '/policies/shipping', '/policies/privacy',
] as const

const fallbackOrigin = 'https://kfabrics.com'

export function storefrontOrigin(siteUrl: unknown): string {
  if (typeof siteUrl === 'string') {
    try {
      const configured = new URL(siteUrl)
      if (['https:', 'http:'].includes(configured.protocol) && !configured.username && !configured.password) {
        return configured.origin
      }
    } catch {
      // Use the configured storefront default, not the incoming request host.
    }
  }
  return fallbackOrigin
}

export function storefrontUrl(siteUrl: unknown, localPath: string): string {
  const origin = storefrontOrigin(siteUrl)
  const normalized = new URL(localPath, origin)
  if (normalized.origin !== origin) throw new Error('Expected a storefront-local URL')
  return normalized.href
}

export function storefrontMediaUrl(raw: unknown, siteUrl: unknown): string | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return
  const source = raw.trim()
  if (source.startsWith('//') || source.includes('\\')) return
  if (!source.startsWith('/') && !/^https?:\/\//i.test(source)) return
  const origin = storefrontOrigin(siteUrl)
  try {
    const image = new URL(source, origin)
    if (image.username || image.password || image.pathname === '/images/product-placeholder.svg') return
    if (image.protocol === 'https:' || (image.protocol === 'http:' && image.origin === origin)) {
      image.hash = ''
      return image.href
    }
  } catch {
    // An invalid optional image must not break a public page.
  }
}

export function collectionPath(category?: string, page = 1): string {
  const query = new URLSearchParams()
  if (category) query.set('category', category)
  if (page > 1) query.set('page', String(page))
  return query.size ? `/shop?${query}` : '/shop'
}

export function upstreamHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return
  const data = error as { statusCode?: unknown; status?: unknown; response?: { status?: unknown } }
  const status = data.response?.status ?? data.statusCode ?? data.status
  return typeof status === 'number' && Number.isInteger(status) ? status : undefined
}

type ProductVariant = {
  size?: string
  is_active?: boolean
  stock_quantity?: number
  price_override?: number | null
}
type ProductPhoto = { is_primary?: boolean; image_url?: string | null }
type ProductSnapshot = {
  id: number
  name: string
  slug: string
  status: string
  description?: string | null
  base_price: number
  sale_price?: number | null
  primary_image?: string | null
  images: ProductPhoto[]
  variants: ProductVariant[]
}

const validPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER / 100
const exactMoney = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 0.00001

function safeSlug(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim() || ['.', '..'].includes(value) || /[\/\\\s]/.test(value)) return false
  try {
    return Boolean(encodeURIComponent(value))
  } catch {
    return false
  }
}

export function productPath(slug: unknown): string | undefined {
  return safeSlug(slug) ? `/products/${encodeURIComponent(slug)}` : undefined
}

function productSnapshot(input: unknown): input is ProductSnapshot {
  if (!input || typeof input !== 'object') return false
  const product = input as Partial<ProductSnapshot>
  return Number.isInteger(product.id)
    && typeof product.name === 'string' && Boolean(product.name.trim())
    && safeSlug(product.slug)
    && product.status === 'active'
    && validPrice(product.base_price)
    && (product.sale_price == null || validPrice(product.sale_price))
    && Array.isArray(product.variants) && product.variants.every(variant => variant && typeof variant === 'object'
      && typeof variant.size === 'string' && typeof variant.is_active === 'boolean'
      && (variant.price_override == null || validPrice(variant.price_override)))
    && (product.primary_image == null || typeof product.primary_image === 'string')
    && Array.isArray(product.images) && product.images.every(image => image && typeof image === 'object'
      && (image.image_url == null || typeof image.image_url === 'string'))
}

export function productPageStatus(input: unknown, error?: unknown): 200 | 404 | 503 {
  if (upstreamHttpStatus(error) === 404) return 404
  if (error || !productSnapshot(input)) return 503
  return 200
}

/** Keep schema literal to the price shown at initial render. For mixed variant
 * prices or custom-only fulfilment, omit the offer instead of guessing a deal. */
export function productSeo(input: unknown, siteUrl: unknown) {
  if (!productSnapshot(input)) return
  const product = input
  const path = productPath(product.slug)
  if (!path) return
  const url = storefrontUrl(siteUrl, path)
  const description = typeof product.description === 'string'
    ? product.description.replace(/\s+/g, ' ').trim()
    : ''
  const imageInputs = [product.images.find(image => image.is_primary)?.image_url, product.primary_image,
    ...product.images.map(image => image.image_url)]
  const images = [...new Set(imageInputs.flatMap(source => {
    const url = storefrontMediaUrl(source, siteUrl)
    return url ? [url] : []
  }))]
  const price = product.sale_price ?? product.base_price
  const activeVariants = product.variants.filter(variant => variant.is_active === true)
  const knownStandard = activeVariants.filter(variant => variant.size && variant.size !== 'Custom')
  const hasCustom = activeVariants.some(variant => variant.size === 'Custom')
  const uniformOffer = exactMoney(price) && knownStandard.length > 0
    && activeVariants.every(variant => Boolean(variant.size))
    && knownStandard.every(variant => {
      const effectivePrice = variant.price_override ?? price
      return validPrice(effectivePrice) && effectivePrice === price
        && typeof variant.stock_quantity === 'number'
        && Number.isInteger(variant.stock_quantity) && variant.stock_quantity >= 0
    })
  const inStock = knownStandard.some(variant => (variant.stock_quantity ?? 0) > 0)
  const offers = uniformOffer && (inStock || !hasCustom)
    ? {
        '@type': 'Offer',
        url,
        priceCurrency: 'PKR',
        price: price.toFixed(2),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      }
    : undefined
  return {
    url,
    title: `${product.name} | K. Fabrics`,
    description: description || undefined,
    primaryImage: images[0],
    schema: {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: product.name,
      url,
      ...(description ? { description } : {}),
      ...(images.length ? { image: images } : {}),
      ...(offers ? { offers } : {}),
    },
  }
}

export function seoJson(data: object): string {
  // JSON-LD is inserted into a script text node. Keep catalog text from
  // ever being interpreted as HTML, while retaining its exact JSON value.
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, char =>
    `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`)
}
