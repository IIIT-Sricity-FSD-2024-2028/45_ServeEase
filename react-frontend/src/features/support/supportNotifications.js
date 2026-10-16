// Support-agent notifications, derived from the real ticket queue (no stored copies): every new ticket still
// waiting for a first response, and the latest message a customer or provider sent on each ticket. Read state is
// kept per agent in this browser, like the customer bell.
const readKey = (user) => `serveEaseSupportNotificationReads:${user?.userId || user?.email || 'support'}`

export function readSupportNotificationIds(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(readKey(user)) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

export function saveSupportNotificationIds(user, ids) {
  localStorage.setItem(readKey(user), JSON.stringify([...ids]))
}

export function buildSupportNotifications(tickets, user) {
  const readIds = readSupportNotificationIds(user)
  const notifications = []
  tickets.forEach((ticket) => {
    if (!ticket.ticketId) return
    const who = ticket.raisedByType === 'provider' ? 'provider' : 'customer'
    const to = `/employee/support-tickets/${encodeURIComponent(ticket.ticketId)}`
    if (['Pending', 'Open'].includes(ticket.status)) {
      const id = `ticket:${ticket.ticketId}:new`
      notifications.push({ id, text: `New ${who} ticket ${ticket.ticketId}${ticket.subject ? `: ${ticket.subject}` : ''}`, createdAt: ticket.createdAt, isUnread: !readIds.has(id), to })
    }
    const incoming = (Array.isArray(ticket.messages) ? ticket.messages : []).filter((message) => message.senderType === 'customer' || message.senderType === 'provider')
    const last = incoming[incoming.length - 1]
    if (last) {
      const id = `message:${ticket.ticketId}:${last.messageId || last.sentAt}`
      notifications.push({ id, text: `New message from ${last.senderType} on ${ticket.ticketId}: ${String(last.text).slice(0, 80)}`, createdAt: last.sentAt, isUnread: !readIds.has(id), to })
    }
  })
  return notifications.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 30)
}
