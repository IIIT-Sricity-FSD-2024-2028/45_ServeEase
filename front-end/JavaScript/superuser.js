(function () {
  const storageKey = "serveEaseSuperuserModuleData";
  const allowedRoles = ["superuser"];
  let selectedUserId = "";
  let selectedProviderId = "";
  let editingCategoryId = "";
  let selectedBookingId = "";
  let selectedTicketId = "";

  function getSession() {
    return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
  }

  function requireAccess() {
    const isSuperuserPage = document.querySelector(".superuser-page");
    if (!isSuperuserPage) return;
    const session = getSession();
    if (!session || !session.isLoggedIn || !allowedRoles.includes(session.role)) {
      window.location.href = "login.html";
      return;
    }
  }

  function getData() {
    return JSON.parse(localStorage.getItem(storageKey) || "null");
  }

  function setData(data) {
    localStorage.setItem(storageKey, JSON.stringify(data));
  }

  function chipClass(value) {
    const normalized = String(value || "").toLowerCase();
    if (normalized === "in progress") return "in-progress";
    return normalized.replace(/\s+/g, "-");
  }

  function seedData() {
    if (getData()) return;
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
      notifications: [
        { id: "AN001", text: "Provider registration pending approval - Anita Verma", time: "10 minutes ago", type: "orange", isNew: true, actionPage: "superuser-management.html" },
        { id: "AN002", text: "New high-priority support ticket - TICKET-2026-2105", time: "30 minutes ago", type: "red", isNew: true, actionPage: "superuser-escalated-tickets.html" },
        { id: "AN003", text: "System update scheduled for tonight at 2:00 AM", time: "2 hours ago", type: "default", isNew: false, actionPage: "superuser-dashboard.html" },
        { id: "AN004", text: "Monthly revenue report is ready", time: "5 hours ago", type: "default", isNew: false, actionPage: "superuser-dashboard.html" },
        { id: "AN005", text: "New service category added - Painting Services", time: "2 hours ago", type: "blue", isNew: false, actionPage: "superuser-management.html" }
      ],
      activities: [
        { id: "AA001", icon: "👥", color: "blue", title: "New customer registered - Raghava Kumar", time: "5 minutes ago" },
        { id: "AA002", icon: "🧑‍🔧", color: "purple", title: "New service provider registered - Anita Verma (Salon Services)", time: "15 minutes ago" },
        { id: "AA003", icon: "🗓", color: "green", title: "New booking created - BOOK-2026-1045", time: "30 minutes ago" },
        { id: "AA004", icon: "📈", color: "red", title: "Support ticket escalated - TICKET-2026-2103", time: "1 hour ago" },
        { id: "AA005", icon: "✓", color: "green", title: "Booking completed - BOOK-2026-1040", time: "2 hours ago" }
      ],
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
        { id: "PRO013", fullName: "Anita Verma", email: "anita.verma@email.com", phone: "+91 9876543230", category: "Salon Services", experience: 5, location: "Mumbai", registrationDate: "8 Mar 2026", approvalStatus: "Pending Approval" },
        { id: "PRO014", fullName: "Deepak Kumar", email: "deepak.kumar@email.com", phone: "+91 9876543233", category: "Electrical", experience: 4, location: "Pune", registrationDate: "7 Mar 2026", approvalStatus: "Pending Approval" },
        { id: "PRO015", fullName: "Manoj Singh", email: "manoj.singh@email.com", phone: "+91 9876543237", category: "Appliance Repair", experience: 5, location: "Ahmedabad", registrationDate: "10 Feb 2026", approvalStatus: "Pending Approval" },
        { id: "PRO016", fullName: "Rekha Joshi", email: "rekha.joshi@email.com", phone: "+91 9876543240", category: "Salon Services", experience: 3, location: "Jaipur", registrationDate: "25 Feb 2026", approvalStatus: "Pending Approval" }
      ],
      providers: [
        { id: "PRO001", fullName: "Priya Sharma", email: "priya.sharma@email.com", category: "Cleaning Services", experience: 3, location: "Delhi", registrationDate: "15 Feb 2026", approvalStatus: "Active" },
        { id: "PRO002", fullName: "Rajesh Yadav", email: "rajesh.yadav@email.com", category: "Plumbing", experience: 8, location: "Bangalore", registrationDate: "20 Jan 2026", approvalStatus: "Active" },
        { id: "PRO003", fullName: "Lakshmi Menon", email: "lakshmi.menon@email.com", category: "Salon Services", experience: 6, location: "Chennai", registrationDate: "22 Feb 2026", approvalStatus: "Active" },
        { id: "PRO004", fullName: "Ravi Verma", email: "ravi.verma@email.com", category: "Pest Control", experience: 7, location: "Hyderabad", registrationDate: "28 Jan 2026", approvalStatus: "Active" },
        { id: "PRO005", fullName: "Sunita Rao", email: "sunita.rao@email.com", category: "Cleaning Services", experience: 4, location: "Kolkata", registrationDate: "5 Mar 2026", approvalStatus: "Active" },
        { id: "PRO006", fullName: "Geeta Patel", email: "geeta.patel@email.com", category: "Painting Services", experience: 9, location: "Surat", registrationDate: "18 Jan 2026", approvalStatus: "Active" },
        { id: "PRO007", fullName: "Anil Deshmukh", email: "anil.deshmukh@email.com", category: "Home Repair", experience: 10, location: "Nagpur", registrationDate: "1 Mar 2026", approvalStatus: "Active" },
        { id: "PRO008", fullName: "Vijay Kumar", email: "vijay.kumar@email.com", category: "Plumbing", experience: 6, location: "Lucknow", registrationDate: "9 Mar 2026", approvalStatus: "Active" }
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
        { id: "TICKET-2026-2103", status: "Escalated", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1040", created: "2026-03-07", category: "Service Complaint", subject: "Service provider arrived late without prior notice", description: "Service provider arrived late", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 },
        { id: "TICKET-2026-2107", status: "Escalated", userType: "Customer", customer: "Amit Sharma", bookingId: "BOOK-2026-1050", created: "2026-03-09", category: "Service Complaint", subject: "Poor quality of salon service provided", description: "Poor quality of salon service provided", phone: "+91 98765 43211", email: "amit.sharma@email.com", attachments: 1 },
        { id: "TICKET-2026-2108", status: "Escalated", userType: "Customer", customer: "Priya Patel", bookingId: "BOOK-2026-1052", created: "2026-03-09", category: "Service Complaint", subject: "Service provider damaged property during repair work", description: "Service provider damaged property during repair work", phone: "+91 98765 43212", email: "priya.patel@email.com", attachments: 2 },
        { id: "TICKET-2026-2105", status: "Open", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1045", created: "2026-03-08", category: "Booking Issue", subject: "Unable to reschedule my kitchen cleaning service booking", description: "Unable to reschedule my kitchen cleaning service booking", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2106", status: "Open", userType: "Provider", customer: "CleanPro Services", bookingId: "BOOK-2026-1045", created: "2026-03-08", category: "Booking Issue", subject: "Customer canceled booking at last minute without valid reason", description: "Customer canceled booking at last minute without valid reason", phone: "+91 91234 56789", email: "cleanpro@serveease.com", attachments: 1 },
        { id: "TICKET-2026-2104", status: "In Progress", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1042", created: "2026-03-07", category: "Payment Issue", subject: "Payment deducted but booking not confirmed", description: "Payment deducted but booking not confirmed", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2102", status: "In Progress", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1038", created: "2026-03-06", category: "Technical Issue", subject: "ServeEase app not loading on my mobile device", description: "ServeEase app not loading on my mobile device", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 1 },
        { id: "TICKET-2026-2101", status: "Resolved", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1037", created: "2026-03-06", category: "Booking Issue", subject: "Need to cancel my plumbing service booking", description: "Need to cancel my plumbing service booking", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 },
        { id: "TICKET-2026-2100", status: "Resolved", userType: "Customer", customer: "Raghava Kumar", bookingId: "BOOK-2026-1036", created: "2026-03-05", category: "Payment Issue", subject: "Refund not received after cancellation", description: "Refund not received after cancellation", phone: "+91 98765 43210", email: "raghava.kumar@email.com", attachments: 0 }
      ]
    };
    setData(data);
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
        const onDashboard = window.location.pathname.endsWith("superuser-dashboard.html") || window.location.pathname === "/superuser-dashboard.html";
        const modal = byId("superuserNotificationModalBackdrop");
        if (!onDashboard && modal) {
          openNotificationModal();
          return;
        }
        if (onDashboard) {
          const panel = document.querySelector(".superuser-notification-card");
          if (panel) panel.scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          window.location.href = "superuser-dashboard.html#notifications";
        }
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
    const newCount = data.notifications.filter(function (item) { return item.isNew; }).length;
    badge.textContent = newCount + " New";
    list.innerHTML = data.notifications.slice(0, 4).map(function (item) {
      return '<button class="superuser-notification-item ' + (item.type || '') + '" data-page="' + item.actionPage + '"><div><strong>' + item.text + '</strong><span>' + item.time + '</span></div></button>';
    }).join("");
    list.querySelectorAll("button[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        window.location.href = button.dataset.page;
      });
    });
    const viewAll = byId("superuserViewAllNotificationsBtn");
    if (viewAll) {
      viewAll.addEventListener("click", function () {
        alert(data.notifications.map(function (item) { return item.text + ' - ' + item.time; }).join('\n'));
      });
    }
  }

  function renderNotificationModal() {
    const modalList = byId("superuserNotificationModalList");
    const modalBadge = byId("superuserNotificationModalBadge");
    if (!modalList || !modalBadge) return;
    const data = getData();
    const newCount = data.notifications.filter(function (item) { return item.isNew; }).length;
    modalBadge.textContent = newCount + " New";
    modalList.innerHTML = data.notifications.map(function (item) {
      return '<div class="superuser-notification-item ' + (item.type || '') + '"><div><strong>' + item.text + '</strong><span>' + item.time + '</span></div></div>';
    }).join("");
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

  function renderDashboard() {
    const statsGrid = byId("superuserStatsGrid");
    if (!statsGrid) return;
    const data = getData();
    statsGrid.innerHTML = [
      buildStatCard("", data.stats.registeredCustomers.toLocaleString(), "Registered Customers", "👥"),
      buildStatCard("", data.stats.serviceProviders.toLocaleString(), "Service Providers", "🧑‍🔧"),
      buildStatCard("", data.stats.totalBookings.toLocaleString(), "Total Bookings", "🗓"),
      buildStatCard("", '₹' + data.stats.platformRevenue.toLocaleString('en-IN'), "Platform Revenue", "💲"),
      buildStatCard("", data.stats.pendingApprovals, "Pending Approvals", "🕘", "warning")
    ].join("");

    byId("superuserActiveSessions").textContent = data.stats.activeSessions;
    byId("superuserResponseTime").textContent = data.stats.avgResponseTime;
    byId("superuserUptime").textContent = data.stats.uptime;

    renderNotifications();
    if (window.location.hash === '#notifications') {
      setTimeout(function () {
        const panel = document.querySelector('.superuser-notification-card');
        if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
    renderLineChart(data.monthlyBookings, data.monthlyLabels);
    renderBarChart(data.categoryStats);
    renderPieChart(data.bookingStatusDistribution);
    renderActivities();
    renderRecentRegistrations();
    setupDashboardShortcuts();
    setupGlobalSearch();
  }

  function renderLineChart(points, labels) {
    const host = byId("superuserLineChart");
    if (!host) return;
    const max = Math.max.apply(null, points) * 1.1;
    const width = 640;
    const height = 220;
    const paddingX = 25;
    const innerWidth = width - (paddingX * 2);
    const stepX = innerWidth / (points.length - 1);
    const drawHeight = 175;
    let path = "";
    let labelsMarkup = "";
    points.forEach(function (point, index) {
      const x = paddingX + index * stepX;
      const y = 195 - (point / max) * drawHeight;
      path += (index === 0 ? 'M' : ' L') + x + ' ' + y;
      labelsMarkup += '<text x="' + x + '" y="215" text-anchor="middle" font-size="12" fill="#6c7b92">' + labels[index] + '</text>';
      labelsMarkup += '<circle cx="' + x + '" cy="' + y + '" r="5" fill="#3766ff"></circle>';
    });
    host.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none"><path d="' + path + '" fill="none" stroke="#3766ff" stroke-width="3"></path>' + labelsMarkup + '</svg>';
  }

  function renderBarChart(items) {
    const host = byId("superuserBarChart");
    if (!host) return;
    const max = Math.max.apply(null, items.map(function (item) { return item.bookings; }));
    const width = 640;
    const height = 220;
    const slot = width / items.length;
    let body = "";
    items.forEach(function (item, index) {
      const barHeight = (item.bookings / max) * 175;
      const x = index * slot + (slot - 70) / 2;
      const y = 195 - barHeight;
      body += '<rect x="' + x + '" y="' + y + '" width="70" height="' + barHeight + '" rx="4" fill="#8a5cf6"></rect>';
      body += '<text x="' + (x + 35) + '" y="215" text-anchor="middle" font-size="12" fill="#6c7b92">' + item.name + '</text>';
    });
    host.innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none">' + body + '</svg>';
  }


  function renderPieChart(distribution) {
    const host = byId("superuserPieChart");
    if (!host || !distribution) return;
    const completed = Number(distribution.completed || 0);
    const inProgress = Number(distribution.inProgress || 0);
    const cancelled = Number(distribution.cancelled || 0);
    const total = completed + inProgress + cancelled || 1;

    const size = 210;
    const cx = size / 2;
    const cy = size / 2;
    const r = 88;

    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
      return {
        x: centerX + (radius * Math.cos(angleInRadians)),
        y: centerY + (radius * Math.sin(angleInRadians))
      };
    }

    function createSlice(startAngle, endAngle, color) {
      const start = polarToCartesian(cx, cy, r, endAngle);
      const end = polarToCartesian(cx, cy, r, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return '<path d="M ' + cx + ' ' + cy + ' L ' + start.x + ' ' + start.y + ' A ' + r + ' ' + r + ' 0 ' + largeArcFlag + ' 0 ' + end.x + ' ' + end.y + ' Z" fill="' + color + '" stroke="#ffffff" stroke-width="2"></path>';
    }

    const blueAngle = (inProgress / total) * 360;
    const redAngle = (cancelled / total) * 360;
    const greenAngle = (completed / total) * 360;

    let start = 90;
    const blueStart = start;
    const blueEnd = start + blueAngle;
    start = blueEnd;
    const redStart = start;
    const redEnd = start + redAngle;
    start = redEnd;
    const greenStart = start;
    const greenEnd = start + greenAngle;

    host.innerHTML =
      '<div class="superuser-pie-card-layout">' +
        '<div class="superuser-pie-graphic">' +
          '<svg viewBox="0 0 ' + size + ' ' + size + '" preserveAspectRatio="xMidYMid meet" aria-label="Booking status distribution pie chart">' +
            createSlice(greenStart, greenEnd, '#1fba82') +
            createSlice(redStart, redEnd, '#f34242') +
            createSlice(blueStart, blueEnd, '#4a7fe6') +
          '</svg>' +
        '</div>' +
        '<div class="superuser-pie-highlights">' +
          '<div class="superuser-pie-highlight completed"><span class="superuser-pie-dot"></span><strong>Completed:</strong><span>' + completed + '</span></div>' +
          '<div class="superuser-pie-highlight progress"><span class="superuser-pie-dot"></span><strong>In Progress:</strong><span>' + inProgress + '</span></div>' +
          '<div class="superuser-pie-highlight cancelled"><span class="superuser-pie-dot"></span><strong>Cancelled:</strong><span>' + cancelled + '</span></div>' +
        '</div>' +
      '</div>';
  }

  function renderActivities() {
    const list = byId("superuserActivityList");
    if (!list) return;
    const data = getData();
    list.innerHTML = data.activities.map(function (item) {
      return '<div class="superuser-activity-item"><div class="superuser-activity-icon ' + item.color + '">' + item.icon + '</div><div class="superuser-activity-content"><strong>' + item.title + '</strong><span>' + item.time + '</span></div></div>';
    }).join("");
  }

  function findRegistration(id) {
    const data = getData();
    return data.customers.find(function (item) { return item.id === id; }) || data.providers.find(function (item) { return item.id === id; }) || data.pendingProviders.find(function (item) { return item.id === id; });
  }

  function renderRecentRegistrations() {
    const tbody = byId("superuserRecentRegistrations");
    if (!tbody) return;
    const data = getData();
    tbody.innerHTML = data.recentRegistrations.map(function (id) {
      const item = findRegistration(id);
      const role = item.id.startsWith("CUS") ? "Customer" : "Provider";
      const status = item.status || item.approvalStatus || 'Active';
      return '<tr><td>' + item.fullName + '</td><td><span class="superuser-chip ' + role.toLowerCase() + '">' + role + '</span></td><td>' + item.registrationDate + '</td><td><span class="superuser-chip ' + chipClass(status) + '">' + status + '</span></td><td><button class="superuser-inline-action" type="button" data-user-id="' + item.id + '">◉ View Details</button></td></tr>';
    }).join("");
    tbody.querySelectorAll("button[data-user-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        openUserModal(button.dataset.userId);
      });
    });
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
    renderCustomers(false);
    renderPendingProviders();
    renderProviders();
    if (byId('superuserCategoryGrid')) renderCategories();
    updateManagementCounts();
    bindCategoryModalTriggers();
    setupCategorySearch();
  }

  function setupManagementSearch() {
    const input = byId("superuserManagementSearch");
    if (!input) return;
    input.addEventListener("input", function () {
      renderCustomers(false, input.value.trim().toLowerCase());
      renderPendingProviders(input.value.trim().toLowerCase());
      renderProviders(input.value.trim().toLowerCase());
      if (byId('superuserCategoryGrid')) renderCategories(input.value.trim().toLowerCase());
    });
  }

  function renderCustomers(showAll, term) {
    const tbody = byId("superuserCustomerTableBody");
    const showMoreBtn = byId("superuserShowMoreCustomersBtn");
    if (!tbody) return;
    const data = getData();
    const filtered = data.customers.filter(function (item) {
      const hay = [item.fullName, item.email, item.phone, item.status].join(' ').toLowerCase();
      return !term || hay.includes(term);
    });
    const rows = (showAll ? filtered : filtered.slice(0, 10)).map(function (item) {
      return '<tr><td>' + item.fullName + '</td><td>' + item.email + '</td><td>' + item.phone + '</td><td>' + item.registrationDate + '</td><td><span class="superuser-chip ' + chipClass(item.status) + '">' + item.status + '</span></td><td><button class="superuser-inline-action" type="button" data-user-id="' + item.id + '">◉</button></td></tr>';
    }).join('');
    tbody.innerHTML = rows || '<tr><td colspan="6"><div class="superuser-empty-state">No customers found for the current search.</div></td></tr>';
    tbody.querySelectorAll('button[data-user-id]').forEach(function (button) {
      button.addEventListener('click', function () {
        openUserModal(button.dataset.userId);
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
    const data = getData();
    const filtered = data.pendingProviders.filter(function (item) {
      const hay = [item.fullName, item.email, item.location, item.category].join(' ').toLowerCase();
      return !term || hay.includes(term);
    });
    list.innerHTML = filtered.map(function (item) {
      return '<article class="superuser-provider-card"><div class="superuser-provider-main"><h3>' + item.fullName + ' <span class="superuser-chip pending">Pending Approval</span></h3><p>✉ ' + item.email + '</p><p>🏬 ' + item.category + '</p><p>◷ ' + item.experience + ' years Experience</p></div><div class="superuser-provider-meta"><p>☎ ' + item.phone + '</p><p>⌖ ' + item.location + '</p><p>🗓 Registered: ' + item.registrationDate + '</p></div><div class="superuser-provider-actions"><button class="superuser-inline-action" type="button" data-provider-id="' + item.id + '">◉ View Details</button><button class="btn superuser-success-btn" type="button" data-provider-approve="' + item.id + '">✓ Approve</button><button class="btn superuser-danger-outline-btn" type="button" data-provider-reject="' + item.id + '">⊘ Reject</button></div></article>';
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
    const data = getData();
    const filtered = data.providers.filter(function (item) {
      const hay = [item.fullName, item.email, item.category, item.location].join(' ').toLowerCase();
      return !term || hay.includes(term);
    });
    tbody.innerHTML = filtered.map(function (item) {
      return '<tr><td>' + item.fullName + '</td><td>' + item.email + '</td><td>' + item.category + '</td><td>' + item.experience + ' years</td><td>' + item.location + '</td><td>' + item.registrationDate + '</td></tr>';
    }).join('') || '<tr><td colspan="6"><div class="superuser-empty-state">No providers found.</div></td></tr>';
  }

  function renderCategories(term) {
    const grid = byId("superuserCategoryGrid");
    if (!grid) return;
    const data = getData();
    const filtered = data.categories.filter(function (item) {
      const hay = [item.name, item.description].join(' ').toLowerCase();
      return !term || hay.includes(term);
    });
    grid.innerHTML = filtered.map(function (item) {
      return '<article class="superuser-category-card"><div class="superuser-category-card-top"><div><h3>' + item.name + '</h3><p class="superuser-category-description">' + item.description + '</p></div><div class="superuser-category-actions"><button class="superuser-category-action" type="button" title="Edit" data-category-edit="' + item.id + '">✎</button><button class="superuser-category-action" type="button" title="Delete" data-category-delete="' + item.id + '">🗑</button></div></div></article>';
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
    if (byId('superuserCustomerCount')) byId('superuserCustomerCount').textContent = data.customers.length;
    if (byId('superuserPendingProviderCount')) byId('superuserPendingProviderCount').textContent = data.pendingProviders.length;
    if (byId('superuserProviderCount')) byId('superuserProviderCount').textContent = data.providers.length;
    if (byId('superuserQuickCustomerCount')) byId('superuserQuickCustomerCount').textContent = data.customers.length;
    if (byId('superuserQuickProviderCount')) byId('superuserQuickProviderCount').textContent = data.providers.length + data.pendingProviders.length;
    if (byId('superuserQuickPendingCount')) byId('superuserQuickPendingCount').textContent = data.pendingProviders.length;
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
    const user = data.customers.find(function (item) { return item.id === userId; }) || data.providers.find(function (item) { return item.id === userId; });
    if (!user) return;
    selectedUserId = user.id;
    byId('superuserUserModalName').textContent = user.fullName;
    byId('superuserUserModalRole').textContent = (user.id.startsWith('CUS') ? 'Customer Details' : 'Provider Details');
    byId('superuserUserRegistrationDate').textContent = user.registrationDate;
    const badge = byId('superuserUserStatusBadge');
    badge.className = 'superuser-chip ' + chipClass(user.status || user.approvalStatus || 'Active');
    badge.textContent = user.status || user.approvalStatus || 'Active';
    const toggleBtn = byId('superuserUserStatusToggleBtn');
    const isBlocked = (user.status || '') === 'Blocked';
    toggleBtn.className = 'btn btn-full ' + (isBlocked ? 'superuser-success-btn' : 'superuser-danger-btn');
    toggleBtn.textContent = isBlocked ? '◎ Activate Customer' : '⊘ Block Customer';
    toggleBtn.onclick = toggleUserStatus;
    openModal('superuserUserModalBackdrop');
  }

  function toggleUserStatus() {
    const data = getData();
    const user = data.customers.find(function (item) { return item.id === selectedUserId; });
    if (!user) return;
    user.status = user.status === 'Blocked' ? 'Active' : 'Blocked';
    setData(data);
    renderCustomers(false, byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    openUserModal(selectedUserId);
    renderRecentRegistrations();
  }

  function openProviderModal(providerId) {
    const data = getData();
    const provider = data.pendingProviders.find(function (item) { return item.id === providerId; });
    if (!provider) return;
    selectedProviderId = provider.id;
    byId('superuserProviderModalName').textContent = provider.fullName;
    byId('superuserProviderModalBody').innerHTML = '<section><h4>Provider Information</h4><div class="superuser-detail-grid"><div class="superuser-detail-field"><span>Email:</span><strong>' + provider.email + '</strong></div><div class="superuser-detail-field"><span>Phone:</span><strong>' + provider.phone + '</strong></div><div class="superuser-detail-field"><span>Category:</span><strong>' + provider.category + '</strong></div><div class="superuser-detail-field"><span>Location:</span><strong>' + provider.location + '</strong></div><div class="superuser-detail-field"><span>Experience:</span><strong>' + provider.experience + ' years</strong></div><div class="superuser-detail-field"><span>Registered:</span><strong>' + provider.registrationDate + '</strong></div></div></section>';
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
    data.providers.unshift(provider);
    data.stats.pendingApprovals = data.pendingProviders.length;
    data.notifications.unshift({ id: 'AN' + Date.now(), text: 'Provider approved - ' + provider.fullName, time: 'Just now', type: 'blue', isNew: true, actionPage: 'superuser-management.html' });
    setData(data);
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    renderProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
    renderNotifications();
    if (closeAfter) closeModal('superuserProviderApprovalModalBackdrop');
  }

  function rejectProvider(providerId, closeAfter) {
    const data = getData();
    data.pendingProviders = data.pendingProviders.filter(function (item) { return item.id !== providerId; });
    data.stats.pendingApprovals = data.pendingProviders.length;
    data.notifications.unshift({ id: 'AN' + Date.now(), text: 'Provider application rejected', time: 'Just now', type: 'red', isNew: true, actionPage: 'superuser-management.html' });
    setData(data);
    renderPendingProviders(byId('superuserManagementSearch') ? byId('superuserManagementSearch').value.trim().toLowerCase() : '');
    updateManagementCounts();
    renderDashboard();
    renderNotifications();
    if (closeAfter) closeModal('superuserProviderApprovalModalBackdrop');
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
      }
    } else {
      title.textContent = 'Add New Category';
      submit.textContent = 'Add Category';
      name.value = '';
      description.value = '';
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
        byId('superuserCategorySuccess').textContent = 'Category updated successfully.';
      } else {
        data.categories.push({ id: 'CAT' + String(Date.now()).slice(-6), name: name, description: description });
        byId('superuserCategorySuccess').textContent = 'Category added successfully.';
      }
      setData(data);
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

  function renderBookingsPage() {
    const statsGrid = byId('superuserBookingStatsGrid');
    if (!statsGrid) return;
    renderNotifications();
    const data = getData();
    const counts = {
      Completed: data.bookings.filter(function (item) { return item.status === 'Completed'; }).length,
      Upcoming: data.bookings.filter(function (item) { return item.status === 'Upcoming'; }).length,
      Requested: data.bookings.filter(function (item) { return item.status === 'Requested'; }).length,
      Cancelled: data.bookings.filter(function (item) { return item.status === 'Cancelled'; }).length
    };
    statsGrid.innerHTML = buildStatCard('Completed', counts.Completed, '', '✔') + buildStatCard('Upcoming', counts.Upcoming, '', '🕘') + buildStatCard('Requested', counts.Requested, '', '!', 'warning') + buildStatCard('Cancelled', counts.Cancelled, '', '✕', 'warning');
    buildBookingSections('');
    const input = byId('superuserBookingSearch');
    if (input) input.addEventListener('input', function () { buildBookingSections(input.value.trim().toLowerCase()); });
  }

  function buildBookingSections(term) {
    const wrapper = byId('superuserBookingSections');
    if (!wrapper) return;
    const data = getData();
    const groups = [
      { key: 'Requested', title: 'Requested Bookings', subtitle: 'bookings awaiting provider approval', className: 'requested', icon: '◔' },
      { key: 'Upcoming', title: 'Upcoming Bookings', subtitle: 'bookings scheduled', className: 'upcoming', icon: '🕘' },
      { key: 'Completed', title: 'Completed Bookings', subtitle: 'bookings successfully completed', className: 'completed', icon: '✓' },
      { key: 'Cancelled', title: 'Cancelled Bookings', subtitle: 'bookings cancelled', className: 'cancelled', icon: '⊗' }
    ];
    wrapper.innerHTML = groups.map(function (group) {
      const items = data.bookings.filter(function (booking) {
        const hay = [booking.id, booking.customer, booking.provider, booking.category, booking.serviceType].join(' ').toLowerCase();
        return booking.status === group.key && (!term || hay.includes(term));
      });
      return '<section class="superuser-booking-section ' + group.className + '"><div class="superuser-section-header"><span>' + group.icon + '</span><div><h2>' + group.title + '</h2><p>' + items.length + ' ' + group.subtitle + '</p></div></div><div class="superuser-booking-card-list">' + (items.map(bookingCardMarkup).join('') || '<div class="superuser-empty-state">No bookings found in this section.</div>') + '</div></section>';
    }).join('');
    wrapper.querySelectorAll('[data-booking-id]').forEach(function (button) {
      button.addEventListener('click', function () { openBookingModal(button.dataset.bookingId); });
    });
  }

  function bookingCardMarkup(item) {
    const reasonLabel = item.status === 'Cancelled' ? 'Reason' : 'Service Time';
    const reasonValue = item.status === 'Cancelled' ? item.reason : item.serviceTime;
    const leftDateLabel = item.status === 'Completed' ? 'Completed' : 'Service Date';
    return '<article class="superuser-booking-card"><div><h3>' + item.id + ' <span class="superuser-chip ' + chipClass(item.status) + '">' + item.status + '</span> <span class="superuser-chip ' + chipClass(item.paymentStatus) + '">' + item.paymentStatus + '</span></h3><p><strong>' + item.category + '</strong> - ' + item.serviceType + '</p><div class="superuser-booking-meta"><span>Customer: ' + item.customer + '</span><span>Provider: ' + item.provider + '</span><span>' + leftDateLabel + ': ' + item.serviceDate + '</span><span>' + reasonLabel + ': ' + reasonValue + '</span><span>Amount: ₹' + item.amount + '</span></div></div><div></div><div class="superuser-booking-action-col"><button class="superuser-inline-action" type="button" data-booking-id="' + item.id + '">◉ View Details</button></div></article>';
  }

  function openBookingModal(bookingId) {
    const data = getData();
    const booking = data.bookings.find(function (item) { return item.id === bookingId; });
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
        const hay = [ticket.id, ticket.customer, ticket.category, ticket.subject, ticket.userType].join(' ').toLowerCase();
        return ticket.status === group.key && (!term || hay.includes(term));
      });
      return '<section class="superuser-booking-section superuser-ticket-section ' + group.className + '"><div class="superuser-section-header"><span>' + group.icon + '</span><div><h2>' + group.title + '</h2><p>' + items.length + ' ' + group.subtitle + '</p></div></div><div class="superuser-ticket-card-list">' + (items.map(ticketCardMarkup).join('') || '<div class="superuser-empty-state">No tickets found in this section.</div>') + '</div></section>';
    }).join('');
    wrapper.querySelectorAll('[data-ticket-id]').forEach(function (button) {
      button.addEventListener('click', function () { openTicketModal(button.dataset.ticketId); });
    });
  }

  function ticketCardMarkup(ticket) {
    return '<article class="superuser-ticket-card"><div><h3>' + ticket.id + ' <span class="superuser-chip ' + chipClass(ticket.status) + '">' + ticket.status + '</span> <span class="superuser-chip ' + chipClass(ticket.userType) + '">' + ticket.userType + '</span></h3><p>' + ticket.subject + '</p><div class="superuser-ticket-mini-meta"><span>Customer: ' + ticket.customer + '</span><span>Booking: ' + ticket.bookingId + '</span><span>Created: ' + ticket.created + '</span></div><div class="superuser-ticket-tags"><span class="superuser-chip warning">' + ticket.category + '</span>' + (ticket.attachments ? '<span class="superuser-chip refunded">📎 ' + ticket.attachments + ' attachment(s)</span>' : '') + '</div></div><div class="superuser-ticket-action-col"><button class="superuser-inline-action" type="button" data-ticket-id="' + ticket.id + '">◉ View Details</button></div></article>';
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
    byId('superuserTicketInfoGrid').innerHTML = '<div class="superuser-detail-field"><span>Created:</span><strong>' + ticket.created + '</strong></div><div class="superuser-detail-field"><span>Booking Ref:</span><strong>' + ticket.bookingId + '</strong></div><div class="superuser-detail-field"><span>User Type:</span><strong>' + ticket.userType + '</strong></div></div>';
    byId('superuserTicketContactGrid').innerHTML = '<div class="superuser-detail-field"><span>Name:</span><strong>' + ticket.customer + '</strong></div><div class="superuser-detail-field"><span>Phone:</span><strong>' + ticket.phone + '</strong></div><div class="superuser-detail-field"><span>Email:</span><strong>' + ticket.email + '</strong></div>';
    byId('superuserTicketDescriptionBlock').textContent = ticket.description;
    const actionRow = byId('superuserTicketActionRow');
    if (ticket.status === 'Escalated') {
      actionRow.innerHTML = '<button class="btn superuser-success-btn" type="button" id="superuserResolveTicketBtn">✓ Resolve Ticket</button><button class="btn btn-outline" type="button" id="superuserAssignTicketBtn">Assign to Support Team</button>';
      byId('superuserResolveTicketBtn').onclick = function () { updateTicketStatus(ticket.id, 'Resolved'); };
      byId('superuserAssignTicketBtn').onclick = function () { updateTicketStatus(ticket.id, 'In Progress'); };
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
    data.notifications.unshift({ id: 'AN' + Date.now(), text: ticket.id + ' moved to ' + status, time: 'Just now', type: status === 'Resolved' ? 'blue' : 'red', isNew: true, actionPage: 'superuser-escalated-tickets.html' });
    setData(data);
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
  requireAccess();
  setupCommonHeader();
  setupNotificationModal();
  wireModalClosers();
  setupCategoryForm();
  renderDashboard();
  renderManagement();
  renderCategoriesPage();
  renderBookingsPage();
  renderTicketsPage();
})();
