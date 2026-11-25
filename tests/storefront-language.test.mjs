import assert from 'node:assert/strict'
import test from 'node:test'
import urdu from '../i18n/ur.json' with { type: 'json' }
import { readStorefrontLanguage, translateStorefront } from '../utils/storefront-language.ts'

test('English is the default, including when the preference cookie is invalid', () => {
  for (const invalid of [undefined, null, '', 'UR', 'ur-PK', 'ar', ['ur']]) {
    assert.equal(readStorefrontLanguage(invalid), 'en')
  }
  assert.equal(readStorefrontLanguage('ur'), 'ur')
  assert.equal(translateStorefront('en', 'Checkout'), 'Checkout')
  assert.equal(translateStorefront('ur', 'Checkout'), 'چیک آؤٹ')
})

test('merchant-entered text and unknown errors are preserved rather than guessed', () => {
  const entry = 'Merchant-entered lawn name / XL'
  assert.equal(translateStorefront('ur', entry), entry)
  assert.equal(translateStorefront('ur', 'toString'), 'toString')
})

test('both languages preserve the original values and all interpolation fields', () => {
  const fields = str => (str.match(/\{\w+\}/g) || []).sort()
  for (const [english, localized] of Object.entries(urdu)) {
    assert.deepEqual(fields(english), fields(localized), english)
  }
  const values = { query: 'Raw silk & {query}' }
  const source = 'Search results for “{query}”'
  assert.equal(translateStorefront('en', source, values), 'Search results for “Raw silk & {query}”')
  assert.equal(translateStorefront('ur', source, values), '”Raw silk & {query}“ کے لیے تلاش کے نتائج')
})
