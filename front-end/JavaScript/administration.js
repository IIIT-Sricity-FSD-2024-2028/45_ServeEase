(function () {
  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null") || null;
    } catch (error) {
      return null;
    }
  }

  function requireAdministrationAccess() {
    if (window.ServeEaseEmployeeAuth && typeof window.ServeEaseEmployeeAuth.requireAdministrationAccess === "function") {
      return window.ServeEaseEmployeeAuth.requireAdministrationAccess();
    }

    const session = getSession();
    if (!session || !session.isLoggedIn || !["superuser", "admin"].includes(session.role)) {
      window.location.href = "login.html";
      return null;
    }
    return session;
  }

  function annotateSession(session) {
    if (!session || !session.role) return;
    document.body.setAttribute("data-current-role", session.role);
  }

  function renderEmployeeRecords() {
    const body = document.getElementById("adminEmployeeTableBody");
    const employees = window.ServeEaseEmployeeAuth && Array.isArray(window.ServeEaseEmployeeAuth.demoEmployees)
      ? window.ServeEaseEmployeeAuth.demoEmployees
      : [];
    if (!body) return;
    body.innerHTML = employees.length
      ? employees.map(function (employee) {
          return "<tr><td>" + employee.employeeId + "</td><td>" + employee.name + "</td><td>" + employee.department + "</td><td>" + (employee.permissions || []).join(", ") + "</td></tr>";
        }).join("")
      : '<tr><td colspan="4">No employee records are currently available.</td></tr>';
  }

  const session = requireAdministrationAccess();
  if (!session) return;
  annotateSession(session);
  renderEmployeeRecords();
})();
