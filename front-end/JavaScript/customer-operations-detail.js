(function () {
  const auth = window.ServeEaseEmployeeAuth;
  if (!auth) {
    window.location.href = "login.html";
    return;
  }

  const session = auth.getSession && auth.getSession();
  const requiredPermission = auth.permissions && auth.permissions.CUSTOMER_OPERATIONS;
  if (!session || !session.isLoggedIn) {
    window.location.href = "login.html";
    return;
  }
  if (!auth.isAdminSession(session) && !auth.hasAnyPermission(session, [requiredPermission])) {
    window.location.href = "employee-access-denied.html?from=customer-operations-detail.html";
    return;
  }
  auth.annotateBody(session);

  const emptyValue = "N/A";
  const activeBookingStatuses = ["pending", "accepted"];
  const completedBookingStatuses = ["completed"];
  const openTicketStatuses = ["open", "pending", "in progress", "escalated", "under review"];

  const state = {
    customers: [],
    bookings: [],
    tickets: []
  };

  function byId(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value === undefined || value === null ? "" : value).trim();
  }

  function display(value) {
    return clean(value) || emptyValue;
  }

  function normalizeKey(value) {
    return clean(value).toLowerCase();
  }

  function identityValue(value) {
    const text = clean(value);
    return text && text !== emptyValue ? normalizeKey(text) : "";
  }

  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function localStorageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function formatDate(value) {
    if (window.ServeEaseDate && typeof window.ServeEaseDate.formatDate === "function") {
      return display(window.ServeEaseDate.formatDate(value));
    }
    return display(value);
  }

  function chipClass(value) {
    const normalized = normalizeKey(value).replace(/[^a-z0-9]+/g, "-");
    if (!normalized || normalized === normalizeKey(emptyValue).replace(/[^a-z0-9]+/g, "-")) return "pending";
    if (normalized === "active" || normalized === "completed" || normalized === "successful" || normalized === "resolved") return "completed";
    if (normalized === "blocked" || normalized === "cancelled" || normalized === "failed" || normalized === "rejected" || normalized === "closed") return "cancelled";
    if (normalized === "open" || normalized === "pending" || normalized === "requested") return "pending";
    if (normalized === "in-progress" || normalized === "upcoming" || normalized === "accepted" || normalized === "escalated" || normalized === "under-review") return "progress";
    return normalized;
  }

  function statusChip(value) {
    const label = display(value);
    return '<span class="customer-operations-chip ' + chipClass(label) + '">' + escapeHtml(label) + '</span>';
  }

  function customerIdentity(record) {
    const email = identityValue(record.email);
    const id = identityValue(record.id || record.customerId || record.userId);
    const name = identityValue(record.fullName || record.name || record.customerName);
    return email || id || name;
  }

  function normalizeCustomer(record, sourceLabel) {
    const status = clean(record.status || record.accountStatus || record.approvalStatus) || emptyValue;
    const registrationDate = clean(record.registrationDate || record.createdAt || record.createdDate || record.signupDate) || emptyValue;
    const location = clean(record.location || record.cityName || record.city || record.address) || emptyValue;
    const id = clean(record.id || record.customerId || record.userId) || emptyValue;
    const fullName = clean(record.fullName || record.name || record.customerName || record.ownerName) || emptyValue;
    const email = clean(record.email || record.customerEmail || record.ownerEmail) || emptyValue;
    const phone = clean(record.phone || record.customerPhone || record.contactNumber) || emptyValue;

    return {
      key: customerIdentity({ id: id, fullName: fullName, email: email }),
      id: id,
      fullName: fullName,
      email: email,
      phone: phone,
      location: location,
      registrationDate: registrationDate,
      status: status,
      sources: sourceLabel ? [sourceLabel] : [],
      emailAliases: email !== emptyValue ? [normalizeKey(email)] : [],
      nameAliases: fullName !== emptyValue ? [normalizeKey(fullName)] : [],
      idAliases: id !== emptyValue ? [normalizeKey(id)] : []
    };
  }

  function keepCurrentValue(current, next) {
    if (!current || current === emptyValue) return next || emptyValue;
    return current;
  }

  function mergeCustomer(target, incoming) {
    target.id = keepCurrentValue(target.id, incoming.id);
    target.fullName = keepCurrentValue(target.fullName, incoming.fullName);
    target.email = keepCurrentValue(target.email, incoming.email);
    target.phone = keepCurrentValue(target.phone, incoming.phone);
    target.location = keepCurrentValue(target.location, incoming.location);
    target.registrationDate = keepCurrentValue(target.registrationDate, incoming.registrationDate);
    target.status = keepCurrentValue(target.status, incoming.status);

    incoming.sources.forEach(function (source) {
      if (target.sources.indexOf(source) === -1) target.sources.push(source);
    });
    incoming.emailAliases.forEach(function (email) {
      if (target.emailAliases.indexOf(email) === -1) target.emailAliases.push(email);
    });
    incoming.nameAliases.forEach(function (name) {
      if (target.nameAliases.indexOf(name) === -1) target.nameAliases.push(name);
    });
    incoming.idAliases.forEach(function (id) {
      if (target.idAliases.indexOf(id) === -1) target.idAliases.push(id);
    });
  }

  function addCustomer(map, record, sourceLabel) {
    const customer = normalizeCustomer(record, sourceLabel);
    if (!customer.key) return;

    const existingKey = Object.keys(map).find(function (key) {
      const item = map[key];
      return customer.emailAliases.some(function (email) { return item.emailAliases.indexOf(email) !== -1; }) ||
        customer.idAliases.some(function (id) { return item.idAliases.indexOf(id) !== -1; });
    }) || customer.key;

    if (map[existingKey]) {
      mergeCustomer(map[existingKey], customer);
    } else {
      customer.key = existingKey;
      map[existingKey] = customer;
    }
  }

  function collectCustomers() {
    const map = {};
    const appData = readJson("serveEaseData", {});
    const appUsers = window.ServeEaseDataCompletion && typeof window.ServeEaseDataCompletion.getCanonicalCustomers === "function"
      ? window.ServeEaseDataCompletion.getCanonicalCustomers(appData)
      : (Array.isArray(appData.users) ? appData.users : []).filter(function (user) { return user && String(user.role).toLowerCase() === "customer"; });
    appUsers.forEach(function (user) { addCustomer(map, user, "Registered account"); });

    localStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const ownerRecord = {
        id: moduleData.ownerCustomerId || moduleData.customerId,
        fullName: moduleData.ownerName || moduleData.customerName,
        email: moduleData.ownerEmail || moduleData.customerEmail,
        phone: moduleData.ownerPhone || moduleData.customerPhone,
        location: moduleData.ownerLocation || moduleData.location || moduleData.address,
        status: moduleData.status || moduleData.accountStatus
      };
      const linked = appUsers.some(function (customer) {
        return normalizeKey(customer.id) === normalizeKey(ownerRecord.id) || normalizeKey(customer.email) === normalizeKey(ownerRecord.email);
      });
      if (linked) addCustomer(map, ownerRecord, "Customer module data");
    });

    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return a.fullName.localeCompare(b.fullName);
    });
  }

  function normalizeBooking(record, sourceLabel, owner) {
    return {
      id: display(record.id || record.bookingRef || record.bookingReference),
      service: display(record.serviceType || record.service || record.category),
      provider: display(record.provider || record.providerName),
      date: display(record.serviceDate || record.date || record.createdDate),
      time: display(record.serviceTime || record.time),
      status: display(record.status),
      paymentStatus: display(record.paymentStatus || record.payment || record.paymentState),
      customerId: normalizeKey(record.customerId || record.ownerCustomerId || (owner && owner.id)),
      customerEmail: normalizeKey(record.email || record.customerEmail || record.ownerEmail || (owner && owner.email)),
      customerName: normalizeKey(record.customer || record.customerName || record.ownerName || (owner && owner.fullName)),
      source: sourceLabel
    };
  }

  function collectBookings() {
    const bookings = [];
    const superuserData = readJson("serveEaseSuperuserModuleData", {});
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) {
      bookings.push(normalizeBooking(booking, "Superuser booking data"));
    });

    localStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const owner = {
        id: moduleData.ownerCustomerId || moduleData.customerId,
        email: moduleData.ownerEmail || moduleData.customerEmail,
        fullName: moduleData.ownerName || moduleData.customerName
      };
      (Array.isArray(moduleData.bookings) ? moduleData.bookings : []).forEach(function (booking) {
        bookings.push(normalizeBooking(booking, "Customer module booking data", owner));
      });
    });

    return dedupeById(bookings);
  }

  function normalizeTicket(record, sourceLabel, owner) {
    return {
      id: display(record.id || record.ticketId),
      bookingId: display(record.bookingId || record.bookingRef || record.bookingReference || record.relatedBookingId),
      subject: display(record.subject || record.description),
      category: display(record.category || record.issueCategory || record.ticketType),
      status: display(record.status),
      created: display(record.created || record.createdDate || record.date || record.createdAtIso || record.createdAt),
      customerId: normalizeKey(record.customerId || record.raisedById || record.ownerCustomerId || (owner && owner.id)),
      customerEmail: normalizeKey(record.email || record.customerEmail || record.raisedByEmail || record.ownerEmail || (owner && owner.email)),
      customerName: normalizeKey(record.customer || record.customerName || record.raisedByName || record.ownerName || (owner && owner.fullName)),
      source: sourceLabel
    };
  }

  function collectTickets() {
    const tickets = [];
    const superuserData = readJson("serveEaseSuperuserModuleData", {});
    (Array.isArray(superuserData.tickets) ? superuserData.tickets : []).forEach(function (ticket) {
      if (ticket.userType === "Customer" || ticket.raisedByType === "customer") {
        tickets.push(normalizeTicket(ticket, "Superuser ticket data"));
      }
    });

    const supportData = readJson("serveEaseSupportModuleData", {});
    (Array.isArray(supportData.tickets) ? supportData.tickets : []).forEach(function (ticket) {
      if (!ticket.raisedByType || ticket.raisedByType === "customer") {
        tickets.push(normalizeTicket(ticket, "Support ticket data"));
      }
    });

    localStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const owner = {
        id: moduleData.ownerCustomerId || moduleData.customerId,
        email: moduleData.ownerEmail || moduleData.customerEmail,
        fullName: moduleData.ownerName || moduleData.customerName
      };
      (Array.isArray(moduleData.tickets) ? moduleData.tickets : []).forEach(function (ticket) {
        tickets.push(normalizeTicket(ticket, "Customer module ticket data", owner));
      });
    });

    return dedupeById(tickets);
  }

  function dedupeById(items) {
    const seen = {};
    return items.filter(function (item) {
      const key = normalizeKey(item.id !== emptyValue ? item.id : item.customerId + "|" + item.customerEmail + "|" + item.customerName);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function belongsToCustomer(record, customer) {
    if (!record || !customer) return false;
    if (record.customerId && customer.idAliases.indexOf(record.customerId) !== -1) return true;
    if (record.customerEmail && customer.emailAliases.indexOf(record.customerEmail) !== -1) return true;
    if (record.customerName && customer.nameAliases.indexOf(record.customerName) !== -1) return true;
    return false;
  }

  function findSelectedCustomer() {
    const requestedId = normalizeKey(new URLSearchParams(window.location.search).get("id"));
    if (!requestedId) return null;
    return state.customers.find(function (customer) {
      return customer.idAliases.indexOf(requestedId) !== -1;
    }) || null;
  }

  function detailField(label, value) {
    return '<div class="customer-operations-detail-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(display(value)) + '</strong></div>';
  }

  function statCard(label, value, helper, icon) {
    return [
      '<article class="customer-operations-detail-stat-card">',
      '  <div class="customer-operations-detail-stat-label"><span class="customer-operations-detail-stat-icon" aria-hidden="true">' + icon + '</span><span>' + escapeHtml(label) + '</span></div>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(helper) + '</small>',
      '</article>'
    ].join("");
  }

  function matchingBookings(customer) {
    return state.bookings.filter(function (booking) {
      return belongsToCustomer(booking, customer);
    });
  }

  function matchingTickets(customer) {
    return state.tickets.filter(function (ticket) {
      return belongsToCustomer(ticket, customer);
    });
  }

  function renderProfile(customer) {
    const heroName = byId("customerOperationsDetailHeroName");
    const grid = byId("customerOperationsInfoGrid");
    if (heroName) heroName.textContent = display(customer.fullName);
    if (!grid) return;
    grid.innerHTML = [
      detailField("Customer ID", customer.id),
      detailField("Full Name", customer.fullName),
      detailField("Email", customer.email),
      detailField("Phone", customer.phone),
      detailField("Location", customer.location),
      detailField("Registration Date", formatDate(customer.registrationDate)),
      detailField("Account Status", customer.status)
    ].join("");
    const action = byId("customerOperationsStatusActionBtn");
    const actions = byId("customerOperationsAccountActions");
    if (action) {
      const blocked = customer.status === "Blocked";
      action.textContent = blocked ? "Activate Customer" : "Suspend Customer";
      action.className = "btn " + (blocked ? "superuser-success-btn" : "superuser-danger-btn");
      action.onclick = function () { openStatusDialog(customer, blocked ? "Active" : "Blocked"); };
    }
    if (actions) actions.hidden = !action;
  }

  function openStatusDialog(customer, nextStatus) {
    const dialog = byId("customerOperationsStatusDialog");
    if (!dialog) return;
    const verb = nextStatus === "Blocked" ? "Suspend" : "Activate";
    byId("customerOperationsStatusDialogTitle").textContent = verb + " Customer";
    byId("customerOperationsStatusDialogPrompt").textContent = verb + " " + customer.fullName + "?";
    byId("customerOperationsStatusReason").value = "";
    byId("customerOperationsStatusRemarks").value = "";
    byId("customerOperationsStatusError").textContent = "";
    byId("customerOperationsStatusConfirm").textContent = "Confirm " + verb;
    byId("customerOperationsStatusConfirm").onclick = function (event) {
      event.preventDefault();
      const result = window.ServeEaseDataCompletion && window.ServeEaseDataCompletion.updateCustomerAccountStatus
        ? window.ServeEaseDataCompletion.updateCustomerAccountStatus(customer.id, nextStatus, byId("customerOperationsStatusReason").value, byId("customerOperationsStatusRemarks").value)
        : { ok: false, message: "Customer status service is unavailable." };
      if (!result.ok) { byId("customerOperationsStatusError").textContent = result.message; return; }
      dialog.close();
      customer.status = result.customer.status;
      renderProfile(customer);
    };
    dialog.showModal();
  }

  function renderStats(bookings, tickets) {
    const target = byId("customerOperationsDetailStats");
    if (!target) return;
    const activeBookings = bookings.filter(function (booking) {
      return activeBookingStatuses.indexOf(normalizeKey(booking.status)) !== -1;
    }).length;
    const completedBookings = bookings.filter(function (booking) {
      return completedBookingStatuses.indexOf(normalizeKey(booking.status)) !== -1;
    }).length;
    const openTickets = tickets.filter(function (ticket) {
      return openTicketStatuses.indexOf(normalizeKey(ticket.status)) !== -1;
    }).length;

    target.innerHTML = [
      statCard("Total Bookings", bookings.length, "All linked customer bookings", "&#128197;"),
      statCard("Active / Upcoming Bookings", activeBookings, "Pending or accepted bookings", "&#128994;"),
      statCard("Completed Bookings", completedBookings, "Completed booking records", "&#10003;"),
      statCard("Open Support Tickets", openTickets, "Open operational support items", "&#127903;")
    ].join("");
  }

  function renderBookings(bookings) {
    const rows = byId("customerOperationsDetailBookingRows");
    const count = byId("customerOperationsDetailBookingCount");
    if (count) count.textContent = bookings.length + (bookings.length === 1 ? " booking" : " bookings");
    if (!rows) return;
    if (!bookings.length) {
      rows.innerHTML = '<tr><td colspan="6"><div class="customer-operations-empty-state">No bookings are linked to this customer.</div></td></tr>';
      return;
    }
    rows.innerHTML = bookings.map(function (booking) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(booking.id) + '</td>',
        '  <td>' + escapeHtml(booking.service) + '</td>',
        '  <td>' + escapeHtml(booking.provider) + '</td>',
        '  <td>' + escapeHtml(formatDate(booking.date) + (booking.time !== emptyValue ? " " + booking.time : "")) + '</td>',
        '  <td>' + statusChip(booking.status) + '</td>',
        '  <td>' + escapeHtml(booking.paymentStatus) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function renderTickets(tickets) {
    const rows = byId("customerOperationsDetailTicketRows");
    const count = byId("customerOperationsDetailTicketCount");
    if (count) count.textContent = tickets.length + (tickets.length === 1 ? " ticket" : " tickets");
    if (!rows) return;
    if (!tickets.length) {
      rows.innerHTML = '<tr><td colspan="6"><div class="customer-operations-empty-state">No support tickets are linked to this customer.</div></td></tr>';
      return;
    }
    rows.innerHTML = tickets.map(function (ticket) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(ticket.id) + '</td>',
        '  <td>' + escapeHtml(ticket.bookingId) + '</td>',
        '  <td>' + escapeHtml(ticket.subject) + '</td>',
        '  <td>' + escapeHtml(ticket.category) + '</td>',
        '  <td>' + statusChip(ticket.status) + '</td>',
        '  <td>' + escapeHtml(formatDate(ticket.created)) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function showNotFound() {
    const notFound = byId("customerOperationsNotFound");
    const content = byId("customerOperationsDetailContent");
    const heroName = byId("customerOperationsDetailHeroName");
    if (notFound) notFound.hidden = false;
    if (content) content.hidden = true;
    if (heroName) heroName.textContent = "";
  }

  function setupLogout() {
    const logoutBtn = byId("customerOperationsDetailLogoutBtn");
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", function () {
      if (auth.isEmployeeSession(session)) {
        auth.logoutEmployee();
        return;
      }
      sessionStorage.removeItem("serveEaseSession");
      window.location.href = "login.html";
    });
  }

  state.customers = collectCustomers();
  state.bookings = collectBookings();
  state.tickets = collectTickets();
  setupLogout();

  const customer = findSelectedCustomer();
  if (!customer) {
    showNotFound();
    return;
  }

  const bookings = matchingBookings(customer);
  const tickets = matchingTickets(customer);
  renderProfile(customer);
  renderStats(bookings, tickets);
  renderBookings(bookings);
  renderTickets(tickets);
})();
