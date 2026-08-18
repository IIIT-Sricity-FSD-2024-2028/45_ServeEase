(function () {
  const logoutBtn = document.getElementById("employeeDeniedLogoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    if (window.ServeEaseEmployeeAuth && typeof window.ServeEaseEmployeeAuth.logoutEmployee === "function") {
      window.ServeEaseEmployeeAuth.logoutEmployee();
      return;
    }
    sessionStorage.removeItem("serveEaseSession");
    window.location.href = "login.html";
  });
})();
