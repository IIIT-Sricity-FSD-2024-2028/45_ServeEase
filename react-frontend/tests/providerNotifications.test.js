import test from 'node:test'
import assert from 'node:assert/strict'
import { buildProviderNotifications } from '../src/features/provider/providerNotifications.js'
import { customServiceError } from '../src/features/auth/signupPayload.js'

const store = {}
globalThis.localStorage = {
  getItem: (key) => store[key] ?? null,
  setItem: (key, value) => { store[key] = String(value) },
  removeItem: (key) => { delete store[key] },
}

const user = { userId: 'PRO1', email: 'pro@example.test' }
const bookings = [
  { id: 'BOOK-1', service: 'Haircut', customerName: 'Asha', status: 'Pending', createdAt: '2026-10-16T09:00:00.000Z' },
  { id: 'BOOK-2', service: 'Shave', status: 'Completed', statusUpdatedAt: '2026-10-15T09:00:00.000Z' },
]
const tickets = [
  { ticketId: 'TKT-9', status: 'Resolved', updatedAt: '2026-10-14T09:00:00.000Z', messages: [{ senderType: 'provider', text: 'hi', sentAt: '2026-10-13T09:00:00.000Z' }, { senderType: 'support', text: 'Payout released', sentAt: '2026-10-14T08:00:00.000Z' }] },
]

test('a provider is notified about work to do and replies received, newest first', () => {
  const notifications = buildProviderNotifications(bookings, tickets, user)
  assert.deepEqual(notifications.map((item) => item.text), [
    'New booking request for Haircut from Asha.',
    'Shave booking BOOK-2 is completed.',
    'Support ticket TKT-9 has been resolved.',
    'ServeEase Support replied on TKT-9: Payout released',
  ])
  // A new request and a support reply need attention; an outcome the provider caused does not.
  assert.deepEqual(notifications.filter((item) => item.isUnread).map((item) => item.id.split(':')[0]), ['booking', 'ticket', 'message'])
  assert.deepEqual([...new Set(notifications.map((item) => item.to))], ['/provider/bookings', '/provider/support'])
})

test('records with no id or status are skipped, and empty inputs are safe', () => {
  assert.deepEqual(buildProviderNotifications([{ service: 'No id' }, { id: 'B', service: 'No status' }], [{ subject: 'No id' }], user), [])
  assert.deepEqual(buildProviderNotifications(null, undefined, user), [])
})

test('the signup "Other" service is validated before it is sent', () => {
  const available = ['Haircut']
  assert.equal(customServiceError({ enabled: false }, available, {}), false)
  assert.equal(customServiceError({ enabled: true, name: '', price: '500' }, available, {}), 'Enter the name of the service you offer.')
  assert.match(customServiceError({ enabled: true, name: '##', price: '500' }, available, {}), /letters, numbers/)
  assert.match(customServiceError({ enabled: true, name: 'haircut', price: '500' }, available, {}), /already listed/)
  assert.match(customServiceError({ enabled: true, name: 'Beard Trim', price: '0' }, available, {}), /price of at least 1/)
  assert.equal(customServiceError({ enabled: true, name: 'Beard Trim', price: '250' }, available, {}), false)
})
