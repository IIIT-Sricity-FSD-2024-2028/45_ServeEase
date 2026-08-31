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
    const financeEngine = window.ServeEaseFinance;
    if (financeEngine && typeof financeEngine.getConfig === "function") {
      return financeEngine.getConfig();
    }
    const stored = readJson(financeConfigKey, null);
    if (stored && Number.isFinite(Number(stored.commissionRate))) {
      return {
        customerTaxRate: Number(stored.customerTaxRate) || 10,
        customerPlatformFeeRate: Number(stored.customerPlatformFeeRate) || 5,
        providerCommissionRate: Number(stored.providerCommissionRate || stored.commissionRate) || 10,
        commissionRate: Number(stored.providerCommissionRate || stored.commissionRate) || 10
      };
    }
    const config = { customerTaxRate: 10, customerPlatformFeeRate: 5, providerCommissionRate: 10, commissionRate: 10 };
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

  function populateStatusFilter(rows, filterId) {
    const filter = byId(filterId);
    if (!filter) return;
    const current = filter.value || "all";
    const values = uniqueValues(rows);
    filter.innerHTML = '<option value="all">All statuses</option>' + values.map(function (status) {
      return '<option value="' + escapeHtml(status) + '">' + escapeHtml(status) + '</option>';
    }).join("");
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

  function getPaymentRowBreakdown(row) {
    const financeEngine = window.ServeEaseFinance;
    if (row && Number.isFinite(Number(row.serviceFee)) && Number(row.serviceFee) > 0) {
      return financeEngine
        ? financeEngine.calculateBreakdown(Number(row.serviceFee))
        : {
            serviceFee: Number(row.serviceFee),
            taxAmount: Number(row.taxAmount) || Math.round(Number(row.serviceFee) * 10) / 100,
            platformFeeAmount: Number(row.platformFeeAmount) || Math.round(Number(row.serviceFee) * 5) / 100,
            customerTotal: Number(row.customerTotal || row.amount || row.gross) || Math.round(Number(row.serviceFee) * 1.15 * 100) / 100,
            providerCommissionAmount: Math.round(Number(row.serviceFee) * 10) / 100,
            providerPayout: Math.round(Number(row.serviceFee) * 0.90 * 100) / 100,
            platformRevenue: Math.round(Number(row.serviceFee) * 0.15 * 100) / 100
          };
    }
    return financeEngine && financeEngine.normalizeFinancialRecord
      ? financeEngine.normalizeFinancialRecord(row)
      : {
          serviceFee: Number(row.amount || row.gross) || 0,
          taxAmount: Math.round((Number(row.amount || row.gross) || 0) * 10) / 100,
          platformFeeAmount: Math.round((Number(row.amount || row.gross) || 0) * 5) / 100,
          customerTotal: Number(row.amount || row.gross) || 0,
          providerCommissionAmount: Math.round((Number(row.amount || row.gross) || 0) * 10) / 100,
          providerPayout: Math.round((Number(row.amount || row.gross) || 0) * 0.90 * 100) / 100,
          platformRevenue: Math.round((Number(row.amount || row.gross) || 0) * 0.15 * 100) / 100
        };
  }

  function reconcileFinancialPayments(payments, bookings, providerTransactions, customRates) {
    if (window.ServeEaseFinanceMetrics && typeof window.ServeEaseFinanceMetrics.reconcileFinancialPayments === "function") {
      return window.ServeEaseFinanceMetrics.reconcileFinancialPayments(payments, bookings, providerTransactions, customRates);
    }
    const financeEngine = window.ServeEaseFinance;
    const config = financeEngine ? financeEngine.getConfig() : { customerTaxRate: 10, customerPlatformFeeRate: 5, providerCommissionRate: 10 };

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

      const isBookingCompleted = String(booking.status || "").toLowerCase() === "completed";
      const resolvedPayoutStatus = payout ? payout.status : (isBookingCompleted ? "Paid" : "Pending");

      const rawServiceFee = Number(payment.serviceFee || (booking && booking.serviceFee));
      let serviceFee = 0;
      if (Number.isFinite(rawServiceFee) && rawServiceFee > 0) {
        serviceFee = rawServiceFee;
      } else if (gross > 90 && (gross - 90) % 10 === 9) {
        serviceFee = gross - 90;
      } else {
        serviceFee = Math.round((gross / 1.15) * 100) / 100;
        if (serviceFee <= 0) serviceFee = gross;
      }

      const breakdown = financeEngine
        ? financeEngine.calculateBreakdown(serviceFee, config)
        : {
            serviceFee: serviceFee,
            taxAmount: Math.round(serviceFee * 10) / 100,
            platformFeeAmount: Math.round(serviceFee * 5) / 100,
            customerTotal: Math.round(serviceFee * 1.15 * 100) / 100,
            providerCommissionAmount: Math.round(serviceFee * 10) / 100,
            providerPayout: Math.round(serviceFee * 0.90 * 100) / 100,
            platformRevenue: Math.round(serviceFee * 0.15 * 100) / 100
          };

      const bookingCustomer = booking && ["N/A", "Customer"].indexOf(booking.customer) === -1 ? booking.customer : "";
      const paymentCustomer = ["N/A", "Customer"].indexOf(payment.customer) === -1 ? payment.customer : "";
      const financialRow = {
        id: payment.id,
        booking: payment.booking,
        customer: bookingCustomer || paymentCustomer || "Customer",
        provider: provider,
        serviceFee: breakdown.serviceFee,
        taxAmount: breakdown.taxAmount,
        platformFeeAmount: breakdown.platformFeeAmount,
        customerTotal: breakdown.customerTotal,
        gross: breakdown.customerTotal,
        commission: breakdown.providerCommissionAmount,
        providerCommission: breakdown.providerCommissionAmount,
        earnings: breakdown.providerPayout,
        providerEarnings: breakdown.providerPayout,
        providerPayout: breakdown.providerPayout,
        platformRevenue: breakdown.platformRevenue,
        date: payment.date,
        status: payment.status,
        payoutStatus: resolvedPayoutStatus,
        payoutDate: payout ? payout.date : (isBookingCompleted ? (payment.date || "-") : "-"),
        payoutAmount: breakdown.providerPayout,
        searchText: [payment.id, payment.booking, payment.customer, provider, payment.status].join(" ").toLowerCase()
      };
      financialRow.searchText = [
        financialRow.id,
        financialRow.booking,
        financialRow.customer,
        financialRow.provider,
        financialRow.payoutStatus,
        financialRow.status,
        financialRow.serviceFee,
        financialRow.customerTotal,
        financialRow.providerEarnings
      ].join(" ").toLowerCase();
      return financialRow;
    }).filter(Boolean);
  }

  function renderStats(payments, financialRows, refunds, financeConfig) {
    const grossCustomerPayments = financialRows.reduce(function (sum, row) { return sum + (Number(row.customerTotal) || Number(row.gross) || 0); }, 0);
    const providerEarnings = financialRows.reduce(function (sum, row) { return sum + (Number(row.providerPayout) || Number(row.earnings) || 0); }, 0);
    const platformRevenue = financialRows.reduce(function (sum, row) { return sum + (Number(row.platformRevenue) || Number(row.commission) || 0); }, 0);
    const pendingPayout = financialRows.filter(function (row) { return String(row.payoutStatus).toLowerCase() === "pending"; }).reduce(function (sum, row) {
      const payout = Number(row.payoutAmount != null ? row.payoutAmount : row.providerPayout);
      return sum + (Number.isFinite(payout) ? payout : 0);
    }, 0);

    byId("financeStatsGrid").innerHTML = [
      statCard("green", "₹", formatCurrency(grossCustomerPayments), "Gross Customer Payments"),
      statCard("blue", "↗", formatPreciseCurrency(providerEarnings), "Provider Earnings"),
      statCard("purple", "◆", formatPreciseCurrency(platformRevenue), "Total Platform Revenue (15%)"),
      statCard("orange", "◔", formatCurrency(pendingPayout), "Pending Payouts"),
      statCard("blue", "↺", String(refunds.length), "Refund Records")
    ].join("");

    byId("financeSummaryGrid").innerHTML = [
      summaryItem("Customer Payment Transactions", payments.length),
      summaryItem("Provider Earnings", financialRows.length),
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

  function renderCommission(financeConfig) {
    const config = typeof financeConfig === "object" ? financeConfig : { providerCommissionRate: Number(financeConfig) || 10, customerPlatformFeeRate: 5, customerTaxRate: 10 };
    const totalPlatformRate = (Number(config.customerPlatformFeeRate) || 5) + (Number(config.providerCommissionRate) || 10);
    byId("financeCommissionPanel").innerHTML = [
      '<div class="finance-revenue-streams">' +
      '<div class="finance-revenue-stream"><span>Customer Platform Fee</span><strong>' + escapeHtml((config.customerPlatformFeeRate || 5) + "%") + '</strong><small>of Service Fee</small></div>' +
      '<div class="finance-revenue-stream"><span>Provider-Side Commission</span><strong>' + escapeHtml((config.providerCommissionRate || 10) + "%") + '</strong><small>of Service Fee</small></div>' +
      '</div>',
      '<div class="finance-total-revenue"><span>Total Platform Revenue</span><strong>' + escapeHtml(totalPlatformRate + "% of Service Fee") + '</strong></div>'
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
    const b = getPaymentRowBreakdown(row);
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.method) + '</td><td>' + escapeHtml(formatCurrency(b.serviceFee)) + '</td><td>' + escapeHtml(formatPreciseCurrency(b.taxAmount)) + '</td><td>' + escapeHtml(formatPreciseCurrency(b.platformFeeAmount)) + '</td><td><strong>' + escapeHtml(formatCurrency(b.customerTotal)) + '</strong></td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function earningRow(row) {
    const b = getPaymentRowBreakdown(row);
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(formatCurrency(b.serviceFee)) + '</td><td>' + escapeHtml(formatPreciseCurrency(b.providerCommissionAmount)) + '</td><td><strong>' + escapeHtml(formatPreciseCurrency(b.providerPayout)) + '</strong></td><td>' + escapeHtml(row.payoutDate || row.date) + '</td><td><span class="status-pill ' + statusClass(row.payoutStatus) + '">' + escapeHtml(row.payoutStatus || "—") + '</span></td></tr>';
  }

  function commissionRow(row) {
    const b = getPaymentRowBreakdown(row);
    return '<tr><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(formatCurrency(b.serviceFee)) + '</td><td>' + escapeHtml(formatPreciseCurrency(b.platformFeeAmount)) + '</td><td>' + escapeHtml(formatPreciseCurrency(b.providerCommissionAmount)) + '</td><td><strong>' + escapeHtml(formatPreciseCurrency(b.platformRevenue)) + '</strong></td><td>' + escapeHtml(formatPreciseCurrency(b.providerPayout)) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td><td>' + escapeHtml(row.date) + '</td></tr>';
  }

  function refundRow(row) {
    return '<tr><td>' + escapeHtml(row.id) + '</td><td>' + escapeHtml(row.booking) + '</td><td>' + escapeHtml(row.customer) + '</td><td>' + escapeHtml(row.provider) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(formatCurrency(row.amount)) + '</td><td>' + escapeHtml(row.date) + '</td><td><span class="status-pill ' + statusClass(row.status) + '">' + escapeHtml(row.status) + '</span></td></tr>';
  }

  function render() {
    const payments = collectPayments();
    const bookings = collectBookings();
    const providerTransactions = collectProviderTransactions();
    const financeConfig = getFinanceConfig();
    const financialRows = reconcileFinancialPayments(payments, bookings, providerTransactions, financeConfig);
    const refunds = collectRefunds(payments, bookings);
    const ledgerRows = financialRows;
    const term = String(byId("financeGlobalSearch") && byId("financeGlobalSearch").value || "").trim().toLowerCase();
    const paymentTerm = String(byId("financePaymentSearch") && byId("financePaymentSearch").value || "").trim().toLowerCase();
    const earningsTerm = String(byId("financeEarningsSearch") && byId("financeEarningsSearch").value || "").trim().toLowerCase();
    const commissionTerm = String(byId("financeCommissionSearch") && byId("financeCommissionSearch").value || "").trim().toLowerCase();
    const refundTerm = String(byId("financeRefundSearch") && byId("financeRefundSearch").value || "").trim().toLowerCase();

    renderStats(payments, financialRows, refunds, financeConfig);
    renderCommission(financeConfig);
    populateStatusFilter(payments, "financePaymentStatusFilter");
    populateStatusFilter(financialRows, "financeEarningsStatusFilter");

    const customerPaymentStatus = byId("financePaymentStatusFilter") ? byId("financePaymentStatusFilter").value : "all";
    const providerEarningsStatus = byId("financeEarningsStatusFilter") ? byId("financeEarningsStatusFilter").value : "all";
    renderTable(payments.filter(function (row) { return rowMatches(row, term, customerPaymentStatus, paymentTerm); }), "financePaymentRows", "financePaymentsEmpty", "financePaymentCount", paymentRow);
    renderTable(financialRows.filter(function (row) { return rowMatches(row, term, providerEarningsStatus, earningsTerm); }), "financeEarningRows", "financeEarningsEmpty", "financeEarningsCount", earningRow);
    renderTable(ledgerRows.filter(function (row) { return rowMatches(row, term, "all", commissionTerm); }), "financeCommissionRows", "financeCommissionEmpty", "financeCommissionCount", commissionRow);
    renderTable(refunds.filter(function (row) { return rowMatches(row, term, "all", refundTerm); }), "financeRefundRows", "financeRefundsEmpty", "financeRefundCount", refundRow);
  }

  function setupHeader(session) {
    const nameNode = byId("financeEmployeeName");
    const profileBtn = byId("financeProfileBtn");
    const dropdown = byId("financeProfileDropdown");
    const logoutBtn = byId("financeLogoutBtn");
    if (nameNode) nameNode.textContent = session && (session.fullName || session.name) || "Superuser";

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
    const session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
    const isSuperuser = session && session.isLoggedIn && ["superuser", "admin"].includes(session.role);
    if (!isSuperuser) {
      window.location.href = "login.html";
      return;
    }

    setupHeader(session);
    render();

    const search = byId("financeGlobalSearch");
    const statusFilters = [byId("financePaymentStatusFilter"), byId("financeEarningsStatusFilter")].filter(Boolean);
    if (search) search.addEventListener("input", render);
    statusFilters.forEach(function (status) {
      status.addEventListener("change", render);
    });
    ["financePaymentSearch", "financeEarningsSearch", "financeCommissionSearch", "financeRefundSearch"].forEach(function (id) {
      const input = byId(id);
      if (input) input.addEventListener("input", render);
    });

    window.addEventListener("storage", function (event) {
      if (!event.key || event.key === superuserKey || event.key.indexOf(customerPrefix) === 0 || event.key.indexOf(providerPrefix) === 0) render();
    });
  });
})();
