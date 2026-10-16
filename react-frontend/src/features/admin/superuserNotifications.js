// Superuser notifications, shared by the topbar bell (Navbar) and the dashboard / user-management card.
// They live in the serveEaseSuperuserModuleData state record (`notifications`), as superuser.js kept them.
// Escalated support tickets are merged in by event id, so a ticket escalated after the list was first saved
// (or after "Mark All as Read" / "Clear All") still appears; cleared ticket events are remembered in
// `dismissedNotificationEvents` so "Clear All" does not bring them straight back.
import { getSuperuserModuleData, listEscalatedTickets, saveSuperuserModuleData } from './adminApi'

export const SUPERUSER_NOTIFICATIONS_CHANGED = 'serveease:superuser-notifications-changed'
export const OPEN_NOTIFICATION_PANEL = 'serveease:open-notification-panel'

// Legacy pages stored actionPage as an .html file name; map those to the React admin routes.
export function notificationDestination(actionPage) {
  const page = String(actionPage || '').toLowerCase()
  if (page.startsWith('/admin')) return page
  if (page.includes('escalated-ticket') || page.includes('escalated-complaint')) return '/admin/escalated-tickets'
  if (page.includes('provider-verification')) return '/admin/verification'
  if (page.includes('booking')) return '/admin/bookings'
  if (page.includes('finance')) return '/admin/finance'
  if (page.includes('management')) return '/admin/customers'
  if (page.includes('service-categor')) return '/admin/categories'
  if (page.includes('administration')) return '/admin/administration'
  return '/admin'
}

function ticketNotifications(tickets) {
  return (Array.isArray(tickets) ? tickets : []).map((ticket) => {
    const id = ticket?.ticketId || ticket?.id
    if (!id) return null
    return {
      id: `AN-escalated-${id}`,
      eventId: `ticket-escalated:${id}:superuser`,
      ticketId: id,
      text: `Support escalated ticket - ${id}`,
      type: 'red',
      createdAt: ticket.escalatedAt || ticket.updatedAt || ticket.createdAt,
      read: false,
      isRead: false,
      isNew: true,
      actionPage: '/admin/escalated-tickets',
    }
  }).filter(Boolean)
}

// One key per escalated ticket, whichever page saved the entry: superuser.js stored these under event ids such
// as "red:<ticket>:superuser", the ticket feed uses "ticket-escalated:<ticket>:superuser".
function escalationKey(item) {
  const ticketId = item.ticketId || item.referenceId || String(item.eventId || '').match(/^[^:]+:(.+):superuser$/)?.[1]
  return ticketId && /escalat/i.test(String(item.text || item.message || '')) ? `ticket-escalated:${ticketId}:superuser` : ''
}

function isRead(item) {
  return item.read === true || item.isRead === true || item.isNew === false
}

// Normalised, de-duplicated, newest-first list. Stored entries keep their read state; merged ticket entries
// start unread.
export function buildSuperuserNotifications(moduleData, tickets) {
  const stored = Array.isArray(moduleData?.notifications) ? moduleData.notifications : []
  const dismissed = new Set(Array.isArray(moduleData?.dismissedNotificationEvents) ? moduleData.dismissedNotificationEvents.map(String) : [])
  const seen = new Set()
  return [...stored, ...ticketNotifications(tickets)].map((item, index) => {
    const id = String(item.id || item.eventId || `notification-${index}`)
    const eventId = String(item.eventId || id)
    return {
      ...item,
      id,
      eventId,
      text: item.text || item.message || 'Platform update',
      createdAt: item.createdAt || item.createdAtIso || item.timestamp || item.time,
      to: notificationDestination(item.actionPage),
      isUnread: !isRead(item),
      escalationKey: escalationKey(item),
    }
  }).filter((item) => {
    const keys = [item.eventId, item.id, item.escalationKey].filter(Boolean)
    if (!item.createdAt || keys.some((key) => seen.has(key))) return false
    keys.forEach((key) => seen.add(key))
    return !keys.some((key) => dismissed.has(key))
  }).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
}

export async function loadSuperuserNotifications() {
  const [moduleResult, tickets] = await Promise.all([getSuperuserModuleData(), listEscalatedTickets()])
  const moduleData = moduleResult.value || {}
  return { moduleData, exists: moduleResult.exists, notifications: buildSuperuserNotifications(moduleData, tickets) }
}

function storedShape(item) {
  const { to, isUnread, escalationKey: key, ...rest } = item
  void to
  void key
  return { ...rest, read: !isUnread, isRead: !isUnread, isNew: isUnread }
}

// Saves on top of the latest server copy so concurrent changes to other module keys are kept, then tells
// every notification view to refresh.
async function persist(change) {
  const latest = await getSuperuserModuleData()
  const moduleData = latest.value || {}
  const next = change(moduleData)
  await saveSuperuserModuleData(next, latest.exists)
  window.dispatchEvent(new CustomEvent(SUPERUSER_NOTIFICATIONS_CHANGED))
  return next
}

export function markSuperuserNotificationsRead(notifications, ids) {
  const wanted = ids ? new Set(ids.map(String)) : null
  return persist((moduleData) => {
    const shown = new Set(notifications.map((item) => item.eventId))
    // Entries saved elsewhere after this list was loaded are kept as they are.
    const newer = (Array.isArray(moduleData.notifications) ? moduleData.notifications : [])
      .filter((item) => !shown.has(String(item.eventId || item.id)))
    return {
      ...moduleData,
      notifications: [...newer, ...notifications.map((item) => storedShape(!wanted || wanted.has(item.id) ? { ...item, isUnread: false } : item))],
    }
  })
}

export function clearSuperuserNotifications(notifications) {
  return persist((moduleData) => ({
    ...moduleData,
    notifications: [],
    dismissedNotificationEvents: [...new Set([
      ...(Array.isArray(moduleData.dismissedNotificationEvents) ? moduleData.dismissedNotificationEvents : []),
      ...notifications.flatMap((item) => [item.eventId, item.escalationKey].filter(Boolean)),
    ])],
  }))
}

// superuser.js addNotification(): one entry per event id, newest first.
export function addSuperuserNotification(notification) {
  const referenceId = notification.referenceId || notification.ticketId || ''
  const eventId = notification.eventId || [notification.kind || 'notification', referenceId, 'superuser'].join(':')
  return persist((moduleData) => {
    const stored = Array.isArray(moduleData.notifications) ? moduleData.notifications : []
    if (stored.some((item) => String(item.eventId) === eventId)) return moduleData
    const entry = {
      id: `AN-${eventId.replace(/[^a-z0-9:_-]/gi, '-')}`,
      eventId,
      createdAt: new Date().toISOString(),
      read: false,
      isRead: false,
      isNew: true,
      actionPage: '/admin',
      ...notification,
    }
    delete entry.kind
    return { ...moduleData, notifications: [entry, ...stored] }
  })
}

export function openNotificationPanel(showAll = true) {
  window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATION_PANEL, { detail: { showAll } }))
}
