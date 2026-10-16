import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'

register('./support/jsx-hooks.mjs', import.meta.url)

const {
  addSuperuserNotification,
  buildSuperuserNotifications,
  clearSuperuserNotifications,
  markSuperuserNotificationsRead,
  notificationDestination,
  SUPERUSER_NOTIFICATIONS_CHANGED,
} = await import('../src/features/admin/superuserNotifications.js')
const { applyAdminSearch, matchesAdminSearch } = await import('../src/features/admin/adminSearch.js')

globalThis.window = new EventTarget()
globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }

// In-memory /state/serveEaseSuperuserModuleData: GET returns the entry (404 until created), PATCH and POST save it.
function stubStateApi(initial) {
  let entry = initial === undefined ? null : { value: initial }
  globalThis.fetch = async (url, options = {}) => {
    const method = options.method || 'GET'
    if (method === 'GET') {
      return entry
        ? new Response(JSON.stringify({ data: entry }), { status: 200 })
        : new Response(JSON.stringify({ message: 'Not found' }), { status: 404 })
    }
    const body = JSON.parse(options.body)
    entry = { value: body.value }
    return new Response(JSON.stringify({ data: entry }), { status: 200 })
  }
  return () => entry?.value
}

const escalated = [{ ticketId: 'TKT-1', escalatedAt: '2026-10-16T10:00:00.000Z' }]

test('escalated tickets appear unread until the list is saved, newest first', () => {
  const stored = { notifications: [{ id: 'AN-old', eventId: 'old', text: 'Older update', createdAt: '2026-10-15T10:00:00.000Z', read: true }] }
  const notifications = buildSuperuserNotifications(stored, escalated)
  assert.deepEqual(notifications.map((item) => [item.text, item.isUnread]), [
    ['Support escalated ticket - TKT-1', true],
    ['Older update', false],
  ])
  assert.equal(notifications[0].to, '/admin/escalated-tickets')
})

test('a ticket escalated after "Mark All as Read" still reaches the superuser', async () => {
  const saved = stubStateApi({ activities: [{ action: 'kept' }] })
  const first = buildSuperuserNotifications({}, escalated)
  await markSuperuserNotificationsRead(first)
  const later = [...escalated, { ticketId: 'TKT-2', escalatedAt: '2026-10-17T10:00:00.000Z' }]
  const notifications = buildSuperuserNotifications(saved(), later)
  assert.deepEqual(notifications.map((item) => [item.ticketId, item.isUnread]), [['TKT-2', true], ['TKT-1', false]])
  assert.deepEqual(saved().activities, [{ action: 'kept' }], 'other module keys survive the save')
})

test('"Clear All" keeps cleared ticket events away but lets new ones in', async () => {
  const saved = stubStateApi()
  await clearSuperuserNotifications(buildSuperuserNotifications({}, escalated))
  assert.deepEqual(buildSuperuserNotifications(saved(), escalated), [])
  const later = [...escalated, { ticketId: 'TKT-3', escalatedAt: '2026-10-17T11:00:00.000Z' }]
  assert.deepEqual(buildSuperuserNotifications(saved(), later).map((item) => item.ticketId), ['TKT-3'])
})

test('an escalation saved by the legacy pages is neither duplicated nor revived after "Clear All"', async () => {
  const legacy = { notifications: [{ id: 'AN-red-TKT-1', eventId: 'red:TKT-1:superuser', ticketId: 'TKT-1', text: 'Support escalated ticket - TKT-1', createdAt: '2026-10-16T10:00:00.000Z', read: false }] }
  assert.equal(buildSuperuserNotifications(legacy, escalated).length, 1)
  const saved = stubStateApi(legacy)
  await clearSuperuserNotifications(buildSuperuserNotifications(legacy, escalated))
  assert.deepEqual(buildSuperuserNotifications(saved(), escalated), [])
})

test('marking read keeps an entry another view saved after this list loaded', async () => {
  const saved = stubStateApi({ notifications: [] })
  const shown = buildSuperuserNotifications({}, escalated)
  await addSuperuserNotification({ kind: 'ticket-resolved', ticketId: 'TKT-9', text: 'TKT-9 resolved by superuser', actionPage: '/admin/escalated-tickets' })
  await markSuperuserNotificationsRead(shown, [shown[0].id])
  const texts = buildSuperuserNotifications(saved(), []).map((item) => item.text)
  assert.ok(texts.includes('TKT-9 resolved by superuser'))
  assert.ok(texts.includes('Support escalated ticket - TKT-1'))
})

test('saving announces the change so the bell and the card refresh', async () => {
  stubStateApi({})
  let announced = 0
  window.addEventListener(SUPERUSER_NOTIFICATIONS_CHANGED, () => { announced += 1 })
  await addSuperuserNotification({ kind: 'ticket-in-progress', ticketId: 'TKT-5', text: 'TKT-5 moved to In Progress' })
  assert.equal(announced, 1)
})

test('legacy .html action pages map to the admin routes', () => {
  assert.equal(notificationDestination('superuser-escalated-tickets.html'), '/admin/escalated-tickets')
  assert.equal(notificationDestination('superuser-provider-verification.html'), '/admin/verification')
  assert.equal(notificationDestination('/admin/bookings'), '/admin/bookings')
  assert.equal(notificationDestination(''), '/admin')
})

test('the dashboard search routes on Enter like superuser.js setupGlobalSearch', () => {
  assert.equal(applyAdminSearch('/admin', 'ticket 42', true), '/admin/escalated-tickets')
  assert.equal(applyAdminSearch('/admin', 'my booking', true), '/admin/bookings')
  assert.equal(applyAdminSearch('/admin', 'asha', true), '/admin/customers')
  assert.equal(applyAdminSearch('/admin', '   ', true), null)
  assert.equal(applyAdminSearch('/admin', 'asha'), null)
})

test('page search needs every word somewhere in the record', () => {
  assert.equal(matchesAdminSearch(['Asha Rao', 'asha@example.test', null], 'asha example'), true)
  assert.equal(matchesAdminSearch(['Asha Rao', 'asha@example.test'], 'asha plumber'), false)
  assert.equal(matchesAdminSearch(['anything'], '  '), true)
})
