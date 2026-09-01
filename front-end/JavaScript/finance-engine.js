(function () {
  "use strict";

  const FINANCE_CONFIG_KEY = "serveEaseFinanceConfig";

  const DEFAULT_FINANCE_CONFIG = {
    customerTaxRate: 10,
    customerPlatformFeeRate: 5,
    providerCommissionRate: 10
  };

  const CANCELLATION_POLICY = {
    providerCancellation: {
      code: "PROVIDER_CANCEL_FULL_REFUND",
      label: "Provider cancels: Full refund of amount paid"
    },
    customerCancellation: {
      over24Hours: { code: "CUSTOMER_CANCEL_GT_24H", label: "100% Service Fee Refund", refundRate: 1 },
      from24To3Hours: { code: "CUSTOMER_CANCEL_24H_TO_3H", label: "70% Service Fee Refund", refundRate: 0.70 },
      under3Hours: { code: "CUSTOMER_CANCEL_LT_3H", label: "No Service Fee Refund", refundRate: 0 }
    }
  };

  function roundCurrency(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function getFinanceConfig() {
    try {
      const raw = localStorage.getItem(FINANCE_CONFIG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          Number.isFinite(Number(parsed.customerTaxRate)) &&
          Number.isFinite(Number(parsed.customerPlatformFeeRate)) &&
          Number.isFinite(Number(parsed.providerCommissionRate))
        ) {
          return {
            customerTaxRate: Number(parsed.customerTaxRate),
            customerPlatformFeeRate: Number(parsed.customerPlatformFeeRate),
            providerCommissionRate: Number(parsed.providerCommissionRate)
          };
        }
        if (parsed && Number.isFinite(Number(parsed.commissionRate))) {
          const config = {
            customerTaxRate: 10,
            customerPlatformFeeRate: 5,
            providerCommissionRate: Number(parsed.commissionRate)
          };
          localStorage.setItem(FINANCE_CONFIG_KEY, JSON.stringify(config));
          return config;
        }
      }
    } catch (e) {
      /* ignore storage error */
    }
    try {
      localStorage.setItem(FINANCE_CONFIG_KEY, JSON.stringify(DEFAULT_FINANCE_CONFIG));
    } catch (e) {
      /* ignore */
    }
    return { ...DEFAULT_FINANCE_CONFIG };
  }

  function setFinanceConfig(config) {
    const current = getFinanceConfig();
    const next = {
      customerTaxRate: Number.isFinite(Number(config && config.customerTaxRate))
        ? Number(config.customerTaxRate)
        : current.customerTaxRate,
      customerPlatformFeeRate: Number.isFinite(Number(config && config.customerPlatformFeeRate))
        ? Number(config.customerPlatformFeeRate)
        : current.customerPlatformFeeRate,
      providerCommissionRate: Number.isFinite(Number(config && config.providerCommissionRate))
        ? Number(config.providerCommissionRate)
        : current.providerCommissionRate
    };
    try {
      localStorage.setItem(FINANCE_CONFIG_KEY, JSON.stringify(next));
    } catch (e) {
      /* ignore */
    }
    return next;
  }

  function calculateBreakdown(serviceFee, customConfig) {
    const s = Math.max(0, Number(serviceFee) || 0);
    const config = customConfig || getFinanceConfig();

    const taxRate = Number(config.customerTaxRate) || 10;
    const platformFeeRate = Number(config.customerPlatformFeeRate) || 5;
    const providerCommissionRate = Number(config.providerCommissionRate) || 10;

    const taxAmount = roundCurrency(s * (taxRate / 100));
    const platformFeeAmount = roundCurrency(s * (platformFeeRate / 100));
    const customerTotal = roundCurrency(s + taxAmount + platformFeeAmount);

    const providerCommissionAmount = roundCurrency(s * (providerCommissionRate / 100));
    const providerPayout = roundCurrency(s - providerCommissionAmount);

    const platformRevenue = roundCurrency(platformFeeAmount + providerCommissionAmount);

    return {
      serviceFee: s,
      taxRate: taxRate,
      taxAmount: taxAmount,
      platformFeeRate: platformFeeRate,
      platformFeeAmount: platformFeeAmount,
      customerTotal: customerTotal,
      providerCommissionRate: providerCommissionRate,
      providerCommissionAmount: providerCommissionAmount,
      providerPayout: providerPayout,
      platformRevenue: platformRevenue
    };
  }

  function normalizeFinancialRecord(record, customConfig) {
    if (!record || typeof record !== "object") return null;

    const config = customConfig || getFinanceConfig();
    let serviceFee = 0;

    if (Number.isFinite(Number(record.serviceFee)) && Number(record.serviceFee) > 0) {
      serviceFee = Number(record.serviceFee);
    } else if (Number.isFinite(Number(record.amount)) && Number(record.amount) > 0) {
      const rawAmount = Number(record.amount);
      // If legacy amount had fixed 50 + 40 = 90
      if (rawAmount > 90 && (rawAmount - 90) % 10 === 9) {
        serviceFee = rawAmount - 90;
      } else {
        // Assume rawAmount is customerTotal = 1.15 * S or serviceFee
        serviceFee = roundCurrency(rawAmount / (1 + (config.customerTaxRate + config.customerPlatformFeeRate) / 100));
        if (serviceFee <= 0) serviceFee = rawAmount;
      }
    } else if (Number.isFinite(Number(record.gross)) && Number(record.gross) > 0) {
      const rawGross = Number(record.gross);
      serviceFee = roundCurrency(rawGross / (1 + (config.customerTaxRate + config.customerPlatformFeeRate) / 100));
      if (serviceFee <= 0) serviceFee = rawGross;
    }

    const breakdown = calculateBreakdown(serviceFee, config);

    return {
      ...record,
      serviceFee: roundCurrency(breakdown.serviceFee),
      taxRate: record.taxRate != null ? Number(record.taxRate) : breakdown.taxRate,
      taxAmount: roundCurrency(record.taxAmount != null ? Number(record.taxAmount) : breakdown.taxAmount),
      platformFeeRate: record.platformFeeRate != null ? Number(record.platformFeeRate) : breakdown.platformFeeRate,
      platformFeeAmount: roundCurrency(record.platformFeeAmount != null ? Number(record.platformFeeAmount) : breakdown.platformFeeAmount),
      customerTotal: roundCurrency(record.customerTotal != null ? Number(record.customerTotal) : breakdown.customerTotal),
      providerCommissionRate: record.providerCommissionRate != null ? Number(record.providerCommissionRate) : breakdown.providerCommissionRate,
      providerCommissionAmount: roundCurrency(record.providerCommissionAmount != null ? Number(record.providerCommissionAmount) : breakdown.providerCommissionAmount),
      providerPayout: roundCurrency(record.providerPayout != null ? Number(record.providerPayout) : breakdown.providerPayout),
      platformRevenue: roundCurrency(breakdown.platformRevenue)
    };
  }

  function parseAppointmentAt(value, time) {
    if (value instanceof Date) return new Date(value.getTime());
    const text = String(value || "").trim();
    let date = null;
    let match = text.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (match) date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!date) {
      match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (match) date = new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    }
    if (!date) {
      const parsed = new Date(text);
      if (!Number.isNaN(parsed.getTime())) date = new Date(parsed.getTime());
    }
    if (!date || Number.isNaN(date.getTime())) return null;
    const timeMatch = String(time || "").match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if (!timeMatch) return date;
    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = String(timeMatch[3] || "").toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) return null;
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  function calculateCancellationOutcome(input) {
    const data = input || {};
    const serviceFee = roundCurrency(Math.max(0, Number(data.serviceFee) || 0));
    const customerTotal = roundCurrency(Math.max(0, Number(data.customerTotal) || serviceFee));
    const taxAmount = roundCurrency(Math.max(0, Number(data.taxAmount) || 0));
    const platformFeeAmount = roundCurrency(Math.max(0, Number(data.platformFeeAmount) || 0));
    const actor = String(data.cancellationActor || "customer").trim().toLowerCase() === "provider" ? "Provider" : "Customer";
    const cancelledAt = data.cancelledAt ? new Date(data.cancelledAt) : new Date();
    const appointmentAt = parseAppointmentAt(data.appointmentAt || data.date, data.appointmentTime || data.time);
    let policy;
    let refundRate = 0;
    let retainedServiceFee = serviceFee;
    if (actor === "Provider") {
      policy = CANCELLATION_POLICY.providerCancellation;
      refundRate = 1;
      retainedServiceFee = 0;
    } else if (!appointmentAt || Number.isNaN(cancelledAt.getTime())) {
      policy = { code: "LEGACY_CANCELLATION_UNKNOWN", label: "Cancellation policy unavailable" };
      retainedServiceFee = serviceFee;
    } else {
      const hoursBefore = (appointmentAt.getTime() - cancelledAt.getTime()) / 3600000;
      if (hoursBefore > 24) {
        policy = CANCELLATION_POLICY.customerCancellation.over24Hours;
        refundRate = policy.refundRate;
        retainedServiceFee = 0;
      } else if (hoursBefore >= 3) {
        policy = CANCELLATION_POLICY.customerCancellation.from24To3Hours;
        refundRate = policy.refundRate;
        retainedServiceFee = roundCurrency(serviceFee * 0.30);
      } else {
        policy = CANCELLATION_POLICY.customerCancellation.under3Hours;
        refundRate = policy.refundRate;
      }
    }
    const refundAmount = actor === "Provider"
      ? customerTotal
      : roundCurrency(serviceFee * refundRate);
    const refundServiceFee = actor === "Provider" ? serviceFee : refundAmount;
    const refundPlatformFee = actor === "Provider" ? platformFeeAmount : 0;
    const refundTax = actor === "Provider" ? taxAmount : 0;
    const retainedPlatformFee = actor === "Provider" || policy.code === "CUSTOMER_CANCEL_GT_24H" ? 0 : platformFeeAmount;
    const commissionRate = Number(data.providerCommissionRate) || getFinanceConfig().providerCommissionRate;
    const providerCommissionAmount = roundCurrency(retainedServiceFee * commissionRate / 100);
    const providerPayoutAmount = roundCurrency(retainedServiceFee - providerCommissionAmount);
    const platformRevenueAmount = actor === "Provider" || policy.code === "CUSTOMER_CANCEL_GT_24H"
      ? 0 : roundCurrency(retainedPlatformFee + providerCommissionAmount);
    return {
      policyCode: policy.code,
      policyLabel: policy.label,
      cancellationActor: actor,
      refundAmount: refundAmount,
      refundServiceFee: refundServiceFee,
      refundPlatformFee: refundPlatformFee,
      refundTax: refundTax,
      retainedServiceFee: retainedServiceFee,
      customerPlatformFeeTreatment: retainedPlatformFee,
      taxTreatment: actor === "Provider" ? "Refunded with customer total" : "Recorded separately; excluded from platform revenue",
      taxRefundAmount: actor === "Provider" ? taxAmount : 0,
      providerCommissionAmount: providerCommissionAmount,
      providerPayoutAmount: providerPayoutAmount,
      platformRevenueAmount: platformRevenueAmount,
      refundStatus: refundAmount > 0 ? "Refunded" : "No Refund Due"
    };
  }

  function getCancellationPolicySummary() {
    return [
      "Provider cancellation: Full refund of amount paid.",
      "Customer cancellation:",
      "More than 24 hours: " + CANCELLATION_POLICY.customerCancellation.over24Hours.label,
      "24 hours to 3 hours: " + CANCELLATION_POLICY.customerCancellation.from24To3Hours.label,
      "Less than 3 hours: " + CANCELLATION_POLICY.customerCancellation.under3Hours.label
    ];
  }

  function formatCurrency(amount) {
    const num = Number(amount) || 0;
    if (Number.isInteger(num)) {
      return "₹" + num.toLocaleString("en-IN");
    }
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatPreciseCurrency(amount) {
    const num = Number(amount) || 0;
    return "₹" + num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  window.ServeEaseFinance = {
    DEFAULT_CONFIG: DEFAULT_FINANCE_CONFIG,
    roundCurrency: roundCurrency,
    getConfig: getFinanceConfig,
    setConfig: setFinanceConfig,
    calculateBreakdown: calculateBreakdown,
    normalizeFinancialRecord: normalizeFinancialRecord,
    CANCELLATION_POLICY: CANCELLATION_POLICY,
    calculateCancellationOutcome: calculateCancellationOutcome,
    getCancellationPolicySummary: getCancellationPolicySummary,
    formatCurrency: formatCurrency,
    formatPreciseCurrency: formatPreciseCurrency
  };
})();
