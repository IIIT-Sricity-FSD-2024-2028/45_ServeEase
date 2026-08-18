(function () {
  const customerPrefix = "serveEaseCustomerModuleData";
  const providerPrefix = "serveEaseProviderModuleData";
  const superuserKey = "serveEaseSuperuserModuleData";

  function byId(id) {
    return document.getElementById(id);
  }

  function readJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function storageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function display(value, fallback) {
    const text = String(value == null ? "" : value).trim();
    if (text) return text;
    return arguments.length > 1 ? fallback : "Not recorded";
  }

  function escapeHtml(value) {
    return display(value, "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      }[char];
    });
  }

  function formatCurrency(amount) {
    const value = Number(amount) || 0;
    return "₹" + value.toLocaleString("en-IN");
  }

  function statusClass(status) {
    const value = String(status || "pending").toLowerCase();
    if (value === "paid") return "status-accepted";
    if (value === "successful" || value === "success") return "status-successful";
    if (value === "failed") return "status-failed";
    if (value === "refunded") return "status-refunded";
    if (value === "pending") return "status-pending";
    return "status-" + value.replace(/\s+/g, "-");
  }

  function isSuccessfulStatus(status) {
    return ["successful", "success", "paid"].includes(String(status || "").toLowerCase());
  }

  function isRefundStatus(status) {
    return String(status || "").toLowerCase() === "refunded";
  }

  function rowMatches(row, term, status) {
    const matchesSearch = !term || row.searchText.indexOf(term) !== -1;
    const matchesStatus = status === "all" || row.status === status;
    return matchesSearch && matchesStatus;
  }

  function uniqueValues(rows) {
    return Array.from(new Set(rows.map(function (row) {
      return row.status;
    }).filter(Boolean))).sort(function (a, b) {
      return a.localeCompare(b);
    });
  }

  function populateStatusFilter(rows) {
    const filter = byId("financeStatusFilter");
    if (!filter) return;
    const current = filter.value || "all";
    const values = uniqueValues(rows);
    filter.innerHTML = "";

    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All statuses";
    filter.appendChild(allOption);

    values.forEach(function (status) {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      filter.appendChild(option);
    });

    filter.value = values.includes(current) ? current : "all";
  }

  function customerOwner(data) {
    return display(data.ownerName || data.customerName || data.fullName, "Customer");
  }

  function collectPayments() {
    const rows = [];
    storageKeys(customerPrefix).forEach(function (key) {
      const data = readJson(key, {});
      const owner = customerOwner(data);
      (Array.isArray(data.payments) ? data.payments : []).forEach(function (payment) {
        const row = {
          id: display(payment.id),
          booking: display(payment.bookingRef || payment.bookingReference),
          customer: owner,
          provider: display(payment.provider || payment.providerName),
          method: display(payment.method || payment.paymentMethod),
          amount: Number(payment.amount) || 0,
          date: display(payment.date || payment.paymentDate || payment.createdAtIso),
          status: display(payment.status || payment.paymentStatus, "Pending")
        };
        row.searchText = [row.id, row.booking, row.customer, row.provider, row.method, row.status].join(" ").toLowerCase();
        rows.push(row);
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function providerName(data) {
    const profile = data.profile || {};
    return display(profile.organisationName || profile.fullName || data.providerName || data.ownerName, "Provider");
  }

  function collectProviderEarnings() {
    const rows = [];
    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {});
      const provider = providerName(data);
      (Array.isArray(data.transactions) ? data.transactions : []).forEach(function (transaction) {
        const row = {
          id: display(transaction.id),
          provider: provider,
          booking: display(transaction.bookingRef || transaction.bookingReference),
          customer: display(transaction.customer || transaction.customerName),
          amount: Number(transaction.amount) || 0,
          paymentDate: display(transaction.paymentDate || transaction.date),
          receivedDate: display(transaction.receivedDate, "-"),
          status: display(transaction.status, "Pending")
        };
        row.searchText = [row.id, row.provider, row.booking, row.customer, row.status].join(" ").toLowerCase();
        rows.push(row);
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking + "|" + row.provider; });
  }

  function normalizeBooking(booking, owner) {
    const row = {
      id: display(booking.id || booking.bookingRef || booking.bookingReference),
      customer: display(booking.customer || booking.customerName || owner.customer),
      provider: display(booking.provider || booking.providerName || owner.provider),
      service: display(booking.service || booking.serviceType || booking.category),
      amount: Number(booking.amount) || 0,
      method: display(booking.paymentMethod || booking.method),
      date: display(booking.paymentDate || booking.paidAt || booking.serviceDate || booking.date),
      status: display(booking.paymentStatus || booking.payment || booking.paymentState, "Pending")
    };
    row.searchText = [row.id, row.customer, row.provider, row.service, row.method, row.status].join(" ").toLowerCase();
    return row;
  }

  function collectBookings() {
    const rows = [];
    const superuserData = readJson(superuserKey, {});
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) {
      rows.push(normalizeBooking(booking, {}));
    });

    storageKeys(customerPrefix).forEach(function (key) {
      const data = readJson(key, {});
      const owner = { customer: customerOwner(data) };
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        rows.push(normalizeBooking(booking, owner));
      });
    });

    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {});
      const owner = { provider: providerName(data) };
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        rows.push(normalizeBooking(booking, owner));
      });
    });

    return dedupeRows(rows, function (row) { return row.id; });
  }

  function dedupeRows(rows, keyBuilder) {
    const seen = {};
    return rows.filter(function (row) {
      const key = keyBuilder(row);
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function collectRefunds(payments, bookings) {
    const rows = [];
    payments.filter(function (payment) { return isRefundStatus(payment.status); }).forEach(function (payment) {
      rows.push({
        id: payment.id,
        booking: payment.booking,
        customer: payment.customer,
        provider: payment.provider,
        amount: payment.amount,
        date: payment.date,
        status: payment.status,
        searchText: payment.searchText
      });
    });

    bookings.filter(function (booking) { return isRefundStatus(booking.status); }).forEach(function (booking) {
      rows.push({
        id: booking.id,
        booking: booking.id,
        customer: booking.customer,
        provider: booking.provider,
        amount: booking.amount,
        date: booking.date,
        status: booking.status,
        searchText: booking.searchText
      });
    });

    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function renderStats(payments, earnings, bookings, refunds) {
    const superuserData = readJson(superuserKey, {});
    const platformRevenue = superuserData.stats && Number(superuserData.stats.platformRevenue);
    const grossPayments = payments.filter(function (row) { return isSuccessfulStatus(row.status); }).reduce(function (sum, row) { return sum + row.amount; }, 0);
    const providerPaid = earnings.filter(function (row) { return String(row.status).toLowerCase() === "paid"; }).reduce(function (sum, row) { return sum + row.amount; }, 0);
    const pendingPayout = earnings.filter(function (row) { return String(row.status).toLowerCase() === "pending"; }).reduce(function (sum, row) { return sum + row.amount; }, 0);
    const revenueLabel = Number.isFinite(platformRevenue) ? formatCurrency(platformRevenue) : "Not recorded";

    byId("financeStatsGrid").innerHTML = [
      statCard("green", "₹", formatCurrency(grossPayments), "Gross Payment Volume"),
      statCard("blue", "↗", formatCurrency(providerPaid), "Provider Earnings Paid"),
      statCard("orange", "◔", formatCurrency(pendingPayout), "Pending Payouts"),
      statCard("purple", "◆", revenueLabel, "Platform Revenue"),
      statCard("blue", "↺", String(refunds.length), "Refund Records")
    ].join("");

    byId("financeSummaryGrid").innerHTML = [
      summaryItem("Payment transaction source", payments.length + " customer payment records"),
      summaryItem("Provider earnings source", earnings.length + " provider transaction records"),
      summaryItem("Booking payment records", bookings.length + " booking records"),
      summaryItem("Revenue source", Number.isFinite(platformRevenue) ? "Superuser stats.platformRevenue" : "Not recorded in current storage")
    ].join("");
  }

  function statCard(color, icon, value, label) {
    return '<div class="stat-card-dashboard"><div class="feature-icon ' + color + '">' + escapeHtml(icon) + '</div><h3>' + escapeHtml(value) + '</h3><p>' + escapeHtml(label) + '</p></div>';
  }

  function summaryItem(label, value) {
    return '<div class="finance-summary-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function renderCommission() {
    byId("financeCommissionPanel").innerHTML = [
      '<div class="finance-commission-value">Not configured</div>',
      '<p class="finance-commission-note">No commission rate or platform fee configuration was found in the existing project data. Finance can show configured commission once the product rate is defined.</p>'
    ].join("");
  }

  function renderTable(rows, tbodyId, emptyId, countId, mapper) {
    const tbody = byId(tbodyId);
    const empty = byId(emptyId);
    const count = byId(countId);
    if (!tbody) return;
    if (count) count.textContent = rows.length;
    tbody.innerHTML = rows.map(mapper).join("");
    if (empty) empty.classList.toggle("hidden", rows.length !== 0);
  }

  function paymentRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.method) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function earningRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.paymentDate) + '</td><td>' + escapeHtml(row.receivedDate) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function bookingRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.service) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.method) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function refundRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function render() {
    const payments = collectPayments();
    const earnings = collectProviderEarnings();
    const bookings = collectBookings();
    const refunds = collectRefunds(payments, bookings);
    const allRows = payments.concat(earnings, bookings, refunds);
    const term = String(byId("financeGlobalSearch") && byId("financeGlobalSearch").value || "").trim().toLowerCase();
    const status = byId("financeStatusFilter") ? byId("financeStatusFilter").value : "all";

    renderStats(payments, earnings, bookings, refunds);
    renderCommission();
    populateStatusFilter(allRows);

    const activeStatus = byId("financeStatusFilter") ? byId("financeStatusFilter").value : status;
    renderTable(payments.filter(function (row) { return rowMatches(row, term, activeStatus); }), "financePaymentRows", "financePaymentsEmpty", "financePaymentCount", paymentRow);
    renderTable(earnings.filter(function (row) { return rowMatches(row, term, activeStatus); }), "financeEarningRows", "financeEarningsEmpty", "financeEarningsCount", earningRow);
    renderTable(bookings.filter(function (row) { return rowMatches(row, term, activeStatus); }), "financeBookingRows", "financeBookingsEmpty", "financeBookingCount", bookingRow);
    renderTable(refunds.filter(function (row) { return rowMatches(row, term, activeStatus); }), "financeRefundRows", "financeRefundsEmpty", "financeRefundCount", refundRow);
  }

  function setupHeader(session) {
    const nameNode = byId("financeEmployeeName");
    const profileBtn = byId("financeProfileBtn");
    const dropdown = byId("financeProfileDropdown");
    const logoutBtn = byId("financeLogoutBtn");
    if (nameNode) nameNode.textContent = session && (session.fullName || session.name) || "Finance Employee";

    if (profileBtn && dropdown) {
      profileBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdown.classList.toggle("hidden");
      });
      dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
      });
      document.addEventListener("click", function () {
        dropdown.classList.add("hidden");
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        if (window.ServeEaseEmployeeAuth && typeof window.ServeEaseEmployeeAuth.logoutEmployee === "function") {
          window.ServeEaseEmployeeAuth.logoutEmployee();
          return;
        }
        sessionStorage.removeItem("serveEaseSession");
        window.location.href = "login.html";
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const session = window.ServeEaseEmployeeAuth && typeof window.ServeEaseEmployeeAuth.requireCurrentPageAccess === "function"
      ? window.ServeEaseEmployeeAuth.requireCurrentPageAccess()
      : null;
    if (!session) return;

    setupHeader(session);
    render();

    const search = byId("financeGlobalSearch");
    const status = byId("financeStatusFilter");
    if (search) search.addEventListener("input", render);
    if (status) status.addEventListener("change", render);

    window.addEventListener("storage", function (event) {
      if (!event.key || event.key === superuserKey || event.key.indexOf(customerPrefix) === 0 || event.key.indexOf(providerPrefix) === 0) render();
    });
  });
})();
