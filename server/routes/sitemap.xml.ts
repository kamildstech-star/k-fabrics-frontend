export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || 'http://localhost:8000/api/v1'
  const siteUrl = (config.public.siteUrl as string) || 'https://kfabrics.com'

  const staticRoutes = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/shop', priority: '0.9', changefreq: 'daily' },
    { loc: '/stitching', priority: '0.9', changefreq: 'weekly' },
    { loc: '/about', priority: '0.7', changefreq: 'monthly' },
    { loc: '/faq', priority: '0.7', changefreq: 'weekly' },
    { loc: '/policies/returns', priority: '0.6', changefreq: 'monthly' },
    { loc: '/policies/shipping', priority: '0.6', changefreq: 'monthly' },
    { loc: '/policies/privacy', priority: '0.5', changefreq: 'monthly' },
    { loc: '/track-order', priority: '0.5', changefreq: 'monthly' },
  ]

  let productRoutes: Array<{ loc: string; priority: string; changefreq: string; image?: string; title?: string }> = []
  let categoryRoutes: Array<{ loc: string; priority: string; changefreq: string }> = []

  try {
    const productsRes = await $fetch<any>(`${apiBase}/products`, {
      params: { per_page: 100 },
    }).catch(() => null)

    if (productsRes?.data && Array.isArray(productsRes.data)) {
      productRoutes = productsRes.data.map((p: any) => ({
        loc: `/products/${p.slug}`,
        priority: '0.9',
        changefreq: 'daily',
        image: p.primary_image || p.images?.[0]?.image_url,
        title: p.name,
      }))
    }
  } catch (e) {
    console.warn('Sitemap: Failed to fetch products for sitemap', e)
  }

  try {
    const catRes = await $fetch<any>(`${apiBase}/categories`).catch(() => null)
    if (catRes?.data && Array.isArray(catRes.data)) {
      categoryRoutes = catRes.data.map((c: any) => ({
        loc: `/shop?category=${c.slug}`,
        priority: '0.8',
        changefreq: 'daily',
      }))
    }
  } catch (e) {
    console.warn('Sitemap: Failed to fetch categories for sitemap', e)
  }

  const allUrls = [...staticRoutes, ...categoryRoutes, ...productRoutes]

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${allUrls
  .map((item) => {
    const fullLoc = `${siteUrl.replace(/\/$/, '')}${item.loc}`
    let xml = `  <url>\n    <loc>${escapeXml(fullLoc)}</loc>\n    <changefreq>${item.changefreq}</changefreq>\n    <priority>${item.priority}</priority>`
    if ('image' in item && item.image) {
      xml += `\n    <image:image>\n      <image:loc>${escapeXml(item.image)}</image:loc>\n      <image:title>${escapeXml(item.title || '')}</image:title>\n    </image:image>`
    }
    xml += `\n  </url>`
    return xml
  })
  .join('\n')}
</urlset>`

  setHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setHeader(event, 'Cache-Control', 'max-age=3600, s-maxage=86400')
  return sitemapXml
})

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
