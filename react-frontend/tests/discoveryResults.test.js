import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { categoryProviders, filterProviders, normalizeCatalog, resolveCategory } from '../src/features/discovery/catalogModel.js'

register('./support/jsx-hooks.mjs', import.meta.url)
const { DiscoveryResults } = await import('../src/features/discovery/DiscoveryResults.jsx')

// Shapes copied from GET /api/catalog (CatalogState / CatalogProvider) and the persisted catalog.
const salonProvider = (id, name, price, extra = {}) => ({
  id, name, category: 'salon-at-home', subServices: [name.split(' ')[0]], years: 5, rating: 4.8, reviews: 256, distance: '2.0 km',
  startingPrice: price, location: 'Bangalore, Karnataka', jobsDone: 624, availableToday: true, verified: true, cityId: 2,
  image: 'assets/images/salon-at-home/salon2.jpg', ...extra,
})
const backendBody = {
  success: true,
  data: {
    categories: [{ id: 'salon-at-home', name: 'Salon at Home', icon: '💇', subServices: ['Haircut & Styling', 'Facial & Cleanup', 'Manicure & Pedicure'] }],
    providers: [
      salonProvider('beauty-express', 'Beauty Express', 399, { subServices: ['Haircut & Styling'], servicePricing: { 'Haircut & Styling': 399 },
        services: [{ id: 'SVC001', name: 'Haircut & Styling', price: 399, category: 'salon-at-home', duration: '2 hours', status: 'Active' }] }),
      salonProvider('glamour-at-doorstep', 'Glamour At Doorstep', 599, { subServices: ['Facial & Cleanup'], servicePricing: { 'Facial & Cleanup': 599 } }),
      salonProvider('royal-beauty-services', 'Royal Beauty Services', 499, { subServices: ['Manicure & Pedicure'], availableToday: false }),
      salonProvider('chennai-salon', 'Chennai Salon', 499, { subServices: ['Haircut & Styling'], cityId: 1, location: 'Chennai, Tamil Nadu' }),
    ],
    popularServices: [],
  },
}

const render = (props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(DiscoveryResults, { rows: [], totalRows: 0, cityId: 2, ...props })))
const cardCount = (html) => (html.match(/class="provider-card"/g) || []).length

// Mirrors ServicesPage: URL params → normalized catalog → category/city rows → search/service/price filters.
function pipeline(body, search) {
  const params = new URLSearchParams(search)
  const catalog = normalizeCatalog(body)
  const category = resolveCategory(catalog.categories, params.get('category'))
  const allRows = categoryProviders(catalog, { categoryId: category?.id, cityId: Number(params.get('city')) })
  const rows = filterProviders(allRows, { query: params.get('q') || '', service: params.get('service') || 'all', maxPrice: Number(params.get('maxPrice')) || 10000, categories: catalog.categories })
  return { catalog, category, allRows, rows }
}

test('a non-empty catalog response produces provider cards', () => {
  const { rows, allRows } = pipeline(backendBody.data, 'category=salon-at-home&city=2&maxPrice=8900')
  const html = render({ rows, totalRows: allRows.length })
  assert.equal(cardCount(html), 3)
  for (const name of ['Beauty Express', 'Glamour At Doorstep', 'Royal Beauty Services']) assert.ok(html.includes(name), name)
  assert.ok(html.includes('href="/providers/beauty-express?city=2"'))
})

test('the wrapped { success, data } envelope and the unwrapped data normalize identically', () => {
  assert.deepEqual(normalizeCatalog(backendBody), normalizeCatalog(backendBody.data))
  assert.equal(normalizeCatalog(backendBody).providers.length, 4)
  assert.deepEqual(normalizeCatalog(null), { categories: [], providers: [], popularServices: [] })
  assert.deepEqual(normalizeCatalog({ providers: 'oops' }).providers, [])
})

test('matching category slug and numeric city keep only valid providers', () => {
  const { category, allRows } = pipeline(backendBody.data, 'category=salon-at-home&city=2')
  assert.equal(category.name, 'Salon at Home')
  assert.deepEqual(allRows.map((row) => row.id), ['beauty-express', 'glamour-at-doorstep', 'royal-beauty-services'])
  assert.deepEqual(pipeline(backendBody.data, 'category=salon-at-home&city=1').allRows.map((row) => row.id), ['chennai-salon'])
})

test('price filtering compares numbers, including string prices from stored records', () => {
  const stringPrices = { ...backendBody.data, providers: backendBody.data.providers.map((provider) => ({ ...provider, startingPrice: String(provider.startingPrice), cityId: String(provider.cityId) })) }
  assert.equal(pipeline(stringPrices, 'category=salon-at-home&city=2&maxPrice=8900').rows.length, 3)
  assert.deepEqual(pipeline(stringPrices, 'category=salon-at-home&city=2&maxPrice=450').rows.map((row) => row.id), ['beauty-express'])
  assert.equal(pipeline(backendBody.data, 'category=salon-at-home&city=2&maxPrice=0').rows.length, 3, 'maxPrice=0 in the URL falls back to no limit')
})

test('a provider missing optional fields still renders a card', () => {
  const minimal = { id: 'minimal-salon', name: 'Minimal Salon', category: 'salon-at-home', cityId: 2, subServices: ['Haircut & Styling'], startingPrice: 450 }
  const { rows, allRows } = pipeline({ ...backendBody.data, providers: [minimal] }, 'category=salon-at-home&city=2')
  const html = render({ rows, totalRows: allRows.length })
  assert.equal(cardCount(html), 1)
  assert.ok(html.includes('Minimal Salon'))
  assert.ok(html.includes('New Provider'))
  assert.ok(html.includes('/assets/images/home-cleaning/clean1.jpg'), 'falls back to the default image')
  assert.ok(!html.includes('Years Experience'))
  assert.ok(!html.includes('undefined') && !html.includes('NaN'))
})

test('a genuinely empty catalog shows the original-style empty state', () => {
  const { catalog, rows } = pipeline({ success: true, data: { categories: [], providers: [], popularServices: [] } }, 'category=salon-at-home&city=2&maxPrice=8900')
  const html = render({ catalogEmpty: catalog.providers.length === 0, rows })
  assert.equal(cardCount(html), 0)
  assert.match(html, /class="empty-state-card">No service providers are listed in the catalog right now\./)
  const filteredOut = render({ rows: [], totalRows: 3 })
  assert.match(filteredOut, /No providers found for the selected filters\./)
})

test('an API failure shows an error with Retry, not an empty catalog', () => {
  const html = render({ error: 'Request to http://localhost:3000/api/catalog could not be completed: Failed to fetch', catalogEmpty: true })
  assert.match(html, /role="alert"/)
  assert.match(html, /We couldn&#x27;t load service providers\./)
  assert.match(html, />Retry</)
  assert.ok(!html.includes('No service providers are listed'))
})
