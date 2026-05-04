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

  const providerDataKey = "serveEaseProviderModuleData";

  function getProviderModuleData() {
    return JSON.parse(localStorage.getItem(providerDataKey));
  }

  function setProviderModuleData(data) {
    localStorage.setItem(providerDataKey, JSON.stringify(data));
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
    const experience = (providerUser && providerUser.experience) ? `${providerUser.experience} Years` : profile.experience || "5 Years";
    const location = (providerUser && providerUser.address) || (session && session.address) || profile.location || "Bangalore";
    const providerId = (providerUser && providerUser.id) || (session && session.userId) || profile.providerId || "PRO001";

    return {
      providerId: providerId,
      fullName: providerName,
      email: providerEmail,
      phone: formattedPhone,
      organisationName: organisationName,
      category: category,
      experience: experience,
      location: location,
      accountStatus: profile.accountStatus || "Active",
      totalServices: profile.totalServices || 5,
      totalBookings: profile.totalBookings || 120,
      rating: profile.rating || 4.8,
      accountCreated: profile.accountCreated || "12 Jan 2025",
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
      phone: profile.phone
    }));
  }

  function seedProviderData() {
    const existing = localStorage.getItem(providerDataKey);
    if (existing) {
      // Force an update of the profile to ensure the name/org overrides apply immediately
      const data = JSON.parse(existing);
      data.profile = buildProviderProfile(data.profile);
      setProviderModuleData(data);
      return;
    }

    const data = {
      profile: buildProviderProfile(),
      services: [
        {
          id: "SVC001",
          name: "Kitchen Cleaning",
          category: "Cleaning Services",
          description: "Professional kitchen deep cleaning service",
          price: 799,
          duration: "2 hours",
          location: "Bangalore",
          status: "Inactive"
        },
        {
          id: "SVC002",
          name: "Bathroom Cleaning",
          category: "Cleaning Services",
          description: "Complete bathroom cleaning and sanitization",
          price: 599,
          duration: "1.5 hours",
          location: "Bangalore",
          status: "Active"
        },
        {
          id: "SVC003",
          name: "Floor Cleaning Service",
          category: "Cleaning Services",
          description: "Home floor and tile deep cleaning",
          price: 699,
          duration: "2 hours",
          location: "Bangalore",
          status: "Active"
        }
      ],
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
      bookings: [
        {
          id: "BOOK-2026-1101",
          customer: "Raghava Kumar",
          service: "Kitchen Cleaning",
          date: "15 Mar 2026",
          time: "10:00 AM",
          location: "Bangalore",
          amount: 799,
          status: "Pending",
          progress: 35
        },
        {
          id: "BOOK-2026-1102",
          customer: "Ananya Rao",
          service: "Bathroom Cleaning",
          date: "16 Mar 2026",
          time: "11:00 AM",
          location: "Bangalore",
          amount: 599,
          status: "Accepted",
          progress: 70
        },
        {
          id: "BOOK-2026-1103",
          customer: "Prakash Verma",
          service: "Kitchen Cleaning",
          date: "17 Mar 2026",
          time: "9:30 AM",
          location: "Bangalore",
          amount: 799,
          status: "Completed",
          progress: 100
        },
        {
          id: "BOOK-2026-1104",
          customer: "Megha Jain",
          service: "Floor Cleaning Service",
          date: "18 Mar 2026",
          time: "3:00 PM",
          location: "Bangalore",
          amount: 699,
          status: "Rejected",
          progress: 10
        }
      ],
      transactions: [
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
      ],
      supportTickets: [
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
      ]
    };

    localStorage.setItem(providerDataKey, JSON.stringify(data));
  }

  function statusClass(status) {
    const value = String(status).toLowerCase();
    if (value === "active" || value === "accepted" || value === "completed" || value === "paid") return "status-accepted";
    if (value === "pending" || value === "in progress") return "status-pending";
    if (value === "inactive" || value === "rejected" || value === "failed") return "status-cancelled";
    return "status-pending";
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
    if (!data) return;

    data.profile = buildProviderProfile(data.profile);
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

  function initProviderDashboard() {
    const welcome = document.getElementById("providerWelcomeText");
    if (!welcome) return;

    const data = getProviderModuleData();
    welcome.textContent = `Welcome, ${data.profile.fullName}!`;
    document.getElementById("providerHeroId").textContent = data.profile.providerId;

    const statsGrid = document.getElementById("providerStatsGrid");
    statsGrid.innerHTML = `
      <div class="stat-card-dashboard"><div class="feature-icon orange">🧰</div><h3>${data.profile.totalServices}</h3><p>Total Services</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon blue">📋</div><h3>${data.bookings.length}</h3><p>Total Bookings</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon green">⭐</div><h3>${data.profile.rating}</h3><p>Provider Rating</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon purple">💰</div><h3>₹25,000</h3><p>Total Earnings</p></div>
    `;

    const perf = document.getElementById("providerPerformanceList");
    perf.innerHTML = data.bookings.slice(0, 4).map(function (booking) {
      return `
        <div class="preview-item">
          <div class="preview-title">${booking.service}</div>
          <div class="preview-meta">${booking.customer} • ${booking.date} • ${booking.status}</div>
        </div>
      `;
    }).join("");

    const note = document.getElementById("providerNotificationPreview");
    note.innerHTML = `
      <div class="preview-item">
        <div class="preview-title">New booking request received</div>
        <div class="preview-meta">Kitchen Cleaning • 20 min ago</div>
      </div>
      <div class="preview-item">
        <div class="preview-title">Weekly payout is being processed</div>
        <div class="preview-meta">2 hours ago</div>
      </div>
      <div class="preview-item">
        <div class="preview-title">Support replied to your ticket</div>
        <div class="preview-meta">5 hours ago</div>
      </div>
    `;
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

    error.textContent = "";
    title.textContent = mode === "edit" ? "Edit Service" : "Add New Service";

    if (service) {
      editId.value = service.id;
      name.value = service.name;
      category.value = service.category;
      description.value = service.description;
      price.value = service.price;
      duration.value = service.duration;
      location.value = service.location;
    } else {
      editId.value = "";
      name.value = "";
      category.value = "";
      description.value = "";
      price.value = "";
      duration.value = "";
      location.value = "";
    }

    backdrop.classList.remove("hidden");
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
          renderServices();
        });
      });
    }

    const availabilityPanel = document.getElementById("providerAvailabilityPanel");

    function renderAvailability() {
      const searchTerm = getSearchTerm();
      const visibleDays = data.availability.days.filter(function (day) {
        return !searchTerm || day.label.toLowerCase().indexOf(searchTerm) !== -1;
      });
      const visibleSlots = data.availability.slots.filter(function (slot) {
        const searchableText = [slot.day, slot.from, slot.to, slot.id, slot.active ? "active" : "inactive"].join(" ").toLowerCase();
        return !searchTerm || searchableText.indexOf(searchTerm) !== -1;
      });

      availabilityPanel.innerHTML = `
        <div class="provider-availability-box">
          <div class="provider-availability-days">
            ${visibleDays.map(function (day) {
              return `<button type="button" class="provider-availability-chip ${day.active ? "active" : ""}" data-day-label="${day.label}">${day.label}</button>`;
            }).join("") || `<div class="superuser-empty-state">No days matched your search.</div>`}
          </div>

          <div class="provider-availability-slots">
            ${visibleSlots.map(function (slot) {
              return `
                <label class="provider-slot-check-row">
                  <div>
                    <span>${slot.day}</span>
                    <strong>${slot.from} - ${slot.to}</strong>
                  </div>
                  <input class="provider-slot-checkbox" type="checkbox" data-slot-id="${slot.id}" ${slot.active ? "checked" : ""}>
                </label>
              `;
            }).join("") || `<div class="superuser-empty-state">No time slots matched your search.</div>`}
          </div>
        </div>
      `;

      document.querySelectorAll("[data-day-label]").forEach(function (button) {
        button.addEventListener("click", function () {
          const day = data.availability.days.find(function (item) {
            return item.label === button.dataset.dayLabel;
          });
          if (!day) return;
          day.active = !day.active;
          setProviderModuleData(data);
          renderAvailability();
        });
      });
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
        const message = chatInput.value.trim();
        if (!message) return;
        chatThread.insertAdjacentHTML("beforeend", `<div class="provider-chat-bubble user">${message}</div>`);
        chatThread.insertAdjacentHTML("beforeend", `<div class="provider-chat-bubble support">Thank you. Our provider support team will get back to you shortly.</div>`);
        chatInput.value = "";
        chatThread.scrollTop = chatThread.scrollHeight;
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";

      const id = document.getElementById("providerServiceEditId").value.trim();
      const name = document.getElementById("providerServiceName").value.trim();
      const category = document.getElementById("providerServiceCategory").value.trim();
      const description = document.getElementById("providerServiceDescription").value.trim();
      const price = document.getElementById("providerServicePrice").value.trim();
      const duration = document.getElementById("providerServiceDuration").value.trim();
      const location = document.getElementById("providerServiceLocation").value.trim();

      if (!name || !category || !description || !price || !duration || !location) {
        error.textContent = "Please fill all service fields.";
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
          service.location = location;
        }
      } else {
        data.services.unshift({
          id: `SVC${String(data.services.length + 1).padStart(3, "0")}`,
          name: name,
          category: category,
          description: description,
          price: Number(price),
          duration: duration,
          location: location,
          status: "Inactive"
        });
      }

      setProviderModuleData(data);
      renderServices();
      closeModal();
    });
  }

  function initProviderBookingsPage() {
    const list = document.getElementById("providerBookingsList");
    if (!list) return;

    const data = getProviderModuleData();
    const tabs = document.getElementById("providerBookingTabs");
    const bookingModalBackdrop = document.getElementById("providerBookingModalBackdrop");
    const bookingModalContent = document.getElementById("providerBookingModalContent");
    const closeBookingModalBtn = document.getElementById("closeProviderBookingModalBtn");
    const getSearchTerm = setupProviderSearch(".dashboard-search input", renderBookings);
    const labels = ["All", "Pending", "Accepted", "Completed", "Rejected"];
    let active = "All";

    function renderTabs() {
      tabs.innerHTML = labels.map(function (label) {
        const count = label === "All"
          ? data.bookings.length
          : data.bookings.filter(function (item) { return item.status === label; }).length;
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
      const filtered = data.bookings.filter(function (booking) {
        const statusMatch = active === "All" || booking.status === active;
        const searchMatch = !searchTerm || [booking.id, booking.customer, booking.service, booking.date, booking.time, booking.location, booking.status].join(" ").toLowerCase().indexOf(searchTerm) !== -1;
        return statusMatch && searchMatch;
      });

      list.innerHTML = filtered.map(function (booking) {
        return `
          <div class="provider-booking-card">
            <div class="provider-booking-top">
              <div>
                <div class="provider-booking-title">${booking.service}</div>
                <div class="provider-booking-submeta">${booking.customer} • ${booking.id}</div>
              </div>
              <span class="status-pill ${statusClass(booking.status)}">${booking.status}</span>
            </div>

            <div class="provider-booking-line">📅 ${booking.date} &nbsp; • &nbsp; 🕒 ${booking.time}</div>
            <div class="provider-booking-line">📍 ${booking.location}</div>
            <div class="provider-booking-line">Amount: <strong>${formatCurrency(booking.amount)}</strong></div>

            <div class="provider-booking-progress"><span style="width:${booking.progress}%"></span></div>

            <div class="provider-booking-actions">
              ${booking.status === "Pending" ? `<button class="btn btn-primary" type="button" data-accept-booking="${booking.id}">Accept</button>` : ""}
              ${booking.status === "Pending" ? `<button class="danger-action" type="button" data-reject-booking="${booking.id}">Reject</button>` : ""}
              ${booking.status === "Accepted" ? `<button class="secondary-action" type="button" data-complete-booking="${booking.id}">Mark Completed</button>` : ""}
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
          booking.progress = 70;
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
          booking.status = "Rejected";
          booking.progress = 10;
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
              <div class="info-box"><strong>Service Information</strong><div class="info-row"><span>Service:</span><span>${booking.service}</span></div><div class="info-row"><span>Date:</span><span>${booking.date}</span></div><div class="info-row"><span>Time:</span><span>${booking.time}</span></div><div class="info-row"><span>Amount:</span><span>${formatCurrency(booking.amount)}</span></div></div>
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
          booking.status = "Completed";
          booking.progress = 100;
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
    const processedAmount = 1248;

    stats.innerHTML = `
      <div class="stat-card-dashboard"><div class="feature-icon blue">💰</div><h3>${formatCurrency(totalEarning)}</h3><p>Total Earnings</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon green">✅</div><h3>${formatCurrency(pendingAmount)}</h3><p>Pending Payouts</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon orange">📊</div><h3>${formatCurrency(processedAmount)}</h3><p>Pending Payout Requests</p></div>
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
          <td>${transaction.serviceDate}</td>
          <td>${transaction.paymentDate}</td>
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
    const faqContainer = document.getElementById("providerCommonIssuesList");
    const ticketModalBackdrop = document.getElementById("providerTicketModalBackdrop");
    const ticketModalContent = document.getElementById("providerTicketModalContent");
    const closeTicketModalBtn = document.getElementById("closeProviderTicketModalBtn");
    const chatModalBackdrop = document.getElementById("providerChatModalBackdrop");
    const closeChatModalBtn = document.getElementById("closeProviderChatModalBtn");
    const chatThread = document.getElementById("providerChatThread");
    const chatForm = document.getElementById("providerChatForm");
    const chatInput = document.getElementById("providerChatInput");
    const providerFaqs = [
      { q: "How do I update my service pricing?", a: "Open Manage Services, click Edit Service, update the price, and save the changes. The updated amount is shown instantly in your service card." },
      { q: "How do I manage booking requests?", a: "Go to Booking Management to accept, reject, or complete requests. You can also open View Details to see the full booking information." },
      { q: "Where can I view my payout details?", a: "Open Earnings & Payments to review transaction history, pending payouts, and processed payment details." },
      { q: "How do I contact customer support?", a: "Create a support ticket from this page or use Chat with Support inside My Support Tickets for quick follow-up." }
    ];
    const getSearchTerm = setupProviderSearch(".dashboard-search input", function () { renderTickets(); renderFaqs(); });

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
        return !searchTerm || [ticket.id, ticket.subject, ticket.category, ticket.status, ticket.created].join(" ").toLowerCase().indexOf(searchTerm) !== -1;
      });
      list.innerHTML = visibleTickets.map(function (ticket) {
        return `
          <div class="ticket-card">
            <div class="ticket-top">
              <h3>${ticket.subject}</h3>
              <span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span>
            </div>
            <div class="ticket-meta">Ticket ID: <strong>${ticket.id}</strong></div>
            <div class="ticket-meta">${ticket.category} • ${ticket.created}</div>
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
                  <span>${ticket.createdOn || ticket.created || "—"}</span>
                </div>
              </div>

              <div class="provider-ticket-detail-box">
                <strong>Issue Summary</strong>
                <div class="provider-ticket-detail-row">
                  <span>Booking Ref:</span>
                  <span>${ticket.bookingRef || "BOOK-2026-1045"}</span>
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

          chatThread.innerHTML = `
            <div class="provider-chat-ticket-summary">
              <strong>${ticket.subject}</strong>
              <span>${ticket.id} • ${ticket.category}</span>
            </div>
            <div class="provider-chat-bubble support">Hello! Welcome to Provider Support. We can help you with your ticket <strong>${ticket.id}</strong>.</div>
            <div class="provider-chat-bubble support">Please share any extra details about the issue, and our team will continue the support process.</div>
          `;
          if (chatInput) {
            chatInput.value = "";
            chatInput.focus();
          }
          chatModalBackdrop.classList.remove("hidden");
          chatThread.scrollTop = chatThread.scrollHeight;
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
        const message = chatInput.value.trim();
        if (!message) return;
        chatThread.insertAdjacentHTML("beforeend", `<div class="provider-chat-bubble user">${message}</div>`);
        chatThread.insertAdjacentHTML("beforeend", `<div class="provider-chat-bubble support">Thank you. Our provider support team will get back to you shortly.</div>`);
        chatInput.value = "";
        chatThread.scrollTop = chatThread.scrollHeight;
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";
      success.textContent = "";

      const category = document.getElementById("providerTicketCategory").value.trim();
      const subject = document.getElementById("providerTicketSubject").value.trim();
      const description = document.getElementById("providerTicketDescription").value.trim();

      if (!category || !subject || !description) {
        error.textContent = "Please fill all support ticket fields.";
        return;
      }

      data.supportTickets.unshift({
        id: `PT-${1000 + data.supportTickets.length + 1}`,
        subject: subject,
        category: category,
        status: "Open",
        created: "Just now",
        createdOn: "9 Mar 2026",
        bookingRef: "BOOK-2026-1045",
        supportUpdate: "Your ticket has been received and is currently being reviewed by the support team."
      });

      setProviderModuleData(data);
      success.textContent = "Support ticket submitted successfully.";
      form.reset();
      renderTickets();
    renderFaqs();
    });

    renderTickets();
    renderFaqs();
  }

  function initProviderAccountPage() {
    const personal = document.getElementById("providerPersonalInfo");
    if (!personal) return;

    const data = getProviderModuleData();

    var orgNameHtml = data.profile.organisationName
      ? `<div class="info-box"><strong>Organisation Name</strong><div>${data.profile.organisationName}</div></div>`
      : '';
    personal.innerHTML = `
      <div class="info-box"><strong>Name</strong><div>${data.profile.fullName}</div></div>
      ${orgNameHtml}
      <div class="info-box"><strong>Email</strong><div>${data.profile.email}</div></div>
      <div class="info-box"><strong>Phone</strong><div>${data.profile.phone}</div></div>
      <div class="info-box"><strong>Location</strong><div>${data.profile.location}</div></div>
    `;

    document.getElementById("providerAccountStats").innerHTML = `
      <div class="info-box"><strong>Account Status</strong><div>${data.profile.accountStatus}</div></div>
      <div class="info-box"><strong>Total Services</strong><div>${data.profile.totalServices}</div></div>
      <div class="info-box"><strong>Total Bookings</strong><div>${data.profile.totalBookings}</div></div>
      <div class="info-box"><strong>Rating</strong><div>${data.profile.rating}</div></div>
    `;

    document.getElementById("providerProfessionalInfo").innerHTML = `
      <div class="info-box"><strong>Service Category</strong><div>${data.profile.category}</div></div>
      <div class="info-box"><strong>Experience</strong><div>${data.profile.experience}</div></div>
      <div class="info-box"><strong>Provider ID</strong><div>${data.profile.providerId}</div></div>
      <div class="info-box"><strong>Account Created</strong><div>${data.profile.accountCreated}</div></div>
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
})();