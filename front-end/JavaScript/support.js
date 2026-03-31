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

    if (profileBtn && dropdown) {
      profileBtn.addEventListener("click", function (event) {
        event.stopPropagation();
        dropdown.classList.toggle("hidden");
        if (notificationPanel) notificationPanel.classList.add("hidden");
      });
    }

    document.addEventListener("click", function () {
      if (dropdown) dropdown.classList.add("hidden");
      if (notificationPanel) notificationPanel.classList.add("hidden");
    });

    if (notificationBtn) {
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

    if (notificationPanel) {
      notificationPanel.addEventListener("click", function (event) {
        event.stopPropagation();
      });
    }

    if (logoutBtn) {
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

    renderMessages(ticket);
    renderStatusOptions(ticket);
    renderHistory(ticket);
    setupDetailActions(ticketId);
  }

  function renderMessages(ticket) {
    const thread = document.getElementById("supportMessageThread");
    if (!thread) return;

    thread.innerHTML = ticket.messages.map(function (message) {
      const bubbleClass = message.senderType === "agent" ? "support-message-bubble agent" : "support-message-bubble";
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
        setSupportData(data);
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
        setSupportData(data);
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
        setSupportData(data);
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
    if (session) {
      const data = getSupportData();
      data.agent.fullName = session.fullName || data.agent.fullName;
      setSupportData(data);
    }
    renderDashboard();
    renderDetailPage();
  }
})();
