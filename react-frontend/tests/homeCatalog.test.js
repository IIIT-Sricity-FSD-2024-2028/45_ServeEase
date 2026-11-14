import test from 'node:test'
import { register } from 'node:module'
import assert from 'node:assert/strict'
import { homeFallbackCatalog } from '../src/features/home/homeFallbackCatalog.js'
import { initialHomeCatalog, resolveHomeCatalog } from '../src/features/home/homeCatalog.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const local = { categories: [{ id: 'local' }], providers: [{ id: 'local-p' }], popularServices: [] }
const response = { categories: [{ id: 'server' }], providers: [{ id: 'server-p' }], popularServices: [] }

test('initial home resolution uses local categories and checks providers independently', () => {
  assert.deepEqual(initialHomeCatalog(local), { catalog: local, hasProviderData: true })
  const noLocalProviders = { categories: [{ id: 'local' }] }
  assert.deepEqual(initialHomeCatalog(noLocalProviders), { catalog: noLocalProviders, hasProviderData: false })
})

test('successful usable response replaces local data and derives provider-data presence', () => {
  assert.deepEqual(resolveHomeCatalog({ status: 'succeeded', response, local, initialCatalog: homeFallbackCatalog, initialHasProviderData: false }), { catalog: response, hasProviderData: true })
  const noProviders = { ...response, providers: null }
  assert.deepEqual(resolveHomeCatalog({ status: 'succeeded', response: noProviders, local, initialCatalog: homeFallbackCatalog, initialHasProviderData: false }), { catalog: noProviders, hasProviderData: false })
})

test('empty or missing response categories use local categories when available', () => {
  for (const candidate of [{ categories: [], providers: [] }, { providers: [] }]) {
    assert.deepEqual(resolveHomeCatalog({ status: 'succeeded', response: candidate, local, initialCatalog: homeFallbackCatalog, initialHasProviderData: false }), { catalog: local, hasProviderData: true })
  }
})

test('empty or missing response categories retain initial fallback without usable local categories', () => {
  const noLocalCategories = { categories: [], providers: [] }
  const initial = { ...homeFallbackCatalog, providers: [] }
  for (const candidate of [{ categories: [] }, {}]) {
    assert.deepEqual(resolveHomeCatalog({ status: 'succeeded', response: candidate, local: noLocalCategories, initialCatalog: initial, initialHasProviderData: true }), { catalog: initial, hasProviderData: true })
  }
})

test('failure uses local categories when present and otherwise preserves the initial fallback', () => {
  assert.deepEqual(resolveHomeCatalog({ status: 'failed', local, initialCatalog: homeFallbackCatalog, initialHasProviderData: false }), { catalog: local, hasProviderData: true })
  const initial = { ...homeFallbackCatalog, providers: [] }
  assert.deepEqual(resolveHomeCatalog({ status: 'failed', local: null, initialCatalog: initial, initialHasProviderData: false }), { catalog: initial, hasProviderData: false })
})

test('before a response the initial fallback remains visible', () => {
  const initial = { ...homeFallbackCatalog, providers: [] }
  assert.deepEqual(resolveHomeCatalog({ status: 'loading', local, initialCatalog: initial, initialHasProviderData: true }), { catalog: initial, hasProviderData: true })
})
