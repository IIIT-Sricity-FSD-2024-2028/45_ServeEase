(function () {
  const storageKey = "serveEaseSuperuserModuleData";
  const allowedRoles = ["superuser", "admin"];
  let selectedUserId = "";
  let selectedProviderId = "";
  let editingCategoryId = "";
  let selectedBookingId = "";
  let selectedTicketId = "";
  let managementProviderRows = [];

  function getSession() {
    return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
  }

  function requireAccess() {
    const isSuperuserPage = document.querySelector(".superuser-page");
    if (!isSuperuserPage) return true;
    const session = getSession();
    if (session && session.isLoggedIn && session.role === "employee") {
      if (window.ServeEaseEmployeeAuth && typeof window.ServeEaseEmployeeAuth.requireCurrentPageAccess === "function") {
        return Boolean(window.ServeEaseEmployeeAuth.requireCurrentPageAccess());
      } else {
        window.location.href = "login.html";
      }
      return false;
    }
    if (!session || !session.isLoggedIn || !allowedRoles.includes(session.role)) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  function getData() {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null");
    const normalized = window.ServeEaseBookingWorkflow && window.ServeEaseBookingWorkflow.normalizeData(data);
    if (normalized && normalized.changed) localStorage.setItem(storageKey, JSON.stringify(normalized.data));
    return normalized ? normalized.data : data;
  }

  function setData(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function getSupportData() {
    return JSON.parse(localStorage.getItem("serveEaseSupportModuleData") || '{"agent":{"fullName":"Priya Sharma"},"tickets":[],"notifications":[]}');
  }

  function setSupportData(data) {
    localStorage.setItem("serveEaseSupportModuleData", JSON.stringify(data));
    if (window.ServeEaseApi && typeof window.ServeEaseApi.saveState === "function") {
      window.ServeEaseApi.saveState("serveEaseSupportModuleData", data).catch(function () { return null; });
    }
  }

  function superuserStamp() {
    return window.ServeEaseDate ? window.ServeEaseDate.nowDateTime() : (function () {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, "0");
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const suffix = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return `${day}-${month}-${year} ${String(hours).padStart(2, "0")}:${minutes} ${suffix}`;
    })();
  }

  function formatDisplayDate(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDate(value) : (value || "");
  }

  function formatDisplayDateTime(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDateTime(value) : (value || "");
  }

  function getAllLocalStorageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function readStoredObject(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null");
    } catch (error) {
      return null;
    }
  }

  function mapSupportTicketToSuperuser(ticket) {
    return {
      id: ticket.id,
      status: ticket.status || "Open",
      userType: ticket.raisedByType === "provider" ? "Provider" : "Customer",
      customer: ticket.customerName || ticket.providerName || "User",
      provider: ticket.providerName || "ServeEase Provider",
      providerId: ticket.providerId || "",
      relatedCustomer: ticket.relatedCustomer || "",
      bookingId: ticket.bookingReference || "N/A",
      created: ticket.createdDate || "Just now",
      category: ticket.issueCategory || "General Support",
      service: ticket.service || "",
      priority: ticket.priority || "Medium",
      internalRemarks: ticket.internalRemarks || "",
      escalationReason: ticket.escalationReason || "",
      escalatedAt: ticket.escalatedAt || "",
      assignedSupportId: ticket.assignedSupportId || "",
      assignedSupportName: ticket.assignedSupportName || ticket.assignedTo || "",
      subject: ticket.subject || "Support request",
      description: ticket.description || ticket.subject || "No description provided.",
      phone: ticket.phone || "",
      email: ticket.email || "",
      attachments: ticket.attachmentName && ticket.attachmentName !== "No attachment" ? 1 : 0,
      attachmentName: ticket.attachmentName || ticket.attachmentUrl || "No attachment",
      attachmentUrl: ticket.attachmentUrl || "",
      attachmentId: ticket.attachmentId || "",
      attachmentType: ticket.attachmentType || "",
      attachmentSize: ticket.attachmentSize || 0,
      raisedByType: ticket.raisedByType || "customer",
      solution: ticket.solution || "",
      supportUpdate: ticket.supportUpdate || "",
      messages: Array.isArray(ticket.messages) ? ticket.messages : [],
      history: Array.isArray(ticket.history) ? ticket.history : [],
      supportTicketRef: ticket.id
    };
  }

  function collectTicketsFromAllModules() {
    const collected = [];
    const supportData = getSupportData();
    if (supportData && Array.isArray(supportData.tickets)) {
      supportData.tickets.forEach(function (ticket) {
        collected.push(ticket);
      });
    }

    getAllLocalStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      const customerData = readStoredObject(key);
      if (!customerData || !Array.isArray(customerData.tickets)) return;
      customerData.tickets.forEach(function (ticket) {
        collected.push({
          id: ticket.id,
          bookingReference: ticket.bookingRef || ticket.bookingReference || "N/A",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: ticket.customerName || customerData.ownerName || "Customer",
          providerName: ticket.provider || "ServeEase Provider",
          providerId: ticket.providerId || "",
          issueCategory: ticket.category || "Booking Issue",
          subject: ticket.subject || "Customer support request",
          description: ticket.description || ticket.subject || "No description provided.",
          attachmentName: ticket.attachmentName || "No attachment",
          phone: ticket.customerPhone || "",
          email: ticket.customerEmail || customerData.ownerEmail || "",
          status: ticket.status || "Open",
          supportUpdate: ticket.supportUpdate || "",
          solution: ticket.solution || "",
          createdDate: ticket.date || ticket.createdDate || "Just now",
          createdAtIso: ticket.createdAtIso || "",
          service: ticket.service || "",
          priority: ticket.priority || "Medium",
          internalRemarks: ticket.internalRemarks || "",
          messages: Array.isArray(ticket.messages) ? ticket.messages : [],
          history: Array.isArray(ticket.history) ? ticket.history : []
        });
      });
    });

    getAllLocalStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const providerData = readStoredObject(key);
      if (!providerData || !Array.isArray(providerData.supportTickets)) return;
      const profile = providerData.profile || {};
      const providerName = profile.organisationName || profile.fullName || "Provider";
      providerData.supportTickets.forEach(function (ticket) {
        collected.push({
          id: ticket.id,
          bookingReference: ticket.bookingRef || ticket.bookingReference || "N/A",
          raisedByType: "provider",
          raisedByLabel: "Provider",
          customerName: providerName,
          providerName: providerName,
          providerId: ticket.providerId || profile.providerId || profile.id || "",
          relatedCustomer: ticket.relatedCustomer || "",
          issueCategory: ticket.category || "Provider Support",
          subject: ticket.subject || "Provider support request",
          description: ticket.description || ticket.subject || "No description provided.",
          attachmentName: ticket.attachmentName || "No attachment",
          phone: ticket.phone || profile.phone || "",
          email: ticket.email || profile.email || "",
          status: ticket.status || "Open",
          supportUpdate: ticket.supportUpdate || "",
          solution: ticket.solution || "",
          createdDate: ticket.date || ticket.createdDate || "Just now",
          createdAtIso: ticket.createdAtIso || "",
          service: ticket.service || profile.serviceType || "",
          priority: ticket.priority || "Medium",
          internalRemarks: ticket.internalRemarks || "",
          messages: Array.isArray(ticket.messages) ? ticket.messages : [],
          history: Array.isArray(ticket.history) ? ticket.history : []
        });
      });
    });

    return collected;
  }

  function ticketStatusRank(status) {
    const ranks = { "Open": 1, "In Progress": 2, "Escalated": 3, "Resolved": 4 };
    return ranks[status] || 0;
  }

  function backendTicketToSupportShape(ticket) {
    ticket = ticket || {};
    return {
      id: ticket.ticketId || ticket.id,
      bookingReference: ticket.relatedBookingId || ticket.bookingReference || "N/A",
      raisedByType: ticket.raisedByType || "customer",
      raisedByLabel: ticket.raisedByType === "provider" ? "Provider" : "Customer",
      customerName: ticket.raisedByName || ticket.customerName || "User",
      providerName: ticket.providerName || (ticket.raisedByType === "provider" ? ticket.raisedByName : "ServeEase Provider"),
      providerId: ticket.providerId || "",
      relatedCustomer: ticket.customerName || "",
      issueCategory: ticket.ticketType || ticket.issueCategory || "General Support",
      subject: ticket.subject || ticket.ticketType || "Support request",
      description: ticket.description || "",
      attachmentName: ticket.attachmentUrl || "No attachment",
      phone: ticket.raisedByPhone || "",
      email: ticket.raisedByEmail || "",
      status: ticket.status || "Pending",
      supportUpdate: ticket.supportRemarks || ticket.adminRemarks || "",
      solution: ticket.finalDecision || "",
      internalRemarks: ticket.supportRemarks || "",
      escalationReason: ticket.escalationReason || "",
      escalatedAt: ticket.escalatedAt || "",
      assignedSupportId: ticket.assignedSupportId || "",
      assignedSupportName: ticket.assignedSupportName || "",
      priority: ticket.priority || "Medium",
      createdDate: ticket.createdAt ? formatDisplayDate(ticket.createdAt) : "Just now",
      createdAtIso: ticket.createdAt || "",
      service: ticket.service || "",
      messages: [],
      history: (ticket.statusHistory || []).map(function (entry) {
        return { label: entry.note || entry.status, time: entry.updatedAt || "", active: false };
      })
    };
  }

  function syncSupportTicketsIntoSuperuserData() {
    const allTickets = collectTicketsFromAllModules();
    if (!allTickets.length) return;
    const data = getData() || {};
    if (!Array.isArray(data.tickets)) data.tickets = [];
    if (!Array.isArray(data.notifications)) data.notifications = [];
    let changed = false;
    const mergedById = {};

    allTickets.forEach(function (supportTicket) {
      if (!supportTicket || !supportTicket.id) return;
      const normalized = mapSupportTicketToSuperuser(supportTicket);
      const previous = mergedById[normalized.id];
      if (previous && ticketStatusRank(previous.status) > ticketStatusRank(normalized.status)) return;
      mergedById[normalized.id] = normalized;
    });

    Object.keys(mergedById).forEach(function (ticketId) {
      const normalized = mergedById[ticketId];
      const existing = data.tickets.find(function (ticket) { return ticket.id === normalized.id; });
      if (existing) {
        Object.assign(existing, normalized);
      } else {
        data.tickets.unshift(normalized);
      }
      if (normalized.status === "Escalated") {
        const hasNotification = data.notifications.some(function (item) {
          return item.ticketId === normalized.id || String(item.text || "").indexOf(normalized.id) !== -1;
        });
        if (!hasNotification) {
          addNotification(data, { id: "AN-escalated-" + normalized.id, text: "Support escalated ticket - " + normalized.id, type: "red", ticketId: normalized.id, referenceId: normalized.id, actionPage: "superuser-escalated-tickets.html" });
        }
      }
      changed = true;
    });

    if (changed) setData(data);
  }

  function hydrateSupportTicketsFromBackend(done) {
    if (!window.ServeEaseApi) {
      if (typeof done === "function") done();
      return;
    }

    const statePromise = typeof window.ServeEaseApi.getState === "function"
      ? window.ServeEaseApi.getState("serveEaseSupportModuleData")
      .then(function (entry) {
        if (entry && entry.value) {
          const current = getSupportData();
          const backend = entry.value;
          const ticketMap = {};
          (backend.tickets || []).forEach(function (ticket) { if (ticket && ticket.id) ticketMap[ticket.id] = ticket; });
          (current.tickets || []).forEach(function (ticket) { if (ticket && ticket.id) ticketMap[ticket.id] = ticket; });
          backend.tickets = Object.keys(ticketMap).map(function (id) { return ticketMap[id]; });
          backend.notifications = (current.notifications && current.notifications.length) ? current.notifications : (backend.notifications || []);
          backend.agent = current.agent || backend.agent || { fullName: "Priya Sharma" };
          localStorage.setItem("serveEaseSupportModuleData", JSON.stringify(backend));
        }
      })
      .catch(function () { return null; })
      : Promise.resolve();

    statePromise.then(function () {
      if (typeof window.ServeEaseApi.getEscalatedTickets !== "function") return null;
      return window.ServeEaseApi.getEscalatedTickets().then(function (tickets) {
        if (!Array.isArray(tickets)) return;
        const supportData = getSupportData();
        if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
        tickets.forEach(function (ticket) {
          const normalized = backendTicketToSupportShape(ticket);
          if (!normalized.id) return;
          const existing = supportData.tickets.find(function (item) { return item.id === normalized.id; });
          if (existing) Object.assign(existing, normalized);
          else supportData.tickets.unshift(normalized);
        });
        localStorage.setItem("serveEaseSupportModuleData", JSON.stringify(supportData));
      });
    })
      .catch(function () { return null; })
      .finally(function () {
        syncSupportTicketsIntoSuperuserData();
        if (typeof done === "function") done();
      });
  }

  function updateTicketInUserModules(ticket) {
    if (!ticket || !ticket.id) return;
    const keys = ticket.raisedByType === "provider"
      ? getAllLocalStorageKeys("serveEaseProviderModuleData")
      : getAllLocalStorageKeys("serveEaseCustomerModuleData");

    keys.forEach(function (key) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || "null");
        const tickets = ticket.raisedByType === "provider" ? data && data.supportTickets : data && data.tickets;
        if (!Array.isArray(tickets)) return;
        const localTicket = tickets.find(function (item) { return item.id === ticket.id; });
        if (!localTicket) return;
        localTicket.status = ticket.status;
        localTicket.solution = ticket.solution || "";
        localTicket.supportUpdate = ticket.supportUpdate || ticket.solution || "Admin updated your ticket.";
        localTicket.messages = Array.isArray(ticket.messages) ? ticket.messages : localTicket.messages;
        localTicket.updatedAt = ticket.updatedAt || superuserStamp();
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        /* ignore invalid module data */
      }
    });
  }

  function getAppData() {
    return JSON.parse(localStorage.getItem("serveEaseData") || "{}");
  }

  function setAppData(data) {
    localStorage.setItem("serveEaseData", JSON.stringify(data));
  }

  function slugifyCategory(value) {
    return String(value || "service")
      .toLowerCase()
      .replace(/\s*\/\s*/g, "-")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "service";
  }

  function categoryIcon(name) {
    const value = String(name || "").toLowerCase();
    if (value.indexOf("clean") !== -1) return "🧹";
    if (value.indexOf("salon") !== -1 || value.indexOf("beauty") !== -1) return "💇";
    if (value.indexOf("plumb") !== -1) return "🔧";
    if (value.indexOf("electric") !== -1) return "⚡";
    if (value.indexOf("appliance") !== -1 || value.indexOf("repair") !== -1) return "🛠";
    if (value.indexOf("pest") !== -1) return "🐜";
    if (value.indexOf("paint") !== -1) return "🎨";
    if (value.indexOf("carpent") !== -1) return "🪚";
    return "SE";
  }

  function categoryImage(name) {
    const value = String(name || "").toLowerCase();
    if (value.indexOf("salon") !== -1 || value.indexOf("beauty") !== -1) return "https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=900&q=80";
    if (value.indexOf("plumb") !== -1) return "assets/images/plumbing-category-realistic.jpeg";
    if (value.indexOf("electric") !== -1) return "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=900&q=80";
    if (value.indexOf("appliance") !== -1 || value.indexOf("repair") !== -1) return "assets/images/appliance-repair-realistic.jpg";
    if (value.indexOf("pest") !== -1) return "assets/images/pest-control-realistic.jpg";
    if (value.indexOf("paint") !== -1) return "https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=900&q=80";
    if (value.indexOf("carpent") !== -1) return "https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80";
    return "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80";
  }

  function normalizeCategoryRecord(category) {
    const name = category && category.name ? category.name : "Service Category";
    return {
      id: category.id && !String(category.id).startsWith("CAT") ? category.id : slugifyCategory(name),
      name: name,
      icon: category.icon || categoryIcon(name),
      bgImage: category.bgImage || categoryImage(name),
      description: category.description || (Array.isArray(category.subServices) && category.subServices.length ? category.subServices.join(", ") : "ServeEase service category"),
      subServices: Array.isArray(category.subServices) ? category.subServices : []
    };
  }

  function syncServiceCategoriesFromCatalog() {
    const appData = getAppData();
    const data = getData();
    const source = Array.isArray(appData.categories) && appData.categories.length ? appData.categories : data.categories;
    const normalized = (source || []).map(normalizeCategoryRecord);
    data.categories = normalized;
    appData.categories = normalized;
    setData(data);
    setAppData(appData);
  }

  function syncCatalogToBackend(appData) {
    if (window.ServeEaseApi && typeof window.ServeEaseApi.syncCatalog === "function") {
      window.ServeEaseApi.syncCatalog(appData).catch(function () { return null; });
    }
  }

  function getProviderApprovalRequests(appData) {
    if (!Array.isArray(appData.providerApprovalRequests)) {
      appData.providerApprovalRequests = [];
    }
    return appData.providerApprovalRequests;
  }

  function supportedProviderDocuments(documents) {
    return (Array.isArray(documents) ? documents : []).filter(function (document) {
      return String(document && document.documentType || "").toLowerCase().indexOf("police verification") !== 0;
    });
  }

  function normalizeProviderApproval(request) {
    return {
      ...request,
      id: request.id,
      fullName: request.fullName,
      organisationName: request.organisationName || "",
      email: request.email,
      phone: request.phone || "",
      category: request.serviceType || request.category || "Home Service",
      experience: Number(request.experience) || 0,
      location: request.cityName || request.location || request.address || "",
      cityId: request.cityId || "",
      cityName: request.cityName || request.location || "",
      address: request.address || "",
      providerCatalogId: request.providerCatalogId || "",
      registrationDate: request.registrationDate || "Just now",
      approvalStatus: request.approvalStatus || "Pending Approval"
    };
  }

  function isSupportedPendingLocation(request) {
    if (!window.ServeEaseLocation || typeof window.ServeEaseLocation.getCities !== 'function') return false;
    const cities = window.ServeEaseLocation.getCities();
    const cityId = Number(request && request.cityId);
    const location = String(request && (request.cityName || request.location || '')).trim().toLowerCase();
    const cityById = cityId ? cities.find(function (city) { return Number(city.id) === cityId; }) : null;
    if (cityId && !cityById) return false;
    if (location && !cities.some(function (city) { return String(city.name).toLowerCase() === location; })) return false;
    return Boolean(cityById || location);
  }

  function isValidPendingProviderRequest(request, appData) {
    if (!request || !appData) return false;
    const requestId = request.id || request.providerId || request.userId;
    if (!requestId || !isSupportedPendingLocation(request)) return false;
    const state = String(request.verificationStatus || request.approvalStatus || request.status || request.accountStatus || '').toLowerCase();
    if (['pending', 'pending approval', 'under verification'].indexOf(state) === -1) return false;
    const linkedUser = (appData.users || []).find(function (user) {
      return user && String(user.role || '').toLowerCase() === 'provider' &&
        ((user.id && String(user.id) === String(requestId)) ||
          (request.providerId && String(user.id) === String(request.providerId)) ||
          (request.email && user.email && user.email.toLowerCase() === request.email.toLowerCase()));
    });
    const linkedProvider = (appData.providers || []).find(function (provider) {
      return provider && ((provider.ownerProviderId && String(provider.ownerProviderId) === String(requestId)) ||
        (provider.providerId && String(provider.providerId) === String(requestId)));
    });
    if (!linkedUser && !linkedProvider) return false;
    return Boolean(request.email && (request.fullName || request.name) && (request.category || request.serviceType) &&
      Array.isArray(request.documents) && request.documents.length);
  }

  function syncPendingProviderApprovals() {
    const data = getData();
    const appData = getAppData();
    if (!data) return;

    if (!Array.isArray(data.pendingProviders)) data.pendingProviders = [];
    if (!Array.isArray(data.providers)) data.providers = [];

    const activeEmails = new Set(data.providers.map(function (provider) {
      return String(provider.email || "").toLowerCase();
    }));
    const pendingEmails = new Set(data.pendingProviders.map(function (provider) {
      return String(provider.email || "").toLowerCase();
    }));

    getProviderApprovalRequests(appData).forEach(function (request) {
      if (!isValidPendingProviderRequest(request, appData)) return;
      const emailKey = String(request.email || "").toLowerCase();
      if (!emailKey || activeEmails.has(emailKey) || pendingEmails.has(emailKey)) return;
      data.pendingProviders.unshift(normalizeProviderApproval(request));
      pendingEmails.add(emailKey);
    });

    data.pendingProviders = data.pendingProviders.filter(function (provider) {
      const matchingRequest = getProviderApprovalRequests(appData).find(function (request) {
        return request.email && provider.email && request.email.toLowerCase() === provider.email.toLowerCase();
      });
      return Boolean(matchingRequest && isValidPendingProviderRequest(matchingRequest, appData));
    });

    data.stats.pendingApprovals = data.pendingProviders.length;
    setData(data);
  }

  function hydrateProviderApprovalsFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getState !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getState("serveEaseData")
      .then(function (entry) {
        const backendData = entry && entry.value ? entry.value : null;
        if (!backendData) return;

        const appData = getAppData();
        const localRequests = getProviderApprovalRequests(appData);
        const localEmails = new Set(localRequests.map(function (request) {
          return String(request.email || "").toLowerCase();
        }));

        (backendData.providerApprovalRequests || []).forEach(function (request) {
          const emailKey = String(request.email || "").toLowerCase();
          if (!emailKey || localEmails.has(emailKey)) return;
          localRequests.push(request);
          localEmails.add(emailKey);
        });

        if ((!appData.users || !appData.users.length) && Array.isArray(backendData.users)) {
          appData.users = backendData.users;
        }

        setAppData(appData);
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function promoteVerificationProvider(appData, provider) {
    if (!Array.isArray(appData.providers)) appData.providers = [];
    if (!Array.isArray(appData.users)) appData.users = [];
    const providerName = provider.fullName || provider.name || provider.organisationName || "Provider";
    const providerEmail = provider.email || "";
    const record = {
      id: provider.id,
      fullName: providerName,
      organisationName: provider.organisationName || providerName,
      email: providerEmail,
      phone: provider.phone || "",
      category: provider.serviceType || provider.category || "Home Service",
      serviceType: provider.serviceType || provider.category || "Home Service",
      experience: Number(provider.experience || provider.years) || 0,
      cityId: provider.cityId || "",
      cityName: provider.cityName || provider.location || "",
      location: provider.location || provider.cityName || "",
      address: provider.address || "",
      registrationDate: provider.registrationDate || provider.submittedDate || "Just now",
      approvalStatus: "Active",
      status: "Active",
      verificationStatus: "Verified",
      providerCatalogId: provider.providerCatalogId || provider.id
    };

    appData.providers = appData.providers.filter(function (item) {
      return !(item.email && providerEmail && item.email.toLowerCase() === providerEmail.toLowerCase()) && item.id !== provider.id;
    });
    appData.providers.unshift(record);

    appData.users = appData.users.filter(function (item) {
      return !(item.email && providerEmail && item.email.toLowerCase() === providerEmail.toLowerCase()) && item.id !== provider.id;
    });
    appData.users.push({ ...record, role: "provider" });
  }

  function hydrateVerifiedProvidersFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getProviderVerificationRequests !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getProviderVerificationRequests()
      .then(function (items) {
        if (!Array.isArray(items)) return;
        const appData = getAppData();
        const requests = getProviderApprovalRequests(appData);

        items.forEach(function (provider) {
          if (!provider || !provider.id) return;
          const emailKey = String(provider.email || "").toLowerCase();
          let request = requests.find(function (item) {
            return item.id === provider.id || (emailKey && item.email && item.email.toLowerCase() === emailKey);
          });

          if (!request && provider.status === "Verified") {
            request = normalizeProviderApproval({
              id: provider.id,
              fullName: provider.name,
              organisationName: provider.organisationName,
              email: provider.email,
              phone: provider.phone,
              serviceType: provider.category,
              category: provider.category,
              experience: provider.experience,
              location: provider.location,
              address: provider.address,
              registrationDate: provider.submittedDate,
              approvalStatus: "Active"
            });
            requests.push(request);
          }

          if (!request) return;
          request.documents = supportedProviderDocuments(Array.isArray(provider.documents) ? provider.documents : request.documents);
          request.verificationStatus = provider.status || request.verificationStatus;
          if (provider.status === "Verified") {
            request.approvalStatus = "Active";
            promoteVerificationProvider(appData, { ...provider, fullName: request.fullName || provider.name });
          } else if (provider.status === "Rejected" || provider.status === "Suspended") {
            request.approvalStatus = provider.status;
          }
        });

        setAppData(appData);
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function syncSuperuserBookingsFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getBookings !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getBookings()
      .then(function (bookings) {
        if (!Array.isArray(bookings) || !bookings.length) return;
        const data = getData();
        if (!data || !Array.isArray(data.bookings)) return;

        const existingIds = new Set(data.bookings.map(function (booking) { return booking.id; }));
        let changed = false;

        bookings.forEach(function (booking) {
          if (existingIds.has(booking.id)) return;
          data.bookings.unshift({
            id: booking.id,
            status: booking.status === "Pending" ? "Requested" : booking.status,
            paymentStatus: "Paid",
            category: booking.category || "Home Service",
            serviceType: booking.service,
            provider: booking.provider,
            customer: booking.customerName || "Customer",
            serviceDate: booking.date,
            serviceTime: booking.time,
            amount: booking.amount,
            reason: "Awaiting provider approval",
            email: booking.customerEmail || ""
          });
          existingIds.add(booking.id);
          changed = true;
        });

        if (changed) setData(data);
      })
      .catch(function (error) {
        console.warn("ServeEase backend superuser booking sync skipped.", error);
      })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function chipClass(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "in progress") return "in-progress";
    return normalized.replace(/\s+/g, "-");
  }

  function seedData() {
    const existingSuperuserData = getData();
    if (
      existingSuperuserData &&
      existingSuperuserData.stats &&
      Array.isArray(existingSuperuserData.customers) &&
      Array.isArray(existingSuperuserData.providers) &&
      Array.isArray(existingSuperuserData.notifications) &&
      Array.isArray(existingSuperuserData.tickets)
    ) return;
    const data = {
      stats: {
        registeredCustomers: 1250,
        serviceProviders: 320,
        totalBookings: 4500,
        platformRevenue: 350000,
        pendingApprovals: 4,
        activeSessions: 427,
        avgResponseTime: "1.2s",
        uptime: "99.9%"
      },
      monthlyBookings: [1300, 1450, 1580, 1730, 1890, 2120],
      monthlyLabels: ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"],
      categoryStats: [
        { name: "Cleaning", bookings: 1220 },
        { name: "Plumbing", bookings: 860 },
        { name: "Electrical", bookings: 720 },
        { name: "Salon", bookings: 960 },
        { name: "Repairs", bookings: 780 }
      ],
      bookingStatusDistribution: {
        completed: 3200,
        inProgress: 500,
        cancelled: 800
      },
      notifications: [],
      activities: [],
      customers: [
        { id: "CUS001", fullName: "Raghava Kumar", email: "raghava.kumar@email.com", phone: "+91 9876543210", registrationDate: "15 Jan 2026", status: "Active" },
        { id: "CUS002", fullName: "Vikram Singh", email: "vikram.singh@email.com", phone: "+91 9876543211", registrationDate: "20 Feb 2026", status: "Active" },
        { id: "CUS003", fullName: "Amit Patel", email: "amit.patel@email.com", phone: "+91 9876543212", registrationDate: "1 Mar 2026", status: "Blocked" },
        { id: "CUS004", fullName: "Suresh Reddy", email: "suresh.reddy@email.com", phone: "+91 9876543213", registrationDate: "5 Mar 2026", status: "Active" },
        { id: "CUS005", fullName: "Priya Desai", email: "priya.desai@email.com", phone: "+91 9876543214", registrationDate: "10 Feb 2026", status: "Active" },
        { id: "CUS006", fullName: "Rahul Sharma", email: "rahul.sharma@email.com", phone: "+91 9876543215", registrationDate: "25 Jan 2026", status: "Active" },
        { id: "CUS007", fullName: "Sneha Kapoor", email: "sneha.kapoor@email.com", phone: "+91 9876543216", registrationDate: "28 Feb 2026", status: "Active" },
        { id: "CUS008", fullName: "Arjun Mehta", email: "arjun.mehta@email.com", phone: "+91 9876543217", registrationDate: "2 Mar 2026", status: "Active" },
        { id: "CUS009", fullName: "Kavita Nair", email: "kavita.nair@email.com", phone: "+91 9876543218", registrationDate: "30 Jan 2026", status: "Blocked" },
        { id: "CUS010", fullName: "Sanjay Gupta", email: "sanjay.gupta@email.com", phone: "+91 9876543219", registrationDate: "15 Feb 2026", status: "Active" },
        { id: "CUS011", fullName: "Meera Iyer", email: "meera.iyer@email.com", phone: "+91 9876543220", registrationDate: "8 Mar 2026", status: "Active" },
        { id: "CUS012", fullName: "Rohan Das", email: "rohan.das@email.com", phone: "+91 9876543221", registrationDate: "8 Mar 2026", status: "Active" }
      ],
      recentRegistrations: ["CUS011", "PRO013", "CUS002", "PRO001", "CUS003"],
      pendingProviders: [
        { id: "PRO013", fullName: "Anita Verma", organisationName: "Anita Beauty Studio", email: "anita.verma@email.com", phone: "+91 9876543230", category: "Salon Services", experience: 5, location: "Mumbai", registrationDate: "8 Mar 2026", approvalStatus: "Pending Approval" },
        { id: "PRO014", fullName: "Deepak Kumar", organisationName: "Deepak Electricals", email: "deepak.kumar@email.com", phone: "+91 9876543233", category: "Electrical", experience: 4, location: "Bangalore", registrationDate: "7 Mar 2026", approvalStatus: "Pending Approval" },
        { id: "PRO015", fullName: "Manoj Singh", organisationName: "Singh Appliance Care", email: "manoj.singh@email.com", phone: "+91 9876543237", category: "Appliance Repair", experience: 5, location: "Delhi", registrationDate: "10 Feb 2026", approvalStatus: "Pending Approval" },
        { id: "PRO016", fullName: "Rekha Joshi", organisationName: "Rekha Salon Services", email: "rekha.joshi@email.com", phone: "+91 9876543240", category: "Salon Services", experience: 3, location: "Mumbai", registrationDate: "25 Feb 2026", approvalStatus: "Pending Approval" }
      ],
      providers: [
        { id: "PRO001", fullName: "Priya Sharma", organisationName: "Priya Clean Solutions", email: "priya.sharma@email.com", category: "Cleaning Services", experience: 3, location: "Delhi", registrationDate: "15 Feb 2026", approvalStatus: "Active" },
        { id: "PRO002", fullName: "Rajesh Yadav", organisationName: "Yadav Plumbing Co.", email: "rajesh.yadav@email.com", category: "Plumbing", experience: 8, location: "Bangalore", registrationDate: "20 Jan 2026", approvalStatus: "Active" },
        { id: "PRO003", fullName: "Lakshmi Menon", organisationName: "LM Beauty Parlour", email: "lakshmi.menon@email.com", category: "Salon Services", experience: 6, location: "Chennai", registrationDate: "22 Feb 2026", approvalStatus: "Active" },
        { id: "PRO004", fullName: "Ravi Verma", organisationName: "Verma Pest Control", email: "ravi.verma@email.com", category: "Pest Control", experience: 7, location: "Hyderabad", registrationDate: "28 Jan 2026", approvalStatus: "Active" },
        { id: "PRO005", fullName: "Sunita Rao", organisationName: "Sunita Home Cleaners", email: "sunita.rao@email.com", category: "Cleaning Services", experience: 4, location: "Kolkata", registrationDate: "5 Mar 2026", approvalStatus: "Active" },
        { id: "PRO006", fullName: "Geeta Patel", organisationName: "Patel Painting Works", email: "geeta.patel@email.com", category: "Painting Services", experience: 9, location: "Surat", registrationDate: "18 Jan 2026", approvalStatus: "Active" },
        { id: "PRO007", fullName: "Anil Deshmukh", organisationName: "Deshmukh Home Repair", email: "anil.deshmukh@email.com", category: "Home Repair", experience: 10, location: "Nagpur", registrationDate: "1 Mar 2026", approvalStatus: "Active" },
        { id: "PRO008", fullName: "Vijay Kumar", organisationName: "Kumar Plumb & Fit", email: "vijay.kumar@email.com", category: "Plumbing", experience: 6, location: "Lucknow", registrationDate: "9 Mar 2026", approvalStatus: "Active" }
      ],
      categories: [
        { id: "CAT001", name: "Cleaning Services", description: "Professional home cleaning" },
        { id: "CAT002", name: "Salon Services", description: "Beauty and grooming services" },
        { id: "CAT003", name: "Home Repair", description: "General home repairs and maintenance" },
        { id: "CAT004", name: "Appliance Repair", description: "Repair of home appliances" },
        { id: "CAT005", name: "Pest Control", description: "Pest extermination services" },
        { id: "CAT006", name: "Painting Services", description: "Interior and exterior painting" }
      ],
      bookings: [
        { id: "BOOK-2026-1047", status: "Requested", paymentStatus: "Paid", category: "Salon Services", serviceType: "Bridal Makeup", provider: "Anita Verma", customer: "Amit Patel", serviceDate: "15/3/2026", serviceTime: "9:00 AM", amount: 2500, reason: "Awaiting provider approval", email: "amit.patel@email.com" },
        { id: "BOOK-2026-1051", status: "Requested", paymentStatus: "Paid", category: "Salon Services", serviceType: "Facial Treatment", provider: "Lakshmi Menon", customer: "Arjun Mehta", serviceDate: "16/3/2026", serviceTime: "5:00 PM", amount: 549, reason: "Awaiting provider approval", email: "arjun.mehta@email.com" },
        { id: "BOOK-2026-1055", status: "Requested", paymentStatus: "Paid", category: "Plumbing", serviceType: "Water Heater Installation", provider: "Vijay Kumar", customer: "Karan Malhotra", serviceDate: "18/3/2026", serviceTime: "10:00 AM", amount: 899, reason: "Awaiting provider approval", email: "karan.m@email.com" },
        { id: "BOOK-2026-1046", status: "Upcoming", paymentStatus: "Paid", category: "Plumbing", serviceType: "Pipe Repair", provider: "Rajesh Yadav", customer: "Vikram Singh", serviceDate: "12/3/2026", serviceTime: "2:00 PM", amount: 450, email: "vikram.singh@email.com" },
        { id: "BOOK-2026-1050", status: "Upcoming", paymentStatus: "Paid", category: "Pest Control", serviceType: "Cockroach Control", provider: "Ravi Verma", customer: "Sneha Kapoor", serviceDate: "14/3/2026", serviceTime: "3:00 PM", amount: 699, email: "sneha.kapoor@email.com" },
        { id: "BOOK-2026-1054", status: "Upcoming", paymentStatus: "Paid", category: "Home Repair", serviceType: "Door Repair", provider: "Anil Deshmukh", customer: "Meera Iyer", serviceDate: "11/3/2026", serviceTime: "4:00 PM", amount: 399, email: "meera.iyer@email.com" },
        { id: "BOOK-2026-1057", status: "Upcoming", paymentStatus: "Paid", category: "Plumbing", serviceType: "Tap Installation", provider: "Rajesh Yadav", customer: "Raghava Kumar", serviceDate: "13/3/2026", serviceTime: "11:00 AM", amount: 349, email: "raghava.kumar@email.com" },
        { id: "BOOK-2026-1045", status: "Completed", paymentStatus: "Paid", category: "Home Cleaning", serviceType: "Deep Cleaning", provider: "Priya Sharma", customer: "Raghava Kumar", serviceDate: "8/3/2026", serviceTime: "10:00 AM", amount: 599, email: "raghava.kumar@email.com" },
        { id: "BOOK-2026-1049", status: "Completed", paymentStatus: "Paid", category: "Home Cleaning", serviceType: "Kitchen Cleaning", provider: "Sunita Rao", customer: "Rahul Sharma", serviceDate: "3/3/2026", serviceTime: "8:00 AM", amount: 399, email: "rahul.sharma@email.com" },
        { id: "BOOK-2026-1052", status: "Completed", paymentStatus: "Paid", category: "Appliance Repair", serviceType: "Washing Machine Repair", provider: "Manoj Singh", customer: "Kavita Nair", serviceDate: "2/3/2026", serviceTime: "1:00 PM", amount: 499, email: "kavita.nair@email.com" },
        { id: "BOOK-2026-1056", status: "Completed", paymentStatus: "Paid", category: "Home Cleaning", serviceType: "Sofa Cleaning", provider: "Priya Sharma", customer: "Suresh Reddy", serviceDate: "27/2/2026", serviceTime: "12:00 PM", amount: 449, email: "suresh.reddy@email.com" },
        { id: "BOOK-2026-1048", status: "Cancelled", paymentStatus: "Refunded", category: "Electrical", serviceType: "Wiring Installation", provider: "Deepak Kumar", customer: "Priya Desai", serviceDate: "5/3/2026", serviceTime: "11:30 AM", amount: 799, reason: "Customer unavailable", email: "priya.desai@email.com" },
        { id: "BOOK-2026-1053", status: "Cancelled", paymentStatus: "Refunded", category: "Painting Services", serviceType: "Interior Painting", provider: "Geeta Patel", customer: "Sanjay Gupta", serviceDate: "4/3/2026", serviceTime: "4:30 PM", amount: 1500, reason: "Provider unavailable", email: "sanjay.gupta@email.com" },
        { id: "BOOK-2026-1058", status: "Cancelled", paymentStatus: "Refunded", category: "Electrical", serviceType: "Fan Installation", provider: "Deepak Kumar", customer: "Vikram Singh", serviceDate: "3/3/2026", serviceTime: "2:30 PM", amount: 299, reason: "Service not required", email: "vikram.singh@email.com" }
      ],
      tickets: [
        { id: "TICKET-2026-2103", status: "Escalated", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1040", created: "2026-03-07", category: "Service Ticket", subject: "Service provider arrived late without prior notice", description: "Service provider arrived late", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 },
        { id: "TICKET-2026-2107", status: "Escalated", userType: "Customer", customer: "Amit Sharma", bookingId: "BOOK-2026-1050", created: "2026-03-09", category: "Service Ticket", subject: "Poor quality of salon service provided", description: "Poor quality of salon service provided", phone: "+91 98765 43211", email: "amit.sharma@email.com", attachments: 1 },
        { id: "TICKET-2026-2108", status: "Escalated", userType: "Customer", customer: "Priya Patel", bookingId: "BOOK-2026-1052", created: "2026-03-09", category: "Service Ticket", subject: "Service provider damaged property during repair work", description: "Service provider damaged property during repair work", phone: "+91 98765 43212", email: "priya.patel@email.com", attachments: 2 },
        { id: "TICKET-2026-2105", status: "Open", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1045", created: "2026-03-08", category: "Booking Issue", subject: "Unable to reschedule my kitchen cleaning service booking", description: "Unable to reschedule my kitchen cleaning service booking", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2106", status: "Open", userType: "Provider", customer: "CleanPro Services", bookingId: "BOOK-2026-1045", created: "2026-03-08", category: "Booking Issue", subject: "Customer canceled booking at last minute without valid reason", description: "Customer canceled booking at last minute without valid reason", phone: "+91 91234 56789", email: "cleanpro@serveease.com", attachments: 1 },
        { id: "TICKET-2026-2104", status: "In Progress", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1042", created: "2026-03-07", category: "Payment Issue", subject: "Payment deducted but booking not confirmed", description: "Payment deducted but booking not confirmed", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2102", status: "In Progress", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1038", created: "2026-03-06", category: "Technical Issue", subject: "ServeEase app not loading on my mobile device", description: "ServeEase app not loading on my mobile device", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2101", status: "Resolved", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1037", created: "2026-03-06", category: "Booking Issue", subject: "Need to cancel my plumbing service booking", description: "Need to cancel my plumbing service booking", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 },
        { id: "TICKET-2026-2100", status: "Resolved", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1036", created: "2026-03-05", category: "Payment Issue", subject: "Refund not received after cancellation", description: "Refund not received after cancellation", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 }
      ]
    };
    if (existingSuperuserData && Array.isArray(existingSuperuserData.notifications) && existingSuperuserData.notifications.length) {
      const seen = {};
      data.notifications = existingSuperuserData.notifications.concat(data.notifications).filter(function (item) {
        const key = item.id || item.text;
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      });
    }
    setData(data);
  }

  function migrateProviderOrgNames() {
    var data = getData();
    if (!data) return;
    var orgMap = {
      "PRO001": "Priya Clean Solutions",
      "PRO002": "Yadav Plumbing Co.",
      "PRO003": "LM Beauty Parlour",
      "PRO004": "Verma Pest Control",
      "PRO005": "Sunita Home Cleaners",
      "PRO006": "Patel Painting Works",
      "PRO007": "Deshmukh Home Repair",
      "PRO008": "Kumar Plumb & Fit",
      "PRO013": "Anita Beauty Studio",
      "PRO014": "Deepak Electricals",
      "PRO015": "Singh Appliance Care",
      "PRO016": "Rekha Salon Services"
    };
    var changed = false;
    (data.providers || []).forEach(function (p) {
      if (!p.organisationName && orgMap[p.id]) {
        p.organisationName = orgMap[p.id];
        changed = true;
      }
    });
    (data.pendingProviders || []).forEach(function (p) {
      if (!p.organisationName && orgMap[p.id]) {
        p.organisationName = orgMap[p.id];
        changed = true;
      }
    });
    if (changed) setData(data);
  }

  function byId(id) { return document.getElementById(id); }

  function setupCommonHeader() {
    const session = getSession();
    const nameNode = byId("superuserHeaderName");
    if (nameNode && session) nameNode.textContent = session.fullName || "Superuser";
    const btn = byId("superuserProfileBtn");
    const drop = byId("superuserProfileDropdown");
    const logoutBtn = byId("superuserLogoutBtn");
    const notificationBtn = byId("superuserNotificationBtn");
    if (btn && drop) {
      btn.addEventListener("click", function (event) {
        event.stopPropagation();
        drop.classList.toggle("hidden");
      });
    }
    if (notificationBtn) {
      notificationBtn.addEventListener("click", function () {
        const modal = byId("superuserNotificationModalBackdrop");
        if (modal) {
          openNotificationModal();
          return;
        }
        window.location.href = "superuser-dashboard.html#notifications";
      });
    }
    document.addEventListener("click", function () {
      if (drop) drop.classList.add("hidden");
    });
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem("serveEaseSession");
        window.location.href = "login.html";
      });
    }
  }

  function renderNotifications() {
    const list = byId("superuserNotificationList");
    const badge = byId("superuserNewBadge");
    if (!list || !badge) return;
    const data = getData();
    const notifications = getVisibleNotifications(data);
    const newCount = notifications.filter(function (item) { return !item.isRead; }).length;
    badge.textContent = newCount + " New";
    const notificationDot = document.querySelector(".superuser-dot");
    if (notificationDot) notificationDot.hidden = newCount === 0;
    list.innerHTML = notifications.slice(0, 4).map(function (item) {
      return '<button class="superuser-notification-item ' + (item.type || '') + (!item.isRead ? ' unread' : '') + '" data-notification-id="' + item.id + '" data-page="' + item.actionPage + '"><div><strong>' + item.text + '</strong><span>' + formatRelativeTime(item.createdAt) + '</span></div></button>';
    }).join("");
    list.querySelectorAll("button[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        markNotificationsRead([button.dataset.notificationId]);
        window.location.href = button.dataset.page;
      });
    });
    const viewAll = byId("superuserViewAllNotificationsBtn");
    if (viewAll) {
      viewAll.onclick = function () {
        const panel = document.querySelector(".superuser-notification-card");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        if (window.location.hash !== "#notifications") {
          history.replaceState(null, "", "#notifications");
        }
        openNotificationModal();
      };
    }
  }

  function getVisibleNotifications(data) {
    const seen = {};
    return (Array.isArray(data.notifications) ? data.notifications : []).map(function (item) {
      const createdAt = item.createdAt || item.timestamp || (dashboardDate(item.time) ? item.time : "");
      return {
        id: String(item.id || [item.type, item.referenceId || item.ticketId || "", createdAt].join("|")),
        text: item.text || item.message || "Platform update",
        type: item.type || "default",
        createdAt: createdAt,
        isRead: item.isRead === true || item.isNew === false,
        actionPage: item.actionPage || "superuser-dashboard.html"
      };
    }).filter(function (item) {
      if (!item.id || seen[item.id]) return false;
      seen[item.id] = true;
      return Boolean(item.createdAt);
    });
  }

  function formatRelativeTime(value) {
    const date = dashboardDate(value);
    if (!date) return "";
    const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + " minutes ago";
    if (minutes < 1440) return Math.floor(minutes / 60) + " hours ago";
    if (minutes < 10080) return Math.floor(minutes / 1440) + " days ago";
    return formatDisplayDateTime(value);
  }

  function markNotificationsRead(ids) {
    const data = getData();
    const wanted = ids ? new Set(ids.map(String)) : null;
    let changed = false;
    (Array.isArray(data.notifications) ? data.notifications : []).forEach(function (item) {
      if (!wanted || wanted.has(String(item.id))) {
        if (!item.isRead || item.isNew !== false) { item.isRead = true; item.isNew = false; changed = true; }
      }
    });
    if (changed) setData(data);
    renderNotifications();
    renderNotificationModal();
  }

  function clearNotifications() {
    const data = getData();
    if (!Array.isArray(data.notifications) || !data.notifications.length) return;
    data.notifications = [];
    setData(data);
    renderNotifications();
    renderNotificationModal();
  }

  function addNotification(data, notification) {
    if (!Array.isArray(data.notifications)) data.notifications = [];
    const referenceId = notification.referenceId || notification.ticketId || "";
    const duplicate = data.notifications.some(function (item) {
      return String(item.id) === String(notification.id) ||
        (String(item.type || "") === String(notification.type || "") &&
          String(item.referenceId || item.ticketId || "") === String(referenceId) &&
          String(item.text || item.message || "") === String(notification.text || notification.message || ""));
    });
    if (duplicate) return false;
    data.notifications.unshift(Object.assign({
      id: "AN" + Date.now(),
      createdAt: new Date().toISOString(),
      isRead: false,
      isNew: true,
      actionPage: "superuser-dashboard.html"
    }, notification));
    return true;
  }

  function renderNotificationModal() {
    const modalList = byId("superuserNotificationModalList");
    const modalBadge = byId("superuserNotificationModalBadge");
    if (!modalList || !modalBadge) return;
    const data = getData();
    const notifications = getVisibleNotifications(data);
    const newCount = notifications.filter(function (item) { return !item.isRead; }).length;
    modalBadge.textContent = newCount + " New";
    modalList.innerHTML = notifications.length ? notifications.map(function (item) {
      return '<div class="superuser-notification-item ' + (item.type || '') + (!item.isRead ? ' unread' : '') + '"><div><strong>' + item.text + '</strong><span>' + formatRelativeTime(item.createdAt) + '</span></div>' + (!item.isRead ? '<button class="btn btn-outline" type="button" data-notification-read="' + item.id + '">Mark as Read</button>' : '') + '</div>';
    }).join("") : '<div class="superuser-empty-state"><strong>No new notifications</strong><span>You\'re all caught up.</span></div>';
    modalList.querySelectorAll('[data-notification-read]').forEach(function (button) {
      button.addEventListener('click', function () { markNotificationsRead([button.dataset.notificationRead]); });
    });
    const markAll = byId('superuserMarkAllNotificationsBtn');
    if (markAll) markAll.onclick = function () { markNotificationsRead(); };
    const clearAll = byId('superuserClearNotificationsBtn');
    if (clearAll) clearAll.onclick = clearNotifications;
  }

  function positionNotificationModal() {
    const backdrop = byId("superuserNotificationModalBackdrop");
    const modal = backdrop ? backdrop.querySelector('.superuser-notification-modal') : null;
    const trigger = byId("superuserNotificationBtn");
    if (!backdrop || !modal || !trigger) return;
    const rect = trigger.getBoundingClientRect();
    const modalWidth = Math.min(560, window.innerWidth - 32);
    let left = rect.right - modalWidth;
    if (left < 16) left = 16;
    if (left + modalWidth > window.innerWidth - 16) left = window.innerWidth - modalWidth - 16;
    const top = Math.min(rect.bottom + 10, window.innerHeight - modal.offsetHeight - 16);
    modal.style.top = Math.max(16, top) + 'px';
    modal.style.left = left + 'px';
  }

  function openNotificationModal() {
    const backdrop = byId("superuserNotificationModalBackdrop");
    if (!backdrop) return;
    renderNotificationModal();
    backdrop.classList.remove("hidden");
    positionNotificationModal();
  }

  function closeNotificationModal() {
    const backdrop = byId("superuserNotificationModalBackdrop");
    if (!backdrop) return;
    backdrop.classList.add("hidden");
  }

  function setupNotificationModal() {
    const backdrop = byId("superuserNotificationModalBackdrop");
    if (!backdrop) return;
    const closeBtn = byId("superuserCloseNotificationModalBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", closeNotificationModal);
    }
    backdrop.addEventListener("click", function (event) {
      if (event.target === backdrop) {
        closeNotificationModal();
      }
    });
    window.addEventListener('resize', function () {
      if (!backdrop.classList.contains('hidden')) positionNotificationModal();
    });
    window.addEventListener('scroll', function () {
      if (!backdrop.classList.contains('hidden')) positionNotificationModal();
    }, true);
  }

  function buildStatCard(title, value, label, icon, extraClass) {
    return '<div class="superuser-stat-card ' + (extraClass || '') + '"><div class="superuser-stat-head"><span>' + title + '</span><span>' + icon + '</span></div><h3>' + value + '</h3><p>' + label + '</p></div>';
  }

  function dashboardReadJson(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function dashboardStorageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function dashboardUnique(records, identity) {
    const seen = {};
    return records.filter(function (record) {
      const key = identity(record);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function dashboardDate(value) {
    const text = String(value || "").trim();
    if (!text || text === "-") return null;
    let match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    match = text.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function dashboardBookings() {
    return canonicalBookings();
  }

  function dashboardCustomers() {
    const appData = dashboardReadJson("serveEaseData", {}) || {};
    if (window.ServeEaseDataCompletion && typeof window.ServeEaseDataCompletion.getCanonicalCustomers === "function") {
      return window.ServeEaseDataCompletion.getCanonicalCustomers(appData);
    }
    const users = appData.users;
    return dashboardUnique((Array.isArray(users) ? users : []).filter(function (user) {
      return user && String(user.role || "").toLowerCase() === "customer";
    }), function (user) { return String(user.id || user.email || "").toLowerCase(); });
  }

  function dashboardProviders() {
    const appData = dashboardReadJson("serveEaseData", {}) || {};
    if (window.ServeEaseDataCompletion && typeof window.ServeEaseDataCompletion.getCanonicalProviders === "function") {
      return window.ServeEaseDataCompletion.getCanonicalProviders(appData);
    }
    const candidates = [];
    [appData.users, appData.providers, appData.providerApprovalRequests].forEach(function (records) {
      (Array.isArray(records) ? records : []).forEach(function (provider) {
        if (!provider) return;
        const isProviderUser = String(provider.role || "").toLowerCase() === "provider";
        const isRegisteredRecord = records === appData.providerApprovalRequests && !/^(cus|sup|sur)/i.test(String(provider.id || provider.providerId || ""));
        if (isProviderUser || isRegisteredRecord) candidates.push(provider);
      });
    });
    return dashboardUnique(candidates, function (provider) {
      return String(provider.id || provider.providerId || provider.email || provider.ownerProviderEmail || "").toLowerCase();
    });
  }

  function dashboardPendingProviders() {
    const appData = dashboardReadJson("serveEaseData", {}) || {};
    const requests = Array.isArray(appData.providerApprovalRequests) ? appData.providerApprovalRequests : [];
    const pending = requests.filter(function (provider) {
      const status = String(provider && (provider.verificationStatus || provider.approvalStatus || provider.accountStatus || provider.status) || "Pending").toLowerCase();
      return ["pending", "pending approval", "under verification", "under_review", "under review"].includes(status) && isValidPendingProviderRequest(provider, appData);
    });
    return dashboardUnique(pending, function (provider) { return String(provider.id || provider.providerId || provider.email || "").toLowerCase(); });
  }

  function dashboardCategory(booking) {
    return String(booking && (booking.category || booking.serviceType || booking.service) || "").trim().replace(/\s+/g, " ");
  }

  function dashboardCategoryKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "").replace(/[\/_-]/g, "");
  }

  function dashboardProviderEarningsRecords() {
    const records = [];
    dashboardStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      const data = dashboardReadJson(key, {}) || {};
      (Array.isArray(data.transactions) ? data.transactions : []).forEach(function (transaction) {
        if (transaction) records.push(transaction);
      });
    });
    return dashboardUnique(records, function (transaction) {
      return String(transaction.id || "") + "|" + String(transaction.bookingRef || transaction.bookingReference || "");
    });
  }

  function dashboardCategoryCounts(bookings) {
    const appData = dashboardReadJson("serveEaseData", {}) || {};
    const configured = Array.isArray(appData.categories) ? appData.categories : [];
    const categories = dashboardUnique(configured.filter(function (category) {
      return category && (category.id || category.name);
    }), function (category) {
      return dashboardCategoryKey(category.id || category.name);
    });
    const lookup = {};
    const counts = {};
    categories.forEach(function (category) {
      const name = String(category.name || category.id).trim();
      const key = dashboardCategoryKey(name);
      const aliases = [name, category.id].concat(Array.isArray(category.subServices) ? category.subServices : []);
      aliases.filter(Boolean).forEach(function (alias) { lookup[dashboardCategoryKey(alias)] = name; });
      counts[name] = 0;
    });
    const bookingMap = {};
    bookings.forEach(function (booking) {
      const id = String(booking.id || booking.bookingRef || booking.bookingReference || "").toLowerCase();
      if (id) bookingMap[id] = booking;
    });
    const transactionMap = {};
    dashboardProviderEarningsRecords().forEach(function (transaction) {
      const transactionKey = String(transaction.bookingRef || transaction.bookingReference || "").toLowerCase();
      if (transactionKey) transactionMap[transactionKey] = transaction;
    });
    const seenBookings = {};
    const providerEarnings = window.ServeEaseFinanceMetrics && typeof window.ServeEaseFinanceMetrics.getProviderEarningsRows === "function"
      ? window.ServeEaseFinanceMetrics.getProviderEarningsRows() : [];
    let unresolvedCount = 0;
    providerEarnings.forEach(function (earning) {
      const bookingRef = String(earning.booking || "").trim();
      const linkedBooking = bookingMap[bookingRef.toLowerCase()];
      const transaction = transactionMap[bookingRef.toLowerCase()] || {};
      const candidates = [
        linkedBooking && linkedBooking.category,
        linkedBooking && linkedBooking.serviceType,
        linkedBooking && linkedBooking.service,
        transaction.category,
        transaction.serviceType,
        transaction.service
      ];
      const matched = candidates.map(dashboardCategoryKey).map(function (key) { return lookup[key]; }).find(Boolean);
      const uniqueBookingId = (bookingRef || earning.id || "").toLowerCase();
      if (matched && uniqueBookingId && !seenBookings[uniqueBookingId]) {
        counts[matched] += 1;
        seenBookings[uniqueBookingId] = true;
      } else if (!matched) {
        unresolvedCount += 1;
      }
    });
    const categoryTotal = Object.keys(counts).reduce(function (sum, name) { return sum + counts[name]; }, 0);
    if (unresolvedCount) console.warn("Unresolved Finance category records: " + unresolvedCount);
    if (categoryTotal !== providerEarnings.length) {
      console.error("Finance category reconciliation mismatch: Provider Earnings = " + providerEarnings.length + ", Categorized = " + categoryTotal);
    }
    return categories.map(function (category) {
      const name = String(category.name || category.id).trim();
      return { name: name, bookings: counts[name] || 0 };
    });
  }

  function dashboardStatus(booking) {
    return String(booking && (booking.status || booking.bookingStatus || booking.paymentStatus) || "Unknown").trim().replace(/\s+/g, " ");
  }

  function dashboardBookingTrend(bookings) {
    const grouped = {};
    bookings.forEach(function (booking) {
      const date = dashboardDate(booking.createdAt || booking.createdDate || booking.date || booking.serviceDate || booking.bookingDate);
      if (!date) return;
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      grouped[key] = (grouped[key] || 0) + 1;
    });
    return Object.keys(grouped).sort().map(function (key) {
      const parts = key.split("-");
      return { label: new Date(Number(parts[0]), Number(parts[1]) - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" }), value: grouped[key] };
    });
  }

  function dashboardCounts(bookings, selector) {
    const counts = {};
    bookings.forEach(function (booking) {
      const value = selector(booking);
      if (value) counts[value] = (counts[value] || 0) + 1;
    });
    return Object.keys(counts).sort().map(function (name) { return { name: name, bookings: counts[name] }; });
  }

  function renderResponseMetric() {
    const node = byId("superuserResponseTime");
    if (!node) return;
    const metrics = window.ServeEaseApi && typeof window.ServeEaseApi.getResponseMetrics === "function"
      ? window.ServeEaseApi.getResponseMetrics() : null;
    if (!metrics || !metrics.count || metrics.averageMs == null) {
      node.textContent = "No response data yet";
      node.removeAttribute("title");
      return;
    }
    node.textContent = Math.round(metrics.averageMs) + " ms";
    node.title = "Measured from " + metrics.count + " API request" + (metrics.count === 1 ? "" : "s");
  }

  function renderDashboard() {
    const statsGrid = byId("superuserStatsGrid");
    if (!statsGrid) return;
    const data = getData() || {};
    const bookings = dashboardBookings();
    const customers = dashboardCustomers();
    const providers = dashboardProviders();
    const pending = dashboardPendingProviders();
    const revenue = window.ServeEaseFinanceMetrics && typeof window.ServeEaseFinanceMetrics.calculatePlatformRevenue === "function"
      ? window.ServeEaseFinanceMetrics.calculatePlatformRevenue()
      : (window.ServeEaseFinanceMetrics && typeof window.ServeEaseFinanceMetrics.calculatePlatformCommission === "function"
        ? window.ServeEaseFinanceMetrics.calculatePlatformCommission() : null);
    const revenueValue = revenue == null ? "Unavailable" : "₹" + revenue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    statsGrid.innerHTML = [
      buildStatCard("", customers.length.toLocaleString(), "Registered Customers", "Users"),
      buildStatCard("", providers.length.toLocaleString(), "Service Providers", "Pros"),
      buildStatCard("", bookings.length.toLocaleString(), "Total Bookings", "Jobs"),
      buildStatCard("", revenueValue, "Platform Revenue (15%)", "INR"),
      buildStatCard("", pending.length.toLocaleString(), "Pending Verifications", "Docs", "warning")
    ].join("");
    renderResponseMetric();
    renderNotifications();
    if (window.location.hash === '#notifications') {
      setTimeout(function () {
        const panel = document.querySelector('.superuser-notification-card');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    renderLineChart(dashboardBookingTrend(bookings));
    renderBarChart(dashboardCategoryCounts(bookings));
    renderPieChart(dashboardCounts(bookings, dashboardStatus));
    renderActivities();
    renderRecentRegistrations();
    setupDashboardShortcuts();
    setupGlobalSearch();
  }

  function renderLineChart(points) {
    const host = byId("superuserLineChart");
    if (!host) return;
    if (!points.length) { host.innerHTML = '<div class="superuser-empty-state">No booking data available.</div>'; return; }
    const values = points.map(function (point) { return point.value; });
    const max = Math.max.apply(null, values) * 1.1 || 1;
    const width = 640; const height = 220; const paddingX = 25; const stepX = points.length === 1 ? 0 : (width - paddingX * 2) / (points.length - 1); const drawHeight = 175;
    let path = ""; let labelsMarkup = "";
    points.forEach(function (point, index) {
      const x = paddingX + index * stepX; const y = 195 - (point.value / max) * drawHeight;
      path += (index === 0 ? "M" : " L") + x + " " + y;
      labelsMarkup += '<text x="' + x + '" y="215" text-anchor="middle" font-size="12" fill="#6c7b92">' + point.label + '</text><g class="superuser-chart-point"><circle cx="' + x + '" cy="' + y + '" r="5" fill="#3766ff"></circle><text class="superuser-chart-tooltip" x="' + x + '" y="' + (y - 12) + '" text-anchor="middle">' + point.value + '</text></g>';
    });
    host.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none"><path d="' + path + '" fill="none" stroke="#3766ff" stroke-width="3"></path>' + labelsMarkup + '</svg>';
  }

  function renderBarChart(items) {
    const host = byId("superuserBarChart");
    if (!host) return;
    if (!items.length) { host.innerHTML = '<div class="superuser-empty-state">No booking category data available.</div>'; return; }
    host.classList.add("superuser-horizontal-bar-chart");
    const max = Math.max.apply(null, items.map(function (item) { return item.bookings; })) || 1;
    const width = 760; const rowHeight = 42; const height = Math.max(220, items.length * rowHeight + 24);
    const labelWidth = 245; const barWidth = width - labelWidth - 55; let body = "";
    items.forEach(function (item, index) {
      const y = 18 + index * rowHeight; const barHeight = 22; const currentWidth = Math.max(3, (item.bookings / max) * barWidth);
      body += '<text x="0" y="' + (y + 16) + '" font-size="13" fill="#13294b">' + item.name + '</text>';
      body += '<rect x="' + labelWidth + '" y="' + y + '" width="' + currentWidth + '" height="' + barHeight + '" rx="11" fill="#7656d6"></rect>';
      body += '<text x="' + (labelWidth + currentWidth + 10) + '" y="' + (y + 16) + '" font-size="13" font-weight="700" fill="#13294b">' + item.bookings + '</text>';
    });
    host.style.height = height + "px";
    host.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="xMinYMin meet" role="img" aria-label="Bookings per service category">' + body + '</svg>';
  }

  function renderPieChart(items) {
    const host = byId("superuserPieChart");
    if (!host) return;
    if (!items.length) { host.innerHTML = '<div class="superuser-empty-state">No booking status data available.</div>'; return; }
    const total = items.reduce(function (sum, item) { return sum + item.bookings; }, 0) || 1; const size = 210; const cx = size / 2; const cy = size / 2; const r = 88;
    function point(angle) { const radians = (angle - 90) * Math.PI / 180; return { x: cx + r * Math.cos(radians), y: cy + r * Math.sin(radians) }; }
    const colors = ["#1fba82", "#f34242", "#4a7fe6", "#8a5cf6", "#f59e0b", "#64748b"];
    let start = 0; let paths = ""; let highlights = "";
    items.forEach(function (item, index) { const color = colors[index % colors.length]; const end = start + item.bookings / total * 360; const a = point(end); const b = point(start); const large = end - start > 180 ? 1 : 0; paths += '<path d="M ' + cx + ' ' + cy + ' L ' + a.x + ' ' + a.y + ' A ' + r + ' ' + r + ' 0 ' + large + ' 0 ' + b.x + ' ' + b.y + ' Z" fill="' + color + '" stroke="#ffffff" stroke-width="2"></path>'; highlights += '<div class="superuser-pie-highlight"><span class="superuser-pie-dot" style="background:' + color + '"></span><strong>' + item.name + '</strong><span>' + item.bookings + '</span></div>'; start = end; });
    host.innerHTML = '<div class="superuser-pie-card-layout"><div class="superuser-pie-graphic"><svg viewBox="0 0 ' + size + ' ' + size + '" preserveAspectRatio="xMidYMid meet" aria-label="Booking status distribution pie chart">' + paths + '</svg></div><div class="superuser-pie-highlights">' + highlights + '</div></div>';
  }

  function renderActivities() {
    const list = byId("superuserActivityList");
    if (!list) return;
    function draw(items) {
      const unique = {};
      const valid = (Array.isArray(items) ? items : []).filter(function (item) {
        const key = String(item.id || [item.action, item.details, item.createdAt].join('|'));
        if (!item.createdAt || unique[key] || String(item.action || '').toLowerCase() === 'state_saved' || String(item.action || '').toLowerCase() === 'state_removed') return false;
        unique[key] = true;
        return true;
      });
      if (!valid.length) { list.innerHTML = '<div class="superuser-empty-state">No recent platform activity.</div>'; return; }
      list.innerHTML = valid.slice(0, 8).map(function (item) {
        const label = item.details ? item.action + ' — ' + item.details : (item.action || 'Activity');
        return '<div class="superuser-activity-item"><div class="superuser-activity-icon blue">•</div><div class="superuser-activity-content"><strong>' + label + '</strong><span>' + formatRelativeTime(item.createdAt) + '</span></div></div>';
      }).join('');
    }
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getActivities !== "function") { draw((getData().activities || [])); return; }
    window.ServeEaseApi.getActivities().then(function (items) {
      draw(items && items.length ? items : (getData().activities || []));
    }).catch(function () { draw(getData().activities || []); });
  }

  function renderRecentRegistrations() {
    const tbody = byId("superuserRecentRegistrations");
    if (!tbody) return;
    const appData = dashboardReadJson("serveEaseData", {}) || {};
    const records = [];
    (Array.isArray(appData.users) ? appData.users : []).forEach(function (item) { if (item && item.role === "customer") records.push({ item: item, role: "Customer", date: dashboardDate(item.registrationDate || item.createdAt) }); });
    (Array.isArray(appData.providerApprovalRequests) ? appData.providerApprovalRequests : []).forEach(function (item) { if (item) records.push({ item: item, role: "Provider", date: dashboardDate(item.registrationDate || item.submittedDate || item.createdAt) }); });
    records.sort(function (a, b) { return (b.date ? b.date.getTime() : 0) - (a.date ? a.date.getTime() : 0); });
    if (!records.length) { tbody.innerHTML = '<tr><td colspan="4"><div class="superuser-empty-state">No registration data available.</div></td></tr>'; return; }
    tbody.innerHTML = records.slice(0, 8).map(function (record) { const item = record.item; const status = item.status || item.approvalStatus || item.verificationStatus || "Active"; const date = record.date ? formatDisplayDate(item.registrationDate || item.submittedDate || item.createdAt) : "N/A"; return '<tr><td>' + (item.fullName || item.name || "User") + '</td><td><span class="superuser-chip ' + record.role.toLowerCase() + '">' + record.role + '</span></td><td>' + date + '</td><td><span class="superuser-chip ' + chipClass(status) + '">' + status + '</span></td></tr>'; }).join("");
  }

  function setupDashboardShortcuts() {}

  function setupGlobalSearch() {
    const input = byId("superuserGlobalSearch");
    if (!input) return;
    input.addEventListener("keydown", function (event) {
      if (event.key !== 'Enter') return;
      const term = input.value.trim().toLowerCase();
      if (!term) return;
      if (term.includes('ticket')) {
        window.location.href = 'superuser-escalated-tickets.html';
      } else if (term.includes('booking')) {
        window.location.href = 'superuser-bookings.html';
      } else {
        window.location.href = 'superuser-management.html';
      }
    });
  }

  function renderCategoriesPage() {
    const categoryGrid = byId('superuserCategoryGrid');
    const customerBody = byId('superuserCustomerTableBody');
    if (!categoryGrid || customerBody) return;
    renderNotifications();
    renderCategories();
    updateManagementCounts();
    bindCategoryModalTriggers();
    setupCategorySearch();
  }

  function renderManagement() {
    const customerBody = byId("superuserCustomerTableBody");
    if (!customerBody) return;
    renderNotifications();
    setupManagementSearch();
    setupManagementTabs();
    renderCustomers(false);
    renderPendingProviders();
    renderProviders();
    if (byId('superuserCategoryGrid')) renderCategories();
    updateManagementCounts();
    bindCategoryModalTriggers();
    setupCategorySearch();
  }

  function getManagementSearchTerm() {
    var input = byId('superuserManagementSearch');
    return input ? input.value.trim().toLowerCase() : '';
  }

  function getTableSearchTerm(id) {
    var input = byId(id);
    return input ? input.value.trim().toLowerCase() : '';
  }

  function matchesManagementSearch(haystack, term) {
    var value = String(haystack || '').toLowerCase();
    return !term || term.split(/\s+/).filter(Boolean).every(function (part) { return value.indexOf(part) !== -1; });
  }

  function getCustomerStatusFilter() {
    var sel = byId('superuserCustomerStatusFilter');
    return sel ? sel.value : 'all';
  }

  function getProviderStatusFilter() {
    var sel = byId('superuserProviderStatusFilter');
    return sel ? sel.value : 'all';
  }

  function setupManagementTabs() {
    var customerTab = byId('superuserCustomersTab');
    var providerTab = byId('superuserProvidersTab');
    var customerPanel = byId('superuserCustomerManagementPanel');
    var providerPanel = byId('superuserProviderManagementPanel');
    var pendingPanel = byId('superuserPendingProviderPanel');
    if (!customerTab || !providerTab || !customerPanel || !providerPanel) return;

    function showTab(type) {
      var customers = type === 'customers';
      customerPanel.classList.toggle('hidden', !customers);
      providerPanel.classList.toggle('hidden', customers);
      if (pendingPanel) pendingPanel.classList.toggle('hidden', customers);
      customerTab.classList.toggle('btn-primary', customers);
      customerTab.classList.toggle('btn-outline', !customers);
      providerTab.classList.toggle('btn-primary', !customers);
      providerTab.classList.toggle('btn-outline', customers);
      customerTab.setAttribute('aria-selected', customers ? 'true' : 'false');
      providerTab.setAttribute('aria-selected', customers ? 'false' : 'true');
    }

    if (!customerTab.dataset.bound) {
      customerTab.dataset.bound = 'true';
      customerTab.addEventListener('click', function () { showTab('customers'); });
      providerTab.addEventListener('click', function () { showTab('providers'); });
    }
    showTab('customers');
  }

  function getCatalogCategoryName(categoryId) {
    const appData = getAppData();
    const category = (appData.categories || []).find(function (item) {
      return item.id === categoryId;
    });
    return category ? category.name : categoryId || 'Home Service';
  }

  function getCityNameFromProvider(provider) {
    const cityMap = { 1: 'Chennai', 2: 'Bangalore', 3: 'Hyderabad', 4: 'Delhi', 5: 'Mumbai' };
    return cityMap[Number(provider.cityId)] || provider.location || 'N/A';
  }

  function isVerifiedProviderRequest(request) {
    return request && (
      request.approvalStatus === 'Active' ||
      request.approvalStatus === 'Approved' ||
      request.verificationStatus === 'Verified'
    );
  }

  function normalizeProviderStatus(provider) {
    if (provider.status) return provider.status;
    if (provider.verificationStatus === 'Verified' || provider.approvalStatus === 'Approved') return 'Active';
    if (provider.approvalStatus) return provider.approvalStatus;
    return provider.verified === false ? 'Pending' : 'Active';
  }

  function getPendingVerificationCount() {
    return dashboardPendingProviders().length;
  }

  function getManagementProviders() {
    const appData = getAppData();
    const registeredUsers = Array.isArray(appData.users) ? appData.users : [];
    return dashboardProviders()
      .filter(function (provider) { return provider && (provider.id || provider.providerId || provider.email); })
      .map(function (provider) {
        const isCatalogProvider = !!provider.name && !provider.fullName;
        const linkedUser = registeredUsers.find(function (user) {
          return (provider.id && (user.id === provider.id || user.providerId === provider.id)) ||
            (provider.email && user.email && user.email.toLowerCase() === provider.email.toLowerCase());
        });
        return {
          id: provider.id || provider.providerId || provider.email,
          fullName: provider.fullName || provider.name || 'Provider',
          organisationName: provider.organisationName || provider.name || provider.fullName || 'Provider',
          email: provider.email || provider.ownerProviderEmail || 'N/A',
          phone: resolveProviderPhone(provider, linkedUser),
          category: isCatalogProvider ? getCatalogCategoryName(provider.category) : (provider.serviceType || provider.category || 'N/A'),
          experience: Number(provider.experience || provider.years) || 0,
          location: getCityNameFromProvider(provider),
          registrationDate: provider.registrationDate || provider.registeredAt || provider.createdAt || provider.submittedDate || 'N/A',
          status: normalizeProviderStatus(provider),
          source: isCatalogProvider ? 'catalog' : 'management'
        };
      });
  }

  function resolveProviderPhone(provider, linkedUser) {
    if (provider && (provider.phone || provider.phoneNumber)) return provider.phone || provider.phoneNumber;
    if (linkedUser && (linkedUser.phone || linkedUser.phoneNumber)) return linkedUser.phone || linkedUser.phoneNumber;
    var matchedPhone = '';
    dashboardStorageKeys('serveEaseProviderModuleData').some(function (key) {
      const moduleData = dashboardReadJson(key, {}) || {};
      const profile = moduleData.profile || moduleData.provider || moduleData.user || moduleData;
      const matches = profile && ((provider.id && (profile.id === provider.id || profile.providerId === provider.id)) ||
        (provider.email && profile.email && String(profile.email).toLowerCase() === String(provider.email).toLowerCase()));
      if (matches && (profile.phone || profile.phoneNumber || moduleData.phone)) {
        matchedPhone = profile.phone || profile.phoneNumber || moduleData.phone;
        return true;
      }
      return false;
    });
    if (matchedPhone) return matchedPhone;
    return 'N/A';
  }

  function refreshManagementTables() {
    var globalTerm = getManagementSearchTerm();
    renderCustomers(false, [globalTerm, getTableSearchTerm('superuserCustomerSearch')].filter(Boolean).join(' '));
    renderPendingProviders([globalTerm, getTableSearchTerm('superuserProviderSearch')].filter(Boolean).join(' '));
    renderProviders([globalTerm, getTableSearchTerm('superuserProviderSearch')].filter(Boolean).join(' '));
    if (byId('superuserCategoryGrid')) renderCategories(globalTerm);
    updateManagementCounts();
  }

  function setupManagementSearch() {
    const input = byId("superuserManagementSearch");
    if (input) {
      input.addEventListener("input", refreshManagementTables);
    }
    ['superuserCustomerSearch', 'superuserProviderSearch'].forEach(function (id) {
      var search = byId(id);
      if (search) search.addEventListener('input', refreshManagementTables);
    });
    var custFilter = byId('superuserCustomerStatusFilter');
    if (custFilter) {
      custFilter.addEventListener('change', refreshManagementTables);
    }
    var provFilter = byId('superuserProviderStatusFilter');
    if (provFilter) {
      provFilter.addEventListener('change', refreshManagementTables);
    }
  }

  function renderCustomers(showAll, term) {
    const tbody = byId("superuserCustomerTableBody");
    const showMoreBtn = byId("superuserShowMoreCustomersBtn");
    if (!tbody) return;
    const customers = dashboardCustomers();
    var statusFilter = getCustomerStatusFilter();
    const filtered = customers.filter(function (item) {
      const status = item.status || item.accountStatus || 'Active';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      const hay = [item.fullName, item.email, item.phone, item.status].join(' ').toLowerCase();
      return matchesManagementSearch(hay, term);
    });
    var countEl = byId('superuserCustomerCount');
    if (countEl) countEl.textContent = filtered.length;
    const rows = (showAll ? filtered : filtered.slice(0, 10)).map(function (item) {
      const status = item.status || item.accountStatus || 'Active';
      return '<tr><td>' + (item.fullName || item.name || 'Customer') + '</td><td>' + (item.email || 'N/A') + '</td><td>' + (item.phone || item.phoneNumber || 'N/A') + '</td><td>' + formatDisplayDate(item.registrationDate || item.createdAt) + '</td><td><span class="superuser-chip ' + chipClass(status) + '">' + status + '</span></td><td><button class="superuser-inline-action" type="button" data-customer-action-id="' + item.id + '">◉</button></td></tr>';
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="6"><div class="superuser-empty-state">No customers found for the current filter.</div></td></tr>';
    tbody.querySelectorAll('button[data-customer-action-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        const customer = customers.find(function (item) { return item.id === button.dataset.customerActionId; });
        if (customer) openUserModal(customer);
      });
    });
    if (showMoreBtn) {
      showMoreBtn.onclick = function () { renderCustomers(true, term); };
      showMoreBtn.classList.toggle('hidden', filtered.length <= 10 || showAll);
    }
  }

  function renderPendingProviders(term) {
    const list = byId("superuserPendingProviderList");
    if (!list) return;
    const filtered = dashboardPendingProviders().map(normalizeProviderApproval).filter(function (item) {
      const hay = [item.fullName, item.email, item.location, item.category].join(' ').toLowerCase();
      return matchesManagementSearch(hay, term);
    });
    list.innerHTML = filtered.map(function (item) {
      var orgLine = item.organisationName ? '<p class="superuser-provider-org">🏢 ' + item.organisationName + '</p>' : '';
      return '<article class="superuser-provider-card"><div class="superuser-provider-main"><h3>' + item.fullName + ' <span class="superuser-chip pending">Pending Approval</span></h3>' + orgLine + '<p>✉ ' + item.email + '</p><p>🏬 ' + item.category + '</p><p>◷ ' + item.experience + ' years Experience</p></div><div class="superuser-provider-meta"><p>☎ ' + item.phone + '</p><p>⌖ ' + item.location + '</p><p>🗓 Registered: ' + formatDisplayDate(item.registrationDate) + '</p></div><div class="superuser-provider-actions"><button class="superuser-inline-action" type="button" data-provider-id="' + item.id + '">◉ View Details</button><button class="btn superuser-success-btn" type="button" data-provider-approve="' + item.id + '">✓ Approve</button><button class="btn superuser-danger-outline-btn" type="button" data-provider-reject="' + item.id + '">⊘ Reject</button></div></article>';
    }).join('') || '<div class="superuser-empty-state">No pending providers found.</div>';
    list.querySelectorAll('[data-provider-id]').forEach(function (button) {
      button.addEventListener('click', function () { openProviderModal(button.dataset.providerId); });
    });
    list.querySelectorAll('[data-provider-approve]').forEach(function (button) {
      button.addEventListener('click', function () { approveProvider(button.dataset.providerApprove); });
    });
    list.querySelectorAll('[data-provider-reject]').forEach(function (button) {
      button.addEventListener('click', function () { rejectProvider(button.dataset.providerReject); });
    });
  }

  function renderProviders(term) {
    const tbody = byId("superuserProviderTableBody");
    if (!tbody) return;
    var statusFilter = getProviderStatusFilter();
    const filtered = getManagementProviders().filter(function (item) {
      var providerStatus = item.status || 'Active';
      if (statusFilter !== 'all' && providerStatus !== statusFilter) return false;
      const hay = [item.id, item.fullName, item.organisationName, item.email, item.phone, item.category, item.location].join(' ').toLowerCase();
      return matchesManagementSearch(hay, term);
    });
    managementProviderRows = filtered;
    var countEl = byId('superuserProviderCount');
    if (countEl) countEl.textContent = filtered.length;
    tbody.innerHTML = filtered.map(function (item) {
      var orgName = item.organisationName || 'N/A';
      var providerStatus = item.status || item.approvalStatus || 'Active';
      return '<tr><td>' + item.id + '</td><td><div class="superuser-provider-name-block"><span>' + item.fullName + '</span></div></td><td>' + orgName + '</td><td>' + item.email + '</td><td>' + (item.phone || 'N/A') + '</td><td>' + item.category + '</td><td><span class="superuser-chip ' + chipClass(providerStatus) + '">' + providerStatus + '</span></td><td><button class="superuser-inline-action" type="button" data-provider-action-id="' + item.id + '">◉ View</button></td></tr>';
    }).join('') || '<tr><td colspan="8"><div class="superuser-empty-state">No providers found for the current filter.</div></td></tr>';
    tbody.querySelectorAll('[data-provider-action-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        openManagementProviderDetails(button.dataset.providerActionId);
      });
    });
  }

  function openManagementProviderDetails(providerId) {
    const provider = managementProviderRows.find(function (item) { return item.id === providerId; });
    if (!provider) return;
    selectedUserId = provider.id;
    byId('superuserUserModalName').textContent = provider.fullName;
    byId('superuserUserModalRole').textContent = 'Provider Details';
    const registrationDate = provider.registrationDate && provider.registrationDate !== 'N/A'
      ? formatDisplayDate(provider.registrationDate) : 'N/A';
    byId('superuserUserRegistrationDate').textContent = registrationDate || 'N/A';
    const badge = byId('superuserUserStatusBadge');
    const providerStatus = provider.status || 'Active';
    badge.className = 'superuser-chip ' + chipClass(providerStatus);
    badge.textContent = providerStatus;
    const details = byId('superuserProviderUserDetails');
    const detailsGrid = byId('superuserProviderUserDetailsGrid');
    if (details && detailsGrid) {
      detailsGrid.innerHTML = [
        ['Provider ID', provider.id],
        ['Name', provider.fullName],
        ['Organisation', provider.organisationName],
        ['Email', provider.email],
        ['Phone', provider.phone],
        ['Service Category', provider.category],
        ['Experience', provider.experience ? provider.experience + ' years' : 'N/A'],
        ['Location', provider.location],
        ['Registration Date', registrationDate || 'N/A']
      ].map(function (field) {
        return '<div class="superuser-detail-field"><span>' + field[0] + '</span><strong>' + (field[1] || 'N/A') + '</strong></div>';
      }).join('');
      details.classList.remove('hidden');
    }
    const reasonWrap = byId('superuserBlockReasonWrap');
    const inputSection = byId('superuserBlockReasonInputSection');
    const reasonInput = byId('superuserBlockReasonInput');
    const remarksInput = byId('superuserAdminRemarksInput');
    const reasonError = byId('superuserBlockReasonError');
    const reasonLabel = document.querySelector('label[for="superuserBlockReasonInput"]');
    if (reasonWrap) reasonWrap.classList.remove('hidden');
    if (inputSection) inputSection.classList.remove('hidden');
    if (reasonInput) { reasonInput.value = ''; reasonInput.placeholder = providerStatus === 'Suspended' ? 'Required activation reason' : 'Required suspension reason'; }
    if (remarksInput) remarksInput.value = '';
    if (reasonError) reasonError.textContent = '';
    if (reasonLabel) reasonLabel.textContent = (providerStatus === 'Suspended' ? 'Reason for Activate Provider ' : 'Reason for Suspend Provider ') + '*';
    const toggleBtn = byId('superuserUserStatusToggleBtn');
    const actionsSection = byId('superuserUserActionsSection');
    const appData = getAppData();
    const data = getData();
    const supportsAccountAction = Boolean(
      (Array.isArray(appData.users) && appData.users.some(function (user) { return user.id === provider.id; })) ||
      (Array.isArray(data.providers) && data.providers.some(function (item) { return item.id === provider.id; }))
    );
    const canToggle = supportsAccountAction && (providerStatus === 'Active' || providerStatus === 'Suspended');
    if (actionsSection) actionsSection.classList.toggle('hidden', !canToggle);
    if (toggleBtn) {
      toggleBtn.classList.toggle('hidden', !canToggle);
      if (canToggle) {
        const suspended = providerStatus === 'Suspended';
        toggleBtn.className = 'btn btn-full ' + (suspended ? 'superuser-success-btn' : 'superuser-danger-btn');
        toggleBtn.textContent = suspended ? '◎ Activate Provider' : '⊘ Suspend Provider';
        toggleBtn.onclick = function () {
          const reason = reasonInput ? reasonInput.value.trim() : '';
          const remarks = remarksInput ? remarksInput.value.trim() : '';
          if (!reason) { if (reasonError) reasonError.textContent = (suspended ? 'Activation' : 'Suspension') + ' reason is required.'; return; }
          const operations = window.ServeEaseProviderOperations;
          const result = operations && (suspended ? operations.activateProvider(provider.id, reason, remarks) : operations.suspendProvider(provider.id, reason, remarks));
          if (!result || !result.ok) { if (reasonError) reasonError.textContent = (result && result.message) || 'Unable to update provider status.'; return; }
          refreshManagementTables();
          openManagementProviderDetails(provider.id);
        };
      }
    }
    const registrationSection = byId('superuserUserRegistrationSection');
    const statusSection = byId('superuserUserStatusSection');
    if (registrationSection) registrationSection.classList.remove('hidden');
    if (statusSection) statusSection.classList.remove('hidden');
    openModal('superuserUserModalBackdrop');
  }

  function renderCategories(term) {
    const grid = byId("superuserCategoryGrid");
    if (!grid) return;
    syncServiceCategoriesFromCatalog();
    const data = getData();
    const filtered = data.categories.filter(function (item) {
      const hay = [item.name, item.description, (item.subServices || []).join(' ')].join(' ').toLowerCase();
      return !term || hay.includes(term);
    });
    grid.innerHTML = filtered.map(function (item) {
      var subServices = Array.isArray(item.subServices) && item.subServices.length
        ? '<div class="superuser-category-subservices">' + item.subServices.map(function (service) {
            return '<span>' + service + '</span>';
          }).join('') + '</div>'
        : '<div class="superuser-category-subservices empty">No subcategories added</div>';
      return '<article class="superuser-category-card"><div class="superuser-category-card-top"><div><h3><span class="superuser-category-icon">' + (item.icon || 'SE') + '</span>' + item.name + '</h3><p class="superuser-category-description">' + (item.description || 'No description added.') + '</p>' + subServices + '</div><div class="superuser-category-actions"><button class="superuser-category-action" type="button" title="Edit" data-category-edit="' + item.id + '">✎</button><button class="superuser-category-action" type="button" title="Delete" data-category-delete="' + item.id + '">🗑</button></div></div></article>';
    }).join('') || '<div class="superuser-empty-state">No categories found.</div>';
    grid.querySelectorAll('[data-category-edit]').forEach(function (button) {
      button.addEventListener('click', function () { openCategoryModal(button.dataset.categoryEdit); });
    });
    grid.querySelectorAll('[data-category-delete]').forEach(function (button) {
      button.addEventListener('click', function () { deleteCategory(button.dataset.categoryDelete); });
    });
  }

  function updateManagementCounts() {
    const data = getData();
    const providerCount = getManagementProviders().length;
    const pendingVerificationCount = getPendingVerificationCount();
    if (byId('superuserPendingProviderCount')) byId('superuserPendingProviderCount').textContent = pendingVerificationCount;
    if (byId('superuserQuickCustomerCount')) byId('superuserQuickCustomerCount').textContent = dashboardCustomers().length;
    if (byId('superuserQuickProviderCount')) byId('superuserQuickProviderCount').textContent = providerCount;
    if (byId('superuserQuickPendingCount')) byId('superuserQuickPendingCount').textContent = pendingVerificationCount;
    if (byId('superuserQuickCategoryCount')) byId('superuserQuickCategoryCount').textContent = data.categories.length;
  }

  function bindCategoryModalTriggers() {
    [
      'superuserOpenCategoryModalBtn',
      'superuserOpenCategoryPageFormBtn'
    ].forEach(function (id) {
      const button = byId(id);
      if (button && !button.dataset.boundCategoryTrigger) {
        button.dataset.boundCategoryTrigger = 'true';
        button.addEventListener('click', function () { openCategoryModal(); });
      }
    });

    [
      'superuserCategoryInlineCancelBtn',
      'superuserCloseCategoryPageFormBtn'
    ].forEach(function (id) {
      const button = byId(id);
      if (button && !button.dataset.boundCategoryClose) {
        button.dataset.boundCategoryClose = 'true';
        button.addEventListener('click', closeCategoryForm);
      }
    });
  }

  function openUserModal(userId) {
    const data = getData();
    const appData = getAppData();
    const user = userId && typeof userId === 'object' ? userId :
      ((Array.isArray(appData.users) ? appData.users.find(function (item) { return item.id === userId; }) : null) ||
      data.customers.find(function (item) { return item.id === userId; }) || data.providers.find(function (item) { return item.id === userId; }));
    if (!user) return;
    selectedUserId = user.id;
    const isProvider = String(user.role || '').toLowerCase() === 'provider';
    const providerDetails = byId('superuserProviderUserDetails');
    if (providerDetails) providerDetails.classList.add('hidden');
    const actionsSection = byId('superuserUserActionsSection');
    if (actionsSection) actionsSection.classList.remove('hidden');
    const registrationSection = byId('superuserUserRegistrationSection');
    const statusSection = byId('superuserUserStatusSection');
    if (registrationSection) registrationSection.classList.remove('hidden');
    if (statusSection) statusSection.classList.remove('hidden');
    byId('superuserUserModalName').textContent = user.fullName;
    byId('superuserUserModalRole').textContent = (isProvider ? 'Provider Details' : 'Customer Details');
    byId('superuserUserRegistrationDate').textContent = formatDisplayDate(user.registrationDate);
    const badge = byId('superuserUserStatusBadge');
    badge.className = 'superuser-chip ' + chipClass(user.status || user.approvalStatus || 'Active');
    badge.textContent = user.status || user.approvalStatus || 'Active';

    const isBlocked = (user.status || user.accountStatus || user.approvalStatus || '') === 'Blocked';
    var reasonWrap = byId('superuserBlockReasonWrap');
    var inputSection = byId('superuserBlockReasonInputSection');
    var reasonInput = byId('superuserBlockReasonInput');
    var reasonError = byId('superuserBlockReasonError');
    var reasonCounter = byId('superuserBlockReasonCounter');
    var customerReasonLabel = document.querySelector('label[for="superuserBlockReasonInput"]');
    if (customerReasonLabel) customerReasonLabel.textContent = (isBlocked ? 'Reason for Activate Customer ' : 'Reason for Suspend Customer ') + '*';

    if (!isProvider && reasonWrap && reasonInput && inputSection) {
      reasonWrap.classList.remove('hidden');
      inputSection.classList.remove('hidden');
      reasonInput.value = '';
      reasonInput.placeholder = isBlocked ? 'Required activation reason' : 'Required suspension reason';
      reasonInput.classList.remove('error-field');
      if (reasonError) reasonError.textContent = '';
      if (reasonCounter) reasonCounter.textContent = '0 / 200';
        /* Wire character counter once — use a flag to avoid duplicate listeners */
        if (!reasonInput.dataset.counterBound) {
          reasonInput.dataset.counterBound = 'true';
          reasonInput.addEventListener('input', function () {
            /* Only allow letters, numbers, spaces, and basic punctuation */
            this.value = this.value.replace(/[^a-zA-Z0-9 .,!?'"()\-:;\n]/g, '');
            var len = this.value.length;
            if (reasonCounter) reasonCounter.textContent = len + ' / 200';
            if (reasonError && this.value.trim().length >= 5) {
              reasonError.textContent = '';
              this.classList.remove('error-field');
            }
          });
        }
    }

    const toggleBtn = byId('superuserUserStatusToggleBtn');
    if (!isProvider && toggleBtn) {
      toggleBtn.classList.remove('hidden');
      toggleBtn.className = 'btn btn-full ' + (isBlocked ? 'superuser-success-btn' : 'superuser-danger-btn');
      toggleBtn.textContent = isBlocked ? '◎ Activate Customer' : '⊘ Suspend Customer';
      toggleBtn.onclick = toggleUserStatus;
    }
    openModal('superuserUserModalBackdrop');
  }

  function toggleUserStatus() {
    const appData = getAppData();
    var appUser = Array.isArray(appData.users) ? appData.users.find(function (item) { return item.id === selectedUserId; }) : null;
    var user = appUser;
    if (!user || String(user.role || '').toLowerCase() !== 'customer') return;
    var currentStatus = user.status || user.approvalStatus || 'Active';
    var isCurrentlyBlocked = currentStatus === 'Blocked';
    var newStatus = isCurrentlyBlocked ? 'Active' : 'Blocked';

    var reasonInput = byId('superuserBlockReasonInput');
    var reasonError = byId('superuserBlockReasonError');
    var reason = reasonInput ? reasonInput.value.trim() : '';
    var remarks = byId('superuserAdminRemarksInput') ? byId('superuserAdminRemarksInput').value.trim() : '';
    var result = window.ServeEaseDataCompletion && window.ServeEaseDataCompletion.updateCustomerAccountStatus
      ? window.ServeEaseDataCompletion.updateCustomerAccountStatus(selectedUserId, newStatus, reason, remarks)
      : { ok: false, message: 'Customer status service is unavailable.' };
    if (!result.ok) {
      if (reasonError) reasonError.textContent = result.message;
      if (reasonInput) reasonInput.classList.add('error-field');
      return;
    }
    refreshManagementTables();
    openUserModal(selectedUserId);
    renderRecentRegistrations();
  }

  function openProviderModal(providerId) {
    const data = getData();
    const provider = data.pendingProviders.find(function (item) { return item.id === providerId; });
    if (!provider) return;
    selectedProviderId = provider.id;
    byId('superuserProviderModalName').textContent = provider.fullName;
    var orgInfo = provider.organisationName ? '<div class="superuser-detail-field"><span>Organisation:</span><strong>' + provider.organisationName + '</strong></div>' : '';
    byId('superuserProviderModalBody').innerHTML = '<section><h4>Provider Information</h4><div class="superuser-detail-grid">' + orgInfo + '<div class="superuser-detail-field"><span>Email:</span><strong>' + provider.email + '</strong></div><div class="superuser-detail-field"><span>Phone:</span><strong>' + provider.phone + '</strong></div><div class="superuser-detail-field"><span>Category:</span><strong>' + provider.category + '</strong></div><div class="superuser-detail-field"><span>Location:</span><strong>' + provider.location + '</strong></div><div class="superuser-detail-field"><span>Experience:</span><strong>' + provider.experience + ' years</strong></div><div class="superuser-detail-field"><span>Registered:</span><strong>' + formatDisplayDate(provider.registrationDate) + '</strong></div></div></section>';
    byId('superuserApproveProviderFromModalBtn').onclick = function () { approveProvider(provider.id, true); };
    byId('superuserRejectProviderFromModalBtn').onclick = function () { rejectProvider(provider.id, true); };
    openModal('superuserProviderApprovalModalBackdrop');
  }

  function approveProvider(providerId, closeAfter) {
    const data = getData();
    const index = data.pendingProviders.findIndex(function (item) { return item.id === providerId; });
    if (index === -1) return;
    const provider = data.pendingProviders.splice(index, 1)[0];
    provider.approvalStatus = 'Active';
    provider.status = 'Active';
    data.providers.unshift(provider);
    data.stats.pendingApprovals = data.pendingProviders.length;
    addNotification(data, { id: 'AN-provider-approved-' + provider.id, text: 'Provider approved - ' + provider.fullName, type: 'blue', referenceId: provider.id, actionPage: 'superuser-management.html' });
    setData(data);
    promoteProviderToActiveLogin(provider);
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    renderProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
    renderNotifications();
    if (closeAfter) closeModal('superuserProviderApprovalModalBackdrop');
  }

  function rejectProvider(providerId, closeAfter) {
    const data = getData();
    const rejectedProvider = data.pendingProviders.find(function (item) { return item.id === providerId; });
    data.pendingProviders = data.pendingProviders.filter(function (item) { return item.id !== providerId; });
    data.stats.pendingApprovals = data.pendingProviders.length;
    addNotification(data, { id: 'AN-provider-rejected-' + provider.id, text: 'Provider application rejected - ' + provider.fullName, type: 'red', referenceId: provider.id, actionPage: 'superuser-management.html' });
    setData(data);
    markProviderApprovalRejected(rejectedProvider);
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
    renderNotifications();
    if (closeAfter) closeModal('superuserProviderApprovalModalBackdrop');
  }

  function promoteProviderToActiveLogin(provider) {
    const appData = getAppData();
    if (!Array.isArray(appData.users)) appData.users = [];
    const requests = getProviderApprovalRequests(appData);
    const request = requests.find(function (item) {
      return item.email && provider.email && item.email.toLowerCase() === provider.email.toLowerCase();
    }) || provider;

    const activeUser = {
      ...request,
      id: request.id || provider.id,
      role: "provider",
      fullName: request.fullName || provider.fullName,
      email: request.email || provider.email,
      phone: request.phone || provider.phone || "",
      password: request.password || provider.password || "",
      organisationName: request.organisationName || provider.organisationName || "",
      serviceType: request.serviceType || provider.category || "",
      experience: Number(request.experience || provider.experience) || 0,
      cityId: request.cityId || provider.cityId || "",
      cityName: request.cityName || provider.cityName || provider.location || "",
      location: request.location || provider.location || request.cityName || "",
      address: request.address || provider.address || "",
      providerCatalogId: request.providerCatalogId || provider.providerCatalogId || "",
      approvalStatus: "Active"
    };

    appData.users = appData.users.filter(function (user) {
      return !(user.email && activeUser.email && user.email.toLowerCase() === activeUser.email.toLowerCase());
    });
    appData.users.push(activeUser);

    appData.providerApprovalRequests = requests.filter(function (item) {
      return !(item.email && activeUser.email && item.email.toLowerCase() === activeUser.email.toLowerCase());
    });

    setAppData(appData);
  }

  function markProviderApprovalRejected(provider) {
    if (!provider) return;
    const appData = getAppData();
    const requests = getProviderApprovalRequests(appData);
    const request = requests.find(function (item) {
      return item.email && provider.email && item.email.toLowerCase() === provider.email.toLowerCase();
    });

    if (request) {
      request.approvalStatus = "Rejected";
    } else {
      requests.push({
        ...provider,
        role: "provider",
        serviceType: provider.category,
        approvalStatus: "Rejected"
      });
    }

    setAppData(appData);
  }

  function closeCategoryForm() {
    const inlinePanel = byId('superuserCategoryInlinePanel');
    if (inlinePanel) inlinePanel.classList.add('hidden');
    closeModal('superuserCategoryModalBackdrop');
  }

  function openCategoryModal(categoryId) {
    editingCategoryId = categoryId || '';
    const title = byId('superuserCategoryModalTitle');
    const submit = byId('superuserCategorySubmitBtn');
    const name = byId('superuserCategoryName');
    const description = byId('superuserCategoryDescription');
    const subcategories = byId('superuserCategorySubcategories');
    const success = byId('superuserCategorySuccess');
    const inlinePanel = byId('superuserCategoryInlinePanel');
    clearText('superuserCategoryNameError');
    clearText('superuserCategoryDescriptionError');
    if (success) success.textContent = '';
    if (editingCategoryId) {
      const item = getData().categories.find(function (category) { return category.id === editingCategoryId; });
      if (item) {
        title.textContent = 'Edit Category';
        submit.textContent = 'Update Category';
        name.value = item.name;
        description.value = item.description;
        if (subcategories) subcategories.value = (item.subServices || []).join(', ');
      }
    } else {
      title.textContent = 'Add New Category';
      submit.textContent = 'Add Category';
      name.value = '';
      description.value = '';
      if (subcategories) subcategories.value = '';
    }
    if (inlinePanel) {
      inlinePanel.classList.remove('hidden');
      inlinePanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      openModal('superuserCategoryModalBackdrop');
    }
  }

  function setupCategoryForm() {
    const form = byId('superuserCategoryForm');
    if (!form) return;
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearText('superuserCategoryNameError');
      clearText('superuserCategoryDescriptionError');
      clearText('superuserCategorySuccess');
      const name = byId('superuserCategoryName').value.trim();
      const description = byId('superuserCategoryDescription').value.trim();
      const subcategoryInput = byId('superuserCategorySubcategories');
      const subServices = subcategoryInput ? subcategoryInput.value.split(',').map(function (item) {
        return item.trim();
      }).filter(Boolean) : [];
      let valid = true;
      if (!name) {
        byId('superuserCategoryNameError').textContent = 'Category name is required.';
        valid = false;
      }
      if (!description) {
        byId('superuserCategoryDescriptionError').textContent = 'Category description is required.';
        valid = false;
      }
      const data = getData();
      const duplicate = data.categories.some(function (item) {
        return item.name.toLowerCase() === name.toLowerCase() && item.id !== editingCategoryId;
      });
      if (duplicate) {
        byId('superuserCategoryNameError').textContent = 'This category already exists.';
        valid = false;
      }
      if (!valid) return;
      if (editingCategoryId) {
        const item = data.categories.find(function (category) { return category.id === editingCategoryId; });
        item.name = name;
        item.description = description;
        item.subServices = subServices;
        item.icon = item.icon || categoryIcon(name);
        item.bgImage = item.bgImage || categoryImage(name);
        byId('superuserCategorySuccess').textContent = 'Category updated successfully.';
      } else {
        data.categories.push(normalizeCategoryRecord({ id: slugifyCategory(name), name: name, description: description, subServices: subServices }));
        byId('superuserCategorySuccess').textContent = 'Category added successfully.';
      }
      setData(data);
      const appData = getAppData();
      appData.categories = data.categories.map(normalizeCategoryRecord);
      setAppData(appData);
      syncCatalogToBackend(appData);
      const categorySearch = byId('superuserCategorySearch');
      const managementSearch = byId('superuserManagementSearch');
      const term = categorySearch ? categorySearch.value.trim().toLowerCase() : (managementSearch ? managementSearch.value.trim().toLowerCase() : '');
      renderCategories(term);
      updateManagementCounts();
      setTimeout(function () { closeCategoryForm(); }, 700);
    });
  }

  function deleteCategory(categoryId) {
    const data = getData();
    data.categories = data.categories.filter(function (item) { return item.id !== categoryId; });
    setData(data);
    const appData = getAppData();
    appData.categories = (appData.categories || []).filter(function (item) { return item.id !== categoryId; });
    setAppData(appData);
    syncCatalogToBackend(appData);
    const categorySearch = byId('superuserCategorySearch');
    const managementSearch = byId('superuserManagementSearch');
    const term = categorySearch ? categorySearch.value.trim().toLowerCase() : (managementSearch ? managementSearch.value.trim().toLowerCase() : '');
    renderCategories(term);
    updateManagementCounts();
  }


  function setupCategorySearch() {
    const input = byId('superuserCategorySearch');
    if (!input) return;
    input.addEventListener('input', function () {
      renderCategories(input.value.trim().toLowerCase());
    });
  }

  function canonicalBookings() {
    const rows = [];
    const superuserData = getData() || {};
    const autoCancelReason = "Automatically cancelled because the provider did not confirm the booking before the scheduled service date.";
    function normalizedStatus(value, reason) {
      if (reason === autoCancelReason) return 'Requested';
      const raw = String(value || 'Requested').trim();
      const key = raw.toLowerCase();
      if (['pending', 'requested'].indexOf(key) !== -1) return 'Requested';
      if (['accepted', 'upcoming', 'scheduled', 'in progress'].indexOf(key) !== -1) return 'Upcoming';
      if (['completed', 'complete'].indexOf(key) !== -1) return 'Completed';
      if (['cancelled', 'canceled'].indexOf(key) !== -1) return 'Cancelled';
      return raw;
    }
    function add(record, owner) {
      if (!record) return;
      const id = String(record.id || record.bookingId || record.bookingRef || record.bookingReference || '').trim();
      if (!id) return;
      const reason = record.reason || record.cancelReason || record.cancellationReason;
      rows.push({
        id: id,
        status: normalizedStatus(record.status || record.bookingStatus, reason),
        customer: record.customer || record.customerName || (owner && owner.customer) || 'Customer',
        email: record.email || record.customerEmail || (owner && owner.email) || 'N/A',
        provider: record.provider || record.providerName || (owner && owner.provider) || 'ServeEase Provider',
        category: record.category || record.serviceCategory || record.serviceType || record.service || 'N/A',
        serviceType: record.serviceType || record.service || record.category || 'N/A',
        serviceDate: record.serviceDate || record.date || record.bookingDate || record.createdAt || 'N/A',
        serviceTime: record.serviceTime || record.time || 'N/A',
        paymentStatus: record.paymentStatus || record.payment || record.paymentState || 'Pending',
        amount: Number(record.amount) || 0,
        reason: (reason === autoCancelReason ? 'N/A' : (reason || 'N/A'))
      });
    }
    (Array.isArray(superuserData.bookings) ? superuserData.bookings : []).forEach(function (booking) { add(booking); });
    dashboardStorageKeys('serveEaseCustomerModuleData').forEach(function (key) {
      const moduleData = dashboardReadJson(key, {}) || {};
      const owner = { customer: moduleData.ownerName || moduleData.customerName, email: moduleData.ownerEmail || moduleData.customerEmail };
      (Array.isArray(moduleData.bookings) ? moduleData.bookings : []).forEach(function (booking) { add(booking, owner); });
    });
    dashboardStorageKeys('serveEaseProviderModuleData').forEach(function (key) {
      const moduleData = dashboardReadJson(key, {}) || {};
      const profile = moduleData.profile || {};
      const owner = { provider: profile.organisationName || profile.fullName || moduleData.ownerName };
      (Array.isArray(moduleData.bookings) ? moduleData.bookings : []).forEach(function (booking) { add(booking, owner); });
    });
    const merged = {};
    rows.forEach(function (row) {
      if (!merged[row.id]) {
        merged[row.id] = row;
      } else {
        if (merged[row.id].status === 'Requested' && row.status !== 'Requested') {
          merged[row.id].status = row.status;
        }
        Object.keys(row).forEach(function (key) {
          if (merged[row.id][key] === 'N/A' || merged[row.id][key] === 'Customer' || merged[row.id][key] === 'ServeEase Provider') {
            merged[row.id][key] = row[key];
          }
        });
      }
    });
    return Object.keys(merged).map(function (id) { return merged[id]; });
  }

  function renderBookingsPage() {
    const statsGrid = byId('superuserBookingStatsGrid');
    if (!statsGrid) return;
    renderNotifications();
    const bookings = canonicalBookings();
    const counts = {
      Completed: bookings.filter(function (item) { return item.status === 'Completed'; }).length,
      Upcoming: bookings.filter(function (item) { return item.status === 'Upcoming'; }).length,
      Requested: bookings.filter(function (item) { return item.status === 'Requested'; }).length,
      Cancelled: bookings.filter(function (item) { return item.status === 'Cancelled'; }).length
    };
    const other = bookings.length - counts.Completed - counts.Upcoming - counts.Requested - counts.Cancelled;
    if (counts.Completed + counts.Upcoming + counts.Requested + counts.Cancelled + other !== bookings.length) console.error('Monitor Bookings reconciliation mismatch.');
    statsGrid.innerHTML = buildStatCard('Completed', counts.Completed, '', '✔') + buildStatCard('Upcoming', counts.Upcoming, '', '🕘') + buildStatCard('Requested', counts.Requested, '', '!', 'warning') + buildStatCard('Cancelled', counts.Cancelled, '', '✕', 'warning') + (other ? buildStatCard('Other', other, '', '•') : '');
    buildBookingSections('');
    const input = byId('superuserBookingSearch');
    if (input) input.addEventListener('input', function () { buildBookingSections(input.value.trim().toLowerCase()); });
  }

  function buildBookingSections(term) {
    const wrapper = byId('superuserBookingSections');
    if (!wrapper) return;
    const data = getData();
    const bookings = canonicalBookings();
    const allProviders = (data.providers || []).concat(data.pendingProviders || []);
    const providerMap = {};
    allProviders.forEach(function (p) { providerMap[p.fullName] = p.organisationName; });

    const groups = [
      { key: 'Requested', title: 'Requested Bookings', subtitle: 'bookings awaiting provider approval', className: 'requested', icon: '◔' },
      { key: 'Upcoming', title: 'Upcoming Bookings', subtitle: 'bookings scheduled', className: 'upcoming', icon: '🕘' },
      { key: 'Completed', title: 'Completed Bookings', subtitle: 'bookings successfully completed', className: 'completed', icon: '✓' },
      { key: 'Cancelled', title: 'Cancelled Bookings', subtitle: 'bookings cancelled', className: 'cancelled', icon: '⊗' }
    ].concat(Array.from(new Set(bookings.map(function (item) { return item.status; }).filter(function (status) { return ['Requested', 'Upcoming', 'Completed', 'Cancelled'].indexOf(status) === -1; }))).map(function (status) { return { key: status, title: status + ' Bookings', subtitle: 'bookings with this status', className: 'upcoming', icon: '•' }; }));
    wrapper.innerHTML = groups.map(function (group) {
      const items = bookings.filter(function (booking) {
        const hay = [booking.id, booking.customer, booking.email, booking.provider, booking.category, booking.serviceType].join(' ').toLowerCase();
        return booking.status === group.key && matchesManagementSearch(hay, term);
      });
      return '<section class="superuser-booking-section ' + group.className + '"><div class="superuser-section-header"><span>' + group.icon + '</span><div><h2>' + group.title + '</h2><p>' + items.length + ' ' + group.subtitle + '</p></div></div><div class="superuser-booking-card-list">' + (items.map(function (item) { return bookingCardMarkup(item, providerMap); }).join('') || '<div class="superuser-empty-state">No bookings found in this section.</div>') + '</div></section>';
    }).join('');
    wrapper.querySelectorAll('[data-booking-id]').forEach(function (button) {
      button.addEventListener('click', function () { openBookingModal(button.dataset.bookingId); });
    });
  }

  function bookingCardMarkup(item, providerMap) {
    providerMap = providerMap || {};
    const orgName = providerMap[item.provider];
    const providerDisplay = orgName ? item.provider + ' (' + orgName + ')' : item.provider;
    const reasonLabel = item.status === 'Cancelled' ? 'Reason' : 'Service Time';
    const reasonValue = item.status === 'Cancelled' ? item.reason : item.serviceTime;
    const leftDateLabel = item.status === 'Completed' ? 'Completed' : 'Service Date';
    return '<article class="superuser-booking-card"><div><h3>' + item.id + ' <span class="superuser-chip ' + chipClass(item.status) + '">' + item.status + '</span> <span class="superuser-chip ' + chipClass(item.paymentStatus) + '">' + item.paymentStatus + '</span></h3><p><strong>' + item.category + '</strong> - ' + item.serviceType + '</p><div class="superuser-booking-meta"><span>Customer: ' + item.customer + '</span><span>Provider: ' + providerDisplay + '</span><span>' + leftDateLabel + ': ' + formatDisplayDate(item.serviceDate) + '</span><span>' + reasonLabel + ': ' + reasonValue + '</span><span>Amount: ₹' + item.amount + '</span></div></div><div></div><div class="superuser-booking-action-col"><button class="superuser-inline-action" type="button" data-booking-id="' + item.id + '">◉ View Details</button></div></article>';
  }

  function openBookingModal(bookingId) {
    const booking = canonicalBookings().find(function (item) { return item.id === bookingId; });
    if (!booking) return;
    selectedBookingId = booking.id;
    byId('superuserBookingModalTitle').textContent = booking.id;
    byId('superuserBookingModalStatusBadges').innerHTML = '<span class="superuser-chip ' + chipClass(booking.status) + '">' + booking.status + '</span><span class="superuser-chip ' + chipClass(booking.paymentStatus) + '">Payment: ' + booking.paymentStatus + '</span>';
    byId('superuserBookingServiceInfo').innerHTML = '<div class="superuser-detail-field"><span>Category:</span><strong>' + booking.category + '</strong></div><div class="superuser-detail-field"><span>Service Type:</span><strong>' + booking.serviceType + '</strong></div><div class="superuser-detail-field"><span>Provider:</span><strong>' + booking.provider + '</strong></div><div class="superuser-detail-field"><span>Service Time:</span><strong>' + booking.serviceTime + '</strong></div>';
    byId('superuserBookingCustomerInfo').innerHTML = '<div class="superuser-detail-field"><span>Name</span><strong>' + booking.customer + '</strong></div><div class="superuser-detail-field"><span>Email</span><strong>' + booking.email + '</strong></div>';
    openModal('superuserBookingModalBackdrop');
  }

  function renderTicketsPage() {
    const statsGrid = byId('superuserTicketStatsGrid');
    if (!statsGrid) return;
    syncSupportTicketsIntoSuperuserData();
    renderNotifications();
    const data = getData();
    const escalated = data.tickets.filter(function (item) { return item.status === 'Escalated'; }).length;
    const open = data.tickets.filter(function (item) { return item.status === 'Open'; }).length;
    const progress = data.tickets.filter(function (item) { return item.status === 'In Progress'; }).length;
    const resolved = data.tickets.filter(function (item) { return item.status === 'Resolved'; }).length;
    statsGrid.innerHTML = buildStatCard('Escalated Tickets', escalated, '', '⚠') + buildStatCard('Open Tickets', open, '', '◔') + buildStatCard('In Progress', progress, '', '◉') + buildStatCard('Resolved', resolved, '', '✓');
    buildTicketSections('');
    const input = byId('superuserTicketSearch');
    if (input) input.addEventListener('input', function () { buildTicketSections(input.value.trim().toLowerCase()); });
  }

  function buildTicketSections(term) {
    const wrapper = byId('superuserTicketSections');
    if (!wrapper) return;
    const data = getData();
    const groups = [
      { key: 'Escalated', title: 'Escalated Tickets', subtitle: 'tickets requiring immediate attention', className: 'escalated', icon: '⚠' },
      { key: 'Open', title: 'Open Tickets', subtitle: 'tickets awaiting assignment', className: 'open', icon: '◔' },
      { key: 'In Progress', title: 'In Progress Tickets', subtitle: 'tickets being worked on', className: 'progress', icon: '◉' },
      { key: 'Resolved', title: 'Resolved Tickets', subtitle: 'tickets successfully resolved', className: 'resolved', icon: '✓' }
    ];
    wrapper.innerHTML = groups.map(function (group) {
      const items = data.tickets.filter(function (ticket) {
        const hay = [ticket.id, ticket.customer, ticket.provider, ticket.relatedCustomer, ticket.bookingId, ticket.category, ticket.service, ticket.subject, ticket.userType, ticket.internalRemarks].join(' ').toLowerCase();
        return ticket.status === group.key && matchesManagementSearch(hay, term);
      });
      return '<section class="superuser-booking-section superuser-ticket-section ' + group.className + '"><div class="superuser-section-header"><span>' + group.icon + '</span><div><h2>' + group.title + '</h2><p>' + items.length + ' ' + group.subtitle + '</p></div></div><div class="superuser-ticket-card-list">' + (items.map(ticketCardMarkup).join('') || '<div class="superuser-empty-state">No tickets found in this section.</div>') + '</div></section>';
    }).join('');
    wrapper.querySelectorAll('[data-ticket-id]').forEach(function (button) {
      button.addEventListener('click', function () { openTicketModal(button.dataset.ticketId); });
    });
  }

  function ticketCardMarkup(ticket) {
    const raisedLabel = ticket.userType === 'Provider' ? 'Provider' : 'Customer';
    const counterpartyLabel = ticket.userType === 'Provider' ? 'Provider' : 'Provider';
    const providerName = ticket.provider || ticket.providerName || (ticket.userType === 'Provider' ? ticket.customer : 'ServeEase Provider');
    return '<article class="superuser-ticket-card"><div><h3>' + ticket.id + ' <span class="superuser-chip ' + chipClass(ticket.status) + '">' + ticket.status + '</span> <span class="superuser-chip ' + chipClass(ticket.userType) + '">' + ticket.userType + '</span></h3><p>' + ticket.subject + '</p><div class="superuser-ticket-mini-meta"><span>' + raisedLabel + ': ' + ticket.customer + '</span><span>' + counterpartyLabel + ': ' + providerName + '</span>' + (ticket.relatedCustomer ? '<span>Related Customer: ' + ticket.relatedCustomer + '</span>' : '') + '<span>Booking: ' + ticket.bookingId + '</span><span>Created: ' + formatDisplayDate(ticket.created) + '</span></div><div class="superuser-ticket-tags"><span class="superuser-chip warning">' + ticket.category + '</span><span class="superuser-chip pending">' + (ticket.priority || 'Medium') + '</span>' + (ticket.service ? '<span class="superuser-chip completed">' + ticket.service + '</span>' : '') + ((ticket.attachments || (ticket.attachmentName && ticket.attachmentName !== 'No attachment')) ? '<span class="superuser-chip refunded">📎 ' + (ticket.attachments || 1) + ' attachment(s)</span>' : '') + '</div></div><div class="superuser-ticket-action-col"><button class="superuser-inline-action" type="button" data-ticket-id="' + ticket.id + '">◉ View Details</button></div></article>';
  }

  function openTicketModal(ticketId) {
    const data = getData();
    const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
    if (!ticket) return;
    selectedTicketId = ticket.id;
    byId('superuserTicketModalTitle').textContent = ticket.id;
    const badge = byId('superuserTicketModalStatusBadge');
    badge.className = 'superuser-chip ' + chipClass(ticket.status);
    badge.textContent = ticket.status;
    const providerName = ticket.provider || ticket.providerName || (ticket.userType === 'Provider' ? ticket.customer : 'ServeEase Provider');
    const history = Array.isArray(ticket.history) ? ticket.history : [];
    const messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    byId('superuserTicketInfoGrid').innerHTML =
      '<div class="superuser-detail-field"><span>Ticket ID:</span><strong>' + ticket.id + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Created:</span><strong>' + formatDisplayDate(ticket.created) + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Booking Ref:</span><strong>' + ticket.bookingId + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Raised By:</span><strong>' + ticket.userType + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Issue Category:</span><strong>' + ticket.category + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Service:</span><strong>' + (ticket.service || 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Priority:</span><strong>' + (ticket.priority || 'Medium') + '</strong></div>';
    byId('superuserTicketContactGrid').innerHTML =
      '<div class="superuser-detail-field"><span>Requester Name:</span><strong>' + ticket.customer + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Provider:</span><strong>' + providerName + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Related Customer:</span><strong>' + (ticket.relatedCustomer || 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Phone:</span><strong>' + (ticket.phone || 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Email:</span><strong>' + (ticket.email || 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Support Update:</span><strong>' + (ticket.supportUpdate || 'Awaiting support update') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Support Investigation:</span><strong>' + (ticket.internalRemarks || 'No internal remarks saved') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Escalation Reason:</span><strong>' + (ticket.escalationReason || 'No escalation reason saved') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Assigned Support:</span><strong>' + (ticket.assignedSupportName || 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Escalated At:</span><strong>' + (ticket.escalatedAt ? formatDisplayDateTime(ticket.escalatedAt) : 'N/A') + '</strong></div>' +
      '<div class="superuser-detail-field"><span>Attachment:</span><strong>' + (ticket.attachmentName && ticket.attachmentName !== 'No attachment' ? ticket.attachmentName : (ticket.attachments ? ticket.attachments + ' file(s)' : 'No attachment')) + '</strong>' + (window.ServeEaseAttachments ? window.ServeEaseAttachments.actionMarkup(ticket, 'Preview attachment') : '') + '</div>';
    const attachmentButton = byId('superuserTicketContactGrid').querySelector('.serveease-attachment-preview-btn');
    if (attachmentButton && window.ServeEaseAttachments) attachmentButton.addEventListener('click', function () { window.ServeEaseAttachments.previewTicketAttachment(ticket); });
    byId('superuserTicketDescriptionBlock').innerHTML =
      '<p>' + (ticket.description || 'No description provided.') + '</p>' +
      '<div class="ticket-history">' +
      (history.length ? history.map(function (entry) { return '<div><strong>' + (entry.label || entry.status || 'Update') + '</strong><span>' + formatDisplayDateTime(entry.time || entry.updatedAt || '') + '</span></div>'; }).join('') : '<div><strong>No history yet</strong><span>Support history will appear after investigation.</span></div>') +
      '</div>' +
      (messages.length ? '<div class="ticket-history">' + messages.slice(-3).map(function (message) { return '<div><strong>' + (message.sender || message.senderType || 'Message') + '</strong><span>' + (message.text || '') + '</span></div>'; }).join('') + '</div>' : '');
    const solutionSection = byId('superuserTicketSolutionSection');
    const solutionInput = byId('superuserTicketSolutionInput');
    const solutionCounter = byId('superuserTicketSolutionCounter');
    const solutionError = byId('superuserTicketSolutionError');
    if (solutionSection && solutionInput && solutionCounter) {
      solutionSection.classList.toggle('hidden', ticket.status !== 'Escalated' && ticket.status !== 'Resolved');
      solutionInput.value = ticket.solution || ticket.supportUpdate || '';
      solutionInput.disabled = ticket.status === 'Resolved';
      solutionCounter.textContent = solutionInput.value.length + ' / 600';
      if (solutionError) solutionError.textContent = '';
      solutionInput.oninput = function () {
        this.value = this.value.replace(/[<>]/g, '');
        solutionCounter.textContent = this.value.length + ' / 600';
        if (solutionError && this.value.trim().length >= 10) solutionError.textContent = '';
      };
    }
    const actionRow = byId('superuserTicketActionRow');
    if (ticket.status === 'Escalated') {
      actionRow.innerHTML = '<button class="btn superuser-success-btn btn-full" type="button" id="superuserResolveTicketBtn">✓ Resolve Ticket</button>';
      byId('superuserResolveTicketBtn').onclick = function () { resolveEscalatedTicket(ticket.id); };
    } else if (ticket.status === 'Open') {
      actionRow.innerHTML = '<button class="btn btn-primary" type="button" id="superuserMoveProgressBtn">Start Progress</button><button class="btn btn-outline" type="button" id="superuserEscalateTicketBtn">Escalate Ticket</button>';
      byId('superuserMoveProgressBtn').onclick = function () { updateTicketStatus(ticket.id, 'In Progress'); };
      byId('superuserEscalateTicketBtn').onclick = function () { updateTicketStatus(ticket.id, 'Escalated'); };
    } else if (ticket.status === 'In Progress') {
      actionRow.innerHTML = '<button class="btn superuser-success-btn" type="button" id="superuserResolveProgressTicketBtn">✓ Mark Resolved</button>';
      byId('superuserResolveProgressTicketBtn').onclick = function () { updateTicketStatus(ticket.id, 'Resolved'); };
    } else {
      actionRow.innerHTML = '<button class="btn btn-outline btn-full" type="button" data-close-modal="superuserTicketModalBackdrop">Close</button>';
      actionRow.querySelector('[data-close-modal]').addEventListener('click', function () { closeModal('superuserTicketModalBackdrop'); });
    }
    openModal('superuserTicketModalBackdrop');
  }

  function updateTicketStatus(ticketId, status) {
    const data = getData();
    const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
    if (!ticket) return;
    ticket.status = status;
    syncSuperuserTicketToSupport(ticket, status === 'Resolved' ? ticket.solution : '');
    addNotification(data, { id: 'AN-ticket-' + ticket.id + '-' + String(status).toLowerCase().replace(/\s+/g, '-'), text: ticket.id + ' moved to ' + status, type: status === 'Resolved' ? 'blue' : 'red', ticketId: ticket.id, referenceId: ticket.id, actionPage: 'superuser-escalated-tickets.html' });
    setData(data);
    closeModal('superuserTicketModalBackdrop');
    buildTicketSections(byId('superuserTicketSearch') ? byId('superuserTicketSearch').value.trim().toLowerCase() : '');
    renderTicketsPage();
  }

  function syncSuperuserTicketToSupport(ticket, solution) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
    if (!Array.isArray(supportData.notifications)) supportData.notifications = [];
    let supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
    if (!supportTicket) {
      supportTicket = {
        id: ticket.id,
        bookingReference: ticket.bookingId || "N/A",
        raisedByType: ticket.raisedByType || (ticket.userType === "Provider" ? "provider" : "customer"),
        raisedByLabel: ticket.userType || "Customer",
        customerName: ticket.customer,
        providerName: ticket.userType === "Provider" ? ticket.customer : "ServeEase Provider",
        issueCategory: ticket.category,
        subject: ticket.subject,
        description: ticket.description,
        attachmentName: ticket.attachmentName || ticket.attachmentUrl || (ticket.attachments ? "Attachment available" : "No attachment"),
        attachmentUrl: ticket.attachmentUrl || "",
        phone: ticket.phone || "",
        email: ticket.email || "",
        createdDate: ticket.created || "Just now",
        assignedTo: "Priya Sharma",
        messages: Array.isArray(ticket.messages) ? ticket.messages : [],
        history: []
      };
      supportData.tickets.unshift(supportTicket);
    }

    supportTicket.status = ticket.status;
    supportTicket.solution = solution || ticket.solution || supportTicket.solution || "";
    supportTicket.supportUpdate = supportTicket.solution || ticket.supportUpdate || supportTicket.supportUpdate || "Admin updated your ticket.";
    supportTicket.updatedAt = superuserStamp();
    supportTicket.attachmentName = ticket.attachmentName || ticket.attachmentUrl || supportTicket.attachmentName || (ticket.attachments ? "Attachment available" : "No attachment");
    supportTicket.attachmentUrl = ticket.attachmentUrl || supportTicket.attachmentUrl || "";
    if (!Array.isArray(supportTicket.messages)) supportTicket.messages = [];
    if (!Array.isArray(supportTicket.history)) supportTicket.history = [];

    if (solution) {
      const adminReplyExists = supportTicket.messages.some(function (message) {
        return message.senderType === "admin" && message.text === solution;
      });
      if (!adminReplyExists) {
        supportTicket.messages.push({
          sender: "Superuser",
          senderType: "admin",
          text: solution,
          time: supportTicket.updatedAt
        });
      }
    }

    supportTicket.history.push({
      label: ticket.status === "Resolved" ? "Superuser resolved ticket" : "Superuser updated ticket status",
      time: supportTicket.updatedAt,
      active: true
    });
    supportTicket.history.forEach(function (entry, index) {
      entry.active = index === supportTicket.history.length - 1;
    });
    supportData.notifications.unshift({
      id: "NT" + Date.now(),
      text: "Superuser moved " + ticket.id + " to " + ticket.status,
      time: superuserStamp(),
      isNew: true,
      ticketId: ticket.id
    });

    setSupportData(supportData);
    updateTicketInUserModules(supportTicket);
  }

  function resolveEscalatedTicket(ticketId) {
    const solutionInput = byId('superuserTicketSolutionInput');
    const solutionError = byId('superuserTicketSolutionError');
    const solution = solutionInput ? solutionInput.value.trim() : '';
    if (solutionError) solutionError.textContent = '';

    if (solution.length < 10) {
      if (solutionError) solutionError.textContent = 'Solution must contain at least 10 characters.';
      if (solutionInput) solutionInput.focus();
      return;
    }

    const data = getData();
    const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
    if (!ticket) return;
    ticket.status = 'Resolved';
    ticket.solution = solution;
    ticket.supportUpdate = solution;
    ticket.messages = Array.isArray(ticket.messages) ? ticket.messages : [];
    ticket.messages.push({
      sender: 'Superuser',
      senderType: 'admin',
      text: solution,
      time: superuserStamp()
    });
    addNotification(data, { id: 'AN-ticket-resolved-' + ticket.id, text: ticket.id + ' resolved by superuser', type: 'blue', ticketId: ticket.id, referenceId: ticket.id, actionPage: 'superuser-escalated-tickets.html' });
    setData(data);
    syncSuperuserTicketToSupport(ticket, solution);
    closeModal('superuserTicketModalBackdrop');
    buildTicketSections(byId('superuserTicketSearch') ? byId('superuserTicketSearch').value.trim().toLowerCase() : '');
    renderTicketsPage();
  }

  function openModal(id) {
    const modal = byId(id);
    if (modal) modal.classList.remove('hidden');
  }

  function closeModal(id) {
    const modal = byId(id);
    if (modal) modal.classList.add('hidden');
  }

  function clearText(id) {
    const node = byId(id);
    if (node) node.textContent = '';
  }

  function wireModalClosers() {
    document.querySelectorAll('[data-close-modal]').forEach(function (button) {
      button.addEventListener('click', function () {
        closeModal(button.dataset.closeModal);
      });
    });
    document.querySelectorAll('.superuser-modal-backdrop').forEach(function (backdrop) {
      backdrop.addEventListener('click', function (event) {
        if (event.target === backdrop) backdrop.classList.add('hidden');
      });
    });
  }

  seedData();
  syncPendingProviderApprovals();
  migrateProviderOrgNames();
  syncSupportTicketsIntoSuperuserData();
  if (!requireAccess()) return;
  setupCommonHeader();
  setupNotificationModal();
  wireModalClosers();
  setupCategoryForm();
  renderDashboard();
  renderManagement();
  renderCategoriesPage();
    renderBookingsPage();
    syncSuperuserBookingsFromBackend(function () {
      renderDashboard();
      renderBookingsPage();
    });
  renderTicketsPage();

  hydrateSupportTicketsFromBackend(function () {
    renderTicketsPage();
    renderDashboard();
  });

  hydrateProviderApprovalsFromBackend(function () {
    syncPendingProviderApprovals();
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    renderProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
  });

  hydrateVerifiedProvidersFromBackend(function () {
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    renderProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
  });
})();
