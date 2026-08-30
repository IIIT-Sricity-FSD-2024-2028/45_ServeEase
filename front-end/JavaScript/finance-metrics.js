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
    return text || (arguments.length > 1 ? fallback : "N/A");
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

  function roundMoney(value) {
    const num = Number(value);
    return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0;
  }

  function reconcileFinancialPayments(payments, bookings, providerTransactions, customRates) {
    const financeEngine = window.ServeEaseFinance;
    const config = financeEngine ? financeEngine.getConfig() : { customerTaxRate: 10, customerPlatformFeeRate: 5, providerCommissionRate: 10 };
    if (customRates && typeof customRates === "object") {
      if (Number.isFinite(Number(customRates.providerCommissionRate))) config.providerCommissionRate = Number(customRates.providerCommissionRate);
      if (Number.isFinite(Number(customRates.commissionRate))) config.providerCommissionRate = Number(customRates.commissionRate);
      if (Number.isFinite(Number(customRates.customerTaxRate))) config.customerTaxRate = Number(customRates.customerTaxRate);
      if (Number.isFinite(Number(customRates.customerPlatformFeeRate))) config.customerPlatformFeeRate = Number(customRates.customerPlatformFeeRate);
    } else if (Number.isFinite(Number(customRates))) {
      config.providerCommissionRate = Number(customRates);
    }

    const bookingMap = {};
    bookings.forEach(function (booking) { bookingMap[String(booking.id || "").toLowerCase()] = booking; });

    return payments.filter(function (payment) {
      const status = String(payment.status || "").toLowerCase();
      return ["successful", "success", "paid"].includes(status) && status !== "refunded";
    }).map(function (payment) {
      const booking = bookingMap[String(payment.booking || "").toLowerCase()];
      const bookingProviderName = booking && booking.provider !== "N/A" ? booking.provider : "";
      const paymentProviderName = payment.provider !== "N/A" ? payment.provider : "";
      const providerId = booking && booking.providerId !== "N/A" ? booking.providerId : "";
      const provider = bookingProviderName || paymentProviderName || providerId;
      const providerIdentity = providerId || normalizeProviderName(bookingProviderName) || normalizeProviderName(paymentProviderName);

      const rawPaymentAmount = Number(payment.amount);
      if (!booking || !providerIdentity || !Number.isFinite(rawPaymentAmount) || rawPaymentAmount < 0) return null;

      // Determine Base Service Fee (S)
      let serviceFee = 0;
      if (payment.serviceFee && Number(payment.serviceFee) > 0) {
        serviceFee = Number(payment.serviceFee);
      } else if (booking.serviceFee && Number(booking.serviceFee) > 0) {
        serviceFee = Number(booking.serviceFee);
      } else if (rawPaymentAmount > 90 && (rawPaymentAmount - 90) % 10 === 9) {
        // Old legacy fixed ₹50 + ₹40 = ₹90 format
        serviceFee = rawPaymentAmount - 90;
      } else {
        serviceFee = roundMoney(rawPaymentAmount / (1 + (config.customerTaxRate + config.customerPlatformFeeRate) / 100));
        if (serviceFee <= 0) serviceFee = rawPaymentAmount;
      }

      const breakdown = financeEngine
        ? financeEngine.calculateBreakdown(serviceFee, config)
        : {
            serviceFee: serviceFee,
            taxAmount: roundMoney(serviceFee * (config.customerTaxRate / 100)),
            platformFeeAmount: roundMoney(serviceFee * (config.customerPlatformFeeRate / 100)),
            customerTotal: roundMoney(serviceFee + roundMoney(serviceFee * (config.customerTaxRate / 100)) + roundMoney(serviceFee * (config.customerPlatformFeeRate / 100))),
            providerCommissionAmount: roundMoney(serviceFee * (config.providerCommissionRate / 100)),
            providerPayout: roundMoney(serviceFee - roundMoney(serviceFee * (config.providerCommissionRate / 100))),
            platformRevenue: roundMoney(roundMoney(serviceFee * (config.customerPlatformFeeRate / 100)) + roundMoney(serviceFee * (config.providerCommissionRate / 100)))
          };

      const payout = providerTransactions.find(function (transaction) {
        return String(transaction.booking || "").toLowerCase() === String(payment.booking || "").toLowerCase() || String(transaction.id).toLowerCase() === String(payment.id).toLowerCase();
      }) || null;

      const isBookingCompleted = String(booking.status || "").toLowerCase() === "completed";
      const resolvedPayoutStatus = payout
        ? (payout.status || resolvePayoutStatus(payout))
        : (isBookingCompleted ? "Paid" : "Pending");

      const row = {
        id: payment.id,
        booking: payment.booking,
        customer: booking && ["N/A", "Customer"].indexOf(booking.customer) === -1 ? booking.customer : (["N/A", "Customer"].indexOf(payment.customer) === -1 ? payment.customer : "Customer"),
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
        platformFee: breakdown.platformFeeAmount,
        platformRevenue: breakdown.platformRevenue,
        date: payment.date,
        status: payment.status,
        payoutStatus: resolvedPayoutStatus,
        payoutDate: payout ? payout.date : (isBookingCompleted ? (payment.date || "-") : "-"),
        payoutAmount: breakdown.providerPayout
      };

      row.searchText = [
        row.id,
        row.booking,
        row.customer,
        row.provider,
        row.payoutStatus,
        row.status,
        row.serviceFee,
        row.customerTotal,
        row.providerEarnings
      ].join(" ").toLowerCase();

      return row;
    }).filter(Boolean);
  }

  function calculatePlatformRevenue(customRates) {
    return reconcileFinancialPayments(collectPayments(), collectBookings(), collectProviderTransactions(), customRates)
      .reduce(function (sum, row) { return roundMoney(sum + row.platformRevenue); }, 0);
  }

  function calculatePlatformCommission(commissionRate) {
    return calculatePlatformRevenue(commissionRate);
  }

  function getProviderEarningsRows(commissionRate) {
    return reconcileFinancialPayments(collectPayments(), collectBookings(), collectProviderTransactions(), commissionRate);
  }

  window.ServeEaseFinanceMetrics = {
    collectPayments: collectPayments,
    collectBookings: collectBookings,
    collectProviderTransactions: collectProviderTransactions,
    reconcileFinancialPayments: reconcileFinancialPayments,
    calculatePlatformRevenue: calculatePlatformRevenue,
    calculatePlatformCommission: calculatePlatformCommission,
    getProviderEarningsRows: getProviderEarningsRows
  };
})();
