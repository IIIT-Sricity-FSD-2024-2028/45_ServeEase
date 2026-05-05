(function () {
  const API_BASE_URL = "http://localhost:3000/api";

  function normalizeRole(role) {
    return role === "admin" || role === "superuser" ? "admin" : "user";
  }

  function getRole() {
    try {
      const session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
      return normalizeRole(session && session.role);
    } catch (error) {
      return "user";
    }
  }

  async function request(path, options) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        role: getRole(),
        ...(options && options.headers ? options.headers : {})
      }
    });

    const payload = await response.json().catch(function () {
      return null;
    });

    if (!response.ok) {
      const message = payload && payload.message ? payload.message : "Backend request failed.";
      throw new Error(Array.isArray(message) ? message.join(" ") : message);
    }

    return payload ? payload.data : null;
  }

  window.ServeEaseApi = {
    saveState: function (key, value) {
      return request("/state", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({ key: key, value: value })
      });
    },
    getState: function (key) {
      return request(`/state/${encodeURIComponent(key)}`, { method: "GET", headers: { role: "user" } });
    },
    getCatalog: function () {
      return request("/catalog", { method: "GET", headers: { role: "user" } });
    },
    syncCatalog: function (catalog) {
      return request("/catalog/sync", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({
          categories: catalog.categories || [],
          providers: catalog.providers || [],
          popularServices: catalog.popularServices || []
        })
      });
    },
    hydrateCatalog: async function () {
      const catalog = await this.getCatalog();
      if (!catalog || !Array.isArray(catalog.categories) || !catalog.categories.length) {
        return null;
      }

      const current = JSON.parse(localStorage.getItem("serveEaseData") || "{}");
      const providers = mergeLocalProviderCatalog(current.providers || [], catalog.providers || []);
      const next = {
        ...current,
        categories: mergeCatalogCategories(current.categories || [], catalog.categories || []),
        providers: providers,
        popularServices: (current.popularServices && current.popularServices.length)
          ? current.popularServices
          : catalog.popularServices || []
      };
      localStorage.setItem("serveEaseData", JSON.stringify(next));
      this.syncCatalog(next).catch(function () {
        return null;
      });
      return next;
    },
    getBookings: function () {
      return request("/bookings", { method: "GET", headers: { role: "user" } });
    },
    createBooking: function (booking) {
      return request("/bookings", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify(booking)
      });
    },
    updateBooking: function (id, booking) {
      return request(`/bookings/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { role: "admin" },
        body: JSON.stringify(booking)
      });
    },
    logActivity: function (activity) {
      return request("/activities", {
        method: "POST",
        headers: { role: "admin" },
        body: JSON.stringify({
          action: activity.action,
          page: activity.page || window.location.pathname.replace("/", "") || "index.html",
          details: activity.details || ""
        })
      }).catch(function () {
        return null;
      });
    }
  };

  function mergeLocalProviderCatalog(localProviders, backendProviders) {
    function normalize(value) {
      return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    }

    function isRemovedProvider(provider) {
      return provider && [
        provider.id,
        provider.name,
        provider.fullName,
        provider.organisationName,
        provider.ownerProviderEmail
      ].some(function (value) {
        return normalize(value).indexOf("koushikpestcontrol") !== -1;
      });
    }

    function baseId(provider) {
      if (!provider || !provider.category || !provider.cityId) return String(provider && provider.id || "");
      return String(provider.id || "").replace(new RegExp("-" + provider.category + "-" + provider.cityId + "$"), "");
    }

    function providerKey(provider) {
      if (!provider) return "";
      return [
        normalize(provider.ownerProviderId || baseId(provider)),
        provider.category || "",
        Number(provider.cityId) || 0
      ].join("|");
    }

    function normalizeProvider(provider) {
      if (!provider) return provider;
      if ([provider.id, provider.name, provider.ownerProviderEmail].some(function (value) {
        return normalize(value).indexOf("cleanpro") !== -1;
      })) {
        provider = { ...provider, name: "Cleanpro Services" };
      }
      return provider;
    }

    function providerScore(provider, sourcePriority) {
      const serviceCount = Array.isArray(provider.subServices) ? provider.subServices.length : 0;
      return (provider.ownerProviderId ? 1000 : 0) + (serviceCount * 10) + sourcePriority;
    }

    const bestByKey = {};

    function considerProvider(provider, sourcePriority) {
      if (!provider || !provider.id || isRemovedProvider(provider)) return;
      provider = normalizeProvider(provider);
      const key = providerKey(provider);
      const existing = bestByKey[key];
      if (!existing || providerScore(provider, sourcePriority) > providerScore(existing.provider, existing.sourcePriority)) {
        bestByKey[key] = { provider: provider, sourcePriority: sourcePriority };
      }
    }

    backendProviders.forEach(function (provider) {
      considerProvider(provider, 1);
    });

    localProviders.forEach(function (provider) {
      considerProvider(provider, 2);
    });

    return Object.keys(bestByKey).map(function (key) {
      return bestByKey[key].provider;
    });
  }

  function mergeCatalogCategories(localCategories, backendCategories) {
    const byId = {};

    function addCategory(category) {
      if (!category || !category.id) return;
      const existing = byId[category.id] || {};
      const subServices = [];

      (existing.subServices || []).concat(category.subServices || []).forEach(function (service) {
        if (subServices.indexOf(service) === -1) subServices.push(service);
      });

      byId[category.id] = {
        ...existing,
        ...category,
        subServices: subServices
      };
    }

    backendCategories.forEach(addCategory);
    localCategories.forEach(addCategory);

    return Object.keys(byId).map(function (id) { return byId[id]; });
  }

  (function bridgeServeEaseStorage() {
    if (window.__serveEaseStorageBridgeReady) return;
    window.__serveEaseStorageBridgeReady = true;

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const originalRemoveItem = localStorage.removeItem.bind(localStorage);
    const mirroredKeys = new Set([
      "serveEaseData",
      "serveEaseCustomerModuleData",
      "serveEaseProviderModuleData",
      "serveEaseSupportModuleData",
      "serveEaseSuperuserModuleData",
      "serveEaseSelectedCity",
      "serveEaseCustomCities"
    ]);

    function shouldMirror(key) {
      return mirroredKeys.has(key) ||
        key.indexOf("serveEaseCustomerModuleData:") === 0 ||
        key.indexOf("serveEaseProviderModuleData:") === 0 ||
        key.indexOf("serveEaseSelectedCity:") === 0;
    }

    function parseValue(value) {
      try {
        return JSON.parse(value);
      } catch (error) {
        return { raw: String(value) };
      }
    }

    function mirror(key, value, action) {
      if (!shouldMirror(key)) return;
      window.ServeEaseApi.saveState(key, parseValue(value)).catch(function () {
        return null;
      });
      window.ServeEaseApi.logActivity({
        action: action || "state_saved",
        page: window.location.pathname.replace("/", "") || "index.html",
        details: key
      });
    }

    localStorage.setItem = function (key, value) {
      originalSetItem(key, value);
      mirror(key, value, "state_saved");
    };

    localStorage.removeItem = function (key) {
      originalRemoveItem(key);
      if (shouldMirror(key)) {
        window.ServeEaseApi.logActivity({
          action: "state_removed",
          page: window.location.pathname.replace("/", "") || "index.html",
          details: key
        });
      }
    };
  })();
})();
