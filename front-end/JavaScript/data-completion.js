(function () {
  "use strict";

  var storageKey = "serveEaseData";
  var cities = ["Chennai", "Bangalore", "Hyderabad", "Delhi", "Mumbai"];

  function text(value) { return String(value == null ? "" : value).trim(); }
  function missing(value) {
    var valueText = text(value).toLowerCase();
    return !valueText || valueText === ("not " + "recorded") || valueText === "n/a" || valueText === "-" || valueText === "—";
  }
  function hash(value) {
    return text(value).split("").reduce(function (total, character) {
      return ((total * 31) + character.charCodeAt(0)) >>> 0;
    }, 7);
  }
  function identity(record, index) {
    return text(record.providerId || record.ownerProviderId || record.customerId || record.id || record.email || record.fullName || record.name || index);
  }
  function generatedPhone(seed, usedPhones) {
    var attempt = 0;
    var phone;
    do {
      var number = (hash(seed + ":" + attempt) % 1000000000).toString().padStart(9, "0");
      phone = "+91 " + (7 + (hash(seed + ":lead:" + attempt) % 3)) + number;
      attempt += 1;
    } while (usedPhones[phone] && attempt < 100);
    usedPhones[phone] = true;
    return phone;
  }
  function registrationDate(seed) {
    var date = new Date(Date.UTC(2023 + (hash(seed) % 3), hash(seed + "month") % 12, 1 + (hash(seed + "day") % 28)));
    return date.toISOString().slice(0, 10);
  }
  function categoryFor(record, categories, seed) {
    var existing = text(record.serviceType || record.serviceCategory || record.category);
    if (existing) return existing;
    if (!categories.length) return "Home Service";
    var category = categories[hash(seed + ":category") % categories.length];
    return text(category.id || category.name) || "Home Service";
  }
  function actorRole(record) {
    return text(record && (record.role || record.type || record.actorType || record.userType)).toLowerCase();
  }
  function hasInvalidProviderId(record) {
    return /^(cus|sup|sur)/i.test(text(record && (record.providerId || record.ownerProviderId || record.id || record.userId)));
  }
  function isProviderActor(record) {
    return actorRole(record) === "provider" && !hasInvalidProviderId(record);
  }
  function isCustomerActor(record) {
    return actorRole(record) === "customer";
  }
  function canonicalKey(record) {
    return text(record && (record.providerId || record.id || record.email)).toLowerCase();
  }
  function unique(records) {
    var seen = {};
    return records.filter(function (record) {
      var key = canonicalKey(record);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }
  function getCanonicalProviders(data) {
    data = data || complete();
    var users = Array.isArray(data.users) ? data.users : [];
    var registered = users.filter(isProviderActor);
    var requests = (Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : []).filter(function (record) {
      var role = actorRole(record);
      return !hasInvalidProviderId(record) && (!role || role === "provider");
    });
    return unique(registered.concat(requests));
  }
  function getCanonicalCustomers(data) {
    data = data || complete();
    return unique((Array.isArray(data.users) ? data.users : []).filter(isCustomerActor));
  }
  function matchesCustomer(record, customer) {
    if (!record || !customer) return false;
    var recordId = text(record.ownerCustomerId || record.customerId || record.id || record.userId).toLowerCase();
    var recordEmail = text(record.ownerEmail || record.customerEmail || record.email).toLowerCase();
    return (recordId && recordId === text(customer.id).toLowerCase()) ||
      (recordEmail && recordEmail === text(customer.email).toLowerCase());
  }
  function syncCustomerModuleState(customer) {
    var storageKeys = [];
    try {
      for (var index = 0; index < localStorage.length; index += 1) {
        var storageKeyName = localStorage.key(index);
        if (storageKeyName) storageKeys.push(storageKeyName);
      }
    } catch (error) { storageKeys = Object.keys(localStorage); }
    var keys = ["serveEaseCustomerModuleData"].concat(storageKeys);
    keys.filter(function (key, index) {
      return keys.indexOf(key) === index;
    }).filter(function (key) {
      return key === "serveEaseCustomerModuleData" || key.indexOf("serveEaseCustomerModuleData:") === 0;
    }).forEach(function (key) {
      var moduleData;
      try { moduleData = JSON.parse(localStorage.getItem(key) || "{}"); } catch (error) { moduleData = null; }
      if (!matchesCustomer(moduleData, customer)) return;
      moduleData.status = customer.status;
      moduleData.accountStatus = customer.accountStatus;
      localStorage.setItem(key, JSON.stringify(moduleData));
    });
  }
  function updateCustomerAccountStatus(customerId, nextStatus, reason, remarks) {
    if (["Active", "Blocked"].indexOf(nextStatus) === -1 || !text(reason)) return { ok: false, message: "A reason is required." };
    var data;
    try { data = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch (error) { data = {}; }
    var customer = (Array.isArray(data.users) ? data.users : []).find(function (record) {
      return isCustomerActor(record) && text(record.id) === text(customerId);
    });
    if (!customer) return { ok: false, message: "Customer record was not found." };
    var previousStatus = text(customer.status || customer.accountStatus) || "Active";
    var entry = { action: nextStatus === "Blocked" ? "Customer suspended" : "Customer activated", previousStatus: previousStatus, newStatus: nextStatus, reason: text(reason), remarks: text(remarks), dateTime: new Date().toISOString(), performedBy: "Superuser" };
    customer.status = nextStatus;
    customer.accountStatus = nextStatus;
    customer.blockReason = nextStatus === "Blocked" ? text(reason) : "";
    customer.adminRemarks = text(remarks);
    if (!Array.isArray(customer.statusHistory)) customer.statusHistory = [];
    customer.statusHistory.unshift(entry);
    localStorage.setItem(storageKey, JSON.stringify(data));
    syncCustomerModuleState(customer);
    try {
      var session = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null");
      if (session && matchesCustomer(session, customer)) {
        session.accountStatus = nextStatus;
        sessionStorage.setItem("serveEaseSession", JSON.stringify(session));
      }
    } catch (error) { /* session state is optional */ }
    if (typeof window.CustomEvent === "function") {
      window.dispatchEvent(new window.CustomEvent("serveease:customer-status-updated", { detail: { customerId: customer.id, status: nextStatus } }));
    }
    return { ok: true, customer: customer, history: entry };
  }
  function completeRecord(record, role, categories, usedPhones, index) {
    if (!record || typeof record !== "object") return false;
    var changed = false;
    var seed = identity(record, index);
    var location = text(record.cityName || record.location || record.city || record.address);
    if (missing(location)) {
      location = cities[Number(record.cityId) - 1] || cities[hash(seed + ":city") % cities.length];
      record.location = location;
      if (missing(record.cityName)) record.cityName = location;
      changed = true;
    }
    if (missing(record.phone || record.phoneNumber || record.contactNumber)) {
      record.phone = generatedPhone(seed, usedPhones);
      changed = true;
    }
    if (missing(record.registrationDate || record.registeredAt || record.createdAt || record.createdDate || record.submittedDate || record.joinedDate)) {
      record.registrationDate = registrationDate(seed);
      changed = true;
    }
    if (role === "provider") {
      if (missing(record.experience || record.years || record.yearsOfExperience)) {
        record.experience = 2 + ((hash(seed + ":experience") % 4) * 2);
        changed = true;
      }
      if (missing(record.serviceType || record.serviceCategory || record.category)) {
        record.category = categoryFor(record, categories, seed);
        changed = true;
      }
      if (missing(record.organisationName || record.providerOrganisation)) {
        var name = text(record.fullName || record.providerName || record.name || "Provider");
        record.organisationName = name + " Services";
        changed = true;
      }
      if (missing(record.accountStatus || record.status || record.approvalStatus || record.verificationStatus)) {
        record.accountStatus = record.verified === false ? "Under Verification" : "Active";
        changed = true;
      }
    } else if (missing(record.accountStatus || record.status)) {
      record.accountStatus = "Active";
      changed = true;
    }
    return changed;
  }
  function complete() {
    var data;
    try { data = JSON.parse(localStorage.getItem(storageKey) || "{}") || {}; } catch (error) { data = {}; }
    var categories = Array.isArray(data.categories) ? data.categories : [];
    var usedPhones = {};
    var changed = false;
    var users = Array.isArray(data.users) ? data.users : [];
    users.forEach(function (record) { if (!missing(record.phone || record.phoneNumber || record.contactNumber)) usedPhones[text(record.phone || record.phoneNumber || record.contactNumber)] = true; });
    (Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : []).forEach(function (record) { if (!missing(record.phone || record.phoneNumber || record.contactNumber)) usedPhones[text(record.phone || record.phoneNumber || record.contactNumber)] = true; });
    (Array.isArray(data.providers) ? data.providers : []).forEach(function (record) { if (!missing(record.phone || record.phoneNumber || record.contactNumber)) usedPhones[text(record.phone || record.phoneNumber || record.contactNumber)] = true; });
    users.forEach(function (record, index) {
      if (isCustomerActor(record)) changed = completeRecord(record, "customer", categories, usedPhones, index) || changed;
      if (isProviderActor(record)) changed = completeRecord(record, "provider", categories, usedPhones, index) || changed;
    });
    (Array.isArray(data.providerApprovalRequests) ? data.providerApprovalRequests : []).forEach(function (record, index) {
      var role = actorRole(record);
      if (!hasInvalidProviderId(record) && (!role || role === "provider")) changed = completeRecord(record, "provider", categories, usedPhones, index) || changed;
    });
    (Array.isArray(data.providers) ? data.providers : []).forEach(function (record, index) {
      if (!hasInvalidProviderId(record) && (isProviderActor(record) || text(record.ownerProviderId || record.providerId || record.ownerProviderEmail))) changed = completeRecord(record, "provider", categories, usedPhones, index) || changed;
    });
    if (changed) localStorage.setItem(storageKey, JSON.stringify(data));
    return data;
  }

  window.ServeEaseDataCompletion = {
    complete: complete,
    isMissing: missing,
    isProviderActor: isProviderActor,
    isCustomerActor: isCustomerActor,
    getCanonicalProviders: getCanonicalProviders,
    getCanonicalCustomers: getCanonicalCustomers,
    updateCustomerAccountStatus: updateCustomerAccountStatus
  };
  complete();
})();
