(function () {
  "use strict";

  const FINANCE_CONFIG_KEY = "serveEaseFinanceConfig";

  const DEFAULT_FINANCE_CONFIG = {
    customerTaxRate: 10,
    customerPlatformFeeRate: 5,
    providerCommissionRate: 10
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
      serviceFee: breakdown.serviceFee,
      taxRate: record.taxRate != null ? Number(record.taxRate) : breakdown.taxRate,
      taxAmount: record.taxAmount != null ? Number(record.taxAmount) : breakdown.taxAmount,
      platformFeeRate: record.platformFeeRate != null ? Number(record.platformFeeRate) : breakdown.platformFeeRate,
      platformFeeAmount: record.platformFeeAmount != null ? Number(record.platformFeeAmount) : breakdown.platformFeeAmount,
      customerTotal: record.customerTotal != null ? Number(record.customerTotal) : breakdown.customerTotal,
      providerCommissionRate: record.providerCommissionRate != null ? Number(record.providerCommissionRate) : breakdown.providerCommissionRate,
      providerCommissionAmount: record.providerCommissionAmount != null ? Number(record.providerCommissionAmount) : breakdown.providerCommissionAmount,
      providerPayout: record.providerPayout != null ? Number(record.providerPayout) : breakdown.providerPayout,
      platformRevenue: breakdown.platformRevenue
    };
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
    formatCurrency: formatCurrency,
    formatPreciseCurrency: formatPreciseCurrency
  };
})();
