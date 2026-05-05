(function () {
  const currentSession = sessionStorage.getItem("serveEaseSession");
  if (currentSession) {
    try {
      JSON.parse(currentSession);
    } catch (error) {
      sessionStorage.removeItem("serveEaseSession");
    }
  }
})();

function getAppData() {
  return JSON.parse(localStorage.getItem("serveEaseData")) || {
    categories: [],
    providers: []
  };
}

function getCurrentSession() {
  return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
}

function isDemoCustomerSession(session) {
  return session && (session.email === "user@serveease.com" || session.userId === "CUS001");
}

function getCustomerModuleStorageKey(session) {
  if (isDemoCustomerSession(session)) return "serveEaseCustomerModuleData";
  const suffix = (session && (session.userId || session.email)) || "guest";
  return "serveEaseCustomerModuleData:" + String(suffix).toLowerCase();
}

function setupSharedHeaderSession() {
  const session = getCurrentSession();
  const loginBtn = document.getElementById("sharedLoginRegisterBtn");
  const profileWrap = document.getElementById("sharedProfileMenuWrap");
  const profileBtn = document.getElementById("sharedProfileBtn");
  const profileDropdown = document.getElementById("sharedProfileDropdown");
  const logoutBtn = document.getElementById("sharedLogoutBtn");

  if (!loginBtn || !profileWrap || !profileDropdown) return;

  const profileLinks = profileDropdown.querySelectorAll("a");

  if (session && (session.role === "customer" || session.role === "provider")) {
    loginBtn.classList.add("hidden");
    profileWrap.classList.remove("hidden");

    if (session.role === "customer") {
      if (profileLinks[0]) {
        profileLinks[0].href = "customer-profile.html";
        profileLinks[0].textContent = "My Profile";
      }
      if (profileLinks[1]) {
        profileLinks[1].href = "customer-dashboard.html";
        profileLinks[1].textContent = "Go to Dashboard";
      }
    }

    if (session.role === "provider") {
      if (profileLinks[0]) {
        profileLinks[0].href = "provider-account.html";
        profileLinks[0].textContent = "My Profile";
      }
      if (profileLinks[1]) {
        profileLinks[1].href = "provider-dashboard.html";
        profileLinks[1].textContent = "Go to Dashboard";
      }
    }
  } else {
    loginBtn.classList.remove("hidden");
    profileWrap.classList.add("hidden");
  }

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
    });

    document.addEventListener("click", function () {
      profileDropdown.classList.add("hidden");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      sessionStorage.removeItem("serveEaseSession");
      window.location.href = "index.html";
    });
  }
}

function getQueryParam(name) {
  const params = new URLSearchParams(window.location.search);
  return params.get(name);
}

function formatCurrency(value) {
  return `₹${value}`;
}

function findCategoryById(categoryId) {
  return getAppData().categories.find(function (category) {
    return category.id === categoryId;
  });
}

function findProviderById(providerId) {
  return getAppData().providers.find(function (provider) {
    return provider.id === providerId;
  });
}

function getProviderTimeSlots(provider) {
  if (provider && Array.isArray(provider.availabilitySlots) && provider.availabilitySlots.length) {
    return provider.availabilitySlots;
  }

  const slotMap = {
    "cleanpro-service": ["09:00 AM - 11:00 AM", "11:30 AM - 01:30 PM", "03:00 PM - 05:00 PM"],
    "fresh-space-cleaning": ["08:30 AM - 10:30 AM", "01:00 PM - 03:00 PM", "05:30 PM - 07:00 PM"],
    "urban-shine-cleaner": ["10:00 AM - 12:00 PM", "12:30 PM - 02:30 PM"],
    "sparkle-home-care": ["09:30 AM - 11:30 AM", "02:00 PM - 04:00 PM", "06:00 PM - 08:00 PM"],
    "beauty-express": ["10:00 AM - 11:00 AM", "12:00 PM - 01:00 PM", "04:00 PM - 05:00 PM"],
    "stylehub-home-salon": ["09:00 AM - 10:30 AM", "01:30 PM - 03:00 PM", "05:00 PM - 06:30 PM"]
  };

  return slotMap[provider && provider.id] || ["10:00 AM - 12:00 PM", "02:00 PM - 04:00 PM", "05:00 PM - 07:00 PM"];
}

function isValidLuhn(cardNumber) {
  const digits = String(cardNumber).replace(/\D/g, "");
  return /^\d{16}$/.test(digits);
}

function isValidExpiryMMYY(value) {
  if (!/^(0[1-9]|1[0-2])-\d{2}$/.test(value)) return false;
  const [monthText, yearText] = value.split("-");
  const month = Number(monthText);
  const year = 2000 + Number(yearText);
  const expiry = new Date(year, month, 0, 23, 59, 59, 999);
  return expiry.getTime() >= Date.now();
}

function setupFooterLinks() {
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
}function initCategoryServicesPage() {
  const providerGrid = document.getElementById("providerGrid");
  if (!providerGrid) return;

  const data = getAppData();
  const categoryId = getQueryParam("category");
  const category = findCategoryById(categoryId);

  if (!category) {
    providerGrid.innerHTML = "<p>Category not found.</p>";
    return;
  }

  const title = document.getElementById("categoryTitle");
  const subtitle = document.getElementById("categorySubtitle");
  const breadcrumbs = document.getElementById("categoryBreadcrumbs");
  const serviceTypeFilter = document.getElementById("serviceTypeFilter");
  const priceFilter = document.getElementById("priceFilter");
  const priceValue = document.getElementById("priceValue");
  const resultsCount = document.getElementById("resultsCount");
  const resetBtn = document.getElementById("resetFiltersBtn");

  title.textContent = "Available Service Providers";
  subtitle.textContent = `Choose from trusted ${category.name.toLowerCase()} professionals near your location.`;
  breadcrumbs.innerHTML = `<a href="index.html">Home</a> &nbsp; › &nbsp; Categories &nbsp; › &nbsp; ${category.name} Services`;

  const serviceOptions = category.subServices.length ? category.subServices : [category.name];
  serviceTypeFilter.innerHTML = [
    `<option value="all">All ${category.name} Services</option>`,
    ...serviceOptions.map(function (service) {
      return `<option value="${service}">${service}</option>`;
    })
  ].join("");

  /* ── Core rendering — uses ServeEaseLocation.getProvidersByCity() ── */
  function renderProviders() {
    const selectedService = serviceTypeFilter.value;
    const selectedPrice = Number(priceFilter.value);

    /* Get city from location module (single function, no duplication) */
    var cityId = (window.ServeEaseLocation && window.ServeEaseLocation.getSelectedCity())
      ? window.ServeEaseLocation.getSelectedCity().id
      : 1;

    /* Use getProvidersByCity() — ready to swap for API call later */
    var cityProviders = window.ServeEaseLocation
      ? window.ServeEaseLocation.getProvidersByCity(cityId)
      : (data.providers || []);

    var allCategoryProviders = cityProviders.filter(function (p) {
      return p.category === categoryId;
    });

    var filteredProviders = allCategoryProviders.filter(function (provider) {
      if (provider.startingPrice > selectedPrice) return false;
      if (selectedService !== "all" && !provider.subServices.includes(selectedService)) return false;
      return true;
    });

    var cityName = (window.ServeEaseLocation && window.ServeEaseLocation.getSelectedCity())
      ? window.ServeEaseLocation.getSelectedCity().name
      : 'your city';

    resultsCount.textContent = `Showing ${filteredProviders.length} of ${allCategoryProviders.length} providers in ${cityName}`;

    if (!filteredProviders.length) {
      providerGrid.innerHTML = allCategoryProviders.length === 0
        ? `<div class="empty-state-card">No services available in this city yet</div>`
        : `<div class="empty-state-card">No providers found for the selected filters.</div>`;
      return;
    }

    providerGrid.innerHTML = filteredProviders.map(function (provider) {
      const chips = provider.subServices.map(function (item) {
        return `<span class="tag-pill">${item}</span>`;
      }).join("");

      return `
        <div class="provider-card">
          <div class="provider-image-wrap">
            <img src="${provider.image}" alt="${provider.name}">
            ${provider.availableToday ? `<span class="provider-status">Available Today</span>` : ""}
          </div>
          <div class="provider-card-body">
            <h3>${provider.name}</h3>
            <p class="provider-muted">${provider.years}+ Years Experience</p>

            <div class="provider-offered">
              <strong>Services Offered:</strong>
              ${chips}
            </div>

            <div class="rating-row">⭐ ${provider.rating} &nbsp; (${provider.reviews} reviews)</div>

            <div class="provider-bottom">
              <div>${provider.distance} away</div>
              <div class="provider-price">
                <span>Starting at</span>
                <strong>${formatCurrency(provider.startingPrice)}</strong>
              </div>
            </div>

            <a class="btn btn-primary provider-cta" href="provider-profile.html?provider=${encodeURIComponent(provider.id)}">View Profile &amp; Book</a>
          </div>
        </div>
      `;
    }).join("");
  }

  priceValue.textContent = formatCurrency(priceFilter.value);

  serviceTypeFilter.addEventListener("change", renderProviders);
  priceFilter.addEventListener("input", function () {
    priceValue.textContent = formatCurrency(priceFilter.value);
    renderProviders();
  });

  resetBtn.addEventListener("click", function () {
    serviceTypeFilter.value = "all";
    priceFilter.value = 10000;
    priceValue.textContent = "₹10000";
    renderProviders();
  });

  /* Re-render when city changes (no page reload) */
  if (window.ServeEaseLocation) {
    window.ServeEaseLocation.onCityChange(function () {
      renderProviders();
    });
  }

  renderProviders();
}

function initProviderProfilePage() {
  const summaryCard = document.getElementById("providerSummaryCard");
  if (!summaryCard) return;

  const data = getAppData();
  const session = getCurrentSession();
  const providerId = getQueryParam("provider");
  const provider = data.providers.find(function (item) {
    return item.id === providerId;
  });

  if (!provider) {
    summaryCard.innerHTML = "<p>Provider not found.</p>";
    return;
  }

  const category = findCategoryById(provider.category);
  const pricingCard = document.getElementById("pricingCard");
  const reviewsCard = document.getElementById("reviewsCard");
  const bookingCard = document.getElementById("bookingCard");
  const similarProviders = document.getElementById("similarProviders");
  const breadcrumbs = document.getElementById("providerBreadcrumbs");
  const backLink = document.getElementById("backToCategoryLink");

  if (backLink) {
    backLink.href = `category-services.html?category=${encodeURIComponent(provider.category)}`;
  }

  if (breadcrumbs) {
    breadcrumbs.innerHTML = `<a href="index.html">Home</a> &nbsp; › &nbsp; Services &nbsp; › &nbsp; ${category ? category.name : ""} &nbsp; › &nbsp; ${provider.name}`;
  }

  summaryCard.innerHTML = `
    <div class="summary-top">
      <img src="${provider.image}" alt="${provider.name}">
      <div>
        <h1>${provider.name} <span class="verified-badge">Verified Professional</span></h1>
        <div class="summary-services">
          <strong>Services Offered:</strong>
          <div class="subservice-list">
            ${provider.subServices.map(function (service) {
              return `<span class="tag-pill">${service}</span>`;
            }).join("")}
          </div>
        </div>

        <div class="metrics-row">
          <div class="metric-item"><strong>⭐ ${provider.rating}</strong><span>${provider.reviews} Reviews</span></div>
          <div class="metric-item"><strong>👜 ${provider.years}+ Years</strong><span>Experience</span></div>
          <div class="metric-item"><strong>📍 ${provider.distance}</strong><span>Away</span></div>
          <div class="metric-item"><strong>✅ ${provider.jobsDone}+</strong><span>Jobs Done</span></div>
        </div>

        <p class="location-line">📍 ${provider.location}</p>
      </div>
    </div>
  `;

  if (pricingCard) {
    const pricingRows = provider.subServices.map(function (service) {
      return `
        <div class="price-table-row">
          <span>${service}</span>
          <strong>${formatCurrency(provider.startingPrice)}</strong>
        </div>
      `;
    }).join("");

    pricingCard.innerHTML = `
      <h2>Service Pricing</h2>
      ${pricingRows}
      <div class="info-note">
        Final price may vary depending on service requirements and specific needs.
      </div>
    `;
  }

  if (reviewsCard) {
    const demoReviews = [
      { stars: 5, text: "Excellent service! Very professional and thorough. Highly recommended.", name: "Rahul Sharma", when: "2 days ago" },
      { stars: 4, text: "Amazing work! Arrived on time and completed the job efficiently.", name: "Priya Patel", when: "5 days ago" },
      { stars: 5, text: "Very satisfied with the service quality. Will definitely book again.", name: "Amit Kumar", when: "1 week ago" }
    ];

    reviewsCard.innerHTML = `
      <h2>Customer Reviews</h2>
      ${demoReviews.map(function (review) {
        return `
          <div class="review-item">
            <div class="review-stars">${"★".repeat(review.stars)}${"☆".repeat(5 - review.stars)}</div>
            <p>"${review.text}"</p>
            <div class="review-meta"><strong>${review.name}</strong> • ${provider.subServices[0]} • ${review.when}</div>
          </div>
        `;
      }).join("")}
    `;
  }

  if (bookingCard) {
    const providerSlots = getProviderTimeSlots(provider);

    bookingCard.innerHTML = `
      <h2>Book Appointment</h2>
      <label for="bookingService">Select Service</label>
      <select id="bookingService">
        ${provider.subServices.map(function (service) {
          return `<option value="${service}">${service}</option>`;
        }).join("")}
      </select>

      <label for="bookingDate">Select Date</label>
      <input type="date" id="bookingDate" required>
      <small class="error" id="bookingDateError"></small>

      <label for="bookingTimeSlot">Available Time Slot</label>
      <select id="bookingTimeSlot">
        ${providerSlots.map(function (slot) {
          return `<option value="${slot}">${slot}</option>`;
        }).join("")}
      </select>
      <small class="input-help-text">Choose a slot provided by ${provider.name}.</small>

      <button class="btn btn-primary" type="button" id="proceedToBookingBtn">Proceed to Booking</button>
    `;

    const proceedBtn = document.getElementById("proceedToBookingBtn");
    const serviceSelect = document.getElementById("bookingService");
    const dateInput = document.getElementById("bookingDate");
    const slotSelect = document.getElementById("bookingTimeSlot");

    if (proceedBtn) {
      proceedBtn.addEventListener("click", function () {
        if (!(session && session.role === "customer")) {
          window.location.href = "login.html";
          return;
        }

        const selectedService = serviceSelect.value;
        const bookingDateError = document.getElementById("bookingDateError");
        if (bookingDateError) bookingDateError.textContent = "";
        const selectedDate = dateInput.value.trim();
        if (!selectedDate) {
          if (bookingDateError) bookingDateError.textContent = "Please select a booking date before proceeding.";
          dateInput.focus();
          return;
        }
        const timeSlot = slotSelect && slotSelect.value ? slotSelect.value : providerSlots[0] || "10:00 AM - 12:00 PM";

        window.location.href =
          `booking-checkout.html?provider=${encodeURIComponent(provider.id)}` +
          `&service=${encodeURIComponent(selectedService)}` +
          `&date=${encodeURIComponent(selectedDate)}` +
          `&time=${encodeURIComponent(timeSlot)}`;
      });
    }
  }

  if (similarProviders) {
    const similar = data.providers.filter(function (item) {
      return item.category === provider.category && item.id !== provider.id;
    }).slice(0, 3);

    similarProviders.innerHTML = similar.map(function (item) {
      return `
        <div class="similar-card">
          <img src="${item.image}" alt="${item.name}">
          <div class="similar-card-body">
            <h3>${item.name}</h3>
            <div class="rating-row">⭐ ${item.rating} (${item.reviews})</div>
            <div class="provider-price">
              <span>Starting at</span>
              <strong>${formatCurrency(item.startingPrice)}</strong>
            </div>
            <a class="secondary-btn" href="provider-profile.html?provider=${encodeURIComponent(item.id)}">View Profile</a>
          </div>
        </div>
      `;
    }).join("");
  }
}

async function submitBookingCheckout() {
  const session = getCurrentSession();
  if (!(session && session.role === "customer")) {
    window.location.href = "login.html";
    return;
  }

  const providerId = getQueryParam("provider");
  const service = getQueryParam("service") || "Kitchen Cleaning";
  const date = getQueryParam("date") || "2026-03-15";
  const time = getQueryParam("time") || "10:00 AM - 12:00 PM";

  const provider = findProviderById(providerId);
  if (!provider) return;

  const name = document.getElementById("checkoutCustomerName")?.value.trim() || "";
  const phone = document.getElementById("checkoutCustomerPhone")?.value.trim() || "";
  const email = document.getElementById("checkoutCustomerEmail")?.value.trim() || "";
  const address = document.getElementById("checkoutCustomerAddress")?.value.trim() || "";
  const errorBox = document.getElementById("checkoutError");

  if (errorBox) errorBox.textContent = "";

  if (!name || !phone || !email || !address) {
    if (errorBox) errorBox.textContent = "Please fill all customer details.";
    return;
  }

  if (!/^[A-Za-z ]{3,60}$/.test(name)) {
    if (errorBox) errorBox.textContent = "Enter a valid customer name.";
    return;
  }

  if (!/^\+?\d[\d ]{9,14}$/.test(phone)) {
    if (errorBox) errorBox.textContent = "Enter a valid phone number.";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (errorBox) errorBox.textContent = "Enter a valid email address.";
    return;
  }

  const servicePrice = provider.startingPrice;
  const platformFee = 50;
  const tax = 40;
  const total = servicePrice + platformFee + tax;

  const activePayment = document.querySelector(".payment-option.active-option");
  const paymentType = activePayment ? activePayment.dataset.paymentOption : "card";

  let paymentMethod = "Credit / Debit Card";

  if (paymentType === "card") {
    paymentMethod = "Credit / Debit Card";
    const cardHolder = document.getElementById("paymentCardHolder")?.value.trim() || "";
    const card = document.getElementById("paymentCardNumber")?.value.trim() || "";
    const expiry = document.getElementById("paymentExpiryDate")?.value.trim() || "";
    const cvv = document.getElementById("paymentCvv")?.value.trim() || "";

    if (!cardHolder || !card || !expiry || !cvv) {
      if (errorBox) errorBox.textContent = "Please fill all card details.";
      return;
    }

    if (!/^[A-Za-z ]{3,60}$/.test(cardHolder)) {
      if (errorBox) errorBox.textContent = "Enter a valid cardholder name.";
      return;
    }

    if (!isValidLuhn(card)) {
      if (errorBox) errorBox.textContent = "Enter a valid 16-digit card number.";
      return;
    }

    if (!isValidExpiryMMYY(expiry)) {
      if (errorBox) errorBox.textContent = "Expiry date must be in MM-YY format and should not be expired.";
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      if (errorBox) errorBox.textContent = "CVV must be 3 or 4 digits only.";
      return;
    }
  }

  if (paymentType === "upi") {
    paymentMethod = "UPI";
    const upiId = document.getElementById("paymentUpiId")?.value.trim() || "";
    const upiApp = document.getElementById("paymentUpiApp")?.value.trim() || "";

    if (!upiId || !upiApp) {
      if (errorBox) errorBox.textContent = "Please enter valid UPI details.";
      return;
    }
  }

  if (paymentType === "netbanking") {
    paymentMethod = "Net Banking";
    const bankName = document.getElementById("paymentBankName")?.value.trim() || "";
    const holder = document.getElementById("paymentAccountHolder")?.value.trim() || "";

    if (!bankName || !holder) {
      if (errorBox) errorBox.textContent = "Please enter valid net banking details.";
      return;
    }
  }

  const checkoutSession = getCurrentSession();
  const customerModuleKey = getCustomerModuleStorageKey(checkoutSession);
  const customerModuleData = JSON.parse(
    localStorage.getItem(customerModuleKey) ||
    '{"bookings":[],"payments":[],"tickets":[]}'
  );

  const bookingRef = `BOOK-2026-${8000 + customerModuleData.bookings.length + 1}`;
  const paymentRef = `TXN-2026-${4500 + customerModuleData.payments.length + 1}`;

  let bookingEntry = {
    id: bookingRef,
    service: service,
    provider: provider.name,
    providerId: provider.id,
    date: date,
    time: time,
    address: address,
    status: "Pending",
    amount: total,
    category: "Pending",
    customerName: name,
    customerPhone: phone,
    customerEmail: email
  };

  if (window.ServeEaseApi && typeof window.ServeEaseApi.createBooking === "function") {
    try {
      const apiBooking = await window.ServeEaseApi.createBooking({
        service: service,
        provider: provider.name,
        providerId: provider.id,
        date: date,
        time: time,
        address: address,
        amount: total,
        status: "Pending",
        customerName: name,
        customerPhone: phone,
        customerEmail: email
      });

      if (apiBooking && apiBooking.id) {
        bookingEntry = {
          id: apiBooking.id,
          service: apiBooking.service,
          provider: apiBooking.provider,
          providerId: apiBooking.providerId || provider.id,
          date: apiBooking.date,
          time: apiBooking.time,
          address: apiBooking.address,
          status: apiBooking.status,
          amount: apiBooking.amount,
          customerName: apiBooking.customerName || name,
          customerPhone: apiBooking.customerPhone || phone,
          customerEmail: apiBooking.customerEmail || email,
          category: apiBooking.category || apiBooking.status
        };
      }
    } catch (error) {
      console.warn("ServeEase backend unavailable, using local booking storage.", error);
    }
  }

  const paymentEntry = {
    id: paymentRef,
    bookingRef: bookingEntry.id,
    service: service,
    provider: provider.name,
    method: paymentMethod,
    amount: total,
    date: new Date().toLocaleDateString("en-GB"),
    status: "Successful"
  };

  customerModuleData.bookings.unshift(bookingEntry);
  customerModuleData.payments.unshift(paymentEntry);
  localStorage.setItem(customerModuleKey, JSON.stringify(customerModuleData));

  window.location.href =
    "booking-request-submitted.html" +
    `?bookingRef=${encodeURIComponent(bookingEntry.id)}` +
    `&service=${encodeURIComponent(service)}` +
    `&provider=${encodeURIComponent(provider.name)}` +
    `&date=${encodeURIComponent(date)}` +
    `&time=${encodeURIComponent(time)}` +
    `&amount=${encodeURIComponent(total)}`;
}

function initBookingCheckoutPage() {
  const summaryCard = document.getElementById("bookingSummaryCard");
  if (!summaryCard) return;

  const session = getCurrentSession();
  if (!(session && session.role === "customer")) {
    window.location.href = "login.html";
    return;
  }

  const providerId = getQueryParam("provider");
  const service = getQueryParam("service") || "Kitchen Cleaning";
  const date = getQueryParam("date") || "2026-03-15";
  const time = getQueryParam("time") || "10:00 AM - 12:00 PM";

  const provider = findProviderById(providerId);
  if (!provider) {
    summaryCard.innerHTML = "<p>Booking details not found.</p>";
    return;
  }

  const category = findCategoryById(provider.category);
  const serviceName = service;
  const servicePrice = provider.startingPrice;
  const platformFee = 50;
  const tax = 40;
  const total = servicePrice + platformFee + tax;

  const breadcrumbs = document.getElementById("checkoutBreadcrumbs");
  if (breadcrumbs) {
    breadcrumbs.innerHTML = `
      <a href="index.html">Home</a> &nbsp;›&nbsp;
      <a href="category-services.html?category=${encodeURIComponent(provider.category)}">Service Providers</a> &nbsp;›&nbsp;
      <a href="provider-profile.html?provider=${encodeURIComponent(provider.id)}">Provider Profile</a> &nbsp;›&nbsp;
      <strong>Booking & Checkout</strong>
    `;
  }

  summaryCard.innerHTML = `
    <h2>Booking Summary</h2>
    <div class="checkout-info-row"><span>Service Name</span><strong>${serviceName}</strong></div>
    <div class="checkout-info-row"><span>Service Provider</span><strong>${provider.name}</strong></div>
    <div class="checkout-info-row"><span>Service Category</span><strong>${category ? category.name : "-"}</strong></div>
    <div class="checkout-info-row"><span>Service Location</span><strong>${provider.location}</strong></div>
    <div class="checkout-info-row"><span>Booking Date</span><strong>${date}</strong></div>
    <div class="checkout-info-row"><span>Time Slot</span><strong>${time}</strong></div>
  `;

  const customerDetailsCard = document.getElementById("customerDetailsCard");
  if (customerDetailsCard) {
    customerDetailsCard.innerHTML = `
      <h2>Customer Details</h2>
      <label>Customer Name</label>
      <input type="text" id="checkoutCustomerName" value="${session.fullName}" />
      <label>Phone Number</label>
      <input type="text" id="checkoutCustomerPhone" value="+91 98765 43210" />
      <label>Email Address</label>
      <input type="text" id="checkoutCustomerEmail" value="${session.email}" />
      <label>Service Address</label>
      <textarea id="checkoutCustomerAddress">123 MG Road, Chennai, Tamil Nadu</textarea>
    `;
  }

  const paymentMethodCard = document.getElementById("paymentMethodCard");
  if (paymentMethodCard) {
    paymentMethodCard.innerHTML = `
      <h2>Payment Method</h2>

      <div class="payment-option active-option" data-payment-option="card">💳 Credit / Debit Card</div>
      <div class="payment-option" data-payment-option="upi">📱 UPI</div>
      <div class="payment-option" data-payment-option="netbanking">🏦 Net Banking</div>

      <div class="payment-form-box" id="paymentDynamicFields"></div>
      <small class="error" id="checkoutError"></small>
    `;
  }

  function renderPaymentFields(type) {
    const fieldsBox = document.getElementById("paymentDynamicFields");
    if (!fieldsBox) return;

    if (type === "card") {
      fieldsBox.innerHTML = `
        <label>Cardholder Name</label>
        <input type="text" id="paymentCardHolder" placeholder="Name as on card" maxlength="60" />
        <label>Card Number</label>
        <input type="text" id="paymentCardNumber" placeholder="1234 5678 9012 3456" inputmode="numeric" maxlength="19" />
        <div class="two-col-form">
          <div>
            <label>Expiry Date</label>
            <input type="text" id="paymentExpiryDate" placeholder="MM-YY" inputmode="numeric" maxlength="5" />
          </div>
          <div>
            <label>CVV</label>
            <input type="password" id="paymentCvv" placeholder="123" inputmode="numeric" maxlength="4" />
          </div>
        </div>
        <small class="input-help-text">Use a valid 16-digit card, expiry in MM-YY format, and a 3 or 4 digit CVV.</small>
      `;

      const cardInput = document.getElementById("paymentCardNumber");
      const expiryInput = document.getElementById("paymentExpiryDate");
      const cvvInput = document.getElementById("paymentCvv");

      if (cardInput) {
        cardInput.addEventListener("input", function () {
          const digits = this.value.replace(/\D/g, "").slice(0, 16);
          this.value = digits.replace(/(.{4})/g, "$1 ").trim();
        });
      }

      if (expiryInput) {
        expiryInput.addEventListener("input", function () {
          let digits = this.value.replace(/\D/g, "").slice(0, 4);
          if (digits.length >= 2) {
            let month = parseInt(digits.slice(0, 2), 10);
            if (month > 12) digits = "12" + digits.slice(2);
            else if (month === 0) digits = "01" + digits.slice(2);
          } else if (digits.length === 1 && parseInt(digits, 10) > 1) {
            digits = "0" + digits;
          }
          this.value = digits.length >= 3 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits;
        });
      }

      if (cvvInput) {
        cvvInput.addEventListener("input", function () {
          this.value = this.value.replace(/\D/g, "").slice(0, 4);
        });
      }
    }

    if (type === "upi") {
      fieldsBox.innerHTML = `
        <label>UPI ID</label>
        <input type="text" id="paymentUpiId" placeholder="example@upi" />
        <label>UPI App</label>
        <select id="paymentUpiApp">
          <option value="">Select UPI App</option>
          <option value="Google Pay">Google Pay</option>
          <option value="PhonePe">PhonePe</option>
          <option value="Paytm">Paytm</option>
          <option value="BHIM">BHIM</option>
        </select>
      `;
    }

    if (type === "netbanking") {
      fieldsBox.innerHTML = `
        <label>Select Bank</label>
        <select id="paymentBankName">
          <option value="">Select Bank</option>
          <option value="State Bank of India">State Bank of India</option>
          <option value="HDFC Bank">HDFC Bank</option>
          <option value="ICICI Bank">ICICI Bank</option>
          <option value="Axis Bank">Axis Bank</option>
        </select>
        <label>Account Holder Name</label>
        <input type="text" id="paymentAccountHolder" placeholder="Enter account holder name" />
      `;
    }

    document.querySelectorAll(".payment-option").forEach(function (item) {
      item.classList.remove("active-option");
    });

    const active = document.querySelector(`[data-payment-option="${type}"]`);
    if (active) {
      active.classList.add("active-option");
    }
  }

  renderPaymentFields("card");

  document.querySelectorAll(".payment-option").forEach(function (item) {
    item.addEventListener("click", function () {
      renderPaymentFields(this.dataset.paymentOption);
    });
  });

  const pricingBreakdownCard = document.getElementById("pricingBreakdownCard");
  if (pricingBreakdownCard) {
    pricingBreakdownCard.innerHTML = `
      <h2>Pricing Breakdown</h2>
      <div class="checkout-info-row"><span>Service Price</span><strong>${formatCurrency(servicePrice)}</strong></div>
      <div class="checkout-info-row"><span>Platform Service Fee</span><strong>${formatCurrency(platformFee)}</strong></div>
      <div class="checkout-info-row"><span>Taxes (GST)</span><strong>${formatCurrency(tax)}</strong></div>
      <div class="checkout-total-row"><span>Total Amount</span><strong>${formatCurrency(total)}</strong></div>

    `;
  }

  const confirmBookingCard = document.getElementById("confirmBookingCard");
  if (confirmBookingCard) {
    confirmBookingCard.innerHTML = `
      <h2>Confirm Your Booking</h2>
      <div class="checkout-info-row"><span>Service:</span><strong>${serviceName}</strong></div>
      <div class="checkout-info-row"><span>Provider:</span><strong>${provider.name}</strong></div>
      <div class="checkout-info-row"><span>Date:</span><strong>${date}</strong></div>
      <div class="checkout-info-row"><span>Time:</span><strong>${time}</strong></div>
      <div class="checkout-total-row compact"><span>Total:</span><strong>${formatCurrency(total)}</strong></div>
      <button class="btn btn-primary btn-full" type="button" onclick="submitBookingCheckout()">Confirm & Pay</button>
      <button class="secondary-btn full-width-btn" type="button" id="cancelCheckoutBtn">Cancel Booking</button>
    `;
  }

  const cancelBtn = document.getElementById("cancelCheckoutBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      window.location.href = `provider-profile.html?provider=${encodeURIComponent(provider.id)}`;
    });
  }
}

function initBookingSubmittedPage() {
  const card = document.getElementById("bookingSubmissionCard");
  if (!card) return;

  const bookingRef = getQueryParam("bookingRef") || "BOOK-2026-8136";
  const service = getQueryParam("service") || "Kitchen Cleaning";
  const provider = getQueryParam("provider") || "CleanPro Services";
  const date = getQueryParam("date") || "15 March 2026";
  const time = getQueryParam("time") || "10:00 AM - 12:00 PM";
  const amount = getQueryParam("amount") || "889";

  card.innerHTML = `
    <div class="success-icon-wrap">⌛</div>
    <h1>Booking Request Submitted!<br>Payment Successful!</h1>
    <p class="success-subtext">
      Your booking request is currently <strong>pending</strong> confirmation.<br>
      The service provider will review and accept your booking. You will be notified once it's confirmed.
    </p>

    <div class="awaiting-box">
      <strong>🕒 Awaiting Provider Confirmation</strong>
      <span>Typical response time: 15-30 minutes</span>
    </div>

    <div class="success-info-card">
      <div class="checkout-info-row"><span>Booking Reference</span><strong class="highlight-text">${bookingRef}</strong></div>
      <div class="checkout-info-row"><span>Status</span><strong class="pending-pill">⌛ Pending</strong></div>
      <div class="checkout-info-row"><span>Service</span><strong>${service}</strong></div>
      <div class="checkout-info-row"><span>Provider</span><strong>${provider}</strong></div>
      <div class="checkout-info-row"><span>Date</span><strong>${date}</strong></div>
      <div class="checkout-info-row"><span>Time</span><strong>${time}</strong></div>
      <div class="checkout-total-row compact"><span>Total Amount</span><strong>${formatCurrency(amount)}</strong></div>
    </div>

    <div class="next-steps-box">
      <h3>ⓘ What happens next?</h3>
      <ul>
        <li>Service provider will review your booking request</li>
        <li>You'll receive a notification once it's confirmed</li>
        <li>Payment will be processed after confirmation</li>
        <li>You can track status in "My Bookings" section</li>
      </ul>
    </div>

    <div class="success-actions">
      <a class="btn btn-primary btn-full" href="my-bookings.html">View My Bookings</a>
      <a class="secondary-btn success-secondary-btn" href="customer-dashboard.html">Back to Dashboard</a>
    </div>
  `;
}

function startServeEasePages() {
  setupSharedHeaderSession();
  initCategoryServicesPage();
  initProviderProfilePage();
  initBookingCheckoutPage();
  initBookingSubmittedPage();
  setupFooterLinks();
}

if (window.ServeEaseApi && typeof window.ServeEaseApi.hydrateCatalog === "function") {
  window.ServeEaseApi.hydrateCatalog()
    .catch(function (error) {
      console.warn("ServeEase backend catalog unavailable, using local catalog.", error);
    })
    .finally(startServeEasePages);
} else {
  startServeEasePages();
}
