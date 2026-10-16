const readKey = (user, department) => `serveEaseEmployeeNotificationReads:${department}:${user?.userId || user?.email || 'employee'}`

export function readEmployeeNotificationIds(user, department) {
  try {
    const saved = JSON.parse(localStorage.getItem(readKey(user, department)) || '[]')
    return new Set(Array.isArray(saved) ? saved : [])
  } catch {
    return new Set()
  }
}

export function saveEmployeeNotificationIds(user, department, ids) {
  localStorage.setItem(readKey(user, department), JSON.stringify([...ids]))
}

// Employee bells deliberately contain operational work only: relevant tickets and account intake/review events.
export function buildEmployeeNotifications({ department, tickets = [], customers = [], providers = [] }, user) {
  const readIds = readEmployeeNotificationIds(user, department)
  const notifications = []
  const add = (id, text, createdAt, to) => notifications.push({ id, text, createdAt, to, isUnread: !readIds.has(id) })

  if (department === 'Customer Operations') {
    customers.forEach((customer) => {
      if (!customer?.id) return
      add(`customer-signup:${customer.id}`, `Customer signup: ${customer.fullName || customer.email || customer.id}`, customer.registrationDate, `/employee/customer-operations/${encodeURIComponent(customer.id)}`)
    })
    tickets.filter((ticket) => ticket?.ticketId && ticket.raisedByType === 'customer').forEach((ticket) => {
      const status = String(ticket.status || '').toLowerCase()
      if (!['pending', 'open', 'in progress', 'escalated', 'under review'].includes(status)) return
      const to = ticket.customerId ? `/employee/customer-operations/${encodeURIComponent(ticket.customerId)}` : '/employee/customer-operations'
      add(`customer-ticket:${ticket.ticketId}:${status}`, `Customer support ticket ${ticket.ticketId}${ticket.subject ? `: ${ticket.subject}` : ''}`, ticket.updatedAt || ticket.createdAt, to)
    })
  }

  if (department === 'Provider Operations') {
    providers.forEach((provider) => {
      if (!provider?.id) return
      const name = provider.organisationName || provider.fullName || provider.email || provider.id
      const to = `/employee/provider-operations/${encodeURIComponent(provider.id)}${provider.providerCatalogId ? `?listing=${encodeURIComponent(provider.providerCatalogId)}` : ''}`
      add(`provider-signup:${provider.id}:${provider.providerCatalogId || ''}`, `Provider signup: ${name}`, provider.registrationDate, to)
      if (String(provider.accountStatus || '').toLowerCase() === 'under verification') {
        const review = `/employee/provider-operations/${encodeURIComponent(provider.id)}/verification-review${provider.sharedId && provider.providerCatalogId ? `?listing=${encodeURIComponent(provider.providerCatalogId)}` : ''}`
        add(`provider-verification:${provider.id}:${provider.providerCatalogId || ''}`, `Verification pending: ${name}`, provider.registrationDate, review)
      }
    })
    tickets.filter((ticket) => ticket?.ticketId && ticket.raisedByType === 'provider').forEach((ticket) => {
      const status = String(ticket.status || '').toLowerCase()
      if (!['pending', 'open', 'in progress', 'escalated', 'under review'].includes(status)) return
      const to = ticket.providerId ? `/employee/provider-operations/${encodeURIComponent(ticket.providerId)}` : '/employee/provider-operations'
      add(`provider-ticket:${ticket.ticketId}:${status}`, `Provider support ticket ${ticket.ticketId}${ticket.subject ? `: ${ticket.subject}` : ''}`, ticket.updatedAt || ticket.createdAt, to)
    })
  }

  return notifications.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 30)
}
