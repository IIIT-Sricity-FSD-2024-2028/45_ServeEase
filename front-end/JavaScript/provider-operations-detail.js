(function () {
  const ops = window.ServeEaseProviderOperations;
  if (!ops) {
    window.location.href = "provider-operations.html";
    return;
  }

  const emptyValue = ops.emptyValue || "Not recorded";
  const activeBookingStatuses = ops.activeBookingStatuses || ["pending", "accepted", "requested", "upcoming"];
  const completedBookingStatuses = ["completed"];

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return ops.escapeHtml(value); }
  function display(value) { return ops.display(value); }
  function normalizeKey(value) { return ops.normalizeKey(value); }

  function detailField(label, value) {
    return '<div class="provider-operations-detail-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(display(value)) + '</strong></div>';
  }

  function statCard(label, value, helper, icon) {
    return [
      '<article class="provider-operations-detail-stat-card">',
      '  <div class="provider-operations-detail-stat-label"><span class="provider-operations-detail-stat-icon" aria-hidden="true">' + icon + '</span><span>' + escapeHtml(label) + '</span></div>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(helper) + '</small>',
      '</article>'
    ].join("");
  }

  function findProvider(data) {
    const requestedId = normalizeKey(new URLSearchParams(window.location.search).get("id"));
    if (!requestedId) return null;
    return data.providers.find(function (provider) {
      return ops.providerMatches(provider, requestedId);
    }) || null;
  }

  function showNotFound() {
    const notFound = byId("providerOperationsNotFound");
    const content = byId("providerOperationsDetailContent");
    if (notFound) notFound.hidden = false;
    if (content) content.hidden = true;
  }

  function renderProfile(provider) {
    const hero = byId("providerOperationsDetailHeroName");
    const grid = byId("providerOperationsInfoGrid");
    if (hero) hero.textContent = display(provider.organisationName || provider.name);
    if (!grid) return;
    grid.innerHTML = [
      detailField("Provider ID", provider.id),
      detailField("Provider Name", provider.name),
      detailField("Organisation", provider.organisationName),
      detailField("Email", provider.email),
      detailField("Phone", provider.phone),
      detailField("Location", provider.location),
      detailField("Account Status", provider.accountStatus),
      detailField("Registration Date", ops.formatDate(provider.registrationDate)),
      detailField("Verification Status", provider.verificationStatus),
      detailField("Service Category", provider.category),
      detailField("Experience", provider.experience)
    ].join("");
  }

  function renderStats(services, bookings) {
    const target = byId("providerOperationsDetailStats");
    if (!target) return;
    const activeBookings = bookings.filter(function (booking) {
      return activeBookingStatuses.indexOf(normalizeKey(booking.status)) !== -1;
    }).length;
    const completedBookings = bookings.filter(function (booking) {
      return completedBookingStatuses.indexOf(normalizeKey(booking.status)) !== -1;
    }).length;
    const activeServices = services.filter(function (service) {
      return ["active", "verified"].indexOf(normalizeKey(service.status)) !== -1;
    }).length;
    target.innerHTML = [
      statCard("Total Bookings", bookings.length, "All linked provider bookings", "&#128197;"),
      statCard("Active / Upcoming Bookings", activeBookings, "Pending, requested, accepted or upcoming", "&#128994;"),
      statCard("Completed Bookings", completedBookings, "Completed provider jobs", "&#10003;"),
      statCard("Active Services", activeServices, "Active provider service records", "&#128736;")
    ].join("");
  }

  function renderVerification(provider) {
    const grid = byId("providerOperationsVerificationGrid");
    const list = byId("providerOperationsDocumentList");
    if (grid) {
      grid.innerHTML = [
        detailField("Verification Status", provider.verificationStatus),
        detailField("Account Status", provider.accountStatus),
        detailField("Registration Date", ops.formatDate(provider.registrationDate)),
        detailField("Source", provider.source)
      ].join("");
    }
    if (!list) return;
    if (!provider.documents || !provider.documents.length) {
      list.innerHTML = '<div class="provider-operations-empty-state">No verification documents are recorded for this provider.</div>';
      return;
    }
    list.innerHTML = provider.documents.map(function (document) {
      return [
        '<div class="provider-operations-list-item">',
        '  <div><span>' + escapeHtml(document.documentType || "Document") + '</span><strong>' + escapeHtml(document.documentName || "Not recorded") + '</strong></div>',
        '  <div class="provider-operations-document-actions">' + ops.statusChip(document.documentStatus || emptyValue) + '<button class="provider-operations-inline-action" type="button" data-preview-document="' + escapeHtml(document.documentId) + '">Preview</button></div>',
        '</div>'
      ].join("");
    }).join("");
    list.querySelectorAll("[data-preview-document]").forEach(function (button) {
      button.addEventListener("click", function () {
        previewDocument(provider, button.dataset.previewDocument);
      });
    });
  }

  function previewDocument(provider, documentId) {
    const providerDocument = (provider.documents || []).find(function (item) { return item.documentId === documentId; });
    if (!providerDocument) return;
    if (window.ServeEaseAttachments && typeof window.ServeEaseAttachments.previewProviderDocument === "function") {
      if (window.ServeEaseAttachments.previewProviderDocument(provider.id, providerDocument)) return;
    }
    window.alert("No stored preview is available for this document.");
  }

  function renderServices(services) {
    const rows = byId("providerOperationsServiceRows");
    const count = byId("providerOperationsServiceCount");
    if (count) count.textContent = services.length + (services.length === 1 ? " service" : " services");
    if (!rows) return;
    if (!services.length) {
      rows.innerHTML = '<tr><td colspan="6"><div class="provider-operations-empty-state">No services are linked to this provider.</div></td></tr>';
      return;
    }
    rows.innerHTML = services.map(function (service) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(service.name) + '</td>',
        '  <td>' + escapeHtml(service.category) + '</td>',
        '  <td>' + escapeHtml(service.subcategory) + '</td>',
        '  <td>' + escapeHtml(ops.formatPrice(service.price)) + '</td>',
        '  <td>' + escapeHtml(service.location) + '</td>',
        '  <td>' + ops.statusChip(service.status) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function renderBookings(bookings) {
    const rows = byId("providerOperationsBookingRows");
    const count = byId("providerOperationsBookingCount");
    if (count) count.textContent = bookings.length + (bookings.length === 1 ? " booking" : " bookings");
    if (!rows) return;
    if (!bookings.length) {
      rows.innerHTML = '<tr><td colspan="6"><div class="provider-operations-empty-state">No bookings are linked to this provider.</div></td></tr>';
      return;
    }
    rows.innerHTML = bookings.map(function (booking) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(booking.id) + '</td>',
        '  <td>' + escapeHtml(booking.customer) + '</td>',
        '  <td>' + escapeHtml(booking.service) + '</td>',
        '  <td>' + escapeHtml(ops.formatDate(booking.date) + (booking.time !== emptyValue ? " " + booking.time : "")) + '</td>',
        '  <td>' + ops.statusChip(booking.status) + '</td>',
        '  <td>' + escapeHtml(booking.paymentStatus) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function renderAvailability(provider, availabilityMap) {
    const list = byId("providerOperationsAvailabilityList");
    if (!list) return;
    const availability = availabilityMap[provider.id];
    if (!availability) {
      list.innerHTML = '<div class="provider-operations-empty-state">No availability data is recorded for this provider.</div>';
      return;
    }
    const items = [];
    if (Array.isArray(availability.days)) {
      availability.days.forEach(function (day) {
        items.push({
          label: day.label || day.day || "Day",
          value: day.active === false ? "Unavailable" : "Available"
        });
      });
    }
    if (Array.isArray(availability.slots)) {
      availability.slots.forEach(function (slot) {
        items.push({
          label: (slot.day || "Slot") + " " + display(slot.from) + " - " + display(slot.to),
          value: slot.active === false ? "Inactive" : "Active"
        });
      });
    }
    if (!items.length) {
      list.innerHTML = '<div class="provider-operations-empty-state">No availability slots are recorded for this provider.</div>';
      return;
    }
    list.innerHTML = items.map(function (item) {
      return '<div class="provider-operations-list-item"><span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(item.value) + '</strong></div>';
    }).join("");
  }

  function renderTickets(tickets) {
    const rows = byId("providerOperationsTicketRows");
    const count = byId("providerOperationsTicketCount");
    if (count) count.textContent = tickets.length + (tickets.length === 1 ? " ticket" : " tickets");
    if (!rows) return;
    if (!tickets.length) {
      rows.innerHTML = '<tr><td colspan="6"><div class="provider-operations-empty-state">No support tickets are linked to this provider.</div></td></tr>';
      return;
    }
    rows.innerHTML = tickets.map(function (ticket) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(ticket.id) + '</td>',
        '  <td>' + escapeHtml(ticket.bookingId) + '</td>',
        '  <td>' + escapeHtml(ticket.subject) + '</td>',
        '  <td>' + escapeHtml(ticket.category) + '</td>',
        '  <td>' + ops.statusChip(ticket.status) + '</td>',
        '  <td>' + escapeHtml(ops.formatDate(ticket.created)) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function renderHistory(provider) {
    const rows = byId("providerOperationsHistoryRows");
    if (!rows) return;
    const history = Array.isArray(provider.statusHistory) ? provider.statusHistory : [];
    if (!history.length) {
      rows.innerHTML = '<tr><td colspan="7"><div class="provider-operations-empty-state">No account status history is recorded for this provider.</div></td></tr>';
      return;
    }
    rows.innerHTML = history.map(function (item) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(ops.formatDate(item.dateTime)) + '</td>',
        '  <td>' + escapeHtml(item.action) + '</td>',
        '  <td>' + ops.statusChip(item.previousStatus) + '</td>',
        '  <td>' + ops.statusChip(item.newStatus) + '</td>',
        '  <td>' + escapeHtml(item.reason) + '</td>',
        '  <td>' + escapeHtml(item.remarks) + '</td>',
        '  <td>' + escapeHtml(item.performedBy) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  ops.setupLogout("providerOperationsDetailLogoutBtn");

  const data = ops.getData();
  const provider = findProvider(data);
  if (!provider) {
    showNotFound();
    return;
  }

  const services = ops.itemsForProvider(data.services, provider);
  const bookings = ops.itemsForProvider(data.bookings, provider);
  const tickets = ops.itemsForProvider(data.tickets, provider);

  renderProfile(provider);
  renderStats(services, bookings);
  renderVerification(provider);
  renderServices(services);
  renderBookings(bookings);
  renderAvailability(provider, data.availability);
  renderTickets(tickets);
  renderHistory(provider);
})();
