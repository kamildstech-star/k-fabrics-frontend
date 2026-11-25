import assert from 'node:assert/strict'
import { test } from 'node:test'
import { catalogSort, normalizeDiscoverySearch, normalizedFacet, priceRange } from '../utils/discovery.ts'

test('search normalizes whitespace the same way for suggestions and full catalog links', () => {
  assert.equal(normalizeDiscoverySearch('  Blue \n Silk   Suit  '), 'Blue Silk Suit')
  assert.equal(normalizeDiscoverySearch(' '), '')
  assert.equal(normalizeDiscoverySearch('a'.repeat(150)).length, 100)
})

test('older raw facet labels map to canonical server values', () => {
  assert.equal(normalizedFacet(' Raw Silk '), 'raw-silk')
  assert.equal(normalizedFacet('M'), 'm')
  assert.equal(normalizedFacet('Powder Blue'), 'powder-blue')
  assert.equal(normalizedFacet('ساگ سبز'), 'ساگ-سبز')
})

test('search defaults to best match while browse defaults to newest', () => {
  assert.equal(catalogSort('', 'lawn'), 'relevance')
  assert.equal(catalogSort('', ''), 'newest')
  assert.equal(catalogSort('price_asc', 'lawn'), 'price_asc')
  assert.equal(catalogSort('newest', 'lawn'), 'newest')
})

test('price fields reject malformed, negative and reversed ranges without changing catalog filters', () => {
  assert.deepEqual(priceRange('0', '1000.50'), { min: '0', max: '1000.50' })
  assert.deepEqual(priceRange('', '1500'), { min: '', max: '1500' })
  assert.throws(() => priceRange('1500', '100'), /higher/)
  assert.throws(() => priceRange('-2', '100'), /valid nonnegative/)
  assert.throws(() => priceRange('10.123', ''), /two decimal/)
})
