(function () {
  const API_BASE_URL = "http://localhost:3000/api";
  const responseMetrics = { count: 0, totalMs: 0 };
  const MONTHS = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function dateParts(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return { day: value.getDate(), month: value.getMonth() + 1, year: value.getFullYear() };
    }

    const text = String(value || "").trim();
    if (!text || /^(just now|recently|today|yesterday|\d+\s+(day|days|week|weeks|month|months|year|years)\s+ago)$/i.test(text)) {
      return null;
    }

    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match) return { day: Number(match[3]), month: Number(match[2]), year: Number(match[1]) };

    match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (match) return { day: Number(match[1]), month: Number(match[2]), year: Number(match[3]) };

    match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (match && MONTHS[match[2].toLowerCase()] !== undefined) {
      return { day: Number(match[1]), month: MONTHS[match[2].toLowerCase()] + 1, year: Number(match[3]) };
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      return { day: parsed.getDate(), month: parsed.getMonth() + 1, year: parsed.getFullYear() };
    }

    return null;
  }

  function timePart(value) {
    const text = String(value || "").trim();
    const match = text.match(/(\d{1,2}):(\d{2})(?:\s*([AP]M))?/i);
    if (match) {
      let hours = Number(match[1]);
      const minutes = pad(Number(match[2]));
      const meridiem = (match[3] || "").toUpperCase();
      let suffix = meridiem || (hours >= 12 ? "PM" : "AM");
      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
      if (!meridiem && hours > 12) {
        hours = hours % 12;
      }
      if (hours === 0) hours = 12;
      return pad(hours) + ":" + minutes + " " + suffix;
    }
    const parsed = value instanceof Date ? value : new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      let hours = parsed.getHours();
      const minutes = pad(parsed.getMinutes());
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return pad(hours) + ":" + minutes + " " + suffix;
    }
    return "";
  }

  window.ServeEaseDate = {
    formatDate: function (value) {
      const parts = dateParts(value);
      if (!parts) return value || "";
      return pad(parts.day) + "-" + pad(parts.month) + "-" + parts.year;
    },
    formatDateTime: function (value) {
      const formattedDate = this.formatDate(value);
      const formattedTime = timePart(value);
      return formattedTime ? formattedDate + " " + formattedTime : formattedDate;
    },
    nowDate: function () {
      return this.formatDate(new Date());
    },
    nowDateTime: function () {
      return this.formatDateTime(new Date());
    },
    todayISO: function () {
      const now = new Date();
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      return `${year}-${month}-${day}`;
    }
  };

  function normalizeRole(role) {
    if (role === "admin" || role === "superuser") return "admin";
    if (role === "support") return "support";
    if (role === "provider") return "provider";
    return "user";
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null") || {};
    } catch (error) {
      return {};
    }
  }

  function getRole() {
    return normalizeRole(getSession().role);
  }

  async function request(path, options) {
    const startedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    let response;
    response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          role: getRole(),
          "user-id": getSession().userId || "",
          "user-email": getSession().email || "",
          ...(options && options.headers ? options.headers : {})
        }
      });
    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : Date.now();
    responseMetrics.count += 1;
    responseMetrics.totalMs += Math.max(0, finishedAt - startedAt);

    const payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      const message = payload && payload.message ? payload.message : "Backend request failed.";
      throw new Error(Array.isArray(message) ? message.join(" ") : message);
    }

    return payload ? payload.data : null;
  }

  window.ServeEaseApi = {
    getResponseMetrics: function () {
      return {
        count: responseMetrics.count,
        totalMs: responseMetrics.totalMs,
        averageMs: responseMetrics.count ? responseMetrics.totalMs / responseMetrics.count : null
      };
    },
    saveState: function (key, value) {
      return request("/state", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({ key: key, value: value })
      });
    },
    getState: function (key) {
      return request(`/state/${encodeURIComponent(key)}`, { method: "GET", headers: { role: "user" } });
    },
    getCatalog: function () {
      return request("/catalog", { method: "GET", headers: { role: "user" } });
    },
    syncCatalog: function (catalog) {
      return request("/catalog/sync", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({
          categories: catalog.categories || [],
          providers: catalog.providers || [],
          popularServices: catalog.popularServices || []
        })
      });
    },
    hydrateCatalog: async function () {
      const catalog = await this.getCatalog();
      if (!catalog || !Array.isArray(catalog.categories) || !catalog.categories.length) {
        return null;
      }

      const current = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
      const providers = mergeLocalProviderCatalog(current.providers || [], catalog.providers || []);
      const next = {
        ...current,
        categories: mergeCatalogCategories(current.categories || [], catalog.categories || []),
        providers: providers,
        popularServices: (current.popularServices && current.popularServices.length)
          ? current.popularServices
          : catalog.popularServices || []
      };
      localStorage.setItem("serveEaseData", JSON.stringify(next));
      this.syncCatalog(next).catch(function () {
        return null;
      });
      return next;
    },
    getBookings: function () {
      return request("/bookings", { method: "GET", headers: { role: "user" } });
    },
    getProviderAvailability: function (providerId) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}`, {
        method: "GET",
        headers: { role: "user" }
      });
    },
    getProviderWeeklySchedule: function (providerId) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`, {
        method: "GET",
        headers: { role: "provider" }
      });
    },
    saveProviderWeeklySchedule: function (providerId, weeklySchedule) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}/weekly-schedule`, {
        method: "PUT",
        headers: { role: "provider" },
        body: JSON.stringify({ weeklySchedule: weeklySchedule })
      });
    },
    getProviderDateOverrides: function (providerId) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides`, {
        method: "GET",
        headers: { role: "provider" }
      });
    },
    saveProviderDateOverride: function (providerId, date, override) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides/${encodeURIComponent(date)}`, {
        method: "PUT",
        headers: { role: "provider" },
        body: JSON.stringify(override)
      });
    },
    deleteProviderDateOverride: function (providerId, date) {
      return request(`/availability/providers/${encodeURIComponent(providerId)}/date-overrides/${encodeURIComponent(date)}`, {
        method: "DELETE",
        headers: { role: "provider" }
      });
    },
    createBooking: function (booking) {
      return request("/bookings", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify(booking)
      });
    },
    updateBooking: function (id, booking) {
      return request(`/bookings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(booking)
      });
    },
    getProviderVerificationRequests: function () {
      return request("/admin/providers/verification", { method: "GET", headers: { role: "admin" } });
    },
    createProviderVerificationRequest: function (provider) {
      return request("/admin/providers/verification", {
        method: "POST",
        headers: { role: "user" },
        body: JSON.stringify(provider)
      });
    },
    updateProviderVerificationRequest: function (providerId, provider) {
      return request(`/admin/providers/verification/${encodeURIComponent(providerId)}`, {
        method: "PATCH",
        headers: { role: "user" },
        body: JSON.stringify(provider)
      });
    },
    getProviderVerificationDetails: function (id) {
      return request(`/admin/providers/${encodeURIComponent(id)}`, { method: "GET", headers: { role: "admin" } });
    },
    approveProviderVerification: function (id, payload) {
      return request(`/admin/providers/${encodeURIComponent(id)}/approve`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    rejectProviderVerification: function (id, payload) {
      return request(`/admin/providers/${encodeURIComponent(id)}/reject`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    suspendProviderVerification: function (id, payload) {
      return request(`/admin/providers/${encodeURIComponent(id)}/suspend`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    getProviderVerificationDocuments: function (id) {
      return request(`/admin/providers/${encodeURIComponent(id)}/documents`, { method: "GET", headers: { role: "admin" } });
    },
    approveProviderDocument: function (id, documentId) {
      return request(`/admin/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/approve`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify({})
      });
    },
    rejectProviderDocument: function (id, documentId, payload) {
      return request(`/admin/providers/${encodeURIComponent(id)}/documents/${encodeURIComponent(documentId)}/reject`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    createTicket: function (payload) {
      return request("/tickets/customer", {
        method: "POST",
        headers: { role: "user" },
        body: JSON.stringify({
          bookingId: payload && (payload.bookingId || payload.relatedBookingId || payload.bookingRef),
          ticketType: payload && (payload.ticketType || payload.category),
          subject: payload && (payload.subject || payload.ticketType || payload.category),
          description: payload && payload.description,
          attachmentUrl: payload && (payload.attachmentUrl || payload.evidenceUrl),
          customerId: payload && payload.customerId,
          customerName: payload && payload.customerName
        })
      });
    },
    getMyTickets: function () {
      return request("/tickets/my-tickets", { method: "GET", headers: { role: "user" } });
    },
    getTicket: function (id) {
      return request(`/tickets/${encodeURIComponent(id)}`, { method: "GET", headers: { role: getRole() } });
    },
    getSupportTickets: function () {
      return request("/support/tickets", { method: "GET", headers: { role: "support" } });
    },
    getSupportTicket: function (id) {
      return request(`/support/tickets/${encodeURIComponent(id)}`, { method: "GET", headers: { role: "support" } });
    },
    updateTicketStatus: function (id, status) {
      return request(`/support/tickets/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { role: "support" },
        body: JSON.stringify({ status: status })
      });
    },
    updateTicketRemarks: function (id, remarks) {
      return request(`/support/tickets/${encodeURIComponent(id)}/remarks`, {
        method: "PATCH",
        headers: { role: "support" },
        body: JSON.stringify({ remarks: remarks })
      });
    },
    resolveTicketBySupport: function (id, remarks) {
      return request(`/support/tickets/${encodeURIComponent(id)}/resolve`, {
        method: "PATCH",
        headers: { role: "support" },
        body: JSON.stringify({ remarks: remarks })
      });
    },
    escalateTicket: function (id, remarks) {
      return request(`/support/tickets/${encodeURIComponent(id)}/escalate`, {
        method: "PATCH",
        headers: { role: "support" },
        body: JSON.stringify({ remarks: remarks })
      });
    },
    updateTicketPriority: function (id, priority) {
      return request(`/support/tickets/${encodeURIComponent(id)}/priority`, {
        method: "PATCH",
        headers: { role: "support" },
        body: JSON.stringify({ priority: priority })
      });
    },
    getEscalatedTickets: function () {
      return request("/admin/escalated-tickets", { method: "GET", headers: { role: "admin" } });
    },
    getAdminTicket: function (id) {
      return request(`/admin/tickets/${encodeURIComponent(id)}`, { method: "GET", headers: { role: "admin" } });
    },
    updateAdminTicketRemarks: function (id, remarks) {
      return request(`/admin/tickets/${encodeURIComponent(id)}/admin-remarks`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify({ remarks: remarks })
      });
    },
    decideTicket: function (id, payload) {
      return request(`/admin/tickets/${encodeURIComponent(id)}/final-decision`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    resolveAdminTicket: function (id, payload) {
      return request(`/admin/tickets/${encodeURIComponent(id)}/resolve`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    rejectAdminTicket: function (id, payload) {
      return request(`/admin/tickets/${encodeURIComponent(id)}/reject`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(payload || {})
      });
    },
    createProviderTicket: function (payload) {
      return request("/tickets/provider", {
        method: "POST",
        headers: { role: "provider" },
        body: JSON.stringify(payload || {})
      });
    },
    getMyProviderTickets: function () {
      return request("/tickets/my-provider-tickets", { method: "GET", headers: { role: "provider" } });
    },
    getActivities: function () {
      return request("/activities", { method: "GET", headers: { role: "admin" } });
    },
    logActivity: function (activity) {
      return request("/activities", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({
          action: activity.action,
          page: activity.page || window.location.pathname.replace("/", "") || "index.html",
          details: activity.details || ""
        })
      }).catch(function () {
        return null;
      });
    }
  };

  function mergeLocalProviderCatalog(localProviders, backendProviders) {
    function normalize(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function isRemovedProvider(provider) {
      return provider && [
        provider.id,
        provider.name,
        provider.fullName,
        provider.organisationName,
        provider.ownerProviderEmail
      ].some(function (value) {
        return normalize(value).indexOf("koushikpestcontrol") !== -1;
      });
    }

    function baseId(provider) {
      if (!provider || !provider.category || !provider.cityId) return String(provider && provider.id || "");
      return String(provider.id || "").replace(new RegExp("-" + provider.category + "-" + provider.cityId + "$"), "");
    }

    function providerKey(provider) {
      if (!provider) return "";
      return [
        normalize(provider.ownerProviderId || baseId(provider)),
        provider.category || "",
        Number(provider.cityId) || 0
      ].join("|");
    }

    function normalizeProvider(provider) {
      if (!provider) return provider;
      if ([provider.id, provider.name, provider.ownerProviderEmail].some(function (value) {
        return normalize(value).indexOf("cleanpro") !== -1;
      })) {
        provider = { ...provider, name: "Cleanpro Services" };
      }
      return provider;
    }

    function providerScore(provider, sourcePriority) {
      const serviceCount = Array.isArray(provider.subServices) ? provider.subServices.length : 0;
      return (provider.ownerProviderId ? 1000 : 0) + (serviceCount * 10) + sourcePriority;
    }

    const bestByKey = {};

    function considerProvider(provider, sourcePriority) {
      if (!provider || !provider.id || isRemovedProvider(provider)) return;
      provider = normalizeProvider(provider);
      const key = providerKey(provider);
      const existing = bestByKey[key];
      if (!existing || providerScore(provider, sourcePriority) > providerScore(existing.provider, existing.sourcePriority)) {
        bestByKey[key] = { provider: provider, sourcePriority: sourcePriority };
      }
    }

    backendProviders.forEach(function (provider) {
      considerProvider(provider, 1);
    });

    localProviders.forEach(function (provider) {
      considerProvider(provider, 2);
    });

    return Object.keys(bestByKey).map(function (key) {
      return bestByKey[key].provider;
    });
  }

  function mergeCatalogCategories(localCategories, backendCategories) {
    const byId = {};

    function addCategory(category) {
      if (!category || !category.id) return;
      const existing = byId[category.id] || {};
      const subServices = [];

      (existing.subServices || []).concat(category.subServices || []).forEach(function (service) {
        if (subServices.indexOf(service) === -1) subServices.push(service);
      });

      byId[category.id] = {
        ...existing,
        ...category,
        subServices: subServices
      };
    }

    backendCategories.forEach(addCategory);
    localCategories.forEach(addCategory);

    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  (function bridgeServeEaseStorage() {
    if (window.__serveEaseStorageBridgeReady) return;
    window.__serveEaseStorageBridgeReady = true;

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    const mirroredKeys = new Set([
      "serveEaseData",
      "serveEaseCustomerModuleData",
      "serveEaseProviderModuleData",
      "serveEaseSupportModuleData",
      "serveEaseSuperuserModuleData",
      "serveEaseSelectedCity",
      "serveEaseCustomCities"
    ]);

    function shouldMirror(key) {
      return mirroredKeys.has(key) ||
        key.indexOf("serveEaseCustomerModuleData:") === 0 ||
        key.indexOf("serveEaseProviderModuleData:") === 0 ||
        key.indexOf("serveEaseSelectedCity:") === 0;
    }

    function parseValue(value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return { raw: String(value) };
      }
    }

    function mirror(key, value, action) {
      if (!shouldMirror(key)) return;
      try {
        Promise.resolve(window.ServeEaseApi.saveState(key, parseValue(value))).catch(function () {
          return null;
        });
        Promise.resolve(window.ServeEaseApi.logActivity({
          action: action || "state_saved",
          page: window.location.pathname.replace("/", "") || "index.html",
          details: key
        })).catch(function () {
          return null;
        });
      } catch (error) {
        return null;
      }
    }

    localStorage.setItem = function (key, value) {
      originalSetItem(key, value);
      mirror(key, value, "state_saved");
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem(key);
      if (shouldMirror(key)) {
        window.ServeEaseApi.logActivity({
          action: "state_removed",
          page: window.location.pathname.replace("/", "") || "index.html",
          details: key
        });
      }
    };
  })();
})();
