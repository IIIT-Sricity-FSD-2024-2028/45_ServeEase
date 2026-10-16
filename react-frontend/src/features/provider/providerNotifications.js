// Provider notifications, derived from the provider's own records the way the customer bell is derived from
// theirs (front-end/CSS/dashboard.css .notification-panel is the shared panel): the bookings they have to act
// on or that changed, and replies on their support tickets. Nothing is stored server-side; read state is kept
// per provider in this browser.
const readKey = (user) => `serveEaseProviderNotificationReads:${user?.userId || user?.email || 'provider'}`

export function readProviderNotificationIds(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(readKey(user)) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

export function saveProviderNotificationIds(user, ids) {
  localStorage.setItem(readKey(user), JSON.stringify([...ids]))
}

// A new request is unread until the provider opens it; an outcome they caused themselves is not.
const unreadBookingStatuses = ['pending']

export function buildProviderNotifications(bookings, tickets, user) {
  const readIds = readProviderNotificationIds(user)
  const notifications = []

  ;(Array.isArray(bookings) ? bookings : []).forEach((booking) => {
    if (!booking?.id || !booking.status) return
    const status = String(booking.status).toLowerCase()
    const id = `booking:${String(booking.id).toLowerCase()}:${status}`
    const service = booking.service || 'A service'
    notifications.push({
      id,
      text: status === 'pending'
        ? `New booking request for ${service}${booking.customerName ? ` from ${booking.customerName}` : ''}.`
        : `${service} booking ${booking.id} is ${status}.`,
      createdAt: booking.statusUpdatedAt || booking.createdAt,
      isUnread: unreadBookingStatuses.includes(status) && !readIds.has(id),
      to: '/provider/bookings',
    })
  })

  ;(Array.isArray(tickets) ? tickets : []).forEach((ticket) => {
    if (!ticket?.ticketId) return
    const status = String(ticket.status || '').toLowerCase()
    const id = `ticket:${String(ticket.ticketId).toLowerCase()}:${status}`
    notifications.push({
      id,
      text: status.startsWith('resolved')
        ? `Support ticket ${ticket.ticketId} has been resolved.`
        : `Support ticket ${ticket.ticketId} is ${status || 'open'}.`,
      createdAt: ticket.updatedAt || ticket.createdAt,
      isUnread: status.startsWith('resolved') && !readIds.has(id),
      to: '/provider/support',
    })

    // The latest reply ServeEase Support sent on that ticket.
    const replies = (Array.isArray(ticket.messages) ? ticket.messages : []).filter((message) => message?.senderType === 'support')
    const last = replies[replies.length - 1]
    if (!last) return
    const replyId = `message:${String(ticket.ticketId).toLowerCase()}:${last.messageId || last.sentAt}`
    notifications.push({
      id: replyId,
      text: `ServeEase Support replied on ${ticket.ticketId}: ${String(last.text || '').slice(0, 80)}`,
      createdAt: last.sentAt,
      isUnread: !readIds.has(replyId),
      to: '/provider/support',
    })
  })

  return notifications
    .sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    .slice(0, 30)
}
