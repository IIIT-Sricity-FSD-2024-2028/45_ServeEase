(function () {
  const draftKey = "serveEaseBookingDraft";
  const redirectKey = "postLoginRedirect";

  function read() {
    try {
      const value = JSON.parse(sessionStorage.getItem(draftKey) || "null");
      return value && typeof value === "object" ? value : null;
    } catch (error) {
      return null;
    }
  }

  function save(draft) {
    sessionStorage.setItem(draftKey, JSON.stringify(draft));
    sessionStorage.setItem(redirectKey, "checkout");
  }

  function clear() {
    sessionStorage.removeItem(draftKey);
    sessionStorage.removeItem(redirectKey);
  }

  window.ServeEaseBookingDraft = {
    read: read,
    save: save,
    clear: clear,
    hasCheckoutRedirect: function () {
      return sessionStorage.getItem(redirectKey) === "checkout";
    },
    hasPendingBooking: function () {
      return Boolean(read());
    },
    ensureCheckoutRedirect: function () {
      if (read()) sessionStorage.setItem(redirectKey, "checkout");
    },
    clearRedirect: function () {
      sessionStorage.removeItem(redirectKey);
    }
  };
})();
