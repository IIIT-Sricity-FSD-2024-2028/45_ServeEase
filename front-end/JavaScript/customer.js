(function () {
  const session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
  if (!session || session.role !== "customer") {
    return;
  }

  function isDemoCustomerAccount() {
    return session.email === "user@serveease.com" || session.userId === "CUS001";
  }

  function getAccountStorageSuffix() {
    return session.userId || String(session.email || "customer").toLowerCase();
  }

  function getCustomerNotificationReadKey() {
    return "serveEaseCustomerNotificationReads:" + getAccountStorageSuffix();
  }

  function getReadNotificationIds() {
    try {
      const value = JSON.parse(localStorage.getItem(getCustomerNotificationReadKey()) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function setReadNotificationIds(ids) {
    localStorage.setItem(getCustomerNotificationReadKey(), JSON.stringify(ids));
  }

  function markNotificationIdsAsRead(ids) {
    const readIds = new Set(getReadNotificationIds());
    (Array.isArray(ids) ? ids : []).forEach(function (id) {
      if (id) readIds.add(id);
    });
    setReadNotificationIds(Array.from(readIds));
  }

  function markNotificationsAsRead(notifications) {
    const ids = (Array.isArray(notifications) ? notifications : [])
      .map(function (item) {
        return item && item.id;
      })
      .filter(Boolean);
    markNotificationIdsAsRead(ids);
  }

  function parseNotificationTimestamp(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.getTime();
    const text = String(value || "").trim();
    if (!text || text === "Just now") return Date.now();
    if (text === "Recently") return Date.now() - 60000;

    const iso = new Date(text);
    if (!Number.isNaN(iso.getTime())) return iso.getTime();

    let match = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?$/i);
    if (match) {
      let hours = Number(match[4] || 0);
      const minutes = Number(match[5] || 0);
      const meridiem = (match[6] || "").toUpperCase();
      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
      return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]), hours, minutes).getTime();
    }

    match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?:\s*([AP]M))?)?$/i);
    if (match) {
      const monthMap = {
        jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
        may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, sept: 8,
        september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
      };
      const monthIndex = monthMap[match[2].toLowerCase()];
      if (monthIndex !== undefined) {
        let hours = Number(match[4] || 0);
        const minutes = Number(match[5] || 0);
        const meridiem = (match[6] || "").toUpperCase();
        if (meridiem === "PM" && hours !== 12) hours += 12;
        if (meridiem === "AM" && hours === 12) hours = 0;
        return new Date(Number(match[3]), monthIndex, Number(match[1]), hours, minutes).getTime();
      }
    }

    match = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::\d{2})?(?:\.\d{3})?(Z)?)?$/);
    if (match) {
      return new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4] || 0),
        Number(match[5] || 0)
      ).getTime();
    }

    return 0;
  }

  function normalizeNotificationIso(value) {
    const timestamp = parseNotificationTimestamp(value);
    return timestamp ? new Date(timestamp).toISOString() : "";
  }

  function formatNotificationTime(value) {
    const text = String(value || "").trim();
    const timestamp = parseNotificationTimestamp(value);
    if (text && !/^(just now|recently)$/i.test(text)) {
      return formatDisplayDateTime(value) || formatDisplayDate(value) || text;
    }
    if (timestamp) {
      return formatDisplayDateTime(new Date(timestamp));
    }
    return text || "Recently";
  }

  function openCustomerNotificationsView() {
    const latestNotifications = getCustomerNotifications();
    markNotificationsAsRead(latestNotifications);
    openCustomerNotificationsModal(latestNotifications);
    return false;
  }

  window.ServeEaseCustomerNotifications = {
    openAll: openCustomerNotificationsView
  };

  const seedKey = isDemoCustomerAccount()
    ? "serveEaseCustomerModuleData"
    : "serveEaseCustomerModuleData:" + getAccountStorageSuffix();

  function seedCustomerData() {
    const existing = localStorage.getItem(seedKey);
    if (existing) return;

    const data = isDemoCustomerAccount() ? {
      bookings: [
        {
          id: "BOOK-2026-1046",
          service: "Kitchen Cleaning",
          provider: "CleanPro Services",
          date: "15 March 2026",
          time: "10:00 AM",
          address: "123 MG Road, Bangalore, Karnataka 560001",
          status: "Accepted",
          amount: 799,
          category: "Accepted"
        },
        {
          id: "BOOK-2026-1047",
          service: "AC Repair",
          provider: "QuickRepair Services",
          date: "18 March 2026",
          time: "2:00 PM",
          address: "123 MG Road, Bangalore, Karnataka 560001",
          status: "Pending",
          amount: 599,
          category: "Pending"
        },
        {
          id: "BOOK-2026-1048",
          service: "Haircut and Styling",
          provider: "StyleHub Home Salon",
          date: "20 March 2026",
          time: "11:00 AM",
          address: "123 MG Road, Bangalore, Karnataka 560001",
          status: "Accepted",
          amount: 299,
          category: "Accepted"
        },
        {
          id: "BOOK-2026-1045",
          service: "Bathroom Cleaning",
          provider: "Sparkle Home Care",
          date: "12 March 2026",
          time: "9:00 AM",
          address: "123 MG Road, Bangalore, Karnataka 560001",
          status: "Accepted",
          amount: 599,
          category: "Accepted"
        },
        {
          id: "BK-10234",
          service: "Full Home Cleaning",
          provider: "Urban Shine Cleaners",
          date: "1 Mar 2026",
          time: "10:30 AM",
          address: "Bangalore, Karnataka",
          status: "Completed",
          amount: 899,
          feedback: "Completed",
          category: "Completed"
        },
        {
          id: "BK-10233",
          service: "Plumbing Service",
          provider: "QuickFix Plumbing",
          date: "28 Feb 2026",
          time: "1:15 PM",
          address: "Bangalore, Karnataka",
          status: "Completed",
          amount: 349,
          feedback: "Completed",
          category: "Completed"
        },
        {
          id: "BK-10232",
          service: "Electrical Repair",
          provider: "Spark Electric Services",
          date: "25 Feb 2026",
          time: "4:00 PM",
          address: "Bangalore, Karnataka",
          status: "Completed",
          amount: 449,
          feedback: "Completed",
          category: "Completed"
        },
        {
          id: "BK-10231",
          service: "AC Service & Cleaning",
          provider: "CoolAir Services",
          date: "20 Feb 2026",
          time: "3:00 PM",
          address: "Bangalore, Karnataka",
          status: "Completed",
          amount: 499,
          feedback: "Incomplete",
          category: "Completed"
        }
      ],
      payments: [
        { id: "TXN-2026-4582", bookingRef: "BOOK-2026-1046", service: "Kitchen Cleaning", provider: "CleanPro Services", method: "UPI", amount: 799, date: "12 March 2026", status: "Successful" },
        { id: "TXN-2026-4581", bookingRef: "BOOK-2026-1047", service: "AC Repair", provider: "QuickRepair Services", method: "Credit Card", amount: 599, date: "10 March 2026", status: "Pending" },
        { id: "TXN-2026-4580", bookingRef: "BOOK-2026-1048", service: "Haircut and Styling", provider: "Style Hub Home Salon", method: "Debit Card", amount: 299, date: "8 March 2026", status: "Successful" },
        { id: "TXN-2026-4579", bookingRef: "BOOK-2026-1045", service: "Bathroom Cleaning", provider: "Sparkle Home Care", method: "UPI", amount: 599, date: "5 March 2026", status: "Successful" },
        { id: "TXN-2026-4578", bookingRef: "BK-10234", service: "Full Home Cleaning", provider: "Urban Shine Cleaners", method: "UPI", amount: 899, date: "1 March 2026", status: "Successful" },
        { id: "TXN-2026-4577", bookingRef: "BK-10233", service: "Plumbing Service", provider: "QuickFix Plumbing", method: "Cash", amount: 349, date: "28 February 2026", status: "Successful" },
        { id: "TXN-2026-4576", bookingRef: "BK-10232", service: "Electrical Repair", provider: "Spark Electric Services", method: "UPI", amount: 449, date: "25 February 2026", status: "Successful" },
        { id: "TXN-2026-4575", bookingRef: "BK-10231", service: "AC Service & Cleaning", provider: "CoolAir Services", method: "Credit Card", amount: 499, date: "20 February 2026", status: "Successful" },
        { id: "TXN-2026-4574", bookingRef: "BK-10230", service: "Carpet Cleaning", provider: "FreshCarpet Services", method: "UPI", amount: 699, date: "15 February 2026", status: "Refunded" },
        { id: "TXN-2026-4573", bookingRef: "BK-10229", service: "Painting Service", provider: "Color Pro Painters", method: "Debit Card", amount: 1500, date: "10 February 2026", status: "Refunded" },
        { id: "TXN-2026-4572", bookingRef: "BK-10228", service: "Pest Control", provider: "SafeHome Pest Control", method: "UPI", amount: 799, date: "5 February 2026", status: "Failed" }
      ],
      tickets: [
        {
          id: "TICKET-2026-2103",
          subject: "Provider arrived late",
          bookingRef: "BOOK-2026-1045",
          category: "Service Quality",
          date: "8 Mar 2026",
          status: "Open"
        }
      ]
    } : {
      ownerCustomerId: session.userId || "",
      ownerEmail: session.email || "",
      bookings: [],
      payments: [],
      tickets: []
    };

    localStorage.setItem(seedKey, JSON.stringify(data));
  }

  function getCustomerData() {
    return JSON.parse(localStorage.getItem(seedKey));
  }

  function setCustomerData(data) {
    localStorage.setItem(seedKey, JSON.stringify(data));
    renderCustomerNotifications();
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

  function createCustomerTicketId() {
    const supportData = getSupportData();
    const ownData = getCustomerData();
    const existingIds = new Set([].concat(supportData.tickets || [], ownData.tickets || []).map(function (ticket) {
      return ticket.id;
    }));
    let suffix = Date.now().toString().slice(-6);
    let ticketId = "TICKET-" + new Date().getFullYear() + "-" + suffix;
    while (existingIds.has(ticketId)) {
      suffix = String(Number(suffix) + 1).padStart(6, "0").slice(-6);
      ticketId = "TICKET-" + new Date().getFullYear() + "-" + suffix;
    }
    return ticketId;
  }

  function normalizeBookingRef(value) {
    return String(value || "").trim();
  }

  function getBookingReference(booking) {
    if (!booking) return "";
    return booking.bookingRef || booking.id || "";
  }

  function createSupportTicketDraft(booking) {
    if (!booking) return;

    const bookingRef = normalizeBookingRef(getBookingReference(booking));
    const data = getCustomerData();
    const existingTicket = (data.tickets || []).find(function (ticket) {
      const sameBooking = normalizeBookingRef(ticket.bookingRef).toLowerCase() === bookingRef.toLowerCase();
      const stillOpen = !["Resolved", "Closed"].includes(ticket.status);
      return sameBooking && stillOpen;
    });

    if (existingTicket) {
      sessionStorage.setItem("serveEaseSupportTicketFocus", existingTicket.id);
      window.location.href = "customer-support-center.html?bookingRef=" + encodeURIComponent(bookingRef);
      return;
    }

    const draft = {
      bookingRef: bookingRef,
      category: "",
      subject: "",
      description: "",
      provider: booking.provider || "ServeEase Provider",
      providerId: booking.providerId || "",
      service: booking.service || "",
      bookingContext: booking
    };

    sessionStorage.setItem("serveEaseSupportTicketDraft", JSON.stringify(draft));
    window.location.href = "customer-support-center.html?bookingRef=" + encodeURIComponent(getBookingReference(booking));
  }

  function customerMessageStamp() {
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

  function syncCustomerTicketsFromSupport(data) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) return;
    let changed = false;

    data.tickets.forEach(function (ticket) {
      const supportTicket = supportData.tickets.find(function (item) {
        return item.id === ticket.id;
      });
      if (!supportTicket) return;
      ticket.status = supportTicket.status || ticket.status;
      ticket.solution = supportTicket.solution || ticket.solution || "";
      ticket.supportUpdate = supportTicket.supportUpdate || ticket.supportUpdate || "";
      ticket.messages = Array.isArray(supportTicket.messages) ? supportTicket.messages : ticket.messages;
      ticket.createdAtIso = ticket.createdAtIso || normalizeNotificationIso(supportTicket.createdAtIso || supportTicket.createdDate || supportTicket.date || supportTicket.created || ticket.date);
      if (!ticket.date || ticket.date === "Just now" || ticket.date === "Recently") {
        ticket.date = formatNotificationTime(ticket.createdAtIso || supportTicket.createdDate || supportTicket.date || supportTicket.created);
      }
      changed = true;
    });

    supportData.tickets.forEach(function (supportTicket) {
      if (!supportTicket || supportTicket.raisedByType !== "customer") return;
      const alreadyExists = data.tickets.some(function (ticket) { return ticket.id === supportTicket.id; });
      const sameCustomer = Boolean(supportTicket.email && session.email) &&
        String(supportTicket.email).toLowerCase() === String(session.email).toLowerCase();
      if (alreadyExists || !sameCustomer) return;
      data.tickets.unshift({
        id: supportTicket.id,
        subject: supportTicket.subject || "Support request",
        bookingRef: supportTicket.bookingReference || "N/A",
        category: supportTicket.issueCategory || "Booking Issue",
        description: supportTicket.description || "",
        provider: supportTicket.providerName || "ServeEase Provider",
        providerId: supportTicket.providerId || "",
        service: supportTicket.service || "",
        customerName: supportTicket.customerName || session.fullName || "Customer",
        customerEmail: supportTicket.email || session.email || "",
        customerPhone: supportTicket.phone || session.phone || "",
        date: formatNotificationTime(supportTicket.createdAtIso || supportTicket.createdDate || supportTicket.date || supportTicket.created || "Recently"),
        createdAtIso: supportTicket.createdAtIso || normalizeNotificationIso(supportTicket.createdDate || supportTicket.date || supportTicket.created),
        status: supportTicket.status || "Open",
        solution: supportTicket.solution || "",
        supportUpdate: supportTicket.supportUpdate || ""
      });
      changed = true;
    });

    if (changed) setCustomerData(data);
  }

  function pushCustomerTicketToSupport(ticket) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
    if (!Array.isArray(supportData.notifications)) supportData.notifications = [];
    while (supportData.tickets.some(function (item) { return item.id === ticket.id; })) {
      ticket.id = createCustomerTicketId();
    }

    supportData.tickets.unshift({
      id: ticket.id,
      bookingReference: ticket.bookingRef || "N/A",
      raisedByType: "customer",
      raisedByLabel: "Customer",
      raisedById: session.userId || session.email || "",
      raisedByName: ticket.customerName || session.fullName || "Customer",
      customerId: ticket.customerId || session.userId || session.email || "",
      customerName: ticket.customerName || session.fullName || "Customer",
      providerName: ticket.provider || "ServeEase Provider",
      issueCategory: ticket.category,
      subject: ticket.subject,
      description: ticket.description,
      attachmentName: "No attachment",
      phone: ticket.customerPhone || session.phone || "",
      email: ticket.customerEmail || session.email || "",
      status: "Open",
      supportUpdate: ticket.supportUpdate,
      solution: ticket.solution || "",
      createdDate: ticket.date,
      createdAtIso: ticket.createdAtIso || new Date().toISOString(),
      providerId: ticket.providerId || "",
      service: ticket.service || "",
      assignedTo: supportData.agent && supportData.agent.fullName || "Priya Sharma",
      messages: [
        { sender: ticket.customerName || session.fullName || "Customer", senderType: "customer", text: ticket.description, time: ticket.date }
      ],
      history: [
        { label: "Ticket created by customer", time: ticket.date, active: true }
      ]
    });
    supportData.notifications.unshift({
      id: "NT" + Date.now(),
      text: "New support ticket created - " + ticket.id,
      time: formatDisplayDateTime(new Date().toISOString()),
      isNew: true,
      ticketId: ticket.id
    });
    setSupportData(supportData);
  }

  function addCustomerChatMessageToSupport(ticket, message) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
    if (!Array.isArray(supportData.notifications)) supportData.notifications = [];

    let supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
    if (!supportTicket) {
      pushCustomerTicketToSupport(ticket);
      supportTicket = getSupportData().tickets.find(function (item) { return item.id === ticket.id; });
    }
    if (!supportTicket) return;

    if (!Array.isArray(supportTicket.messages)) supportTicket.messages = [];
    if (!Array.isArray(supportTicket.history)) supportTicket.history = [];
    const solutionText = supportTicket.solution || supportTicket.supportUpdate;
    const defaultUpdateText = "Your ticket has been received and is currently being reviewed by the support team.";
    if (solutionText && solutionText !== defaultUpdateText && !supportTicket.messages.some(function (item) {
      return item.senderType === "agent" && item.text === solutionText;
    })) {
      supportTicket.messages.push({
        sender: supportTicket.assignedTo || "Support Agent",
        senderType: "agent",
        text: solutionText,
        time: supportTicket.updatedAt || "Just now"
      });
    }
    supportTicket.messages.push({
      sender: session.fullName || "Customer",
      senderType: "customer",
      text: message,
      time: customerMessageStamp()
    });
    supportTicket.history.push({
      label: "Customer replied in support chat",
      time: customerMessageStamp(),
      active: true
    });
    supportTicket.history.forEach(function (entry, index) {
      entry.active = index === supportTicket.history.length - 1;
    });
    supportData.notifications.unshift({
      id: "NT" + Date.now(),
      text: "Customer replied to ticket " + supportTicket.id,
      time: formatDisplayDateTime(new Date().toISOString()),
      isNew: true,
      ticketId: supportTicket.id
    });
    setSupportData(supportData);
  }

  function hydrateSupportDataFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getState !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getState("serveEaseSupportModuleData")
      .then(function (entry) {
        if (entry && entry.value) {
          localStorage.setItem("serveEaseSupportModuleData", JSON.stringify(entry.value));
        }
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function statusClass(status) {
    const value = String(status).toLowerCase();
    if (value === "accepted" || value === "completed" || value === "successful") return "status-accepted";
    if (value === "pending") return "status-pending";
    if (value === "refunded") return "status-refunded";
    if (value === "failed" || value === "cancelled" || value === "incomplete") return "status-cancelled";
    return "status-pending";
  }

  function formatPrice(amount) {
    return `₹${amount}`;
  }

  function formatDisplayDate(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDate(value) : (value || "");
  }

  function formatDisplayDateTime(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDateTime(value) : (value || "");
  }

  function normalizeBookingCategory(status) {
    const value = String(status || "Pending");
    if (value.toLowerCase() === "rejected") return "Cancelled";
    return value;
  }

  function customerMatchesBooking(booking) {
    if (!booking) return false;
    if (!booking.customerEmail || !session.email) return false;
    return String(booking.customerEmail).toLowerCase() === String(session.email).toLowerCase();
  }

  function ensurePaymentForBooking(data, booking) {
    if (!booking || !booking.id) return;
    if (!Array.isArray(data.payments)) data.payments = [];
    const paymentStatus = ["cancelled", "rejected"].includes(String(booking.status || booking.category || "").toLowerCase())
      ? "Refunded"
      : "Successful";
    const hasPayment = data.payments.some(function (payment) {
      return String(payment.bookingRef || "").toLowerCase() === String(booking.id).toLowerCase();
    });
    if (hasPayment) {
      data.payments.forEach(function (payment) {
        if (String(payment.bookingRef || "").toLowerCase() === String(booking.id).toLowerCase()) {
          payment.status = paymentStatus;
        }
      });
      return;
    }

    data.payments.unshift({
      id: "TXN-" + String(booking.id).replace(/[^a-z0-9]/gi, "").slice(-10).toUpperCase(),
      bookingRef: booking.id,
      service: booking.service || "Service booking",
      provider: booking.provider || "ServeEase Provider",
      method: booking.paymentMethod || "Payment method not recorded",
      amount: Number(booking.amount) || 0,
      date: formatDisplayDate(new Date()),
      status: paymentStatus
    });
  }

  function mergeBackendBooking(data, booking) {
    if (!customerMatchesBooking(booking)) return false;
    if (!Array.isArray(data.bookings)) data.bookings = [];

    const category = normalizeBookingCategory(booking.category || booking.status);
    const existingBooking = data.bookings.find(function (item) {
      return String(item.id || "").toLowerCase() === String(booking.id || "").toLowerCase();
    });

    if (existingBooking) {
      existingBooking.service = booking.service || existingBooking.service;
      existingBooking.provider = booking.provider || existingBooking.provider;
      existingBooking.providerId = booking.providerId || existingBooking.providerId;
      existingBooking.date = booking.date || existingBooking.date;
      existingBooking.time = booking.time || existingBooking.time;
      existingBooking.address = booking.address || existingBooking.address;
      existingBooking.status = booking.status || existingBooking.status;
      existingBooking.amount = Number(booking.amount) || existingBooking.amount;
      existingBooking.customerName = booking.customerName || existingBooking.customerName;
      existingBooking.customerPhone = booking.customerPhone || existingBooking.customerPhone;
      existingBooking.customerEmail = booking.customerEmail || existingBooking.customerEmail;
      existingBooking.category = category || existingBooking.category;
      ensurePaymentForBooking(data, existingBooking);
      return true;
    }

    data.bookings.unshift({
      id: booking.id,
      service: booking.service || "Service booking",
      provider: booking.provider || "ServeEase Provider",
      providerId: booking.providerId || "",
      date: booking.date || "",
      time: booking.time || "",
      address: booking.address || "",
      status: booking.status || "Pending",
      amount: Number(booking.amount) || 0,
      customerName: booking.customerName || session.fullName || "Customer",
      customerPhone: booking.customerPhone || session.phone || "",
      customerEmail: booking.customerEmail || session.email || "",
      category: category || "Pending"
    });
    ensurePaymentForBooking(data, data.bookings[0]);
    return true;
  }

  function syncCustomerBookingsFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getBookings !== "function") {
      if (typeof done === "function") done(getCustomerData());
      return;
    }

    window.ServeEaseApi.getBookings()
      .then(function (apiBookings) {
        const data = getCustomerData();
        if (!Array.isArray(apiBookings) || !apiBookings.length) return data;

        let changed = false;
        apiBookings.forEach(function (booking) {
          if (mergeBackendBooking(data, booking)) changed = true;
        });

        if (changed) setCustomerData(data);
        return data;
      })
      .catch(function (error) {
        console.warn("ServeEase backend customer booking sync skipped.", error);
        return getCustomerData();
      })
      .then(function (data) {
        if (typeof done === "function") done(data);
      });
  }

  function logoutCustomer() {
    sessionStorage.removeItem("serveEaseSession");
    window.location.href = "index.html";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getCustomerNotifications(data) {
    const source = data || getCustomerData() || {};
    const readIds = new Set(getReadNotificationIds());
    const notifications = [];

    (source.tickets || []).forEach(function (ticket) {
      const ticketStatus = String(ticket.status || "Open");
      const createdLabel = formatNotificationTime(ticket.createdAtIso || ticket.date || ticket.createdDate || ticket.created);
      const notificationId = "ticket:" + String(ticket.id || "").toLowerCase() + ":" + ticketStatus.toLowerCase();
      notifications.push({
        id: notificationId,
        text: ticketStatus.toLowerCase() === "resolved"
          ? "Support ticket " + ticket.id + " has been resolved."
          : "Support ticket " + ticket.id + " is " + ticketStatus.toLowerCase() + ".",
        time: createdLabel,
        sortAt: parseNotificationTimestamp(ticket.createdAtIso || ticket.date),
        isNew: ticketStatus.toLowerCase() === "open" && !readIds.has(notificationId),
        actionPage: "customer-support-center.html"
      });
    });

    (source.bookings || []).forEach(function (booking) {
      const status = String(booking.status || booking.category || "updated");
      const statusKey = status.toLowerCase();
      const createdLabel = formatNotificationTime(booking.createdAtIso || booking.date);
      const notificationId = "booking:" + String(booking.id || "").toLowerCase() + ":" + statusKey;
      notifications.push({
        id: notificationId,
        text: (booking.service || "Your booking") + " is " + statusKey + ".",
        time: createdLabel,
        sortAt: parseNotificationTimestamp(booking.createdAtIso || booking.date),
        isNew: (statusKey === "pending" || statusKey === "accepted") && !readIds.has(notificationId),
        actionPage: "my-bookings.html"
      });
    });

    (source.payments || []).forEach(function (payment) {
      const paymentStatus = String(payment.status || "updated");
      const paymentLabel = formatNotificationTime(payment.createdAtIso || payment.date);
      const notificationId = "payment:" + String(payment.id || "").toLowerCase() + ":" + paymentStatus.toLowerCase();
      notifications.push({
        id: notificationId,
        text: "Payment " + (payment.id || "") + " for " + (payment.service || "your service") + " is " + paymentStatus.toLowerCase() + ".",
        time: paymentLabel,
        sortAt: parseNotificationTimestamp(payment.createdAtIso || payment.date),
        isNew: (paymentStatus.toLowerCase() === "pending" || paymentStatus.toLowerCase() === "failed") && !readIds.has(notificationId),
        actionPage: "payment-history.html"
      });
    });

    return notifications
      .sort(function (a, b) {
        return (b.sortAt || 0) - (a.sortAt || 0);
      })
      .slice(0, 30);
  }

  function renderNotificationItems(notifications, limit) {
    const visibleNotifications = typeof limit === "number" ? notifications.slice(0, limit) : notifications;
    if (!visibleNotifications.length) {
      return '<div class="notification-empty"><strong>No notifications yet</strong><span>New booking, payment, and support updates will appear here.</span></div>';
    }

    return visibleNotifications.map(function (item) {
      return '<button class="notification-item ' + (item.isNew ? 'unread' : '') + '" type="button" data-notification-page="' + item.actionPage + '" data-notification-id="' + item.id + '">' +
        '<p>' + escapeHtml(item.text) + '</p>' +
        '<span>' + escapeHtml(item.time) + '</span>' +
      '</button>';
    }).join("");
  }

  function openCustomerNotificationsModal(notifications) {
    let backdrop = document.getElementById("customerNotificationsModalBackdrop");
    if (!backdrop) {
      backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop hidden";
      backdrop.id = "customerNotificationsModalBackdrop";
      backdrop.innerHTML = [
        '<div class="modal-card customer-notifications-modal">',
        '  <div class="modal-head">',
        '    <h2>All Notifications</h2>',
        '    <button class="close-modal-btn" type="button" id="closeCustomerNotificationsModal">&times;</button>',
        '  </div>',
        '  <div id="customerNotificationsModalList"></div>',
        '</div>'
      ].join("");
      document.body.appendChild(backdrop);

      backdrop.addEventListener("click", function (event) {
        if (event.target === backdrop) backdrop.classList.add("hidden");
      });

      const closeBtn = document.getElementById("closeCustomerNotificationsModal");
      if (closeBtn) {
        closeBtn.addEventListener("click", function () {
          backdrop.classList.add("hidden");
        });
      }
    }

    const list = document.getElementById("customerNotificationsModalList");
    if (list) {
      list.innerHTML = renderNotificationItems(notifications);
      list.querySelectorAll("[data-notification-page]").forEach(function (button) {
        button.addEventListener("click", function () {
          markNotificationIdsAsRead([button.dataset.notificationId]);
          renderCustomerNotifications();
          window.location.href = button.dataset.notificationPage;
        });
      });
    }

    backdrop.classList.remove("hidden");
  }

  function renderCustomerNotifications() {
    const notificationPanel = document.getElementById("customerNotificationPanel");
    if (!notificationPanel) return;

    const notifications = getCustomerNotifications();
    const newCount = notifications.filter(function (item) { return item.isNew; }).length;
    notificationPanel.innerHTML = [
      '<div class="notification-head">',
      '  <h3>Notifications</h3>',
      '  <span class="notification-badge">' + newCount + ' New</span>',
      '</div>',
      renderNotificationItems(notifications, 4),
      '<button class="view-notifications-btn" type="button" id="viewCustomerNotificationsBtn" data-view-all-notifications="true">View All Notifications</button>'
    ].join("");

    const viewAllBtn = notificationPanel.querySelector("#viewCustomerNotificationsBtn");
    if (viewAllBtn) {
      viewAllBtn.onclick = function (event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        openCustomerNotificationsView();
      };
    }

    notificationPanel.querySelectorAll("[data-notification-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        markNotificationIdsAsRead([button.dataset.notificationId]);
        renderCustomerNotifications();
        window.location.href = button.dataset.notificationPage;
      });
    });
  }

  function setupCustomerHeaderMenus() {
    const notificationBtn = document.getElementById("customerNotificationBtn");
    const notificationPanel = document.getElementById("customerNotificationPanel");
    renderCustomerNotifications();
    trapNotificationScroll(notificationPanel);
    const profileBtn = document.getElementById("customerProfileBtn");
    const profileDropdown = document.getElementById("customerProfileDropdown");
    const logoutBtn = document.getElementById("customerLogoutBtn");

    if (notificationBtn && notificationPanel) {
      notificationBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        notificationPanel.classList.toggle("hidden");
        if (!notificationPanel.classList.contains("hidden")) {
          markNotificationsAsRead(getCustomerNotifications());
          renderCustomerNotifications();
        }
        if (profileDropdown) profileDropdown.classList.add("hidden");
      });

      notificationPanel.addEventListener("click", function (e) {
        e.stopPropagation();
      });
    }

    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        profileDropdown.classList.toggle("hidden");
        if (notificationPanel) notificationPanel.classList.add("hidden");
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", logoutCustomer);
    }

    document.addEventListener("click", function () {
      if (notificationPanel) notificationPanel.classList.add("hidden");
      if (profileDropdown) profileDropdown.classList.add("hidden");
    });
  }


  function getCustomerAccount() {
    const data = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
    const users = Array.isArray(data.users) ? data.users : [];

    return users.find(function (user) {
      if (!user) return false;
      if (session.userId && user.id === session.userId) return true;
      return user.email && session.email && user.email.toLowerCase() === session.email.toLowerCase();
    }) || null;
  }

  function updateCustomerSessionFields(user) {
    if (!user) return;
    const nextSession = {
      ...session,
      fullName: user.fullName || session.fullName,
      email: user.email || session.email,
      phone: user.phone || session.phone || ""
    };
    sessionStorage.setItem("serveEaseSession", JSON.stringify(nextSession));
  }

  function setupCustomerFooterLinks() {
    const footerAnchors = document.querySelectorAll(".footer a");
    footerAnchors.forEach(function (anchor) {
      const label = anchor.textContent.trim().toLowerCase();
      if (label === "about us") anchor.href = "index.html#about-us";
      if (label === "help center") anchor.href = "customer-support-center.html";
      if (label === "contact support") anchor.href = "customer-support-center.html";
      if (label === "track booking") anchor.href = "my-bookings.html";
      if (label === "raise ticket") anchor.href = "customer-support-center.html";
      if (label === "terms & conditions") anchor.href = "index.html#terms-and-conditions";
      if (label === "privacy policy") anchor.href = "index.html#privacy-policy";
      if (label === "cancellation policy") anchor.href = "index.html#cancellation-policy";
    });
  }

  function initCustomerProfilePage() {
    const profileInfo = document.getElementById("customerProfileInfo");
    if (!profileInfo) return;

    const customerAccount = getCustomerAccount();
    const customerName = (customerAccount && customerAccount.fullName) || session.fullName;
    const customerEmail = (customerAccount && customerAccount.email) || session.email;
    const customerPhone = (customerAccount && customerAccount.phone) || session.phone || "";

    updateCustomerSessionFields({ fullName: customerName, email: customerEmail, phone: customerPhone });

    profileInfo.innerHTML = `
      <div class="info-box">
        <strong>Full Name</strong>
        <div>${customerName}</div>
      </div>
      <div class="info-box">
        <strong>Email</strong>
        <div>${customerEmail}</div>
      </div>
      <div class="info-box">
        <strong>Phone Number</strong>
        <div id="customerPhoneView" class="profile-edit-row">
          <span id="customerPhoneText">${customerPhone || "Not added"}</span>
          <button type="button" class="btn btn-outline profile-inline-btn" id="customerPhoneEditBtn">Edit</button>
        </div>
        <div id="customerPhoneEditWrap" class="profile-edit-wrap hidden">
          <input type="text" id="customerPhoneInput" class="profile-inline-input" maxlength="10" value="${customerPhone}">
          <div class="profile-edit-actions">
            <button type="button" class="btn btn-primary profile-inline-btn" id="customerPhoneSaveBtn">Save</button>
            <button type="button" class="btn btn-outline profile-inline-btn" id="customerPhoneCancelBtn">Cancel</button>
          </div>
          <small class="profile-inline-message" id="customerPhoneMessage"></small>
        </div>
      </div>
      <div class="info-box">
        <strong>Account Status</strong>
        <div>Active</div>
      </div>
    `;

    const phoneView = document.getElementById("customerPhoneView");
    const phoneEditWrap = document.getElementById("customerPhoneEditWrap");
    const phoneText = document.getElementById("customerPhoneText");
    const phoneInput = document.getElementById("customerPhoneInput");
    const phoneMessage = document.getElementById("customerPhoneMessage");

    function showEditMode() {
      phoneView.classList.add("hidden");
      phoneEditWrap.classList.remove("hidden");
      phoneMessage.textContent = "";
      phoneInput.focus();
    }

    function showViewMode() {
      phoneEditWrap.classList.add("hidden");
      phoneView.classList.remove("hidden");
    }

    document.getElementById("customerPhoneEditBtn").addEventListener("click", showEditMode);
    document.getElementById("customerPhoneCancelBtn").addEventListener("click", function () {
      const latestAccount = getCustomerAccount();
      phoneInput.value = (latestAccount && latestAccount.phone) || session.phone || "";
      phoneMessage.textContent = "";
      showViewMode();
    });

    document.getElementById("customerPhoneSaveBtn").addEventListener("click", function () {
      const nextPhone = phoneInput.value.trim();

      if (!/^[6-9]\d{9}$/.test(nextPhone)) {
        phoneMessage.textContent = "Enter a valid 10-digit phone number.";
        return;
      }

      const data = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
      const users = Array.isArray(data.users) ? data.users : [];
      const duplicatePhone = users.some(function (user) {
        if (!user || user.id === session.userId) return false;
        return user.phone === nextPhone;
      });

      if (duplicatePhone) {
        phoneMessage.textContent = "This phone number is already used by another account.";
        return;
      }

      const userIndex = users.findIndex(function (user) {
        if (!user) return false;
        if (session.userId && user.id === session.userId) return true;
        return user.email && session.email && user.email.toLowerCase() === session.email.toLowerCase();
      });

      if (userIndex === -1) {
        phoneMessage.textContent = "Unable to update phone number right now.";
        return;
      }

      users[userIndex].phone = nextPhone;
      data.users = users;
      localStorage.setItem("serveEaseData", JSON.stringify(data));
      updateCustomerSessionFields(users[userIndex]);
      phoneText.textContent = nextPhone;
      showViewMode();
    });
  }

  function initDashboard() {
    const welcome = document.getElementById("customerWelcome");
    if (!welcome) return;

    welcome.textContent = `Welcome back, ${session.fullName}!`;

    function renderDashboard(data) {
      syncCustomerTicketsFromSupport(data);

      const statsContainer = document.getElementById("customerStats");
      const totalBookings = data.bookings.length;
      const upcomingBookings = data.bookings.filter(item => item.category === "Accepted" || item.category === "Pending").length;
      const successfulPayments = data.payments.filter(item => item.status === "Successful").length;
      const openTickets = data.tickets.filter(item => item.status === "Open").length;

      statsContainer.innerHTML = `
        <div class="stat-card-dashboard"><div class="feature-icon blue">📘</div><h3>${totalBookings}</h3><p>Total Bookings</p></div>
        <div class="stat-card-dashboard"><div class="feature-icon green">📅</div><h3>${upcomingBookings}</h3><p>Upcoming Bookings</p></div>
        <div class="stat-card-dashboard"><div class="feature-icon orange">💳</div><h3>${successfulPayments}</h3><p>Successful Payments</p></div>
        <div class="stat-card-dashboard"><div class="feature-icon purple">🎫</div><h3>${openTickets}</h3><p>Open Tickets</p></div>
      `;

      const upcomingBox = document.getElementById("dashboardUpcomingBookings");
      const upcomingItems = data.bookings.filter(item => item.category === "Accepted" || item.category === "Pending").slice(0, 3);
      upcomingBox.innerHTML = upcomingItems.length ? upcomingItems.map(item => `
        <div class="preview-item">
          <div class="preview-title">${item.service}</div>
          <div class="preview-meta">${item.provider} • ${formatDisplayDate(item.date)} • ${item.time}</div>
        </div>
      `).join("") : '<div class="empty-state-card">No upcoming bookings yet.</div>';

      const paymentsBox = document.getElementById("dashboardRecentPayments");
      paymentsBox.innerHTML = data.payments.length ? data.payments.slice(0, 4).map(item => `
        <div class="preview-item">
          <div class="preview-title">${item.service}</div>
          <div class="preview-meta">${item.id} • ${formatPrice(item.amount)} • ${item.status}</div>
        </div>
      `).join("") : '<div class="empty-state-card">No payments yet.</div>';

      const supportBox = document.getElementById("dashboardSupportPreview");
      supportBox.innerHTML = data.tickets.length ? data.tickets.map(item => `
        <div class="preview-item">
          <div class="preview-title">${item.subject}</div>
          <div class="preview-meta">${item.id} • ${item.bookingRef} • ${item.status}</div>
        </div>
      `).join("") : '<div class="empty-state-card">No support tickets yet.</div>';
    }

    renderDashboard(getCustomerData());
    syncCustomerBookingsFromBackend(renderDashboard);
  }

  function initMyBookings() {
    const tabs = document.getElementById("bookingTabs");
    if (!tabs) return;

    const data = getCustomerData();
    const categories = ["All", "Pending", "Accepted", "Completed", "Cancelled"];
    let activeTab = "All";

    const upcomingSection = document.getElementById("upcomingBookingsSection");
    const upcomingHeading = document.getElementById("upcomingBookingsHeading");
    const historySection = document.getElementById("bookingHistorySection");
    const historyHeading = document.getElementById("bookingHistoryHeading");
    const reviewApi = window.ServeEaseReviews;
    let reviewBooking = null;
    let selectedRating = 0;

    if (reviewApi) reviewApi.seedCompletedBookings(data.bookings, (session && session.userId) || "CUS001");

    function reviewFor(booking) {
      return reviewApi ? reviewApi.find(booking.id) : null;
    }

    function reviewCell(booking) {
      const review = reviewFor(booking);
      return review
        ? `<div class="booking-review-cell"><span class="review-rating" aria-label="${review.rating} out of 5 stars"><span class="review-stars">${reviewApi.stars(review.rating)}</span><span class="booking-rating-value">${Number(review.rating).toFixed(1)}</span></span><button class="table-link-btn edit-review-btn" type="button" data-edit-review="${booking.id}">Edit Review</button></div>`
        : `<button class="table-link-btn" type="button" data-rate-booking="${booking.id}">⭐ Rate Service</button>`;
    }

    function closeReviewModal() {
      const backdrop = document.getElementById("reviewModalBackdrop");
      if (backdrop) backdrop.classList.add("hidden");
      reviewBooking = null;
    }

    function updateStarPicker() {
      document.querySelectorAll("[data-review-star]").forEach(function (star) {
        const active = Number(star.dataset.reviewStar) <= selectedRating;
        star.textContent = active ? "★" : "☆";
        star.setAttribute("aria-checked", String(Number(star.dataset.reviewStar) === selectedRating));
      });
    }

    function openReviewModal(booking) {
      const backdrop = document.getElementById("reviewModalBackdrop");
      if (!backdrop || !booking) return;
      const existing = reviewFor(booking);
      reviewBooking = booking;
      selectedRating = existing ? Number(existing.rating) : 0;
      document.getElementById("reviewFeedback").value = existing ? existing.feedback || "" : "";
      document.getElementById("reviewModalTitle").textContent = existing ? "Edit Your Review" : "Rate Your Experience";
      document.querySelector("#reviewForm button[type=submit]").textContent = existing ? "Save Changes" : "Submit Review";
      document.getElementById("reviewValidation").classList.add("hidden");
      updateStarPicker();
      backdrop.classList.remove("hidden");
      document.querySelector("[data-review-star]").focus();
    }

    function setupReviewModal() {
      const backdrop = document.getElementById("reviewModalBackdrop");
      const form = document.getElementById("reviewForm");
      if (!backdrop || !form || backdrop.dataset.reviewBound) return;
      document.getElementById("closeReviewModal").addEventListener("click", closeReviewModal);
      document.getElementById("cancelReviewBtn").addEventListener("click", closeReviewModal);
      backdrop.addEventListener("click", function (event) { if (event.target === backdrop) closeReviewModal(); });
      document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !backdrop.classList.contains("hidden")) closeReviewModal(); });
      document.querySelectorAll("[data-review-star]").forEach(function (star) {
        star.addEventListener("click", function () { selectedRating = Number(star.dataset.reviewStar); updateStarPicker(); });
      });
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const validation = document.getElementById("reviewValidation");
        if (!selectedRating || !reviewBooking || !reviewApi) { validation.classList.remove("hidden"); return; }
        const reviewPayload = { bookingId: reviewBooking.id, providerId: reviewBooking.providerId || reviewApi.providerKey(reviewBooking.provider), customerId: reviewBooking.customerId || (session && session.userId) || "CUS001", rating: selectedRating, feedback: document.getElementById("reviewFeedback").value };
        const saved = reviewFor(reviewBooking) ? reviewApi.update(reviewPayload) : reviewApi.submit(reviewPayload);
        if (!saved) { validation.textContent = "Unable to save this review. Please try again."; validation.classList.remove("hidden"); return; }
        closeReviewModal();
        renderBookings();
      });
      backdrop.dataset.reviewBound = "true";
    }

    function renderTabs() {
      tabs.innerHTML = categories.map(category => {
        const count = category === "All"
          ? data.bookings.length
          : data.bookings.filter(item => item.category === category).length;

        return `<button class="tab-btn ${activeTab === category ? "active" : ""}" data-category="${category}">${category} <span>${count}</span></button>`;
      }).join("");

      tabs.querySelectorAll(".tab-btn").forEach(button => {
        button.addEventListener("click", function () {
          activeTab = this.dataset.category;
          renderTabs();
          renderBookings();
        });
      });
    }

    function renderBookings() {
      const grid = document.getElementById("upcomingBookingsGrid");
      const tbody = document.getElementById("pastBookingsTableBody");
      if (!grid || !tbody) return;

      let upcoming = [];
      let history = [];

      if (activeTab === "All") {
        upcoming = data.bookings.filter(item => item.category === "Accepted" || item.category === "Pending");
        history = data.bookings.filter(item => item.category === "Completed" || item.category === "Cancelled");
        if (upcomingSection) upcomingSection.classList.remove("hidden");
        if (historySection) historySection.classList.remove("hidden");
        if (upcomingHeading) upcomingHeading.textContent = "Upcoming Bookings";
        if (historyHeading) historyHeading.textContent = "Past Booking History";
      } else if (activeTab === "Pending" || activeTab === "Accepted") {
        upcoming = data.bookings.filter(item => item.category === activeTab);
        history = [];
        if (upcomingSection) upcomingSection.classList.remove("hidden");
        if (historySection) historySection.classList.add("hidden");
        if (upcomingHeading) upcomingHeading.textContent = `${activeTab} Bookings`;
      } else if (activeTab === "Completed") {
        upcoming = [];
        history = data.bookings.filter(item => item.category === "Completed");
        if (upcomingSection) upcomingSection.classList.add("hidden");
        if (historySection) historySection.classList.remove("hidden");
        if (historyHeading) historyHeading.textContent = "Completed Bookings";
      } else if (activeTab === "Cancelled") {
        upcoming = [];
        history = data.bookings.filter(item => item.category === "Cancelled");
        if (upcomingSection) upcomingSection.classList.add("hidden");
        if (historySection) historySection.classList.remove("hidden");
        if (historyHeading) historyHeading.textContent = "Cancelled Bookings";
      }

      grid.innerHTML = upcoming.length ? upcoming.map(item => `
        <div class="booking-card-customer">
          <div class="booking-card-top">
            <div>
              <h3>${item.service}</h3>
              <div class="booking-provider">${item.provider}</div>
            </div>
            <span class="status-pill ${statusClass(item.status)}">${item.status}</span>
          </div>

          <div class="booking-info-line">📅 ${formatDisplayDate(item.date)}</div>
          <div class="booking-info-line">🕒 ${item.time}</div>
          <div class="booking-info-line">📍 ${item.address}</div>

          <div class="booking-bottom-row">
            <div class="booking-ref">${getBookingReference(item)}</div>
            <div class="booking-price">${formatPrice(item.amount)}</div>
          </div>

          <div class="booking-actions">
            <button class="secondary-action" data-view-booking="${item.id}">View Details</button>
            <button class="secondary-action" data-raise-ticket="${item.id}">Raise Ticket</button>
            <button class="danger-action" data-cancel-booking="${item.id}">Cancel</button>
          </div>
        </div>
      `).join("") : `<div class="empty-state-card">No ${activeTab === "All" ? "upcoming" : activeTab.toLowerCase()} bookings found.</div>`;

      tbody.innerHTML = history.length ? history.map(item => `
        <tr>
          <td>${item.service}</td>
          <td>${item.provider}</td>
          <td>${formatDisplayDate(item.date)}</td>
          <td>${formatPrice(item.amount)}</td>
          <td>${getBookingReference(item)}</td>
          <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
          <td>${item.category === "Completed" ? reviewCell(item) : "—"}</td>
          <td>
            <button class="table-link-btn" data-view-booking="${item.id}">View</button>
            <button class="table-link-btn" data-raise-ticket="${item.id}">Raise Ticket</button>
          </td>
        </tr>
      `).join("") : `<tr><td colspan="8">No ${activeTab.toLowerCase()} bookings found.</td></tr>`;

      attachBookingActions();
    }

    function attachBookingActions() {
      document.querySelectorAll("[data-view-booking]").forEach(button => {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(item => item.id === this.dataset.viewBooking);
          openBookingModal(booking);
        });
      });

      document.querySelectorAll("[data-rate-booking]").forEach(function (button) {
        button.addEventListener("click", function () {
          openReviewModal(data.bookings.find(function (item) { return item.id === button.dataset.rateBooking; }));
        });
      });

      document.querySelectorAll("[data-edit-review]").forEach(function (button) {
        button.addEventListener("click", function () {
          openReviewModal(data.bookings.find(function (item) { return item.id === button.dataset.editReview; }));
        });
      });

      document.querySelectorAll("[data-raise-ticket]").forEach(button => {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(item => item.id === this.dataset.raiseTicket);
          createSupportTicketDraft(booking);
        });
      });

      document.querySelectorAll("[data-cancel-booking]").forEach(button => {
        button.addEventListener("click", function () {
          const bookingId = this.dataset.cancelBooking;
          const booking = data.bookings.find(item => item.id === bookingId);
          if (!booking) return;

          const cancelModal = document.getElementById("cancelConfirmModalBackdrop");
          const yesBtn = document.getElementById("cancelConfirmYesBtn");
          const noBtn = document.getElementById("cancelConfirmNoBtn");

          if (cancelModal && yesBtn && noBtn) {
            cancelModal.classList.remove("hidden");

            const handleYes = function() {
              booking.status = "Cancelled";
              booking.category = "Cancelled";
              setCustomerData(data);
              if (window.ServeEaseApi && typeof window.ServeEaseApi.updateBooking === "function" && /^[0-9a-f-]{36}$/i.test(booking.id)) {
                window.ServeEaseApi.updateBooking(booking.id, { status: "Cancelled" }).catch(function (error) {
                  console.warn("ServeEase backend cancellation sync failed.", error);
                });
              }
              renderTabs();
              renderBookings();
              cancelModal.classList.add("hidden");
              cleanupListeners();
            };

            const handleNo = function() {
              cancelModal.classList.add("hidden");
              cleanupListeners();
            };

            function cleanupListeners() {
              yesBtn.removeEventListener("click", handleYes);
              noBtn.removeEventListener("click", handleNo);
            }

            yesBtn.addEventListener("click", handleYes);
            noBtn.addEventListener("click", handleNo);
          } else {
            // Fallback just in case
            if (confirm(`Are you sure you want to cancel booking ${booking.id}?`)) {
              booking.status = "Cancelled";
              booking.category = "Cancelled";
              setCustomerData(data);
              if (window.ServeEaseApi && typeof window.ServeEaseApi.updateBooking === "function" && /^[0-9a-f-]{36}$/i.test(booking.id)) {
                window.ServeEaseApi.updateBooking(booking.id, { status: "Cancelled" }).catch(function (error) {
                  console.warn("ServeEase backend cancellation sync failed.", error);
                });
              }
              renderTabs();
              renderBookings();
            }
          }
        });
      });
    }

    renderTabs();
    renderBookings();
    setupBookingModal();
    setupReviewModal();

    syncCustomerBookingsFromBackend(function (latestData) {
      data.bookings = latestData.bookings || [];
      data.payments = latestData.payments || [];
      data.tickets = latestData.tickets || [];
      renderTabs();
      renderBookings();
    });
  }

  function setupBookingModal() {
    const backdrop = document.getElementById("bookingModalBackdrop");
    const closeBtn = document.getElementById("closeBookingModal");
    if (!backdrop || !closeBtn) return;

    closeBtn.addEventListener("click", function () {
      backdrop.classList.add("hidden");
    });

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) {
        backdrop.classList.add("hidden");
      }
    });
  }

  function openBookingModal(booking) {
    const backdrop = document.getElementById("bookingModalBackdrop");
    const title = document.getElementById("bookingModalTitle");
    const content = document.getElementById("bookingModalContent");
    if (!backdrop || !title || !content || !booking) return;

    title.textContent = "Booking Details";
    const review = window.ServeEaseReviews && window.ServeEaseReviews.find(booking.id);
    const customerReview = String(booking.category || booking.status).toLowerCase() === "completed"
      ? `<div class="info-box booking-review-section"><strong>Customer Review</strong>${review ? `<div class="review-rating"><span class="review-stars">${window.ServeEaseReviews.stars(review.rating)}</span><span class="booking-rating-value">${Number(review.rating).toFixed(1)}</span></div><div class="review-feedback"><strong>Feedback:</strong><div>${review.feedback || "No review provided."}</div></div>` : "<div>No review submitted.</div>"}</div>`
      : "";
    content.innerHTML = `
      <div class="info-grid">
        <div class="info-box">
          <strong>Service Information</strong>
          <div class="info-row"><span>Service Name:</span><span>${booking.service}</span></div>
          <div class="info-row"><span>Provider Name:</span><span>${booking.provider}</span></div>
          <div class="info-row"><span>Booking Reference:</span><span>${getBookingReference(booking)}</span></div>
          <div class="info-row"><span>Status:</span><span class="status-pill ${statusClass(booking.status)}">${booking.status}</span></div>
        </div>

        <div class="info-box">
          <strong>Date & Time</strong>
          <div class="info-row"><span>Date:</span><span>${formatDisplayDate(booking.date)}</span></div>
          <div class="info-row"><span>Time:</span><span>${booking.time}</span></div>
        </div>

        <div class="info-box">
          <strong>Service Address</strong>
          <div>${booking.address}</div>
        </div>

        <div class="info-box">
          <strong>Provider Contact</strong>
          <div>+91 98765 43210</div>
        </div>
        ${customerReview}
      </div>
    `;
    backdrop.classList.remove("hidden");
  }

  function initPaymentHistory() {
    const summary = document.getElementById("paymentSummaryCards");
    if (!summary) return;

    const data = getCustomerData();
    const tbody = document.getElementById("paymentHistoryTableBody");
    if (!tbody) return;

    function renderPaymentHistory() {
      const totalPaid = data.payments.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      const successfulCount = data.payments.filter(item => item.status === "Successful").length;
      const refunded = data.payments.filter(item => item.status === "Refunded").reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      summary.innerHTML = `
        <div class="stat-card-dashboard"><div class="feature-icon green">✅</div><h3>${formatPrice(totalPaid)}</h3><p>Total Payments Made</p></div>
        <div class="stat-card-dashboard"><div class="feature-icon orange">📄</div><h3>${successfulCount}</h3><p>Successful Transactions</p></div>
        <div class="stat-card-dashboard"><div class="feature-icon blue">🔄</div><h3>${formatPrice(refunded)}</h3><p>Refunded Amount</p></div>
      `;

      tbody.innerHTML = data.payments.length ? data.payments.map(item => `
        <tr>
          <td>${item.id}</td>
          <td>${item.bookingRef}</td>
          <td>${item.service}</td>
          <td>${item.provider}</td>
          <td>${item.method}</td>
          <td>${formatPrice(item.amount)}</td>
          <td>${formatDisplayDate(item.date)}</td>
          <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
          <td><button class="table-link-btn" data-view-payment="${item.id}">View Details</button></td>
        </tr>
      `).join("") : '<tr><td colspan="9">No payments found.</td></tr>';
    }

    renderPaymentHistory();
    setupPaymentModal(data);
    syncCustomerBookingsFromBackend(function (latestData) {
      data.bookings = latestData.bookings || [];
      data.payments = latestData.payments || [];
      data.tickets = latestData.tickets || [];
      renderPaymentHistory();
      setupPaymentModal(data);
    });
  }

  function setupPaymentModal(data) {
    const backdrop = document.getElementById("paymentModalBackdrop");
    const closeBtn = document.getElementById("closePaymentModal");
    const content = document.getElementById("paymentModalContent");
    if (!backdrop || !closeBtn || !content) return;

    closeBtn.addEventListener("click", function () {
      backdrop.classList.add("hidden");
    });

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) backdrop.classList.add("hidden");
    });

    document.querySelectorAll("[data-view-payment]").forEach(button => {
      button.addEventListener("click", function () {
        const payment = data.payments.find(item => item.id === this.dataset.viewPayment);
        if (!payment) return;

        content.innerHTML = `
          <div class="info-grid">
            <div class="info-box">
              <strong>Transaction Information</strong>
              <div class="info-row"><span>Transaction ID:</span><span>${payment.id}</span></div>
              <div class="info-row"><span>Booking Reference:</span><span>${payment.bookingRef}</span></div>
              <div class="info-row"><span>Payment Status:</span><span class="status-pill ${statusClass(payment.status)}">${payment.status}</span></div>
            </div>

            <div class="info-box">
              <strong>Service Information</strong>
              <div class="info-row"><span>Service Name:</span><span>${payment.service}</span></div>
              <div class="info-row"><span>Provider Name:</span><span>${payment.provider}</span></div>
            </div>

            <div class="info-box">
              <strong>Payment Information</strong>
              <div class="info-row"><span>Payment Method:</span><span>${payment.method}</span></div>
              <div class="info-row"><span>Amount Paid:</span><span>${formatPrice(payment.amount)}</span></div>
              <div class="info-row"><span>Payment Date:</span><span>${formatDisplayDate(payment.date)}</span></div>
            </div>
          </div>
        `;
        backdrop.classList.remove("hidden");
      });
    });
  }

  function initSupportCenter() {
    const form = document.getElementById("supportTicketForm");
    if (!form) return;

    const data = getCustomerData();
    const list = document.getElementById("supportTicketsList");
    const error = document.getElementById("supportFormError");
    const success = document.getElementById("supportFormSuccess");
    const draft = JSON.parse(sessionStorage.getItem("serveEaseSupportTicketDraft") || "null");
    const focusedTicketId = sessionStorage.getItem("serveEaseSupportTicketFocus");

    const bookingInput = document.getElementById("ticketBookingRef");
    const categoryInput = document.getElementById("ticketCategory");
    const subjectInput = document.getElementById("ticketSubject");
    const descriptionInput = document.getElementById("ticketDescription");

    if (draft) {
      const bookingRefValue = normalizeBookingRef(draft.bookingRef);
      if (bookingInput) {
        bookingInput.value = bookingRefValue;
        bookingInput.readOnly = Boolean(bookingRefValue);
      }
      if (categoryInput) categoryInput.value = draft.category || "";
      if (subjectInput) subjectInput.value = draft.subject || "";
      if (descriptionInput) descriptionInput.value = draft.description || "";
      if (draft.bookingContext && draft.bookingContext.service) {
        const hint = document.getElementById("supportFormHint");
        if (hint) {
          hint.textContent = `Booking context loaded for ${draft.bookingContext.service}. Please describe the issue in your own words.`;
        }
      }
      sessionStorage.removeItem("serveEaseSupportTicketDraft");
    } else {
      const queryBookingRef = normalizeBookingRef(new URLSearchParams(window.location.search).get("bookingRef") || "");
      if (queryBookingRef && bookingInput) {
        bookingInput.value = queryBookingRef;
        bookingInput.readOnly = true;
        const hint = document.getElementById("supportFormHint");
        if (hint) {
          hint.textContent = "Booking reference loaded. Please select the issue category and describe the problem.";
        }
      }
    }

    function renderTickets() {
      list.innerHTML = data.tickets.map(ticket => `
        <div class="ticket-card">
          <div class="ticket-top">
            <h3>${ticket.subject}</h3>
            <span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span>
          </div>
          <div class="ticket-meta">Ticket ID: <strong>${ticket.id}</strong></div>
          <div class="ticket-meta">Booking Ref: ${ticket.bookingRef}</div>
          <div class="ticket-meta">${ticket.category} • ${formatDisplayDate(ticket.date)}</div>
          <div class="ticket-actions">
            <button class="secondary-action" type="button" data-view-ticket="${ticket.id}">View Ticket</button>
            <button class="btn btn-primary" type="button" data-chat-ticket="${ticket.id}">Chat with Support</button>
          </div>
        </div>
      `).join("");
    }

    function setupFaqAccordion() {
      const faqItems = document.querySelectorAll(".faq-item");
      faqItems.forEach(function (button) {
        button.addEventListener("click", function () {
          const answer = button.nextElementSibling;
          if (!answer) return;
          const isHidden = answer.classList.contains("hidden");
          document.querySelectorAll(".faq-answer").forEach(function (item) { item.classList.add("hidden"); });
          document.querySelectorAll(".faq-toggle").forEach(function (toggle) { toggle.textContent = "+"; });
          if (isHidden) {
            answer.classList.remove("hidden");
            const toggle = button.querySelector(".faq-toggle");
            if (toggle) toggle.textContent = "−";
          }
        });
      });
    }

    function setupTicketInteractions() {
      const ticketModalBackdrop = document.getElementById("supportTicketModalBackdrop");
      const ticketModalContent = document.getElementById("supportTicketModalContent");
      const ticketModalClose = document.getElementById("closeSupportTicketModal");
      const chatModalBackdrop = document.getElementById("supportChatModalBackdrop");
      const chatModalClose = document.getElementById("closeSupportChatModal");
      const chatForm = document.getElementById("supportChatForm");
      const chatInput = document.getElementById("supportChatInput");
      const chatThread = document.getElementById("supportChatThread");
      let activeChatTicketId = "";

      if (ticketModalClose && ticketModalBackdrop) {
        ticketModalClose.addEventListener("click", function () { ticketModalBackdrop.classList.add("hidden"); });
        ticketModalBackdrop.addEventListener("click", function (e) { if (e.target === ticketModalBackdrop) ticketModalBackdrop.classList.add("hidden"); });
      }

      if (chatModalClose && chatModalBackdrop) {
        chatModalClose.addEventListener("click", function () { chatModalBackdrop.classList.add("hidden"); });
        chatModalBackdrop.addEventListener("click", function (e) { if (e.target === chatModalBackdrop) chatModalBackdrop.classList.add("hidden"); });
      }

      if (chatForm && chatInput && chatThread) {
        chatForm.addEventListener("submit", function (e) {
          e.preventDefault();
          const message = chatInput.value.replace(/[<>]/g, "").trim();
          if (!message) return;
          const ticket = data.tickets.find(function (item) { return item.id === activeChatTicketId; });
          if (!ticket) return;
          addCustomerChatMessageToSupport(ticket, message);
          chatInput.value = "";
          renderChatThread(ticket);
        });
      }

      function renderChatThread(ticket) {
        const supportData = getSupportData();
        const supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
        const messages = supportTicket && Array.isArray(supportTicket.messages) && supportTicket.messages.length
          ? supportTicket.messages
          : [
            { senderType: "agent", text: "Hello! You are connected to ServeEase support for ticket " + ticket.id + ".", time: "Just now" },
            { senderType: "agent", text: "We can help with " + ticket.subject.toLowerCase() + ". Please share any extra details here.", time: "Just now" }
          ];
        const solutionText = supportTicket && (supportTicket.solution || supportTicket.supportUpdate);
        const defaultUpdateText = "Your ticket has been received and is currently being reviewed by the support team.";
        if (solutionText && solutionText !== defaultUpdateText && !messages.some(function (message) { return message.senderType === "agent" && message.text === solutionText; })) {
          messages.push({ senderType: "agent", text: solutionText, time: supportTicket.updatedAt || "Just now" });
        }

        chatThread.innerHTML = messages.map(function (message) {
          const className = message.senderType === "customer" ? "user" : "support";
          const label = message.senderType === "admin" ? "<strong>Admin reply:</strong> " : "";
          return `<div class="chat-bubble ${className}">${label}${message.text}</div>`;
        }).join("");
        chatThread.scrollTop = chatThread.scrollHeight;
      }

      list.addEventListener("click", function (e) {
        const viewButton = e.target.closest("[data-view-ticket]");
        const chatButton = e.target.closest("[data-chat-ticket]");

        if (viewButton && ticketModalBackdrop && ticketModalContent) {
          const ticket = data.tickets.find(function (item) { return item.id === viewButton.dataset.viewTicket; });
          if (!ticket) return;
          ticketModalContent.innerHTML = `
            <div class="info-grid">
              <div class="info-box">
                <strong>Ticket Information</strong>
                <div class="info-row"><span>Ticket ID:</span><span>${ticket.id}</span></div>
                <div class="info-row"><span>Status:</span><span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span></div>
                <div class="info-row"><span>Created On:</span><span>${formatDisplayDate(ticket.date)}</span></div>
              </div>
              <div class="info-box">
                <strong>Issue Summary</strong>
                <div class="info-row"><span>Booking Ref:</span><span>${ticket.bookingRef}</span></div>
                <div class="info-row"><span>Category:</span><span>${ticket.category}</span></div>
                <div class="info-row"><span>Subject:</span><span>${ticket.subject}</span></div>
              </div>
              <div class="info-box">
                <strong>Support Update</strong>
                <div>${ticket.supportUpdate || ticket.solution || "Your ticket has been received and is currently being reviewed by the support team."}</div>
              </div>
            </div>`;
          ticketModalBackdrop.classList.remove("hidden");
        }

        if (chatButton && chatModalBackdrop && chatThread) {
          const ticket = data.tickets.find(function (item) { return item.id === chatButton.dataset.chatTicket; });
          if (!ticket) return;
          activeChatTicketId = ticket.id;
          renderChatThread(ticket);
          chatModalBackdrop.classList.remove("hidden");
        }
      });
    }

    function deriveTicketPriority(category) {
      const normalized = String(category || "").trim().toLowerCase();
      if (normalized === "payment issue") return "Critical";
      if (normalized === "booking issue") return "Medium";
      if (normalized === "technical issue") return "High";
      if (normalized === "service ticket") return "High";
      return "Medium";
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";
      success.textContent = "";

      const bookingRef = normalizeBookingRef(document.getElementById("ticketBookingRef").value);
      const category = document.getElementById("ticketCategory").value.trim();
      const subject = document.getElementById("ticketSubject").value.trim();
      const description = document.getElementById("ticketDescription").value.trim();

      if (!bookingRef || !category || !subject || !description) {
        error.textContent = "Please fill all required fields.";
        return;
      }

      const linkedBooking = (data.bookings || []).find(function (booking) {
        return normalizeBookingRef(getBookingReference(booking)).toLowerCase() === bookingRef.toLowerCase();
      }) || draft || {};

      const finalBookingRef = linkedBooking && getBookingReference(linkedBooking)
        ? getBookingReference(linkedBooking)
        : bookingRef;

      const newTicket = {
        id: createCustomerTicketId(),
        subject: subject,
        bookingRef: finalBookingRef,
        category: category,
        priority: deriveTicketPriority(category),
        description: description,
        provider: linkedBooking.provider || "ServeEase Provider",
        providerId: linkedBooking.providerId || "",
        service: linkedBooking.service || "",
        customerName: session.fullName || "Customer",
        customerEmail: session.email || "",
        customerPhone: session.phone || "",
        date: "Just now",
        createdAtIso: new Date().toISOString(),
        status: "Open",
        solution: "",
        supportUpdate: "Your ticket has been received and is currently being reviewed by the support team."
      };

      data.tickets.unshift(newTicket);
      setCustomerData(data);
      pushCustomerTicketToSupport(newTicket);
      success.textContent = "Support ticket submitted successfully and sent to the Support Dashboard.";
      form.reset();
      renderTickets();
    });

    renderTickets();
    if (focusedTicketId) {
      if (success) success.textContent = "Ticket " + focusedTicketId + " is saved and visible in Support.";
      sessionStorage.removeItem("serveEaseSupportTicketFocus");
    }
    setupFaqAccordion();
    setupTicketInteractions();
    hydrateSupportDataFromBackend(function () {
      syncCustomerTicketsFromSupport(data);
      renderTickets();
    });
  }

  seedCustomerData();
  setupCustomerHeaderMenus();
  setupCustomerFooterLinks();
  initDashboard();
  initMyBookings();
  initPaymentHistory();
  initSupportCenter();
  initCustomerProfilePage();
})();

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
