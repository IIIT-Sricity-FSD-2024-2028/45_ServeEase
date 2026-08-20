(function () {
  "use strict";

  const customerPrefix = "serveEaseCustomerModuleData";
  const providerPrefix = "serveEaseProviderModuleData";

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
    return text || (arguments.length > 1 ? fallback : "Not recorded");
  }

  function dedupeRows(rows, keyBuilder) {
    const seen = {};
    return rows.filter(function (row) {
      const key = keyBuilder(row);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function customerOwner(data, storageKey) {
    const direct = data.ownerName || data.customerName || data.fullName;
    if (direct && String(direct).trim().toLowerCase() !== "customer") return display(direct, "Customer");
    const appData = readJson("serveEaseData", {}) || {};
    const users = Array.isArray(appData.users) ? appData.users : [];
    const suffix = storageKey && storageKey.indexOf(customerPrefix + ":") === 0
      ? storageKey.slice((customerPrefix + ":").length) : "";
    const owner = users.find(function (user) {
      return user && user.role === "customer" && (
        (data.ownerCustomerId && String(user.id) === String(data.ownerCustomerId)) ||
        (data.ownerEmail && String(user.email || "").toLowerCase() === String(data.ownerEmail).toLowerCase()) ||
        (suffix && (String(user.id) === suffix || String(user.email || "").toLowerCase() === suffix.toLowerCase())) ||
        (!suffix && storageKey === customerPrefix && user.id === "CUS001")
      );
    });
    return display(owner && (owner.fullName || owner.name), "Customer");
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
        rows.push({
          id: display(payment.id), booking: display(payment.bookingRef || payment.bookingReference), customer: owner,
          provider: display(payment.provider || payment.providerName), amount: Number(payment.amount) || 0,
          date: display(payment.date || payment.paymentDate || payment.createdAtIso),
          status: display(payment.status || payment.paymentStatus, "Pending")
        });
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function collectProviderTransactions() {
    const rows = [];
    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      (Array.isArray(data.transactions) ? data.transactions : []).forEach(function (transaction) {
        rows.push({ id: display(transaction.id), booking: display(transaction.bookingRef || transaction.bookingReference), amount: Number(transaction.amount) || 0, status: display(transaction.status), date: display(transaction.receivedDate || transaction.paymentDate || transaction.date, "-") });
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function normalizeBooking(booking, owner) {
    if (!booking) return null;
    return {
      id: display(booking.id || booking.bookingRef || booking.bookingReference),
      customer: display(booking.customer || booking.customerName || owner.customer),
      provider: display(booking.provider || booking.providerName || owner.provider),
      providerId: display(booking.providerId),
      service: display(booking.service || booking.serviceType || booking.category),
      amount: Number(booking.amount) || 0,
      date: display(booking.paymentDate || booking.paidAt || booking.serviceDate || booking.date),
      status: display(booking.paymentStatus || booking.payment || booking.paymentState, "Pending")
    };
  }

  function collectBookings() {
    const rows = [];
    const superuserData = readJson("serveEaseSuperuserModuleData", {}) || {};
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) {
      const normalized = normalizeBooking(booking, {});
      if (normalized) rows.push(normalized);
    });
    storageKeys(customerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        const normalized = normalizeBooking(booking, { customer: customerOwner(data, key) });
        if (normalized) rows.push(normalized);
      });
    });
    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      (Array.isArray(data.bookings) ? data.bookings : []).forEach(function (booking) {
        const normalized = normalizeBooking(booking, { provider: providerOwner(data) });
        if (normalized) rows.push(normalized);
      });
    });
    return dedupeRows(rows, function (row) { return row.id; });
  }

  function parseFinanceDate(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return null;
    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function resolvePayoutStatus(record) {
    const existing = String(record.payoutStatus || "").trim();
    const status = String(record.status || "").trim().toLowerCase();
    if (["failed", "cancelled", "refunded"].indexOf(status) !== -1) return existing || record.status;
    const relevantDate = [record.payoutDate, record.date].map(parseFinanceDate).find(Boolean);
    if (!relevantDate) return existing || "Pending";
    const today = new Date(); today.setHours(23, 59, 59, 999);
    return relevantDate.getTime() <= today.getTime() ? "Paid" : "Pending";
  }

  function reconcileFinancialPayments(payments, bookings, providerTransactions, commissionRate) {
    const bookingMap = {};
    bookings.forEach(function (booking) { bookingMap[String(booking.id || "").toLowerCase()] = booking; });
    return payments.filter(function (payment) {
      const status = String(payment.status || "").toLowerCase();
      return ["successful", "success", "paid"].includes(status) && status !== "refunded";
    }).map(function (payment) {
      const booking = bookingMap[String(payment.booking || "").toLowerCase()];
      const bookingProviderName = booking && booking.provider !== "Not recorded" ? booking.provider : "";
      const paymentProviderName = payment.provider !== "Not recorded" ? payment.provider : "";
      const providerId = booking && booking.providerId !== "Not recorded" ? booking.providerId : "";
      const provider = bookingProviderName || paymentProviderName || providerId;
      const providerIdentity = providerId || normalizeProviderName(bookingProviderName) || normalizeProviderName(paymentProviderName);
      const gross = Number(payment.amount);
      if (!booking || !providerIdentity || !Number.isFinite(gross) || gross < 0) return null;
      const payout = providerTransactions.find(function (transaction) {
        return String(transaction.booking || "").toLowerCase() === String(payment.booking || "").toLowerCase() || String(transaction.id).toLowerCase() === String(payment.id).toLowerCase();
      }) || null;
      const row = {
        id: payment.id, booking: payment.booking,
        customer: booking && ["Not recorded", "Customer"].indexOf(booking.customer) === -1 ? booking.customer : (["Not recorded", "Customer"].indexOf(payment.customer) === -1 ? payment.customer : "Customer"),
        gross: gross, commission: gross * Number(commissionRate) / 100, earnings: gross - (gross * Number(commissionRate) / 100),
        provider: provider, date: payment.date, status: payment.status, payoutStatus: payout ? payout.status : "", payoutDate: payout ? payout.date : "-", payoutAmount: payout ? payout.amount : 0
      };
      row.payoutStatus = resolvePayoutStatus(row);
      row.searchText = [row.id, row.booking, row.customer, row.provider, row.payoutStatus, row.status, row.gross].join(" ").toLowerCase();
      return row;
    }).filter(Boolean);
  }

  function calculatePlatformCommission(commissionRate) {
    const stored = readJson("serveEaseFinanceConfig", null);
    const rate = Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : (stored && Number.isFinite(Number(stored.commissionRate)) ? Number(stored.commissionRate) : 10);
    return reconcileFinancialPayments(collectPayments(), collectBookings(), collectProviderTransactions(), rate)
      .reduce(function (sum, row) { return sum + row.commission; }, 0);
  }

  function getProviderEarningsRows(commissionRate) {
    const stored = readJson("serveEaseFinanceConfig", null);
    const rate = Number.isFinite(Number(commissionRate)) ? Number(commissionRate) : (stored && Number.isFinite(Number(stored.commissionRate)) ? Number(stored.commissionRate) : 10);
    return reconcileFinancialPayments(collectPayments(), collectBookings(), collectProviderTransactions(), rate);
  }

  window.ServeEaseFinanceMetrics = {
    collectPayments: collectPayments,
    collectBookings: collectBookings,
    collectProviderTransactions: collectProviderTransactions,
    reconcileFinancialPayments: reconcileFinancialPayments,
    calculatePlatformCommission: calculatePlatformCommission,
    getProviderEarningsRows: getProviderEarningsRows
  };
})();
