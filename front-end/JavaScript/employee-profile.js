(function () {
  const auth = window.ServeEaseEmployeeAuth;
  const validation = window.ServeEaseAuthValidation || {};
  const byId = function (id) { return document.getElementById(id); };
  const text = function (value) { return String(value || "").trim() || "Not provided"; };
  function redirectDenied() { window.location.href = "employee-access-denied.html?from=employee-profile.html"; }
  if (!auth) { window.location.href = "login.html"; return; }
  const session = auth.getSession();
  if (auth.isAdminSession(session)) { window.location.href = "superuser-dashboard.html"; return; }
  if (!session || !session.isLoggedIn) { window.location.href = "login.html"; return; }
  if (!auth.isEmployeeSession(session)) { redirectDenied(); return; }

  const destinations = { "Customer Operations": "customer-operations.html", "Provider Operations": "provider-operations.html", "Support": "support-dashboard.html" };
  const profileInfo = byId("employeeProfileInfo");
  profileInfo.innerHTML = [
    ["Employee ID", session.employeeId], ["Name", session.name], ["Department", session.department],
    ["Permissions", (session.permissions || []).join(", ")], ["Email", session.email], ["Phone", session.phone]
  ].map(function (entry) { return "<div class=\"info-box\"><strong>" + entry[0] + "</strong><span>" + text(entry[1]) + "</span></div>"; }).join("");
  byId("employeeProfileWorkspaceLink").href = destinations[session.department] || "employee-department-placeholder.html";
  byId("employeeProfileLogoutBtn").addEventListener("click", auth.logoutEmployee);

  function state(input, errorId, valid, message) {
    input.classList.toggle("error-field", !valid); input.classList.toggle("success-field", valid);
    byId(errorId).textContent = valid ? "" : message;
    return valid;
  }
  byId("employeePasswordForm").addEventListener("submit", function (event) {
    event.preventDefault();
    const currentInput = byId("employeeCurrentPassword"), newInput = byId("employeeNewPassword"), confirmInput = byId("employeeConfirmPassword");
    const current = currentInput.value, next = newInput.value, confirm = confirmInput.value;
    byId("employeePasswordFormError").textContent = ""; byId("employeePasswordSuccess").textContent = "";
    const currentPresent = state(currentInput, "employeeCurrentPasswordError", !!current, "Current password is required.");
    const nextPresent = state(newInput, "employeeNewPasswordError", !!next, "New password is required.");
    const confirmPresent = state(confirmInput, "employeeConfirmPasswordError", !!confirm, "Confirm new password is required.");
    if (!currentPresent || !nextPresent || !confirmPresent) return;
    if (!auth.isCurrentEmployeePassword(current)) { state(currentInput, "employeeCurrentPasswordError", false, "Current password is incorrect."); return; }
    const strong = typeof validation.isStrongPassword === "function" && validation.isStrongPassword(next);
    if (!state(newInput, "employeeNewPasswordError", strong, "Password must include upper, lower, number and special character.")) return;
    if (!state(confirmInput, "employeeConfirmPasswordError", next === confirm, "Passwords do not match.")) return;
    if (!state(newInput, "employeeNewPasswordError", next !== current, "New password must be different from your current password.")) return;
    const result = auth.changeCurrentEmployeePassword(current, next);
    result.save.then(function () {
      currentInput.value = ""; newInput.value = ""; confirmInput.value = "";
      [currentInput, newInput, confirmInput].forEach(function (input) { input.classList.remove("success-field"); });
      byId("employeePasswordSuccess").textContent = "Password updated successfully.";
      if (typeof validation.logServeEaseActivity === "function") validation.logServeEaseActivity("employee_password_changed", session.employeeId);
    }).catch(function () { byId("employeePasswordFormError").textContent = "Unable to update password. Please try again."; });
  });
})();
