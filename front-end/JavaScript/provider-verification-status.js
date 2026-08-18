(function () {
  const emptyValue = "Not recorded";

  function clean(value) { return String(value === undefined || value === null ? "" : value).trim(); }
  function display(value) { return clean(value) || emptyValue; }
  function normalizeKey(value) { return clean(value).toLowerCase(); }
  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) {
    return clean(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) || fallback : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function session() {
    try {
      return JSON.parse(sessionStorage.getItem("serveEaseSession") || "null") || null;
    } catch (error) {
      return null;
    }
  }

  function statusOf(record) {
    const raw = clean(record.accountStatus || record.status || record.approvalStatus || record.verificationStatus);
    const key = normalizeKey(raw);
    if (["active", "approved", "verified"].indexOf(key) !== -1) return "Active";
    if (key === "suspended") return "Suspended";
    if (key === "rejected" || key === "verification rejected") return "Verification Rejected";
    return "Under Verification";
  }

  function findProvider(currentSession) {
    const data = readJson("serveEaseData", {});
    const users = Array.isArray(data.users) ? data.users : [];
    const requests = Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : [];
    const all = requests.concat(users.filter(function (user) { return user.role === "provider"; }));
    return all.find(function (item) {
      return normalizeKey(item.id) === normalizeKey(currentSession.userId) ||
        normalizeKey(item.email) === normalizeKey(currentSession.email);
    }) || currentSession;
  }

  function field(label, value) {
    return '<div class="provider-verification-status-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(display(value)) + '</strong></div>';
  }

  function render(record) {
    const status = statusOf(record);
    const title = byId("providerVerificationStatusTitle");
    const message = byId("providerVerificationStatusMessage");
    const info = byId("providerVerificationStatusInfo");
    const reason = byId("providerVerificationStatusReason");
    const dashboardBtn = byId("providerVerificationDashboardBtn");
    const resubmitBtn = byId("providerVerificationResubmitBtn");

    if (status === "Active") {
      if (title) title.textContent = "Your provider account is active";
      if (message) message.textContent = "Your verification is complete. You can access the normal provider dashboard.";
      if (dashboardBtn) dashboardBtn.hidden = false;
    } else if (status === "Suspended") {
      if (title) title.textContent = "Your provider account is suspended";
      if (message) message.textContent = "Dashboard access is paused by ServeEase Provider Operations.";
      if (reason) {
        reason.hidden = false;
        reason.textContent = "Reason: " + display(record.suspensionReason || record.reason || record.adminRemarks);
      }
    } else if (status === "Verification Rejected") {
      if (title) title.textContent = "Verification rejected";
      if (message) message.textContent = "Your profile is preserved. Review the reason below and resubmit verification documents.";
      if (reason) {
        reason.hidden = false;
        reason.textContent = "Reason: " + display(record.rejectionReason || record.reason || record.adminRemarks);
      }
      if (resubmitBtn) resubmitBtn.hidden = false;
    } else {
      if (title) title.textContent = "Verification in progress";
      if (message) message.textContent = "Your provider profile is pending Provider Operations review. Dashboard access will unlock after approval.";
    }

    if (info) {
      info.innerHTML = [
        field("Provider ID", record.id || record.userId),
        field("Name", record.fullName || record.name),
        field("Organisation", record.organisationName),
        field("Email", record.email),
        field("Service Category", record.serviceType || record.category),
        field("Current Status", status)
      ].join("");
    }
  }

  const currentSession = session();
  if (!currentSession || currentSession.role !== "provider") {
    window.location.href = "login.html";
    return;
  }

  const provider = findProvider(currentSession);
  render(provider);

  const logoutBtn = byId("providerVerificationStatusLogoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      sessionStorage.removeItem("serveEaseSession");
      window.location.href = "login.html";
    });
  }

  const resubmitBtn = byId("providerVerificationResubmitBtn");
  if (resubmitBtn) {
    resubmitBtn.addEventListener("click", function () {
      sessionStorage.removeItem("serveEaseSession");
      try {
        sessionStorage.setItem("serveEaseProviderResubmitEmail", provider.email || currentSession.email || "");
      } catch (error) {}
      window.location.href = "signup.html";
    });
  }
})();
