(function () {
  const auth = window.ServeEaseEmployeeAuth;
  if (!auth) {
    window.location.href = "login.html";
    return;
  }

  const session = auth.getSession();
  if (!auth.isEmployeeSession(session)) {
    window.location.href = "login.html";
    return;
  }

  const allowedDepartments = ["Customer Operations", "Provider Operations", "Support", "Finance"];
  if (!allowedDepartments.includes(session.department)) {
    sessionStorage.removeItem("serveEaseSession");
    window.location.href = "login.html";
    return;
  }

  auth.annotateBody(session);

  const destinations = {
    "Customer Operations": "customer-operations.html",
    "Support": "support-dashboard.html"
  };

  const requestedDepartment = new URLSearchParams(window.location.search).get("department");
  const destination = destinations[session.department];
  if (destination && (!requestedDepartment || requestedDepartment === session.department)) {
    window.location.replace(destination);
    return;
  }

  if (requestedDepartment && requestedDepartment !== session.department) {
    window.history.replaceState(
      null,
      "",
      "employee-department-placeholder.html?department=" + encodeURIComponent(session.department)
    );
  }

  function byId(id) {
    return document.getElementById(id);
  }

  function addDetail(label, value) {
    const details = byId("employeePlaceholderDetails");
    if (!details) return;

    const row = document.createElement("p");
    const strong = document.createElement("strong");
    const span = document.createElement("span");

    strong.textContent = label + ": ";
    span.textContent = value || "-";
    row.appendChild(strong);
    row.appendChild(span);
    details.appendChild(row);
  }

  const title = byId("employeePlaceholderTitle");
  const copy = byId("employeePlaceholderCopy");
  const details = byId("employeePlaceholderDetails");

  if (title) title.textContent = session.department + " Workspace";
  if (copy) {
    copy.textContent = session.department + " workspace will be integrated in the next phase.";
  }
  if (details) {
    details.textContent = "";
    addDetail("Employee ID", session.employeeId);
    addDetail("Department", session.department);
    addDetail("Role", session.role);
  }

  const logout = byId("employeePlaceholderLogout");
  if (logout) {
    logout.addEventListener("click", function (event) {
      event.preventDefault();
      auth.logoutEmployee();
    });
  }
})();
