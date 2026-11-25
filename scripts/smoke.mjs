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
const secondProduct = { ...product, id: 2, slug: 'second-page-product', primary_image: '/favicon.ico' }
const realPhoto = 'https://images.example.test/lawn.jpg'
const productDetail = { ...product, primary_image: realPhoto, images: [{ id: 1, image_url: realPhoto, is_primary: true }] }
const parentCollection = { id: 22, name: 'Summer', slug: 'summer', children: [product.category] }
const emptyCollection = { id: 23, name: 'Empty shelf', slug: 'empty-shelf' }
const endpoints = {
  'GET /api/v1/products': { data: [product], meta: { current_page: 1, last_page: 1, total: 1 } },
  'GET /api/v1/categories': { data: [parentCollection, emptyCollection] },
  'GET /api/v1/products/facets': {
    data: { sizes: [{ id: 's', label: 'S' }], fabrics: [], pieces: [], colors: [] },
  },
  'GET /api/v1/stitching-services': { data: [] },
  [`GET /api/v1/products/${product.slug}`]: { data: productDetail },
  'GET /api/v1/products/malformed-pdp': { data: null },
  [`GET /api/v1/products/${product.slug}/related`]: { data: [] },
  [`GET /api/v1/products/${product.slug}/reviews`]: { data: [], meta: { average_rating: 0, total_reviews: 0 } },
}

const api = createServer((request, response) => {
  const url = new URL(request.url, `http://${host}`)
  const catalog = url.pathname === '/api/v1/products'
  const page = Number(url.searchParams.get('page') || '1')
  let body = endpoints[`${request.method} ${url.pathname}`]
  let status = body ? 200 : 404
  if (url.pathname === '/api/v1/products/unavailable-pdp' || (catalog && url.searchParams.get('search') === 'offline')) {
    status = 500
    body = { message: 'Simulated upstream error' }
  } else if (catalog && url.searchParams.get('min_price') === 'not-a-price') {
    status = 422
    body = { message: 'Invalid price' }
  } else if (catalog) {
    const empty = url.searchParams.get('size') === 'absent'
      || url.searchParams.get('category') === emptyCollection.slug
    status = 200
    body = {
      data: empty || page > 2 ? [] : [page === 2 ? secondProduct : product],
      meta: { current_page: page, last_page: empty ? 1 : 2, total: empty ? 0 : 2 },
    }
  }
  response.writeHead(status, { 'content-type': 'application/json' })
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
    assert.match(html, /<html[^>]+lang="en-PK"/)
    assert.equal((html.match(/<main(?:>|\s)/g) || []).length, 1, `${path} has one main landmark`)
    assert.match(html, /href="#main-content"[^>]*>Skip to main content<\/a>/)
    if (path === '/shop' || path.startsWith('/products/')) assert.match(html, /Smoke Test Lawn Set/)
    if (path.startsWith('/products/')) {
      const title = html.indexOf('<h1');
      const media = html.indexOf('class="pdp-mobile-photo');
      const sizing = html.indexOf('id="product-sizing"');
      assert.ok(title > 0 && title < media && media < sizing, 'Read the product title, then photos, then choices');
      assert.match(html.slice(title, media), /Rs\. 3,999/, 'Price is grouped with the title');
      assert.match(html.slice(sizing), /data-size[^>]+aria-pressed="false"/, 'Size never starts preselected');
    }
    if (path === '/shop') {
      const imageLink = html.match(/<a[^>]+aria-label="View Smoke Test Lawn Set"[^>]*>([\s\S]*?)<\/a>/)?.[1]
      assert.ok(imageLink, 'Catalog photo has a named product link')
      assert.ok(!/<button(?:>|\s)/.test(imageLink), 'Quick add and wishlist are not nested in the product link')
      assert.match(html, /aria-label="Add size S to bag"/)
      assert.match(html, /src="\/images\/product-placeholder\.svg"/, 'Missing photos use the local placeholder directly')
      assert.equal((await get(placeholder)).status, 200, 'Local image fallback')
      const optimized = await get('/_ipx/f_webp&w_480/images/product-placeholder.svg')
      assert.equal(optimized.status, 200, 'IPX route')
      assert.match(optimized.headers.get('content-type') || '', /^image\/webp/)
      assert.ok((await optimized.arrayBuffer()).byteLength > 100)
    }
  }
  for (const [path, localizedCopy] of [
    ['/', 'ریڈی ٹو ویئر خریدیں'],
    ['/shop', 'ریڈی ٹو ویئر کلیکشن'],
    ['/checkout', 'چیک آؤٹ'],
    ['/track-order', 'نجی ٹریکنگ کوڈ'],
    ['/stitching', 'حسبِ پیمائش سلائی کا اسٹوڈیو'],
    ['/faq', 'ڈیلیوری کے چارجز اور مدت کیا ہیں؟'],
    [`/products/${product.slug}`, 'سائز گائیڈ'],
  ]) {
    const response = await fetch(new URL(path, url), { headers: { cookie: 'kf_language=ur' }, signal: AbortSignal.timeout(4_000) })
    assert.equal(response.status, 200, path)
    assert.match(response.headers.get('vary') || '', /\bcookie\b/i)
    const html = await response.text()
    assert.match(html, /<html[^>]+lang="ur-PK"/, path)
    assert.match(html, /<html[^>]+dir="rtl"/, path)
    assert.ok(html.includes(localizedCopy), `Urdu SSR copy: ${path}`)
    if (path.startsWith('/products/')) assert.ok(html.includes(product.name), 'Catalog data is not machine-translated')
  }
  const canonicalFrom = html => html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]?.replaceAll('&amp;', '&')
  const productPath = `/products/${product.slug}`
  const pdp = await get(`${productPath}?utm_source=newsletter`)
  assert.equal(pdp.status, 200)
  const pdpHtml = await pdp.text()
  assert.equal(canonicalFrom(pdpHtml), `${url}${productPath}`)
  const json = pdpHtml.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)?.[1]
  assert.ok(json, 'SSR embeds Product JSON-LD')
  const productData = JSON.parse(json)
  assert.equal(productData['@type'], 'Product')
  assert.equal(productData.name, product.name)
  assert.deepEqual(productData.image, [realPhoto])
  assert.equal(productData.offers.price, '3999.00')
  assert.equal(productData.offers.priceCurrency, 'PKR')
  assert.equal(productData.offers.availability, 'https://schema.org/InStock')

  for (const [path, expectedStatus, message] of [
    ['/products/missing-pdp', 404, 'Item not found'],
    ['/products/unavailable-pdp', 503, 'Could not load this item'],
    ['/products/malformed-pdp', 503, 'Could not load this item'],
  ]) {
    const response = await get(path)
    assert.equal(response.status, expectedStatus, path)
    if (expectedStatus === 503) assert.equal(response.headers.get('retry-after'), '60')
    assert.equal(response.headers.get('cache-control'), 'no-store')
    const html = await response.text()
    assert.ok(html.includes(message), path)
    assert.equal(canonicalFrom(html), undefined)
    assert.ok(!html.includes('application/ld+json'), path)
  }

  for (const [path, target] of [
    ['/?utm_source=example', '/'],
    ['/shop?sort=newest&utm_source=example&page=1', '/shop'],
    ['/shop?category=smoke-collection&page=1', '/shop?category=smoke-collection'],
    ['/shop?category=smoke-collection&page=2', '/shop?category=smoke-collection&page=2'],
  ]) {
    const response = await get(path)
    assert.equal(response.status, 200, path)
    const html = await response.text()
    assert.equal(canonicalFrom(html), `${url}${target}`, path)
    assert.doesNotMatch(html, /name="robots"[^>]*content="noindex/, path)
  }
  const collection = await (await get('/shop?category=smoke-collection')).text()
  assert.match(collection, /href="\/shop\?category=smoke-collection(?:&amp;|&)page=2"[^>]*aria-label="Next product page"/)

  for (const [path, status] of [
    ['/shop?search=lawn', 200],
    ['/shop?sort=price_asc', 200],
    ['/shop?size=s', 200],
    ['/shop?size=absent', 404],
    ['/shop?category=empty-shelf', 404],
    ['/shop?page=99', 404],
    ['/shop?min_price=not-a-price', 400],
  ]) {
    const response = await get(path)
    assert.equal(response.status, status, path)
    const html = await response.text()
    assert.match(html, /name="robots"[^>]*content="noindex, follow"/, path)
    assert.equal(canonicalFrom(html), undefined, path)
  }
  const catalogError = await get('/shop?search=offline')
  assert.equal(catalogError.status, 503, 'Catalog downtime is not an empty result')
  assert.equal(catalogError.headers.get('retry-after'), '60')

  const robots = await get('/robots.txt')
  assert.equal(robots.status, 200)
  const robotsText = await robots.text()
  assert.ok(robotsText.includes(`Sitemap: ${url}/sitemap.xml`))
  assert.doesNotMatch(robotsText, /Disallow:\s*\/shop/)

  const sitemap = await get('/sitemap.xml')
  assert.equal(sitemap.status, 200)
  const xml = await sitemap.text()
  assert.ok(xml.includes(`${url}/products/${product.slug}`))
  assert.ok(xml.includes(`${url}/products/${secondProduct.slug}`), 'Sitemap includes later product pages')
  assert.ok(!xml.includes('/track-order'), 'Private-look-up UI is not indexed')
  assert.ok(xml.includes(`<image:loc>${url}/favicon.ico</image:loc>`), 'Sitemap image URL is absolute')
  assert.ok(!xml.includes(placeholder), 'Sitemap excludes placeholder media')
  assert.ok(xml.includes(`${url}/shop?category=summer`), 'Sitemap retains the populated parent collection')
  assert.ok(xml.includes(`${url}/shop?category=smoke-collection`), 'Sitemap retains the populated child collection')
  assert.ok(!xml.includes('empty-shelf'), 'Sitemap excludes empty collections')
  const assets = await readdir(new URL('../.output/public/_nuxt/', import.meta.url))
  assert.ok(assets.some(name => name.endsWith('.woff2')), 'Fonts should be served from the built site')
  for (const license of ['/licenses/playfair-display.txt', '/licenses/plus-jakarta-sans.txt']) {
    assert.equal((await get(license)).status, 200)
  }
  console.log('Production smoke passed: storefront, catalog fixture, HTTP and SEO metadata, sitemap, tracking, fonts and WebP optimizer.')
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
