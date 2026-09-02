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

  function normalizeBookingId(value) {
    const source = String(value || '').trim();
    if (/^BOOK-\d{8}-\d{4}-\d{4}$/i.test(source)) return source.toUpperCase();
    const legacy = source.match(/^BK[-_](\d+)$/i) || source.match(/^BOOK[-_](\d+)$/i);
    if (legacy) return 'BOOK-LEGACY-' + String(Number(legacy[1])).padStart(8, '0');
    return source;
  }

  function normalizeCustomerEmail(value) { return String(value || '').trim().toLowerCase(); }

  function normalizeBooking(record) {
    const item = record || {};
    const status = String(item.status || item.bookingStatus || 'Pending').trim();
    return {
      ...item,
      id: normalizeBookingId(item.id || item.bookingRef || item.bookingReference || item.bookingId),
      customerId: String(item.customerId || item.ownerCustomerId || '').trim(),
      customerEmail: normalizeCustomerEmail(item.customerEmail || item.email),
      providerId: String(item.providerId || item.ownerProviderId || '').trim(),
      service: item.service || item.serviceType || '',
      category: item.category || item.serviceCategory || item.service || '',
      status: ['Requested', 'Pending', 'Accepted', 'Completed', 'Cancelled', 'Rejected'].includes(status) ? status : 'Pending',
      paymentStatus: ['Pending', 'Successful', 'Refunded', 'Failed'].includes(String(item.paymentStatus || '')) ? item.paymentStatus : 'Pending'
    };
  }

  function isBookingBlockingAvailability(booking) {
    return ['Requested', 'Pending', 'Accepted'].includes(String(booking && booking.status || ''));
  }

  function upsertBookingList(list, booking) {
    const normalized = normalizeBooking(booking);
    if (!normalized.id) return list;
    const index = list.findIndex(function (item) { return normalizeBookingId(item && (item.id || item.bookingRef)) === normalized.id; });
    if (index === -1) list.unshift(normalized);
    else list[index] = Object.assign({}, list[index], normalized);
    return list;
  }

  window.ServeEaseBooking = {
    normalizeBookingId: normalizeBookingId,
    normalizeBooking: normalizeBooking,
    normalizeCustomerEmail: normalizeCustomerEmail,
    isBookingBlockingAvailability: isBookingBlockingAvailability,
    upsertBookingList: upsertBookingList
  };

  function notificationHash(value) {
    return String(value || '').split('').reduce(function (hash, char) {
      return ((hash << 5) - hash + char.charCodeAt(0)) | 0;
    }, 0).toString(36).replace('-', 'n');
  }

  function normalizeNotifications(records, scope) {
    const seen = {};
    return (Array.isArray(records) ? records : []).map(function (record) {
      const item = record || {};
      const reference = item.eventId || item.referenceId || item.ticketId || item.entityId || item.bookingId || item.paymentId || item.id || '';
      const type = String(item.type || item.eventType || 'notification').trim().toLowerCase();
      const eventId = String(item.eventId || (type + ':' + reference + ':' + (scope || ''))).trim();
      const createdAt = item.createdAt || item.createdAtIso || item.timestamp || item.time || '1970-01-01T00:00:00.000Z';
      const id = String(item.id || 'N-' + notificationHash(eventId));
      const hasReadState = item.read !== undefined || item.isRead !== undefined || item.isNew !== undefined;
      const read = hasReadState ? (item.read === true || item.isRead === true || item.isNew === false) : true;
      return Object.assign({}, item, {
        id: id,
        eventId: eventId,
        type: type,
        message: item.message || item.text || '',
        text: item.text || item.message || '',
        createdAt: createdAt,
        read: read,
        isRead: read,
        isNew: !read
      });
    }).filter(function (item) {
      if (!item.eventId || seen[item.eventId]) return false;
      seen[item.eventId] = true;
      return true;
    });
  }

  window.ServeEaseNotifications = {
    normalize: normalizeNotifications,
    unreadCount: function (records) { return normalizeNotifications(records).filter(function (item) { return !item.read; }).length; }
  };

  function canonicalProfilePhotoReference(value) {
    const reference = String(value || '').trim();
    // Data URLs keep the photo portable when provider state is synchronized
    // between different browser/machine instances.
    if (!reference || reference.length > 4 * 1024 * 1024) return undefined;
    if (/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/]+=*$/i.test(reference)) return reference;
    // Legacy local upload paths are not portable and may point to a deleted
    // file. Do not propagate them back into the catalog.
    if (/^https?:\/\/[^/]+\/uploads\/profiles\/[^?#\s]+$/i.test(reference)) return reference;
    return undefined;
  }

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

    const result = payload ? payload.data : null;
    const method = String(options && options.method || 'GET').toUpperCase();
    if (method !== 'GET' && /\/(bookings|availability)(\/|$)/.test(path)) {
      window.dispatchEvent(new CustomEvent('serveease:business-state-changed', { detail: { path: path, method: method } }));
    }
    return result;
  }

async function upload(path, file, role, userId) {
  const formData = new FormData();
  formData.append("file", file);

  const session = getSession();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      role: role || getRole(),
      "user-id": userId || session.userId || "",
      "user-email": session.email || ""
    },
    body: formData
  });
    const payload = await response.json().catch(function () { return null; });
    if (!response.ok) {
      const message = payload && payload.message ? payload.message : "Upload failed.";
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
    getProviderServices: function (providerId) {
      return request(`/catalog/providers/${encodeURIComponent(providerId)}/services`, {
        method: "GET",
        headers: { role: "provider" }
      });
    },
    createProviderService: function (providerId, service) {
      return request(`/catalog/providers/${encodeURIComponent(providerId)}/services`, {
        method: "POST",
        headers: { role: "provider" },
        body: JSON.stringify(service)
      });
    },
    updateProviderService: function (providerId, serviceId, service) {
      return request(`/catalog/providers/${encodeURIComponent(providerId)}/services/${encodeURIComponent(serviceId)}`, {
        method: "PATCH",
        headers: { role: "provider" },
        body: JSON.stringify(service)
      });
    },
    uploadVerificationDocument: function (file, userId) {
  return upload("/uploads/verification", file, "user", userId);
},
    uploadTicketAttachment: function (file) {
      return upload("/uploads/tickets", file, getRole());
    },
    uploadProviderProfilePhoto: function (file) {
      return upload("/uploads/profiles/photo", file, "provider", arguments[1]);
    },
    syncCatalog: function (catalog) {
      const catalogImages = {
        "home-cleaning": "assets/images/home-cleaning/clean1.jpg",
        "carpentry": "assets/images/carpentry/carpentry1.jpg.jpeg",
        "painting": "assets/images/painting/painting1.jpg.jpeg",
        "salon-at-home": "assets/images/salon-at-home/salon1.jpg",
        "plumbing": "assets/images/plumbing/plumbing1.jpg.jpeg",
        "electrician": "assets/images/electrician/ele1.jpg.jpeg",
        "appliance-repair-installation": "assets/images/appliance-repair/ACrepair.jpg.jpeg",
        "pest-control": "assets/images/pest-control/pest1.jpg.jpeg"
      };
      const catalogProviders = (catalog.providers || []).map(function (provider) {
        const image = String(provider.image || "");
        const catalogImage = image && !/^data:/i.test(image) && image.length <= 300 && !/^\/uploads\/profiles\//i.test(image)
          ? image
          : (catalogImages[provider.category] || catalogImages["home-cleaning"]);

        return {
          id: provider.id,
          name: provider.name,
          category: provider.category,
          subServices: provider.subServices,
          years: provider.years,
          rating: provider.rating,
          reviews: provider.reviews,
          distance: provider.distance,
          startingPrice: provider.startingPrice,
          location: provider.location,
          jobsDone: provider.jobsDone,
          availableToday: provider.availableToday,
          verified: provider.verified,
          cityId: provider.cityId,
          image: catalogImage,
          availabilitySlots: provider.availabilitySlots,
          ownerProviderId: provider.ownerProviderId,
          ownerProviderEmail: provider.ownerProviderEmail,
          accountStatus: provider.accountStatus,
          approvalStatus: provider.approvalStatus,
          verificationStatus: provider.verificationStatus,
          profilePhoto: canonicalProfilePhotoReference(provider.profilePhoto),
          servicePricing: provider.servicePricing,
          services: provider.services
        };
      });

      return request("/catalog/sync", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({
          categories: catalog.categories || [],
          providers: catalogProviders,
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
    getCanonicalBookings: function () {
      return this.getBookings().then(function (items) { return (Array.isArray(items) ? items : []).map(normalizeBooking); });
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
      if (normalize(provider.name).indexOf("cleanpro") !== -1 || normalize(provider.id).indexOf("cleanpro") !== -1) {
        return "cleanpro|" + (provider.category || "") + "|" + (Number(provider.cityId) || 0);
      }
      const registrationId = provider.providerCatalogId || provider.catalogProviderId;
      return [
        normalize(registrationId || baseId(provider) || provider.providerId || provider.ownerProviderId),
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
      if (!existing) {
        bestByKey[key] = { provider: provider, sourcePriority: sourcePriority };
        return;
      }

      const merged = { ...existing.provider };
      Object.keys(provider).forEach(function (field) {
        const value = provider[field];
        if (value !== undefined && value !== null && value !== "") merged[field] = value;
      });
      // Service lists are snapshots, not additive metadata.  Concatenating the
      // backend and local lists can resurrect a service that the provider has
      // just switched off.  The higher-priority local snapshot is authoritative
      // here because provider changes are written to it before catalog sync.
      const preferred = sourcePriority >= existing.sourcePriority ? provider : existing.provider;
      ["subServices", "services"].forEach(function (field) {
        if (Array.isArray(preferred[field])) merged[field] = preferred[field];
      });
      if (existing.provider.servicePricing || provider.servicePricing) merged.servicePricing = Object.assign({}, existing.provider.servicePricing || {}, provider.servicePricing || {});
      merged.id = preferred.id || merged.id;
      merged.name = preferred.name || merged.name;
      bestByKey[key] = { provider: merged, sourcePriority: Math.max(sourcePriority, existing.sourcePriority) };
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
