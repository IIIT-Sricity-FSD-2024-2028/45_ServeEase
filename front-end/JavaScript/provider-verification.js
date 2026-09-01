(function () {
  if (!document.querySelector(".provider-verification-panel")) return;

  let providers = [];
  let selectedProvider = null;
  let pendingAction = null;

  function byId(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(value) {
    if (!value) return "N/A";
    return window.ServeEaseDate ? window.ServeEaseDate.formatDate(value) : value;
  }

  function chipClass(value) {
    return String(value || "").toLowerCase().replace(/\s+/g, "-");
  }

  function isSupportedDocument(document) {
    const type = String(document && document.documentType || "").toLowerCase();
    return ["id proof", "address proof", "skill certificate", "experience proof", "profile photo"].some(function (label) {
      return type === label || type.indexOf(label + " - ") === 0;
    });
  }

  function supportedDocuments(documents) {
    return (Array.isArray(documents) ? documents : []).filter(isSupportedDocument);
  }

  function requiredDocumentsReviewed(provider) {
    const documents = supportedDocuments(provider && provider.documents);
    return documents.length > 0 && documents
      .filter(function (document) { return document.required; })
      .every(function (document) { return document.documentStatus !== "Pending"; });
  }

  function allRequiredDocumentsApproved(provider) {
    const documents = supportedDocuments(provider && provider.documents);
    return documents.length > 0 && documents
      .filter(function (document) { return document.required; })
      .every(function (document) { return document.documentStatus === "Approved"; });
  }

  function providerActionDisabled(action, provider) {
    if (provider && provider.source === "catalog" && action !== "suspend") return ' disabled title="Catalog provider is already active in Browse by Category"';
    if (provider && provider.status === "Verified" && action === "approve") return ' disabled title="Provider is already verified"';
    if (provider && provider.status === "Suspended" && action === "suspend") return ' disabled title="Provider is already suspended"';
    if (action === "suspend" && provider && provider.status === "Verified") return "";
    if (action === "approve") return allRequiredDocumentsApproved(provider) ? "" : ' disabled title="Approve all required documents first"';
    return requiredDocumentsReviewed(provider) ? "" : ' disabled title="Review all required documents first"';
  }

  function setMessage(text, type) {
    const node = byId("providerVerificationMessage");
    if (!node) return;
    node.textContent = text || "";
    node.className = "provider-verification-message " + (type || "");
  }

  function setLoading(isLoading) {
    const tbody = byId("providerVerificationTableBody");
    if (isLoading && tbody) {
      tbody.innerHTML = '<tr><td colspan="11">Loading provider verification requests...</td></tr>';
    }
  }

  function getAppData() {
    try {
      return JSON.parse(localStorage.getItem("serveEaseData") || "{}");
    } catch (error) {
      return {};
    }
  }

  function getSuperuserData() {
    try {
      return JSON.parse(localStorage.getItem("serveEaseSuperuserModuleData") || "{}");
    } catch (error) {
      return {};
    }
  }

  function setSuperuserData(data) {
    localStorage.setItem("serveEaseSuperuserModuleData", JSON.stringify(data));
  }

  function getSuspendedCatalogIds() {
    try {
      const ids = JSON.parse(localStorage.getItem("serveEaseSuspendedCatalogProviders") || "[]");
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      return [];
    }
  }

  function setSuspendedCatalogIds(ids) {
    localStorage.setItem("serveEaseSuspendedCatalogProviders", JSON.stringify(ids));
  }

  function clearSuspendedCatalogProvider(request) {
    const possibleIds = [
      request && request.id,
      request && request.providerCatalogId,
      request && slugify(request.organisationName || request.fullName || request.name)
    ].filter(Boolean);

    if (!possibleIds.length) return;
    const remainingIds = getSuspendedCatalogIds().filter(function (id) {
      return possibleIds.indexOf(id) === -1;
    });
    setSuspendedCatalogIds(remainingIds);
  }

  function pushSuperuserNotification(text, type, page) {
    const data = getSuperuserData();
    if (!Array.isArray(data.notifications)) data.notifications = [];
    const eventId = "provider-verification:" + String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    if (data.notifications.some(function (item) { return item.eventId === eventId; })) return;
    data.notifications.unshift({
      id: "AN-provider-verification-" + String(text).toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + (page || ""),
      eventId: eventId,
      text: text,
      createdAt: new Date().toISOString(),
      time: new Date().toISOString(),
      read: false,
      type: type || "blue",
      isNew: true,
      actionPage: page || "superuser-provider-verification.html"
    });
    setSuperuserData(data);
  }

  function cityNameFromId(cityId) {
    const cities = { 1: "Chennai", 2: "Bangalore", 3: "Hyderabad", 4: "Delhi", 5: "Mumbai" };
    return cities[Number(cityId)] || "";
  }

  function cityIdFromName(cityName) {
    const value = String(cityName || "").toLowerCase();
    if (value.includes("bangalore") || value.includes("bengaluru")) return 2;
    if (value.includes("hyderabad")) return 3;
    if (value.includes("delhi")) return 4;
    if (value.includes("mumbai")) return 5;
    return 1;
  }

  function catalogCategoryName(categoryId) {
    const data = getAppData();
    const category = (data.categories || []).find(function (item) { return item.id === categoryId; });
    return category ? category.name : String(categoryId || "Home Service");
  }

  function categoryIdFromServiceType(serviceType) {
    const map = {
      "home cleaning": "home-cleaning",
      "cleaning services": "home-cleaning",
      "carpentry": "carpentry",
      "painting": "painting",
      "painting services": "painting",
      "salon at home": "salon-at-home",
      "salon services": "salon-at-home",
      "plumbing": "plumbing",
      "electrician": "electrician",
      "electrical": "electrician",
      "appliance repair / installation": "appliance-repair-installation",
      "appliance repair": "appliance-repair-installation",
      "pest control": "pest-control"
    };
    return map[String(serviceType || "").trim().toLowerCase()] || "home-cleaning";
  }

  function categoryImage(categoryId) {
    const images = {
      "home-cleaning": "assets/images/home-cleaning/clean1.jpg",
      "carpentry": "assets/images/carpentry/carpentry1.jpg.jpeg",
      "painting": "assets/images/painting/painting1.jpg.jpeg",
      "salon-at-home": "assets/images/salon-at-home/salon1.jpg",
      "plumbing": "assets/images/plumbing/plumbing1.jpg.jpeg",
      "electrician": "assets/images/electrician/ele1.jpg.jpeg",
      "appliance-repair-installation": "assets/images/appliance-repair/ACrepair.jpg.jpeg",
      "pest-control": "assets/images/pest-control/pest1.jpg.jpeg"
    };
    return images[categoryId] || images["home-cleaning"];
  }

  function getStoredDocumentPreview(providerId, documentId) {
    if (window.ServeEaseAttachments) return window.ServeEaseAttachments.getProviderPreview(providerId, documentId);
    try {
      const previews = JSON.parse(localStorage.getItem("serveEaseProviderDocuments:" + providerId) || "{}");
      return previews[documentId] || null;
    } catch (error) {
      return null;
    }
  }

  function getProfilePhotoForRequest(request) {
    const documents = Array.isArray(request.documents) ? request.documents : [];
    const photoDocument = documents.find(function (document) {
      return String(document.documentType || "").toLowerCase().indexOf("profile photo") !== -1;
    });
    if (!photoDocument) return "";
    const storedPhoto = getStoredDocumentPreview(request.id, photoDocument.documentId);
    if (storedPhoto && storedPhoto.dataUrl && String(storedPhoto.dataUrl).indexOf("data:image/") === 0) {
      return storedPhoto.dataUrl;
    }
    return "";
  }

  function slugify(value) {
    return String(value || "provider")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "provider";
  }

  function catalogDocuments(providerId) {
    const now = new Date().toISOString();
    return [
      ["ID Proof", "Catalog ID proof verified", true],
      ["Address Proof", "Catalog address proof verified", true],
      ["Skill Certificate", "Catalog skill certificate verified", false],
      ["Experience Proof", "Catalog experience proof verified", false],
      ["Profile Photo", "Catalog profile photo verified", true]
    ].map(function (item, index) {
      return {
        documentId: "CAT-DOC-" + providerId + "-" + (index + 1),
        documentType: item[0],
        documentName: item[1],
        documentUrl: "",
        documentStatus: "Approved",
        required: item[2],
        uploadedAt: now
      };
    });
  }

  function mapCatalogProvider(provider) {
    const cityName = cityNameFromId(provider.cityId);
    return {
      id: provider.id,
      name: provider.name || provider.fullName || "Provider",
      organisationName: provider.organisationName || provider.name || provider.fullName || "Provider",
      email: provider.ownerProviderEmail || provider.email || (provider.id + "@serveease.com"),
      phone: provider.phone || "N/A",
      category: catalogCategoryName(provider.category),
      experience: Number(provider.years || provider.experience) || 0,
      cityId: provider.cityId || "",
      location: cityName,
      address: provider.location || cityName,
      skills: provider.subServices || [],
      certifications: ["Catalog verified provider"],
      completedJobs: provider.jobsDone || 0,
      rating: provider.rating || 0,
      submittedDate: "2026-01-01T00:00:00.000Z",
      joinedDate: "2026-01-01T00:00:00.000Z",
      status: provider.verified === false ? "Pending" : "Verified",
      documents: catalogDocuments(provider.id),
      source: "catalog",
      statusHistory: [
        {
          status: provider.verified === false ? "Pending" : "Verified",
          note: "Provider imported from Browse by Category catalog.",
          updatedBy: "System",
          updatedAt: "2026-01-01T00:00:00.000Z"
        }
      ],
      adminRemarks: "Visible in customer Browse by Category catalog."
    };
  }

  function normalizeRegistrationDate(value) {
    if (!value) return new Date().toISOString();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
  }

  function mapRegisteredProvider(request) {
    const documents = Array.isArray(request.documents) ? request.documents : [];
    const submittedDate = normalizeRegistrationDate(request.registrationDate);
    let verificationStatus = "Pending";
    if (request.verificationStatus) {
      verificationStatus = request.verificationStatus;
    } else if (request.approvalStatus === "Active" || request.approvalStatus === "Approved") {
      verificationStatus = "Verified";
    } else if (request.approvalStatus === "Rejected") {
      verificationStatus = "Rejected";
    } else if (request.approvalStatus === "Suspended") {
      verificationStatus = "Suspended";
    }
    return {
      id: request.id,
      name: request.fullName || request.name || "Provider",
      organisationName: request.organisationName || request.fullName || request.name || "Provider",
      email: request.email || "",
      phone: request.phone || "",
      category: request.serviceType || request.category || "Home Service",
      experience: Number(request.experience) || 0,
      location: request.cityName || request.location || cityNameFromId(request.cityId) || "Chennai",
      address: request.address || request.location || "",
      skills: [],
      certifications: [],
      completedJobs: 0,
      rating: 0,
      submittedDate: submittedDate,
      joinedDate: submittedDate,
      status: verificationStatus,
      documents: supportedDocuments(documents).map(function (document, index) {
        return {
          documentId: document.documentId || "DOC-" + request.id + "-" + (index + 1),
          documentType: document.documentType,
          documentName: document.documentName,
          documentUrl: document.documentUrl || "",
          documentStatus: document.documentStatus || "Pending",
          required: document.required !== false,
          uploadedAt: submittedDate,
          rejectionReason: document.rejectionReason || ""
        };
      }),
      statusHistory: [
        {
          status: verificationStatus,
          note: "Provider registration submitted with uploaded documents.",
          updatedBy: "Provider",
          updatedAt: submittedDate
        }
      ],
      source: "registration",
      adminRemarks: request.adminRemarks || ""
    };
  }

  function mergeCatalogProviders(backendProviders) {
    const data = getAppData();
    const byId = {};
    const registeredProviderIds = new Set((data.providerApprovalRequests || []).map(function (request) {
      return request && request.id;
    }).filter(Boolean));
    const suspendedCatalogIds = new Set(getSuspendedCatalogIds());

    // Local provider requests contain the same canonical lifecycle state used
    // by Provider Operations. Seed backend data first so a delayed/stale API
    // response cannot overwrite a freshly completed local transition.
    (backendProviders || []).forEach(function (provider) {
      if (!provider || !provider.id) return;
      byId[provider.id] = {
        ...provider,
        organisationName: provider.organisationName || provider.name,
        location: cityNameFromId(provider.cityId) || provider.location,
        source: "backend"
      };
    });
    (data.providers || []).forEach(function (provider) {
      if (!provider || !provider.id || Number(provider.cityId) < 1 || Number(provider.cityId) > 5) return;
      if (provider.ownerProviderId && registeredProviderIds.has(provider.ownerProviderId)) return;
      if (suspendedCatalogIds.has(provider.id)) return;
      byId[provider.id] = mapCatalogProvider(provider);
    });
    (data.providerApprovalRequests || []).forEach(function (request) {
      if (!request || !request.id) return;
      byId[request.id] = mapRegisteredProvider(request);
    });
    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  function buildStatCard(title, value, label, extraClass) {
    return '<article class="superuser-stat-card ' + (extraClass || '') + '"><div class="superuser-stat-head"><span>' + escapeHtml(title) + '</span><span>SE</span></div><h3>' + value + '</h3><p>' + escapeHtml(label) + '</p></article>';
  }

  function renderStats() {
    const stats = {
      total: providers.length,
      Pending: 0,
      Verified: 0,
      Rejected: 0,
      Suspended: 0
    };
    providers.forEach(function (provider) {
      if (stats[provider.status] !== undefined) stats[provider.status] += 1;
    });
    byId("providerVerificationStats").innerHTML =
      buildStatCard("Total", stats.total, "Total Providers") +
      buildStatCard("Pending", stats.Pending, "Pending Verification", "warning") +
      buildStatCard("Verified", stats.Verified, "Verified Providers") +
      buildStatCard("Rejected", stats.Rejected, "Rejected Providers", "warning") +
      buildStatCard("Suspended", stats.Suspended, "Suspended Providers", "warning");
  }

  function renderCategoryFilter() {
    const select = byId("providerCategoryFilter");
    if (!select) return;
    const current = select.value || "all";
    const categories = [];
    providers.forEach(function (provider) {
      if (provider.category && categories.indexOf(provider.category) === -1) categories.push(provider.category);
    });
    select.innerHTML = '<option value="all">All Categories</option>' + categories.sort().map(function (category) {
      return '<option value="' + escapeHtml(category) + '">' + escapeHtml(category) + '</option>';
    }).join("");
    select.value = categories.indexOf(current) === -1 ? "all" : current;
  }

  function getFilteredProviders() {
    const search = (byId("providerVerificationSearch").value || "").trim().toLowerCase();
    const status = byId("providerStatusFilter").value;
    const category = byId("providerCategoryFilter").value;
    const sort = byId("providerSortFilter").value;

    return providers.filter(function (provider) {
      const haystack = [provider.name, provider.organisationName, provider.email, provider.phone].join(" ").toLowerCase();
      const matchesSearch = !search || haystack.indexOf(search) !== -1;
      const matchesStatus = status === "all" || provider.status === status;
      const matchesCategory = category === "all" || provider.category === category;
      return matchesSearch && matchesStatus && matchesCategory;
    }).sort(function (a, b) {
      const first = new Date(a.submittedDate).getTime();
      const second = new Date(b.submittedDate).getTime();
      return sort === "oldest" ? first - second : second - first;
    });
  }

  function renderTable() {
    const tbody = byId("providerVerificationTableBody");
    const count = byId("providerVerificationCount");
    const items = getFilteredProviders();
    if (count) count.textContent = items.length;

    if (!items.length) {
      tbody.innerHTML = '<tr><td colspan="11"><div class="superuser-empty-state">No providers match the current search or filters.</div></td></tr>';
      return;
    }

    tbody.innerHTML = items.map(function (provider) {
      return '<tr>' +
        '<td><strong>' + escapeHtml(provider.id) + '</strong></td>' +
        '<td>' + escapeHtml(provider.name) + '</td>' +
        '<td>' + escapeHtml(provider.organisationName || provider.name) + '</td>' +
        '<td>' + escapeHtml(provider.email) + '</td>' +
        '<td>' + escapeHtml(provider.phone) + '</td>' +
        '<td>' + escapeHtml(provider.category) + '</td>' +
        '<td>' + escapeHtml(provider.experience) + ' years</td>' +
        '<td>' + escapeHtml(provider.location) + '</td>' +
        '<td>' + formatDate(provider.submittedDate) + '</td>' +
        '<td><span class="superuser-chip ' + chipClass(provider.status) + '">' + escapeHtml(provider.status) + '</span></td>' +
        '<td><div class="provider-row-actions">' +
          '<button class="superuser-inline-action" type="button" data-view-provider="' + escapeHtml(provider.id) + '">View</button>' +
          '<button class="superuser-inline-action provider-documents-btn" type="button" data-documents-provider="' + escapeHtml(provider.id) + '">Documents</button>' +
          '<button class="superuser-inline-action provider-action-approve" type="button" data-provider-action="approve" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("approve", provider) + '>Approve</button>' +
          '<button class="superuser-inline-action provider-action-reject" type="button" data-provider-action="reject" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("reject", provider) + '>Reject</button>' +
          '<button class="superuser-inline-action provider-action-suspend" type="button" data-provider-action="suspend" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("suspend", provider) + '>Suspend</button>' +
        '</div></td>' +
      '</tr>';
    }).join("");

    tbody.querySelectorAll("[data-view-provider]").forEach(function (button) {
      button.addEventListener("click", function () { openProviderDetails(button.dataset.viewProvider); });
    });
    tbody.querySelectorAll("[data-documents-provider]").forEach(function (button) {
      button.addEventListener("click", function () { openProviderDocuments(button.dataset.documentsProvider); });
    });
    tbody.querySelectorAll("[data-provider-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        openActionConfirm(button.dataset.providerAction, button.dataset.providerId);
      });
    });
  }

  function renderAll() {
    renderStats();
    renderCategoryFilter();
    renderTable();
  }

  function loadProviders() {
    if (!window.ServeEaseApi || !window.ServeEaseApi.getProviderVerificationRequests) {
      setMessage("Provider verification API is unavailable. Start the backend and refresh.", "error");
      return;
    }
    setMessage("");
    setLoading(true);
    window.ServeEaseApi.getProviderVerificationRequests()
      .then(function (items) {
        providers = mergeCatalogProviders(Array.isArray(items) ? items : []);
        renderAll();
      })
      .catch(function (error) {
        providers = mergeCatalogProviders([]);
        renderAll();
        setMessage(error.message || "Unable to load provider verification requests.", "error");
      });
  }

  function openProviderDetails(providerId) {
    setMessage("");
    return window.ServeEaseApi.getProviderVerificationDetails(providerId)
      .then(renderProviderDetails)
      .catch(function (error) {
        const localProvider = providers.find(function (item) { return item.id === providerId; });
        if (localProvider) return renderProviderDetails(localProvider);
        setMessage(error.message || "Unable to load provider details.", "error");
      });
  }

  function renderProviderDetails(provider) {
    selectedProvider = provider;
    upsertProvider(provider);
    byId("providerDetailsTitle").textContent = provider.name;
    byId("providerDetailsSubtitle").textContent = provider.id + " - " + provider.status;
    byId("providerDetailsBody").innerHTML = detailsMarkup(provider);
    byId("providerDetailsActions").innerHTML =
      '<button class="btn superuser-success-btn" type="button" data-provider-action="approve" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("approve", provider) + '>Approve Provider</button>' +
      '<button class="btn superuser-danger-outline-btn" type="button" data-provider-action="reject" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("reject", provider) + '>Reject Provider</button>' +
      '<button class="btn btn-outline" type="button" data-provider-action="suspend" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("suspend", provider) + '>Suspend Provider</button>';
    wireDetailsButtons();
    openModal("providerDetailsModalBackdrop");
    return provider;
  }

  function openProviderDocuments(providerId) {
    openProviderDetails(providerId).then(function () {
      setTimeout(function () {
        const documentSection = byId("providerDetailsBody")?.querySelector(".provider-document-list");
        if (documentSection) documentSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    });
  }

  function detailsMarkup(provider) {
    return '<section><h4>Basic Details</h4><div class="superuser-detail-grid">' +
      detail("Name", provider.name) + detail("Email", provider.email) + detail("Phone", provider.phone) +
      detail("Organisation", provider.organisationName || provider.name) + detail("Address", provider.address) + detail("Service Category", provider.category) +
      detail("Experience", provider.experience + " years") + detail("Joined Date", formatDate(provider.joinedDate)) +
      detail("Location", provider.location) + '</div></section>' +
      '<section><h4>Professional Details</h4><div class="superuser-detail-grid">' +
      detail("Skills", (provider.skills || []).join(", ")) + detail("Certifications", (provider.certifications || []).join(", ")) +
      detail("Completed Jobs", provider.completedJobs) + detail("Rating", provider.rating) + '</div></section>' +
        '<section><h4>Verification Documents</h4><div class="provider-document-list">' + documentsMarkup(supportedDocuments(provider.documents)) + '</div></section>' +
      '<section><h4>Status History</h4><div class="provider-history-list">' + historyMarkup(provider.statusHistory || []) + '</div></section>' +
      '<section><h4>Admin Remarks</h4><div class="superuser-detail-card">' + escapeHtml(provider.adminRemarks || provider.rejectionReason || "No remarks added yet.") + '</div></section>';
  }

  function detail(label, value) {
    return '<div class="superuser-detail-field"><span>' + escapeHtml(label) + ':</span><strong>' + escapeHtml(value || "N/A") + '</strong></div>';
  }

  function documentsMarkup(documents) {
    if (!documents.length) return '<div class="superuser-empty-state">No documents uploaded.</div>';
    return supportedDocuments(documents).map(function (document) {
      return '<article class="provider-document-card">' +
        '<div><h5>' + escapeHtml(document.documentType) + (document.required ? ' <span class="provider-required-chip">Required</span>' : '') + '</h5>' +
        '<p>' + escapeHtml(document.documentName) + '</p>' +
        '<span class="superuser-chip ' + chipClass(document.documentStatus) + '">' + escapeHtml(document.documentStatus) + '</span>' +
        (document.rejectionReason ? '<p class="provider-rejection-note">Reason: ' + escapeHtml(document.rejectionReason) + '</p>' : '') + '</div>' +
        '<div class="provider-document-actions">' +
          '<button class="superuser-inline-action" type="button" data-preview-document="' + escapeHtml(document.documentId) + '">Preview</button>' +
          '<button class="superuser-inline-action provider-action-approve" type="button" data-document-action="approve" data-document-id="' + escapeHtml(document.documentId) + '">Approve</button>' +
          '<button class="superuser-inline-action provider-action-reject" type="button" data-document-action="reject" data-document-id="' + escapeHtml(document.documentId) + '">Reject</button>' +
        '</div>' +
      '</article>';
    }).join("");
  }

  function historyMarkup(history) {
    if (!history.length) return '<div class="superuser-empty-state">No status history available.</div>';
    return history.map(function (item) {
      return '<div class="provider-history-item"><span class="superuser-chip ' + chipClass(item.status) + '">' + escapeHtml(item.status) + '</span><div><strong>' + escapeHtml(item.note) + '</strong><p>' + escapeHtml(item.updatedBy) + ' - ' + formatDate(item.updatedAt) + '</p></div></div>';
    }).join("");
  }

  function wireDetailsButtons() {
    byId("providerDetailsActions").querySelectorAll("[data-provider-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        openActionConfirm(button.dataset.providerAction, button.dataset.providerId);
      });
    });
    byId("providerDetailsBody").querySelectorAll("[data-preview-document]").forEach(function (button) {
      button.addEventListener("click", function () { previewDocument(button.dataset.previewDocument); });
    });
    byId("providerDetailsBody").querySelectorAll("[data-document-action]").forEach(function (button) {
      button.addEventListener("click", function () {
        openDocumentConfirm(button.dataset.documentAction, button.dataset.documentId);
      });
    });
  }

  function previewDocument(documentId) {
    const document = (selectedProvider.documents || []).find(function (item) { return item.documentId === documentId; });
    if (!document) return;
    const resolver = window.ServeEaseAttachments && window.ServeEaseAttachments.canonicalResolveProviderDocument;
    const resolved = resolver ? resolver(selectedProvider.id, document) : null;
    const previewUrl = resolved && resolved.previewUrl;
    const mimeType = String((resolved && resolved.mimeType) || document.mimeType || "").toLowerCase();
    const fileName = String((resolved && resolved.filename) || document.documentName || "").toLowerCase();
    const isImagePreview = mimeType.indexOf("image/") === 0 || /\.(png|jpe?g|gif|webp|bmp|svg)(?:$|\?)/.test(fileName);
    const isPdfPreview = mimeType === "application/pdf" || /\.pdf(?:$|\?)/.test(fileName);
    const previewMarkup = previewUrl && isImagePreview
      ? '<img class="provider-document-preview-media" src="' + previewUrl + '" alt="' + escapeHtml(document.documentName) + '" />'
      : (previewUrl && isPdfPreview
        ? '<div class="provider-document-pdf-actions"><p>PDF preview is available using the original uploaded file.</p><a class="btn btn-primary" target="_blank" rel="noopener" href="' + previewUrl + '">Open PDF</a><a class="btn btn-outline" target="_blank" rel="noopener" download="' + escapeHtml(resolved.filename) + '" href="' + previewUrl + '">Download PDF</a></div>'
        : (previewUrl
          ? '<div class="provider-document-placeholder"><strong>' + escapeHtml(resolved.filename) + '</strong><p>This file type does not support inline preview.</p><a class="btn btn-primary" target="_blank" rel="noopener" download="' + escapeHtml(resolved.filename) + '" href="' + previewUrl + '">Open or download file</a></div>'
          : '<div class="provider-document-placeholder">' + (resolved && resolved.metadataOnly
          ? 'This document contains verification metadata only; no uploaded file content is stored.'
          : 'Preview unavailable because the stored file content is missing or corrupted.') + '</div>'));
    byId("providerDocumentTitle").textContent = document.documentType;
    byId("providerDocumentSubtitle").textContent = document.documentName;
    byId("providerDocumentBody").innerHTML =
      '<div class="provider-document-preview"><strong>' + escapeHtml(document.documentName) + '</strong><p>Status: ' + escapeHtml(document.documentStatus) + '</p>' + previewMarkup + '</div>';
    openModal("providerDocumentModalBackdrop");
  }

  function openActionConfirm(action, providerId) {
    const provider = providers.find(function (item) { return item.id === providerId; }) || selectedProvider;
    const labels = {
      approve: ["Approve Provider", "Approve " + (provider ? provider.name : providerId) + "? Required documents must already be approved."],
      reject: ["Reject Provider", "Reject " + (provider ? provider.name : providerId) + "? Please add a rejection reason."],
      suspend: ["Suspend Provider", "Suspend " + (provider ? provider.name : providerId) + "?"]
    };
    pendingAction = { type: "provider", action: action, providerId: providerId };
    prepareConfirm(labels[action][0], labels[action][1], action === "reject" || action === "suspend", true);
  }

  function openDocumentConfirm(action, documentId) {
    const document = (selectedProvider.documents || []).find(function (item) { return item.documentId === documentId; });
    pendingAction = { type: "document", action: action, providerId: selectedProvider.id, documentId: documentId };
    prepareConfirm(
      action === "approve" ? "Approve Document" : "Reject Document",
      (action === "approve" ? "Approve " : "Reject ") + (document ? document.documentType : "this document") + "?",
      action === "reject",
      false
    );
  }

  function prepareConfirm(title, message, needsReason, showRemarks) {
    byId("providerConfirmTitle").textContent = title;
    byId("providerConfirmMessage").textContent = message;
    byId("providerReasonWrap").classList.toggle("hidden", !needsReason);
    byId("providerRemarksWrap").classList.toggle("hidden", !showRemarks);
    byId("providerActionReason").value = "";
    byId("providerActionRemarks").value = "";
    byId("providerActionReasonError").textContent = "";
    openModal("providerConfirmModalBackdrop");
  }

  function submitPendingAction() {
    if (!pendingAction) return;
    const reason = byId("providerActionReason").value.trim();
    const remarks = byId("providerActionRemarks").value.trim();
    const reasonError = byId("providerActionReasonError");
    reasonError.textContent = "";

    if ((pendingAction.action === "reject" || pendingAction.action === "suspend") && reason.length < 5) {
      reasonError.textContent = "Reason must contain at least 5 characters.";
      return;
    }

    const api = window.ServeEaseApi;
    let request;
    const provider = providers.find(function (item) { return item.id === pendingAction.providerId; });
    if (provider && provider.source === "catalog") {
      if (pendingAction.action === "suspend") {
        handleCatalogSuspend(provider, reason, remarks);
        return;
      }
      reasonError.textContent = "Catalog providers are already active. Only suspension is available for active catalog providers.";
      return;
    }
    if (pendingAction.type === "provider") {
      request = canonicalProviderAction(pendingAction, provider, reason, remarks);
    } else {
      request = pendingAction.action === "approve"
        ? api.approveProviderDocument(pendingAction.providerId, pendingAction.documentId)
        : api.rejectProviderDocument(pendingAction.providerId, pendingAction.documentId, { rejectionReason: reason });
    }

    byId("providerConfirmSubmitBtn").disabled = true;
    request.then(function () {
      mirrorApiActionToLocal(pendingAction, reason, remarks);
      closeModal("providerConfirmModalBackdrop");
      setMessage("Verification update saved successfully.", "success");
      pushSuperuserNotification("Provider verification updated - " + pendingAction.providerId, "blue", "superuser-provider-verification.html");
      return refreshAfterMutation(pendingAction.providerId);
    }).catch(function (error) {
      reasonError.textContent = error.message || "Unable to save verification update.";
    }).finally(function () {
      byId("providerConfirmSubmitBtn").disabled = false;
    });
  }

  function canonicalProviderAction(action, provider, reason, remarks) {
    const operations = window.ServeEaseProviderOperations;
    if (!operations) return Promise.reject(new Error("Provider approval service is unavailable."));

    // Provider Operations owns the provider lifecycle transition. Keep the
    // verification page as a caller so all provider records receive one
    // consistent state update, keyed by the canonical provider ID.
    const result = action.action === "approve"
      ? operations.approveProvider(action.providerId, remarks)
      : action.action === "reject"
        ? operations.rejectProvider(action.providerId, reason, remarks)
        : operations.suspendProvider(action.providerId, reason, remarks);
    if (!result || !result.ok) return Promise.reject(new Error((result && result.message) || "Unable to update provider verification."));

    // Retain the existing backend synchronization for API-backed requests.
    if (provider && provider.source !== "registration" && window.ServeEaseApi) {
      const sync = action.action === "approve"
        ? window.ServeEaseApi.approveProviderVerification(action.providerId, { adminRemarks: remarks })
        : action.action === "reject"
          ? window.ServeEaseApi.rejectProviderVerification(action.providerId, { rejectionReason: reason, adminRemarks: remarks })
          : window.ServeEaseApi.suspendProviderVerification(action.providerId, { adminRemarks: remarks || reason, suspensionReason: reason });
      return sync.catch(function (error) {
        console.warn("Provider verification backend synchronization skipped after local canonical update.", error);
        return null;
      });
    }
    return Promise.resolve(result);
  }

  function handleCatalogSuspend(provider, reason, remarks) {
    const data = getAppData();
    if (!Array.isArray(data.providerApprovalRequests)) data.providerApprovalRequests = [];
    const suspendedIds = getSuspendedCatalogIds();
    if (suspendedIds.indexOf(provider.id) === -1) {
      suspendedIds.push(provider.id);
      setSuspendedCatalogIds(suspendedIds);
    }

    const request = {
      id: provider.id,
      fullName: provider.name,
      organisationName: provider.organisationName || provider.name,
      email: provider.email,
      phone: provider.phone || "",
      category: provider.category,
      serviceType: provider.category,
      experience: provider.experience,
      cityId: provider.cityId || 1,
      cityName: provider.location,
      location: provider.location,
      address: provider.address || provider.location,
      providerCatalogId: provider.id,
      registrationDate: provider.joinedDate || provider.submittedDate || "01 Jan 2026",
      documents: supportedDocuments(provider.documents),
      verificationStatus: "Suspended",
      approvalStatus: "Suspended",
      adminRemarks: remarks || reason,
      rejectionReason: "",
      suspensionReason: reason
    };

    data.providerApprovalRequests = data.providerApprovalRequests.filter(function (item) {
      return item.id !== provider.id;
    });
    data.providerApprovalRequests.unshift(request);
    suspendLocalProvider(data, request, remarks || reason);
    localStorage.setItem("serveEaseData", JSON.stringify(data));

    pushSuperuserNotification("Provider suspended - " + provider.name, "red", "superuser-provider-verification.html");
    providers = mergeCatalogProviders([]);
    selectedProvider = mapRegisteredProvider(request);
    closeModal("providerConfirmModalBackdrop");
    setMessage("Provider suspended and removed from customer browse.", "success");
    renderAll();
    renderProviderDetails(selectedProvider);
    byId("providerConfirmSubmitBtn").disabled = false;
  }

  function mirrorApiActionToLocal(action, reason, remarks) {
    const data = getAppData();
    const requests = Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : [];
    const request = requests.find(function (item) { return item.id === action.providerId; });
    if (!request) return;

    request.documents = supportedDocuments(request.documents);
    if (action.type === "document") {
      const document = request.documents.find(function (item) {
        return item.documentId === action.documentId;
      });
      if (document) {
        document.documentStatus = action.action === "approve" ? "Approved" : "Rejected";
        document.rejectionReason = action.action === "reject" ? reason : "";
      }
    } else if (action.type === "provider") {
      request.verificationStatus = action.action === "approve" ? "Verified" : (action.action === "reject" ? "Rejected" : "Suspended");
      request.approvalStatus = action.action === "approve" ? "Active" : request.verificationStatus;
      request.adminRemarks = remarks || request.adminRemarks || "";
      request.rejectionReason = action.action === "reject" ? reason : request.rejectionReason;
      if (action.action === "approve") promoteVerifiedProvider(data, request);
      if (action.action === "suspend") suspendLocalProvider(data, request, remarks || reason);
    }

    localStorage.setItem("serveEaseData", JSON.stringify(data));
  }

  function handleLocalRegistrationAction(action, reason, remarks) {
    const data = getAppData();
    const requests = Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : [];
    const request = requests.find(function (item) { return item.id === action.providerId; });
    if (!request) {
      byId("providerActionReasonError").textContent = "Local provider request was not found.";
      return;
    }

    request.documents = supportedDocuments(request.documents);
    if (action.type === "document") {
      const document = request.documents.find(function (item) {
        return item.documentId === action.documentId;
      });
      if (!document) {
        byId("providerActionReasonError").textContent = "Document was not found.";
        return;
      }
      document.documentStatus = action.action === "approve" ? "Approved" : "Rejected";
      document.rejectionReason = action.action === "reject" ? reason : "";
    } else if (action.type === "provider") {
      if (action.action === "approve" && !allRequiredDocumentsApproved(mapRegisteredProvider(request))) {
        byId("providerActionReasonError").textContent = "Approve all required documents before approving this provider.";
        return;
      }
      request.verificationStatus = action.action === "approve" ? "Verified" : (action.action === "reject" ? "Rejected" : "Suspended");
      request.approvalStatus = action.action === "approve" ? "Active" : request.verificationStatus;
      request.adminRemarks = remarks || request.adminRemarks || "";
      request.rejectionReason = action.action === "reject" ? reason : request.rejectionReason;
      if (action.action === "approve") promoteVerifiedProvider(data, request);
      if (action.action === "suspend") suspendLocalProvider(data, request, remarks || reason);
    }

    localStorage.setItem("serveEaseData", JSON.stringify(data));
    pushSuperuserNotification(
      action.type === "document"
        ? "Provider document " + action.action + "d - " + request.fullName
        : "Provider " + request.verificationStatus.toLowerCase() + " - " + request.fullName,
      action.action === "reject" ? "red" : "blue",
      "superuser-provider-verification.html"
    );
    providers = mergeCatalogProviders([]);
    selectedProvider = mapRegisteredProvider(request);
    closeModal("providerConfirmModalBackdrop");
    setMessage("Verification update saved successfully.", "success");
    renderAll();
    renderProviderDetails(selectedProvider);
    byId("providerConfirmSubmitBtn").disabled = false;
  }

  function promoteVerifiedProvider(data, request) {
    if (!Array.isArray(data.providers)) data.providers = [];
    if (!Array.isArray(data.users)) data.users = [];
    clearSuspendedCatalogProvider(request);
    const categoryId = categoryIdFromServiceType(request.serviceType || request.category);
    const cityId = Number(request.cityId) || cityIdFromName(request.cityName || request.location);
    const cityName = request.cityName || request.location || cityNameFromId(cityId) || "Chennai";
    const baseCatalogId = request.providerCatalogId || slugify(request.organisationName || request.fullName || request.name);
    const catalogProviderId = baseCatalogId + "-" + categoryId + "-" + cityId;
    const serviceName = request.serviceSubcategory || request.serviceType || request.category || catalogCategoryName(categoryId);
    const profilePhoto = getProfilePhotoForRequest(request);

    const providerRecord = {
      id: catalogProviderId,
      providerId: request.id,
      fullName: request.fullName || request.name || request.organisationName || "Provider",
      name: request.organisationName || request.fullName || request.name || "Provider",
      organisationName: request.organisationName || request.fullName || request.name || "Provider",
      email: request.email,
      phone: request.phone || "",
      category: categoryId,
      serviceType: request.serviceType || request.category || "Home Service",
      experience: Number(request.experience) || 0,
      years: Number(request.experience) || 1,
      cityId: cityId,
      cityName: cityName,
      location: cityName,
      address: request.address || "",
      registrationDate: request.registrationDate || "Just now",
      approvalStatus: "Active",
      status: "Active",
      verificationStatus: "Verified",
      providerCatalogId: baseCatalogId,
      subServices: [serviceName],
      rating: 0,
      reviews: 0,
      distance: "1.0 km",
      startingPrice: 499,
      jobsDone: 0,
      availableToday: true,
      verified: true,
      image: profilePhoto || categoryImage(categoryId),
      isNewProvider: true,
      ownerProviderId: request.id,
      ownerProviderEmail: request.email
    };

    data.providers = data.providers.filter(function (provider) {
      return !(provider.email && request.email && provider.email.toLowerCase() === request.email.toLowerCase()) &&
        !(provider.ownerProviderId && provider.ownerProviderId === request.id) &&
        provider.id !== catalogProviderId;
    });
    data.providers.unshift(providerRecord);

    data.users = data.users.filter(function (user) {
      return !(user.email && request.email && user.email.toLowerCase() === request.email.toLowerCase());
    });
    data.users.push({
      ...request,
      role: "provider",
      approvalStatus: "Active",
      status: "Active",
      verificationStatus: "Verified",
      providerCatalogId: baseCatalogId
    });
  }

  function suspendLocalProvider(data, request, reason) {
    if (!Array.isArray(data.providers)) data.providers = [];
    if (!Array.isArray(data.users)) data.users = [];
    data.providers = data.providers.filter(function (provider) {
      return provider.id !== request.id &&
        !(provider.ownerProviderId === request.id) &&
        !(provider.email && request.email && provider.email.toLowerCase() === request.email.toLowerCase());
    });
    data.users.forEach(function (user) {
      if (user.id === request.id || (user.email && request.email && user.email.toLowerCase() === request.email.toLowerCase())) {
        user.approvalStatus = "Suspended";
        user.status = "Suspended";
        user.suspensionReason = reason || "Suspended by admin.";
      }
    });

    Object.keys(localStorage).forEach(function (key) {
      if (key.indexOf("serveEaseProviderModuleData") !== 0) return;
      try {
        const moduleData = JSON.parse(localStorage.getItem(key) || "null");
        const profile = moduleData && moduleData.profile;
        const matchesProvider = profile && (
          profile.providerId === request.id ||
          (profile.email && request.email && profile.email.toLowerCase() === request.email.toLowerCase())
        );
        if (!matchesProvider) return;
        profile.accountStatus = "Suspended";
        profile.suspensionReason = reason || "Suspended by admin.";
        if (Array.isArray(moduleData.services)) {
          moduleData.services.forEach(function (service) {
            service.status = "Suspended";
          });
        }
        localStorage.setItem(key, JSON.stringify(moduleData));
      } catch (error) {
        /* ignore invalid provider module data */
      }
    });
  }

  function refreshAfterMutation(providerId) {
    return window.ServeEaseApi.getProviderVerificationRequests().then(function (items) {
      providers = mergeCatalogProviders(Array.isArray(items) ? items : []);
      renderAll();
      if (selectedProvider && selectedProvider.id === providerId) {
        return window.ServeEaseApi.getProviderVerificationDetails(providerId).then(function (provider) {
          selectedProvider = provider;
          byId("providerDetailsBody").innerHTML = detailsMarkup(provider);
          byId("providerDetailsSubtitle").textContent = provider.id + " - " + provider.status;
          byId("providerDetailsActions").innerHTML =
            '<button class="btn superuser-success-btn" type="button" data-provider-action="approve" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("approve", provider) + '>Approve Provider</button>' +
            '<button class="btn superuser-danger-outline-btn" type="button" data-provider-action="reject" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("reject", provider) + '>Reject Provider</button>' +
            '<button class="btn btn-outline" type="button" data-provider-action="suspend" data-provider-id="' + escapeHtml(provider.id) + '"' + providerActionDisabled("suspend", provider) + '>Suspend Provider</button>';
          wireDetailsButtons();
        });
      }
      return null;
    });
  }

  function upsertProvider(provider) {
    const index = providers.findIndex(function (item) { return item.id === provider.id; });
    if (index === -1) providers.push(provider);
    else providers[index] = provider;
    renderAll();
  }

  function openModal(id) {
    const node = byId(id);
    if (node) node.classList.remove("hidden");
  }

  function closeModal(id) {
    const node = byId(id);
    if (node) node.classList.add("hidden");
  }

  function wireEvents() {
    ["providerVerificationSearch", "providerStatusFilter", "providerCategoryFilter", "providerSortFilter"].forEach(function (id) {
      const node = byId(id);
      if (node) node.addEventListener("input", renderTable);
      if (node) node.addEventListener("change", renderTable);
    });
    byId("providerVerificationRefreshBtn").addEventListener("click", loadProviders);
    byId("providerConfirmSubmitBtn").addEventListener("click", submitPendingAction);
    document.querySelectorAll("[data-close-modal]").forEach(function (button) {
      button.addEventListener("click", function () { closeModal(button.dataset.closeModal); });
    });
    document.querySelectorAll(".superuser-modal-backdrop").forEach(function (backdrop) {
      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) backdrop.classList.add("hidden");
      });
    });
  }

  wireEvents();
  loadProviders();
})();
