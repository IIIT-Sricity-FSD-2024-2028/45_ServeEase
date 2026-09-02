(function () {
  const key = "serveEaseEmployeeModuleData";
  const roles = {
    "customer-operations": { label: "Customer Operations", department: "Customer Operations", permission: "CUSTOMER_OPERATIONS", prefix: "EMP-CO-" },
    "provider-operations": { label: "Provider Operations", department: "Provider Operations", permission: "PROVIDER_OPERATIONS", prefix: "EMP-PO-" },
    "customer-support": { label: "Customer Support", department: "Support", permission: "SUPPORT", prefix: "EMP-SUP-" }
  };
  const byId = function (id) { return document.getElementById(id); };
  const escape = function (value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); };
  let activeTab = "All";
  let pendingRemoval = null;
  function access() {
    return window.ServeEaseEmployeeAuth && window.ServeEaseEmployeeAuth.requireAdministrationAccess
      ? window.ServeEaseEmployeeAuth.requireAdministrationAccess() : null;
  }
  function employees() { return window.ServeEaseEmployeeAuth.getEmployees(); }
  function departmentNames(records) {
    const authDepartments = window.ServeEaseEmployeeAuth.departments;
    if (Array.isArray(authDepartments) && authDepartments.length) {
      return authDepartments.map(function (department) { return typeof department === "string" ? department : department.name; }).filter(Boolean);
    }
    return (window.ServeEaseEmployeeAuth.demoEmployees || records).map(function (employee) { return employee.department; }).filter(function (department, index, list) { return department && list.indexOf(department) === index; });
  }
  function renderEmployeeTabs(records, names) {
    const tabs = byId("adminEmployeeTabs");
    const hasOther = records.some(function (employee) { return names.indexOf(employee.department) === -1; });
    const categories = ["All"].concat(names, hasOther ? ["Other"] : []);
    if (categories.indexOf(activeTab) === -1) activeTab = "All";
    tabs.innerHTML = categories.map(function (category) {
      const count = category === "All" ? records.length : records.filter(function (employee) {
        return category === "Other" ? names.indexOf(employee.department) === -1 : employee.department === category;
      }).length;
      return '<button class="tab-btn ' + (activeTab === category ? "active" : "") + '" data-category="' + escape(category) + '" type="button">' + escape(category) + " <span>" + count + "</span></button>";
    }).join("");
    tabs.querySelectorAll(".tab-btn").forEach(function (button) {
      button.addEventListener("click", function () {
        activeTab = this.dataset.category;
        render();
      });
    });
  }
  function render() {
    const body = byId("adminEmployeeTableBody"), records = employees();
    const session = window.ServeEaseEmployeeAuth.getSession ? window.ServeEaseEmployeeAuth.getSession() : null;
    const currentEmployeeId = session && session.employeeId ? String(session.employeeId).toUpperCase() : "";
    const names = departmentNames(records);
    renderEmployeeTabs(records, names);
    const filtered = activeTab === "All" ? records : records.filter(function (employee) {
      return activeTab === "Other" ? names.indexOf(employee.department) === -1 : employee.department === activeTab;
    });
    body.innerHTML = filtered.length ? filtered.map(function (employee) {
      const employeeId = String(employee.employeeId || "").toUpperCase();
      const isSeed = (window.ServeEaseEmployeeAuth.demoEmployees || []).some(function (seed) { return String(seed.employeeId || "").toUpperCase() === employeeId; });
      const isCurrent = currentEmployeeId === employeeId;
      const action = isSeed
        ? '<span class="admin-employee-protected" title="Default seed employees cannot be removed.">Default</span>'
        : isCurrent
          ? '<span class="admin-employee-protected" title="You cannot remove the currently logged-in employee.">Current account</span>'
          : '<button class="btn btn-outline admin-remove-employee" type="button" data-remove-employee="' + escape(employee.employeeId) + '">Remove</button>';
      return "<tr><td>" + escape(employee.employeeId) + "</td><td>" + escape(employee.name) + "</td><td>" + escape(employee.department) + "</td><td>" + escape((employee.permissions || []).join(", ")) + "</td><td>" + action + "</td></tr>";
    }).join("") : '<tr><td colspan="5">No employee records are currently available.</td></tr>';
    body.querySelectorAll("[data-remove-employee]").forEach(function (button) {
      button.addEventListener("click", function () { openRemoveEmployeeModal(this.dataset.removeEmployee); });
    });
  }
  function showEmployeeMessage(title, message) {
    const panel = byId("addEmployeeSuccess");
    panel.innerHTML = "<h3>" + escape(title) + "</h3><p>" + escape(message) + "</p>";
    panel.classList.remove("hidden");
  }
  function closeRemoveEmployeeModal() {
    pendingRemoval = null;
    byId("removeEmployeeModalBackdrop").classList.add("hidden");
  }
  function openRemoveEmployeeModal(employeeId) {
    const employee = employees().find(function (item) { return String(item.employeeId).toUpperCase() === String(employeeId).toUpperCase(); });
    if (!employee) return;
    pendingRemoval = { employeeId: employee.employeeId, name: employee.name, department: employee.department };
    byId("removeEmployeeModalEmployee").textContent = employee.name + " (" + employee.employeeId + ")";
    byId("removeEmployeeModalMessage").textContent = "Are you sure you want to remove " + employee.name + " (" + employee.employeeId + ")?";
    byId("removeEmployeeModalBackdrop").classList.remove("hidden");
  }
  function setupRemoveEmployeeModal() {
    byId("closeRemoveEmployeeModalBtn").addEventListener("click", closeRemoveEmployeeModal);
    byId("cancelRemoveEmployeeBtn").addEventListener("click", closeRemoveEmployeeModal);
    byId("removeEmployeeModalBackdrop").addEventListener("click", function (event) { if (event.target === this) closeRemoveEmployeeModal(); });
    byId("confirmRemoveEmployeeBtn").addEventListener("click", async function () {
      if (!pendingRemoval) return;
      const removal = pendingRemoval, button = this, validation = window.ServeEaseAuthValidation || {};
      button.disabled = true;
      try {
        await window.ServeEaseEmployeeAuth.removeEmployee(removal.employeeId);
        render();
        closeRemoveEmployeeModal();
        showEmployeeMessage("Employee removed", removal.name + " (" + removal.employeeId + ") was removed successfully.");
        if (validation.logServeEaseActivity) validation.logServeEaseActivity("employee_removed", removal.employeeId + " " + removal.department);
      } catch (error) {
        showEmployeeMessage("Unable to remove employee", error && error.message ? error.message : "The employee could not be removed.");
      } finally {
        button.disabled = false;
      }
    });
  }
  function role() { return roles[byId("newEmployeeRole").value] || null; }
  function nextId(selectedRole, records) {
    if (!selectedRole) return "";
    const pattern = new RegExp("^" + selectedRole.prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\d+)$", "i"), ids = new Set();
    let max = 0;
    records.forEach(function (employee) {
      const id = String(employee.employeeId || "").toUpperCase(), match = id.match(pattern);
      ids.add(id); if (match) max = Math.max(max, Number(match[1]) || 0);
    });
    do { max += 1; } while (ids.has(selectedRole.prefix + String(max).padStart(3, "0")));
    return selectedRole.prefix + String(max).padStart(3, "0");
  }
  function randomIndex(length) {
    if (window.crypto && window.crypto.getRandomValues) {
      const value = new Uint32Array(1), limit = Math.floor(4294967296 / length) * length;
      do { window.crypto.getRandomValues(value); } while (value[0] >= limit);
      return value[0] % length;
    }
    return Math.floor(Math.random() * length);
  }
  function password() {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "@#$%^&*!"], all = groups.join(""), result = groups.map(function (group) { return group[randomIndex(group.length)]; });
    while (result.length < 12) result.push(all[randomIndex(all.length)]);
    for (let i = result.length - 1; i > 0; i -= 1) { const j = randomIndex(i + 1), temp = result[i]; result[i] = result[j]; result[j] = temp; }
    return result.join("");
  }
  function field(input, errorId, valid, message) {
    input.classList.toggle("error-field", !valid); input.classList.toggle("success-field", valid); byId(errorId).textContent = valid ? "" : message; return valid;
  }
  function success(employee, selectedRole) {
    const panel = byId("addEmployeeSuccess");
    panel.innerHTML = "<h3>Employee created</h3><dl><dt>Employee ID</dt><dd>" + escape(employee.employeeId) + "</dd><dt>Name</dt><dd>" + escape(employee.name) + "</dd><dt>Role</dt><dd>" + escape(selectedRole.label) + "</dd><dt>Email</dt><dd>" + escape(employee.email) + "</dd><dt>Phone</dt><dd>" + escape(employee.phone) + "</dd><dt>Temporary Password</dt><dd><code>" + escape(employee.password) + "</code></dd></dl><button class=\"btn btn-outline admin-copy-password\" type=\"button\" id=\"copyEmployeePasswordBtn\">Copy Password</button>";
    panel.classList.remove("hidden");
    byId("copyEmployeePasswordBtn").addEventListener("click", function () {
      const button = this;
      if (!navigator.clipboard || !navigator.clipboard.writeText) { button.textContent = "Copy unavailable"; return; }
      navigator.clipboard.writeText(employee.password).then(function () { button.textContent = "Copied"; }).catch(function () { button.textContent = "Copy unavailable"; });
    });
  }
  function setup() {
    const panel = byId("addEmployeePanel"), form = byId("addEmployeeForm"), idInput = byId("newEmployeeId"), close = function () { panel.classList.add("hidden"); };
    function preview() { idInput.value = nextId(role(), employees()); }
    byId("openAddEmployeeBtn").addEventListener("click", function () { form.reset(); byId("addEmployeeSuccess").classList.add("hidden"); panel.classList.remove("hidden"); preview(); byId("newEmployeeRole").focus(); });
    ["closeAddEmployeeBtn", "cancelAddEmployeeBtn"].forEach(function (id) { byId(id).addEventListener("click", close); });
    byId("newEmployeeRole").addEventListener("change", preview);
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const selectedRole = role(), nameInput = byId("newEmployeeName"), emailInput = byId("newEmployeeEmail"), phoneInput = byId("newEmployeePhone");
      const name = nameInput.value.trim(), email = emailInput.value.trim().toLowerCase(), phone = phoneInput.value.trim(), validation = window.ServeEaseAuthValidation || {};
      const duplicate = employees().some(function (employee) { return String(employee.email || "").toLowerCase() === email; });
      const roleValid = field(byId("newEmployeeRole"), "newEmployeeRoleError", !!selectedRole, "Employee role is required.");
      const nameValid = field(nameInput, "newEmployeeNameError", !!name, "Name is required.");
      const emailValid = field(emailInput, "newEmployeeEmailError", !!validation.isValidEmail && validation.isValidEmail(email) && !duplicate, duplicate ? "An employee with this email already exists." : "Enter a valid email address.");
      const phoneValid = field(phoneInput, "newEmployeePhoneError", !!validation.isValidPhone && validation.isValidPhone(phone), "Enter a valid 10-digit phone number.");
      const valid = roleValid && nameValid && emailValid && phoneValid;
      if (!valid) return;
      const current = employees(), employee = { employeeId: nextId(selectedRole, current), name: name, email: email, phone: phone, department: selectedRole.department, permissions: [selectedRole.permission], password: password() };
      window.ServeEaseEmployeeAuth.addEmployee(employee).catch(function () { return null; });
      render(); close(); success(employee, selectedRole);
      if (validation.logServeEaseActivity) validation.logServeEaseActivity("employee_created", employee.employeeId + " " + employee.department);
    });
  }
  const session = access();
  if (!session) return;
  document.body.setAttribute("data-current-role", session.role || ""); render(); setup(); setupRemoveEmployeeModal();
  window.ServeEaseEmployeeAuth.hydrateEmployeesFromBackend(render);
})();
