(function () {
  const supportStorageKey = "serveEaseSupportModuleData";
  const allowedRoles = ["support", "superuser"];

  function getSession() {
    return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
  }

  function requireSupportAccess() {
    const session = getSession();
    const isSupportPage = document.getElementById("supportWelcomeText") || document.getElementById("supportTicketDetailGrid");
    if (!isSupportPage) return session;

    if (!session || !allowedRoles.includes(session.role)) {
      window.location.href = "login.html";
      return null;
    }

    return session;
  }

  function getSupportData() {
    return JSON.parse(localStorage.getItem(supportStorageKey) || "null");
  }

  function setSupportData(data) {
    localStorage.setItem(supportStorageKey, JSON.stringify(data));
  }

  function createImportedTicketId(sourceType) {
    const prefix = sourceType === "provider" ? "PT" : "TICKET";
    return prefix + "-" + Date.now().toString(36).toUpperCase() + "-" + Math.floor(Math.random() * 900 + 100);
  }

  function isSameSupportTicket(existing, incoming) {
    if (!existing || !incoming) return false;
    return existing.raisedByType === incoming.raisedByType &&
      existing.subject === incoming.subject &&
      existing.description === incoming.description;
  }

  function mergeUniqueBySignature(currentItems, incomingItems, signatureBuilder) {
    const merged = Array.isArray(currentItems) ? currentItems.slice() : [];
    const signatures = new Set(merged.map(signatureBuilder));
    (Array.isArray(incomingItems) ? incomingItems : []).forEach(function (item) {
      const signature = signatureBuilder(item);
      if (signatures.has(signature)) return;
      merged.push(item);
      signatures.add(signature);
    });
    return merged;
  }

  function mergeTicketState(current, incoming, preferIncoming) {
    if (!current) return incoming;
    if (!incoming) return current;
    const base = preferIncoming ? { ...current, ...incoming } : { ...incoming, ...current };

    return {
      ...base,
      messages: mergeUniqueBySignature(current.messages, incoming.messages, function (message) {
        return [message.senderType, message.sender, message.text, message.time].join("|");
      }),
      history: mergeUniqueBySignature(current.history, incoming.history, function (entry) {
        return [entry.label, entry.time].join("|");
      })
    };
  }

  function getAllLocalStorageKeys(prefix) {
    return Object.keys(localStorage).filter(function (key) {
      return key === prefix || key.indexOf(prefix + ":") === 0;
    });
  }

  function normalizeExternalTicket(ticket, sourceType, ownerData) {
    if (!ticket || !ticket.id) return null;
    const raisedByType = ticket.raisedByType || sourceType;
    const isProvider = raisedByType === "provider";
    const ownerName = isProvider
      ? (ownerData && ownerData.profile && (ownerData.profile.organisationName || ownerData.profile.fullName)) || ticket.customerName || ticket.providerName || "Provider"
      : ticket.customerName || (ownerData && ownerData.ownerName) || "Customer";

    return {
      id: ticket.id,
      bookingReference: ticket.bookingReference || ticket.bookingRef || "N/A",
      raisedByType: raisedByType,
      raisedByLabel: isProvider ? "Provider" : "Customer",
      customerName: ownerName,
      providerName: ticket.providerName || (isProvider ? ownerName : ticket.provider || "ServeEase Provider"),
      issueCategory: ticket.issueCategory || ticket.category || "General Support",
      subject: ticket.subject || "Support request",
      description: ticket.description || ticket.subject || "No description provided.",
      attachmentName: ticket.attachmentName || "No attachment",
      phone: ticket.phone || (ownerData && ownerData.profile && ownerData.profile.phone) || "",
      email: ticket.email || (ownerData && ownerData.profile && ownerData.profile.email) || (ownerData && ownerData.ownerEmail) || "",
      status: ticket.status || "Open",
      solution: ticket.solution || "",
      supportUpdate: ticket.supportUpdate || "Your ticket has been received and is currently being reviewed by the support team.",
      createdDate: ticket.createdDate || ticket.date || ticket.createdOn || ticket.created || "Just now",
      createdAtIso: ticket.createdAtIso || new Date().toISOString(),
      assignedTo: ticket.assignedTo || "Priya Sharma",
      messages: Array.isArray(ticket.messages) ? ticket.messages : [
        { sender: ownerName, senderType: raisedByType, text: ticket.description || ticket.subject || "Support request created.", time: ticket.createdDate || ticket.date || ticket.created || "Just now" }
      ],
      history: Array.isArray(ticket.history) ? ticket.history : [
        { label: "Ticket created by " + (isProvider ? "provider" : "customer"), time: ticket.createdDate || ticket.date || ticket.created || "Just now", active: true }
      ]
    };
  }

  function mergeSupportTicketsFromUserModules() {
    const data = getSupportData();
    if (!data || !Array.isArray(data.tickets)) return;
    const existingIds = new Set(data.tickets.map(function (ticket) { return ticket.id; }));
    let changed = false;

    getAllLocalStorageKeys("serveEaseCustomerModuleData").forEach(function (key) {
      try {
        const customerData = JSON.parse(localStorage.getItem(key) || "null");
        if (!customerData || !Array.isArray(customerData.tickets)) return;
        let moduleChanged = false;
        customerData.tickets.forEach(function (ticket) {
          const normalized = normalizeExternalTicket(ticket, "customer", customerData);
          if (!normalized) return;
          const existingTicket = data.tickets.find(function (item) { return item.id === normalized.id; });
          if (existingTicket && isSameSupportTicket(existingTicket, normalized)) {
            Object.assign(existingTicket, mergeTicketState(existingTicket, normalized, false));
            changed = true;
            return;
          }
          if (!existingTicket && data.tickets.some(function (item) { return isSameSupportTicket(item, normalized); })) return;
          if (existingTicket) {
            normalized.id = createImportedTicketId("customer");
            ticket.id = normalized.id;
            moduleChanged = true;
          }
          data.tickets.unshift(normalized);
          data.notifications.unshift({ id: "NT" + Date.now() + ticket.id, text: "New support ticket created - " + ticket.id, time: "Just now", isNew: true, ticketId: ticket.id });
          existingIds.add(ticket.id);
          changed = true;
        });
        if (moduleChanged) localStorage.setItem(key, JSON.stringify(customerData));
      } catch (error) {
        /* ignore invalid customer module data */
      }
    });

    getAllLocalStorageKeys("serveEaseProviderModuleData").forEach(function (key) {
      try {
        const providerData = JSON.parse(localStorage.getItem(key) || "null");
        if (!providerData || !Array.isArray(providerData.supportTickets)) return;
        let moduleChanged = false;
        providerData.supportTickets.forEach(function (ticket) {
          const normalized = normalizeExternalTicket(ticket, "provider", providerData);
          if (!normalized) return;
          const existingTicket = data.tickets.find(function (item) { return item.id === normalized.id; });
          if (existingTicket && isSameSupportTicket(existingTicket, normalized)) {
            Object.assign(existingTicket, mergeTicketState(existingTicket, normalized, false));
            changed = true;
            return;
          }
          if (!existingTicket && data.tickets.some(function (item) { return isSameSupportTicket(item, normalized); })) return;
          if (existingTicket) {
            normalized.id = createImportedTicketId("provider");
            ticket.id = normalized.id;
            moduleChanged = true;
          }
          data.tickets.unshift(normalized);
          data.notifications.unshift({ id: "NT" + Date.now() + ticket.id, text: "New provider support ticket created - " + ticket.id, time: "Just now", isNew: true, ticketId: ticket.id });
          existingIds.add(ticket.id);
          changed = true;
        });
        if (moduleChanged) localStorage.setItem(key, JSON.stringify(providerData));
      } catch (error) {
        /* ignore invalid provider module data */
      }
    });

    if (changed) setSupportData(data);
  }

  function hydrateSupportDataFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getState !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getState(supportStorageKey)
      .then(function (entry) {
        const backendData = entry && entry.value ? entry.value : null;
        if (!backendData || !Array.isArray(backendData.tickets)) return;

        const data = getSupportData();
        const ticketMap = {};
        (data.tickets || []).forEach(function (ticket) { ticketMap[ticket.id] = ticket; });
        backendData.tickets.forEach(function (ticket) {
          if (!ticket || !ticket.id) return;
          if (ticketMap[ticket.id]) {
            ticketMap[ticket.id] = mergeTicketState(ticketMap[ticket.id], ticket, true);
            return;
          }
          if ((data.tickets || []).some(function (item) { return isSameSupportTicket(item, ticket); })) return;
          if (ticketMap[ticket.id] && !isSameSupportTicket(ticketMap[ticket.id], ticket)) {
            const importedTicket = { ...ticket, id: createImportedTicketId(ticket.raisedByType) };
            ticketMap[importedTicket.id] = importedTicket;
            return;
          }
          ticketMap[ticket.id] = ticketMap[ticket.id] || ticket;
        });
        data.tickets = Object.keys(ticketMap).map(function (id) { return ticketMap[id]; });
        data.notifications = (data.notifications && data.notifications.length) ? data.notifications : (backendData.notifications || []);
        data.agent = data.agent || backendData.agent || { fullName: "Priya Sharma" };
        setSupportData(data);
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
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
        localTicket.supportUpdate = ticket.supportUpdate || ticket.solution || "Support team updated your ticket.";
        localTicket.messages = Array.isArray(ticket.messages) ? ticket.messages : localTicket.messages;
        localTicket.updatedAt = todayStamp();
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        /* ignore invalid module data */
      }
    });
  }

  function persistTicketUpdate(data, ticket) {
    setSupportData(data);
    updateTicketInUserModules(ticket);
    if (window.ServeEaseApi && typeof window.ServeEaseApi.saveState === "function") {
      window.ServeEaseApi.saveState(supportStorageKey, data).catch(function () { return null; });
    }
  }

  function formatStatusClass(status) {
    return String(status).toLowerCase().replace(/\s+/g, "-");
  }

  function todayStamp() {
    return new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).replace(",", "");
  }

  function seedSupportData() {
    if (getSupportData()) return;

    const data = {
      agent: {
        id: "SUP001",
        fullName: "Priya Sharma",
        role: "Support Agent",
        email: "support@serveease.com"
      },
      tickets: [
        {
          id: "TICKET-2026-2105",
          bookingReference: "BOOK-2026-1045",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "Sparkle Home Services",
          issueCategory: "Booking Issue",
          subject: "Unable to reschedule my kitchen cleaning service booking",
          description: "Unable to reschedule booking",
          attachmentName: "Screenshot of error message",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "Open",
          createdDate: "8 Mar 2026",
          createdAtIso: "2026-03-08T10:15:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "Hello, I'm having trouble rescheduling my booking. The app keeps showing an error.", time: "2026-03-08 10:15 AM" },
            { sender: "Priya Sharma", senderType: "agent", text: "Hello Raghava, thank you for contacting us. I understand you're facing issues with rescheduling. Let me look into this for you.", time: "2026-03-08 10:18 AM" },
            { sender: "Raghava Kumar", senderType: "customer", text: "Thank you. I've tried multiple times but it's not working. I need to change the date to March 14.", time: "2026-03-08 10:20 AM" }
          ],
          history: [
            { label: "Ticket created by customer", time: "2026-03-08 10:15 AM", active: false },
            { label: "Ticket assigned to support agent Priya Sharma", time: "2026-03-08 10:16 AM", active: false },
            { label: "Support agent responded", time: "2026-03-08 10:18 AM", active: false },
            { label: "Customer replied", time: "2026-03-08 10:20 AM", active: false },
            { label: "Support agent investigating issue", time: "2026-03-08 10:22 AM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2104",
          bookingReference: "BOOK-2026-1042",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "QuickFix Services",
          issueCategory: "Payment Issue",
          subject: "Payment deducted but booking not confirmed",
          description: "Payment deducted but booking not confirmed",
          attachmentName: "Payment screenshot",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "In Progress",
          createdDate: "7 Mar 2026",
          createdAtIso: "2026-03-07T09:20:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "My money was deducted but booking is not visible in my dashboard.", time: "2026-03-07 09:20 AM" },
            { sender: "Priya Sharma", senderType: "agent", text: "I'm checking the payment gateway response and your booking status now.", time: "2026-03-07 09:28 AM" }
          ],
          history: [
            { label: "Ticket created by customer", time: "2026-03-07 09:20 AM", active: false },
            { label: "Support agent investigating payment logs", time: "2026-03-07 09:31 AM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2103",
          bookingReference: "BOOK-2026-1040",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "CarePlus Services",
          issueCategory: "Service Complaint",
          subject: "Service provider arrived late",
          description: "Service provider arrived late",
          attachmentName: "Late arrival proof",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "Escalated",
          createdDate: "7 Mar 2026",
          createdAtIso: "2026-03-07T08:10:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "The provider arrived almost one hour late and did not inform me.", time: "2026-03-07 08:10 AM" },
            { sender: "Priya Sharma", senderType: "agent", text: "I understand the concern. I am escalating this complaint for superuser review.", time: "2026-03-07 08:25 AM" }
          ],
          history: [
            { label: "Ticket created by customer", time: "2026-03-07 08:10 AM", active: false },
            { label: "Ticket escalated to superuser", time: "2026-03-07 08:25 AM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2102",
          bookingReference: "BOOK-2026-1038",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "Urban Spark",
          issueCategory: "Technical Issue",
          subject: "App not loading on mobile device",
          description: "App not loading on mobile device",
          attachmentName: "Crash screenshot",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "In Progress",
          createdDate: "6 Mar 2026",
          createdAtIso: "2026-03-06T11:15:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "The app gets stuck on loading every time I open it.", time: "2026-03-06 11:15 AM" }
          ],
          history: [
            { label: "Technical issue logged", time: "2026-03-06 11:15 AM", active: false },
            { label: "Issue shared with technical team", time: "2026-03-06 11:40 AM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2101",
          bookingReference: "BOOK-2026-1037",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "QuickFix Services",
          issueCategory: "Booking Issue",
          subject: "Need to cancel booking",
          description: "Need to cancel booking",
          attachmentName: "No attachment",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "Resolved",
          createdDate: "6 Mar 2026",
          createdAtIso: "2026-03-06T08:10:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "I need help cancelling my booking due to travel.", time: "2026-03-06 08:10 AM" },
            { sender: "Priya Sharma", senderType: "agent", text: "Your booking cancellation has been processed successfully.", time: "2026-03-06 08:32 AM" }
          ],
          history: [
            { label: "Ticket created by customer", time: "2026-03-06 08:10 AM", active: false },
            { label: "Booking cancellation completed", time: "2026-03-06 08:32 AM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2100",
          bookingReference: "BOOK-2026-1036",
          raisedByType: "customer",
          raisedByLabel: "Customer",
          customerName: "Raghava Kumar",
          providerName: "FreshStart Cleaners",
          issueCategory: "Payment Issue",
          subject: "Refund not received",
          description: "Refund not received",
          attachmentName: "Refund timeline screenshot",
          phone: "+91 98765 43210",
          email: "raghava.kumar@email.com",
          status: "Resolved",
          createdDate: "5 Mar 2026",
          createdAtIso: "2026-03-05T02:40:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "Raghava Kumar", senderType: "customer", text: "I cancelled the booking last week and still have not received my refund.", time: "2026-03-05 02:40 PM" },
            { sender: "Priya Sharma", senderType: "agent", text: "The refund has been released and should reflect in your account within 24 hours.", time: "2026-03-05 03:05 PM" }
          ],
          history: [
            { label: "Refund issue reported", time: "2026-03-05 02:40 PM", active: false },
            { label: "Refund completed successfully", time: "2026-03-05 03:05 PM", active: true }
          ]
        },
        {
          id: "TICKET-2026-2106",
          bookingReference: "BOOK-2026-1045",
          raisedByType: "provider",
          raisedByLabel: "Provider",
          customerName: "CleanPro Services",
          providerName: "CleanPro Services",
          issueCategory: "Booking Issue",
          subject: "Customer canceled booking at last minute",
          description: "Customer canceled booking at last minute",
          attachmentName: "Cancellation note",
          phone: "+91 91234 56789",
          email: "cleanpro@serveease.com",
          status: "Open",
          createdDate: "8 Mar 2026",
          createdAtIso: "2026-03-08T06:45:00",
          assignedTo: "Priya Sharma",
          messages: [
            { sender: "CleanPro Services", senderType: "customer", text: "The customer canceled just before arrival. Please review compensation eligibility.", time: "2026-03-08 06:45 AM" }
          ],
          history: [
            { label: "Provider complaint created", time: "2026-03-08 06:45 AM", active: false },
            { label: "Awaiting support review", time: "2026-03-08 06:48 AM", active: true }
          ]
        }
      ],
      notifications: [
        { id: "NT001", text: "New support ticket created - TICKET-2026-2105", time: "5 minutes ago", isNew: true, ticketId: "TICKET-2026-2105" },
        { id: "NT002", text: "Customer replied to ticket TICKET-2026-2104", time: "1 hour ago", isNew: true, ticketId: "TICKET-2026-2104" },
        { id: "NT003", text: "Ticket escalated to superuser - TICKET-2026-2103", time: "2 hours ago", isNew: false, ticketId: "TICKET-2026-2103" },
        { id: "NT004", text: "Ticket resolved successfully - TICKET-2026-2100", time: "5 hours ago", isNew: false, ticketId: "TICKET-2026-2100" }
      ]
    };

    setSupportData(data);
  }

  
  function trapNotificationScroll(panel) {
    if (!panel || panel.dataset.scrollTrapBound === "true") return;
    panel.dataset.scrollTrapBound = "true";

    function stopScrollChaining(event) {
      const deltaY = event.deltaY || 0;
      const atTop = panel.scrollTop <= 0;
      const atBottom = Math.ceil(panel.scrollTop + panel.clientHeight) >= panel.scrollHeight;

      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        event.preventDefault();
      }
    }

    let touchStartY = 0;
    function onTouchStart(event) {
      if (event.touches && event.touches.length) {
        touchStartY = event.touches[0].clientY;
      }
    }

    function onTouchMove(event) {
      if (!(event.touches && event.touches.length)) return;
      const currentY = event.touches[0].clientY;
      const deltaY = touchStartY - currentY;
      const atTop = panel.scrollTop <= 0;
      const atBottom = Math.ceil(panel.scrollTop + panel.clientHeight) >= panel.scrollHeight;

      if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
        event.preventDefault();
      }
    }

    panel.addEventListener("wheel", stopScrollChaining, { passive: false });
    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
  }

function setupHeader(agentName) {
    const profileBtn = document.getElementById("supportProfileBtn");
    const dropdown = document.getElementById("supportProfileDropdown");
    const logoutBtn = document.getElementById("supportLogoutBtn");
    const notificationBtn = document.getElementById("supportNotificationBtn");
    const notificationPanel = document.getElementById("supportNotificationPanel");
    trapNotificationScroll(notificationPanel);
    const agentNameNodes = document.querySelectorAll("#supportAgentName");

    agentNameNodes.forEach(function (node) {
      node.textContent = agentName;
    });

    if (profileBtn && dropdown && profileBtn.dataset.bound !== "true") {
      profileBtn.dataset.bound = "true";
      profileBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdown.classList.toggle("hidden");
        if (notificationPanel) notificationPanel.classList.add("hidden");
      });
    }

    if (dropdown && dropdown.dataset.bound !== "true") {
      dropdown.dataset.bound = "true";
      dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }

    if (document.body && document.body.dataset.supportHeaderBound !== "true") {
      document.body.dataset.supportHeaderBound = "true";
      document.addEventListener("click", function () {
      if (dropdown) dropdown.classList.add("hidden");
      if (notificationPanel) notificationPanel.classList.add("hidden");
      });
    }

    if (notificationBtn && notificationBtn.dataset.bound !== "true") {
      notificationBtn.dataset.bound = "true";
      notificationBtn.addEventListener("click", function (event) {
        event.stopPropagation();

        if (notificationPanel) {
          notificationPanel.classList.toggle("hidden");
          if (dropdown) dropdown.classList.add("hidden");
          return;
        }

        const panel = document.querySelector(".support-sidebar-panel");
        const list = document.getElementById("supportNotificationList");
        if (panel) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
          panel.classList.add("support-panel-highlight");
          setTimeout(function () { panel.classList.remove("support-panel-highlight"); }, 1400);
        } else if (list) {
          list.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    if (notificationPanel && notificationPanel.dataset.clickBound !== "true") {
      notificationPanel.dataset.clickBound = "true";
      notificationPanel.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }

    if (logoutBtn && logoutBtn.dataset.bound !== "true") {
      logoutBtn.dataset.bound = "true";
      logoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem("serveEaseSession");
        window.location.href = "login.html";
      });
    }
  }

  function buildStatsMarkup(tickets) {
    const openCount = tickets.filter(function (ticket) { return ticket.status === "Open"; }).length;
    const progressCount = tickets.filter(function (ticket) { return ticket.status === "In Progress"; }).length;
    const resolvedCount = tickets.filter(function (ticket) { return ticket.status === "Resolved"; }).length;

    return `
      <div class="stat-card-dashboard"><div class="feature-icon purple">⚠</div><h3>${tickets.length}</h3><p>Total Tickets</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon orange">◔</div><h3>${openCount}</h3><p>Open Issues</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon blue">↗</div><h3>${progressCount}</h3><p>Tickets Being Handled</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon green">✓</div><h3>${resolvedCount}</h3><p>Issues Resolved</p></div>
    `;
  }

  function ticketCardMarkup(ticket) {
    return `
      <article class="support-ticket-card">
        <div class="support-ticket-top">
          <div>
            <h3 class="support-ticket-title">${ticket.id}</h3>
            <div class="support-ticket-meta">${ticket.raisedByLabel}: ${ticket.customerName}</div>
            <div class="support-ticket-meta">Booking: ${ticket.bookingReference}</div>
          </div>
          <div class="support-ticket-badge-row">
            ${ticket.raisedByType === "provider" ? `<span class="support-role-badge provider">Provider</span>` : ""}
            <span class="support-status-badge ${formatStatusClass(ticket.status)}">${ticket.status}</span>
          </div>
        </div>
        <div class="support-ticket-body">
          <strong>${ticket.issueCategory}</strong>
          <p class="support-ticket-desc">${ticket.subject}</p>
          <div class="support-ticket-created">Created: ${ticket.createdDate}</div>
        </div>
        <button class="support-ticket-action" type="button" data-ticket-id="${ticket.id}">◉ View Ticket Details</button>
      </article>
    `;
  }

  function renderNotifications(data) {
    const notificationList = document.getElementById("supportNotificationList");
    const newCountNode = document.getElementById("supportNewNotificationCount");
    if (!notificationList || !newCountNode) return;

    const newCount = data.notifications.filter(function (item) { return item.isNew; }).length;
    newCountNode.textContent = `${newCount} New`;

    notificationList.innerHTML = data.notifications.map(function (item) {
      return `
        <button class="support-notification-item ${item.isNew ? "" : "read"}" type="button" data-ticket-id="${item.ticketId}">
          <div class="support-notification-text">${item.text}</div>
          <div class="support-notification-time">${item.time}</div>
        </button>
      `;
    }).join("");

    notificationList.querySelectorAll("button[data-ticket-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.location.href = `support-ticket-details.html?id=${encodeURIComponent(button.dataset.ticketId)}`;
      });
    });
  }

  function renderDashboard() {
    const statsGrid = document.getElementById("supportStatsGrid");
    if (!statsGrid) return;

    const data = getSupportData();
    const agentName = data.agent.fullName;
    const welcome = document.getElementById("supportWelcomeText");
    const searchInput = document.getElementById("supportSearchInput");
    const list = document.getElementById("supportDashboardTicketList");
    const count = document.getElementById("supportTicketCount");
    const emptyState = document.getElementById("supportDashboardEmptyState");
    const clearBtn = document.getElementById("clearSupportSearchBtn");
    const viewAllBtn = document.getElementById("viewAllNotificationsBtn");

    setupHeader(agentName);
    if (welcome) welcome.textContent = `Welcome, Support Agent ${agentName}!`;
    statsGrid.innerHTML = buildStatsMarkup(data.tickets);
    renderNotifications(data);

    function applyFilter() {
      const term = (searchInput ? searchInput.value : "").trim().toLowerCase();
      const filtered = data.tickets.filter(function (ticket) {
        return [ticket.id, ticket.bookingReference, ticket.customerName, ticket.issueCategory, ticket.subject, ticket.status]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });

      count.textContent = filtered.length;
      list.innerHTML = filtered.map(ticketCardMarkup).join("");
      emptyState.classList.toggle("hidden", filtered.length !== 0);

      list.querySelectorAll("button[data-ticket-id]").forEach(function (button) {
        button.addEventListener("click", function () {
          window.location.href = `support-ticket-details.html?id=${encodeURIComponent(button.dataset.ticketId)}`;
        });
      });
    }

    if (searchInput) {
      searchInput.addEventListener("input", applyFilter);
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        if (searchInput) searchInput.value = "";
        applyFilter();
      });
    }

    if (viewAllBtn) {
      viewAllBtn.addEventListener("click", function () {
        const panel = document.querySelector(".support-sidebar-panel");
        if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }

    applyFilter();
  }

  function getTicketById(ticketId) {
    const data = getSupportData();
    return data.tickets.find(function (ticket) {
      return ticket.id === ticketId;
    });
  }

  function renderDetailPage() {
    const detailGrid = document.getElementById("supportTicketDetailGrid");
    if (!detailGrid) return;

    const data = getSupportData();
    setupHeader(data.agent.fullName);
    renderNotifications(data);

    const params = new URLSearchParams(window.location.search);
    const ticketId = params.get("id") || "TICKET-2026-2105";
    const ticket = getTicketById(ticketId);

    if (!ticket) {
      detailGrid.innerHTML = "<p>Ticket not found.</p>";
      return;
    }

    detailGrid.innerHTML = `
      <div class="support-detail-box"><span>Ticket ID</span><strong>${ticket.id}</strong></div>
      <div class="support-detail-box"><span>Booking Reference</span><strong>${ticket.bookingReference}</strong></div>
      <div class="support-detail-box"><span>${ticket.raisedByType === "provider" ? "Provider Name" : "Customer Name"}</span><strong>${ticket.customerName}</strong></div>
      <div class="support-detail-box"><span>Issue Category</span><strong>${ticket.issueCategory}</strong></div>
      <div class="support-detail-box"><span>Date Created</span><strong>🗓 ${ticket.createdDate}</strong></div>
      <div class="support-detail-box"><span>Current Status</span><strong><span class="support-status-badge ${formatStatusClass(ticket.status)}">${ticket.status}</span></strong></div>
    `;

    document.getElementById("supportContactCard").innerHTML = `
      <h3>Contact Information</h3>
      <p><strong>Phone:</strong> <a href="tel:${ticket.phone.replace(/\s+/g, "")}">${ticket.phone}</a></p>
      <p><strong>Email:</strong> <a href="mailto:${ticket.email}">${ticket.email}</a></p>
    `;

    document.getElementById("supportComplaintBlock").innerHTML = `
      <div class="support-complaint-box subject-box">
        <div class="support-complaint-label">Subject</div>
        <strong>${ticket.subject}</strong>
      </div>
      <div class="support-complaint-box">
        <div class="support-complaint-label">Description</div>
        <p>${ticket.description}</p>
      </div>
      <div class="support-attachment-box">
        <div class="support-attachment-row">📎 ${ticket.attachmentName}</div>
      </div>
    `;

    renderSolutionBlock(ticket);

    renderMessages(ticket);
    renderStatusOptions(ticket);
    renderHistory(ticket);
    setupDetailActions(ticketId);
  }

  function renderSolutionBlock(ticket) {
    const complaintBlock = document.getElementById("supportComplaintBlock");
    if (!complaintBlock) return;

    complaintBlock.insertAdjacentHTML("beforeend", `
      <div class="support-solution-box">
        <div class="support-complaint-label">Solution</div>
        <form id="supportSolutionForm" class="support-solution-form">
          <textarea id="supportSolutionInput" maxlength="600" placeholder="Type the resolution customers/providers will see as Support Update...">${ticket.solution || ""}</textarea>
          <div class="support-solution-footer">
            <small id="supportSolutionCounter">${String(ticket.solution || "").length} / 600</small>
            <button class="btn btn-primary" type="submit">Save Solution</button>
          </div>
          <small class="error" id="supportSolutionError"></small>
          <small class="success-message" id="supportSolutionSuccess"></small>
        </form>
      </div>
    `);
  }

  function renderMessages(ticket) {
    const thread = document.getElementById("supportMessageThread");
    if (!thread) return;

    if (!Array.isArray(ticket.messages)) ticket.messages = [];
    const solutionText = ticket.solution || ticket.supportUpdate;
    const defaultUpdateText = "Your ticket has been received and is currently being reviewed by the support team.";
    if (solutionText && solutionText !== defaultUpdateText) {
      const hasSolutionMessage = ticket.messages.some(function (message) {
        return message.senderType === "agent" && message.text === solutionText;
      });
      if (!hasSolutionMessage) {
        ticket.messages.push({
          sender: ticket.assignedTo || "Support Agent",
          senderType: "agent",
          text: solutionText,
          time: ticket.updatedAt || todayStamp()
        });
        const data = getSupportData();
        const storedTicket = data.tickets.find(function (item) { return item.id === ticket.id; });
        if (storedTicket) {
          storedTicket.messages = ticket.messages;
          setSupportData(data);
        }
      }
    }

    thread.innerHTML = ticket.messages.map(function (message) {
      const bubbleClass = message.senderType === "agent" || message.senderType === "admin" ? "support-message-bubble agent" : "support-message-bubble";
      return `
        <div class="${bubbleClass}">
          <div class="support-message-author">${message.sender}</div>
          <div>${message.text}</div>
          <span class="support-message-time">${message.time}</span>
        </div>
      `;
    }).join("");
  }

  function renderStatusOptions(ticket) {
    const options = document.getElementById("supportStatusOptions");
    if (!options) return;

    const statuses = ["Open", "In Progress", "Resolved", "Escalated"];
    options.innerHTML = statuses.map(function (status) {
      const slug = formatStatusClass(status);
      const isChecked = ticket.status === status ? "checked" : "";
      return `
        <label class="support-status-option">
          <input type="radio" name="ticketStatus" value="${status}" ${isChecked} />
          <span class="support-status-label ${slug}">${status}</span>
        </label>
      `;
    }).join("");
  }

  function renderHistory(ticket) {
    const historyList = document.getElementById("supportHistoryList");
    if (!historyList) return;

    historyList.innerHTML = ticket.history.map(function (item) {
      return `
        <div class="support-history-item ${item.active ? "active" : ""}">
          <strong>${item.label}</strong>
          <div class="support-history-time">${item.time}</div>
        </div>
      `;
    }).join("");
  }

  function addNotification(data, text, ticketId, isNew) {
    data.notifications.unshift({
      id: `NT${Date.now()}`,
      text: text,
      time: "Just now",
      isNew: isNew,
      ticketId: ticketId
    });
  }

  function setupDetailActions(ticketId) {
    const replyForm = document.getElementById("supportReplyForm");
    const replyInput = document.getElementById("supportReplyInput");
    const replyError = document.getElementById("supportReplyError");
    const replySuccess = document.getElementById("supportReplySuccess");
    const statusForm = document.getElementById("supportStatusForm");
    const solutionForm = document.getElementById("supportSolutionForm");
    const solutionInput = document.getElementById("supportSolutionInput");
    const solutionError = document.getElementById("supportSolutionError");
    const solutionSuccess = document.getElementById("supportSolutionSuccess");
    const solutionCounter = document.getElementById("supportSolutionCounter");
    const escalateBtn = document.getElementById("supportEscalateBtn");
    const modal = document.getElementById("supportEscalationModal");
    const confirmEscalationBtn = document.getElementById("confirmEscalationBtn");
    const cancelEscalationBtn = document.getElementById("cancelEscalationBtn");

    function refreshPage() {
      const ticket = getTicketById(ticketId);
      renderMessages(ticket);
      renderStatusOptions(ticket);
      renderHistory(ticket);
      document.getElementById("supportTicketDetailGrid").innerHTML = `
        <div class="support-detail-box"><span>Ticket ID</span><strong>${ticket.id}</strong></div>
        <div class="support-detail-box"><span>Booking Reference</span><strong>${ticket.bookingReference}</strong></div>
        <div class="support-detail-box"><span>${ticket.raisedByType === "provider" ? "Provider Name" : "Customer Name"}</span><strong>${ticket.customerName}</strong></div>
        <div class="support-detail-box"><span>Issue Category</span><strong>${ticket.issueCategory}</strong></div>
        <div class="support-detail-box"><span>Date Created</span><strong>🗓 ${ticket.createdDate}</strong></div>
        <div class="support-detail-box"><span>Current Status</span><strong><span class="support-status-badge ${formatStatusClass(ticket.status)}">${ticket.status}</span></strong></div>
      `;
      escalateBtn.disabled = ticket.status === "Escalated";
    }

    if (solutionInput && solutionCounter) {
      solutionInput.addEventListener("input", function () {
        this.value = this.value.replace(/[<>]/g, "");
        solutionCounter.textContent = this.value.length + " / 600";
        if (solutionError && this.value.trim().length >= 10) solutionError.textContent = "";
      });
    }

    if (solutionForm && solutionInput) {
      solutionForm.addEventListener("submit", function (event) {
        event.preventDefault();
        solutionError.textContent = "";
        solutionSuccess.textContent = "";
        const solution = solutionInput.value.trim();

        if (solution.length < 10) {
          solutionError.textContent = "Solution must contain at least 10 characters.";
          solutionInput.focus();
          return;
        }

        const data = getSupportData();
        const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
        if (!ticket) return;

        ticket.solution = solution;
        ticket.supportUpdate = solution;
        ticket.updatedAt = todayStamp();
        if (!Array.isArray(ticket.messages)) ticket.messages = [];
        const solutionMessageExists = ticket.messages.some(function (message) {
          return message.senderType === "agent" && message.text === solution;
        });
        if (!solutionMessageExists) {
          ticket.messages.push({
            sender: data.agent.fullName,
            senderType: "agent",
            text: solution,
            time: todayStamp()
          });
        }
        ticket.history.push({
          label: "Support solution updated",
          time: todayStamp(),
          active: true
        });
        ticket.history.forEach(function (entry, index) {
          entry.active = index === ticket.history.length - 1;
        });
        addNotification(data, `Support update saved - ${ticket.id}`, ticket.id, true);
        persistTicketUpdate(data, ticket);
        solutionSuccess.textContent = "Solution saved and shared with the user.";
        refreshPage();
      });
    }

    if (replyForm) {
      replyForm.addEventListener("submit", function (event) {
        event.preventDefault();
        replyError.textContent = "";
        replySuccess.textContent = "";
        const message = replyInput.value.trim();

        if (!message) {
          replyError.textContent = "Reply message cannot be empty.";
          return;
        }

        if (message.length < 5) {
          replyError.textContent = "Reply must contain at least 5 characters.";
          return;
        }

        const data = getSupportData();
        const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
        ticket.messages.push({
          sender: data.agent.fullName,
          senderType: "agent",
          text: message,
          time: todayStamp()
        });
        ticket.history.push({
          label: "Support agent responded to customer",
          time: todayStamp(),
          active: true
        });
        ticket.history.forEach(function (entry, index) {
          entry.active = index === ticket.history.length - 1;
        });
        addNotification(data, `New reply sent for ${ticket.id}`, ticket.id, true);
        persistTicketUpdate(data, ticket);
        replyInput.value = "";
        replySuccess.textContent = "Reply sent successfully.";
        refreshPage();
      });
    }

    if (statusForm) {
      statusForm.addEventListener("submit", function (event) {
        event.preventDefault();
        const selected = document.querySelector('input[name="ticketStatus"]:checked');
        if (!selected) return;

        const data = getSupportData();
        const ticket = data.tickets.find(function (item) { return item.id === ticketId; });

        if (ticket.status === selected.value) {
          replySuccess.textContent = "Status already set to the selected value.";
          return;
        }

        ticket.status = selected.value;
        ticket.history.push({
          label: `Ticket status updated to ${selected.value}`,
          time: todayStamp(),
          active: true
        });
        ticket.history.forEach(function (entry, index) {
          entry.active = index === ticket.history.length - 1;
        });
        addNotification(data, `Ticket status updated - ${ticket.id}`, ticket.id, true);
        persistTicketUpdate(data, ticket);
        replyError.textContent = "";
        replySuccess.textContent = "Ticket status updated successfully.";
        refreshPage();
      });
    }

    function hideModal() {
      if (modal) modal.classList.add("hidden");
    }

    if (escalateBtn) {
      const ticket = getTicketById(ticketId);
      escalateBtn.disabled = ticket.status === "Escalated";
      escalateBtn.addEventListener("click", function () {
        if (!escalateBtn.disabled && modal) modal.classList.remove("hidden");
      });
    }

    if (cancelEscalationBtn) {
      cancelEscalationBtn.addEventListener("click", hideModal);
    }

    if (modal) {
      modal.addEventListener("click", function (event) {
        if (event.target === modal) hideModal();
      });
    }

    if (confirmEscalationBtn) {
      confirmEscalationBtn.addEventListener("click", function () {
        const data = getSupportData();
        const ticket = data.tickets.find(function (item) { return item.id === ticketId; });
        ticket.status = "Escalated";
        ticket.history.push({
          label: "Ticket escalated to superuser",
          time: todayStamp(),
          active: true
        });
        ticket.history.forEach(function (entry, index) {
          entry.active = index === ticket.history.length - 1;
        });
        addNotification(data, `Ticket escalated to superuser - ${ticket.id}`, ticket.id, true);
        persistTicketUpdate(data, ticket);
        replySuccess.textContent = "Ticket escalated to superuser successfully.";
        replyError.textContent = "";
        hideModal();
        refreshPage();
      });
    }
  }

  const session = requireSupportAccess();
  if (document.getElementById("supportWelcomeText") || document.getElementById("supportTicketDetailGrid")) {
    seedSupportData();
    mergeSupportTicketsFromUserModules();
    if (session) {
      const data = getSupportData();
      data.agent.fullName = session.fullName || data.agent.fullName;
      setSupportData(data);
    }
    renderDashboard();
    renderDetailPage();
    hydrateSupportDataFromBackend(function () {
      mergeSupportTicketsFromUserModules();
      renderDashboard();
      renderDetailPage();
    });
  }
})();
