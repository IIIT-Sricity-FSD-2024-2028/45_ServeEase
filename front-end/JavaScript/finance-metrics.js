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
          providerId: display(payment.providerId), category: display(payment.category || payment.serviceCategory),
          serviceType: display(payment.serviceType || payment.service), service: display(payment.service),
          serviceId: display(payment.serviceId),
          serviceFee: Number(payment.serviceFee) || 0, taxAmount: Number(payment.taxAmount) || 0,
          platformFeeAmount: Number(payment.platformFeeAmount) || 0, customerTotal: Number(payment.customerTotal || payment.amount) || 0,
          refundAmount: Number(payment.refundAmount) || 0, refundStatus: display(payment.refundStatus, ""),
          taxRefundAmount: Number(payment.taxRefundAmount) || 0, cancellationPolicy: display(payment.cancellationPolicy, ""),
          cancellationActor: display(payment.cancellationActor, ""),
          refundServiceFee: Number(payment.refundServiceFee) || 0, refundPlatformFee: Number(payment.refundPlatformFee) || 0,
          refundTax: Number(payment.refundTax) || 0, providerCommissionAmount: Number(payment.providerCommissionAmount) || 0,
          providerPayout: Number(payment.providerPayoutAmount != null ? payment.providerPayoutAmount : payment.providerPayout) || 0,
          providerPayoutAmount: Number(payment.providerPayoutAmount != null ? payment.providerPayoutAmount : payment.providerPayout) || 0,
          platformRevenue: Number(payment.platformRevenueAmount != null ? payment.platformRevenueAmount : payment.platformRevenue) || 0,
          platformRevenueAmount: Number(payment.platformRevenueAmount != null ? payment.platformRevenueAmount : payment.platformRevenue) || 0,
          customerPlatformFeeAmount: Number(payment.customerPlatformFeeAmount != null ? payment.customerPlatformFeeAmount : payment.platformFeeAmount) || 0,
          hasStoredCancellationOutcome: Boolean(payment.cancellationPolicy) &&
            payment.refundAmount != null && payment.providerCommissionAmount != null &&
            (payment.providerPayoutAmount != null || payment.providerPayout != null) &&
            (payment.platformRevenueAmount != null || payment.platformRevenue != null),
          date: display(payment.date || payment.paymentDate || payment.createdAtIso),
          status: display(payment.status || payment.paymentStatus, "Pending")
        });
      });
    });
    const canonical = Array.isArray(window.__serveEaseCanonicalBookings) ? window.__serveEaseCanonicalBookings : [];
    const localBookingIds = {};
    rows.forEach(function (row) { if (row.booking) localBookingIds[String(row.booking).toLowerCase()] = true; });
    canonical.forEach(function (booking) {
      const normalized = normalizeBooking(booking, {});
      const status = String(normalized && normalized.status || '').toLowerCase();
      // A cancelled booking remains a financial record.  In particular, a
      // partial-refund cancellation commonly has paymentStatus=Refunded, so
      // excluding that status makes the whole booking vanish from finance.
      if (!normalized || !normalized.id || localBookingIds[normalized.id.toLowerCase()] || !['successful', 'success', 'paid', 'refunded'].includes(status)) return;
      rows.push({
        id: 'PAY-' + normalized.id, booking: normalized.id, customer: normalized.customer,
        provider: normalized.provider, amount: Number(normalized.customerTotal || normalized.amount) || 0,
        serviceFee: Number(normalized.serviceFee) || 0, taxAmount: Number(normalized.taxAmount) || 0,
        platformFeeAmount: Number(normalized.platformFeeAmount) || 0, customerTotal: Number(normalized.customerTotal || normalized.amount) || 0,
        category: normalized.category, serviceType: normalized.serviceType, service: normalized.service,
        refundAmount: normalized.refundAmount, refundServiceFee: normalized.refundServiceFee,
        refundPlatformFee: normalized.refundPlatformFee, refundTax: normalized.refundTax,
        taxRefundAmount: normalized.taxRefundAmount, refundStatus: normalized.refundStatus,
        cancellationPolicy: normalized.cancellationPolicy, cancellationActor: normalized.cancellationActor,
        providerCommissionAmount: normalized.providerCommissionAmount,
        providerPayout: normalized.providerPayout, providerPayoutAmount: normalized.providerPayoutAmount,
        platformRevenue: normalized.platformRevenue, platformRevenueAmount: normalized.platformRevenueAmount,
        customerPlatformFeeAmount: normalized.customerPlatformFeeAmount,
        date: normalized.date, status: normalized.status
      });
    });
    return dedupeRows(rows, function (row) { return row.id + "|" + row.booking; });
  }

  function collectProviderTransactions() {
    const rows = [];
    storageKeys(providerPrefix).forEach(function (key) {
      const data = readJson(key, {}) || {};
      (Array.isArray(data.transactions) ? data.transactions : []).forEach(function (transaction) {
        rows.push({ id: display(transaction.id), booking: display(transaction.bookingRef || transaction.bookingReference), amount: Number(transaction.amount) || 0, status: display(transaction.status), date: display(transaction.receivedDate || transaction.paymentDate || transaction.date, "-"), provider: display(transaction.provider || transaction.providerName), providerId: display(transaction.providerId), category: display(transaction.category || transaction.serviceCategory), serviceType: display(transaction.serviceType || transaction.service), service: display(transaction.service), serviceId: display(transaction.serviceId) });
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
      category: display(booking.category || booking.serviceCategory),
      serviceType: display(booking.serviceType || booking.service),
      serviceId: display(booking.serviceId),
      taxAmount: Number(booking.taxAmount) || 0,
      platformFeeAmount: Number(booking.platformFeeAmount) || 0,
      cancelledAt: display(booking.cancelledAt, ""), cancellationActor: display(booking.cancellationActor, ""),
      cancellationPolicy: display(booking.cancellationPolicy, ""), refundAmount: Number(booking.refundAmount) || 0,
      refundServiceFee: Number(booking.refundServiceFee) || 0, refundPlatformFee: Number(booking.refundPlatformFee) || 0,
      refundTax: Number(booking.refundTax) || 0, taxRefundAmount: Number(booking.taxRefundAmount) || 0,
      refundStatus: display(booking.refundStatus, ""), providerCommissionAmount: Number(booking.providerCommissionAmount) || 0,
      providerPayout: Number(booking.providerPayout != null ? booking.providerPayout : booking.providerPayoutAmount) || 0,
      providerPayoutAmount: Number(booking.providerPayoutAmount != null ? booking.providerPayoutAmount : booking.providerPayout) || 0,
      platformRevenue: Number(booking.platformRevenue != null ? booking.platformRevenue : booking.platformRevenueAmount) || 0,
      platformRevenueAmount: Number(booking.platformRevenueAmount != null ? booking.platformRevenueAmount : booking.platformRevenue) || 0,
      customerPlatformFeeAmount: Number(booking.customerPlatformFeeAmount != null ? booking.customerPlatformFeeAmount : booking.platformFeeAmount) || 0,
      service: display(booking.service || booking.serviceType || booking.category),
      amount: Number(booking.amount) || 0,
      serviceFee: Number(booking.serviceFee) || 0,
      customerTotal: Number(booking.customerTotal || booking.totalAmount) || 0,
      bookingStatus: display(booking.status),
      hasStoredCancellationOutcome: Boolean(booking.cancellationPolicy) &&
        booking.refundAmount != null && booking.providerCommissionAmount != null &&
        (booking.providerPayoutAmount != null || booking.providerPayout != null) &&
        (booking.platformRevenueAmount != null || booking.platformRevenue != null),
      statusUpdatedAt: display(booking.statusUpdatedAt || booking.cancelledAt),
      stateVersion: Number(booking.stateVersion) || 0,
      appointmentDate: display(booking.serviceDate || booking.date),
      appointmentTime: display(booking.serviceTime || booking.time),
      date: display(booking.paymentDate || booking.paidAt || booking.serviceDate || booking.date),
      status: display(booking.paymentStatus || booking.payment || booking.paymentState, "Pending")
    };
  }

  function collectBookings() {
    const rows = [];
    (Array.isArray(window.__serveEaseCanonicalBookings) ? window.__serveEaseCanonicalBookings : []).forEach(function (booking) {
      const normalized = normalizeBooking(booking, {});
      if (normalized) rows.push(normalized);
    });
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
    return dedupeBookingRows(rows);
  }

  function dedupeBookingRows(rows) {
    const byId = {};
    rows.forEach(function (row) {
      const key = String(row.id || "").toLowerCase();
      if (!key) return;
      const current = byId[key];
      if (!current) { byId[key] = row; return; }
      const currentCancelled = String(current.bookingStatus || "").toLowerCase() === "cancelled";
      const nextCancelled = String(row.bookingStatus || "").toLowerCase() === "cancelled";
      const currentTime = Date.parse(current.statusUpdatedAt || "") || 0;
      const nextTime = Date.parse(row.statusUpdatedAt || "") || 0;
      if (row.stateVersion > current.stateVersion || nextTime > currentTime || (nextCancelled && !currentCancelled)) byId[key] = row;
    });
    return Object.keys(byId).map(function (key) { return byId[key]; });
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
      const booking = bookingMap[String(payment.booking || "").toLowerCase()];
      const isCancelled = String(booking && (booking.bookingStatus || booking.status) || "").toLowerCase() === "cancelled";
      const hasStoredCancellationOutcome = Boolean(payment.cancellationPolicy) || Number(payment.refundAmount) > 0 || status === "refunded";
      return ["successful", "success", "paid"].includes(status) || isCancelled || hasStoredCancellationOutcome;
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

      const isBookingCompleted = String(booking.bookingStatus || booking.status || "").toLowerCase() === "completed";
      const isBookingRejected = String(booking.bookingStatus || booking.status || "").toLowerCase() === "rejected";
      // Commission is part of platform revenue when the payment is accepted,
      // but provider earnings are payable only after completion.  Keeping
      // those concepts separate prevents pending bookings from changing
      // provider earnings while still reporting the platform's full revenue.
      const baseBreakdown = isBookingCompleted ? breakdown : Object.assign({}, breakdown, {
        providerCommissionAmount: 0,
        providerPayout: 0,
        platformRevenue: isBookingRejected ? 0 : breakdown.platformFeeAmount + breakdown.providerCommissionAmount
      });
      // Lifecycle is authoritative. A stale provider transaction must not
      // turn an accepted booking into Paid or hide its pending payout.
      const resolvedPayoutStatus = isBookingCompleted
        ? "Paid"
        : (isBookingRejected ? "Not Paid" : "Pending");

      const actualCustomerTotal = Number(payment.customerTotal) || Number(booking.customerTotal) || breakdown.customerTotal;
      const row = {
        id: payment.id,
        booking: payment.booking,
        customer: booking && ["N/A", "Customer"].indexOf(booking.customer) === -1 ? booking.customer : (["N/A", "Customer"].indexOf(payment.customer) === -1 ? payment.customer : "Customer"),
        provider: provider,
        serviceFee: breakdown.serviceFee,
        taxAmount: breakdown.taxAmount,
        platformFeeAmount: breakdown.platformFeeAmount,
        // Payment records are the source for the amount actually collected.  Do
        // not rebuild this from current rates after a cancellation.
        customerTotal: actualCustomerTotal,
        gross: actualCustomerTotal,
        commission: baseBreakdown.providerCommissionAmount,
        providerCommission: baseBreakdown.providerCommissionAmount,
        earnings: baseBreakdown.providerPayout,
        providerEarnings: baseBreakdown.providerPayout,
        providerPayout: baseBreakdown.providerPayout,
        platformFee: breakdown.platformFeeAmount,
        platformRevenue: baseBreakdown.platformRevenue,
        date: payment.date,
        status: isBookingRejected ? "Refunded" : payment.status,
        payoutStatus: resolvedPayoutStatus,
        payoutDate: payout ? payout.date : (isBookingCompleted ? (payment.date || "-") : "-"),
        // Pending payout is the amount expected to be paid later; it is not
        // provider earnings until the booking becomes payable.
        payoutAmount: isBookingRejected ? 0 : (isBookingCompleted ? baseBreakdown.providerPayout : breakdown.providerPayout)
      };
      if (isBookingRejected) {
        // A rejected booking with a captured payment is a refund-only record.
        row.refundAmount = actualCustomerTotal;
        row.refundStatus = "Refunded";
        row.refundServiceFee = breakdown.serviceFee;
        row.refundPlatformFee = breakdown.platformFeeAmount;
        row.refundTax = breakdown.taxAmount;
        row.taxRefundAmount = breakdown.taxAmount;
        row.cancellationPolicy = "PROVIDER_REJECT_FULL_REFUND";
        row.providerCommission = 0;
        row.commission = 0;
        row.providerEarnings = 0;
        row.earnings = 0;
        row.providerPayout = 0;
        row.platformRevenue = 0;
        row.payoutAmount = 0;
        row.payoutStatus = "Not Paid";
      }
      let cancellationOutcome = null;
      const bookingIsCancelled = String(booking.bookingStatus || booking.status || "").toLowerCase() === "cancelled";
      const cancellationRecord = booking.cancellationPolicy ? booking : payment;
      const hasStoredCancellationOutcome = Boolean(cancellationRecord.hasStoredCancellationOutcome);
      const hasCancellationPolicy = Boolean(cancellationRecord.cancellationPolicy);
      if ((bookingIsCancelled || hasCancellationPolicy) && financeEngine && typeof financeEngine.calculateCancellationOutcome === "function") {
        let storedOutcome = hasStoredCancellationOutcome
          ? {
              policyCode: cancellationRecord.cancellationPolicy,
              cancellationActor: cancellationRecord.cancellationActor || booking.cancellationActor || "Customer",
              refundAmount: Number(cancellationRecord.refundAmount) || 0,
              refundServiceFee: Number(cancellationRecord.refundServiceFee) || 0,
              refundPlatformFee: Number(cancellationRecord.refundPlatformFee) || 0,
              refundTax: Number(cancellationRecord.refundTax || cancellationRecord.taxRefundAmount) || 0,
              taxRefundAmount: Number(cancellationRecord.taxRefundAmount || cancellationRecord.refundTax) || 0,
              providerCommissionAmount: Number(cancellationRecord.providerCommissionAmount) || 0,
              providerPayoutAmount: Number(cancellationRecord.providerPayoutAmount != null ? cancellationRecord.providerPayoutAmount : cancellationRecord.providerPayout) || 0,
              platformRevenueAmount: Number(cancellationRecord.platformRevenueAmount != null ? cancellationRecord.platformRevenueAmount : cancellationRecord.platformRevenue) || 0,
              customerPlatformFeeAmount: Number(cancellationRecord.customerPlatformFeeAmount != null ? cancellationRecord.customerPlatformFeeAmount : cancellationRecord.platformFeeAmount) || 0,
              refundStatus: cancellationRecord.refundStatus || "Unknown"
            } : null;
        // These policies never retain a provider payout or platform revenue.
        // Some older projections retained their pre-cancellation values, so
        // they must not be allowed to affect finance totals.
        if (storedOutcome && ["PROVIDER_CANCEL_FULL_REFUND", "CUSTOMER_CANCEL_GT_24H"].indexOf(storedOutcome.policyCode) !== -1) {
          storedOutcome.providerCommissionAmount = 0;
          storedOutcome.providerPayoutAmount = 0;
          storedOutcome.platformRevenueAmount = 0;
        }
        // Recalculate from the booking's immutable charge and appointment
        // time.  Stored projections from older localStorage versions may have
        // zero/old values and must not override the policy result.
        cancellationOutcome = financeEngine.calculateCancellationOutcome({
          serviceFee: serviceFee,
          customerTotal: booking.customerTotal || payment.customerTotal || breakdown.customerTotal,
          taxAmount: booking.taxAmount || payment.taxAmount || breakdown.taxAmount,
          platformFeeAmount: booking.platformFeeAmount || payment.platformFeeAmount || breakdown.platformFeeAmount,
          providerCommissionRate: config.providerCommissionRate,
          cancellationActor: booking.cancellationActor || payment.cancellationActor || "Customer",
          appointmentAt: booking.appointmentDate || booking.date,
          appointmentTime: booking.appointmentTime || booking.time,
          cancelledAt: booking.cancelledAt
        });
        row.providerCommission = cancellationOutcome.providerCommissionAmount;
        row.commission = cancellationOutcome.providerCommissionAmount;
        row.providerEarnings = cancellationOutcome.providerPayoutAmount;
        row.earnings = cancellationOutcome.providerPayoutAmount;
        row.providerPayout = cancellationOutcome.providerPayoutAmount;
        row.platformRevenue = cancellationOutcome.platformRevenueAmount;
        row.payoutAmount = cancellationOutcome.providerPayoutAmount;
        row.payoutStatus = cancellationOutcome.providerPayoutAmount > 0
          ? (cancellationOutcome.policyCode === "CUSTOMER_CANCEL_24H_TO_3H" ? "Partially Paid" : "Paid")
          : "Not Paid";
        row.refundAmount = cancellationOutcome.refundAmount;
        row.refundStatus = cancellationOutcome.refundStatus;
        row.taxRefundAmount = cancellationOutcome.taxRefundAmount;
        row.cancellationPolicy = cancellationOutcome.policyCode;
      }
      row.providerId = providerId || display((payout && payout.providerId) || payment.providerId);
      row.category = display(booking && (booking.category || booking.serviceCategory) || payment.category || (payout && (payout.category || payout.serviceCategory)));
      row.serviceType = display(booking && booking.serviceType || payment.serviceType || (payout && payout.serviceType));
      row.service = display(booking && booking.service || payment.service || (payout && payout.service));
      row.serviceId = display(booking && booking.serviceId || payment.serviceId || (payout && payout.serviceId));

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

  function summarizeFinancials(payments, financialRows, refunds) {
    function outcomeScore(row) {
      if (!row) return 0;
      const status = String(row.status || "").toLowerCase();
      return (row.cancellationPolicy ? 4 : 0) +
        (status === "refunded" ? 2 : 0) +
        (Number(row.customerTotal || row.amount || row.gross) > 0 ? 1 : 0);
    }
    const rowsByBooking = {};
    (financialRows || []).forEach(function (row) {
      const key = String(row.booking || row.id || "").toLowerCase();
      if (!key || !rowsByBooking[key] || outcomeScore(row) > outcomeScore(rowsByBooking[key])) rowsByBooking[key] = row;
    });
    const canonicalRows = Object.keys(rowsByBooking).map(function (key) { return rowsByBooking[key]; });
    const paymentByBooking = {};
    (payments || []).filter(function (payment) {
      const status = String(payment.status || "").toLowerCase();
      return ["successful", "success", "paid", "refunded"].indexOf(status) !== -1 ||
        Boolean(payment.cancellationPolicy) || Number(payment.refundAmount) > 0;
    }).forEach(function (payment) {
      const key = String(payment.booking || payment.id || "").toLowerCase();
      if (key && (!paymentByBooking[key] || outcomeScore(payment) > outcomeScore(paymentByBooking[key]))) paymentByBooking[key] = payment;
    });
    const canonicalPayments = Object.keys(paymentByBooking).map(function (key) { return paymentByBooking[key]; });
    // Reconciled rows are the authoritative booking ledger. This keeps the
    // summary working even when the finance/admin browser has no customer's
    // localStorage payment module.
    const gross = canonicalRows.reduce(function (sum, row) {
      return sum + (Number(row.customerTotal) || Number(row.amount) || 0);
    }, 0) || canonicalPayments.reduce(function (sum, payment) {
      return sum + (Number(payment.customerTotal) || Number(payment.amount) || 0);
    }, 0);
    // Refunds must come from the same reconciled rows as collections. This
    // excludes orphaned localStorage refund entries and prevents duplicate
    // copies of one booking from driving net collections below zero.
    const refundsTotal = canonicalRows.reduce(function (sum, row) {
      return sum + (Number(row.refundAmount) || 0);
    }, 0);
    const netCollections = Math.max(0, gross - refundsTotal);
    const providerEarnings = canonicalRows.reduce(function (sum, row) { return sum + (Number(row.providerPayout) || Number(row.earnings) || 0); }, 0);
    const platformRevenue = canonicalRows.reduce(function (sum, row) { return sum + (Number(row.platformRevenue) || Number(row.commission) || 0); }, 0);
    const pendingPayout = canonicalRows.filter(function (row) {
      return String(row.payoutStatus || "").toLowerCase() === "pending" &&
        String(row.status || "").toLowerCase() !== "refunded";
    }).reduce(function (sum, row) {
      const payout = Number(row.payoutAmount != null ? row.payoutAmount : row.providerPayout);
      return sum + (Number.isFinite(payout) ? payout : 0);
    }, 0);
    return {
      grossCustomerPayments: gross,
      netCustomerCollections: netCollections,
      providerEarnings: providerEarnings,
      platformRevenue: platformRevenue,
      pendingPayout: pendingPayout,
      refundTotal: refundsTotal
    };
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
    getProviderEarningsRows: getProviderEarningsRows,
    summarizeFinancials: summarizeFinancials
  };
})();
