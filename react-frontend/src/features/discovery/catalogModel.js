// Catalog helpers for the customer journey, ported from front-end/JavaScript/app.js
// (initCategoryServicesPage, provider profile and checkout helpers).

import { API_BASE_URL } from '../../services/apiBase.js'

export const MAX_PRICE = 10000
export const PRICE_STEP = 50
const FALLBACK_IMAGE = '/assets/images/home-cleaning/clean1.jpg'

export const formatCurrency = (value) => `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`

// GET /api/catalog answers { success, data: { categories, providers, popularServices } } and the API
// client returns `data`. Accept the envelope too, and always hand the filters real arrays.
export function normalizeCatalog(value) {
  const catalog = value && typeof value === 'object' && !Array.isArray(value) && value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data : value
  const list = (key) => (Array.isArray(catalog?.[key]) ? catalog[key].filter((item) => item && typeof item === 'object') : [])
  return { categories: list('categories'), providers: list('providers'), popularServices: list('popularServices') }
}

export function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// URL category params are category ids (slugs such as "home-cleaning"); a slugified name is
// accepted as a fallback so links built from display names still resolve.
export function resolveCategory(categories, param) {
  if (!param || !Array.isArray(categories)) return null
  return categories.find((category) => category.id === param)
    || categories.find((category) => slugify(category.name) === slugify(param))
    || null
}

export function assetUrl(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^(https?:|data:|\/)/i.test(text)) return text
  return `/${text.replace(/^\.\//, '')}`
}

export function providerDisplayImage(provider) {
  if (!provider) return FALLBACK_IMAGE
  const photo = String(provider.profilePhoto || '').trim()
  // An approved provider's own submitted photo, served by the catalog API (never a private document URL).
  if (/^\/catalog\/providers\/[A-Za-z0-9._%-]+\/photo$/.test(photo)) return `${API_BASE_URL}${photo}`
  if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(photo) || /^https?:\/\/[^/]+\/uploads\/profiles\//i.test(photo)) return photo
  const image = String(provider.image || '').trim()
  if (/^\/uploads\/profiles\//i.test(image) || /^https?:\/\/[^/]+\/uploads\/profiles\//i.test(image)) return FALLBACK_IMAGE
  return assetUrl(image) || FALLBACK_IMAGE
}

export const imageFallback = (event) => {
  event.currentTarget.onerror = null
  event.currentTarget.src = FALLBACK_IMAGE
}

export function dedupeActiveServices(services) {
  const ids = new Set()
  const names = new Set()
  return (Array.isArray(services) ? services : []).filter((service) => {
    if (!service || service.status === 'Inactive' || service.isActive === false) return false
    const id = String(service.id || '').trim()
    const name = String(service.name || '').trim().toLowerCase()
    if (!name || (id && ids.has(id)) || names.has(name)) return false
    if (id) ids.add(id)
    names.add(name)
    return true
  })
}

const serviceKey = (value) => String(value || '').trim().toLowerCase()

// Same precedence as BookingsService.createForCustomer on the backend, so the price shown is the
// amount the booking API will record: servicePricing → services[].price → startingPrice.
export function servicePrice(provider, serviceName) {
  if (!provider) return NaN
  const name = serviceKey(serviceName)
  const priced = Object.entries(provider.servicePricing || {}).find(([key]) => serviceKey(key) === name)?.[1]
  const record = (Array.isArray(provider.services) ? provider.services : []).find((service) => service && serviceKey(service.name || service.serviceName) === name)
  const listed = (provider.subServices || []).some((item) => serviceKey(item) === name)
  const price = Number(priced ?? record?.price ?? record?.serviceFee ?? (listed ? provider.startingPrice : NaN))
  return Number.isFinite(price) && price > 0 ? price : NaN
}

// Services a customer can book: active provider-managed records when the provider has them,
// otherwise the catalog sub-service names (as the original profile page did).
export function bookableServices(provider) {
  if (!provider) return []
  const managed = Array.isArray(provider.services)
  const source = managed
    ? dedupeActiveServices(provider.services)
    : (provider.subServices || []).map((name) => ({ name }))
  return source
    .map((service) => ({
      id: service.id ? String(service.id) : '',
      name: String(service.name).trim(),
      description: service.description || '',
      duration: service.duration || '',
      price: servicePrice(provider, service.name),
    }))
    .filter((service) => service.name && Number.isFinite(service.price))
}

function accountState(provider) {
  return String(provider?.accountStatus || provider?.status || provider?.approvalStatus || provider?.verificationStatus || 'Active')
    .trim().toLowerCase().replace(/[_-]+/g, ' ')
}

export function providerIsDiscoverable(provider) {
  return Boolean(provider)
    && !['suspended', 'blocked', 'rejected', 'verification rejected', 'under verification', 'pending', 'pending approval'].includes(accountState(provider))
    && provider.verified !== false
}

function providerIdentityKey(provider) {
  const registrationId = String(provider?.providerCatalogId || provider?.catalogProviderId || '').trim().toLowerCase()
  if (String(provider?.name || provider?.id || '').toLowerCase().includes('cleanpro')) {
    return `cleanpro|${provider?.category || ''}|${Number(provider?.cityId || 0)}`
  }
  const rawId = String(registrationId || provider?.id || provider?.providerId || provider?.ownerProviderId || '').trim().toLowerCase()
  const base = provider?.category && provider?.cityId
    ? rawId.replace(new RegExp(`-${String(provider.category).toLowerCase()}-${Number(provider.cityId)}$`), '')
    : rawId
  return base || [provider?.name, provider?.category, provider?.cityId].map((value) => slugify(value)).join('|')
}

// One listing row per provider, with services/prices taken from the active service records.
export function listingRow(provider) {
  const services = bookableServices(provider)
  return {
    ...provider,
    serviceNames: services.map((service) => service.name),
    startingPrice: services.length ? Math.min(...services.map((service) => service.price)) : Number(provider.startingPrice),
  }
}

export function categoryProviders(catalog, { categoryId, cityId }) {
  const rows = (Array.isArray(catalog?.providers) ? catalog.providers : [])
    .filter((provider) => providerIsDiscoverable(provider)
      && (!categoryId || provider.category === categoryId)
      && (!cityId || Number(provider.cityId) === Number(cityId)))
    .map(listingRow)
    .filter((row) => row.serviceNames.length)
  const byIdentity = new Map()
  rows.forEach((row) => {
    const key = providerIdentityKey(row)
    const existing = byIdentity.get(key)
    if (!existing || (row.ownerProviderId && !existing.ownerProviderId) || row.serviceNames.length > existing.serviceNames.length) byIdentity.set(key, row)
  })
  return [...byIdentity.values()]
}

export function filterProviders(rows, { query = '', service = 'all', maxPrice = MAX_PRICE, categories = [] }) {
  const needle = query.trim().toLowerCase()
  const categoryName = (id) => categories.find((category) => category.id === id)?.name || ''
  return rows.filter((row) => {
    if (row.startingPrice > maxPrice) return false
    if (service !== 'all' && !row.serviceNames.includes(service)) return false
    if (!needle) return true
    return [row.name, categoryName(row.category), ...row.serviceNames].join(' ').toLowerCase().includes(needle)
  })
}

export function ratingSummary(provider) {
  const reviews = Number(provider?.reviews) || 0
  const rating = Number(provider?.rating) || 0
  return reviews && rating ? { rating, reviews } : null
}

export const availabilityProviderId = (provider) => provider?.ownerProviderId || provider?.id

// "09:00-12:00" → "09:00 AM – 12:00 PM" (formatAvailabilitySlot in the original).
export function formatSlot(slot) {
  return String(slot || '').replace(/\b(\d{1,2}):(\d{2})\b/g, (match, hour, minute) => {
    const value = Number(hour)
    return `${String(value % 12 || 12).padStart(2, '0')}:${minute} ${value >= 12 ? 'PM' : 'AM'}`
  }).replace(/-/g, ' – ')
}

export function dateParts(item) {
  const match = String(item?.date || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return { weekday: item?.dayOfWeek || 'Date', date: item?.date || '' }
  const local = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return {
    weekday: item.dayOfWeek || local.toLocaleDateString(undefined, { weekday: 'long' }),
    date: local.toLocaleDateString(undefined, { day: '2-digit', month: 'short' }),
  }
}

// api.js ServeEaseDate.formatDate(): DD-MM-YYYY for a YYYY-MM-DD date.
export function formatDisplayDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return value || ''
  return `${match[3]}-${match[2]}-${match[1]}`
}

// Checkout validation, from submitBookingCheckout() in the original.
export function validateCustomerDetails({ name, phone, address }) {
  if (!name.trim()) return { field: 'name', message: 'Enter your name.' }
  if (!/^[A-Za-z ]{3,60}$/.test(name.trim())) return { field: 'name', message: 'Enter a valid customer name.' }
  if (!phone.trim()) return { field: 'phone', message: 'Enter your phone number.' }
  if (!/^\+?\d[\d ]{9,14}$/.test(phone.trim())) return { field: 'phone', message: 'Enter a valid phone number.' }
  if (!address.trim()) return { field: 'address', message: 'Enter the service address.' }
  if (address.trim().length < 5) return { field: 'address', message: 'Enter the complete service address.' }
  return null
}

function isValidExpiry(value) {
  if (!/^(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false
  const [month, year] = value.split('-').map(Number)
  return new Date(2000 + year, month, 0, 23, 59, 59, 999).getTime() >= Date.now()
}

export function validatePayment(type, payment) {
  if (type === 'card') {
    const { cardHolder = '', cardNumber = '', expiry = '', cvv = '' } = payment
    if (!cardHolder.trim() || !cardNumber.trim() || !expiry.trim() || !cvv.trim()) return { field: 'cardHolder', message: 'Please fill all card details.' }
    if (!/^[A-Za-z ]{3,60}$/.test(cardHolder.trim())) return { field: 'cardHolder', message: 'Enter a valid cardholder name.' }
    if (!/^\d{16}$/.test(cardNumber.replace(/\D/g, ''))) return { field: 'cardNumber', message: 'Enter a valid 16-digit card number.' }
    if (!isValidExpiry(expiry.trim())) return { field: 'expiry', message: 'Expiry date must be in MM-YY format and should not be expired.' }
    if (!/^\d{3}$/.test(cvv.trim())) return { field: 'cvv', message: 'CVV must be exactly 3 digits.' }
  }
  if (type === 'upi' && (!String(payment.upiId || '').trim() || !payment.upiApp)) return { field: payment.upiId ? 'upiApp' : 'upiId', message: 'Please enter valid UPI details.' }
  if (type === 'netbanking' && !payment.bankName) return { field: 'bankName', message: 'Please select your bank.' }
  return null
}

export function paymentMethodLabel(type, payment) {
  if (type === 'upi') return `UPI - ${payment.upiApp}`
  if (type === 'netbanking') return `Net Banking - ${payment.bankName}`
  return 'Credit / Debit Card'
}
