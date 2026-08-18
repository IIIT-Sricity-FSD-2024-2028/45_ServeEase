(function () {
  const sessionKey = "serveEaseSession";
  const demoPassword = "Password@123";

  const permissions = {
    CUSTOMER_OPERATIONS: "CUSTOMER_OPERATIONS",
    PROVIDER_OPERATIONS: "PROVIDER_OPERATIONS",
    SUPPORT: "SUPPORT",
    ESCALATION: "ESCALATION",
    FINANCE: "FINANCE"
  };

  const departments = [
    { name: "Customer Operations", permission: permissions.CUSTOMER_OPERATIONS },
    { name: "Provider Operations", permission: permissions.PROVIDER_OPERATIONS },
    { name: "Support", permission: permissions.SUPPORT },
    { name: "Finance", permission: permissions.FINANCE }
  ];

  const demoEmployees = [
    {
      employeeId: "EMP-CO-001",
      name: "Customer Operations Employee",
      department: "Customer Operations",
      permissions: [permissions.CUSTOMER_OPERATIONS],
      password: demoPassword
    },
    {
      employeeId: "EMP-PO-001",
      name: "Provider Operations Employee",
      department: "Provider Operations",
      permissions: [permissions.PROVIDER_OPERATIONS],
      password: demoPassword
    },
    {
      employeeId: "EMP-SUP-001",
      name: "Support Employee",
      department: "Support",
      permissions: [permissions.SUPPORT],
      password: demoPassword
    },
    {
      employeeId: "EMP-FIN-001",
      name: "Finance Employee",
      department: "Finance",
      permissions: [permissions.FINANCE],
      password: demoPassword
    }
  ];

  const routeAccess = {
    "employee-department-placeholder.html": [],
    "customer-operations.html": [permissions.CUSTOMER_OPERATIONS],
    "provider-operations.html": [permissions.PROVIDER_OPERATIONS],
    "provider-operations-detail.html": [permissions.PROVIDER_OPERATIONS],
    "provider-verification-review.html": [permissions.PROVIDER_OPERATIONS],
    "finance-operations.html": [permissions.FINANCE],
    "support-dashboard.html": [permissions.SUPPORT],
    "support-ticket-details.html": [permissions.SUPPORT]
  };

  function cleanText(value) {
    return String(value || "").trim();
  }

  function normalizeEmployeeId(value) {
    return cleanText(value).toUpperCase();
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey) || "null") || null;
    } catch (error) {
      return null;
    }
  }

  function saveSession(session) {
    sessionStorage.setItem(sessionKey, JSON.stringify(session));
  }

  function normalizePermissions(values) {
    return (Array.isArray(values) ? values : [])
      .map(function (value) { return cleanText(value).toUpperCase(); })
      .filter(Boolean);
  }

  function publicEmployee(employee) {
    return {
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      permissions: normalizePermissions(employee.permissions)
    };
  }

  function isEmployeeSession(session) {
    return Boolean(session && session.isLoggedIn && session.role === "employee" && session.employeeId);
  }

  function isAdminSession(session) {
    return Boolean(session && session.isLoggedIn && ["superuser", "admin"].includes(session.role));
  }

  function getRouteKey(url) {
    const raw = cleanText(url || window.location.pathname || "login.html");
    const path = raw.split("?")[0].split("#")[0].replace(/\\/g, "/");
    return path.substring(path.lastIndexOf("/") + 1) || "login.html";
  }

  function getRoutePermissions(url) {
    const route = getRouteKey(url);
    return routeAccess[route] ? routeAccess[route].slice() : null;
  }

  function hasAnyPermission(session, requiredPermissions) {
    const required = normalizePermissions(requiredPermissions);
    if (!required.length) return Boolean(isEmployeeSession(session) || isAdminSession(session));
    if (isAdminSession(session)) return true;
    if (!isEmployeeSession(session)) return false;

    const actual = normalizePermissions(session.permissions);
    return required.some(function (permission) {
      return actual.includes(permission);
    });
  }

  function canAccessRoute(url, session) {
    const activeSession = session || getSession();
    if (isAdminSession(activeSession)) return true;
    if (!isEmployeeSession(activeSession)) return false;

    const required = getRoutePermissions(url);
    if (!required) return false;
    return hasAnyPermission(activeSession, required);
  }

  function redirectToLogin() {
    window.location.href = "login.html";
  }

  function redirectToDenied(route) {
    const deniedRoute = route || getRouteKey();
    try {
      sessionStorage.setItem("serveEaseEmployeeDeniedRoute", deniedRoute);
    } catch (error) {
      // Continue to the denied page even if the browser blocks session storage.
    }
    window.location.href = "employee-access-denied.html?from=" + encodeURIComponent(deniedRoute);
  }

  function requireCurrentPageAccess() {
    const session = getSession();
    const route = getRouteKey();
    if (isAdminSession(session)) return session;
    if (!session || !session.isLoggedIn) {
      redirectToLogin();
      return null;
    }
    if (!isEmployeeSession(session) || !canAccessRoute(route, session)) {
      redirectToDenied(route);
      return null;
    }
    return session;
  }

  function requireEmployeePortalAccess() {
    const session = getSession();
    if (isEmployeeSession(session) || isAdminSession(session)) return session;
    redirectToLogin();
    return null;
  }

  function requireAdministrationAccess() {
    const session = getSession();
    if (isAdminSession(session)) return session;
    if (isEmployeeSession(session)) {
      redirectToDenied("administration.html");
      return null;
    }
    window.location.href = "login.html";
    return null;
  }

  function authenticate(employeeId, password) {
    const requestedId = normalizeEmployeeId(employeeId);
    const requestedPassword = cleanText(password);
    const employee = demoEmployees.find(function (item) {
      return item.employeeId === requestedId && item.password === requestedPassword;
    });

    return employee ? publicEmployee(employee) : null;
  }

  function setEmployeeSession(employee) {
    const safeEmployee = publicEmployee(employee);
    const session = {
      isLoggedIn: true,
      role: "employee",
      userId: safeEmployee.employeeId,
      employeeId: safeEmployee.employeeId,
      fullName: safeEmployee.name,
      name: safeEmployee.name,
      department: safeEmployee.department,
      permissions: safeEmployee.permissions,
      employee: true
    };
    saveSession(session);
    return session;
  }

  function logoutEmployee() {
    const session = getSession();
    if (isEmployeeSession(session)) {
      sessionStorage.removeItem(sessionKey);
    }
    window.location.href = "login.html";
  }

  function getAccessibleDepartments(session) {
    const activeSession = session || getSession();
    if (isAdminSession(activeSession)) return departments.slice();
    return departments.filter(function (department) {
      return hasAnyPermission(activeSession, [department.permission]);
    });
  }

  function getDepartments() {
    return departments.slice();
  }

  function annotateBody(session) {
    if (!document.body || !session) return;
    document.body.setAttribute("data-current-role", session.role || "");
    if (isEmployeeSession(session)) {
      document.body.setAttribute("data-employee-id", session.employeeId);
      document.body.setAttribute("data-employee-department", session.department || "");
    }
  }

  function insertLegacyNotice(session) {
    if (!document.body || document.getElementById("employeeLegacyRouteNotice")) return;
    const target = document.querySelector(".dashboard-page .container") ||
      document.querySelector(".dashboard-page") ||
      document.querySelector("main");
    if (!target) return;

    const notice = document.createElement("section");
    notice.id = "employeeLegacyRouteNotice";
    notice.className = "panel-card employee-legacy-route-notice";
    notice.innerHTML = [
      "<strong>Employee workspace access</strong>",
      "<span>" + cleanText(session.employeeId) + " - " + cleanText(session.department) + "</span>",
      "<p>This existing workspace is available through your department permission. Detailed department-specific operations remain unchanged for later phases.</p>"
    ].join("");
    target.insertBefore(notice, target.firstChild);
  }

  function handleLegacyEmployeeRoute() {
    const session = getSession();
    if (!isEmployeeSession(session)) return false;

    const allowed = requireCurrentPageAccess();
    if (allowed) {
      annotateBody(allowed);
      insertLegacyNotice(allowed);
    }
    return true;
  }

  window.ServeEaseEmployeeAuth = {
    permissions: permissions,
    demoEmployees: demoEmployees.map(publicEmployee),
    authenticate: authenticate,
    setEmployeeSession: setEmployeeSession,
    getSession: getSession,
    isEmployeeSession: isEmployeeSession,
    isAdminSession: isAdminSession,
    hasAnyPermission: hasAnyPermission,
    canAccessRoute: canAccessRoute,
    getRouteKey: getRouteKey,
    getRoutePermissions: getRoutePermissions,
    requireCurrentPageAccess: requireCurrentPageAccess,
    requireEmployeePortalAccess: requireEmployeePortalAccess,
    requireAdministrationAccess: requireAdministrationAccess,
    logoutEmployee: logoutEmployee,
    getDepartments: getDepartments,
    getAccessibleDepartments: getAccessibleDepartments,
    annotateBody: annotateBody,
    handleLegacyEmployeeRoute: handleLegacyEmployeeRoute
  };
})();
