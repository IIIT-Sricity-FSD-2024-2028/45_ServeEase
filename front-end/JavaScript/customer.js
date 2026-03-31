(function () {
  const session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
  if (!session || session.role !== "customer") {
    return;
  }

  const seedKey = "serveEaseCustomerModuleData";

  function seedCustomerData() {
    const existing = localStorage.getItem(seedKey);
    if (existing) return;

    const data = {
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
    };

    localStorage.setItem(seedKey, JSON.stringify(data));
  }

  function getCustomerData() {
    return JSON.parse(localStorage.getItem(seedKey));
  }

  function setCustomerData(data) {
    localStorage.setItem(seedKey, JSON.stringify(data));
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

  function logoutCustomer() {
    sessionStorage.removeItem("serveEaseSession");
    window.location.href = "index.html";
  }

  function setupCustomerHeaderMenus() {
    const notificationBtn = document.getElementById("customerNotificationBtn");
    const notificationPanel = document.getElementById("customerNotificationPanel");
    trapNotificationScroll(notificationPanel);
    const profileBtn = document.getElementById("customerProfileBtn");
    const profileDropdown = document.getElementById("customerProfileDropdown");
    const logoutBtn = document.getElementById("customerLogoutBtn");

    if (notificationBtn && notificationPanel) {
      notificationBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        notificationPanel.classList.toggle("hidden");
        if (profileDropdown) profileDropdown.classList.add("hidden");
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

    const data = getCustomerData();
    welcome.textContent = `Welcome back, ${session.fullName}!`;

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
    upcomingBox.innerHTML = upcomingItems.map(item => `
      <div class="preview-item">
        <div class="preview-title">${item.service}</div>
        <div class="preview-meta">${item.provider} • ${item.date} • ${item.time}</div>
      </div>
    `).join("");

    const paymentsBox = document.getElementById("dashboardRecentPayments");
    paymentsBox.innerHTML = data.payments.slice(0, 4).map(item => `
      <div class="preview-item">
        <div class="preview-title">${item.service}</div>
        <div class="preview-meta">${item.id} • ${formatPrice(item.amount)} • ${item.status}</div>
      </div>
    `).join("");

    const supportBox = document.getElementById("dashboardSupportPreview");
    supportBox.innerHTML = data.tickets.map(item => `
      <div class="preview-item">
        <div class="preview-title">${item.subject}</div>
        <div class="preview-meta">${item.id} • ${item.bookingRef} • ${item.status}</div>
      </div>
    `).join("");
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

          <div class="booking-info-line">📅 ${item.date}</div>
          <div class="booking-info-line">🕒 ${item.time}</div>
          <div class="booking-info-line">📍 ${item.address}</div>

          <div class="booking-bottom-row">
            <div class="booking-ref">${item.id}</div>
            <div class="booking-price">${formatPrice(item.amount)}</div>
          </div>

          <div class="booking-actions">
            <button class="secondary-action" data-view-booking="${item.id}">View Details</button>
            <button class="danger-action" data-cancel-booking="${item.id}">Cancel</button>
          </div>
        </div>
      `).join("") : `<div class="empty-state-card">No ${activeTab === "All" ? "upcoming" : activeTab.toLowerCase()} bookings found.</div>`;

      tbody.innerHTML = history.length ? history.map(item => `
        <tr>
          <td>${item.service}</td>
          <td>${item.provider}</td>
          <td>${item.date}</td>
          <td>${formatPrice(item.amount)}</td>
          <td>${item.id}</td>
          <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
          <td><span class="status-pill ${statusClass(item.feedback || item.status)}">${item.feedback || item.status}</span></td>
          <td>
            <button class="table-link-btn" data-view-booking="${item.id}">View</button>
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
    content.innerHTML = `
      <div class="info-grid">
        <div class="info-box">
          <strong>Service Information</strong>
          <div class="info-row"><span>Service Name:</span><span>${booking.service}</span></div>
          <div class="info-row"><span>Provider Name:</span><span>${booking.provider}</span></div>
          <div class="info-row"><span>Booking Reference:</span><span>${booking.id}</span></div>
          <div class="info-row"><span>Status:</span><span class="status-pill ${statusClass(booking.status)}">${booking.status}</span></div>
        </div>

        <div class="info-box">
          <strong>Date & Time</strong>
          <div class="info-row"><span>Date:</span><span>${booking.date}</span></div>
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
      </div>
    `;
    backdrop.classList.remove("hidden");
  }

  function initPaymentHistory() {
    const summary = document.getElementById("paymentSummaryCards");
    if (!summary) return;

    const data = getCustomerData();
    const totalPaid = data.payments.filter(item => item.status === "Successful").reduce((sum, item) => sum + item.amount, 0);
    const pending = data.payments.filter(item => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
    const refunded = data.payments.filter(item => item.status === "Refunded").reduce((sum, item) => sum + item.amount, 0);

    summary.innerHTML = `
      <div class="stat-card-dashboard"><div class="feature-icon green">✅</div><h3>${formatPrice(totalPaid)}</h3><p>Total Payments Made</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon orange">🕒</div><h3>${formatPrice(pending)}</h3><p>Pending Payments</p></div>
      <div class="stat-card-dashboard"><div class="feature-icon blue">🔄</div><h3>${formatPrice(refunded)}</h3><p>Refunded Amount</p></div>
    `;

    const tbody = document.getElementById("paymentHistoryTableBody");
    if (!tbody) return;

    tbody.innerHTML = data.payments.map(item => `
      <tr>
        <td>${item.id}</td>
        <td>${item.bookingRef}</td>
        <td>${item.service}</td>
        <td>${item.provider}</td>
        <td>${item.method}</td>
        <td>${formatPrice(item.amount)}</td>
        <td>${item.date}</td>
        <td><span class="status-pill ${statusClass(item.status)}">${item.status}</span></td>
        <td><button class="table-link-btn" data-view-payment="${item.id}">View Details</button></td>
      </tr>
    `).join("");

    setupPaymentModal(data);
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
              <div class="info-row"><span>Payment Date:</span><span>${payment.date}</span></div>
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

    function renderTickets() {
      list.innerHTML = data.tickets.map(ticket => `
        <div class="ticket-card">
          <div class="ticket-top">
            <h3>${ticket.subject}</h3>
            <span class="status-pill ${statusClass(ticket.status)}">${ticket.status}</span>
          </div>
          <div class="ticket-meta">Ticket ID: <strong>${ticket.id}</strong></div>
          <div class="ticket-meta">Booking Ref: ${ticket.bookingRef}</div>
          <div class="ticket-meta">${ticket.category} • ${ticket.date}</div>
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
          const message = chatInput.value.trim();
          if (!message) return;
          chatThread.insertAdjacentHTML("beforeend", `<div class="chat-bubble user">${message}</div>`);
          chatThread.insertAdjacentHTML("beforeend", `<div class="chat-bubble support">Thanks for the update. Our support team will review this and respond shortly.</div>`);
          chatInput.value = "";
          chatThread.scrollTop = chatThread.scrollHeight;
        });
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
                <div class="info-row"><span>Created On:</span><span>${ticket.date}</span></div>
              </div>
              <div class="info-box">
                <strong>Issue Summary</strong>
                <div class="info-row"><span>Booking Ref:</span><span>${ticket.bookingRef}</span></div>
                <div class="info-row"><span>Category:</span><span>${ticket.category}</span></div>
                <div class="info-row"><span>Subject:</span><span>${ticket.subject}</span></div>
              </div>
              <div class="info-box">
                <strong>Support Update</strong>
                <div>Your ticket has been received and is currently being reviewed by the support team.</div>
              </div>
            </div>`;
          ticketModalBackdrop.classList.remove("hidden");
        }

        if (chatButton && chatModalBackdrop && chatThread) {
          const ticket = data.tickets.find(function (item) { return item.id === chatButton.dataset.chatTicket; });
          if (!ticket) return;
          chatThread.innerHTML = `
            <div class="chat-bubble support">Hello! You are connected to ServeEase support for ticket ${ticket.id}.</div>
            <div class="chat-bubble support">We can help with ${ticket.subject.toLowerCase()}. Please share any extra details here.</div>`;
          chatModalBackdrop.classList.remove("hidden");
        }
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      error.textContent = "";
      success.textContent = "";

      const bookingRef = document.getElementById("ticketBookingRef").value.trim();
      const category = document.getElementById("ticketCategory").value.trim();
      const subject = document.getElementById("ticketSubject").value.trim();
      const description = document.getElementById("ticketDescription").value.trim();

      if (!bookingRef || !category || !subject || !description) {
        error.textContent = "Please fill all required fields.";
        return;
      }

      const newTicket = {
        id: `TICKET-2026-${2100 + data.tickets.length + 1}`,
        subject: subject,
        bookingRef: bookingRef,
        category: category,
        date: "9 Mar 2026",
        status: "Open"
      };

      data.tickets.unshift(newTicket);
      setCustomerData(data);
      success.textContent = "Support ticket submitted successfully.";
      form.reset();
      renderTickets();
    });

    renderTickets();
    setupFaqAccordion();
    setupTicketInteractions();
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


