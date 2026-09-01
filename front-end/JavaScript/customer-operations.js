(function () {
  const auth = window.ServeEaseEmployeeAuth;
  if (!auth) {
    window.location.href = "login.html";
    return;
  }

  const session = auth.requireCurrentPageAccess();
  if (!session) return;

  const requiredPermission = auth.permissions && auth.permissions.CUSTOMER_OPERATIONS;
  if (!auth.isAdminSession(session) && !auth.hasAnyPermission(session, [requiredPermission])) {
    window.location.href = "employee-access-denied.html?from=customer-operations.html";
    return;
  }

  auth.annotateBody(session);

  const emptyValue = "N/A";
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

  function chipClass(value) {
    const normalized = normalizeKey(value).replace(/[^a-z0-9]+/g, "-");
    if (!normalized || normalized === normalizeKey(emptyValue).replace(/[^a-z0-9]+/g, "-")) return "pending";
    if (normalized === "active" || normalized === "completed" || normalized === "successful") return "completed";
    if (normalized === "blocked" || normalized === "cancelled" || normalized === "failed") return "cancelled";
    if (normalized === "open" || normalized === "pending" || normalized === "requested") return "pending";
    if (normalized === "in-progress" || normalized === "upcoming" || normalized === "accepted") return "progress";
    return normalized;
  }

  function statusChip(value) {
    const label = display(value);
    return '<span class="superuser-chip ' + chipClass(label) + '">' + escapeHtml(label) + '</span>';
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
      address: display(record.address || record.location),
      status: display(record.status),
      paymentStatus: display(record.paymentStatus || record.payment || record.paymentState),
      amount: display(record.amount),
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

  function filteredCustomers() {
    const term = normalizeKey(byId("customerOperationsSearch") && byId("customerOperationsSearch").value);
    const status = byId("customerOperationsStatusFilter") ? byId("customerOperationsStatusFilter").value : "all";

    return state.customers.filter(function (customer) {
      if (status !== "all" && customer.status !== status) return false;
      const haystack = [
        customer.id,
        customer.fullName,
        customer.email,
        customer.phone,
        customer.location,
        customer.status,
        customer.sources.join(" ")
      ].join(" ").toLowerCase();
      return !term || haystack.indexOf(term) !== -1;
    });
  }

  function statCard(label, value, helper) {
    const metricVisuals = {
      "Customers": { icon: "&#128101;", description: "Registered customers" },
      "Active": { icon: "&#128994;", description: "Active accounts" },
      "Blocked": { icon: "&#128308;", description: "Blocked accounts" },
      "Bookings": { icon: "&#128197;", description: "Customer bookings" },
      "Support Tickets": { icon: "&#127903;", description: "Customer tickets" }
    };
    const visual = metricVisuals[label] || { icon: "", description: helper || "" };
    return [
      '<article class="dashboard-stat-card customer-operations-metric-card">',
      '  <div class="customer-operations-metric-label"><span class="customer-operations-metric-icon" aria-hidden="true">' + visual.icon + '</span><span>' + escapeHtml(label) + '</span></div>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(visual.description) + '</small>',
      '</article>'
    ].join("");
  }

  function renderStats() {
    const grid = byId("customerOperationsStatsGrid");
    if (!grid) return;
    const active = state.customers.filter(function (customer) { return customer.status === "Active"; }).length;
    const blocked = state.customers.filter(function (customer) { return customer.status === "Blocked"; }).length;
    grid.innerHTML = [
      statCard("Customers", state.customers.length, "existing account records"),
      statCard("Active", active, "recorded account status"),
      statCard("Blocked", blocked, "recorded account status"),
      statCard("Bookings", state.bookings.length, "visible customer bookings"),
      statCard("Support Tickets", state.tickets.length, "customer-related tickets")
    ].join("");
  }

  function renderCustomers() {
    const rows = byId("customerOperationsRows");
    const count = byId("customerOperationsCustomerCount");
    if (!rows) return;

    const customers = filteredCustomers();
    if (count) count.textContent = String(customers.length);

    if (!customers.length) {
      rows.innerHTML = '<tr><td colspan="7"><div class="superuser-empty-state">No existing customer records found for this view.</div></td></tr>';
      return;
    }

    rows.innerHTML = customers.map(function (customer) {
      return [
        '<tr>',
        '  <td>' + escapeHtml(customer.id) + '</td>',
        '  <td>' + escapeHtml(customer.fullName) + '</td>',
        '  <td>' + escapeHtml(customer.email) + '</td>',
        '  <td>' + escapeHtml(customer.phone) + '</td>',
        '  <td>' + escapeHtml(customer.location) + '</td>',
        '  <td>' + statusChip(customer.status) + '</td>',
        '  <td><button class="superuser-inline-action" type="button" data-customer-key="' + escapeHtml(customer.key) + '">View</button></td>',
        '</tr>'
      ].join("");
    }).join("");

    rows.querySelectorAll("[data-customer-key]").forEach(function (button) {
      button.addEventListener("click", function () {
        const customer = state.customers.find(function (item) {
          return item.key === button.dataset.customerKey;
        });
        if (!customer) return;
        window.location.href = "customer-operations-detail.html?id=" + encodeURIComponent(customer.id);
      });
    });

  }

  function setupNavigation() {
    document.querySelectorAll("[data-admin-link]").forEach(function (link) {
      if (auth.isEmployeeSession(session)) link.hidden = true;
    });

    const logoutBtn = byId("customerOperationsLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (auth.isEmployeeSession(session)) {
          auth.logoutEmployee();
          return;
        }
        sessionStorage.removeItem("serveEaseSession");
        window.location.href = "login.html";
      });
    }
  }

  function loadData() {
    state.customers = collectCustomers();
    state.bookings = collectBookings();
    state.tickets = collectTickets();
  }

  function loadCanonicalBookings() {
    if (!window.ServeEaseApi || !window.ServeEaseApi.getCanonicalBookings) return Promise.resolve();
    return window.ServeEaseApi.getCanonicalBookings().then(function (bookings) {
      window.__serveEaseCanonicalBookings = bookings;
      state.bookings = dedupeById(bookings.map(function (booking) { return normalizeBooking(booking, "Canonical booking API"); }).concat(collectBookings()));
    }).catch(function () {});
  }

  function setupFilters() {
    const search = byId("customerOperationsSearch");
    const status = byId("customerOperationsStatusFilter");
    if (search) search.addEventListener("input", renderCustomers);
    if (status) status.addEventListener("change", renderCustomers);
  }

  loadData();
  setupNavigation();
  setupFilters();
  renderStats();
  renderCustomers();
  loadCanonicalBookings().then(function () { renderStats(); renderCustomers(); });
})();
