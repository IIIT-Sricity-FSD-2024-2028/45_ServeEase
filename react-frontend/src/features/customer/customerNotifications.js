const readKey = (user) => `serveEaseCustomerNotificationReads:${user?.userId || user?.email || 'customer'}`

export function readCustomerNotificationIds(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(readKey(user)) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

export function saveCustomerNotificationIds(user, ids) {
  localStorage.setItem(readKey(user), JSON.stringify([...ids]))
}

function belongsToCustomer(record, user) {
  if (record.customerId && user?.userId) return String(record.customerId) === String(user.userId)
  if (record.customerEmail && user?.email) return String(record.customerEmail).toLowerCase() === String(user.email).toLowerCase()
  return false
}

export function buildCustomerNotifications(bookings, tickets, user) {
  const readIds = readCustomerNotificationIds(user)
  const notifications = []

  tickets.forEach((ticket) => {
    if (!ticket.ticketId || !ticket.status) return
    const status = String(ticket.status)
    const statusKey = status.toLowerCase()
    const id = `ticket:${ticket.ticketId.toLowerCase()}:${statusKey}`
    const createdAt = ticket.updatedAt || ticket.createdAt
    notifications.push({
      id,
      text: statusKey.startsWith('resolved')
        ? `Support ticket ${ticket.ticketId} has been resolved.`
        : `Support ticket ${ticket.ticketId} is ${statusKey}.`,
      createdAt,
      isUnread: statusKey === 'open' && !readIds.has(id),
      to: '/customer/support',
    })
  })

  bookings.filter((booking) => belongsToCustomer(booking, user)).forEach((booking) => {
    if (!booking.id || !booking.status) return
    const status = String(booking.status)
    const statusKey = status.toLowerCase()
    const createdAt = booking.statusUpdatedAt || booking.createdAt
    const id = `booking:${String(booking.id).toLowerCase()}:${statusKey}`
    notifications.push({
      id,
      text: `${booking.service || 'Your booking'} is ${statusKey}.`,
      createdAt,
      isUnread: ['pending', 'accepted'].includes(statusKey) && !readIds.has(id),
      to: '/customer/bookings',
    })

    if (!booking.paymentStatus) return
    const paymentStatus = String(booking.paymentStatus)
    const paymentStatusKey = paymentStatus.toLowerCase()
    const paymentId = booking.paymentId || booking.id
    const paymentNotificationId = `payment:${String(paymentId).toLowerCase()}:${paymentStatusKey}`
    notifications.push({
      id: paymentNotificationId,
      text: `Payment ${booking.paymentId ? `${booking.paymentId} ` : ''}for ${booking.service || 'your service'} is ${paymentStatusKey}.`,
      createdAt: booking.paymentDate || booking.statusUpdatedAt || booking.createdAt,
      isUnread: ['pending', 'failed'].includes(paymentStatusKey) && !readIds.has(paymentNotificationId),
      to: '/customer/payments',
    })
  })

  return notifications.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 30)
}
