(function () {
  const auth = window.ServeEaseEmployeeAuth;
  if (!auth) {
    window.location.href = "login.html";
    return;
  }

  const session = auth.requireCurrentPageAccess();
  if (!session) return;

  const requiredPermission = auth.permissions && auth.permissions.PROVIDER_OPERATIONS;
  if (!auth.isAdminSession(session) && !auth.hasAnyPermission(session, [requiredPermission])) {
    window.location.href = "employee-access-denied.html?from=provider-operations.html";
    return;
  }

  auth.annotateBody(session);

  const emptyValue = "Not recorded";
  const activeBookingStatuses = ["pending", "accepted", "requested", "upcoming"];

  function byId(id) { return document.getElementById(id); }
  function clean(value) { return String(value === undefined || value === null ? "" : value).trim(); }
  function display(value) { return clean(value) || emptyValue; }
  function normalizeKey(value) { return clean(value).toLowerCase(); }
  function slug(value) { return normalizeKey(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""); }
  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getServeEaseData() {
    const data = readJson("serveEaseData", {});
    if (!Array.isArray(data.users)) data.users = [];
    if (!Array.isArray(data.providers)) data.providers = [];
    if (!Array.isArray(data.providerApprovalRequests)) data.providerApprovalRequests = [];
    return data;
  }

  function saveServeEaseData(data) {
    writeJson("serveEaseData", data);
  }

  function localStorageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function formatDate(value) {
    if (window.ServeEaseDate && typeof window.ServeEaseDate.formatDate === "function") {
      return display(window.ServeEaseDate.formatDate(value));
    }
    return display(value);
  }

  function nowStamp() {
    if (window.ServeEaseDate && typeof window.ServeEaseDate.nowDateTime === "function") return window.ServeEaseDate.nowDateTime();
    return new Date().toLocaleString("en-IN");
  }

  function formatPrice(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) return display(value);
    return "Rs. " + amount.toLocaleString("en-IN");
  }

  function chipClass(value) {
    return slug(value) || "pending";
  }

  function statusChip(value) {
    const label = display(value);
    return '<span class="provider-operations-chip ' + chipClass(label) + '">' + escapeHtml(label) + '</span>';
  }

  function documentProviderId(record) {
    return clean(record.id || record.providerId || record.ownerProviderId || record.userId);
  }

  function isSupportedDocument(record) {
    const type = normalizeKey(record && (record.documentType || record.type || record.label || record.name));
    return ["id proof", "address proof", "skill certificate", "experience proof", "profile photo"].some(function (label) {
      return type === label || type.indexOf(label + " - ") === 0;
    });
  }

  function getStoredProviderDocument(providerId, documentId) {
    if (!providerId || !documentId) return null;
    if (window.ServeEaseAttachments && typeof window.ServeEaseAttachments.getProviderPreview === "function") {
      return window.ServeEaseAttachments.getProviderPreview(providerId, documentId);
    }
    try {
      const previews = JSON.parse(localStorage.getItem("serveEaseProviderDocuments:" + providerId) || "{}");
      return previews[documentId] || null;
    } catch (error) {
      return null;
    }
  }

  function normalizeDocument(record, providerId) {
    const documentId = clean(record.documentId || record.id || record.attachmentId);
    const stored = getStoredProviderDocument(providerId, documentId);
    return {
      documentId: documentId,
      documentType: display(record.documentType || record.type || record.label || record.name),
      documentName: display(record.documentName || record.fileName || record.filename || (stored && stored.name)),
      documentUrl: clean(record.documentUrl || record.url || ""),
      documentStatus: display(record.documentStatus || record.status || "Pending"),
      required: record.required === true,
      uploadedAt: display(record.uploadedAt || (stored && stored.uploadedAt)),
      providerId: providerId,
      storedPreview: stored || null
    };
  }

  function providerDocuments(record) {
    const providerId = documentProviderId(record);
    return (Array.isArray(record.documents) ? record.documents : []).filter(isSupportedDocument).map(function (document) {
      return normalizeDocument(document, providerId);
    });
  }

  function verificationStatus(record) {
    const raw = [record.verificationStatus, record.approvalStatus, record.status, record.accountStatus].map(clean).find(function (value) {
      return value && ["not recorded", "n/a", "na"].indexOf(normalizeKey(value)) === -1;
    }) || "";
    const key = normalizeKey(raw);
    if (!raw && record.verified === true) return "Verified";
    if (!raw && record.verified === false) return "Pending";
    if (["active", "approved", "verified"].indexOf(key) !== -1) return "Verified";
    if (["pending approval", "pending", "under verification"].indexOf(key) !== -1) return "Pending";
    if (key === "rejected" || key === "verification rejected") return "Rejected";
    if (key === "suspended") return "Verified";
    return raw || emptyValue;
  }

  function accountStatus(record) {
    const raw = [record.accountStatus, record.status, record.approvalStatus, record.verificationStatus].map(clean).find(function (value) {
      return value && ["not recorded", "n/a", "na"].indexOf(normalizeKey(value)) === -1;
    }) || "";
    const key = normalizeKey(raw);
    if (["active", "approved", "verified"].indexOf(key) !== -1) return "Active";
    if (key === "suspended") return "Suspended";
    if (key === "rejected" || key === "verification rejected") return "Verification Rejected";
    if (["pending approval", "pending", "under verification"].indexOf(key) !== -1) return "Under Verification";
    if (!raw && record.verified === true) return "Active";
    if (!raw && record.verified === false) return "Under Verification";
    return raw || "Active";
  }

  function statusRank(value) {
    const key = normalizeKey(value);
    if (key === "suspended") return 4;
    if (key === "verification rejected" || key === "rejected") return 3;
    if (key === "active" || key === "approved" || key === "verified") return 2;
    if (key === "under verification" || key === "pending" || key === "pending approval") return 1;
    return 0;
  }

  function canonicalVerificationStatus(account) {
    const key = normalizeKey(account);
    if (["active", "approved", "verified", "suspended"].indexOf(key) !== -1) return "Verified";
    if (["verification rejected", "rejected"].indexOf(key) !== -1) return "Rejected";
    if (["under verification", "pending", "pending approval"].indexOf(key) !== -1) return "Pending";
    return emptyValue;
  }

  function providerIdentity(record) {
    return normalizeKey(record.id || record.providerId || record.ownerProviderId) ||
      normalizeKey(record.email || record.ownerProviderEmail) ||
      normalizeKey(record.organisationName || record.fullName || record.name);
  }

  function normalizeHistory(record) {
    const values = Array.isArray(record.statusHistory) ? record.statusHistory : [];
    return values.map(function (item) {
      return {
        dateTime: display(item.dateTime || item.date || item.createdAt),
        action: display(item.action || item.type || "Status update"),
        previousStatus: display(item.previousStatus || item.from),
        newStatus: display(item.newStatus || item.to || item.status),
        reason: display(item.reason),
        remarks: display(item.remarks || item.note),
        performedBy: display(item.performedBy || item.actor || item.updatedBy)
      };
    });
  }

  function normalizeProvider(record, sourceLabel) {
    const id = display(record.id || record.providerId || record.ownerProviderId || record.providerCatalogId);
    const name = display(record.fullName || record.name || record.providerName || record.organisationName);
    const organisationName = display(record.organisationName || record.providerOrganisation || record.name || record.fullName);
    const email = display(record.email || record.providerEmail || record.ownerProviderEmail);
    const phone = display(record.phone || record.providerPhone || record.contactNumber);
    const category = display(record.serviceType || record.category || record.serviceCategory);
    const experience = display(record.experience || record.yearsOfExperience);
    const location = display(record.cityName || record.location || record.address);
    const registrationDate = display(record.resubmittedDate || record.submittedDate || record.registrationDate || record.createdAt || record.createdDate || record.joinedDate);
    const catalogId = clean(record.providerCatalogId || record.catalogProviderId || record.id);
    const aliases = [id, catalogId, record.ownerProviderId, email, name, organisationName]
      .map(normalizeKey)
      .filter(Boolean);

    return {
      key: providerIdentity(record),
      id: id,
      name: name,
      organisationName: organisationName,
      email: email,
      phone: phone,
      category: category,
      experience: experience,
      location: location,
      registrationDate: registrationDate,
      verificationStatus: verificationStatus(record),
      accountStatus: accountStatus(record),
      rejectionReason: display(record.rejectionReason || record.reason),
      suspensionReason: display(record.suspensionReason),
      adminRemarks: display(record.adminRemarks || record.remarks),
      catalogId: catalogId,
      aliases: aliases,
      documents: providerDocuments(record),
      statusHistory: normalizeHistory(record),
      source: sourceLabel || emptyValue
    };
  }

  function keep(current, next) {
    if (!current || current === emptyValue) return next || emptyValue;
    return current;
  }

  function mergeProvider(target, incoming) {
    target.id = keep(target.id, incoming.id);
    target.name = keep(target.name, incoming.name);
    target.organisationName = keep(target.organisationName, incoming.organisationName);
    target.email = keep(target.email, incoming.email);
    target.phone = keep(target.phone, incoming.phone);
    target.category = keep(target.category, incoming.category);
    target.experience = keep(target.experience, incoming.experience);
    target.location = keep(target.location, incoming.location);
    target.registrationDate = keep(target.registrationDate, incoming.registrationDate);
    target.catalogId = keep(target.catalogId, incoming.catalogId);
    target.rejectionReason = keep(target.rejectionReason, incoming.rejectionReason);
    target.suspensionReason = keep(target.suspensionReason, incoming.suspensionReason);
    target.adminRemarks = keep(target.adminRemarks, incoming.adminRemarks);
    if (target.source !== "Provider approval request" && incoming.accountStatus !== emptyValue && statusRank(incoming.accountStatus) >= statusRank(target.accountStatus)) target.accountStatus = incoming.accountStatus;
    if (target.accountStatus !== emptyValue) target.verificationStatus = canonicalVerificationStatus(target.accountStatus);
    if (!target.documents.length && incoming.documents.length) target.documents = incoming.documents;
    if (incoming.statusHistory.length) target.statusHistory = target.statusHistory.concat(incoming.statusHistory);
    incoming.aliases.forEach(function (alias) {
      if (target.aliases.indexOf(alias) === -1) target.aliases.push(alias);
    });
  }

  function addProvider(map, record, sourceLabel) {
    if (!record) return;
    const provider = normalizeProvider(record, sourceLabel);
    if (!provider.key) return;
    const existingKey = Object.keys(map).find(function (key) {
      return provider.aliases.some(function (alias) {
        return map[key].aliases.indexOf(alias) !== -1;
      });
    }) || provider.key;
    if (map[existingKey]) mergeProvider(map[existingKey], provider);
    else map[existingKey] = provider;
  }

  function collectProviders() {
    const map = {};
    const appData = getServeEaseData();
    appData.providerApprovalRequests.forEach(function (request) { addProvider(map, request, "Provider approval request"); });
    appData.users.forEach(function (user) {
      if (user && user.role === "provider") addProvider(map, user, "Registered provider account");
    });
    appData.providers.forEach(function (provider) {
      addProvider(map, {
        id: provider.ownerProviderId || provider.id,
        providerCatalogId: provider.id,
        name: provider.providerName || provider.name,
        organisationName: provider.organisationName || provider.name,
        email: provider.ownerProviderEmail || provider.email,
        phone: provider.phone,
        category: provider.category,
        experience: provider.experience,
        location: provider.location,
        verified: provider.verified,
        accountStatus: provider.accountStatus || (provider.verified === false ? "Under Verification" : "Active"),
        statusHistory: provider.statusHistory || []
      }, "Service catalog provider");
    });

    const superuserData = readJson("serveEaseSuperuserModuleData", {});
    (Array.isArray(superuserData.providers) ? superuserData.providers : []).forEach(function (provider) {
      addProvider(map, provider, "Superuser provider data");
    });
    localStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const profile = moduleData.profile || {};
      addProvider(map, {
        id: moduleData.ownerProviderId || profile.providerId || profile.id,
        fullName: profile.fullName || moduleData.ownerName,
        organisationName: profile.organisationName,
        email: profile.email || moduleData.ownerEmail,
        phone: profile.phone,
        category: profile.serviceType || profile.category,
        experience: profile.experience,
        location: profile.cityName || profile.location || profile.address,
        registrationDate: profile.registrationDate,
        accountStatus: profile.accountStatus || profile.status,
        approvalStatus: profile.approvalStatus,
        verificationStatus: profile.verificationStatus,
        providerCatalogId: profile.providerCatalogId || profile.providerBaseId,
        documents: profile.documents || moduleData.documents,
        rejectionReason: profile.rejectionReason,
        suspensionReason: profile.suspensionReason,
        adminRemarks: profile.adminRemarks,
        statusHistory: profile.statusHistory || moduleData.statusHistory
      }, "Provider module data");
    });

    return Object.keys(map).map(function (key) { return map[key]; }).sort(function (a, b) {
      return a.organisationName.localeCompare(b.organisationName);
    });
  }

  function providerMatches(provider, value) {
    const key = normalizeKey(value);
    if (!key || key === normalizeKey(emptyValue)) return false;
    return provider.aliases.indexOf(key) !== -1 ||
      normalizeKey(provider.id) === key ||
      normalizeKey(provider.catalogId) === key ||
      normalizeKey(provider.name) === key ||
      normalizeKey(provider.organisationName) === key ||
      normalizeKey(provider.email) === key;
  }

  function normalizeService(record, provider, sourceLabel) {
    return {
      id: display(record.id || record.serviceId || record.name),
      providerId: normalizeKey(record.providerId || record.ownerProviderId || (provider && provider.id)),
      providerName: normalizeKey(record.provider || record.providerName || record.name || (provider && provider.organisationName)),
      catalogProviderId: normalizeKey(record.catalogProviderId || record.providerCatalogId || (provider && provider.catalogId)),
      name: display(record.serviceName || record.name || record.title),
      category: display(record.category || record.serviceType),
      subcategory: display(record.subcategory || record.subService || record.name),
      price: display(record.price || record.startingPrice),
      location: display(record.location || record.cityName || (provider && provider.location)),
      status: display(record.status || (record.verified === false ? "Pending" : "Active")),
      source: sourceLabel
    };
  }

  function collectServices(providers) {
    const services = [];
    const appData = getServeEaseData();
    appData.providers.forEach(function (catalogProvider) {
      const owner = providers.find(function (provider) {
        return providerMatches(provider, catalogProvider.ownerProviderId || catalogProvider.id || catalogProvider.name);
      }) || normalizeProvider(catalogProvider, "Service catalog provider");
      const subServices = Array.isArray(catalogProvider.subServices) && catalogProvider.subServices.length ? catalogProvider.subServices : [catalogProvider.name];
      subServices.forEach(function (name) {
        services.push(normalizeService({
          id: catalogProvider.id + ":" + name,
          name: name,
          category: catalogProvider.category,
          subcategory: name,
          startingPrice: catalogProvider.startingPrice,
          location: catalogProvider.location,
          status: catalogProvider.verified === false ? "Pending" : "Active",
          providerCatalogId: catalogProvider.id,
          ownerProviderId: catalogProvider.ownerProviderId,
          providerName: catalogProvider.name
        }, owner, "Service catalog provider"));
      });
    });

    localStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const profile = normalizeProvider(moduleData.profile || { id: moduleData.ownerProviderId }, "Provider module data");
      (Array.isArray(moduleData.services) ? moduleData.services : []).forEach(function (service) {
        services.push(normalizeService(service, profile, "Provider module service"));
      });
    });

    return dedupeById(services);
  }

  function normalizeBooking(record, provider, sourceLabel) {
    return {
      id: display(record.id || record.bookingRef || record.bookingReference),
      providerId: normalizeKey(record.providerId || record.ownerProviderId || (provider && provider.id)),
      providerName: normalizeKey(record.provider || record.providerName || (provider && provider.organisationName)),
      catalogProviderId: normalizeKey(record.catalogProviderId || record.providerCatalogId || (provider && provider.catalogId)),
      customer: display(record.customer || record.customerName || record.fullName),
      service: display(record.serviceType || record.service || record.category),
      date: display(record.serviceDate || record.date || record.createdDate),
      time: display(record.serviceTime || record.time),
      status: display(record.status),
      paymentStatus: display(record.paymentStatus || record.payment || record.paymentState),
      source: sourceLabel
    };
  }

  function collectBookings(providers) {
    const bookings = [];
    const appData = getServeEaseData();
    appData.bookings = Array.isArray(appData.bookings) ? appData.bookings : [];
    appData.bookings.forEach(function (booking) { bookings.push(normalizeBooking(booking, null, "Application booking data")); });
    const superuserData = readJson("serveEaseSuperuserModuleData", {});
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) {
      bookings.push(normalizeBooking(booking, null, "Superuser booking data"));
    });
    localStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      (Array.isArray(moduleData.bookings) ? moduleData.bookings : []).forEach(function (booking) {
        bookings.push(normalizeBooking(booking, null, "Customer module booking data"));
      });
    });
    localStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const profile = normalizeProvider(moduleData.profile || { id: moduleData.ownerProviderId }, "Provider module data");
      (Array.isArray(moduleData.bookings) ? moduleData.bookings : []).forEach(function (booking) {
        bookings.push(normalizeBooking(booking, profile, "Provider module booking data"));
      });
    });
    return dedupeById(bookings);
  }

  function normalizeTicket(record, provider, sourceLabel) {
    return {
      id: display(record.id || record.ticketId),
      providerId: normalizeKey(record.providerId || record.raisedById || record.ownerProviderId || (provider && provider.id)),
      providerName: normalizeKey(record.provider || record.providerName || record.customer || record.customerName || record.raisedByName || (provider && provider.organisationName)),
      bookingId: display(record.bookingId || record.bookingRef || record.bookingReference || record.relatedBookingId),
      subject: display(record.subject || record.description),
      category: display(record.category || record.issueCategory || record.ticketType),
      status: display(record.status),
      created: display(record.created || record.createdDate || record.date || record.createdOn || record.createdAtIso || record.createdAt),
      source: sourceLabel
    };
  }

  function collectTickets() {
    const tickets = [];
    const superuserData = readJson("serveEaseSuperuserModuleData", {});
    (Array.isArray(superuserData.tickets) ? superuserData.tickets : []).forEach(function (ticket) {
      if (ticket.userType === "Provider" || ticket.raisedByType === "provider") tickets.push(normalizeTicket(ticket, null, "Superuser ticket data"));
    });
    const supportData = readJson("serveEaseSupportModuleData", {});
    (Array.isArray(supportData.tickets) ? supportData.tickets : []).forEach(function (ticket) {
      if (ticket.raisedByType === "provider") tickets.push(normalizeTicket(ticket, null, "Support ticket data"));
    });
    localStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      const profile = normalizeProvider(moduleData.profile || { id: moduleData.ownerProviderId }, "Provider module data");
      (Array.isArray(moduleData.supportTickets) ? moduleData.supportTickets : []).forEach(function (ticket) {
        tickets.push(normalizeTicket(ticket, profile, "Provider module support ticket"));
      });
    });
    return dedupeById(tickets);
  }

  function collectAvailability(providers) {
    const byProvider = {};
    localStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const moduleData = readJson(key, {});
      if (!moduleData || !moduleData.availability) return;
      const profile = normalizeProvider(moduleData.profile || { id: moduleData.ownerProviderId }, "Provider module data");
      const provider = providers.find(function (item) {
        return providerMatches(item, profile.id) || providerMatches(item, profile.email) || providerMatches(item, profile.organisationName);
      });
      if (provider) byProvider[provider.id] = moduleData.availability;
    });
    return byProvider;
  }

  function dedupeById(items) {
    const seen = {};
    return items.filter(function (item) {
      const key = normalizeKey(item.id + "|" + (item.providerId || item.providerName || item.catalogProviderId || ""));
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function getData() {
    const providers = collectProviders();
    return {
      providers: providers,
      services: collectServices(providers),
      bookings: collectBookings(providers),
      tickets: collectTickets(),
      availability: collectAvailability(providers)
    };
  }

  function itemsForProvider(items, provider) {
    return items.filter(function (item) {
      return providerMatches(provider, item.providerId) ||
        providerMatches(provider, item.catalogProviderId) ||
        providerMatches(provider, item.providerName);
    });
  }

  function findProvider(data, value) {
    return data.providers.find(function (provider) {
      return providerMatches(provider, value);
    }) || null;
  }

  function isPendingProvider(provider) {
    return normalizeKey(provider.accountStatus) === "under verification" || normalizeKey(provider.verificationStatus) === "pending";
  }

  function pendingProviders(data) {
    return data.providers.filter(function (provider) {
      if (!isPendingProvider(provider)) return false;
      if (["Service catalog provider", "Superuser provider data", "Pending provider data"].indexOf(provider.source) !== -1) return false;
      return provider.documents.length > 0;
    });
  }

  function statCard(label, value, helper, icon) {
    return [
      '<article class="provider-operations-stat-card">',
      '  <div class="provider-operations-stat-label"><span class="provider-operations-stat-icon" aria-hidden="true">' + icon + '</span><span>' + escapeHtml(label) + '</span></div>',
      '  <strong>' + escapeHtml(value) + '</strong>',
      '  <small>' + escapeHtml(helper) + '</small>',
      '</article>'
    ].join("");
  }

  function renderStats(data) {
    const target = byId("providerOperationsStatsGrid");
    if (!target) return;
    const active = data.providers.filter(function (provider) { return normalizeKey(provider.accountStatus) === "active"; }).length;
    const suspended = data.providers.filter(function (provider) { return normalizeKey(provider.accountStatus) === "suspended"; }).length;
    const pending = pendingProviders(data).length;
    target.innerHTML = [
      statCard("Total Providers", data.providers.length, "All provider records", "&#128188;"),
      statCard("Active Providers", active, "Verified and dashboard-eligible", "&#128994;"),
      statCard("Pending Verification", pending, "Providers awaiting review", "&#128992;"),
      statCard("Suspended Providers", suspended, "Temporarily blocked accounts", "&#9940;"),
      statCard("Total Services", data.services.length, "Linked provider service records", "&#128736;")
    ].join("");
  }

  function renderStatusFilter(providers) {
    const select = byId("providerOperationsStatusFilter");
    if (!select) return;
    const current = select.value || "all";
    const statuses = [];
    providers.forEach(function (provider) {
      if (provider.accountStatus !== emptyValue && statuses.indexOf(provider.accountStatus) === -1) statuses.push(provider.accountStatus);
    });
    select.innerHTML = '<option value="all">All Status</option>' + statuses.sort().map(function (status) {
      return '<option value="' + escapeHtml(status) + '">' + escapeHtml(status) + '</option>';
    }).join("");
    select.value = statuses.indexOf(current) === -1 ? "all" : current;
  }

  function filteredProviders(data) {
    const search = normalizeKey(byId("providerOperationsSearch") && byId("providerOperationsSearch").value);
    const status = byId("providerOperationsStatusFilter") ? byId("providerOperationsStatusFilter").value : "all";
    return data.providers.filter(function (provider) {
      if (status !== "all" && provider.accountStatus !== status) return false;
      const services = itemsForProvider(data.services, provider).map(function (service) { return service.name; }).join(" ");
      const haystack = [
        provider.id,
        provider.name,
        provider.organisationName,
        provider.email,
        provider.phone,
        provider.location,
        provider.category,
        provider.experience,
        provider.accountStatus,
        services
      ].join(" ").toLowerCase();
      return !search || haystack.indexOf(search) !== -1;
    });
  }

  function actionButtons(provider) {
    const id = escapeHtml(provider.id);
    const status = normalizeKey(provider.accountStatus);
    const buttons = [];
    if (status === "active") {
      buttons.push('<button class="provider-operations-inline-action danger" type="button" data-action="suspend" data-provider-id="' + id + '">Suspend</button>');
    } else if (status === "suspended") {
      buttons.push('<button class="provider-operations-inline-action success" type="button" data-action="activate" data-provider-id="' + id + '">Activate</button>');
    }
    buttons.push('<button class="provider-operations-inline-action" type="button" data-action="view" data-provider-id="' + id + '">View</button>');
    return '<div class="provider-operations-actions">' + buttons.join("") + '</div>';
  }

  function renderProviders(data) {
    const rows = byId("providerOperationsRows");
    const count = byId("providerOperationsProviderCount");
    if (!rows) return;
    const providers = filteredProviders(data);
    if (count) count.textContent = String(providers.length);
    if (!providers.length) {
      rows.innerHTML = '<tr><td colspan="11"><div class="provider-operations-empty-state">No providers match the current search or filter.</div></td></tr>';
      return;
    }
    rows.innerHTML = providers.map(function (provider) {
      const serviceCount = itemsForProvider(data.services, provider).length;
      return [
        '<tr>',
        '  <td>' + escapeHtml(provider.id) + '</td>',
        '  <td>' + escapeHtml(provider.name) + '</td>',
        '  <td>' + escapeHtml(provider.organisationName) + '</td>',
        '  <td>' + escapeHtml(provider.email) + '</td>',
        '  <td>' + escapeHtml(provider.phone) + '</td>',
        '  <td>' + escapeHtml(provider.category) + '</td>',
        '  <td>' + escapeHtml(provider.experience) + '</td>',
        '  <td>' + escapeHtml(provider.location) + '</td>',
        '  <td>' + escapeHtml(serviceCount) + '</td>',
        '  <td>' + statusChip(provider.accountStatus) + '</td>',
        '  <td>' + actionButtons(provider) + '</td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function renderPendingDesk(data) {
    const rows = byId("providerOperationsPendingRows");
    const count = byId("providerOperationsPendingCount");
    if (!rows) return;
    const pending = pendingProviders(data);
    if (count) count.textContent = String(pending.length);
    if (!pending.length) {
      rows.innerHTML = '<tr><td colspan="8"><div class="provider-operations-empty-state">No pending verification requests.</div></td></tr>';
      return;
    }
    rows.innerHTML = pending.map(function (provider) {
      const documentCount = provider.documents.length;
      return [
        '<tr>',
        '  <td>' + escapeHtml(provider.id) + '</td>',
        '  <td>' + escapeHtml(provider.name) + '</td>',
        '  <td>' + escapeHtml(provider.email) + '</td>',
        '  <td>' + escapeHtml(provider.category) + '</td>',
        '  <td>' + escapeHtml(provider.location) + '</td>',
        '  <td>' + escapeHtml(formatDate(provider.registrationDate)) + '</td>',
        '  <td><span>' + escapeHtml(documentCount + (documentCount === 1 ? " document" : " documents")) + '</span> <button class="provider-operations-inline-action" type="button" data-action="review" data-provider-id="' + escapeHtml(provider.id) + '">Preview Documents</button></td>',
        '  <td><button class="provider-operations-inline-action warning" type="button" data-action="review" data-provider-id="' + escapeHtml(provider.id) + '">Review</button></td>',
        '</tr>'
      ].join("");
    }).join("");
  }

  function employeeActor() {
    return session.employeeId || session.name || session.email || "Provider Operations";
  }

  function makeHistory(action, previousStatus, newStatus, reason, remarks) {
    return {
      dateTime: nowStamp(),
      action: action,
      previousStatus: previousStatus || emptyValue,
      newStatus: newStatus || emptyValue,
      reason: clean(reason),
      remarks: clean(remarks),
      performedBy: employeeActor()
    };
  }

  function appendHistory(record, entry) {
    if (!record) return;
    if (!Array.isArray(record.statusHistory)) record.statusHistory = [];
    record.statusHistory.unshift(entry);
  }

  function matchesRecord(record, providerId, email) {
    const key = normalizeKey(providerId);
    const mail = normalizeKey(email);
    return normalizeKey(record.id) === key ||
      normalizeKey(record.providerId) === key ||
      normalizeKey(record.ownerProviderId) === key ||
      normalizeKey(record.providerCatalogId) === key ||
      (mail && normalizeKey(record.email || record.ownerProviderEmail) === mail);
  }

  function applyStatus(record, state, reason, remarks, historyEntry) {
    if (!record) return;
    record.approvalStatus = state.approvalStatus;
    record.verificationStatus = state.verificationStatus;
    record.accountStatus = state.accountStatus;
    record.status = state.accountStatus;
    if ("verified" in state) record.verified = state.verified;
    record.adminRemarks = clean(remarks);
    if (state.rejectionReason) record.rejectionReason = clean(reason);
    if (state.suspensionReason) record.suspensionReason = clean(reason);
    appendHistory(record, historyEntry);
  }

  function providerModuleKeysFor(providerId, email) {
    return localStorageKeys("serveEaseProviderModuleData").filter(function (key) {
      const moduleData = readJson(key, {});
      const profile = moduleData.profile || {};
      return matchesRecord({
        id: moduleData.ownerProviderId || profile.providerId || profile.id,
        email: moduleData.ownerEmail || profile.email,
        providerCatalogId: profile.providerCatalogId
      }, providerId, email);
    });
  }

  function updateProviderModules(providerId, email, state, reason, remarks, historyEntry) {
    providerModuleKeysFor(providerId, email).forEach(function (key) {
      const moduleData = readJson(key, {});
      if (!moduleData.profile) moduleData.profile = {};
      moduleData.ownerProviderId = moduleData.ownerProviderId || providerId;
      moduleData.ownerEmail = moduleData.ownerEmail || email;
      applyStatus(moduleData.profile, state, reason, remarks, historyEntry);
      appendHistory(moduleData, historyEntry);
      writeJson(key, moduleData);
    });
  }

  function ensureApprovedUser(data, request, state, historyEntry, remarks) {
    let user = data.users.find(function (item) {
      return item.role === "provider" && matchesRecord(item, request.id, request.email);
    });
    if (!user) {
      user = Object.assign({}, request, { role: "provider" });
      data.users.push(user);
    }
    applyStatus(user, state, "", remarks, historyEntry);
    return user;
  }

  function ensureCatalogProvider(data, request, state, historyEntry) {
    const catalogId = clean(request.providerCatalogId || request.catalogProviderId || slug(request.organisationName || request.fullName || request.name || request.id));
    let provider = data.providers.find(function (item) {
      return matchesRecord(item, request.id, request.email) || normalizeKey(item.id) === normalizeKey(catalogId);
    });
    if (!provider) {
      provider = {
        id: catalogId,
        name: request.organisationName || request.fullName || request.name,
        category: request.serviceType || request.category || request.serviceCategory,
        location: request.cityName || request.location || request.address,
        startingPrice: request.startingPrice || 599,
        rating: request.rating || 4.5,
        ownerProviderId: request.id,
        ownerProviderEmail: request.email,
        subServices: request.subServices || [request.serviceType || request.category || "Provider Service"]
      };
      data.providers.push(provider);
    }
    provider.ownerProviderId = provider.ownerProviderId || request.id;
    provider.ownerProviderEmail = provider.ownerProviderEmail || request.email;
    provider.name = provider.name || request.organisationName || request.fullName || request.name;
    provider.organisationName = provider.organisationName || request.organisationName;
    provider.category = provider.category || request.serviceType || request.category;
    provider.location = provider.location || request.cityName || request.location;
    provider.accountStatus = state.accountStatus;
    provider.verified = state.verified;
    appendHistory(provider, historyEntry);
  }

  function transitionProvider(providerId, nextState, reason, remarks, actionLabel) {
    const data = getServeEaseData();
    const currentData = getData();
    const currentProvider = findProvider(currentData, providerId);
    if (!currentProvider) return { ok: false, message: "Provider record was not found." };
    const previousStatus = currentProvider.accountStatus;
    const historyEntry = makeHistory(actionLabel, previousStatus, nextState.accountStatus, reason, remarks);
    const email = currentProvider.email === emptyValue ? "" : currentProvider.email;

    data.providerApprovalRequests.forEach(function (request) {
      if (matchesRecord(request, providerId, email)) applyStatus(request, nextState, reason, remarks, historyEntry);
    });
    data.users.forEach(function (user) {
      if (user.role === "provider" && matchesRecord(user, providerId, email)) applyStatus(user, nextState, reason, remarks, historyEntry);
    });
    data.providers.forEach(function (provider) {
      if (matchesRecord(provider, providerId, email)) {
        provider.accountStatus = nextState.accountStatus;
        provider.status = nextState.accountStatus;
        provider.verified = nextState.verified;
        if (nextState.suspensionReason) provider.suspensionReason = clean(reason);
        appendHistory(provider, historyEntry);
      }
    });

    if (nextState.approvalStatus === "Active") {
      const request = data.providerApprovalRequests.find(function (item) { return matchesRecord(item, providerId, email); }) || currentProvider;
      ensureApprovedUser(data, request, nextState, historyEntry, remarks);
      ensureCatalogProvider(data, request, nextState, historyEntry);
    }

    updateProviderModules(providerId, email, nextState, reason, remarks, historyEntry);
    saveServeEaseData(data);
    return { ok: true };
  }

  function approveProvider(providerId, remarks) {
    return transitionProvider(providerId, {
      approvalStatus: "Active",
      verificationStatus: "Verified",
      accountStatus: "Active",
      verified: true
    }, "", remarks, "Verification approved");
  }

  function rejectProvider(providerId, reason, remarks) {
    if (!clean(reason)) return { ok: false, message: "Rejection reason is required." };
    return transitionProvider(providerId, {
      approvalStatus: "Rejected",
      verificationStatus: "Rejected",
      accountStatus: "Verification Rejected",
      verified: false,
      rejectionReason: true
    }, reason, remarks, "Verification rejected");
  }

  function suspendProvider(providerId, reason, remarks) {
    if (!clean(reason)) return { ok: false, message: "Suspension reason is required." };
    const provider = findProvider(getData(), providerId);
    if (!provider || normalizeKey(provider.accountStatus) !== "active") return { ok: false, message: "Only active verified providers can be suspended." };
    return transitionProvider(providerId, {
      approvalStatus: "Suspended",
      verificationStatus: "Verified",
      accountStatus: "Suspended",
      verified: true,
      suspensionReason: true
    }, reason, remarks, "Provider suspended");
  }

  function activateProvider(providerId, reason, remarks) {
    const provider = findProvider(getData(), providerId);
    if (!provider || normalizeKey(provider.accountStatus) !== "suspended") return { ok: false, message: "Only suspended verified providers can be activated." };
    return transitionProvider(providerId, {
      approvalStatus: "Active",
      verificationStatus: "Verified",
      accountStatus: "Active",
      verified: true
    }, reason, remarks, "Provider activated");
  }

  function refreshListPage() {
    const data = getData();
    renderStatusFilter(data.providers);
    renderStats(data);
    renderProviders(data);
    renderPendingDesk(data);
    bindListActions();
  }

  const modalState = { action: "", providerId: "" };

  function closeActionModal() {
    const modal = byId("providerOperationsActionModal");
    if (modal) modal.hidden = true;
    modalState.action = "";
    modalState.providerId = "";
  }

  function openActionModal(action, providerId) {
    const modal = byId("providerOperationsActionModal");
    const title = byId("providerOperationsModalTitle");
    const prompt = byId("providerOperationsModalPrompt");
    const reason = byId("providerOperationsModalReason");
    const remarks = byId("providerOperationsModalRemarks");
    const error = byId("providerOperationsModalError");
    if (!modal) return;
    modalState.action = action;
    modalState.providerId = providerId;
    if (title) title.textContent = action === "suspend" ? "Suspend Provider" : "Activate Provider";
    if (prompt) prompt.textContent = action === "suspend"
      ? "Enter the suspension reason before blocking this verified provider from operations."
      : "Confirm reactivation for this previously suspended verified provider.";
    if (reason) {
      reason.value = "";
      reason.placeholder = action === "suspend" ? "Required suspension reason" : "Optional activation reason";
    }
    if (remarks) remarks.value = "";
    if (error) error.textContent = "";
    modal.hidden = false;
  }

  function setupActionModal() {
    const cancel = byId("providerOperationsModalCancel");
    const submit = byId("providerOperationsModalSubmit");
    if (cancel) cancel.addEventListener("click", closeActionModal);
    if (!submit) return;
    submit.addEventListener("click", function () {
      const reason = byId("providerOperationsModalReason") ? byId("providerOperationsModalReason").value : "";
      const remarks = byId("providerOperationsModalRemarks") ? byId("providerOperationsModalRemarks").value : "";
      const result = modalState.action === "suspend"
        ? suspendProvider(modalState.providerId, reason, remarks)
        : activateProvider(modalState.providerId, reason, remarks);
      if (!result.ok) {
        const error = byId("providerOperationsModalError");
        if (error) error.textContent = result.message || "Unable to update provider status.";
        return;
      }
      closeActionModal();
      refreshListPage();
    });
  }

  function bindListActions() {
    document.querySelectorAll("[data-action][data-provider-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        const providerId = button.dataset.providerId;
        const action = button.dataset.action;
        if (action === "view") {
          window.location.href = "provider-operations-detail.html?id=" + encodeURIComponent(providerId);
        } else if (action === "review") {
          window.location.href = "provider-verification-review.html?id=" + encodeURIComponent(providerId);
        } else {
          openActionModal(action, providerId);
        }
      });
    });
  }

  function setupLogout(buttonId) {
    const logoutBtn = byId(buttonId || "providerOperationsLogoutBtn");
    if (!logoutBtn) return;
    logoutBtn.addEventListener("click", function () {
      if (auth.isEmployeeSession(session)) {
        auth.logoutEmployee();
        return;
      }
      sessionStorage.removeItem("serveEaseSession");
      window.location.href = "login.html";
    });
  }

  function initListPage() {
    if (!byId("providerOperationsRows")) return;
    setupActionModal();
    refreshListPage();
    const search = byId("providerOperationsSearch");
    const status = byId("providerOperationsStatusFilter");
    if (search) search.addEventListener("input", refreshListPage);
    if (status) status.addEventListener("change", function () {
      const data = getData();
      renderStats(data);
      renderProviders(data);
      renderPendingDesk(data);
      bindListActions();
    });
  }

  window.ServeEaseProviderOperations = {
    emptyValue: emptyValue,
    activeBookingStatuses: activeBookingStatuses,
    getData: getData,
    itemsForProvider: itemsForProvider,
    findProvider: findProvider,
    providerMatches: providerMatches,
    pendingProviders: pendingProviders,
    approveProvider: approveProvider,
    rejectProvider: rejectProvider,
    suspendProvider: suspendProvider,
    activateProvider: activateProvider,
    display: display,
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatPrice: formatPrice,
    statusChip: statusChip,
    normalizeKey: normalizeKey,
    setupLogout: setupLogout
  };

  setupLogout("providerOperationsLogoutBtn");
  initListPage();
})();
