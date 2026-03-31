
(function () {
  function pageName() {
    return (window.location.pathname.split('/').pop() || '').toLowerCase();
  }

  function getSearchInput() {
    return document.querySelector('.dashboard-search input');
  }

  function ensureEmptyState(container, id, text) {
    if (!container) return null;
    let state = document.getElementById(id);
    if (!state) {
      state = document.createElement('div');
      state.id = id;
      state.className = 'search-empty-state';
      state.textContent = text;
      state.style.display = 'none';
      container.appendChild(state);
    }
    return state;
  }

  function filterElements(config, term) {
    const container = document.querySelector(config.container);
    if (!container) return;
    const items = Array.from(container.querySelectorAll(config.items));
    if (!items.length) return;

    let visibleCount = 0;
    items.forEach(function (item) {
      const text = item.textContent.toLowerCase();
      const match = !term || text.indexOf(term) !== -1;
      item.style.display = match ? '' : 'none';
      if (match) visibleCount += 1;
    });

    const emptyState = ensureEmptyState(container, config.emptyId, config.emptyText || 'No matching results found.');
    if (emptyState) {
      emptyState.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  }

  function filterMultiple(configs, term) {
    configs.forEach(function (config) {
      filterElements(config, term);
    });
  }

  function setupSearch() {
    const input = getSearchInput();
    if (!input) return;

    const map = {
      'customer-dashboard.html': [
        { container: '#customerBookingPreview', items: '.booking-preview-card, .preview-item', emptyId: 'searchEmptyBookings', emptyText: 'No bookings matched your search.' },
        { container: '#customerQuickActions', items: '.feature-card', emptyId: 'searchEmptyQuickActions', emptyText: 'No quick actions matched your search.' }
      ],
      'my-bookings.html': [
        { container: '#bookingsList', items: '.booking-card', emptyId: 'searchEmptyMyBookings', emptyText: 'No bookings matched your search.' }
      ],
      'payment-history.html': [
        { container: '#paymentTableBody', items: 'tr', emptyId: 'searchEmptyPayments', emptyText: 'No payments matched your search.' }
      ],
      'customer-support-center.html': [
        { container: '#supportTicketsList', items: '.ticket-card', emptyId: 'searchEmptySupportTickets', emptyText: 'No support tickets matched your search.' },
        { container: '.faq-list', items: '.faq-item-wrap', emptyId: 'searchEmptyFaqs', emptyText: 'No help resources matched your search.' }
      ],
      'customer-profile.html': [
        { container: '.profile-sections', items: '.info-box, .panel-card', emptyId: 'searchEmptyProfile', emptyText: 'No profile details matched your search.' }
      ],
      'provider-dashboard.html': [
        { container: '.provider-actions-grid', items: '.feature-card', emptyId: 'searchEmptyProviderActions', emptyText: 'No actions matched your search.' },
        { container: '#providerPerformanceList', items: '.preview-item', emptyId: 'searchEmptyProviderPerformance', emptyText: 'No performance items matched your search.' }
      ],
      'provider-services.html': [
        { container: '#providerServiceGrid', items: '.provider-service-card', emptyId: 'searchEmptyProviderServices', emptyText: 'No services matched your search.' },
        { container: '.provider-availability-slots', items: '.provider-slot-check-row', emptyId: 'searchEmptyProviderSlots', emptyText: 'No availability slots matched your search.' }
      ],
      'provider-bookings.html': [
        { container: '#providerBookingsList', items: '.provider-booking-card', emptyId: 'searchEmptyProviderBookings', emptyText: 'No bookings matched your search.' }
      ],
      'provider-earnings.html': [
        { container: '#providerTransactionsTableBody', items: 'tr', emptyId: 'searchEmptyProviderTransactions', emptyText: 'No transactions matched your search.' }
      ],
      'provider-support.html': [
        { container: '#providerSupportTicketsList', items: '.ticket-card', emptyId: 'searchEmptyProviderTickets', emptyText: 'No support tickets matched your search.' },
        { container: '#providerCommonIssuesList', items: '.provider-faq-item-wrap', emptyId: 'searchEmptyProviderFaqs', emptyText: 'No common issues matched your search.' }
      ],
      'provider-account.html': [
        { container: '.provider-profile-layout', items: '.info-box, .panel-card', emptyId: 'searchEmptyProviderAccount', emptyText: 'No account details matched your search.' }
      ],
      'superuser-dashboard.html': [
        { container: '.superuser-dashboard-grid, .dashboard-grid, main', items: '.feature-card, .stat-card-dashboard, .panel-card, tr', emptyId: 'searchEmptySuperuserDashboard', emptyText: 'No superuser dashboard items matched your search.' }
      ],
      'superuser-management.html': [
        { container: 'main', items: 'tr, .panel-card, .info-box', emptyId: 'searchEmptySuperuserManagement', emptyText: 'No records matched your search.' }
      ],
      'superuser-bookings.html': [
        { container: 'main', items: 'tr, .panel-card, .booking-card', emptyId: 'searchEmptySuperuserBookings', emptyText: 'No bookings matched your search.' }
      ],
      'superuser-escalated-tickets.html': [
        { container: 'main', items: 'tr, .panel-card, .ticket-card', emptyId: 'searchEmptySuperuserTickets', emptyText: 'No tickets matched your search.' }
      ],
      'support-dashboard.html': [
        { container: '#supportTicketsTableBody', items: 'tr', emptyId: 'searchEmptySupportDashboard', emptyText: 'No support tickets matched your search.' }
      ],
      'support-ticket-details.html': [
        { container: 'main', items: '.ticket-detail-card, .panel-card, .timeline-item, .message-bubble', emptyId: 'searchEmptySupportDetails', emptyText: 'No ticket details matched your search.' }
      ],
      'booking-checkout.html': [
        { container: '.checkout-layout', items: '.checkout-card, .checkout-side-card, .checkout-note-card', emptyId: 'searchEmptyCheckout', emptyText: 'No checkout details matched your search.' }
      ]
    };

    const configs = map[pageName()];
    if (!configs) return;

    const applySearch = function () {
      filterMultiple(configs, input.value.trim().toLowerCase());
    };

    input.addEventListener('input', applySearch);
    input.addEventListener('search', applySearch);
  }

  document.addEventListener('DOMContentLoaded', setupSearch);
})();
