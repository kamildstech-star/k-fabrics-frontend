import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { access, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

const host = '127.0.0.1'
const entry = new URL('../.output/server/index.mjs', import.meta.url)
await access(entry).catch(() => { throw new Error('Run npm run build before npm run test:smoke.') })

const placeholder = '/images/product-placeholder.svg'
const product = {
  id: 1,
  name: 'Smoke Test Lawn Set',
  slug: 'smoke-test-lawn-set',
  description: 'A neutral local fixture',
  fabric_type: 'Lawn',
  piece_type: '2-piece',
  status: 'active',
  base_price: 3999,
  sale_price: null,
  primary_image: placeholder,
  images: [{ id: 1, image_url: placeholder, is_primary: true }],
  variants: [{ id: 1, size: 'S', is_active: true, stock_quantity: 3 }],
  category: { id: 1, name: 'Smoke Collection', slug: 'smoke-collection' },
}
const secondProduct = { ...product, id: 2, slug: 'second-page-product' }
const endpoints = {
  'GET /api/v1/products': { data: [product], meta: { current_page: 1, last_page: 1, total: 1 } },
  'GET /api/v1/categories': { data: [product.category] },
  'GET /api/v1/stitching-services': { data: [] },
  [`GET /api/v1/products/${product.slug}`]: { data: product },
  [`GET /api/v1/products/${product.slug}/related`]: { data: [] },
  [`GET /api/v1/products/${product.slug}/reviews`]: { data: [], meta: { average_rating: 0, total_reviews: 0 } },
}

const api = createServer((request, response) => {
  const url = new URL(request.url, `http://${host}`)
  const catalog = url.pathname === '/api/v1/products' && url.searchParams.get('per_page') === '100'
  const body = catalog
    ? { data: [url.searchParams.get('page') === '2' ? secondProduct : product], meta: { last_page: 2 } }
    : endpoints[`${request.method} ${url.pathname}`]
  response.writeHead(body ? 200 : 404, { 'content-type': 'application/json' })
  response.end(JSON.stringify(body || { message: 'Mock route not found' }))
})
let storefront
let log = ''

try {
  api.listen(0, host)
  await once(api, 'listening')
  const reserve = createServer().listen(0, host)
  await once(reserve, 'listening')
  const port = reserve.address().port
  await new Promise((resolve, reject) => reserve.close(err => err ? reject(err) : resolve()))
  const url = `http://${host}:${port}`
  storefront = spawn(process.execPath, [fileURLToPath(entry)], {
    env: {
      ...process.env,
      PORT: String(port),
      NITRO_HOST: host,
      NITRO_PORT: String(port),
      NUXT_PUBLIC_API_BASE: `http://${host}:${api.address().port}/api/v1`,
      NUXT_PUBLIC_SITE_URL: url,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  storefront.stdout.on('data', chunk => { log += chunk })
  storefront.stderr.on('data', chunk => { log += chunk })

  const get = path => fetch(new URL(path, url), { signal: AbortSignal.timeout(4_000) })
  let ready = false
  for (let attempt = 0; attempt < 40 && storefront.exitCode === null; attempt++) {
    try {
      const page = await get('/faq')
      await page.arrayBuffer()
      if (page.ok) {
        ready = true
        break
      }
    } catch {
      // Retry while Nitro starts.
    }
    await delay(100)
  }
  assert.ok(ready, 'Nitro should start and serve FAQ')
  for (const path of ['/', '/shop', '/stitching', '/checkout', '/track-order', `/products/${product.slug}`]) {
    const response = await get(path)
    assert.equal(response.status, 200, path)
    const html = await response.text()
    assert.match(html, /<main(?:>|\s)/, `${path} is rendered on the server`)
    if (path === '/shop' || path.startsWith('/products/')) assert.match(html, /Smoke Test Lawn Set/)
    if (path === '/shop') {
      const imageLink = html.match(/<a[^>]+aria-label="View Smoke Test Lawn Set"[^>]*>([\s\S]*?)<\/a>/)?.[1]
      assert.ok(imageLink, 'Catalog photo has a named product link')
      assert.ok(!/<button(?:>|\s)/.test(imageLink), 'Quick add and wishlist are not nested in the product link')
      assert.match(html, /aria-label="Add size S to bag"/)
      const image = html.match(/src="(\/_ipx\/[^"]*product-placeholder\.svg)"/)?.[1]
      assert.ok(image, 'Catalog should use its built-in optimizer for local images')
      const optimized = await get(image)
      assert.equal(optimized.status, 200, 'IPX route')
      assert.match(optimized.headers.get('content-type') || '', /^image\/webp/)
      assert.ok((await optimized.arrayBuffer()).byteLength > 100)
    }
  }
  const sitemap = await get('/sitemap.xml')
  assert.equal(sitemap.status, 200)
  const xml = await sitemap.text()
  assert.ok(xml.includes(`${url}/products/${product.slug}`))
  assert.ok(xml.includes(`${url}/products/${secondProduct.slug}`), 'Sitemap includes later product pages')
  assert.ok(!xml.includes('/track-order'), 'Private-look-up UI is not indexed')
  assert.ok(xml.includes(`<image:loc>${url}${placeholder}</image:loc>`), 'Sitemap image URL is absolute')
  const assets = await readdir(new URL('../.output/public/_nuxt/', import.meta.url))
  assert.ok(assets.some(name => name.endsWith('.woff2')), 'Fonts should be served from the built site')
  for (const license of ['/licenses/playfair-display.txt', '/licenses/plus-jakarta-sans.txt']) {
    assert.equal((await get(license)).status, 200)
  }
  console.log('Production smoke passed: storefront, catalog fixture, tracking page, sitemap, fonts and WebP image optimizer.')
} catch (error) {
  if (log) console.error(log)
  throw error
} finally {
  if (storefront && storefront.exitCode === null && storefront.signalCode === null) {
    storefront.kill()
    await once(storefront, 'exit')
  }
  if (api.listening) await new Promise(resolve => api.close(resolve))
}
