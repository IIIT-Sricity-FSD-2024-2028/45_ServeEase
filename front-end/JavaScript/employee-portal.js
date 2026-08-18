(function () {
  const auth = window.ServeEaseEmployeeAuth;
  if (!auth) {
    window.location.href = "login.html";
    return;
  }

  const session = auth.requireEmployeePortalAccess();
  if (!session) return;

  auth.annotateBody(session);

  function createIdentityCard() {
    if (document.getElementById("employeeIdentityCard")) return;

    const hero = document.querySelector(".portal-hero");
    if (!hero || !hero.parentNode) return;

    const card = document.createElement("section");
    card.id = "employeeIdentityCard";
    card.className = "panel-card portal-identity-card";

    const isEmployee = auth.isEmployeeSession(session);
    const accessibleDepartments = auth.getAccessibleDepartments(session)
      .map(function (department) { return department.name; })
      .join(", ");

    card.innerHTML = [
      '<div class="portal-identity-copy">',
      '  <span class="portal-identity-kicker">' + (isEmployee ? "Employee Access" : "Administrative Access") + '</span>',
      '  <h2>' + (isEmployee ? "Welcome, " + session.fullName : "Welcome, " + (session.fullName || "Superuser")) + '</h2>',
      '  <div class="portal-identity-meta">',
      '    <span><strong>' + (isEmployee ? "Employee ID" : "Role") + '</strong>' + (isEmployee ? session.employeeId : session.role) + '</span>',
      '    <span><strong>Department</strong>' + (isEmployee ? session.department : "Administration") + '</span>',
      '    <span><strong>Workspace</strong>' + (accessibleDepartments || "All departments") + '</span>',
      '  </div>',
      '</div>',
      isEmployee ? '<button class="btn btn-outline" type="button" id="employeeLogoutBtn">Logout</button>' : ''
    ].join("");

    hero.insertAdjacentElement("afterend", card);

    const logoutBtn = document.getElementById("employeeLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", auth.logoutEmployee);
    }
  }

  function updateHeaderNavigation() {
    const isEmployee = auth.isEmployeeSession(session);
    const navLinks = document.querySelectorAll(".portal-nav a");
    navLinks.forEach(function (link) {
      const route = auth.getRouteKey(link.getAttribute("href") || "");
      if (isEmployee && ["administration.html", "superuser-dashboard.html"].includes(route)) {
        link.hidden = true;
      }
      if (isEmployee && route === "login.html") {
        link.textContent = "Logout";
        link.setAttribute("href", "#");
        link.addEventListener("click", function (event) {
          event.preventDefault();
          auth.logoutEmployee();
        });
      }
    });
  }

  function updateActorPortalStrip() {
    const strip = document.querySelector(".portal-strip");
    if (strip && auth.isEmployeeSession(session)) {
      strip.hidden = true;
    }
  }

  function updateHeroActions() {
    if (auth.isAdminSession(session)) return;

    document.querySelectorAll(".portal-hero-actions a").forEach(function (link) {
      link.hidden = !auth.canAccessRoute(link.getAttribute("href") || "", session);
    });
  }

  function updateDepartmentAccess() {
    const isAdmin = auth.isAdminSession(session);
    const cards = document.querySelectorAll(".department-card");
    let visibleCards = 0;

    cards.forEach(function (card) {
      const links = Array.from(card.querySelectorAll(".department-links a"));
      let visibleLinks = 0;

      links.forEach(function (link) {
        const allowed = isAdmin || auth.canAccessRoute(link.getAttribute("href") || "", session);
        link.hidden = !allowed;
        if (allowed) visibleLinks += 1;
      });

      card.hidden = visibleLinks === 0;
      if (!card.hidden) visibleCards += 1;
    });

    if (!visibleCards && !document.getElementById("employeeNoAccessMessage")) {
      const grid = document.querySelector(".department-grid");
      const message = document.createElement("section");
      message.id = "employeeNoAccessMessage";
      message.className = "panel-card portal-empty-state";
      message.innerHTML = '<h2>No department access assigned</h2><p>Please contact the ServeEase superuser to update this employee profile.</p>';
      if (grid && grid.parentNode) grid.parentNode.insertBefore(message, grid);
    }
  }

  function protectDepartmentClicks() {
    document.querySelectorAll(".department-links a").forEach(function (link) {
      link.addEventListener("click", function (event) {
        if (auth.isAdminSession(session)) return;
        if (auth.canAccessRoute(link.getAttribute("href") || "", session)) return;

        event.preventDefault();
        window.location.href = "employee-access-denied.html?from=" + encodeURIComponent(auth.getRouteKey(link.getAttribute("href") || ""));
      });
    });
  }

  createIdentityCard();
  updateHeaderNavigation();
  updateActorPortalStrip();
  updateHeroActions();
  updateDepartmentAccess();
  protectDepartmentClicks();
})();
