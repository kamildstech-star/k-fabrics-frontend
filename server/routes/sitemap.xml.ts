type SitemapEntry = {
  loc: string
  priority: string
  changefreq: string
  image?: string
  title?: string
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
  const siteUrl = (config.public.siteUrl as string) || 'https://kfabrics.com'

  const staticRoutes: SitemapEntry[] = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    { loc: '/stitching', priority: '0.9', changefreq: 'weekly' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.7', changefreq: 'weekly' },
    { loc: '/policies/returns', priority: '0.6', changefreq: 'monthly' },
    { loc: '/policies/shipping', priority: '0.6', changefreq: 'monthly' },
    { loc: '/policies/privacy', priority: '0.5', changefreq: 'monthly' },
  ]

  const productRoutes: SitemapEntry[] = []
  const categoryRoutes: SitemapEntry[] = []
  const requestDeadline = AbortSignal.timeout(5000)
  let complete = true

  try {
    type CatalogProduct = { slug: string, name: string, primary_image?: string | null, images?: { image_url: string }[] }
    let page = 1
    let lastPage = 1
    do {
      const response: { data: CatalogProduct[], meta?: { last_page: number } } = await $fetch(
        `${apiBase}/products`,
        { params: { page, per_page: 100 }, signal: requestDeadline, retry: 0 },
      )
      for (const p of response.data || []) {
        productRoutes.push({
          loc: `/products/${encodeURIComponent(p.slug)}`,
          priority: '0.9',
          changefreq: 'daily',
          image: sitemapImage(p.primary_image || p.images?.[0]?.image_url, siteUrl),
          title: p.name,
        })
      }
      const reportedLastPage = Number(response.meta?.last_page ?? 1)
      lastPage = Number.isSafeInteger(reportedLastPage) ? Math.min(reportedLastPage, 499) : 1
    } while (++page <= lastPage)
  } catch (e) {
    complete = false
    console.warn('Sitemap: Failed to fetch products for sitemap', e)
  }

  try {
    const result = await $fetch<{ data: { slug: string }[] }>(`${apiBase}/categories`, {
      signal: requestDeadline,
      retry: 0,
    })
    for (const category of result.data || []) {
      categoryRoutes.push({
        loc: `/shop?category=${encodeURIComponent(category.slug)}`,
        priority: '0.8',
        changefreq: 'weekly',
      })
    }
  } catch (e) {
    complete = false
    console.warn('Sitemap: Failed to fetch categories for sitemap', e)
  }

  const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes].slice(0, 50_000)

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls
  .map((item) => {
    const fullLoc = `${siteUrl.replace(/\/$/, '')}${item.loc}`
    let xml = `  <url>\n    <loc>${escapeXml(fullLoc)}</loc>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>`
    if (item.image) {
      xml += `\n    <image:image>\n      <image:loc>${escapeXml(item.image)}</image:loc>\n      <image:title>${escapeXml(item.title || '')}</image:title>\n    </image:image>`
    }
    xml += `\n  </url>`
    return xml
  })
  .join('\n')}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', complete ? 'max-age=3600, s-maxage=86400' : 'max-age=60, s-maxage=60')
  return sitemapXml
})

function sitemapImage(raw: string | undefined, siteUrl: string): string | undefined {
  if (!raw) return
  try {
    const url = new URL(raw, siteUrl)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) return url.href
  } catch {
    // Ignore non-URL values in the optional image field.
  }
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;'
      case '>': return '&gt;'
      case '&': return '&amp;'
      case '\'': return '&apos;'
      case '"': return '&quot;'
      default: return c
    }
  })
}
