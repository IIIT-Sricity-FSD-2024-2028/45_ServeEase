// Port of front-end/JavaScript/search.js for the provider-*.html pages: the topbar search filters the
// page's own cards and rows in place (it never navigates away).
export const providerSearchPlaceholders = {
  '/provider/dashboard': 'Search for bookings, services...',
  '/provider/services': 'Search services...',
  '/provider/availability': 'Search services...',
  '/provider/bookings': 'Search bookings...',
  '/provider/earnings': 'Search transactions...',
  '/provider/support': 'Search support...',
  '/provider/account': 'Search profile info...',
}

const searchConfigs = {
  '/provider/dashboard': [
    { container: '.provider-actions-grid', items: '.feature-card', emptyText: 'No actions matched your search.' },
    { container: '#providerPerformanceList', items: '.preview-item', emptyText: 'No performance items matched your search.' },
  ],
  '/provider/services': [{ container: '#providerServiceGrid', items: '.provider-service-card', emptyText: 'No services matched your search.' }],
  '/provider/bookings': [{ container: '#providerBookingsList', items: '.provider-booking-card', emptyText: 'No bookings matched your search.' }],
  '/provider/earnings': [{ container: '#providerTransactionsTableBody', items: 'tr', emptyText: 'No transactions matched your search.' }],
  '/provider/support': [
    { container: '#providerSupportTicketsList', items: '.ticket-card', emptyText: 'No support tickets matched your search.' },
    { container: '#providerCommonIssuesList', items: '.provider-faq-item-wrap', emptyText: 'No common issues matched your search.' },
  ],
  '/provider/account': [{ container: '.provider-profile-layout', items: '.info-box, .panel-card', emptyText: 'No account details matched your search.' }],
}

export function applyProviderSearch(pathname, value) {
  const term = String(value || '').trim().toLowerCase()
  ;(searchConfigs[pathname] || []).forEach((config) => {
    const container = document.querySelector(config.container)
    if (!container) return
    const items = Array.from(container.querySelectorAll(config.items))
    if (!items.length) return
    let visible = 0
    items.forEach((item) => {
      const match = !term || item.textContent.toLowerCase().includes(term)
      item.style.display = match ? '' : 'none'
      if (match) visible += 1
    })
    // Transaction rows live in a <tbody>, so the empty notice is a sibling of the table card instead.
    const host = container.tagName === 'TBODY' ? container.closest('.table-card')?.parentElement || container : container
    let notice = host.querySelector(':scope > .search-empty-state')
    if (!notice) {
      notice = document.createElement('div')
      notice.className = 'search-empty-state'
      notice.textContent = config.emptyText
      host.appendChild(notice)
    }
    notice.style.display = visible === 0 ? 'block' : 'none'
  })
}
