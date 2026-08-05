(function () {
  const storageKey = "serveEaseTicketsData";
  const ticketTypes = [
    "Poor Service Quality",
    "Provider Not Arrived",
    "Late Arrival",
    "Overcharging",
    "Misbehavior",
    "Payment Issue",
    "Service Not Completed",
    "Refund Request",
    "Safety Concern",
    "Fraud",
    "Other"
  ];
  const finalDecisions = [
    "Refund Approved",
    "Refund Rejected",
    "Rework Scheduled",
    "Provider Warning Issued",
    "Provider Suspended",
    "Ticket Rejected",
    "No Action Required"
  ];
  const priorities = ["Low", "Medium", "High", "Critical"];

  function byId(id) {
    return document.getElementById(id);
  }

  function session() {
    try {
      return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null") || {};
    } catch (error) {
      return {};
    }
  }

  function formatDisplayDate(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDate(value) : (value || "");
  }

  function formatDisplayDateTime(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDateTime(value) : (value || "");
  }

  function stamp() {
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

  function demoTickets() {
    return [
      {
        ticketId: "TKT-20260518-1008",
        bookingId: "BOOK-2026-1045",
        customerId: "CUS001",
        customerName: "Raghava Kumar",
        providerId: "sparkle-home-care",
        providerName: "Sparkle Home Care",
        ticketType: "Safety Concern",
        description: "Customer reported that the provider entered a restricted room without permission and ignored safety instructions during the bathroom cleaning visit.",
        evidenceUrl: "customer-chat-screenshot.png",
        status: "Escalated",
        priority: "Critical",
        supportRemarks: "Support spoke to the customer and provider. Customer shared chat proof, so this requires admin review for provider warning or suspension.",
        adminRemarks: "",
        finalDecision: "",
        createdAt: "2026-05-18T08:35:00.000Z",
        updatedAt: "2026-05-18T09:20:00.000Z",
        escalatedAt: "2026-05-18T09:20:00.000Z",
        statusHistory: [
          { status: "Escalated", note: "Safety concern verified by support and escalated to admin.", updatedBy: "Support", updatedAt: "2026-05-18T09:20:00.000Z" },
          { status: "In Progress", note: "Support contacted customer and requested evidence.", updatedBy: "Support", updatedAt: "2026-05-18T08:55:00.000Z" },
          { status: "Pending", note: "Ticket created by customer.", updatedBy: "Customer", updatedAt: "2026-05-18T08:35:00.000Z" }
        ]
      },
      {
        ticketId: "TKT-20260517-1007",
        bookingId: "BK-10231",
        customerId: "CUS001",
        customerName: "Raghava Kumar",
        providerId: "coolair-services",
        providerName: "CoolAir Services",
        ticketType: "Service Not Completed",
        description: "AC service was marked completed, but cooling issue remained unresolved and the provider left without testing the unit.",
        evidenceUrl: "ac-service-video.mp4",
        status: "Under Review",
        priority: "High",
        supportRemarks: "Support confirmed the job was not fully completed. Admin decision needed for rework or partial refund.",
        adminRemarks: "Reviewing booking notes and provider history before final decision.",
        finalDecision: "",
        createdAt: "2026-05-17T12:10:00.000Z",
        updatedAt: "2026-05-18T06:10:00.000Z",
        escalatedAt: "2026-05-17T13:00:00.000Z",
        statusHistory: [
          { status: "Under Review", note: "Admin started review.", updatedBy: "Admin", updatedAt: "2026-05-18T06:10:00.000Z" },
          { status: "Escalated", note: "Support escalated due to rework/refund decision.", updatedBy: "Support", updatedAt: "2026-05-17T13:00:00.000Z" },
          { status: "Pending", note: "Ticket created by customer.", updatedBy: "Customer", updatedAt: "2026-05-17T12:10:00.000Z" }
        ]
      },
      {
        ticketId: "TKT-20260516-1006",
        bookingId: "BK-10234",
        customerId: "CUS001",
        customerName: "Raghava Kumar",
        providerId: "urban-shine-cleaners",
        providerName: "Urban Shine Cleaners",
        ticketType: "Overcharging",
        description: "Provider asked for extra cash after the full home cleaning booking was already prepaid through ServeEase.",
        evidenceUrl: "payment-receipt.jpg",
        status: "Escalated",
        priority: "High",
        supportRemarks: "Payment record confirms prepaid booking. Refund approval or provider warning must be decided by admin.",
        adminRemarks: "",
        finalDecision: "",
        createdAt: "2026-05-16T10:45:00.000Z",
        updatedAt: "2026-05-16T11:30:00.000Z",
        escalatedAt: "2026-05-16T11:30:00.000Z",
        statusHistory: [
          { status: "Escalated", note: "Overcharging case requires admin decision.", updatedBy: "Support", updatedAt: "2026-05-16T11:30:00.000Z" },
          { status: "In Progress", note: "Support verified payment status.", updatedBy: "Support", updatedAt: "2026-05-16T11:05:00.000Z" },
          { status: "Pending", note: "Ticket created by customer.", updatedBy: "Customer", updatedAt: "2026-05-16T10:45:00.000Z" }
        ]
      },
      {
        ticketId: "TKT-20260514-1004",
        bookingId: "BOOK-2026-1047",
        customerId: "CUS002",
        customerName: "Neha Iyer",
        providerId: "quickrepair-services",
        providerName: "QuickRepair Services",
        ticketType: "Provider Not Arrived",
        description: "Provider did not arrive for the scheduled AC repair slot and customer requested refund approval.",
        evidenceUrl: "",
        status: "Resolved",
        priority: "Medium",
        supportRemarks: "Provider accepted no-show due to scheduling mistake.",
        adminRemarks: "Refund approved and provider warning issued for missed appointment.",
        finalDecision: "Refund Approved",
        createdAt: "2026-05-14T14:15:00.000Z",
        updatedAt: "2026-05-14T16:05:00.000Z",
        resolvedAt: "2026-05-14T16:05:00.000Z",
        escalatedAt: "2026-05-14T15:10:00.000Z",
        statusHistory: [
          { status: "Resolved", note: "Refund Approved: Refund approved and provider warning issued.", updatedBy: "Admin", updatedAt: "2026-05-14T16:05:00.000Z" },
          { status: "Escalated", note: "Refund approval required.", updatedBy: "Support", updatedAt: "2026-05-14T15:10:00.000Z" },
          { status: "Pending", note: "Ticket created by customer.", updatedBy: "Customer", updatedAt: "2026-05-14T14:15:00.000Z" }
        ]
      },
      {
        ticketId: "TKT-20260513-1002",
        bookingId: "BK-10233",
        customerId: "CUS003",
        customerName: "Amit Sharma",
        providerId: "quickfix-plumbing",
        providerName: "QuickFix Plumbing",
        ticketType: "Fraud",
        description: "Customer claimed provider sold a fake replacement part, but uploaded evidence did not support the claim.",
        evidenceUrl: "invoice-copy.jpg",
        status: "Rejected",
        priority: "Critical",
        supportRemarks: "Support checked invoice and provider purchase bill. No fraud evidence found.",
        adminRemarks: "Ticket rejected because documents confirm genuine part replacement.",
        finalDecision: "Ticket Rejected",
        createdAt: "2026-05-13T09:00:00.000Z",
        updatedAt: "2026-05-13T12:30:00.000Z",
        resolvedAt: "2026-05-13T12:30:00.000Z",
        escalatedAt: "2026-05-13T10:15:00.000Z",
        statusHistory: [
          { status: "Rejected", note: "Ticket Rejected: Documents did not prove fraud.", updatedBy: "Admin", updatedAt: "2026-05-13T12:30:00.000Z" },
          { status: "Escalated", note: "Fraud allegation escalated by support.", updatedBy: "Support", updatedAt: "2026-05-13T10:15:00.000Z" },
          { status: "Pending", note: "Ticket created by customer.", updatedBy: "Customer", updatedAt: "2026-05-13T09:00:00.000Z" }
        ]
      }
    ];
  }

  function getStore() {
    const data = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (data && Array.isArray(data.tickets) && data.tickets.length) return data;
    const seeded = { tickets: demoTickets() };
    localStorage.setItem(storageKey, JSON.stringify(seeded));
    return seeded;
  }

  function setStore(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
    if (window.ServeEaseApi && typeof window.ServeEaseApi.saveState === "function") {
      window.ServeEaseApi.saveState(storageKey, data).catch(function () { return null; });
    }
  }

  function statusClass(status) {
    return String(status || "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  function escapeText(value) {
    return String(value || "").replace(/[<>]/g, "").trim();
  }

  function customerData() {
    const current = session();
    const suffix = current.email === "user@serveease.com" || current.userId === "CUS001"
      ? "serveEaseCustomerModuleData"
      : "serveEaseCustomerModuleData:" + (current.userId || String(current.email || "customer").toLowerCase());
    const data = JSON.parse(localStorage.getItem(suffix) || '{"bookings":[]}');
    const normalized = window.ServeEaseBookingWorkflow && window.ServeEaseBookingWorkflow.normalizeData(data);
    if (normalized && normalized.changed) localStorage.setItem(suffix, JSON.stringify(normalized.data));
    return normalized ? normalized.data : data;
  }

  function normalizeTicket(raw) {
    raw = raw || {};
    return {
      ticketId: raw.ticketId || raw.ticketId || raw.id || ("CMP-" + Date.now()),
      bookingId: raw.bookingId || raw.relatedBookingId || raw.bookingRef || "N/A",
      customerId: raw.customerId || (raw.raisedByType === "customer" ? raw.raisedById : "") || session().userId || session().email || "CUS001",
      customerName: raw.customerName || (raw.raisedByType === "customer" ? raw.raisedByName : "") || session().fullName || "Customer",
      providerId: raw.providerId || "",
      providerName: raw.providerName || raw.provider || "ServeEase Provider",
      ticketType: raw.ticketType || raw.ticketType || raw.category || "Other",
      description: raw.description || "",
      evidenceUrl: raw.evidenceUrl || raw.attachmentUrl || raw.evidenceName || "",
      attachmentId: raw.attachmentId || "",
      attachmentName: raw.attachmentName || raw.evidenceName || "",
      attachmentType: raw.attachmentType || raw.fileType || "",
      attachmentSize: raw.attachmentSize || raw.fileSize || 0,
      status: raw.status || "Pending",
      priority: raw.priority || "Medium",
      supportRemarks: raw.supportRemarks || "",
      adminRemarks: raw.adminRemarks || "",
      finalDecision: raw.finalDecision || "",
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
      resolvedAt: raw.resolvedAt || "",
      escalatedAt: raw.escalatedAt || "",
      statusHistory: Array.isArray(raw.statusHistory) ? raw.statusHistory : [
        { status: raw.status || "Pending", note: "Ticket created.", updatedBy: "Customer", updatedAt: raw.createdAt || new Date().toISOString() }
      ],
      raisedByType: raw.raisedByType || "customer",
      raisedByName: raw.raisedByName || raw.customerName || "",
      raisedByEmail: raw.raisedByEmail || ""
    };
  }

  function upsertTicket(ticket) {
    const store = getStore();
    ticket = normalizeTicket(ticket);
    const index = store.tickets.findIndex(function (item) { return item.ticketId === ticket.ticketId; });
    if (index >= 0) store.tickets[index] = ticket;
    else store.tickets.unshift(ticket);
    setStore(store);
    return ticket;
  }

  function addHistory(ticket, status, note, updatedBy) {
    ticket.status = status || ticket.status;
    ticket.updatedAt = new Date().toISOString();
    ticket.statusHistory = Array.isArray(ticket.statusHistory) ? ticket.statusHistory : [];
    ticket.statusHistory.unshift({ status: ticket.status, note: note, updatedBy: updatedBy, updatedAt: new Date().toISOString() });
  }

  function syncFromApi(role, done) {
    if (!window.ServeEaseApi) {
      if (done) done();
      return;
    }
    const call = role === "support"
      ? window.ServeEaseApi.getSupportTickets
      : role === "admin"
        ? window.ServeEaseApi.getEscalatedTickets
        : window.ServeEaseApi.getMyTickets;
    if (typeof call !== "function") {
      if (done) done();
      return;
    }
    call().then(function (items) {
      if (Array.isArray(items)) items.forEach(upsertTicket);
    }).catch(function () {
      return null;
    }).finally(function () {
      if (done) done();
    });
  }

  function ticketMatchesCustomer(ticket) {
    const current = session();
    if (!current.email && !current.userId) return true;
    return ticket.customerId === current.userId || String(ticket.customerId || "").toLowerCase() === String(current.email || "").toLowerCase();
  }

  function createTicketModal() {
    if (byId("ticketModalBackdrop")) return;
    document.body.insertAdjacentHTML("beforeend", `
      <div class="modal-backdrop hidden" id="ticketModalBackdrop">
        <div class="modal-card ticket-modal-card">
          <div class="modal-head">
            <h2 id="ticketModalTitle">Raise Ticket</h2>
            <button type="button" class="close-modal-btn" id="closeTicketModal">×</button>
          </div>
          <form id="ticketForm" class="ticket-form">
            <div class="info-grid">
              <div class="info-box"><strong>Booking ID</strong><input type="text" id="ticketBookingId" readonly /></div>
              <div class="info-box"><strong>Provider</strong><input type="text" id="ticketProviderName" readonly /></div>
            </div>
            <label>Ticket Type</label>
            <select id="ticketType">${ticketTypes.map(function (type) { return `<option value="${type}">${type}</option>`; }).join("")}</select>
            <label>Description</label>
            <textarea id="ticketDescription" maxlength="1000" placeholder="Explain what happened in detail"></textarea>
            <label>Evidence Upload <span class="muted-text">Optional placeholder</span></label>
            <input type="file" id="ticketEvidence" />
            <small class="error" id="ticketFormError"></small>
            <small class="success-message" id="ticketFormSuccess"></small>
            <button class="btn btn-primary btn-full" type="submit">Submit Ticket</button>
          </form>
        </div>
      </div>
    `);
    byId("closeTicketModal").addEventListener("click", function () {
      byId("ticketModalBackdrop").classList.add("hidden");
    });
    byId("ticketModalBackdrop").addEventListener("click", function (event) {
      if (event.target.id === "ticketModalBackdrop") event.target.classList.add("hidden");
    });
  }

  function openTicketModal(booking) {
    createTicketModal();
    byId("ticketBookingId").value = booking.id || "";
    byId("ticketProviderName").value = booking.provider || "ServeEase Provider";
    byId("ticketDescription").value = "";
    byId("ticketFormError").textContent = "";
    byId("ticketFormSuccess").textContent = "";
    byId("ticketModalBackdrop").classList.remove("hidden");
  }

  function bindTicketForm() {
    createTicketModal();
    const form = byId("ticketForm");
    if (!form || form.dataset.bound === "true") return;
    form.dataset.bound = "true";
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const error = byId("ticketFormError");
      const success = byId("ticketFormSuccess");
      error.textContent = "";
      success.textContent = "";
      const bookings = customerData().bookings || [];
      const bookingId = byId("ticketBookingId").value;
      const booking = bookings.find(function (item) { return item.id === bookingId; }) || {};
      const description = escapeText(byId("ticketDescription").value);
      if (!description || description.length < 10) {
        error.textContent = "Ticket description must contain at least 10 characters.";
        return;
      }
      const file = byId("ticketEvidence").files[0];
      const maxAttachmentSize = 5000 * 1024;
      if (file && file.size > maxAttachmentSize) {
        error.textContent = "Attachment must be 5000 KB or smaller.";
        return;
      }
      const payload = {
        bookingId: bookingId,
        ticketType: byId("ticketType").value,
        description: description,
        evidenceUrl: file ? file.name : "",
        customerId: session().userId || session().email || "CUS001",
        customerName: session().fullName || booking.customerName || "Customer"
      };

      async function finish(ticket) {
        ticket = normalizeTicket({
          ...ticket,
          providerName: ticket.providerName || booking.provider,
          providerId: ticket.providerId || booking.providerId
        });
        if (file && window.ServeEaseAttachments) {
          const attachment = await window.ServeEaseAttachments.saveTicketAttachment(ticket.ticketId, file);
          if (attachment) {
            ticket.attachmentId = attachment.attachmentId;
            ticket.attachmentName = attachment.filename;
            ticket.attachmentType = attachment.mimeType;
            ticket.attachmentSize = attachment.fileSize;
          }
        }
        upsertTicket(ticket);
        success.textContent = "Ticket submitted successfully.";
        setTimeout(function () {
          byId("ticketModalBackdrop").classList.add("hidden");
        }, 500);
      }

      if (window.ServeEaseApi && typeof window.ServeEaseApi.createTicket === "function") {
        window.ServeEaseApi.createTicket(payload).then(finish).catch(function () {
          error.textContent = "Unable to submit ticket because backend API failed. Please run the backend and try again.";
        });
      } else {
        error.textContent = "Backend API is not available. Please run the backend and try again.";
      }
    });
  }

  function injectRaiseTicketButtons() {
    if (window.location.pathname.indexOf("my-bookings.html") === -1) return;
    bindTicketForm();
    const bookings = customerData().bookings || [];
    document.querySelectorAll("[data-view-booking]").forEach(function (button) {
      const bookingId = button.dataset.viewBooking;
      const booking = bookings.find(function (item) { return item.id === bookingId; });
      if (!booking || !["Completed", "Cancelled", "Accepted", "Pending"].includes(booking.category || booking.status)) return;
      const parent = button.parentElement;
      if (!parent || parent.querySelector('[data-raise-ticket="' + bookingId + '"]')) return;
      const ticketButton = document.createElement("button");
      ticketButton.type = "button";
      ticketButton.className = parent.tagName === "TD" ? "table-link-btn ticket-link-btn" : "secondary-action ticket-link-btn";
      ticketButton.dataset.raiseTicket = bookingId;
      ticketButton.textContent = "Raise Ticket";
      ticketButton.addEventListener("click", function () { openTicketModal(booking); });
      parent.appendChild(ticketButton);
    });
  }

  function renderMyTicketsPage() {
    const list = byId("myTicketsList");
    if (!list) return;
    const search = byId("myTicketSearch");
    const empty = byId("myTicketsEmptyState");
    const modal = byId("ticketDetailBackdrop");
    const modalBody = byId("ticketDetailBody");
    const closeButton = byId("closeTicketDetailModal");
    let ticketDetailTrigger = null;

    function handleTicketDetailEscape(event) {
      if (event.key === "Escape" && modal && !modal.classList.contains("hidden")) closeTicketDetailModal();
    }

    function openTicketDetailModal(ticket, trigger) {
      if (!modal || !modalBody) return;
      ticketDetailTrigger = trigger || document.activeElement;
      modalBody.innerHTML = ticketDetailsMarkup(ticket, false);
      modal.classList.remove("hidden");
      bindAttachmentPreviewButtons(modalBody);
      document.body.classList.add("modal-open");
      document.removeEventListener("keydown", handleTicketDetailEscape);
      document.addEventListener("keydown", handleTicketDetailEscape);
      if (closeButton) closeButton.focus();
    }

    function closeTicketDetailModal() {
      if (!modal) return;
      const trigger = ticketDetailTrigger;
      modal.classList.add("hidden");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleTicketDetailEscape);
      ticketDetailTrigger = null;
      if (trigger && document.contains(trigger)) trigger.focus();
    }

    function draw() {
      const term = (search ? search.value : "").trim().toLowerCase();
      const tickets = getStore().tickets.filter(ticketMatchesCustomer).filter(function (ticket) {
        return [ticket.ticketId, ticket.bookingId, ticket.ticketType, ticket.providerName, ticket.status]
          .join(" ").toLowerCase().includes(term);
      }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
      list.innerHTML = tickets.map(function (ticket) {
        return `
          <article class="ticket-card">
            <div><h3>${ticket.ticketId}</h3><p>${ticket.ticketType} • ${ticket.providerName}</p></div>
            <span class="ticket-status ${statusClass(ticket.status)}">${ticket.status}</span>
            <div class="ticket-meta"><span>Booking: ${ticket.bookingId}</span><span>Raised: ${formatDisplayDate(ticket.createdAt)}</span></div>
            <div class="ticket-meta"><span>Support: ${ticket.supportRemarks ? "Update available" : "Pending review"}</span><span>Decision: ${ticket.finalDecision || "Awaiting decision"}</span></div>
            <button class="secondary-action" type="button" data-ticket-detail="${ticket.ticketId}">View Details</button>
          </article>
        `;
      }).join("");
      if (empty) empty.classList.toggle("hidden", tickets.length !== 0);
    }

    if (!list.dataset.ticketDetailsBound) {
      list.addEventListener("click", function (event) {
        const button = event.target.closest("[data-ticket-detail]");
        if (!button) return;
        const ticket = getStore().tickets.find(function (item) { return item.ticketId === button.dataset.ticketDetail; });
        if (!ticket) return;
        openTicketDetailModal(ticket, button);
      });
      list.dataset.ticketDetailsBound = "true";
    }
    if (closeButton && !closeButton.dataset.ticketDetailsBound) {
      closeButton.addEventListener("click", closeTicketDetailModal);
      closeButton.dataset.ticketDetailsBound = "true";
    }
    if (modal && !modal.dataset.ticketDetailsBound) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) closeTicketDetailModal();
      });
      modal.dataset.ticketDetailsBound = "true";
    }
    if (search) search.addEventListener("input", draw);
    syncFromApi("customer", draw);
    draw();
  }

  function bindAttachmentPreviewButtons(root) {
    if (!root || !window.ServeEaseAttachments) return;
    root.querySelectorAll(".serveease-attachment-preview-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        const ticket = getStore().tickets.find(function (item) { return (item.ticketId || item.id) === button.dataset.attachmentTicket; });
        if (ticket) window.ServeEaseAttachments.previewTicketAttachment(ticket);
      });
    });
  }

  function ticketDetailsMarkup(ticket, includeHistory) {
    return `
      <div class="info-grid">
        <div class="info-box"><strong>Ticket Details</strong><div class="info-row"><span>ID:</span><span>${ticket.ticketId}</span></div><div class="info-row"><span>Type:</span><span>${ticket.ticketType}</span></div><div class="info-row"><span>Status:</span><span>${ticket.status}</span></div><div class="info-row"><span>Priority:</span><span>${ticket.priority}</span></div></div>
        <div class="info-box"><strong>Booking Details</strong><div class="info-row"><span>Booking:</span><span>${ticket.bookingId}</span></div><div class="info-row"><span>Provider:</span><span>${ticket.providerName}</span></div><div class="info-row"><span>Customer:</span><span>${ticket.customerName}</span></div></div>
        <div class="info-box"><strong>Evidence</strong><div>${ticket.attachmentName || ticket.evidenceUrl || "No evidence uploaded"}</div>${window.ServeEaseAttachments ? window.ServeEaseAttachments.actionMarkup(ticket, "Preview attachment") : ""}</div>
        <div class="info-box"><strong>Ticket Description</strong><div>${ticket.description}</div></div>
        ${includeHistory ? `<div class="info-box"><strong>Support Investigation Remarks</strong><div>${ticket.supportRemarks || "No remarks yet."}</div></div>` : ""}
        <div class="info-box"><strong>Final Decision</strong><div>${ticket.finalDecision || "Awaiting admin decision."}</div>${includeHistory ? `<div>${ticket.adminRemarks || ""}</div>` : ""}</div>
      </div>
      ${includeHistory ? `<div class="ticket-history">${(ticket.statusHistory || []).map(function (entry) { return `<div><strong>${entry.status}</strong><span>${entry.note} • ${entry.updatedBy} • ${formatDisplayDateTime(entry.updatedAt)}</span></div>`; }).join("")}</div>` : ""}
    `;
  }

  function renderAdminTicketsPage() {
    const list = byId("adminTicketsList");
    if (!list) return;
    const stats = byId("adminTicketStats");
    const search = byId("adminTicketSearch");
    const status = byId("adminTicketStatusFilter");
    const type = byId("adminTicketTypeFilter");
    const priority = byId("adminTicketPriorityFilter");
    const modal = byId("adminTicketModalBackdrop");
    const body = byId("adminTicketModalBody");

    if (type) type.innerHTML = '<option value="All">All types</option>' + ticketTypes.map(function (item) { return `<option>${item}</option>`; }).join("");
    if (priority) priority.innerHTML = '<option value="All">All priorities</option>' + priorities.map(function (item) { return `<option>${item}</option>`; }).join("");

    function rows() {
      const term = (search ? search.value : "").trim().toLowerCase();
      return getStore().tickets.filter(function (ticket) {
        if (!["Escalated", "Under Review", "Resolved", "Rejected"].includes(ticket.status)) return false;
        const hay = [ticket.ticketId, ticket.bookingId, ticket.customerName, ticket.providerName].join(" ").toLowerCase();
        return (!term || hay.includes(term)) &&
          (!status || status.value === "All" || ticket.status === status.value) &&
          (!type || type.value === "All" || ticket.ticketType === type.value) &&
          (!priority || priority.value === "All" || ticket.priority === priority.value);
      }).sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    }

    function draw() {
      const items = rows();
      const all = getStore().tickets;
      if (stats) {
        stats.innerHTML = [
          ["Total Escalated Tickets", all.filter(function (c) { return ["Escalated", "Under Review"].includes(c.status); }).length],
          ["Refund Requests", all.filter(function (c) { return c.ticketType === "Payment Issue" || c.ticketType === "Overcharging"; }).length],
          ["Fraud/Safety Issues", all.filter(function (c) { return ["Fraud", "Safety Concern"].includes(c.ticketType); }).length],
          ["Provider Misconduct Cases", all.filter(function (c) { return c.ticketType === "Misbehavior"; }).length],
          ["Resolved Cases", all.filter(function (c) { return c.status === "Resolved"; }).length],
          ["Rejected Cases", all.filter(function (c) { return c.status === "Rejected"; }).length]
        ].map(function (item) { return `<div class="stat-card-dashboard"><h3>${item[1]}</h3><p>${item[0]}</p></div>`; }).join("");
      }
      list.innerHTML = items.map(function (ticket) {
        return `<article class="superuser-ticket-card ticket-card"><div><h3>${ticket.ticketId} <span class="superuser-chip ${statusClass(ticket.status)}">${ticket.status}</span></h3><p>${ticket.ticketType}</p><div class="superuser-ticket-mini-meta"><span>Booking: ${ticket.bookingId}</span><span>Customer: ${ticket.customerName}</span><span>Provider: ${ticket.providerName}</span></div><div class="superuser-ticket-tags"><span class="ticket-priority ${statusClass(ticket.priority)}">${ticket.priority}</span><span class="superuser-chip warning">${ticket.finalDecision || "Awaiting final decision"}</span></div></div><div class="superuser-ticket-action-col"><button class="superuser-inline-action" type="button" data-admin-ticket="${ticket.ticketId}">View Details</button></div></article>`;
      }).join("") || `<div class="superuser-empty-state">No escalated tickets found.</div>`;
    }

    list.addEventListener("click", function (event) {
      const button = event.target.closest("[data-admin-ticket]");
      if (!button || !modal || !body) return;
      const ticket = getStore().tickets.find(function (item) { return item.ticketId === button.dataset.adminTicket; });
      if (!ticket) return;
      body.innerHTML = adminTicketMarkup(ticket);
      modal.classList.remove("hidden");
      bindAttachmentPreviewButtons(body);
      bindAdminActions(ticket.ticketId, draw);
    });
    [search, status, type, priority].forEach(function (node) { if (node) node.addEventListener("input", draw); if (node) node.addEventListener("change", draw); });
    if (byId("closeAdminTicketModal")) byId("closeAdminTicketModal").onclick = function () { modal.classList.add("hidden"); };
    syncFromApi("admin", draw);
    draw();
  }

  function adminTicketMarkup(ticket) {
    return `
      ${ticketDetailsMarkup(ticket, true)}
      <div class="ticket-action-grid">
        <label>Final Decision<select id="adminTicketDecision">${finalDecisions.map(function (decision) { return `<option ${ticket.finalDecision === decision ? "selected" : ""}>${decision}</option>`; }).join("")}</select></label>
        <label>Admin Remarks<textarea id="adminTicketRemarks">${ticket.adminRemarks || ""}</textarea></label>
      </div>
      <small class="error" id="adminTicketActionError"></small>
      <div class="support-modal-actions">
        <button class="btn superuser-success-btn" type="button" id="adminResolveTicketBtn">Submit Final Decision</button>
        <button class="btn support-danger-btn" type="button" id="adminRejectTicketBtn">Reject Ticket</button>
      </div>
    `;
  }

  function bindAdminActions(id, redraw) {
    function submit(forceReject) {
      const remarks = escapeText(byId("adminTicketRemarks").value);
      const decision = forceReject ? "Ticket Rejected" : byId("adminTicketDecision").value;
      const error = byId("adminTicketActionError");
      error.textContent = "";
      if (remarks.length < 10) {
        error.textContent = "Admin remarks must contain at least 10 characters.";
        return;
      }
      if (!confirm("Submit final admin decision for this ticket?")) return;
      const payload = { finalDecision: decision, adminRemarks: remarks };
      const saveLocal = function () {
        const store = getStore();
        const ticket = store.tickets.find(function (item) { return item.ticketId === id; });
        if (!ticket) return;
        ticket.finalDecision = decision;
        ticket.adminRemarks = remarks;
        ticket.resolvedAt = new Date().toISOString();
        addHistory(ticket, ["Ticket Rejected", "Refund Rejected"].includes(decision) ? "Rejected" : "Resolved", decision + ": " + remarks, "Admin");
        setStore(store);
        if (decision === "Provider Suspended" && ticket.providerId && window.ServeEaseApi && typeof window.ServeEaseApi.suspendProviderVerification === "function") {
          window.ServeEaseApi.suspendProviderVerification(ticket.providerId, { adminRemarks: "Suspended from ticket " + id + ": " + remarks }).catch(function () { return null; });
        }
        byId("adminTicketModalBackdrop").classList.add("hidden");
        redraw();
      };
      if (window.ServeEaseApi) {
        const call = forceReject ? window.ServeEaseApi.rejectAdminTicket : window.ServeEaseApi.decideTicket;
        if (typeof call === "function") {
          call(id, payload).then(saveLocal).catch(function (apiError) {
            error.textContent = apiError && apiError.message ? apiError.message : "Unable to submit admin decision.";
          });
          return;
        }
      }
      error.textContent = "Backend API is not available.";
    }
    byId("adminResolveTicketBtn").onclick = function () { submit(false); };
    byId("adminRejectTicketBtn").onclick = function () { submit(true); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    injectRaiseTicketButtons();
    if (window.location.pathname.indexOf("my-bookings.html") !== -1) {
      new MutationObserver(injectRaiseTicketButtons).observe(document.body, { childList: true, subtree: true });
    }
    renderMyTicketsPage();
    renderAdminTicketsPage();
  });
})();
