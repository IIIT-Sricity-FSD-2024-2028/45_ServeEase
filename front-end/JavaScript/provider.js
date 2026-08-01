(function () {
  const session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");

  if (
    (document.body && (
      document.getElementById("providerWelcomeText") ||
      document.getElementById("providerServiceGrid") ||
      document.getElementById("providerBookingsList") ||
      document.getElementById("providerEarningStats") ||
      document.getElementById("providerSupportTicketForm") ||
      document.getElementById("providerPersonalInfo")
    )) &&
    (!session || session.role !== "provider")
  ) {
    window.location.href = "login.html";
    return;
  }

  function isDemoProviderAccount() {
    return session && (session.email === "provider@serveease.com" || session.userId === "PRO001");
  }

  function getActualProviderBookings(data) {
    const bookings = Array.isArray(data && data.bookings) ? data.bookings : [];
    return bookings.filter(function (booking) {
      return Boolean(booking && booking.customerEmail);
    });
  }

  function getAccountStorageSuffix() {
    return session && (session.userId || String(session.email || "provider").toLowerCase());
  }

  const providerDataKey = isDemoProviderAccount()
    ? "serveEaseProviderModuleData"
    : "serveEaseProviderModuleData:" + getAccountStorageSuffix();

  function getProviderModuleData() {
    return JSON.parse(localStorage.getItem(providerDataKey));
  }

  function setProviderModuleData(data) {
    localStorage.setItem(providerDataKey, JSON.stringify(data));
  }

  function getCustomerModuleKeyForBooking(booking) {
    const email = String(booking && (booking.customerEmail || booking.email) || "").toLowerCase();
    if (!email) return "";
    if (email === "user@serveease.com") return "serveEaseCustomerModuleData";

    try {
      const store = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
      const users = Array.isArray(store.users) ? store.users : [];
      const user = users.find(function (item) {
        return item && item.role === "customer" && item.email && item.email.toLowerCase() === email;
      });
      if (user && user.id) return "serveEaseCustomerModuleData:" + user.id;
    } catch (error) {
      return "serveEaseCustomerModuleData:" + email;
    }

    return "serveEaseCustomerModuleData:" + email;
  }

  function restoreProviderBookingsFromCustomerData(data) {
    if (!data || !data.profile || !Array.isArray(data.bookings)) return false;

    const providerIds = [data.profile.providerId, data.profile.providerCatalogId].filter(Boolean);
    const providerNames = [data.profile.fullName, data.profile.organisationName].map(normalizeName).filter(Boolean);
    let changed = false;

    Object.keys(localStorage).filter(function (key) {
      return key === "serveEaseCustomerModuleData" || key.indexOf("serveEaseCustomerModuleData:") === 0;
    }).forEach(function (key) {
      try {
        const customerData = JSON.parse(localStorage.getItem(key) || "null");
        if (!customerData || !Array.isArray(customerData.bookings)) return;

        customerData.bookings.forEach(function (booking) {
          const providerMatches =
            providerIds.indexOf(booking.providerId) !== -1 ||
            providerNames.indexOf(normalizeName(booking.provider)) !== -1;
          if (!providerMatches || !booking.customerEmail) return;

          let providerBooking = data.bookings.find(function (item) {
            return String(item.id || "") === String(booking.id || "");
          });
          if (!providerBooking) {
            providerBooking = { id: booking.id };
            data.bookings.unshift(providerBooking);
            changed = true;
          }

          // The provider's decision is authoritative once it is no longer pending.
          // Customer storage is only used to initialise a pending provider booking.
          const providerHasDecision = ["Accepted", "Rejected", "Cancelled", "Completed"].indexOf(providerBooking.status) !== -1;
          const customerPayment = Array.isArray(customerData.payments) && customerData.payments.find(function (payment) {
            return String(payment.bookingRef || "").toLowerCase() === String(booking.id || "").toLowerCase();
          });
          const nextStatus = providerHasDecision
            ? providerBooking.status
            : (booking.status || providerBooking.status || "Pending");
          const nextProgress = bookingProgressForStatus(nextStatus);
          if (
            providerBooking.customer !== booking.customerName ||
            providerBooking.customerEmail !== booking.customerEmail ||
            providerBooking.customerPhone !== booking.customerPhone ||
            providerBooking.service !== booking.service ||
            providerBooking.providerId !== booking.providerId ||
            providerBooking.date !== booking.date ||
            providerBooking.time !== booking.time ||
            providerBooking.location !== booking.address ||
            Number(providerBooking.amount) !== Number(booking.amount) ||
            providerBooking.paymentMethod !== ((customerPayment && customerPayment.method) || booking.paymentMethod || providerBooking.paymentMethod || "") ||
            providerBooking.status !== nextStatus
          ) changed = true;

          Object.assign(providerBooking, {
            customer: booking.customerName || "Customer",
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone || "",
            service: booking.service,
            providerId: booking.providerId,
            date: booking.date,
            time: booking.time,
            location: booking.address,
            amount: booking.amount,
            status: nextStatus,
            progress: nextProgress,
            paymentMethod: (customerPayment && customerPayment.method) || booking.paymentMethod || providerBooking.paymentMethod || "",
            paymentDate: booking.paymentDate || providerBooking.paymentDate || "",
            receivedDate: booking.receivedDate || providerBooking.receivedDate || ""
          });
        });
      } catch (error) {
        /* Ignore malformed customer storage. */
      }
    });

    return changed;
  }

  function bookingProgressForStatus(status) {
    if (status === "Completed") return 100;
    if (status === "Accepted") return 70;
    if (status === "Rejected" || status === "Cancelled") return 10;
    return 35;
  }

  function shouldKeepNewerLocalBookingStatus(localBooking, remoteStatus) {
    const localStatus = String(localBooking && localBooking.status || "");
    const isLocalDecision = ["Accepted", "Rejected", "Cancelled", "Completed"].indexOf(localStatus) !== -1;
    return Boolean(
      localBooking &&
      localBooking.statusUpdatedAt &&
      isLocalDecision &&
      String(remoteStatus || "Pending") === "Pending"
    );
  }

  function syncCustomerBookingStatusFromProvider(booking, nextStatus) {
    const key = getCustomerModuleKeyForBooking(booking);
    if (!key) return;

    const customerData = JSON.parse(localStorage.getItem(key) || "null");
    if (!customerData || !Array.isArray(customerData.bookings)) return;

    const customerBooking = customerData.bookings.find(function (item) {
      return String(item.id || "").toLowerCase() === String(booking.id || "").toLowerCase();
    });
    if (!customerBooking) return;

    const isCancelled = nextStatus === "Rejected" || nextStatus === "Cancelled";
    customerBooking.status = isCancelled ? "Cancelled" : nextStatus;
    customerBooking.category = isCancelled ? "Cancelled" : nextStatus;
    if (Array.isArray(customerData.payments)) {
      customerData.payments.forEach(function (payment) {
        if (String(payment.bookingRef || "").toLowerCase() === String(booking.id || "").toLowerCase()) {
          payment.status = nextStatus === "Completed"
            ? "Successful"
            : nextStatus === "Accepted"
              ? "Pending"
              : isCancelled ? "Refunded" : payment.status;
        }
      });
    }
    localStorage.setItem(key, JSON.stringify(customerData));
  }

  function getCustomerPaymentForBooking(booking) {
    const key = getCustomerModuleKeyForBooking(booking);
    if (!key) return null;

    const customerData = JSON.parse(localStorage.getItem(key) || "null");
    if (!customerData || !Array.isArray(customerData.payments)) return null;
    return customerData.payments.find(function (item) {
      return String(item.bookingRef || "").toLowerCase() === String(booking.id || "").toLowerCase();
    });
  }

  function getCustomerPaymentDateForBooking(booking) {
    const payment = getCustomerPaymentForBooking(booking);
    return payment && (payment.paymentDate || payment.date || payment.createdAt) || "";
  }

  function parseBookingDate(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    match = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function completionAvailableAt(booking) {
    const date = parseBookingDate(booking && booking.date);
    const timeMatch = String(booking && booking.time || "").match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if (!date || !timeMatch) return null;

    let hours = Number(timeMatch[1]);
    const minutes = Number(timeMatch[2]);
    const meridiem = String(timeMatch[3] || "").toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    if (hours > 23 || minutes > 59) return null;

    date.setHours(hours, minutes, 0, 0);
    return new Date(date.getTime() + (30 * 60 * 1000));
  }

  function canMarkBookingCompleted(booking) {
    const availableAt = completionAvailableAt(booking);
    return Boolean(availableAt && Date.now() >= availableAt.getTime());
  }

  function logicalPaymentDate(booking, candidate) {
    const serviceDate = parseBookingDate(booking && booking.date);
    const paymentDate = parseBookingDate(candidate);
    if (candidate && (!serviceDate || (paymentDate && paymentDate <= serviceDate))) {
      return formatDisplayDate(candidate);
    }
    if (!serviceDate) return candidate || "";
    serviceDate.setDate(serviceDate.getDate() - 1);
    return formatDisplayDate(serviceDate);
  }

  function logicalReceivedDate(booking, candidate) {
    const serviceDate = parseBookingDate(booking && booking.date);
    const receivedDate = parseBookingDate(candidate);
    if (candidate && (!serviceDate || (receivedDate && receivedDate >= serviceDate))) {
      return formatDisplayDate(candidate);
    }
    return serviceDate ? formatDisplayDate(serviceDate) : (candidate || "");
  }

  function reconcileProviderPayouts(data) {
    if (!data || !Array.isArray(data.bookings)) return false;
    if (!Array.isArray(data.transactions)) data.transactions = [];

    const payableBookings = getActualProviderBookings(data).filter(function (booking) {
      const status = String(booking.status || "").toLowerCase();
      return status === "accepted" || status === "completed";
    });
    const payableBookingIds = new Set(payableBookings.map(function (booking) {
      return String(booking.id || "").toLowerCase();
    }));

    const priorTransactionCount = data.transactions.length;
    data.transactions = data.transactions.filter(function (transaction) {
      return payableBookingIds.has(String(transaction.bookingRef || "").toLowerCase());
    });
    let changed = data.transactions.length !== priorTransactionCount;

    payableBookings.forEach(function (booking) {
      const bookingId = String(booking.id || "");
      const isCompleted = String(booking.status || "").toLowerCase() === "completed";
      const customerPayment = getCustomerPaymentForBooking(booking);
      let transaction = data.transactions.find(function (item) {
        return String(item.bookingRef || "").toLowerCase() === bookingId.toLowerCase();
      });

      if (!transaction) {
        transaction = {
          id: "PAYOUT-" + bookingId,
          bookingRef: bookingId,
          service: booking.service || "Service",
          customer: booking.customer || "Customer",
          method: (customerPayment && customerPayment.method) || booking.paymentMethod || "Payment method not recorded",
          amount: Number(booking.amount) || 0,
          serviceDate: booking.date || "",
          paymentDate: logicalPaymentDate(booking, getCustomerPaymentDateForBooking(booking) || booking.paymentDate || booking.paidAt || ""),
          receivedDate: isCompleted ? logicalReceivedDate(booking, booking.receivedDate || booking.completedAt || "") : "",
          status: "Pending"
        };
        data.transactions.unshift(transaction);
        changed = true;
      }

      const nextStatus = isCompleted ? "Paid" : "Pending";
      const storedMethod = transaction.method === "Service payout" ? "" : transaction.method;
      const nextMethod = (customerPayment && customerPayment.method) || booking.paymentMethod || storedMethod || "Payment method not recorded";
      const nextPaymentDate = logicalPaymentDate(booking, getCustomerPaymentDateForBooking(booking) || booking.paymentDate || booking.paidAt || transaction.paymentDate || "");
      const nextReceivedDate = isCompleted
        ? logicalReceivedDate(booking, booking.receivedDate || booking.completedAt || transaction.receivedDate || "")
        : "";
      if (
        transaction.service !== (booking.service || "Service") ||
        transaction.customer !== (booking.customer || "Customer") ||
        transaction.method !== nextMethod ||
        Number(transaction.amount) !== (Number(booking.amount) || 0) ||
        transaction.serviceDate !== (booking.date || "") ||
        transaction.status !== nextStatus ||
        transaction.paymentDate !== nextPaymentDate ||
        transaction.receivedDate !== nextReceivedDate
      ) {
        transaction.service = booking.service || "Service";
        transaction.customer = booking.customer || "Customer";
        transaction.method = nextMethod;
        transaction.amount = Number(booking.amount) || 0;
        transaction.serviceDate = booking.date || "";
        transaction.status = nextStatus;
        transaction.paymentDate = nextPaymentDate;
        transaction.receivedDate = nextReceivedDate;
        changed = true;
      }
    });

    return changed;
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

  function createProviderTicketId() {
    const supportData = getSupportData();
    const providerData = getProviderModuleData() || { supportTickets: [] };
    const existingCount = (supportData.tickets || []).length + (providerData.supportTickets || []).length + 1201;
    return "PT-" + new Date().getFullYear() + "-" + String(existingCount + 1).padStart(4, "0");
  }

  function providerMessageStamp() {
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

  function readProviderFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function getProviderProfilePhoto(profile) {
    if (profile && profile.profilePhoto) return profile.profilePhoto;
    const providerId = profile && profile.providerId;
    if (!providerId) return "";
    try {
      const previews = JSON.parse(localStorage.getItem("serveEaseProviderDocuments:" + providerId) || "{}");
      const photoKey = Object.keys(previews).find(function (key) {
        const item = previews[key];
        return item && item.dataUrl && String(item.type || "").indexOf("image/") === 0;
      });
      return photoKey ? previews[photoKey].dataUrl : "";
    } catch (error) {
      return "";
    }
  }

  function syncProviderTicketsFromSupport(data) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets) || !Array.isArray(data.supportTickets)) return;
    let changed = false;

    data.supportTickets.forEach(function (ticket) {
      const supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
      if (!supportTicket) return;
      ticket.status = supportTicket.status || ticket.status;
      ticket.solution = supportTicket.solution || ticket.solution || "";
      ticket.supportUpdate = supportTicket.supportUpdate || ticket.supportUpdate || "";
      ticket.messages = Array.isArray(supportTicket.messages) ? supportTicket.messages : ticket.messages;
      changed = true;
    });

    if (changed) setProviderModuleData(data);
  }

  function pushProviderTicketToSupport(ticket, data) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
    if (!Array.isArray(supportData.notifications)) supportData.notifications = [];
    while (supportData.tickets.some(function (item) { return item.id === ticket.id; })) {
      ticket.id = createProviderTicketId();
    }

    const profile = data.profile || {};
    const providerName = profile.organisationName || profile.fullName || "Provider";
    supportData.tickets.unshift({
      id: ticket.id,
      bookingReference: ticket.bookingRef || "N/A",
      raisedByType: "provider",
      raisedByLabel: "Provider",
      customerName: providerName,
      providerName: providerName,
      relatedCustomer: ticket.relatedCustomer || ticket.customer || "",
      issueCategory: ticket.category,
      subject: ticket.subject,
      description: ticket.description || ticket.subject,
      attachmentName: ticket.attachmentName || "No attachment",
      phone: profile.phone || "",
      email: profile.email || "",
      status: "Open",
      supportUpdate: ticket.supportUpdate,
      solution: ticket.solution || "",
      createdDate: ticket.created || "Just now",
      createdAtIso: new Date().toISOString(),
      providerId: profile.providerId || profile.id || profile.providerCatalogId || "",
      service: ticket.service || profile.serviceType || "",
      priority: ticket.priority || "Medium",
      assignedTo: supportData.agent && supportData.agent.fullName || "Priya Sharma",
      messages: [
        { sender: providerName, senderType: "provider", text: ticket.description || ticket.subject, time: ticket.created || "Just now" }
      ],
      history: [
        { label: "Ticket created by provider", time: ticket.created || "Just now", active: true }
      ]
    });
    supportData.notifications.unshift({ id: "NT" + Date.now(), text: "New provider support ticket created - " + ticket.id, time: todayStamp(), isNew: true, ticketId: ticket.id });
    setSupportData(supportData);
  }

  function addProviderChatMessageToSupport(ticket, data, message) {
    const supportData = getSupportData();
    if (!Array.isArray(supportData.tickets)) supportData.tickets = [];
    if (!Array.isArray(supportData.notifications)) supportData.notifications = [];

    let supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
    if (!supportTicket) {
      pushProviderTicketToSupport(ticket, data);
      supportTicket = getSupportData().tickets.find(function (item) { return item.id === ticket.id; });
    }
    if (!supportTicket) return;

    const profile = data.profile || {};
    const providerName = profile.organisationName || profile.fullName || "Provider";
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
      sender: providerName,
      senderType: "provider",
      text: message,
      time: providerMessageStamp()
    });
    supportTicket.history.push({
      label: "Provider replied in support chat",
      time: providerMessageStamp(),
      active: true
    });
    supportTicket.history.forEach(function (entry, index) {
      entry.active = index === supportTicket.history.length - 1;
    });
    supportData.notifications.unshift({
      id: "NT" + Date.now(),
      text: "Provider replied to ticket " + supportTicket.id,
      time: "Just now",
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
      .then(function (response) {
        if (response && response.value) {
          localStorage.setItem("serveEaseSupportModuleData", JSON.stringify(response.value));
        }
      })
      .catch(function () { return null; })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function normalizeName(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function slugify(value) {
    return String(value || "provider")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "provider";
  }

  function normalizeProviderText(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function isRemovedProviderRecord(record) {
    if (!record) return false;
    return [
      record.id,
      record.email,
      record.name,
      record.fullName,
      record.organisationName,
      record.providerCatalogId
    ].some(function (value) {
      return normalizeProviderText(value).indexOf("koushikpestcontrol") !== -1;
    });
  }

  function isCleanproProviderRecord(record) {
    if (!record) return false;
    return [
      record.id,
      record.email,
      record.name,
      record.fullName,
      record.organisationName,
      record.providerCatalogId,
      record.ownerProviderEmail
    ].some(function (value) {
      return normalizeProviderText(value).indexOf("cleanpro") !== -1;
    });
  }

  function getProviderCatalogName(profile) {
    return isCleanproProviderRecord(profile)
      ? "Cleanpro Services"
      : profile.organisationName || profile.fullName;
  }

  function getCategoryIdFromServiceCategory(value) {
    const normalized = String(value || "").trim().toLowerCase();
    const map = {
      "home cleaning": "home-cleaning",
      "cleaning services": "home-cleaning",
      "carpentry": "carpentry",
      "painting": "painting",
      "salon at home": "salon-at-home",
      "plumbing": "plumbing",
      "electrician": "electrician",
      "appliance repair / installation": "appliance-repair-installation",
      "appliance repair": "appliance-repair-installation",
      "pest control": "pest-control"
    };

    return map[normalized] || slugify(value);
  }

  function hasDifferentMainCategoryName(subcategory, registeredCategory) {
    const normalizedSubcategory = String(subcategory || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const currentCategory = getCategoryIdFromServiceCategory(registeredCategory).replace(/[^a-z0-9]/g, "");
    const categoryIds = [
      "home-cleaning",
      "carpentry",
      "painting",
      "salon-at-home",
      "plumbing",
      "electrician",
      "appliance-repair-installation",
      "pest-control"
    ];

    return categoryIds.some(function (categoryId) {
      const normalizedCategory = categoryId.replace(/[^a-z0-9]/g, "");
      return normalizedCategory !== currentCategory && normalizedSubcategory.indexOf(normalizedCategory) !== -1;
    });
  }

  function getBaseServeEaseCities() {
    return [
      { id: 1, name: "Chennai" },
      { id: 2, name: "Bangalore" },
      { id: 3, name: "Hyderabad" },
      { id: 4, name: "Delhi" },
      { id: 5, name: "Mumbai" }
    ];
  }

  function getCustomServeEaseCities() {
    try {
      const customCities = JSON.parse(localStorage.getItem("serveEaseCustomCities"));
      return Array.isArray(customCities) ? customCities : [];
    } catch (error) {
      return [];
    }
  }

  function saveCustomServeEaseCities(cities) {
    localStorage.setItem("serveEaseCustomCities", JSON.stringify(cities));
  }

  function getAllServeEaseCities() {
    return getBaseServeEaseCities();
  }

  function getCityById(cityId) {
    return getAllServeEaseCities().find(function (city) {
      return Number(city.id) === Number(cityId);
    }) || getBaseServeEaseCities()[0];
  }

  function extractCityNameFromLocation(location) {
    const rawLocation = String(location || "").trim();
    const loweredLocation = rawLocation.toLowerCase();
    const knownCity = getBaseServeEaseCities().find(function (city) {
      return loweredLocation.indexOf(city.name.toLowerCase()) !== -1 ||
        (city.name === "Bangalore" && loweredLocation.indexOf("bengaluru") !== -1);
    });

    if (knownCity) return knownCity.name;

    const firstPart = rawLocation.split(",")[0] || rawLocation;
    return firstPart.replace(/\d+/g, "").trim().replace(/\s+/g, " ") || "Chennai";
  }

  function getCityIdFromLocation(location) {
    const value = String(location || "").toLowerCase();
    if (value.includes("bangalore") || value.includes("bengaluru")) return 2;
    if (value.includes("hyderabad")) return 3;
    if (value.includes("delhi")) return 4;
    if (value.includes("mumbai")) return 5;

    const cityName = extractCityNameFromLocation(location);
    const allCities = getAllServeEaseCities();
    const existingCity = allCities.find(function (city) {
      return city.name.toLowerCase() === cityName.toLowerCase();
    });

    if (existingCity) return Number(existingCity.id);

    const nextId = allCities.reduce(function (max, city) {
      return Math.max(max, Number(city.id) || 0);
    }, 0) + 1;
    const customCities = getCustomServeEaseCities();
    customCities.push({ id: nextId, name: cityName });
    saveCustomServeEaseCities(customCities);
    return nextId;
  }

  function getCityNameFromLocation(location) {
    return getCityById(getCityIdFromLocation(location)).name;
  }

  function getCategoryImage(categoryId) {
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

  function getSubcategoriesForProviderCategory(categoryName) {
    const categoryId = getCategoryIdFromServiceCategory(categoryName);
    const store = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
    const categories = Array.isArray(store.categories) ? store.categories : [];
    const category = categories.find(function (item) {
      return item.id === categoryId || item.name === categoryName;
    });

    if (category && Array.isArray(category.subServices) && category.subServices.length) {
      return category.subServices;
    }

    return [categoryName || "General Service"];
  }

  function getProviderCatalogIds(data) {
    const ids = [
      data && data.profile && data.profile.providerCatalogId,
      session && session.providerCatalogId
    ];

    if (data && Array.isArray(data.services)) {
      data.services.forEach(function (service) {
        if (service.catalogProviderId) ids.push(service.catalogProviderId);
      });
    }

    return ids.filter(Boolean);
  }

  function syncProviderServicesToCatalog(data) {
    if (!data || !data.profile || !Array.isArray(data.services)) return;
    if (isRemovedProviderRecord(data.profile)) {
      localStorage.removeItem(providerDataKey);
      return;
    }

    const store = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
    if (!Array.isArray(store.providers)) store.providers = [];
    const baseProviderId = data.profile.providerCatalogId || slugify(data.profile.organisationName || data.profile.fullName);

    store.providers = store.providers.filter(function (provider) {
      if (!provider || isRemovedProviderRecord(provider)) return false;
      const providerBaseId = String(provider.id || "").replace(new RegExp("-" + provider.category + "-" + provider.cityId + "$"), "");
      return provider.ownerProviderId !== data.profile.providerId && provider.id !== baseProviderId && providerBaseId !== baseProviderId;
    });

    const groupedServices = {};

    data.services.forEach(function (service) {
      if (service.status !== "Active") return;

      const categoryId = getCategoryIdFromServiceCategory(service.category);
      const baseId = baseProviderId;
      const cityId = Number(service.cityId || data.profile.cityId || getCityIdFromLocation(service.location || data.profile.location));
      const cityName = (service.cityName || data.profile.cityName || getCityById(cityId).name);
      const groupKey = categoryId + ":" + cityId;
      const catalogProviderId = baseId + "-" + categoryId + "-" + cityId;
      const activeSlots = data.availability && Array.isArray(data.availability.slots)
        ? data.availability.slots
            .filter(function (slot) { return slot.active; })
            .map(function (slot) { return slot.from + " - " + slot.to; })
        : [];

      service.catalogProviderId = catalogProviderId;
      service.cityId = cityId;
      service.cityName = cityName;
      service.location = cityName;

      if (!groupedServices[groupKey]) {
        groupedServices[groupKey] = {
          id: catalogProviderId,
          name: getProviderCatalogName(data.profile),
          category: categoryId,
          subServices: [],
          years: Number(String(data.profile.experience || "").match(/\d+/)?.[0]) || 1,
          rating: data.profile.rating || 4.5,
          reviews: 0,
          distance: "1.0 km",
          startingPrice: Number(service.price) || 499,
          location: cityName,
          jobsDone: 0,
          availableToday: true,
          verified: true,
          cityId: cityId,
          image: getProviderProfilePhoto(data.profile) || getCategoryImage(categoryId),
          profilePhoto: getProviderProfilePhoto(data.profile),
          availabilitySlots: activeSlots,
          ownerProviderId: data.profile.providerId,
          ownerProviderEmail: data.profile.email
        };
      }

      if (groupedServices[groupKey].subServices.indexOf(service.name) === -1) {
        groupedServices[groupKey].subServices.push(service.name);
      }
      groupedServices[groupKey].startingPrice = Math.min(groupedServices[groupKey].startingPrice, Number(service.price) || 499);
    });

    Object.keys(groupedServices).forEach(function (key) {
      store.providers.unshift(groupedServices[key]);
    });

    localStorage.setItem("serveEaseData", JSON.stringify(store));
    setProviderModuleData(data);

    if (window.ServeEaseApi && typeof window.ServeEaseApi.syncCatalog === "function") {
      window.ServeEaseApi.syncCatalog(store).catch(function (error) {
        console.warn("ServeEase provider catalog sync skipped.", error);
      });
    }
  }

  function syncProviderBookingsFromBackend(done) {
    if (!window.ServeEaseApi || typeof window.ServeEaseApi.getBookings !== "function") {
      if (typeof done === "function") done();
      return;
    }

    window.ServeEaseApi.getBookings()
      .then(function (bookings) {
        if (!Array.isArray(bookings) || !bookings.length) return;

        const data = getProviderModuleData();
        if (!data || !Array.isArray(data.bookings)) return;

        const providerNames = [
          data.profile && data.profile.fullName,
          data.profile && data.profile.organisationName,
          session && session.fullName,
          session && session.organisationName
        ].map(normalizeName).filter(Boolean);

        const providerIds = [
          data.profile && data.profile.providerCatalogId,
          data.profile && data.profile.providerId,
          session && session.providerCatalogId,
          session && session.userId
        ].concat(getProviderCatalogIds(data)).filter(Boolean);

        const existingIds = new Set(data.bookings.map(function (booking) { return booking.id; }));
        let changed = false;

        bookings.forEach(function (booking) {
          const providerMatches =
            providerIds.indexOf(booking.providerId) !== -1 ||
            providerNames.indexOf(normalizeName(booking.provider)) !== -1;
          if (!providerMatches) return;

          const existingBooking = data.bookings.find(function (item) {
            return item.id === booking.id;
          });

          if (existingBooking) {
            const keepLocalStatus = shouldKeepNewerLocalBookingStatus(existingBooking, booking.status);
            const resolvedStatus = keepLocalStatus
              ? existingBooking.status
              : (booking.status || existingBooking.status || "Pending");
            existingBooking.customer = booking.customerName || existingBooking.customer || "Customer";
            existingBooking.customerEmail = booking.customerEmail || existingBooking.customerEmail || "";
            existingBooking.customerPhone = booking.customerPhone || existingBooking.customerPhone || "";
            existingBooking.service = booking.service;
            existingBooking.providerId = booking.providerId || existingBooking.providerId;
            existingBooking.date = booking.date;
            existingBooking.time = booking.time;
            existingBooking.location = booking.address;
            existingBooking.amount = booking.amount;
            existingBooking.paymentMethod = booking.paymentMethod || existingBooking.paymentMethod || "";
            existingBooking.status = resolvedStatus;
            existingBooking.paymentDate = booking.paymentDate || booking.paidAt || existingBooking.paymentDate || "";
            existingBooking.receivedDate = booking.receivedDate || booking.completedAt || existingBooking.receivedDate || "";
            existingBooking.progress = bookingProgressForStatus(resolvedStatus);
            changed = true;
            return;
          }

          if (existingIds.has(booking.id)) return;

          data.bookings.unshift({
            id: booking.id,
            customer: booking.customerName || "Customer",
            customerEmail: booking.customerEmail || "",
            customerPhone: booking.customerPhone || "",
            service: booking.service,
            providerId: booking.providerId,
            date: booking.date,
            time: booking.time,
            location: booking.address,
            amount: booking.amount,
            paymentMethod: booking.paymentMethod || "",
            status: booking.status || "Pending",
            paymentDate: booking.paymentDate || booking.paidAt || "",
            receivedDate: booking.receivedDate || booking.completedAt || "",
            progress: bookingProgressForStatus(booking.status || "Pending")
          });
          existingIds.add(booking.id);
          changed = true;
        });

        if (reconcileProviderPayouts(data)) changed = true;
        if (changed) setProviderModuleData(data);
      })
      .catch(function (error) {
        console.warn("ServeEase backend provider booking sync skipped.", error);
      })
      .finally(function () {
        if (typeof done === "function") done();
      });
  }

  function getLoggedInProviderUser() {
    const store = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
    const users = Array.isArray(store.users) ? store.users : [];

    return users.find(function (user) {
      if (!user || user.role !== "provider") return false;
      if (session && session.userId && user.id === session.userId) return true;
      return session && session.email && user.email && user.email.toLowerCase() === session.email.toLowerCase();
    }) || null;
  }

  function buildProviderProfile(existingProfile) {
    const providerUser = getLoggedInProviderUser();
    const profile = existingProfile || {};
    let providerName = (providerUser && providerUser.fullName) || (session && session.fullName) || profile.fullName || "Provider";
    let organisationName = (providerUser && providerUser.organisationName) || (session && session.organisationName) || profile.organisationName || "ServeEase Partner";

    if (providerName.toLowerCase().includes("cleanpro")) {
      providerName = "Ramesh Kumar";
      organisationName = "Cleanpro Services";
    }

    const providerEmail = (providerUser && providerUser.email) || (session && session.email) || profile.email || "provider@serveease.com";
    const rawPhone = (providerUser && providerUser.phone) || (session && session.phone) || profile.phone || "9876501234";
    const digitsOnly = String(rawPhone).replace(/\D/g, "");
    const formattedPhone = String(rawPhone).startsWith("+91") ? String(rawPhone) : `+91 ${digitsOnly || "9876501234"}`;
    const category = (providerUser && providerUser.serviceType) || (session && session.serviceType) || profile.category || "Home Cleaning";
    const subCategory = (providerUser && providerUser.serviceSubcategory) || (session && session.serviceSubcategory) || profile.subCategory || profile.subcategory || category;
    const experience = (providerUser && providerUser.experience) ? `${providerUser.experience} Years` : profile.experience || "5 Years";
    const cityId = Number((providerUser && providerUser.cityId) || (session && session.cityId) || profile.cityId || getCityIdFromLocation(profile.location || "Chennai"));
    const cityName = (providerUser && providerUser.cityName) || (session && session.cityName) || profile.cityName || getCityById(cityId).name;
    const location = cityName;
    const providerId = (providerUser && providerUser.id) || (session && session.userId) || profile.providerId || "PRO001";
    const providerCatalogId = (providerUser && providerUser.providerCatalogId) || (session && session.providerCatalogId) || profile.providerCatalogId || "";
    const profilePhoto = profile.profilePhoto || getProviderProfilePhoto({ providerId: providerId });
    const accountCreated = (providerUser && (providerUser.registrationDate || providerUser.createdAt || providerUser.submittedDate)) || profile.accountCreated || "Not available";

    return {
      providerId: providerId,
      providerCatalogId: providerCatalogId,
      profilePhoto: profilePhoto,
      fullName: providerName,
      email: providerEmail,
      phone: formattedPhone,
      organisationName: organisationName,
      category: category,
      subCategory: subCategory,
      experience: experience,
      cityId: cityId,
      cityName: cityName,
      location: location,
      accountStatus: profile.accountStatus || "Active",
      totalServices: isDemoProviderAccount() ? (profile.totalServices || 5) : (profile.totalServices || 1),
      totalBookings: isDemoProviderAccount() ? (profile.totalBookings || 120) : (profile.totalBookings || 0),
      rating: profile.rating || 4.8,
      accountCreated: accountCreated,
      bankName: profile.bankName || "HDFC Bank",
      accountHolder: providerName,
      accountNumber: profile.accountNumber || "XXXXXX1129",
      ifsc: profile.ifsc || "HDFC0001234"
    };
  }

  function syncProviderSession(profile) {
    if (!session) return;
    sessionStorage.setItem("serveEaseSession", JSON.stringify({
      ...session,
      fullName: profile.fullName,
      email: profile.email,
      phone: profile.phone,
      serviceSubcategory: profile.subCategory || session.serviceSubcategory || "",
      cityId: profile.cityId || session.cityId || "",
      cityName: profile.cityName || session.cityName || "",
      location: profile.location || session.location || "",
      providerCatalogId: profile.providerCatalogId || session.providerCatalogId || ""
    }));
  }

  function buildInitialServiceFromProfile(profile) {
    return {
      id: "SVC001",
      name: profile.subCategory || profile.category || "General Service",
      category: profile.category || "General Service",
      description: (profile.subCategory || profile.category || "Service") + " offered by " + (profile.organisationName || profile.fullName),
      price: 499,
      duration: "2 hours",
      cityId: profile.cityId || getCityIdFromLocation(profile.location || "Chennai"),
      cityName: profile.cityName || getCityNameFromLocation(profile.location || "Chennai"),
      location: profile.cityName || profile.location || "Chennai",
      status: "Active"
    };
  }

  function seedProviderData() {
    const existing = localStorage.getItem(providerDataKey);
    if (existing) {
      // Force an update of the profile to ensure the name/org overrides apply immediately
      const data = JSON.parse(existing);
      const nextProfile = buildProviderProfile(data.profile);
      if (data.ownerProviderId && data.ownerProviderId !== nextProfile.providerId) {
        localStorage.removeItem(providerDataKey);
      } else {
        data.ownerProviderId = nextProfile.providerId;
        data.profile = nextProfile;
        if (isDemoProviderAccount()) {
          const demoServiceNames = [
            { name: "Kitchen Cleaning", price: 799, duration: "2 hours", description: "Professional kitchen deep cleaning service" },
            { name: "Bathroom Cleaning", price: 599, duration: "1.5 hours", description: "Complete bathroom cleaning and sanitization" },
            { name: "Floor Cleaning Service", price: 699, duration: "2 hours", description: "Home floor and tile deep cleaning" }
          ];
          if (!Array.isArray(data.services)) data.services = [];
          demoServiceNames.forEach(function (demoService, index) {
            let service = data.services.find(function (item) { return item.name === demoService.name; });
            if (!service) {
              service = { id: "SVC" + String(index + 1).padStart(3, "0"), category: "Cleaning Services" };
              data.services.push(service);
            }
            service.name = demoService.name;
            service.category = "Cleaning Services";
            service.description = demoService.description;
            service.price = demoService.price;
            service.duration = demoService.duration;
            service.cityId = nextProfile.cityId;
            service.cityName = nextProfile.cityName;
            service.location = nextProfile.cityName;
            service.status = "Active";
          });
        }
        setProviderModuleData(data);
        syncProviderServicesToCatalog(data);
        return;
      }
    }

    const profile = buildProviderProfile();
    const demoServices = [
      {
        id: "SVC001",
        name: "Kitchen Cleaning",
        category: "Cleaning Services",
        description: "Professional kitchen deep cleaning service",
        price: 799,
        duration: "2 hours",
        cityId: profile.cityId,
        cityName: profile.cityName,
        location: profile.cityName,
        status: "Active"
      },
      {
        id: "SVC002",
        name: "Bathroom Cleaning",
        category: "Cleaning Services",
        description: "Complete bathroom cleaning and sanitization",
        price: 599,
        duration: "1.5 hours",
        cityId: profile.cityId,
        cityName: profile.cityName,
        location: profile.cityName,
        status: "Active"
      },
      {
        id: "SVC003",
        name: "Floor Cleaning Service",
        category: "Cleaning Services",
        description: "Home floor and tile deep cleaning",
        price: 699,
        duration: "2 hours",
        cityId: profile.cityId,
        cityName: profile.cityName,
        location: profile.cityName,
        status: "Active"
      }
    ];

    const data = {
      ownerProviderId: profile.providerId,
      profile: profile,
      services: isDemoProviderAccount() ? demoServices : [buildInitialServiceFromProfile(profile)],
      availability: {
        days: [
          { label: "Monday", active: true },
          { label: "Tuesday", active: true },
          { label: "Wednesday", active: true },
          { label: "Thursday", active: true },
          { label: "Friday", active: true },
          { label: "Saturday", active: false },
          { label: "Sunday", active: false }
        ],
        slots: [
          { id: "SLOT001", day: "Monday", from: "9:00 AM", to: "12:00 PM", active: true },
          { id: "SLOT002", day: "Monday", from: "1:00 PM", to: "4:00 PM", active: true },
          { id: "SLOT003", day: "Wednesday", from: "10:00 AM", to: "1:00 PM", active: false },
          { id: "SLOT004", day: "Friday", from: "2:00 PM", to: "6:00 PM", active: true }
        ]
      },
      bookings: [],
      transactions: isDemoProviderAccount() ? [
        {
          id: "TX-2026-7854",
          bookingRef: "BOOK-2026-1120",
          service: "Kitchen Cleaning",
          customer: "Rahul Sharma",
          method: "UPI",
          amount: 799,
          serviceDate: "15 Mar 2026",
          paymentDate: "16 Mar 2026",
          status: "Paid"
        },
        {
          id: "TX-2026-7855",
          bookingRef: "BOOK-2026-1121",
          service: "Bathroom Cleaning",
          customer: "Anita Rao",
          method: "Card",
          amount: 599,
          serviceDate: "14 Mar 2026",
          paymentDate: "15 Mar 2026",
          status: "Paid"
        },
        {
          id: "TX-2026-7856",
          bookingRef: "BOOK-2026-1122",
          service: "Floor Cleaning Service",
          customer: "Suresh Patel",
          method: "UPI",
          amount: 699,
          serviceDate: "13 Mar 2026",
          paymentDate: "14 Mar 2026",
          status: "Pending"
        }
      ] : [],
      supportTickets: isDemoProviderAccount() ? [
        {
          id: "PT-1001",
          subject: "Payment not received",
          category: "Payment Issue",
          status: "In Progress",
          created: "2 days ago",
          createdOn: "9 Mar 2026",
          bookingRef: "BOOK-2026-1045",
          supportUpdate: "Your payout request has been received and is currently being reviewed by the support team."
        }
      ] : []
    };

    localStorage.setItem(providerDataKey, JSON.stringify(data));
    syncProviderServicesToCatalog(data);
  }

  function statusClass(status) {
    const value = String(status).toLowerCase();
    if (value === "active" || value === "accepted" || value === "completed" || value === "paid") return "status-accepted";
    if (value === "pending" || value === "in progress") return "status-pending";
    if (value === "inactive" || value === "rejected" || value === "failed") return "status-cancelled";
    return "status-pending";
  }

  function normalizeBackendProviderTicket(ticket) {
    ticket = ticket || {};
    return {
      id: ticket.ticketId || ticket.id,
      subject: ticket.subject || ticket.ticketType || "Provider support request",
      category: ticket.ticketType || ticket.category || "Other",
      description: ticket.description || "",
      provider: ticket.providerName || ticket.raisedByName || "Provider",
      providerId: ticket.providerId || ticket.raisedById || "",
      relatedCustomer: ticket.customerName || ticket.relatedCustomer || "",
      service: ticket.service || "",
      priority: ticket.priority || "Medium",
      status: ticket.status || "Pending",
      created: ticket.createdAt ? formatDisplayDate(ticket.createdAt) : (ticket.created || "Just now"),
      createdAtIso: ticket.createdAt || ticket.createdAtIso || new Date().toISOString(),
      createdOn: ticket.createdAt ? formatDisplayDate(ticket.createdAt) : (ticket.createdOn || "Just now"),
      bookingRef: ticket.relatedBookingId || ticket.bookingRef || "",
      attachmentName: ticket.attachmentUrl || ticket.attachmentName || "No attachment",
      solution: ticket.finalDecision || ticket.solution || "",
      supportUpdate: ticket.supportRemarks || ticket.adminRemarks || ticket.supportUpdate || "Your ticket has been received and is currently being reviewed by the support team.",
      adminRemarks: ticket.adminRemarks || "",
      finalDecision: ticket.finalDecision || ""
    };
  }

  function formatCurrency(amount) {
    return `₹${amount}`;
  }


  function setupProviderSearch(inputSelector, renderCallback) {
    const input = document.querySelector(inputSelector || ".dashboard-search input");
    if (!input || typeof renderCallback !== "function") return function () {};
    input.addEventListener("input", renderCallback);
    return function () {
      return (input.value || "").trim().toLowerCase();
    };
  }

  function ensureProviderProfileMatchesSession() {
    const data = getProviderModuleData();
    syncProviderTicketsFromSupport(data);
    if (!data) return;

    data.profile = buildProviderProfile(data.profile);
    restoreProviderBookingsFromCustomerData(data);
    reconcileProviderPayouts(data);
    setProviderModuleData(data);
    syncProviderSession(data.profile);
  }

  function setupProviderHeader() {
    const profileBtn = document.getElementById("providerProfileBtn");
    const profileDropdown = document.getElementById("providerProfileDropdown");
    const logoutBtn = document.getElementById("providerLogoutBtn");

    if (profileBtn && profileDropdown) {
      profileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        profileDropdown.classList.toggle("hidden");
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        sessionStorage.removeItem("serveEaseSession");
        window.location.href = "index.html";
      });
    }

    document.addEventListener("click", function () {
      if (profileDropdown) profileDropdown.classList.add("hidden");
    });
  }

  function getProviderDashboardNotifications(data) {
    const bookings = getActualProviderBookings(data);
    const transactions = Array.isArray(data.transactions) ? data.transactions : [];
    const tickets = Array.isArray(data.supportTickets) ? data.supportTickets : [];

    const pendingBookings = bookings.filter(function (booking) {
      return String(booking.status || "").toLowerCase() === "pending";
    }).map(function (booking) {
      return {
        title: "Booking " + booking.id + " needs your response",
        detail: (booking.customer || "Customer") + " • " + (booking.service || "Service")
      };
    });

    const pendingPayouts = transactions.filter(function (transaction) {
      return String(transaction.status || "").toLowerCase() === "pending";
    }).map(function (transaction) {
      return {
        title: "Payout pending for " + (transaction.bookingRef || transaction.id),
        detail: formatCurrency(Number(transaction.amount) || 0) + " • " + (transaction.service || "Service")
      };
    });

    const activeTickets = tickets.filter(function (ticket) {
      const status = String(ticket.status || "").toLowerCase();
      return status && status !== "resolved" && status !== "closed";
    }).map(function (ticket) {
      return {
        title: "Support ticket " + ticket.id + " is " + ticket.status,
        detail: ticket.subject || ticket.category || "Support update"
      };
    });

    return pendingBookings.concat(pendingPayouts, activeTickets).slice(0, 4);
  }

  function isInCurrentMonth(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }

  function initProviderDashboard() {
    const welcome = document.getElementById("providerWelcomeText");
    if (!welcome) return;

    const data = getProviderModuleData();
    welcome.textContent = `Welcome, ${data.profile.fullName}!`;
    document.getElementById("providerHeroId").textContent = data.profile.providerId;

    const statsGrid = document.getElementById("providerStatsGrid");
    const totalServices = Array.isArray(data.services) ? data.services.length : 0;
    const bookings = getActualProviderBookings(data);
    const completedBookings = bookings.filter(function (booking) {
      return String(booking.status || "").toLowerCase() === "completed";
    }).length;
    const paidTransactions = (Array.isArray(data.transactions) ? data.transactions : []).filter(function (transaction) {
      return String(transaction.status || "").toLowerCase() === "paid";
    });
    const totalEarnings = paidTransactions.reduce(function (sum, transaction) {
      return sum + (Number(transaction.amount) || 0);
    }, 0);
    const earningsThisMonth = paidTransactions.filter(function (transaction) {
      return isInCurrentMonth(transaction.paymentDate || transaction.serviceDate);
    }).reduce(function (sum, transaction) {
      return sum + (Number(transaction.amount) || 0);
    }, 0);
    const pendingPayout = (Array.isArray(data.transactions) ? data.transactions : []).filter(function (transaction) {
      return String(transaction.status || "").toLowerCase() === "pending";
    }).reduce(function (sum, transaction) {
      return sum + (Number(transaction.amount) || 0);
    }, 0);
    statsGrid.innerHTML = `
      <div class="stat-card-dashboard"><div class="feature-icon orange">🧰</div><h3>${totalServices}</h3><p>Total Services</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon blue">📋</div><h3>${bookings.length}</h3><p>Total Bookings</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon green">✅</div><h3>${completedBookings}</h3><p>Completed Bookings</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon purple">💰</div><h3>${formatCurrency(totalEarnings)}</h3><p>Total Earnings</p></div>
    `;

    const earningsPreview = document.getElementById("providerEarningsPreview");
    const totalEarningsMini = document.getElementById("providerTotalEarningsMini");
    const pendingPayoutMini = document.getElementById("providerPendingPayoutMini");
    if (earningsPreview) earningsPreview.textContent = formatCurrency(earningsThisMonth);
    if (totalEarningsMini) totalEarningsMini.textContent = formatCurrency(totalEarnings);
    if (pendingPayoutMini) pendingPayoutMini.textContent = formatCurrency(pendingPayout);

    const perf = document.getElementById("providerPerformanceList");
    perf.innerHTML = bookings.slice(0, 4).map(function (booking) {
      return `
        <div class="preview-item">
          <div class="preview-title">${booking.service}</div>
          <div class="preview-meta">${booking.customer} • ${formatDisplayDate(booking.date)} • ${booking.status}</div>
        </div>
      `;
    }).join("") || '<div class="preview-item"><div class="preview-meta">No bookings yet.</div></div>';

    const note = document.getElementById("providerNotificationPreview");
    const notifications = getProviderDashboardNotifications(data);
    note.innerHTML = notifications.map(function (notification) {
      return `
        <div class="preview-item">
          <div class="preview-title">${notification.title}</div>
          <div class="preview-meta">${notification.detail}</div>
        </div>
      `;
    }).join("") || '<div class="preview-item"><div class="preview-meta">No new notifications.</div></div>';
  }

  function openProviderServiceModal(mode, service) {
    const backdrop = document.getElementById("providerServiceModalBackdrop");
    const title = document.getElementById("providerServiceModalTitle");
    const editId = document.getElementById("providerServiceEditId");
    const name = document.getElementById("providerServiceName");
    const category = document.getElementById("providerServiceCategory");
    const description = document.getElementById("providerServiceDescription");
    const price = document.getElementById("providerServicePrice");
    const duration = document.getElementById("providerServiceDuration");
    const location = document.getElementById("providerServiceLocation");
    const error = document.getElementById("providerServiceError");

    if (!backdrop) return;

    const providerProfile = getProviderModuleData().profile || {};
    const subcategoryOptions = getSubcategoriesForProviderCategory(providerProfile.category);
    const currentName = service && service.name ? service.name : "";
    const options = currentName && subcategoryOptions.indexOf(currentName) === -1
      ? subcategoryOptions.concat([currentName])
      : subcategoryOptions;
    name.innerHTML = '<option value="">Select service sub category</option>' + options.map(function (subcategory) {
      return '<option value="' + subcategory + '">' + subcategory + '</option>';
    }).join("");

    if (location && location.tagName === "SELECT") {
      location.innerHTML = '<option value="">Select service city</option>' + getAllServeEaseCities().map(function (city) {
        return '<option value="' + city.name + '">' + city.name + '</option>';
      }).join("");
    }

    error.textContent = "";
    title.textContent = mode === "edit" ? "Edit Service" : "Add New Service";

    if (service) {
      editId.value = service.id;
      name.value = service.name;
      category.value = (getProviderModuleData().profile || {}).category || service.category;
      description.value = service.description;
      price.value = service.price;
      duration.value = service.duration;
      location.value = service.cityName || getCityNameFromLocation(service.location || providerProfile.location);
    } else {
      editId.value = "";
      name.value = "";
      category.value = (getProviderModuleData().profile || {}).category || "";
      description.value = "";
      price.value = "";
      duration.value = "";
      location.value = providerProfile.cityName || providerProfile.location || "";
    }

    backdrop.classList.remove("hidden");
  }

  function initProviderAvailabilityManagement(panel, data) {
    const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const profile = data.profile || {};
    const providerId = profile.providerCatalogId || profile.providerId || (session && session.providerCatalogId) || (session && session.userId);
    let weekly = {};
    let overrides = [];
    let availability = { dates: [] };
    let visibleMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let selectedDate = '';
    let overrideDraft = null;
    let scheduleMessage = '';
    let scheduleError = '';

    function isoDate(value) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    function dateForIso(value) {
      const parts = String(value).split('-').map(Number);
      return new Date(parts[0], parts[1] - 1, parts[2]);
    }

    function formatSlot(slot) {
      return String(slot || '').replace(/\b(\d{2}):(\d{2})\b/g, function (match, hour, minute) {
        const number = Number(hour);
        return `${String(number % 12 || 12).padStart(2, '0')}:${minute} ${number >= 12 ? 'PM' : 'AM'}`;
      }).replace('-', ' – ');
    }

    function toSlot(start, end) {
      return start && end ? `${start}-${end}` : '';
    }

    function slotParts(slot) {
      const parts = String(slot || '').split('-');
      return { start: parts[0] || '', end: parts[1] || '' };
    }

    function weekKey(day) { return day.toLowerCase(); }

    function activeSlots(day) {
      return (weekly[weekKey(day)] || []).filter(function (slot) { return slot.active; }).map(function (slot) { return slot.value; });
    }

    function validateDay(day) {
      const slots = activeSlots(day).slice().sort();
      for (let index = 0; index < slots.length; index += 1) {
        const parts = slotParts(slots[index]);
        if (!/^\d{2}:\d{2}$/.test(parts.start) || !/^\d{2}:\d{2}$/.test(parts.end) || parts.start >= parts.end) {
          return 'Enter a valid start and end time.';
        }
        if (index && slotParts(slots[index - 1]).end > parts.start) return 'Slots on the same day cannot overlap.';
      }
      return '';
    }

    function validateSchedule() {
      return weekdays.map(validateDay).find(Boolean) || '';
    }

    function buildWeeklyPayload() {
      return weekdays.reduce(function (payload, day) {
        payload[weekKey(day)] = activeSlots(day);
        return payload;
      }, {});
    }

    function overrideFor(date) {
      return overrides.find(function (override) { return override.date === date; });
    }

    function availableSlotsFor(date) {
      const item = (availability.dates || []).find(function (entry) { return entry.date === date; });
      return item && Array.isArray(item.slots) ? item.slots : null;
    }

    function renderLoading() {
      panel.innerHTML = `
        <div class="provider-availability-skeleton" role="status" aria-label="Loading availability settings">
          <span></span><span></span><span></span><span></span><span></span><span></span><span></span>
        </div>`;
    }

    function renderError(message) {
      panel.innerHTML = `
        <div class="provider-availability-feedback provider-availability-error" role="alert">
          <span aria-hidden="true">⚠</span><h3>We couldn't load your availability</h3><p>${message || 'Please try again.'}</p>
          <button class="secondary-btn" type="button" id="retryProviderAvailabilityBtn">Retry</button>
        </div>`;
      panel.querySelector('#retryProviderAvailabilityBtn').addEventListener('click', load);
    }

    function renderCalendar() {
      const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
      const monthEnd = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0);
      const leadingDays = (monthStart.getDay() + 6) % 7;
      const today = isoDate(new Date());
      const days = Array.from({ length: leadingDays + monthEnd.getDate() }, function (_, index) {
        if (index < leadingDays) return '<span class="availability-calendar-blank" aria-hidden="true"></span>';
        const date = new Date(monthStart.getFullYear(), monthStart.getMonth(), index - leadingDays + 1);
        const dateValue = isoDate(date);
        const past = dateValue < today;
        const hasOverride = Boolean(overrideFor(dateValue));
        return `<button type="button" class="availability-calendar-day${dateValue === selectedDate ? ' is-selected' : ''}${hasOverride ? ' has-override' : ''}" data-override-date="${dateValue}" ${past ? 'disabled' : ''} aria-label="Manage availability for ${date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}">${date.getDate()}</button>`;
      }).join('');

      return `
        <section class="provider-override-section" aria-labelledby="providerOverridesHeading">
          <div class="provider-availability-section-head"><div><h3 id="providerOverridesHeading">Date-specific overrides</h3><p>Set one-off time changes without affecting your weekly schedule.</p></div></div>
          <div class="availability-calendar-toolbar"><button type="button" class="calendar-nav-btn" data-calendar-nav="previous" aria-label="Previous month">←</button><strong>${visibleMonth.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong><button type="button" class="calendar-nav-btn" data-calendar-nav="next" aria-label="Next month">→</button></div>
          <div class="availability-calendar-weekdays"><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span></div>
          <div class="availability-calendar-grid">${days}</div>
        </section>`;
    }

    function renderOverridePanel() {
      if (!selectedDate) return '';
      const selected = dateForIso(selectedDate);
      const day = weekdays[(selected.getDay() + 6) % 7];
      const override = overrideDraft || overrideFor(selectedDate) || { fullDayOff: false, disabledSlots: [] };
      const slots = activeSlots(day);
      const available = availableSlotsFor(selectedDate);
      const lockedSlots = available === null ? [] : slots.filter(function (slot) {
        return !available.includes(slot) && !override.disabledSlots.includes(slot) && !override.fullDayOff;
      });
      const isPast = selectedDate < isoDate(new Date());
      return `
        <aside class="availability-override-drawer" aria-labelledby="overrideDrawerTitle">
          <div class="availability-drawer-head"><div><span>Selected date</span><h3 id="overrideDrawerTitle">${selected.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}</h3></div><button type="button" class="availability-close-btn" data-close-override aria-label="Close date override">×</button></div>
          <label class="availability-full-day-toggle"><input type="checkbox" id="overrideFullDayOff" ${override.fullDayOff ? 'checked' : ''} ${isPast ? 'disabled' : ''}> <span>Full day off</span></label>
          ${override.fullDayOff ? '<p class="availability-drawer-note">All time slots are unavailable for this date.</p>' : `
            <div class="availability-override-slots">
              ${slots.length ? slots.map(function (slot) {
                const locked = lockedSlots.includes(slot);
                const disabled = override.disabledSlots.includes(slot);
                return `<label class="availability-override-slot${locked ? ' is-locked' : ''}" title="${locked ? 'This slot already has a booking.' : ''}"><input type="checkbox" data-override-slot="${slot}" ${disabled ? '' : 'checked'} ${locked || isPast ? 'disabled' : ''}><span>${formatSlot(slot)}</span>${locked ? '<em>🔒 Booked</em>' : ''}</label>`;
              }).join('') : '<p class="availability-drawer-note">This weekday has no active recurring slots.</p>'}
            </div>`}
          <small class="error availability-override-error" aria-live="polite"></small>
          <div class="availability-drawer-actions"><button class="btn btn-primary" type="button" id="saveDateOverrideBtn" ${isPast ? 'disabled' : ''}>Save</button><button class="secondary-btn" type="button" data-close-override>Cancel</button></div>
        </aside>`;
    }

    function render() {
      const validation = validateSchedule();
      const weeklyCards = weekdays.map(function (day) {
        const key = weekKey(day);
        const slots = weekly[key] || [];
        const dayOff = !slots.some(function (slot) { return slot.active; });
        return `
          <article class="provider-weekday-card">
            <div class="provider-weekday-head"><h4>${day}</h4><label class="availability-day-toggle"><input type="checkbox" data-day-enabled="${day}" ${dayOff ? '' : 'checked'}><span>${dayOff ? 'Unavailable' : 'Available'}</span></label></div>
            <div class="provider-weekly-slots">${dayOff ? '<p>Unavailable</p>' : slots.map(function (slot, index) {
              const parts = slotParts(slot.value);
              return `<div class="provider-weekly-slot${slot.active ? '' : ' is-disabled'}"><input type="checkbox" data-weekly-active="${day}|${index}" ${slot.active ? 'checked' : ''} aria-label="Enable ${formatSlot(slot.value)} on ${day}"><input type="time" value="${parts.start}" data-weekly-start="${day}|${index}" aria-label="Start time"><span>–</span><input type="time" value="${parts.end}" data-weekly-end="${day}|${index}" aria-label="End time"><button type="button" data-remove-weekly-slot="${day}|${index}" aria-label="Delete time slot">×</button></div>`;
            }).join('')}</div>
            <button class="availability-add-slot" type="button" data-add-weekly-slot="${day}" ${dayOff ? 'disabled' : ''}>+ Add slot</button>
            <small class="error" data-day-error="${day}">${validateDay(day)}</small>
          </article>`;
      }).join('');

      panel.innerHTML = `
        <div class="provider-availability-manager">
          <section class="provider-weekly-section" aria-labelledby="weeklyScheduleHeading">
            <div class="provider-availability-section-head"><div><h3 id="weeklyScheduleHeading">Weekly schedule</h3><p>Set the recurring hours customers can book.</p></div><button class="btn btn-primary availability-save-weekly" type="button" id="saveWeeklyScheduleBtn" ${validation ? 'disabled' : ''}>Save Changes</button></div>
            <small class="availability-save-message ${scheduleError ? 'error' : ''}" aria-live="polite">${scheduleError || scheduleMessage}</small>
            <div class="provider-weekday-grid">${weeklyCards}</div>
          </section>
          ${renderCalendar()}
          ${renderOverridePanel()}
        </div>`;
      bindEvents();
    }

    function bindEvents() {
      panel.querySelectorAll('[data-day-enabled]').forEach(function (input) {
        input.addEventListener('change', function () {
          const day = input.dataset.dayEnabled;
          const slots = weekly[weekKey(day)] || [];
          if (input.checked && !slots.length) weekly[weekKey(day)] = [{ value: '', active: true }];
          slots.forEach(function (slot) { slot.active = input.checked; });
          scheduleError = ''; render();
        });
      });
      panel.querySelectorAll('[data-weekly-active], [data-weekly-start], [data-weekly-end]').forEach(function (input) {
        input.addEventListener('change', function () {
          const [day, index] = (input.dataset.weeklyActive || input.dataset.weeklyStart || input.dataset.weeklyEnd).split('|');
          const slot = weekly[weekKey(day)][Number(index)];
          if (input.dataset.weeklyActive !== undefined) slot.active = input.checked;
          else { const parts = slotParts(slot.value); slot.value = toSlot(input.dataset.weeklyStart !== undefined ? input.value : parts.start, input.dataset.weeklyEnd !== undefined ? input.value : parts.end); }
          scheduleError = ''; render();
        });
      });
      panel.querySelectorAll('[data-add-weekly-slot], [data-remove-weekly-slot]').forEach(function (button) {
        button.addEventListener('click', function () {
          if (button.dataset.addWeeklySlot) weekly[weekKey(button.dataset.addWeeklySlot)].push({ value: '', active: true });
          else { const [day, index] = button.dataset.removeWeeklySlot.split('|'); weekly[weekKey(day)].splice(Number(index), 1); }
          scheduleError = ''; render();
        });
      });
      panel.querySelector('#saveWeeklyScheduleBtn').addEventListener('click', saveWeekly);
      panel.querySelectorAll('[data-calendar-nav]').forEach(function (button) { button.addEventListener('click', function () { visibleMonth.setMonth(visibleMonth.getMonth() + (button.dataset.calendarNav === 'next' ? 1 : -1)); render(); }); });
      panel.querySelectorAll('[data-override-date]').forEach(function (button) { button.addEventListener('click', function () { const existing = overrideFor(button.dataset.overrideDate); selectedDate = button.dataset.overrideDate; overrideDraft = existing ? { fullDayOff: existing.fullDayOff, disabledSlots: (existing.disabledSlots || []).slice(), enabledSlots: (existing.enabledSlots || []).slice() } : { fullDayOff: false, disabledSlots: [], enabledSlots: [] }; render(); }); });
      panel.querySelectorAll('[data-close-override]').forEach(function (button) { button.addEventListener('click', function () { selectedDate = ''; overrideDraft = null; render(); }); });
      const fullDay = panel.querySelector('#overrideFullDayOff');
      if (fullDay) fullDay.addEventListener('change', saveOverrideDraft);
      panel.querySelectorAll('[data-override-slot]').forEach(function (input) { input.addEventListener('change', saveOverrideDraft); });
      const saveOverrideBtn = panel.querySelector('#saveDateOverrideBtn');
      if (saveOverrideBtn) saveOverrideBtn.addEventListener('click', saveOverride);
    }

    function saveOverrideDraft() {
      if (!overrideDraft) return;
      overrideDraft.fullDayOff = panel.querySelector('#overrideFullDayOff').checked;
      overrideDraft.disabledSlots = Array.from(panel.querySelectorAll('[data-override-slot]')).filter(function (input) {
        return !input.checked && !input.disabled;
      }).map(function (input) { return input.dataset.overrideSlot; });
      render();
    }

    async function saveWeekly() {
      scheduleMessage = 'Saving...'; scheduleError = ''; render();
      try {
        const saved = await window.ServeEaseApi.saveProviderWeeklySchedule(providerId, buildWeeklyPayload());
        weekly = normaliseWeekly(saved.weeklySchedule); scheduleMessage = 'Availability updated successfully.'; await refreshAvailability(); render();
      } catch (error) { scheduleError = error.message || 'Unable to save weekly schedule.'; render(); }
    }

    async function saveOverride() {
      const errorBox = panel.querySelector('.availability-override-error');
      const saveButton = panel.querySelector('#saveDateOverrideBtn');
      const fullDayOff = overrideDraft && overrideDraft.fullDayOff;
      const disabledSlots = overrideDraft ? overrideDraft.disabledSlots : [];
      if (saveButton) { saveButton.disabled = true; saveButton.textContent = 'Saving...'; }
      try {
        if (!fullDayOff && !disabledSlots.length) { if (overrideFor(selectedDate)) await window.ServeEaseApi.deleteProviderDateOverride(providerId, selectedDate); }
        else await window.ServeEaseApi.saveProviderDateOverride(providerId, selectedDate, { fullDayOff: fullDayOff, disabledSlots: disabledSlots, enabledSlots: [] });
        overrides = await window.ServeEaseApi.getProviderDateOverrides(providerId); await refreshAvailability(); selectedDate = ''; overrideDraft = null; scheduleMessage = 'Availability updated successfully.'; render();
      } catch (error) {
        if (saveButton) { saveButton.disabled = false; saveButton.textContent = 'Save'; }
        if (errorBox) errorBox.textContent = error.message || 'Unable to save this date override.';
      }
    }

    function normaliseWeekly(source) {
      return weekdays.reduce(function (result, day) { result[weekKey(day)] = (source[weekKey(day)] || []).map(function (value) { return { value: value, active: true }; }); return result; }, {});
    }

    async function refreshAvailability() { availability = await window.ServeEaseApi.getProviderAvailability(providerId); }

    async function load() {
      if (!providerId || !window.ServeEaseApi) { renderError('Your provider profile could not be identified.'); return; }
      renderLoading();
      try {
        await refreshAvailability();
        const results = await Promise.all([window.ServeEaseApi.getProviderWeeklySchedule(providerId), window.ServeEaseApi.getProviderDateOverrides(providerId)]);
        weekly = normaliseWeekly(results[0].weeklySchedule); overrides = results[1] || []; render();
      } catch (error) { renderError(error.message || 'Please try again.'); }
    }

    load();
  }

  function initProviderServicesPage() {
    const grid = document.getElementById("providerServiceGrid");
    if (!grid) return;

    const data = getProviderModuleData();

    const getSearchTerm = setupProviderSearch(".dashboard-search input", function () {
      renderServices();
      renderAvailability();
    });

    function renderServices() {
      const searchTerm = getSearchTerm();
      const visibleServices = data.services.filter(function (service) {
        const searchableText = [service.id, service.name, service.category, service.description, service.location, service.status].join(" ").toLowerCase();
        return !searchTerm || searchableText.indexOf(searchTerm) !== -1;
      });

      if (!visibleServices.length) {
        grid.innerHTML = `<div class="superuser-empty-state">No services found for the current search.</div>`;
        return;
      }

      grid.innerHTML = visibleServices.map(function (service) {
        return `
          <div class="provider-service-card">
            <div class="provider-service-top">
              <div>
                <div class="provider-service-title">${service.name}</div>
                <div class="provider-service-subtitle">${service.category}</div>
              </div>
              <span class="provider-service-status ${service.status.toLowerCase()}">${service.status}</span>
            </div>

            <div class="provider-service-desc">${service.description}</div>
            <div class="provider-service-meta">${formatCurrency(service.price)} &nbsp; • &nbsp; Duration: ${service.duration}</div>
            <div class="provider-service-meta">📍 ${service.location}</div>

            <div class="provider-service-actions">
              <button class="secondary-action" type="button" data-edit-service="${service.id}">Edit Service</button>
              <button class="secondary-action" type="button" data-toggle-service="${service.id}">
                ${service.status === "Active" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        `;
      }).join("");

      attachServiceActions();
    }

    function attachServiceActions() {
      document.querySelectorAll("[data-edit-service]").forEach(function (button) {
        button.addEventListener("click", function () {
          const service = data.services.find(function (item) {
            return item.id === button.dataset.editService;
          });
          openProviderServiceModal("edit", service);
        });
      });

      document.querySelectorAll("[data-toggle-service]").forEach(function (button) {
        button.addEventListener("click", function () {
          const service = data.services.find(function (item) {
            return item.id === button.dataset.toggleService;
          });
          if (!service) return;
          service.status = service.status === "Active" ? "Inactive" : "Active";
          setProviderModuleData(data);
          syncProviderServicesToCatalog(data);
          renderServices();
        });
      });
    }

    const availabilityPanel = document.getElementById("providerAvailabilityPanel");

    function renderAvailability() {
      initProviderAvailabilityManagement(availabilityPanel, data);
    }

    renderServices();
    renderAvailability();
    attachServiceActions();

    const addBtn = document.getElementById("openAddServiceModalBtn");
    const backdrop = document.getElementById("providerServiceModalBackdrop");
    const closeBtn = document.getElementById("closeProviderServiceModalBtn");
    const cancelBtn = document.getElementById("cancelProviderServiceModalBtn");
    const form = document.getElementById("providerServiceForm");
    const error = document.getElementById("providerServiceError");

    addBtn.addEventListener("click", function () {
      openProviderServiceModal("add", null);
    });

    function closeModal() {
      backdrop.classList.add("hidden");
    }

    closeBtn.addEventListener("click", closeModal);
    cancelBtn.addEventListener("click", closeModal);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";

      const id = document.getElementById("providerServiceEditId").value.trim();
      const name = document.getElementById("providerServiceName").value.trim();
      const category = data.profile.category;
      const description = document.getElementById("providerServiceDescription").value.trim();
      const price = document.getElementById("providerServicePrice").value.trim();
      const duration = document.getElementById("providerServiceDuration").value.trim();
      const location = document.getElementById("providerServiceLocation").value.trim();
      const cityId = getCityIdFromLocation(location);
      const cityName = getCityById(cityId).name;

      if (!name || !category || !description || !price || !duration || !location) {
        error.textContent = "Please fill all service fields.";
        return;
      }

      if (Number(price) <= 0) {
        error.textContent = "Price must be greater than zero.";
        return;
      }

      const allowedSubcategories = getSubcategoriesForProviderCategory(category);
      if (allowedSubcategories.indexOf(name) === -1) {
        error.textContent = "Choose a valid sub category for your registered main category.";
        return;
      }

      if (hasDifferentMainCategoryName(name, category)) {
        error.textContent = "Sub category must belong to your registered main category.";
        return;
      }

      if (id) {
        const service = data.services.find(function (item) {
          return item.id === id;
        });
        if (service) {
          service.name = name;
          service.category = category;
          service.description = description;
          service.price = Number(price);
          service.duration = duration;
          service.cityId = cityId;
          service.cityName = cityName;
          service.location = cityName;
          service.status = service.status || "Active";
        }
      } else {
        data.services.unshift({
          id: `SVC${String(data.services.length + 1).padStart(3, "0")}`,
          name: name,
          category: category,
          description: description,
          price: Number(price),
          duration: duration,
          cityId: cityId,
          cityName: cityName,
          location: cityName,
          status: "Active"
        });
      }

      setProviderModuleData(data);
      syncProviderServicesToCatalog(data);
      renderServices();
      closeModal();
    });
  }

  function initProviderBookingsPage() {
    const list = document.getElementById("providerBookingsList");
    if (!list) return;

    const data = getProviderModuleData();
    const bookings = getActualProviderBookings(data);
    const tabs = document.getElementById("providerBookingTabs");
    const bookingModalBackdrop = document.getElementById("providerBookingModalBackdrop");
    const bookingModalContent = document.getElementById("providerBookingModalContent");
    const closeBookingModalBtn = document.getElementById("closeProviderBookingModalBtn");
    const getSearchTerm = setupProviderSearch(".dashboard-search input", renderBookings);
    const labels = ["All", "Pending", "Accepted", "Completed", "Rejected", "Cancelled"];
    let active = "All";

    function renderTabs() {
      tabs.innerHTML = labels.map(function (label) {
        const count = label === "All"
          ? bookings.length
          : bookings.filter(function (item) { return item.status === label; }).length;
        return `<button class="tab-btn ${active === label ? "active" : ""}" data-provider-tab="${label}">${label} <span>${count}</span></button>`;
      }).join("");

      tabs.querySelectorAll("[data-provider-tab]").forEach(function (button) {
        button.addEventListener("click", function () {
          active = button.dataset.providerTab;
          renderTabs();
          renderBookings();
        });
      });
    }

    function renderBookings() {
      const searchTerm = getSearchTerm();
      const filtered = bookings.filter(function (booking) {
        const statusMatch = active === "All" || booking.status === active;
        const searchMatch = !searchTerm || [booking.id, booking.customer, booking.service, booking.date, booking.time, booking.location, booking.status].join(" ").toLowerCase().indexOf(searchTerm) !== -1;
        return statusMatch && searchMatch;
      });

      list.innerHTML = filtered.map(function (booking) {
        const canComplete = canMarkBookingCompleted(booking);
        const completionTitle = canComplete
          ? "Mark this completed"
          : "Available 30 minutes after the scheduled service start time.";
        return `
          <div class="provider-booking-card">
            <div class="provider-booking-top">
              <div>
                <div class="provider-booking-title">${booking.service}</div>
                <div class="provider-booking-submeta">${booking.customer} • ${booking.id}</div>
              </div>
              <span class="status-pill ${statusClass(booking.status)}">${booking.status}</span>
            </div>

            <div class="provider-booking-line">📅 ${formatDisplayDate(booking.date)} &nbsp; • &nbsp; 🕒 ${booking.time}</div>
            <div class="provider-booking-line">📍 ${booking.location}</div>
            <div class="provider-booking-line">Amount: <strong>${formatCurrency(booking.amount)}</strong></div>

            <div class="provider-booking-progress"><span style="width:${booking.progress}%"></span></div>

            <div class="provider-booking-actions">
              ${booking.status === "Pending" ? `<button class="btn btn-primary" type="button" data-accept-booking="${booking.id}">Accept</button>` : ""}
              ${booking.status === "Pending" ? `<button class="danger-action" type="button" data-reject-booking="${booking.id}">Reject</button>` : ""}
              ${booking.status === "Accepted" ? `<button class="secondary-action" type="button" data-complete-booking="${booking.id}" title="${completionTitle}" ${canComplete ? "" : "disabled"}>Mark Completed</button>` : ""}
              <button class="secondary-action" type="button" data-view-booking="${booking.id}">View Details</button>
            </div>
          </div>
        `;
      }).join("");

      attachBookingActions();
    }

    function attachBookingActions() {
      document.querySelectorAll("[data-accept-booking]").forEach(function (button) {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(function (item) {
            return item.id === button.dataset.acceptBooking;
          });
          if (!booking) return;
          booking.status = "Accepted";
          booking.progress = bookingProgressForStatus(booking.status);
          booking.statusUpdatedAt = new Date().toISOString();
          syncCustomerBookingStatusFromProvider(booking, "Accepted");
          reconcileProviderPayouts(data);
          if (window.ServeEaseApi && typeof window.ServeEaseApi.updateBooking === "function" && /^[0-9a-f-]{36}$/i.test(booking.id)) {
            window.ServeEaseApi.updateBooking(booking.id, { status: "Accepted" }).catch(function (error) {
              console.warn("ServeEase backend accept booking sync failed.", error);
            });
          }
          setProviderModuleData(data);
          renderTabs();
          renderBookings();
        });
      });

      document.querySelectorAll("[data-reject-booking]").forEach(function (button) {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(function (item) {
            return item.id === button.dataset.rejectBooking;
          });
          if (!booking) return;
          booking.status = "Cancelled";
          booking.progress = bookingProgressForStatus(booking.status);
          booking.statusUpdatedAt = new Date().toISOString();
          syncCustomerBookingStatusFromProvider(booking, "Cancelled");
          reconcileProviderPayouts(data);
          if (window.ServeEaseApi && typeof window.ServeEaseApi.updateBooking === "function" && /^[0-9a-f-]{36}$/i.test(booking.id)) {
            window.ServeEaseApi.updateBooking(booking.id, { status: "Cancelled" }).catch(function (error) {
              console.warn("ServeEase backend reject booking sync failed.", error);
            });
          }
          setProviderModuleData(data);
          renderTabs();
          renderBookings();
        });
      });

      document.querySelectorAll("[data-view-booking]").forEach(function (button) {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(function (item) {
            return item.id === button.dataset.viewBooking;
          });
          if (!booking || !bookingModalBackdrop || !bookingModalContent) return;
          bookingModalContent.innerHTML = `
            <div class="info-grid">
              <div class="info-box"><strong>Booking Information</strong><div class="info-row"><span>Booking ID:</span><span>${booking.id}</span></div><div class="info-row"><span>Status:</span><span class="status-pill ${statusClass(booking.status)}">${booking.status}</span></div><div class="info-row"><span>Progress:</span><span>${booking.progress}%</span></div></div>
              <div class="info-box"><strong>Customer Information</strong><div class="info-row"><span>Name:</span><span>${booking.customer}</span></div><div class="info-row"><span>Location:</span><span>${booking.location}</span></div></div>
              <div class="info-box"><strong>Service Information</strong><div class="info-row"><span>Service:</span><span>${booking.service}</span></div><div class="info-row"><span>Date:</span><span>${formatDisplayDate(booking.date)}</span></div><div class="info-row"><span>Time:</span><span>${booking.time}</span></div><div class="info-row"><span>Amount:</span><span>${formatCurrency(booking.amount)}</span></div></div>
            </div>`;
          bookingModalBackdrop.classList.remove("hidden");
        });
      });

      document.querySelectorAll("[data-complete-booking]").forEach(function (button) {
        button.addEventListener("click", function () {
          const booking = data.bookings.find(function (item) {
            return item.id === button.dataset.completeBooking;
          });
          if (!booking) return;
          if (!canMarkBookingCompleted(booking)) return;
          booking.status = "Completed";
          booking.progress = bookingProgressForStatus(booking.status);
          booking.statusUpdatedAt = new Date().toISOString();
          booking.receivedDate = formatDisplayDate(new Date());
          syncCustomerBookingStatusFromProvider(booking, "Completed");
          reconcileProviderPayouts(data);
          if (window.ServeEaseApi && typeof window.ServeEaseApi.updateBooking === "function" && /^[0-9a-f-]{36}$/i.test(booking.id)) {
            window.ServeEaseApi.updateBooking(booking.id, { status: "Completed", receivedDate: booking.receivedDate }).catch(function (error) {
              console.warn("ServeEase backend complete booking sync failed.", error);
            });
          }
          setProviderModuleData(data);
          renderTabs();
          renderBookings();
        });
      });
    }

    if (closeBookingModalBtn && bookingModalBackdrop) {
      closeBookingModalBtn.addEventListener("click", function () { bookingModalBackdrop.classList.add("hidden"); });
      bookingModalBackdrop.addEventListener("click", function (e) { if (e.target === bookingModalBackdrop) bookingModalBackdrop.classList.add("hidden"); });
    }

    renderTabs();
    renderBookings();
  }

  function initProviderEarningsPage() {
    const stats = document.getElementById("providerEarningStats");
    if (!stats) return;

    const data = getProviderModuleData();
    const paid = data.transactions.filter(function (item) { return item.status === "Paid"; });
    const pending = data.transactions.filter(function (item) { return item.status === "Pending"; });
    const totalEarning = paid.reduce(function (sum, item) { return sum + item.amount; }, 0);
    const pendingAmount = pending.reduce(function (sum, item) { return sum + item.amount; }, 0);

    stats.innerHTML = `
      <div class="stat-card-dashboard"><div class="feature-icon blue">💰</div><h3>${formatCurrency(totalEarning)}</h3><p>Total Earnings</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon green">✅</div><h3>${formatCurrency(pendingAmount)}</h3><p>Pending Payouts</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon orange">📊</div><h3>${pending.length}</h3><p>Pending Payout Requests</p></div>
    `;

    const tbody = document.getElementById("providerTransactionsTableBody");
    tbody.innerHTML = data.transactions.map(function (transaction) {
      return `
        <tr>
          <td>${transaction.id}</td>
          <td>${transaction.bookingRef}</td>
          <td>${transaction.service}</td>
          <td>${transaction.customer}</td>
          <td>${transaction.method}</td>
          <td>${formatCurrency(transaction.amount)}</td>
          <td>${formatDisplayDate(transaction.serviceDate)}</td>
          <td>${formatDisplayDate(transaction.paymentDate) || "—"}</td>
          <td>${formatDisplayDate(transaction.receivedDate) || "—"}</td>
          <td><span class="status-pill ${statusClass(transaction.status)}">${transaction.status}</span></td>
        </tr>
      `;
    }).join("");
  }

  function initProviderSupportPage() {
    const form = document.getElementById("providerSupportTicketForm");
    if (!form) return;

    const data = getProviderModuleData();
    const list = document.getElementById("providerSupportTicketsList");
    const error = document.getElementById("providerTicketError");
    const success = document.getElementById("providerTicketSuccess");
    const bookingSelect = document.getElementById("providerTicketBookingRef");
    const customerInput = document.getElementById("providerTicketCustomer");
    const serviceInput = document.getElementById("providerTicketService");
    const faqContainer = document.getElementById("providerCommonIssuesList");
    const ticketModalBackdrop = document.getElementById("providerTicketModalBackdrop");
    const ticketModalContent = document.getElementById("providerTicketModalContent");
    const closeTicketModalBtn = document.getElementById("closeProviderTicketModalBtn");
    const chatModalBackdrop = document.getElementById("providerChatModalBackdrop");
    const closeChatModalBtn = document.getElementById("closeProviderChatModalBtn");
    const chatThread = document.getElementById("providerChatThread");
    const chatForm = document.getElementById("providerChatForm");
    const chatInput = document.getElementById("providerChatInput");
    let activeProviderChatTicketId = "";
    const providerFaqs = [
      { q: "How do I update my service pricing?", a: "Open Manage Services, click Edit Service, update the price, and save the changes. The updated amount is shown instantly in your service card." },
      { q: "How do I manage booking requests?", a: "Go to Booking Management to accept, reject, or complete requests. You can also open View Details to see the full booking information." },
      { q: "Where can I view my payout details?", a: "Open Earnings & Payments to review transaction history, pending payouts, and processed payment details." },
      { q: "How do I contact customer support?", a: "Create a support ticket from this page or use Chat with Support inside My Support Tickets for quick follow-up." }
    ];
    const getSearchTerm = setupProviderSearch(".dashboard-search input", function () { renderTickets(); renderFaqs(); });

    function selectedBooking() {
      if (!bookingSelect || !bookingSelect.value) return null;
      return (data.bookings || []).find(function (booking) {
        return String(booking.id || "") === bookingSelect.value;
      }) || null;
    }

    function populateTicketBookingContext() {
      if (!bookingSelect) return;
      const bookings = Array.isArray(data.bookings) ? data.bookings : [];
      bookingSelect.innerHTML = '<option value="">General provider support</option>' + bookings.map(function (booking) {
        return '<option value="' + booking.id + '">' + booking.id + ' - ' + booking.customer + ' - ' + booking.service + '</option>';
      }).join("");
      if (serviceInput) serviceInput.value = data.profile && data.profile.serviceType || "";
    }

    function updateTicketContextFields() {
      const booking = selectedBooking();
      if (customerInput) customerInput.value = booking ? booking.customer || "" : "";
      if (serviceInput) serviceInput.value = booking ? booking.service || "" : (data.profile && data.profile.serviceType || "");
    }

    populateTicketBookingContext();
    if (bookingSelect) bookingSelect.addEventListener("change", updateTicketContextFields);
    updateTicketContextFields();

    function renderProviderChatThread(ticket) {
      if (!chatThread) return;
      const supportData = getSupportData();
      const supportTicket = supportData.tickets.find(function (item) { return item.id === ticket.id; });
      const messages = supportTicket && Array.isArray(supportTicket.messages) && supportTicket.messages.length
        ? supportTicket.messages
        : [
          { senderType: "agent", text: "Hello! Welcome to Provider Support. We can help you with your ticket " + ticket.id + ".", time: "Just now" },
          { senderType: "agent", text: "Please share any extra details about the issue, and our team will continue the support process.", time: "Just now" }
        ];
      const solutionText = supportTicket && (supportTicket.solution || supportTicket.supportUpdate);
      const defaultUpdateText = "Your ticket has been received and is currently being reviewed by the support team.";
      if (solutionText && solutionText !== defaultUpdateText && !messages.some(function (message) { return message.senderType === "agent" && message.text === solutionText; })) {
        messages.push({ senderType: "agent", text: solutionText, time: supportTicket.updatedAt || "Just now" });
      }

      chatThread.innerHTML = `
        <div class="provider-chat-ticket-summary">
          <strong>${ticket.subject}</strong>
          <span>${ticket.id} • ${ticket.category}</span>
        </div>
        ${messages.map(function (message) {
          const className = message.senderType === "provider" ? "user" : "support";
          const label = message.senderType === "admin" ? "<strong>Admin reply:</strong> " : "";
          return `<div class="provider-chat-bubble ${className}">${label}${message.text}</div>`;
        }).join("")}
      `;
      chatThread.scrollTop = chatThread.scrollHeight;
    }

    function renderFaqs() {
      if (!faqContainer) return;
      const searchTerm = getSearchTerm();
      const visibleFaqs = providerFaqs.filter(function (item) {
        return !searchTerm || [item.q, item.a].join(" ").toLowerCase().indexOf(searchTerm) !== -1;
      });
      faqContainer.innerHTML = visibleFaqs.map(function (item) {
        return `
          <div class="provider-faq-item-wrap">
            <button class="provider-faq-item" type="button">
              <span>${item.q}</span>
              <span class="provider-faq-toggle">+</span>
            </button>
            <div class="provider-faq-answer hidden">${item.a}</div>
          </div>`;
      }).join("") || `<div class="superuser-empty-state">No common issues matched your search.</div>`;

      faqContainer.querySelectorAll(".provider-faq-item").forEach(function (button) {
        button.addEventListener("click", function () {
          const answer = button.nextElementSibling;
          const toggle = button.querySelector(".provider-faq-toggle");
          const shouldOpen = answer && answer.classList.contains("hidden");
          faqContainer.querySelectorAll(".provider-faq-answer").forEach(function (item) { item.classList.add("hidden"); });
          faqContainer.querySelectorAll(".provider-faq-toggle").forEach(function (item) { item.textContent = "+"; });
          if (answer && shouldOpen) {
            answer.classList.remove("hidden");
            if (toggle) toggle.textContent = "−";
          }
        });
      });
    }

    function renderTickets() {
      const searchTerm = getSearchTerm();
      const visibleTickets = data.supportTickets.filter(function (ticket) {
        return !searchTerm || [ticket.id, ticket.subject, ticket.category, ticket.status, ticket.created, ticket.bookingRef, ticket.relatedCustomer, ticket.service, ticket.priority].join(" ").toLowerCase().indexOf(searchTerm) !== -1;
      });
      list.innerHTML = visibleTickets.map(function (ticket) {
        return `
          <div class="ticket-card">
            <div class="ticket-top">
              <h3>${ticket.subject}</h3>
              <span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span>
            </div>
            <div class="ticket-meta">Ticket ID: <strong>${ticket.id}</strong></div>
            <div class="ticket-meta">${ticket.category} - ${ticket.priority || "Medium"} - ${formatDisplayDate(ticket.created)}</div>
            <div class="ticket-meta">Booking: ${ticket.bookingRef || "General"}${ticket.relatedCustomer ? " - Customer: " + ticket.relatedCustomer : ""}</div>
            <div class="ticket-actions">
              <button class="secondary-action provider-ticket-view-btn" type="button" data-provider-ticket="${ticket.id}">View Details</button>
              <button class="btn btn-primary provider-ticket-chat-btn" type="button" data-provider-ticket="${ticket.id}">Chat with Support</button>
            </div>
          </div>
        `;
      }).join("");

      document.querySelectorAll(".provider-ticket-view-btn").forEach(function (button) {
        button.addEventListener("click", function () {
          const ticket = data.supportTickets.find(function (item) {
            return item.id === button.dataset.providerTicket;
          });
          if (!ticket || !ticketModalBackdrop || !ticketModalContent) return;

          ticketModalContent.innerHTML = `
            <div class="provider-ticket-details-grid">
              <div class="provider-ticket-detail-box">
                <strong>Ticket Information</strong>
                <div class="provider-ticket-detail-row">
                  <span>Ticket ID:</span>
                  <span>${ticket.id}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Status:</span>
                  <span><span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span></span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Created On:</span>
                  <span>${formatDisplayDate(ticket.createdOn || ticket.created) || "—"}</span>
                </div>
              </div>

              <div class="provider-ticket-detail-box">
                <strong>Issue Summary</strong>
                <div class="provider-ticket-detail-row">
                  <span>Booking Ref:</span>
                  <span>${ticket.bookingRef || "General provider support"}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Related Customer:</span>
                  <span>${ticket.relatedCustomer || "N/A"}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Service:</span>
                  <span>${ticket.service || "N/A"}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Priority:</span>
                  <span>${ticket.priority || "Medium"}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Category:</span>
                  <span>${ticket.category}</span>
                </div>
                <div class="provider-ticket-detail-row">
                  <span>Subject:</span>
                  <span>${ticket.subject}</span>
                </div>
              </div>

              <div class="provider-ticket-detail-box">
                <strong>Support Update</strong>
                <p>${ticket.supportUpdate || "Your ticket has been received and is currently being reviewed by the support team."}</p>
              </div>
            </div>
          `;

          ticketModalBackdrop.classList.remove("hidden");
        });
      });

      document.querySelectorAll(".provider-ticket-chat-btn").forEach(function (button) {
        button.addEventListener("click", function () {
          const ticket = data.supportTickets.find(function (item) {
            return item.id === button.dataset.providerTicket;
          });
          if (!ticket || !chatModalBackdrop || !chatThread) return;

          activeProviderChatTicketId = ticket.id;
          renderProviderChatThread(ticket);
          if (chatInput) {
            chatInput.value = "";
            chatInput.focus();
          }
          chatModalBackdrop.classList.remove("hidden");
        });
      });
    }

    if (closeTicketModalBtn && ticketModalBackdrop) {
      closeTicketModalBtn.addEventListener("click", function () { ticketModalBackdrop.classList.add("hidden"); });
      ticketModalBackdrop.addEventListener("click", function (e) { if (e.target === ticketModalBackdrop) ticketModalBackdrop.classList.add("hidden"); });
    }

    if (closeChatModalBtn && chatModalBackdrop) {
      closeChatModalBtn.addEventListener("click", function () { chatModalBackdrop.classList.add("hidden"); });
      chatModalBackdrop.addEventListener("click", function (e) { if (e.target === chatModalBackdrop) chatModalBackdrop.classList.add("hidden"); });
    }

    if (chatForm && chatInput && chatThread) {
      chatForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const message = chatInput.value.replace(/[<>]/g, "").trim();
        if (!message) return;
        const ticket = data.supportTickets.find(function (item) { return item.id === activeProviderChatTicketId; });
        if (!ticket) return;
        addProviderChatMessageToSupport(ticket, data, message);
        chatInput.value = "";
        renderProviderChatThread(ticket);
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";
      success.textContent = "";

      const category = document.getElementById("providerTicketCategory").value.trim();
      const booking = selectedBooking();
      const bookingRef = booking ? booking.id : "";
      const relatedCustomer = booking ? booking.customer || "" : "";
      const service = booking ? booking.service || "" : (data.profile && data.profile.serviceType || "");
      const priority = document.getElementById("providerTicketPriority").value.trim() || "Medium";
      const attachment = document.getElementById("providerTicketAttachment") && document.getElementById("providerTicketAttachment").files[0];
      const subject = document.getElementById("providerTicketSubject").value.trim();
      const description = document.getElementById("providerTicketDescription").value.trim();

      if (!category || !subject || !description) {
        error.textContent = "Please fill all support ticket fields.";
        return;
      }

      const localTicket = {
        id: createProviderTicketId(),
        subject: subject,
        category: category,
        description: description,
        provider: data.profile && (data.profile.organisationName || data.profile.fullName) || "Provider",
        providerId: data.profile && (data.profile.id || data.profile.providerCatalogId) || "",
        relatedCustomer: relatedCustomer,
        service: service,
        priority: priority,
        status: "Open",
        created: "Just now",
        createdAtIso: new Date().toISOString(),
        createdOn: "Just now",
        bookingRef: bookingRef,
        attachmentName: attachment ? attachment.name : "No attachment",
        solution: "",
        supportUpdate: "Your ticket has been received and is currently being reviewed by the support team."
      };

      function finish(savedTicket) {
        const ticket = savedTicket ? normalizeBackendProviderTicket(savedTicket) : localTicket;
        data.supportTickets.unshift(ticket);
        pushProviderTicketToSupport(ticket, data);
        setProviderModuleData(data);
        success.textContent = "Support ticket submitted successfully.";
        form.reset();
        updateTicketContextFields();
        renderTickets();
        renderFaqs();
      }

      if (window.ServeEaseApi && typeof window.ServeEaseApi.createProviderTicket === "function") {
        window.ServeEaseApi.createProviderTicket({
          ticketType: category,
          subject: subject,
          description: description,
          relatedBookingId: bookingRef,
          priority: priority,
          attachmentUrl: attachment ? attachment.name : "",
          providerId: localTicket.providerId,
          providerName: localTicket.provider,
          customerName: relatedCustomer,
          service: service
        }).then(finish).catch(function (apiError) {
          error.textContent = apiError && apiError.message ? apiError.message : "Unable to create ticket. Please run the backend and try again.";
        });
      } else {
        error.textContent = "Backend API is not available. Please run the backend and try again.";
      }
    });

    renderTickets();
    renderFaqs();
    hydrateSupportDataFromBackend(function () {
      syncProviderTicketsFromSupport(data);
      renderTickets();
    });
    if (window.ServeEaseApi && typeof window.ServeEaseApi.getMyProviderTickets === "function") {
      window.ServeEaseApi.getMyProviderTickets().then(function (tickets) {
        if (!Array.isArray(tickets)) return;
        tickets.forEach(function (ticket) {
          const normalized = normalizeBackendProviderTicket(ticket);
          if (!normalized.id) return;
          const existing = data.supportTickets.find(function (item) { return item.id === normalized.id; });
          if (existing) Object.assign(existing, normalized);
          else data.supportTickets.unshift(normalized);
        });
        setProviderModuleData(data);
        renderTickets();
      }).catch(function () {
        if (error) error.textContent = "Unable to load provider tickets from backend.";
      });
    }
  }

  function initProviderAccountPage() {
    const personal = document.getElementById("providerPersonalInfo");
    if (!personal) return;

    const data = getProviderModuleData();
    const totalServices = Array.isArray(data.services) ? data.services.length : 0;
    const totalBookings = getActualProviderBookings(data).length;
    if (data.profile.totalServices !== totalServices || data.profile.totalBookings !== totalBookings) {
      data.profile.totalServices = totalServices;
      data.profile.totalBookings = totalBookings;
      setProviderModuleData(data);
    }
    const profilePhoto = getProviderProfilePhoto(data.profile);

    var orgNameHtml = data.profile.organisationName
      ? `<div class="info-box"><strong>Organisation Name</strong><input type="text" class="provider-edit-input" id="providerOrgNameInput" value="${data.profile.organisationName}" /></div>`
      : '';
    personal.innerHTML = `
      <div class="provider-profile-photo-box">
        <img src="${profilePhoto || getCategoryImage(getCategoryIdFromServiceCategory(data.profile.category))}" alt="${data.profile.organisationName || data.profile.fullName}" id="providerProfilePhotoPreview" />
        <div>
          <strong>Profile Photo</strong>
          <input type="file" class="provider-edit-input" id="providerProfilePhotoInput" accept="image/*" />
        </div>
      </div>
      <div class="info-box"><strong>Name</strong><input type="text" class="provider-edit-input" id="providerFullNameInput" value="${data.profile.fullName}" /></div>
      ${orgNameHtml}
      <div class="info-box"><strong>Email</strong><input type="email" class="provider-edit-input" id="providerEmailInput" value="${data.profile.email}" /></div>
      <div class="info-box"><strong>Phone</strong><input type="text" class="provider-edit-input" id="providerPhoneInput" value="${data.profile.phone}" /></div>
      <div class="info-box"><strong>Location</strong><input type="text" class="provider-edit-input" id="providerLocationInput" value="${data.profile.location}" /></div>
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 8px;">
        <button type="button" class="btn btn-primary" id="saveProviderProfileBtn">Save Profile</button>
      </div>
    `;

    document.getElementById("providerAccountStats").innerHTML = `
      <div class="info-box"><strong>Account Status</strong><div>${data.profile.accountStatus}</div></div>
      <div class="info-box"><strong>Total Services</strong><div>${totalServices}</div></div>
      <div class="info-box"><strong>Total Bookings</strong><div>${totalBookings}</div></div>
      <div class="info-box"><strong>Rating</strong><div>${data.profile.rating}</div></div>
    `;

    document.getElementById("providerProfessionalInfo").innerHTML = `
      <div class="info-box"><strong>Service Category</strong><input type="text" class="provider-edit-input" id="providerCategoryInput" value="${data.profile.category}" /></div>
      <div class="info-box"><strong>Experience</strong><input type="text" class="provider-edit-input" id="providerExperienceInput" value="${data.profile.experience}" /></div>
      <div class="info-box"><strong>Provider ID</strong><div>${data.profile.providerId}</div></div>
      <div class="info-box"><strong>Account Created</strong><div>${data.profile.accountCreated}</div></div>
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 8px;">
        <button type="button" class="btn btn-primary" id="saveProviderProfessionalBtn">Save Professional Details</button>
      </div>
    `;

    document.getElementById("providerBankInfo").innerHTML = `
      <div class="info-box"><strong>Bank Name</strong><input type="text" class="provider-edit-input" id="bankNameInput" value="${data.profile.bankName}" /></div>
      <div class="info-box"><strong>Account Holder</strong><input type="text" class="provider-edit-input" id="accountHolderInput" value="${data.profile.accountHolder}" /></div>
      <div class="info-box"><strong>Account Number</strong><input type="text" class="provider-edit-input" id="accountNumberInput" value="${data.profile.accountNumber}" /></div>
      <div class="info-box"><strong>IFSC Code</strong><input type="text" class="provider-edit-input" id="ifscInput" value="${data.profile.ifsc}" /></div>
      <div style="grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 8px;">
        <button type="button" class="btn btn-primary" id="saveBankInfoBtn">Save Details</button>
      </div>
    `;

    document.getElementById("saveBankInfoBtn").addEventListener("click", function() {
      const updatedData = getProviderModuleData();
      updatedData.profile.bankName = document.getElementById("bankNameInput").value;
      updatedData.profile.accountHolder = document.getElementById("accountHolderInput").value;
      updatedData.profile.accountNumber = document.getElementById("accountNumberInput").value;
      updatedData.profile.ifsc = document.getElementById("ifscInput").value;
      
      setProviderModuleData(updatedData);
      
      const btn = this;
      const originalText = btn.textContent;
      btn.textContent = "Saved Successfully!";
      btn.style.backgroundColor = "#16a34a";
      btn.style.borderColor = "#16a34a";
      setTimeout(() => {
        btn.textContent = originalText;
        btn.style.backgroundColor = "";
        btn.style.borderColor = "";
      }, 2000);
    });

    const photoInput = document.getElementById("providerProfilePhotoInput");
    if (photoInput) {
      photoInput.addEventListener("change", function () {
        const file = photoInput.files && photoInput.files[0];
        if (!file) return;
        readProviderFileAsDataUrl(file).then(function (dataUrl) {
          const preview = document.getElementById("providerProfilePhotoPreview");
          if (preview) preview.src = dataUrl;
        }).catch(function () { return null; });
      });
    }

    async function saveProfileSections(button, includeProfessional) {
      const updatedData = getProviderModuleData();
      const photoFile = document.getElementById("providerProfilePhotoInput") && document.getElementById("providerProfilePhotoInput").files[0];

      updatedData.profile.fullName = document.getElementById("providerFullNameInput").value.trim() || updatedData.profile.fullName;
      updatedData.profile.organisationName = document.getElementById("providerOrgNameInput") ? document.getElementById("providerOrgNameInput").value.trim() : updatedData.profile.organisationName;
      updatedData.profile.email = document.getElementById("providerEmailInput").value.trim() || updatedData.profile.email;
      updatedData.profile.phone = document.getElementById("providerPhoneInput").value.trim() || updatedData.profile.phone;
      updatedData.profile.location = document.getElementById("providerLocationInput").value.trim() || updatedData.profile.location;

      if (includeProfessional) {
        updatedData.profile.category = document.getElementById("providerCategoryInput").value.trim() || updatedData.profile.category;
        updatedData.profile.experience = document.getElementById("providerExperienceInput").value.trim() || updatedData.profile.experience;
        updatedData.services.forEach(function (service) {
          service.category = updatedData.profile.category;
        });
      }

      if (photoFile) {
        updatedData.profile.profilePhoto = await readProviderFileAsDataUrl(photoFile);
      }

      setProviderModuleData(updatedData);
      syncProviderSession(updatedData.profile);
      syncProviderServicesToCatalog(updatedData);

      const originalText = button.textContent;
      button.textContent = "Saved and synced!";
      button.style.backgroundColor = "#16a34a";
      button.style.borderColor = "#16a34a";
      setTimeout(function () {
        button.textContent = originalText;
        button.style.backgroundColor = "";
        button.style.borderColor = "";
      }, 2000);
    }

    document.getElementById("saveProviderProfileBtn").addEventListener("click", function () {
      saveProfileSections(this, false);
    });

    document.getElementById("saveProviderProfessionalBtn").addEventListener("click", function () {
      saveProfileSections(this, true);
    });

  }

  seedProviderData();
  ensureProviderProfileMatchesSession();
  setupProviderHeader();
  initProviderDashboard();
  initProviderServicesPage();
  initProviderBookingsPage();
  initProviderEarningsPage();
  initProviderSupportPage();
  initProviderAccountPage();

  syncProviderBookingsFromBackend(function () {
    initProviderDashboard();
    initProviderBookingsPage();
    initProviderAccountPage();
  });
})();
