import test from 'node:test'
import assert from 'node:assert/strict'
import {
  collectionPath, productPageStatus, productPath, productSeo, seoJson, storefrontMediaUrl, storefrontUrl,
} from '../utils/seo.ts'

const origin = 'https://store.example.test'
const fixture = {
  id: 12,
  slug: 'limited-lawn',
  name: 'Lawn & < cotton',
  description: 'A catalog description',
  status: 'active',
  primary_image: '/lookbook/lawn.jpg#crop',
  images: [
    { image_url: '/images/product-placeholder.svg', is_primary: true },
    { image_url: '/lookbook/lawn.jpg' },
    { image_url: '//other.example.test/unverified.jpg' },
    { image_url: 'https://media.example.test/lawn-detail.webp' },
  ],
  base_price: 110.1,
  sale_price: 95.12,
  variants: [{ size: 'S', is_active: true, stock_quantity: 3 }],
}

test('only a confirmed API 404 marks a product as missing', () => {
  assert.equal(productPageStatus(fixture), 200)
  assert.equal(productPageStatus(undefined, { response: { status: 404 } }), 404)
  assert.equal(productPageStatus(undefined, { statusCode: 404 }), 404)
  assert.equal(productPageStatus(undefined, { statusCode: 500 }), 503)
  assert.equal(productPageStatus({ id: 'unexpected' }), 503)
  assert.equal(productPageStatus({ ...fixture, status: 'draft' }), 503)
})

test('catalog identity and images use the configured canonical host, not duplicate routes', () => {
  const result = productSeo(fixture, origin)
  assert.equal(result?.url, `${origin}/products/limited-lawn`)
  assert.deepEqual(result?.schema.image, [
    `${origin}/lookbook/lawn.jpg`, 'https://media.example.test/lawn-detail.webp',
  ])
  assert.equal(result?.schema.offers?.priceCurrency, 'PKR')
  assert.equal(result?.schema.offers?.price, '95.12')
  assert.equal(result?.schema.offers?.availability, 'https://schema.org/InStock')
  assert.equal(productPath('../review'), undefined)
  assert.equal(storefrontUrl('not a hostname', '/shop'), 'https://kfabrics.com/shop')
  assert.equal(storefrontMediaUrl('http://unsafe.example.test/picture.jpg', origin), undefined)
  assert.equal(collectionPath('summer lawn', 1), '/shop?category=summer+lawn')
  assert.equal(collectionPath('summer lawn', 2), '/shop?category=summer+lawn&page=2')
})

test('offers omit mixed, custom-only and unknown facts rather than assume a price or availability', () => {
  const ready = { size: 'S', is_active: true, stock_quantity: 3 }
  assert.equal(productSeo({ ...fixture, variants: [ready, { ...ready, price_override: 240 }] }, origin)?.schema.offers, undefined)
  assert.equal(productSeo({ ...fixture, variants: [{ ...ready, size: 'Custom' }] }, origin)?.schema.offers, undefined)
  assert.equal(productSeo({ ...fixture, variants: [{ ...ready, stock_quantity: undefined }] }, origin)?.schema.offers, undefined)
  assert.equal(productSeo({ ...fixture, sale_price: 95.125 }, origin)?.schema.offers, undefined)
  assert.equal(productSeo({ ...fixture, variants: [{ ...ready, stock_quantity: 0 }] }, origin)?.schema.offers?.availability,
    'https://schema.org/OutOfStock')
  assert.equal(productSeo({ ...fixture, variants: [{ ...ready, stock_quantity: 0 }, { ...ready, size: 'Custom' }] }, origin)?.schema.offers, undefined)
})

test('JSON-LD retains data exactly without literal markup characters in script text', () => {
  const dataset = productSeo(fixture, origin)?.schema
  assert.ok(dataset)
  const json = seoJson(dataset)
  assert.ok(!json.includes('<'))
  assert.ok(!json.includes('&'))
  assert.deepEqual(JSON.parse(json), dataset)
})
