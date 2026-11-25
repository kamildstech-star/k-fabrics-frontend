import { collectionPath, indexableStaticPaths, productPath, storefrontMediaUrl, storefrontUrl } from '~/utils/seo'

type SitemapEntry = { loc: string; image?: string }
type CatalogProduct = {
  slug: string
  primary_image?: string | null
  images?: { image_url: string }[]
  category?: { slug: string }
}
type CatalogCategory = { slug: string; children?: CatalogCategory[] }

export default defineEventHandler(async (event) => {
  const { public: { apiBase, siteUrl } } = useRuntimeConfig()
  const products = new Map<string, SitemapEntry>()
  const populated = new Set<string>()
  const collections = new Set<string>()
  const requestDeadline = AbortSignal.timeout(5000)
  let complete = true

  try {
    let page = 1
    let lastPage = 1
    do {
      const response: { data: CatalogProduct[], meta?: { last_page: number } } = await $fetch(
        `${apiBase}/products`,
        { params: { page, per_page: 100 }, signal: requestDeadline, retry: 0 },
      )
      if (!Array.isArray(response.data)) throw new Error('Unexpected catalog response')
      for (const product of response.data) {
        const loc = productPath(product.slug)
        if (!loc) continue
        if (product.category?.slug) populated.add(product.category.slug)
        products.set(loc, {
          loc,
          image: storefrontMediaUrl(product.primary_image || product.images?.[0]?.image_url, siteUrl),
        })
      }
      const reportedLastPage = Number(response.meta?.last_page ?? 1)
      lastPage = Number.isSafeInteger(reportedLastPage) ? Math.min(reportedLastPage, 499) : 1
    } while (++page <= lastPage)
  } catch (e) {
    complete = false
    console.warn('Sitemap: Failed to fetch catalog', e)
  }

  try {
    const result = await $fetch<{ data: CatalogCategory[] }>(`${apiBase}/categories`, {
      signal: requestDeadline, retry: 0,
    })
    if (!Array.isArray(result.data)) throw new Error('Unexpected category response')
    for (const category of result.data) {
      // The catalog includes each directly nested category in its parent
      // route, so both useful shelves are legitimate canonical destinations.
      const populatedChildren = (Array.isArray(category.children) ? category.children : [])
        .filter(child => populated.has(child.slug))
      if (populated.has(category.slug) || populatedChildren.length) collections.add(collectionPath(category.slug))
      for (const child of populatedChildren) collections.add(collectionPath(child.slug))
    }
  } catch (e) {
    complete = false
    console.warn('Sitemap: Failed to fetch categories', e)
  }

  const routes = [...indexableStaticPaths, '/shop', ...collections]
  const entries: SitemapEntry[] = [...routes.map(loc => ({ loc })), ...products.values()]
  const urls = entries.slice(0, 50_000).map(({ loc, image }) => {
    const imageXml = image ? `<image:image><image:loc>${escapeXml(image)}</image:loc></image:image>` : ''
    return `  <url><loc>${escapeXml(storefrontUrl(siteUrl, loc))}</loc>${imageXml}</url>`
  })
  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', complete ? 'max-age=3600, s-maxage=86400' : 'max-age=60, s-maxage=60')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join('\n')}
</urlset>`
})

function escapeXml(unsafe: string) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case "'": return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
