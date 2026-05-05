function getServeEaseData() {
  return JSON.parse(localStorage.getItem("serveEaseData")) || {
    categories: [],
    popularServices: []
  };
}

function getCurrentSession() {
  return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
}

function setupHomeHeaderSession() {
  const session = getCurrentSession();
  const loginBtn = document.getElementById("homeLoginRegisterBtn");
  const profileWrap = document.getElementById("homeProfileMenuWrap");
  const profileBtn = document.getElementById("homeProfileBtn");
  const profileDropdown = document.getElementById("homeProfileDropdown");
  const logoutBtn = document.getElementById("homeLogoutBtn");
  const heroBookBtn = document.getElementById("heroBookServiceBtn");

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
      if (heroBookBtn) {
        heroBookBtn.href = "customer-dashboard.html";
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
      if (heroBookBtn) {
        heroBookBtn.href = "provider-dashboard.html";
      }
    }
  } else {
    loginBtn.classList.remove("hidden");
    profileWrap.classList.add("hidden");
    if (heroBookBtn) {
      heroBookBtn.href = "login.html";
    }
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

function renderHomeCategories() {
  const categoryGrid = document.getElementById("categoryGrid");
  if (!categoryGrid) return;

  const data = getServeEaseData();

  if (!data.categories || data.categories.length === 0) {
    categoryGrid.innerHTML = "<p>No categories available right now.</p>";
    return;
  }

  categoryGrid.innerHTML = data.categories
    .map(function (category) {
      return `
        <div class="category-card category-card-image" style="background-image: url('${category.bgImage || ""}')">
          <div class="category-card-overlay">
            <div class="category-icon">${category.icon || "🛎"}</div>
            <h3>${category.name}</h3>
            <a class="btn btn-primary" href="category-services.html?category=${encodeURIComponent(category.id)}">Explore Services</a>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPopularServices() {
  const serviceGrid = document.getElementById("serviceGrid");
  if (!serviceGrid) return;

  const data = getServeEaseData();

  if (!data.popularServices || data.popularServices.length === 0) {
    serviceGrid.innerHTML = "<p>No popular services available right now.</p>";
    return;
  }

  serviceGrid.innerHTML = data.popularServices
    .filter(function (service) {
      return String(service.title || "").toLowerCase() !== "pest control";
    })
    .map(function (service) {
      return `
        <div class="service-card">
          <img src="${service.image}" alt="${service.title}">
          <div class="service-body">
            <h3>${service.title}</h3>
            <p>${service.description}</p>
            <div class="service-meta">
              <span>${service.price}</span>
              <span>⭐ ${service.rating}</span>
            </div>
            <a class="btn btn-primary service-action" href="category-services.html?category=${encodeURIComponent(service.categoryId)}">Book Now</a>
          </div>
        </div>
      `;
    })
    .join("");
}

setupHomeHeaderSession();

if (window.ServeEaseApi && typeof window.ServeEaseApi.hydrateCatalog === "function") {
  window.ServeEaseApi.hydrateCatalog()
    .catch(function (error) {
      console.warn("ServeEase backend catalog unavailable, using local catalog.", error);
    })
    .finally(function () {
      renderHomeCategories();
      renderPopularServices();
    });
} else {
  renderHomeCategories();
  renderPopularServices();
}
