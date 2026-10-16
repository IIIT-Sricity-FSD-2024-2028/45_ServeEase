import test from 'node:test'
import assert from 'node:assert/strict'
import { bookableServices, categoryProviders, filterProviders, formatSlot, priceBounds, resolveCategory, serviceOptions, servicePrice, validateCustomerDetails, validatePayment } from '../src/features/discovery/catalogModel.js'

const categories = [{ id: 'home-cleaning', name: 'Home Cleaning', subServices: ['Kitchen Cleaning'] }, { id: 'plumbing', name: 'Plumbing', subServices: ['Plumbing'] }]
const providers = [
  { id: 'fresh', name: 'Fresh Space', category: 'home-cleaning', cityId: 1, subServices: ['Kitchen Cleaning'], startingPrice: 699, verified: true },
  { id: 'sparkle', name: 'Sparkle Home', category: 'home-cleaning', cityId: 1, subServices: ['Full Home Cleaning'], startingPrice: 899, verified: true,
    services: [{ id: 'S1', name: 'Full Home Cleaning', price: 1200, status: 'Active' }, { id: 'S2', name: 'Sofa Cleaning', price: 300, status: 'Inactive' }] },
  { id: 'blr-clean', name: 'BLR Clean', category: 'home-cleaning', cityId: 2, subServices: ['Kitchen Cleaning'], startingPrice: 599, verified: true },
  { id: 'drain', name: 'DrainMaster', category: 'plumbing', cityId: 1, subServices: ['Plumbing'], startingPrice: 399, verified: true },
  { id: 'blocked', name: 'Blocked Co', category: 'plumbing', cityId: 1, subServices: ['Plumbing'], startingPrice: 399, verified: true, accountStatus: 'Blocked' },
]

test('resolves category slugs by id, then by slugified name', () => {
  assert.equal(resolveCategory(categories, 'home-cleaning').name, 'Home Cleaning')
  assert.equal(resolveCategory(categories, 'Home Cleaning').id, 'home-cleaning')
  assert.equal(resolveCategory(categories, 'unknown'), null)
})

test('combines category and city filters and hides non-discoverable providers', () => {
  assert.deepEqual(categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 1 }).map((row) => row.id), ['fresh', 'sparkle'])
  assert.deepEqual(categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 2 }).map((row) => row.id), ['blr-clean'])
  assert.deepEqual(categoryProviders({ providers }, { categoryId: 'plumbing', cityId: 1 }).map((row) => row.id), ['drain'])
})

test('uses active managed services for listing names and starting price', () => {
  const sparkle = categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 1 }).find((row) => row.id === 'sparkle')
  assert.deepEqual(sparkle.serviceNames, ['Full Home Cleaning'])
  assert.equal(sparkle.startingPrice, 1200)
})

test('search, service type and price filters narrow the rows', () => {
  const rows = categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 1 })
  assert.deepEqual(filterProviders(rows, { query: 'sparkle', categories }).map((row) => row.id), ['sparkle'])
  assert.deepEqual(filterProviders(rows, { query: 'kitchen', categories }).map((row) => row.id), ['fresh'])
  assert.deepEqual(filterProviders(rows, { service: 'Full Home Cleaning', categories }).map((row) => row.id), ['sparkle'])
  assert.deepEqual(filterProviders(rows, { maxPrice: 700, categories }).map((row) => row.id), ['fresh'])
})

test('the price slider spans the prices actually on offer', () => {
  const rows = categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 1 })
  // 699 and 1200 -> a slider from 650 to 1200, not the hard-coded 0-10000 of the original page.
  assert.deepEqual(priceBounds(rows), { min: 650, max: 1200 })
  assert.deepEqual(priceBounds([]), { min: 0, max: 10000 })
  // A single price still leaves a usable range.
  assert.deepEqual(priceBounds([{ startingPrice: 500 }]), { min: 500, max: 550 })
  // A listing with no usable price is never hidden by the price filter.
  assert.deepEqual(filterProviders([{ id: 'none', startingPrice: null, serviceNames: ['X'] }], { maxPrice: 100, categories }).map((row) => row.id), ['none'])
})

test('the service dropdown lists what the listed providers really offer', () => {
  const rows = categoryProviders({ providers }, { categoryId: 'home-cleaning', cityId: 1 })
  // Sorted, deduped, and driven by the live listings: a provider's new service appears without a code change.
  assert.deepEqual(serviceOptions(rows, categories[0]), ['Full Home Cleaning', 'Kitchen Cleaning'])
  // The category's own sub-services are the fallback only while nothing is listed.
  assert.deepEqual(serviceOptions([], categories[0]), ['Kitchen Cleaning'])
  assert.deepEqual(serviceOptions([], null), [])
})

test('service price follows the backend precedence', () => {
  assert.equal(servicePrice({ servicePricing: { 'Kitchen Cleaning': 799 }, subServices: ['Kitchen Cleaning'], startingPrice: 699 }, 'kitchen cleaning'), 799)
  assert.equal(servicePrice(providers[1], 'Full Home Cleaning'), 1200)
  assert.equal(servicePrice(providers[0], 'Kitchen Cleaning'), 699)
  assert.ok(Number.isNaN(servicePrice(providers[0], 'Unlisted')))
  assert.deepEqual(bookableServices(providers[1]).map((service) => [service.id, service.price]), [['S1', 1200]])
})

test('formats availability slots like the original UI', () => {
  assert.equal(formatSlot('09:00-12:00'), '09:00 AM – 12:00 PM')
  assert.equal(formatSlot('13:00-17:00'), '01:00 PM – 05:00 PM')
})

test('checkout validation messages match the original', () => {
  assert.equal(validateCustomerDetails({ name: '', phone: '', address: '' }).message, 'Enter your name.')
  assert.equal(validateCustomerDetails({ name: 'Asha Rao', phone: '12', address: '' }).message, 'Enter a valid phone number.')
  assert.equal(validateCustomerDetails({ name: 'Asha Rao', phone: '9876543210', address: '12 MG Road' }), null)
  assert.equal(validatePayment('card', {}).message, 'Please fill all card details.')
  assert.equal(validatePayment('card', { cardHolder: 'Asha Rao', cardNumber: '4111 1111 1111 1111', expiry: '01-20', cvv: '123' }).message, 'Expiry date must be in MM-YY format and should not be expired.')
  assert.equal(validatePayment('card', { cardHolder: 'Asha Rao', cardNumber: '4111 1111 1111 1111', expiry: '12-39', cvv: '123' }), null)
  assert.equal(validatePayment('netbanking', {}).message, 'Please select your bank.')
})

test('an approved provider\'s submitted photo is shown from the catalog photo route, and nothing else is trusted', async () => {
  const { providerDisplayImage } = await import('../src/features/discovery/catalogModel.js')
  const { API_BASE_URL } = await import('../src/services/apiBase.js')
  assert.equal(providerDisplayImage({ profilePhoto: '/catalog/providers/glow-studio-salon-at-home-3/photo', image: 'assets/images/salon-at-home/salon1.jpg' }), `${API_BASE_URL}/catalog/providers/glow-studio-salon-at-home-3/photo`)
  for (const profilePhoto of ['/catalog/providers/../../etc/photo', '/catalog/providers/x/photo?a=1', 'http://evil.test/catalog/providers/x/photo', '//evil.test/x', 'javascript:alert(1)']) {
    assert.notEqual(providerDisplayImage({ profilePhoto, image: 'assets/images/salon-at-home/salon1.jpg' }), profilePhoto)
    assert.doesNotMatch(providerDisplayImage({ profilePhoto, image: 'assets/images/salon-at-home/salon1.jpg' }), /evil|javascript|etc/)
  }
  assert.match(providerDisplayImage({ profilePhoto: '', image: 'assets/images/salon-at-home/salon1.jpg' }), /salon1\.jpg$/)
})
