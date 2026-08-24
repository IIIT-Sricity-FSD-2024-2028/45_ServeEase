(function () {
  const customerPrefix = "serveEaseCustomerModuleData";
  const providerPrefix = "serveEaseProviderModuleData";
  const superuserKey = "serveEaseSuperuserModuleData";
  const financeConfigKey = "serveEaseFinanceConfig";

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
    return arguments.length > 1 ? fallback : "N/A";
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

  function formatPreciseCurrency(amount) {
    const value = Number(amount) || 0;
    return "₹" + value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  function getFinanceConfig() {
    const stored = readJson(financeConfigKey, null);
    if (stored && Number.isFinite(Number(stored.commissionRate))) return stored;
    const config = { commissionRate: 10 };
    localStorage.setItem(financeConfigKey, JSON.stringify(config));
    return config;
  }

  function rowMatches(row, term, status, extraTerm) {
    const matchesSearch = (!term && !extraTerm) ||
      [term, extraTerm].filter(Boolean).every(function (value) {
        return row.searchText.indexOf(value) !== -1;
      });
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

  function customerOwner(data, storageKey) {
    const direct = data.ownerName || data.customerName || data.fullName;
    if (direct && String(direct).trim().toLowerCase() !== "customer") return display(direct, "Customer");

    const appData = readJson("serveEaseData", {}) || {};
    const users = Array.isArray(appData.users) ? appData.users : [];
    const suffix = storageKey && storageKey.indexOf(customerPrefix + ":") === 0
      ? storageKey.slice((customerPrefix + ":").length)
      : "";
    const owner = users.find(function (user) {
      if (!user || user.role !== "customer") return false;
      return (data.ownerCustomerId && String(user.id) === String(data.ownerCustomerId)) ||
        (data.ownerEmail && String(user.email || "").toLowerCase() === String(data.ownerEmail).toLowerCase()) ||
        (suffix && (String(user.id) === suffix || String(user.email || "").toLowerCase() === suffix.toLowerCase())) ||
        (!suffix && storageKey === customerPrefix && user.id === "CUS001");
    });
    return display(owner && (owner.fullName || owner.name), "Customer");
  }

  function parseFinanceDate(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function resolvePayoutStatus(record) {
    const existing = String(record.payoutStatus || "").trim();
    const paymentStatus = String(record.status || "").trim().toLowerCase();
    if (["failed", "cancelled", "refunded"].indexOf(paymentStatus) !== -1) return existing || record.status;

    const relevantDate = [record.payoutDate, record.date].map(parseFinanceDate).find(Boolean);
    if (!relevantDate) return existing || "Pending";

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return relevantDate.getTime() <= today.getTime() ? "Paid" : "Pending";
  }

  function providerOwner(data) {
    const profile = data && data.profile || {};
    return display(profile.organisationName || profile.fullName || data.providerName || data.ownerName);
  }

  function normalizeProviderName(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "");
  }

  function collectPayments() {
    const rows = [];
    storageKeys(customerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      const owner = customerOwner(data, key);
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

  function collectProviderTransactions() {
    const rows = [];
    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {});
      (Array.isArray(data.transactions) ? data.transactions : []).forEach(function (transaction) {
        rows.push({
          id: display(transaction.id),
          booking: display(transaction.bookingRef || transaction.bookingReference),
          amount: Number(transaction.amount) || 0,
          status: display(transaction.status),
          date: display(transaction.receivedDate || transaction.paymentDate || transaction.date, "-")
        });
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function normalizeBooking(booking, owner) {
    if (!booking) return null;
    const row = {
      id: display(booking.id || booking.bookingRef || booking.bookingReference),
      customer: display(booking.customer || booking.customerName || owner.customer),
      provider: display(booking.provider || booking.providerName || owner.provider),
      providerId: display(booking.providerId),
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
    const superuserData = readJson(superuserKey, {}) || {};
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) {
      const normalized = normalizeBooking(booking, {});
      if (normalized) rows.push(normalized);
    });

    storageKeys(customerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      const owner = { customer: customerOwner(data, key) };
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        const normalized = normalizeBooking(booking, owner);
        if (normalized) rows.push(normalized);
      });
    });

    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      const owner = { provider: providerOwner(data) };
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        const normalized = normalizeBooking(booking, owner);
        if (normalized) rows.push(normalized);
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

  function reconcileFinancialPayments(payments, bookings, providerTransactions, commissionRate) {
    if (window.ServeEaseFinanceMetrics && typeof window.ServeEaseFinanceMetrics.reconcileFinancialPayments === "function") {
      return window.ServeEaseFinanceMetrics.reconcileFinancialPayments(payments, bookings, providerTransactions, commissionRate);
    }
    const bookingMap = {};
    bookings.forEach(function (booking) {
      bookingMap[String(booking.id || "").toLowerCase()] = booking;
    });

    return payments.filter(function (payment) {
      return isSuccessfulStatus(payment.status) && !isRefundStatus(payment.status);
    }).map(function (payment) {
      const booking = bookingMap[String(payment.booking || "").toLowerCase()];
      const bookingProviderName = booking && booking.provider !== "N/A" ? booking.provider : "";
      const paymentProviderName = payment.provider !== "N/A" ? payment.provider : "";
      const providerId = booking && booking.providerId !== "N/A" ? booking.providerId : "";
      const provider = bookingProviderName || paymentProviderName || providerId;
      const providerIdentity = providerId || normalizeProviderName(bookingProviderName) || normalizeProviderName(paymentProviderName);
      const gross = Number(payment.amount);
      if (!booking || !providerIdentity || !Number.isFinite(gross) || gross < 0) return null;

      const payout = providerTransactions.find(function (transaction) {
        return String(transaction.booking || "").toLowerCase() === String(payment.booking || "").toLowerCase() ||
          String(transaction.id).toLowerCase() === String(payment.id).toLowerCase();
      }) || null;
      const commission = gross * commissionRate / 100;
      const bookingCustomer = booking && ["N/A", "Customer"].indexOf(booking.customer) === -1 ? booking.customer : "";
      const paymentCustomer = ["N/A", "Customer"].indexOf(payment.customer) === -1 ? payment.customer : "";
      const financialRow = {
        id: payment.id,
        booking: payment.booking,
        customer: bookingCustomer || paymentCustomer || "Customer",
        provider: provider,
        gross: gross,
        commission: commission,
        earnings: gross - commission,
        date: payment.date,
        status: payment.status,
        payoutStatus: payout ? payout.status : "",
        payoutDate: payout ? payout.date : "-",
        payoutAmount: payout ? payout.amount : 0,
        searchText: [payment.id, payment.booking, payment.customer, provider, payment.status].join(" ").toLowerCase()
      };
      financialRow.payoutStatus = resolvePayoutStatus(financialRow);
      financialRow.searchText = [
        financialRow.id,
        financialRow.booking,
        financialRow.customer,
        financialRow.provider,
        financialRow.payoutStatus,
        financialRow.status,
        financialRow.gross
      ].join(" ").toLowerCase();
      return financialRow;
    }).filter(Boolean);
  }

  function renderStats(payments, financialRows, refunds, commissionRate) {
    const grossPayments = financialRows.reduce(function (sum, row) { return sum + row.gross; }, 0);
    const providerEarnings = financialRows.reduce(function (sum, row) { return sum + row.earnings; }, 0);
    const platformCommission = financialRows.reduce(function (sum, row) { return sum + row.commission; }, 0);
    const pendingPayout = financialRows.filter(function (row) { return String(row.payoutStatus).toLowerCase() === "pending"; }).reduce(function (sum, row) {
      const payout = Number(row.payoutAmount);
      return sum + (Number.isFinite(payout) ? payout : 0);
    }, 0);

    byId("financeStatsGrid").innerHTML = [
      statCard("green", "₹", formatCurrency(grossPayments), "Gross Payment Volume"),
      statCard("blue", "↗", formatPreciseCurrency(providerEarnings), "Provider Earnings"),
      statCard("purple", "◆", formatPreciseCurrency(platformCommission), "Platform Commission"),
      statCard("orange", "◔", formatCurrency(pendingPayout), "Pending Payouts"),
      statCard("blue", "↺", String(refunds.length), "Refund Records")
    ].join("");

    byId("financeSummaryGrid").innerHTML = [
      summaryItem("Customer Payment Transactions", payments.length),
      summaryItem("Provider Earnings", financialRows.length),
      summaryItem("Commission Rate", commissionRate + "%"),
      summaryItem("Financial Source", "Payment + Booking records"),
      summaryItem("Last updated", new Date().toLocaleString("en-IN"))
    ].join("");
  }

  function statCard(color, icon, value, label) {
    return '<div class="stat-card-dashboard"><div class="feature-icon ' + color + '">' + escapeHtml(icon) + '</div><h3>' + escapeHtml(value) + '</h3><p>' + escapeHtml(label) + '</p></div>';
  }

  function summaryItem(label, value) {
    return '<div class="finance-summary-item"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function renderCommission(commissionRate) {
    byId("financeCommissionPanel").innerHTML = [
      '<div class="finance-commission-value">' + escapeHtml(commissionRate + "%") + '</div>',
      '<p class="finance-commission-note">Platform commission is calculated from each eligible successful customer payment.</p>'
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
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(formatCurrency(row.gross)) + '</td><td>' + escapeHtml(formatPreciseCurrency(row.commission)) + '</td><td>' + escapeHtml(formatPreciseCurrency(row.earnings)) + '</td><td>' + escapeHtml(row.date) + '</td><td>' + escapeHtml(row.payoutStatus || "—") + '</td></tr>';
  }

  function commissionRow(row, commissionRate) {
    return '<tr><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(formatCurrency(row.gross)) + '</td><td>' + escapeHtml(commissionRate + "%") + '</td><td>' + escapeHtml(formatPreciseCurrency(row.commission)) + '</td><td>' + escapeHtml(formatPreciseCurrency(row.earnings)) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td><td>' + escapeHtml(row.date) + '</td></tr>';
  }

  function refundRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function render() {
    const payments = collectPayments();
    const bookings = collectBookings();
    const providerTransactions = collectProviderTransactions();
    const financeConfig = getFinanceConfig();
    const commissionRate = Number(financeConfig.commissionRate);
    const financialRows = reconcileFinancialPayments(payments, bookings, providerTransactions, commissionRate);
    const refunds = collectRefunds(payments, bookings);
    const ledgerRows = financialRows;
    const allRows = payments.concat(financialRows, refunds);
    const term = String(byId("financeGlobalSearch") && byId("financeGlobalSearch").value || "").trim().toLowerCase();
    const paymentTerm = String(byId("financePaymentSearch") && byId("financePaymentSearch").value || "").trim().toLowerCase();
    const earningsTerm = String(byId("financeEarningsSearch") && byId("financeEarningsSearch").value || "").trim().toLowerCase();
    const commissionTerm = String(byId("financeCommissionSearch") && byId("financeCommissionSearch").value || "").trim().toLowerCase();
    const refundTerm = String(byId("financeRefundSearch") && byId("financeRefundSearch").value || "").trim().toLowerCase();
    const status = byId("financeStatusFilter") ? byId("financeStatusFilter").value : "all";

    renderStats(payments, financialRows, refunds, commissionRate);
    renderCommission(commissionRate);
    populateStatusFilter(allRows);

    const activeStatus = byId("financeStatusFilter") ? byId("financeStatusFilter").value : status;
    renderTable(payments.filter(function (row) { return rowMatches(row, term, activeStatus, paymentTerm); }), "financePaymentRows", "financePaymentsEmpty", "financePaymentCount", paymentRow);
    renderTable(financialRows.filter(function (row) { return rowMatches(row, term, activeStatus, earningsTerm); }), "financeEarningRows", "financeEarningsEmpty", "financeEarningsCount", earningRow);
    renderTable(ledgerRows.filter(function (row) { return rowMatches(row, term, activeStatus, commissionTerm); }), "financeCommissionRows", "financeCommissionEmpty", "financeCommissionCount", function (row) { return commissionRow(row, commissionRate); });
    renderTable(refunds.filter(function (row) { return rowMatches(row, term, activeStatus, refundTerm); }), "financeRefundRows", "financeRefundsEmpty", "financeRefundCount", refundRow);
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
    ["financePaymentSearch", "financeEarningsSearch", "financeCommissionSearch", "financeRefundSearch"].forEach(function (id) {
      const input = byId(id);
      if (input) input.addEventListener("input", render);
    });

    window.addEventListener("storage", function (event) {
      if (!event.key || event.key === superuserKey || event.key.indexOf(customerPrefix) === 0 || event.key.indexOf(providerPrefix) === 0) render();
    });
  });
})();
