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

function getDefaultPriceForSubService(serviceName, category, fallbackPrice) {
  const name = String(serviceName || "").trim().toLowerCase();

  if (name.indexOf("full home") !== -1) return 899;
  if (name.indexOf("kitchen") !== -1) return 799;
  if (name.indexOf("bathroom") !== -1) return 599;
  if (name.indexOf("floor") !== -1) return 699;

  if (name.indexOf("haircut") !== -1 || name.indexOf("styling") !== -1) return 399;
  if (name.indexOf("facial") !== -1 || name.indexOf("cleanup") !== -1) return 599;
  if (name.indexOf("manicure") !== -1 || name.indexOf("pedicure") !== -1) return 499;

  if (name === "ac" || name.indexOf("ac ") !== -1 || name.indexOf("ac repair") !== -1) return 799;
  if (name.indexOf("washing machine") !== -1) return 599;
  if (name.indexOf("refrigerator") !== -1) return 599;
  if (name.indexOf("chimney") !== -1) return 699;
  if (name.indexOf("laptop") !== -1 || name.indexOf("desktop") !== -1) return 649;
  if (name.indexOf("geyser") !== -1) return 499;
  if (name.indexOf("tv") !== -1) return 499;

  if (name.indexOf("termite") !== -1) return 1199;
  if (name.indexOf("cockroach") !== -1) return 799;
  if (name.indexOf("general pest") !== -1 || name.indexOf("pest") !== -1) return 899;

  if (name.indexOf("door") !== -1) return 499;
  if (name.indexOf("furniture") !== -1) return 449;

  if (name.indexOf("painting") !== -1) return 1299;
  if (name.indexOf("plumbing") !== -1) return 399;
  if (name.indexOf("electrician") !== -1) return 349;

  const numFallback = Number(fallbackPrice);
  return Number.isFinite(numFallback) && numFallback > 0 ? numFallback : 499;
}

function getProviderServicePrice(provider, serviceName) {
  if (!provider) return 499;
  const name = String(serviceName || "").trim().toLowerCase();

  if (provider.servicePricing && typeof provider.servicePricing === "object") {
    for (const key of Object.keys(provider.servicePricing)) {
      if (key.trim().toLowerCase() === name) {
        const val = Number(provider.servicePricing[key]);
        if (Number.isFinite(val) && val > 0) return val;
      }
    }
  }

  if (Array.isArray(provider.services)) {
    const found = provider.services.find(function (s) {
      return s && String(s.name || "").trim().toLowerCase() === name;
    });
    if (found && Number.isFinite(Number(found.price)) && Number(found.price) > 0) {
      return Number(found.price);
    }
  }

  try {
    const keys = [
      "serveEaseProviderModuleData",
      "serveEaseProviderModuleData:" + provider.id,
      "serveEaseProviderModuleData:" + provider.ownerProviderId
    ];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.services)) {
          const match = parsed.services.find(function (s) {
            return s && String(s.name || "").trim().toLowerCase() === name && s.status === "Active";
          });
          if (match && Number.isFinite(Number(match.price)) && Number(match.price) > 0) {
            return Number(match.price);
          }
        }
      }
    }
  } catch (e) {
    /* ignore local parse issues */
  }

  const isCleanpro = String(provider.id || "").toLowerCase().indexOf("cleanpro") !== -1 ||
    String(provider.name || "").toLowerCase().indexOf("cleanpro") !== -1;
  if (isCleanpro) {
    if (name.indexOf("kitchen") !== -1) return 799;
    if (name.indexOf("bathroom") !== -1) return 599;
    if (name.indexOf("floor") !== -1) return 699;
  }

  return getDefaultPriceForSubService(serviceName, provider.category, provider.startingPrice);
}

function getCurrentSession() {
  return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
}

function getStoredCustomerProfile(session) {
  const users = getAppData().users;
  if (!session || !Array.isArray(users)) return null;

  return users.find(function (user) {
    if (!user) return false;
    if (session.userId && user.id === session.userId) return true;
    return user.email && session.email && user.email.toLowerCase() === session.email.toLowerCase();
  }) || null;
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
  const notificationBtn = document.getElementById("checkoutNotificationBtn");
  const notificationPanel = document.getElementById("checkoutNotificationPanel");

  // Checkout has no login button, so it must not prevent the remaining
  // header controls from being initialized.
  if (!profileWrap || !profileDropdown) return;

  const profileLinks = profileDropdown.querySelectorAll("a");

  if (session && (session.role === "customer" || session.role === "provider")) {
    if (loginBtn) loginBtn.classList.add("hidden");
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
    if (loginBtn) loginBtn.classList.remove("hidden");
    profileWrap.classList.add("hidden");
  }

  if (notificationBtn && notificationPanel) {
    notificationBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      notificationPanel.classList.toggle("hidden");
      notificationBtn.setAttribute("aria-expanded", String(!notificationPanel.classList.contains("hidden")));
      profileDropdown.classList.add("hidden");
      if (profileBtn) profileBtn.setAttribute("aria-expanded", "false");
    });

    notificationPanel.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  if (profileBtn && profileDropdown) {
    profileBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      profileDropdown.classList.toggle("hidden");
      profileBtn.setAttribute("aria-expanded", String(!profileDropdown.classList.contains("hidden")));
      if (notificationPanel) notificationPanel.classList.add("hidden");
      if (notificationBtn) notificationBtn.setAttribute("aria-expanded", "false");
    });

    document.addEventListener("click", function () {
      profileDropdown.classList.add("hidden");
      if (profileBtn) profileBtn.setAttribute("aria-expanded", "false");
      if (notificationPanel) notificationPanel.classList.add("hidden");
      if (notificationBtn) notificationBtn.setAttribute("aria-expanded", "false");
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

  function formatDisplayDate(value) {
    return window.ServeEaseDate ? window.ServeEaseDate.formatDate(value) : (value || "");
  }

  function todayISO() {
    return window.ServeEaseDate && typeof window.ServeEaseDate.todayISO === "function"
      ? window.ServeEaseDate.todayISO()
      : new Date().toISOString().slice(0, 10);
  }

function findCategoryById(categoryId) {
  return getAppData().categories.find(function (category) {
    return category.id === categoryId;
  });
}

function providerRatingMarkup(provider) {
  if (window.ServeEaseReviews) {
    const stats = window.ServeEaseReviews.providerStats([provider && provider.id, provider && provider.providerId, provider && provider.name]);
    if (!stats.total) return '<span class="new-provider-label">New Provider</span>';
    return '⭐ ' + stats.average.toFixed(1) + ' (' + stats.total + ' reviews)';
  }
  const reviews = Number(provider && provider.reviews) || 0;
  const rating = Number(provider && provider.rating) || 0;
  if (!reviews || !rating) return '<span class="new-provider-label">New Provider</span>';
  return 'Star ' + rating + ' (' + reviews + ' reviews)';
}

function providerMetricRating(provider) {
  if (window.ServeEaseReviews) {
    const stats = window.ServeEaseReviews.providerStats([provider && provider.id, provider && provider.providerId, provider && provider.name]);
    return stats.total ? { value: '⭐ ' + stats.average.toFixed(1), label: stats.total + ' Reviews' } : { value: 'New', label: 'No reviews yet' };
  }
  const reviews = Number(provider && provider.reviews) || 0;
  const rating = Number(provider && provider.rating) || 0;
  return reviews && rating
    ? { value: 'Star ' + rating, label: reviews + ' Reviews' }
    : { value: 'New', label: 'No reviews yet' };
}

function getProviderReviewItems(provider) {
  if (window.ServeEaseReviews) {
    return window.ServeEaseReviews.forProvider([provider && provider.id, provider && provider.providerId, provider && provider.name]).slice(-3).reverse().map(function (review) {
      return { stars: review.rating, text: review.feedback || 'No feedback provided.', name: 'Verified customer', when: 'Recently' };
    });
  }
  const reviews = Number(provider && provider.reviews) || 0;
  if (!reviews) return [];

  const reviewPool = [
    { stars: 5, text: "Polite, punctual, and the service quality was excellent.", name: "Rahul Sharma", when: "2 days ago" },
    { stars: 4, text: "Good work and clear communication throughout the visit.", name: "Priya Patel", when: "5 days ago" },
    { stars: 5, text: "Professional service. The final result matched what was promised.", name: "Amit Kumar", when: "1 week ago" },
    { stars: 5, text: "Quick response and neat finishing. I would book again.", name: "Sneha Kapoor", when: "3 days ago" },
    { stars: 4, text: "Arrived on time and handled the job carefully.", name: "Vikram Singh", when: "6 days ago" },
    { stars: 5, text: "Very reliable provider and easy booking experience.", name: "Meera Iyer", when: "2 weeks ago" }
  ];
  const seed = String(provider.id || provider.name || "").split("").reduce(function (sum, char) {
    return sum + char.charCodeAt(0);
  }, 0);

  return [0, 1, 2].map(function (offset) {
    return reviewPool[(seed + offset) % reviewPool.length];
  });
}

function providerDisplayImage(provider) {
  if (!provider) return "";
  const profilePhoto = String(provider.profilePhoto || "").trim();
  if (/^(https?:\/\/|\/)?uploads\/profiles\//i.test(profilePhoto) || /^https?:\/\/[^/]+\/uploads\/profiles\//i.test(profilePhoto)) return profilePhoto;
  return provider.image || "assets/images/home-cleaning/clean1.jpg";
}

function providerAccountState(provider) {
  return String(provider && (provider.accountStatus || provider.status || provider.approvalStatus || provider.verificationStatus) || "Active")
    .trim().toLowerCase().replace(/[_-]+/g, " ");
}

function providerIsDiscoverable(provider) {
  const state = providerAccountState(provider);
  return !["suspended", "blocked", "rejected", "verification rejected", "under verification", "pending", "pending approval"].includes(state) && provider.verified !== false;
}

function providerIdentityKey(provider) {
  const registrationId = String(provider && (provider.providerCatalogId || provider.catalogProviderId) || "").trim().toLowerCase();
  const rawSource = registrationId || String(provider && provider.id || "").trim().toLowerCase();
  const rawId = String(provider && (rawSource || provider.providerId || provider.ownerProviderId) || "").trim().toLowerCase();
  const base = provider && provider.category && provider.cityId
    ? rawId.replace(new RegExp("-" + String(provider.category).toLowerCase() + "-" + Number(provider.cityId) + "$"), "")
    : rawId;
  if (base) return base;
  return [provider && provider.name, provider && provider.category, provider && provider.cityId].map(function (value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  }).join("|");
}

function findProviderById(providerId) {
  return getAppData().providers.find(function (provider) {
    return provider.id === providerId;
  });
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

    var categoryRows = cityProviders.filter(function (p) {
      return p.category === categoryId && providerIsDiscoverable(p);
    });
    var providersByIdentity = {};
    categoryRows.forEach(function (provider) {
      const key = providerIdentityKey(provider);
      const existing = providersByIdentity[key];
      if (!existing || (provider.ownerProviderId && !existing.ownerProviderId) || (provider.subServices || []).length > (existing.subServices || []).length) providersByIdentity[key] = provider;
    });
    var allCategoryProviders = Object.keys(providersByIdentity).map(function (key) { return providersByIdentity[key]; });

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
            <img src="${providerDisplayImage(provider)}" alt="${provider.name}" onerror="this.onerror=null;this.src='assets/images/home-cleaning/clean1.jpg';">
            ${provider.availableToday ? `<span class="provider-status">Available Today</span>` : ""}
          </div>
          <div class="provider-card-body">
            <h3>${provider.name}</h3>
            <p class="provider-muted">${provider.years}+ Years Experience</p>

            <div class="provider-offered">
              <strong>Services Offered:</strong>
              ${chips}
            </div>

            <div class="rating-row">${providerRatingMarkup(provider)}</div>

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

function formatAvailabilitySlot(slot) {
  return String(slot || "").replace(/\b(\d{1,2}):(\d{2})\b/g, function (match, hour, minute) {
    const value = Number(hour);
    const suffix = value >= 12 ? "PM" : "AM";
    const displayHour = value % 12 || 12;
    return String(displayHour).padStart(2, "0") + ":" + minute + " " + suffix;
  }).replace(/-/g, " – ");
}

function availabilityDateParts(item) {
  const match = String(item.date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { weekday: item.dayOfWeek || "Date", date: item.date || "" };

  const localDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return {
    weekday: item.dayOfWeek || localDate.toLocaleDateString(undefined, { weekday: "long" }),
    date: localDate.toLocaleDateString(undefined, { day: "2-digit", month: "short" })
  };
}

async function initAvailabilityBookingFlow(bookingCard, provider, session) {
  let selectedDate = "";
  let selectedSlot = "";
  let selectedService = "";
  let availabilityDates = [];

  function renderLoading() {
    bookingCard.innerHTML = `
      <h2>Book Appointment</h2>
      <div class="availability-loading" role="status" aria-live="polite" aria-label="Loading available appointments">
        <span>Finding available appointments...</span>
      </div>
      <div class="availability-skeleton-group" aria-hidden="true">
        <span class="availability-skeleton-label"></span>
        <div class="availability-skeleton-row availability-date-skeletons"><span></span><span></span><span></span><span></span></div>
        <span class="availability-skeleton-label"></span>
        <div class="availability-skeleton-row availability-slot-skeletons"><span></span><span></span></div>
      </div>
    `;
  }

  function renderError() {
    bookingCard.innerHTML = `
      <h2>Book Appointment</h2>
      <div class="availability-state availability-error" role="alert">
        <span class="availability-state-icon" aria-hidden="true">⚠</span>
        <h3>We couldn't load availability</h3>
        <p>Unable to load provider availability. Please try again.</p>
        <button class="secondary-btn" type="button" id="retryAvailabilityBtn" aria-label="Retry loading provider availability">Retry</button>
      </div>
    `;
    document.getElementById("retryAvailabilityBtn").addEventListener("click", loadAvailability);
  }

  function renderEmpty() {
    bookingCard.innerHTML = `
      <h2>Book Appointment</h2>
      <div class="availability-state availability-empty-state">
        <span class="availability-state-icon" aria-hidden="true">🗓</span>
        <h3>No appointments available for the next 7 days.</h3>
        <p>Please check back soon or choose another provider.</p>
      </div>
      <button class="btn btn-primary" type="button" disabled>Proceed to Booking</button>
    `;
  }

  function renderTimes() {
    const slotContainer = document.getElementById("availabilityTimeSlots");
    const selected = availabilityDates.find(function (item) { return item.date === selectedDate; });
    const slots = selected && Array.isArray(selected.slots) ? selected.slots : [];

    if (!selectedDate || !slots.length) {
      slotContainer.innerHTML = '<p class="availability-empty-slots">Select a date to view available time slots.</p>';
      return;
    }

    slotContainer.innerHTML = slots.map(function (slot) {
      const isSelected = slot === selectedSlot;
      return `<button class="time-slot-card${isSelected ? " is-selected" : ""}" type="button" data-slot="${encodeURIComponent(slot)}" aria-pressed="${isSelected}" aria-label="Select time slot ${formatAvailabilitySlot(slot)}">${formatAvailabilitySlot(slot)}</button>`;
    }).join("");

    slotContainer.querySelectorAll("[data-slot]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedSlot = decodeURIComponent(button.dataset.slot);
        renderBookingForm();
      });
    });
  }

  const activeServices = Array.isArray(provider.services) && provider.services.length
    ? provider.services.filter(function (s) { return s && s.status !== "Inactive"; })
    : [];
  const displaySubServices = activeServices.length
    ? activeServices.map(function (s) { return s.name; })
    : (Array.isArray(provider.subServices) && provider.subServices.length ? provider.subServices : [provider.name]);

  function renderBookingForm() {
    bookingCard.innerHTML = `
      <h2>Book Appointment</h2>
      <label for="bookingService">Select Service</label>
      <select id="bookingService">
        ${displaySubServices.map(function (service) {
          const price = getProviderServicePrice(provider, service);
          return `<option value="${service}" ${selectedService === service ? "selected" : ""}>${service} - ${formatCurrency(price)}</option>`;
        }).join("")}
      </select>
      <section class="availability-section" aria-labelledby="availableDatesHeading">
        <h3 id="availableDatesHeading">Available Dates</h3>
        <div class="availability-date-list" role="listbox" aria-label="Available booking dates">
          ${availabilityDates.filter(function (item) {
            return Array.isArray(item.slots) && item.slots.length > 0;
          }).map(function (item) {
            const parts = availabilityDateParts(item);
            const isSelected = item.date === selectedDate;
            return `<button class="availability-date-card${isSelected ? " is-selected" : ""}" type="button" data-date="${item.date}" role="option" aria-selected="${isSelected}" aria-label="Select ${parts.weekday}, ${parts.date}"><span>${parts.weekday.slice(0, 3)}</span><strong>${parts.date}</strong></button>`;
          }).join("")}
        </div>
      </section>
      <section class="availability-section" aria-labelledby="availableSlotsHeading">
        <h3 id="availableSlotsHeading">Available Time Slots</h3>
        <div class="availability-time-list" id="availabilityTimeSlots"></div>
      </section>
      <button class="btn btn-primary" type="button" id="proceedToBookingBtn" ${selectedDate && selectedSlot ? "" : "disabled"}>Proceed to Booking</button>
    `;

    renderTimes();

    const serviceSelect = document.getElementById("bookingService");
    if (serviceSelect) {
      if (!selectedService || !displaySubServices.includes(selectedService)) selectedService = serviceSelect.value;
      serviceSelect.value = selectedService;
      serviceSelect.addEventListener("change", function () { selectedService = serviceSelect.value; });
    }

    bookingCard.querySelectorAll("[data-date]").forEach(function (button) {
      button.addEventListener("click", function () {
        selectedDate = button.dataset.date;
        selectedSlot = "";
        renderBookingForm();
      });
    });

    document.getElementById("proceedToBookingBtn").addEventListener("click", function () {
      selectedService = document.getElementById("bookingService").value;
      const unitPrice = getProviderServicePrice(provider, selectedService);
      const financeEngine = window.ServeEaseFinance;
      const breakdown = financeEngine
        ? financeEngine.calculateBreakdown(unitPrice)
        : {
            serviceFee: unitPrice,
            taxRate: 10,
            taxAmount: Math.round(unitPrice * 10) / 100,
            platformFeeRate: 5,
            platformFeeAmount: Math.round(unitPrice * 5) / 100,
            customerTotal: Math.round(unitPrice * 1.15 * 100) / 100,
            providerCommissionRate: 10,
            providerCommissionAmount: Math.round(unitPrice * 10) / 100,
            providerPayout: Math.round(unitPrice * 0.90 * 100) / 100
          };
      const platformFee = breakdown.platformFeeAmount;
      const tax = breakdown.taxAmount;
      const totalAmount = breakdown.customerTotal;

      if (!(session && session.role === "customer")) {
        if (window.ServeEaseBookingDraft) {
          window.ServeEaseBookingDraft.save({
            providerId: provider.id,
            providerName: provider.name,
            providerCategory: provider.category,
            providerLocation: provider.location,
            serviceName: selectedService,
            serviceId: (activeServices.find(function (item) { return item.name === selectedService; }) || {}).id || selectedService,
            selectedDate: selectedDate,
            selectedTimeSlot: selectedSlot,
            amount: totalAmount,
            serviceFee: unitPrice,
            servicePrice: unitPrice,
            taxRate: breakdown.taxRate,
            tax: tax,
            taxAmount: tax,
            platformFeeRate: breakdown.platformFeeRate,
            platformFee: platformFee,
            platformFeeAmount: platformFee,
            customerTotal: totalAmount,
            totalAmount: totalAmount,
            providerCommissionRate: breakdown.providerCommissionRate,
            providerCommissionAmount: breakdown.providerCommissionAmount,
            providerPayout: breakdown.providerPayout
          });
        }
        window.location.href = "login.html";
        return;
      }
      if (!selectedDate || !selectedSlot) return;

      if (window.ServeEaseBookingDraft) window.ServeEaseBookingDraft.clear();
      window.location.href =
        `booking-checkout.html?provider=${encodeURIComponent(provider.id)}` +
        `&service=${encodeURIComponent(selectedService)}` +
        `&price=${encodeURIComponent(unitPrice)}` +
        `&date=${encodeURIComponent(selectedDate)}` +
        `&time=${encodeURIComponent(selectedSlot)}`;
    });
  }

  async function loadAvailability() {
    renderLoading();
    try {
      if (!window.ServeEaseApi || typeof window.ServeEaseApi.getProviderAvailability !== "function") {
        throw new Error("Availability API is unavailable.");
      }
      const response = await window.ServeEaseApi.getProviderAvailability(provider.id);
      availabilityDates = response && Array.isArray(response.dates) ? response.dates : [];
      if (!availabilityDates.some(function (item) { return Array.isArray(item.slots) && item.slots.length; })) {
        renderEmpty();
        return;
      }
      renderBookingForm();
    } catch (error) {
      console.warn("Unable to load provider availability.", error);
      renderError();
    }
  }

  loadAvailability();
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

  const ratingMetric = providerMetricRating(provider);
  const activeServices = Array.isArray(provider.services) && provider.services.length
    ? provider.services.filter(function (s) { return s && s.status !== "Inactive"; })
    : [];
  const displaySubServices = activeServices.length
    ? activeServices.map(function (s) { return s.name; })
    : (Array.isArray(provider.subServices) && provider.subServices.length ? provider.subServices : [provider.name]);

  summaryCard.innerHTML = `
    <div class="summary-top">
      <img src="${providerDisplayImage(provider)}" alt="${provider.name}">
      <div>
        <h1>${provider.name} <span class="verified-badge">Verified Professional</span></h1>
        <div class="summary-services">
          <strong>Services Offered:</strong>
          <div class="subservice-list">
            ${displaySubServices.map(function (service) {
              return `<span class="tag-pill">${service}</span>`;
            }).join("")}
          </div>
        </div>

        <div class="metrics-row">
          <div class="metric-item"><strong>${ratingMetric.value}</strong><span>${ratingMetric.label}</span></div>
          <div class="metric-item"><strong>👜 ${provider.years}+ Years</strong><span>Experience</span></div>
          <div class="metric-item"><strong>📍 ${provider.distance}</strong><span>Away</span></div>
          <div class="metric-item"><strong>✅ ${provider.jobsDone}+</strong><span>Jobs Done</span></div>
        </div>

        <p class="location-line">📍 ${provider.location}</p>
      </div>
    </div>
  `;

  if (pricingCard) {
    const pricingRows = displaySubServices.map(function (service) {
      const price = getProviderServicePrice(provider, service);
      return `
        <div class="price-table-row">
          <span>${service}</span>
          <strong>${formatCurrency(price)}</strong>
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
    const providerReviews = getProviderReviewItems(provider);

    reviewsCard.innerHTML = `
      <h2>Customer Reviews</h2>
      ${providerReviews.length ? providerReviews.map(function (review) {
        return `
          <div class="review-card">
            <div class="review-stars" aria-label="${review.stars} out of 5 stars">${window.ServeEaseReviews.stars(review.stars)}</div>
            <p class="review-feedback">"${review.text}"</p>
            <div class="review-meta"><strong>${review.name}</strong> - ${provider.subServices[0]} - ${review.when}</div>
          </div>
        `;
      }).join("") : '<div class="empty-state-card">No customer reviews yet. This provider is newly verified.</div>'}
    `;
  }
  if (bookingCard) {
    initAvailabilityBookingFlow(bookingCard, provider, session);
  }

  if (similarProviders) {
    const similar = data.providers.filter(function (item) {
      return item.category === provider.category && item.id !== provider.id;
    }).slice(0, 3);

    similarProviders.innerHTML = similar.map(function (item) {
      return `
        <div class="similar-card">
          <img src="${providerDisplayImage(item)}" alt="${item.name}">
          <div class="similar-card-body">
            <h3>${item.name}</h3>
            <div class="rating-row">${providerRatingMarkup(item)}</div>
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

function showCheckoutValidationError(message, errorBox, field) {
  if (errorBox) errorBox.textContent = message;

  if (field) {
    const fieldTop = window.scrollY + field.getBoundingClientRect().top;
    window.scrollTo(0, Math.max(0, fieldTop - (window.innerHeight / 2) + (field.offsetHeight / 2)));
    field.focus({ preventScroll: true });
  }
}

async function submitBookingCheckout() {
  const session = getCurrentSession();
  if (!(session && session.role === "customer")) {
    window.location.href = "login.html";
    return;
  }

  const bookingDraft = window.ServeEaseBookingDraft && window.ServeEaseBookingDraft.read();
  const providerId = (bookingDraft && bookingDraft.providerId) || getQueryParam("provider");
  const service = (bookingDraft && bookingDraft.serviceName) || getQueryParam("service") || "Kitchen Cleaning";
  const date = (bookingDraft && bookingDraft.selectedDate) || getQueryParam("date") || "2026-03-15";
  const time = (bookingDraft && bookingDraft.selectedTimeSlot) || getQueryParam("time") || "10:00 AM - 12:00 PM";

  const provider = findProviderById(providerId);
  if (!provider) return;

  const name = document.getElementById("checkoutCustomerName")?.value.trim() || "";
  const phone = document.getElementById("checkoutCustomerPhone")?.value.trim() || "";
  const email = document.getElementById("checkoutCustomerEmail")?.value.trim() || "";
  const address = document.getElementById("checkoutCustomerAddress")?.value.trim() || "";
  const customerErrorBox = document.getElementById("checkoutCustomerError");
  const errorBox = document.getElementById("checkoutError");

  if (customerErrorBox) customerErrorBox.textContent = "";
  if (errorBox) errorBox.textContent = "";

  if (!name) {
    showCheckoutValidationError("Enter your name.", customerErrorBox, document.getElementById("checkoutCustomerName"));
    return;
  }

  if (!/^[A-Za-z ]{3,60}$/.test(name)) {
    showCheckoutValidationError("Enter a valid customer name.", customerErrorBox, document.getElementById("checkoutCustomerName"));
    return;
  }

  if (!phone) {
    showCheckoutValidationError("Enter your phone number.", customerErrorBox, document.getElementById("checkoutCustomerPhone"));
    return;
  }

  if (!/^\+?\d[\d ]{9,14}$/.test(phone)) {
    showCheckoutValidationError("Enter a valid phone number.", customerErrorBox, document.getElementById("checkoutCustomerPhone"));
    return;
  }

  if (!email) {
    showCheckoutValidationError("Enter your email address.", customerErrorBox, document.getElementById("checkoutCustomerEmail"));
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showCheckoutValidationError("Enter a valid email address.", customerErrorBox, document.getElementById("checkoutCustomerEmail"));
    return;
  }

  if (!address) {
    showCheckoutValidationError("Enter the service address.", customerErrorBox, document.getElementById("checkoutCustomerAddress"));
    return;
  }

  const queriedPrice = Number(getQueryParam("price"));
  const resolvedServicePrice = (Number.isFinite(queriedPrice) && queriedPrice > 0)
    ? queriedPrice
    : getProviderServicePrice(provider, service);
  const servicePrice = Number(bookingDraft && (bookingDraft.serviceFee || bookingDraft.servicePrice)) || resolvedServicePrice;
  const financeEngine = window.ServeEaseFinance;
  const breakdown = financeEngine
    ? financeEngine.calculateBreakdown(servicePrice)
    : {
        serviceFee: servicePrice,
        taxRate: 10,
        taxAmount: Math.round(servicePrice * 10) / 100,
        platformFeeRate: 5,
        platformFeeAmount: Math.round(servicePrice * 5) / 100,
        customerTotal: Math.round(servicePrice * 1.15 * 100) / 100,
        providerCommissionRate: 10,
        providerCommissionAmount: Math.round(servicePrice * 10) / 100,
        providerPayout: Math.round(servicePrice * 0.90 * 100) / 100
      };
  const platformFee = breakdown.platformFeeAmount;
  const tax = breakdown.taxAmount;
  const total = breakdown.customerTotal;

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
      showCheckoutValidationError("Please fill all card details.", errorBox, document.getElementById("paymentCardHolder"));
      return;
    }

    if (!/^[A-Za-z ]{3,60}$/.test(cardHolder)) {
      showCheckoutValidationError("Enter a valid cardholder name.", errorBox, document.getElementById("paymentCardHolder"));
      return;
    }

    if (!isValidLuhn(card)) {
      showCheckoutValidationError("Enter a valid 16-digit card number.", errorBox, document.getElementById("paymentCardNumber"));
      return;
    }

    if (!isValidExpiryMMYY(expiry)) {
      showCheckoutValidationError("Expiry date must be in MM-YY format and should not be expired.", errorBox, document.getElementById("paymentExpiryDate"));
      return;
    }

    if (!/^\d{3}$/.test(cvv)) {
      showCheckoutValidationError("CVV must be exactly 3 digits.", errorBox, document.getElementById("paymentCvv"));
      return;
    }
  }

  if (paymentType === "upi") {
    const upiId = document.getElementById("paymentUpiId")?.value.trim() || "";
    const upiApp = document.getElementById("paymentUpiApp")?.value.trim() || "";

    if (!upiId || !upiApp) {
      showCheckoutValidationError("Please enter valid UPI details.", errorBox, document.getElementById(upiId ? "paymentUpiApp" : "paymentUpiId"));
      return;
    }
    paymentMethod = "UPI - " + upiApp;
  }

  if (paymentType === "netbanking") {
    const bankName = document.getElementById("paymentBankName")?.value.trim() || "";

    if (!bankName) {
      showCheckoutValidationError("Please select your bank.", errorBox, document.getElementById("paymentBankName"));
      return;
    }
    paymentMethod = "Net Banking - " + bankName;
  }

  const checkoutSession = getCurrentSession();
  const customerModuleKey = getCustomerModuleStorageKey(checkoutSession);
  const customerModuleData = JSON.parse(
    localStorage.getItem(customerModuleKey) ||
    '{"bookings":[],"payments":[],"tickets":[]}'
  );

  const createdAt = new Date().toISOString();
  const workflow = window.ServeEaseBookingWorkflow;
  const normalizedCustomerEmail = String(email).trim().toLowerCase();

  let bookingEntry = {
    id: "",
    customerId: checkoutSession.userId || "",
    service: service,
    provider: provider.name,
    providerId: provider.id,
    date: date,
    time: time,
    address: address,
    status: "Pending",
    amount: total,
    serviceFee: servicePrice,
    taxRate: breakdown.taxRate,
    taxAmount: tax,
    platformFeeRate: breakdown.platformFeeRate,
    platformFeeAmount: platformFee,
    customerTotal: total,
    providerCommissionRate: breakdown.providerCommissionRate,
    providerCommissionAmount: breakdown.providerCommissionAmount,
    providerPayout: breakdown.providerPayout,
    category: provider.category || "Home Service",
    paymentMethod: paymentMethod,
    customerName: name,
    customerPhone: phone,
    customerEmail: normalizedCustomerEmail,
    createdAt: createdAt
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
        serviceFee: servicePrice,
        taxRate: breakdown.taxRate,
        taxAmount: tax,
        platformFeeRate: breakdown.platformFeeRate,
        platformFeeAmount: platformFee,
        customerTotal: total,
        providerCommissionRate: breakdown.providerCommissionRate,
        providerCommissionAmount: breakdown.providerCommissionAmount,
        providerPayout: breakdown.providerPayout,
        status: "Pending",
        paymentMethod: paymentMethod,
        customerName: name,
        customerPhone: phone,
        customerId: checkoutSession.userId || "",
        customerEmail: normalizedCustomerEmail,
        category: provider.category || "Home Service",
        paymentStatus: "Pending"
      });

      if (apiBooking && apiBooking.id) {
        bookingEntry = {
          id: workflow ? workflow.normalizeReference(apiBooking.id) : apiBooking.id,
          customerId: apiBooking.customerId || checkoutSession.userId || "",
          service: apiBooking.service,
          provider: apiBooking.provider,
          providerId: apiBooking.providerId || provider.id,
          date: apiBooking.date,
          time: apiBooking.time,
          address: apiBooking.address,
          status: apiBooking.status,
          amount: apiBooking.amount,
          serviceFee: apiBooking.serviceFee || servicePrice,
          taxRate: apiBooking.taxRate || breakdown.taxRate,
          taxAmount: apiBooking.taxAmount || tax,
          platformFeeRate: apiBooking.platformFeeRate || breakdown.platformFeeRate,
          platformFeeAmount: apiBooking.platformFeeAmount || platformFee,
          customerTotal: apiBooking.customerTotal || total,
          providerCommissionRate: apiBooking.providerCommissionRate || breakdown.providerCommissionRate,
          providerCommissionAmount: apiBooking.providerCommissionAmount || breakdown.providerCommissionAmount,
          providerPayout: apiBooking.providerPayout || breakdown.providerPayout,
          paymentMethod: apiBooking.paymentMethod || paymentMethod,
          customerName: apiBooking.customerName || name,
          customerPhone: apiBooking.customerPhone || phone,
          customerEmail: apiBooking.customerEmail || email,
          category: apiBooking.category || apiBooking.status,
          paymentStatus: apiBooking.paymentStatus || "Pending",
          createdAt: apiBooking.createdAt || createdAt
        };
      }
    } catch (error) {
      if (errorBox) errorBox.textContent = "Booking could not be created. Please try again.";
      console.warn("ServeEase canonical booking creation failed.", error);
      return;
    }
  }

  if (!bookingEntry.id) {
    if (errorBox) errorBox.textContent = "Booking could not be created. Please try again.";
    return;
  }

  const paymentRef = `TXN-${new Date().getFullYear()}-${4500 + customerModuleData.payments.length + 1}`;

  const paymentEntry = {
    id: paymentRef,
    bookingRef: bookingEntry.id,
    service: service,
    provider: provider.name,
    method: paymentMethod,
    serviceFee: servicePrice,
    taxRate: breakdown.taxRate,
    taxAmount: tax,
    platformFeeRate: breakdown.platformFeeRate,
    platformFeeAmount: platformFee,
    customerTotal: total,
    amount: total,
    providerCommissionRate: breakdown.providerCommissionRate,
    providerCommissionAmount: breakdown.providerCommissionAmount,
    providerPayout: breakdown.providerPayout,
    date: formatDisplayDate(new Date()),
    status: "Pending"
  };

  if (workflow) workflow.normalizeData(customerModuleData);
  customerModuleData.bookings.unshift(bookingEntry);
  customerModuleData.payments.unshift(paymentEntry);
  localStorage.setItem(customerModuleKey, JSON.stringify(customerModuleData));

  if (window.ServeEaseBookingDraft) window.ServeEaseBookingDraft.clear();

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

  const bookingDraft = window.ServeEaseBookingDraft && window.ServeEaseBookingDraft.read();
  if (bookingDraft && window.ServeEaseBookingDraft.hasCheckoutRedirect()) {
    window.ServeEaseBookingDraft.clearRedirect();
  }

  const providerId = (bookingDraft && bookingDraft.providerId) || getQueryParam("provider");
  const service = (bookingDraft && bookingDraft.serviceName) || getQueryParam("service") || "Kitchen Cleaning";
  const date = (bookingDraft && bookingDraft.selectedDate) || getQueryParam("date") || "2026-03-15";
  const time = (bookingDraft && bookingDraft.selectedTimeSlot) || getQueryParam("time") || "10:00 AM - 12:00 PM";

  const provider = findProviderById(providerId);
  if (!provider) {
    summaryCard.innerHTML = "<p>Booking details not found.</p>";
    return;
  }

  const category = findCategoryById(provider.category);
  const serviceName = service;
  const queriedPrice = Number(getQueryParam("price"));
  const resolvedServicePrice = (Number.isFinite(queriedPrice) && queriedPrice > 0)
    ? queriedPrice
    : getProviderServicePrice(provider, serviceName);
  const servicePrice = Number(bookingDraft && (bookingDraft.serviceFee || bookingDraft.servicePrice)) || resolvedServicePrice;
  const financeEngine = window.ServeEaseFinance;
  const breakdown = financeEngine
    ? financeEngine.calculateBreakdown(servicePrice)
    : {
        serviceFee: servicePrice,
        taxRate: 10,
        taxAmount: Math.round(servicePrice * 10) / 100,
        platformFeeRate: 5,
        platformFeeAmount: Math.round(servicePrice * 5) / 100,
        customerTotal: Math.round(servicePrice * 1.15 * 100) / 100,
        providerCommissionRate: 10,
        providerCommissionAmount: Math.round(servicePrice * 10) / 100,
        providerPayout: Math.round(servicePrice * 0.90 * 100) / 100
      };
  const platformFee = breakdown.platformFeeAmount;
  const tax = breakdown.taxAmount;
  const total = breakdown.customerTotal;

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
    <div class="checkout-info-row"><span>Booking Date</span><strong>${formatDisplayDate(date)}</strong></div>
    <div class="checkout-info-row"><span>Time Slot</span><strong>${time}</strong></div>
  `;

  const customerDetailsCard = document.getElementById("customerDetailsCard");
  if (customerDetailsCard) {
    const customerProfile = getStoredCustomerProfile(session);
    const customerName = (customerProfile && customerProfile.fullName) || session.fullName || "";
    const customerPhone = (customerProfile && customerProfile.phone) || session.phone || "";
    const customerEmail = (customerProfile && customerProfile.email) || session.email || "";

    customerDetailsCard.innerHTML = `
      <h2>Customer Details</h2>
      <label>Customer Name</label>
      <input type="text" id="checkoutCustomerName" value="${customerName}" required maxlength="60" autocomplete="name" />
      <label>Phone Number</label>
      <input type="tel" id="checkoutCustomerPhone" value="${customerPhone}" required inputmode="tel" maxlength="15" autocomplete="tel" />
      <label>Email Address</label>
      <input type="email" id="checkoutCustomerEmail" value="${customerEmail}" required maxlength="120" autocomplete="email" />
      <label>Service Address</label>
      <textarea id="checkoutCustomerAddress" required maxlength="300" autocomplete="street-address" placeholder="Enter the address where you need the service"></textarea>
      <small class="error" id="checkoutCustomerError" aria-live="polite"></small>
    `;

    customerDetailsCard.querySelectorAll("input, textarea").forEach(function (field) {
      field.addEventListener("input", function () {
        const customerError = document.getElementById("checkoutCustomerError");
        if (customerError) customerError.textContent = "";
      });
    });
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
            <input type="password" id="paymentCvv" placeholder="123" inputmode="numeric" maxlength="3" />
          </div>
        </div>
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
          this.value = this.value.replace(/\D/g, "").slice(0, 3);
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
          <option value="Amazon Pay">Amazon Pay</option>
          <option value="Navi">Navi</option>
          <option value="MobiKwik">MobiKwik</option>
          <option value="CRED">CRED</option>
          <option value="WhatsApp Pay">WhatsApp Pay</option>
          <option value="Airtel Payments Bank">Airtel Payments Bank</option>
          <option value="Freecharge">Freecharge</option>
          <option value="super.money">super.money</option>
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
          <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
          <option value="Bank of Baroda">Bank of Baroda</option>
          <option value="Punjab National Bank">Punjab National Bank</option>
          <option value="Canara Bank">Canara Bank</option>
          <option value="Union Bank of India">Union Bank of India</option>
          <option value="IndusInd Bank">IndusInd Bank</option>
          <option value="IDFC FIRST Bank">IDFC FIRST Bank</option>
          <option value="Yes Bank">Yes Bank</option>
          <option value="Federal Bank">Federal Bank</option>
          <option value="AU Small Finance Bank">AU Small Finance Bank</option>
          <option value="RBL Bank">RBL Bank</option>
        </select>
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
      <div class="checkout-info-row"><span>Service Fee</span><strong>${formatCurrency(servicePrice)}</strong></div>
      <div class="checkout-info-row"><span>Tax (${breakdown.taxRate}%)</span><strong>${formatCurrency(tax)}</strong></div>
      <div class="checkout-info-row"><span>Platform Fee (${breakdown.platformFeeRate}%)</span><strong>${formatCurrency(platformFee)}</strong></div>
      <div class="checkout-total-row"><span>Total Payable</span><strong>${formatCurrency(total)}</strong></div>
    `;
  }

  const confirmBookingCard = document.getElementById("confirmBookingCard");
  if (confirmBookingCard) {
    confirmBookingCard.innerHTML = `
      <h2>Confirm Your Booking</h2>
      <div class="checkout-info-row"><span>Service:</span><strong>${serviceName}</strong></div>
      <div class="checkout-info-row"><span>Provider:</span><strong>${provider.name}</strong></div>
      <div class="checkout-info-row"><span>Date:</span><strong>${formatDisplayDate(date)}</strong></div>
      <div class="checkout-info-row"><span>Time:</span><strong>${time}</strong></div>
      <div class="checkout-total-row compact"><span>Total:</span><strong>${formatCurrency(total)}</strong></div>
      <button class="btn btn-primary btn-full" type="button" onclick="submitBookingCheckout()">Confirm & Pay</button>
      <button class="secondary-btn full-width-btn" type="button" id="cancelCheckoutBtn">Cancel Booking</button>
    `;
  }

  const cancelBtn = document.getElementById("cancelCheckoutBtn");
  if (cancelBtn) {
    cancelBtn.addEventListener("click", function () {
      if (window.ServeEaseBookingDraft) window.ServeEaseBookingDraft.clear();
      window.location.href = `provider-profile.html?provider=${encodeURIComponent(provider.id)}`;
    });
  }
}

function initBookingSubmittedPage() {
  const card = document.getElementById("bookingSubmissionCard");
  if (!card) return;

  const bookingRef = getQueryParam("bookingRef") || "BOOK-20260101-0000-8136";
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
      <span>Your booking request has been sent successfully. The provider must confirm it before your scheduled service date. You'll be notified once it is accepted or rejected.</span>
    </div>

    <div class="success-info-card">
      <div class="checkout-info-row"><span>Booking Reference</span><strong class="highlight-text">${bookingRef}</strong></div>
      <div class="checkout-info-row"><span>Status</span><strong class="pending-pill">⌛ Pending</strong></div>
      <div class="checkout-info-row"><span>Service</span><strong>${service}</strong></div>
      <div class="checkout-info-row"><span>Provider</span><strong>${provider}</strong></div>
      <div class="checkout-info-row"><span>Date</span><strong>${formatDisplayDate(date)}</strong></div>
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



