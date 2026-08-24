function getData() {
  return JSON.parse(localStorage.getItem("serveEaseData")) || { users: [] };
}

function setData(data) {
  localStorage.setItem("serveEaseData", JSON.stringify(data));
}

function getProviderApprovalRequests(data) {
  if (!Array.isArray(data.providerApprovalRequests)) {
    data.providerApprovalRequests = [];
  }
  return data.providerApprovalRequests;
}

function getCategoryIdFromServiceType(serviceType) {
  const categoryMap = {
    "home cleaning": "home-cleaning",
    "carpentry": "carpentry",
    "painting": "painting",
    "salon at home": "salon-at-home",
    "plumbing": "plumbing",
    "electrician": "electrician",
    "appliance repair / installation": "appliance-repair-installation",
    "pest control": "pest-control"
  };

  return categoryMap[String(serviceType || "").trim().toLowerCase()] || "home-cleaning";
}

function getImageForCategory(categoryId) {
  const imageMap = {
    "home-cleaning": "assets/images/home-cleaning/clean1.jpg",
    "carpentry": "assets/images/carpentry/carpentry1.jpg.jpeg",
    "painting": "assets/images/painting/painting1.jpg.jpeg",
    "salon-at-home": "assets/images/salon-at-home/salon1.jpg",
    "plumbing": "assets/images/plumbing/plumbing1.jpg.jpeg",
    "electrician": "assets/images/electrician/ele1.jpg.jpeg",
    "appliance-repair-installation": "assets/images/appliance-repair/ACrepair.jpg.jpeg",
    "pest-control": "assets/images/pest-control/pest1.jpg.jpeg"
  };

  return imageMap[categoryId] || imageMap["home-cleaning"];
}

function getBaseServeEaseCities() {
  return [
    { id: 1, name: "Chennai" },
    { id: 2, name: "Bangalore" },
    { id: 3, name: "Hyderabad" },
    { id: 4, name: "Delhi" },
    { id: 5, name: "Mumbai" }
  ];
}

function getCustomServeEaseCities() {
  try {
    const customCities = JSON.parse(localStorage.getItem("serveEaseCustomCities"));
    return Array.isArray(customCities) ? customCities : [];
  } catch (error) {
    return [];
  }
}

function saveCustomServeEaseCities(cities) {
  localStorage.setItem("serveEaseCustomCities", JSON.stringify(cities));
}

function getAllServeEaseCities() {
  return getBaseServeEaseCities();
}

function getCityById(cityId) {
  return getAllServeEaseCities().find(function (city) {
    return Number(city.id) === Number(cityId);
  }) || getBaseServeEaseCities()[0];
}

function extractCityNameFromAddress(address) {
  const rawAddress = String(address || "").trim();
  const loweredAddress = rawAddress.toLowerCase();
  const knownCity = getBaseServeEaseCities().find(function (city) {
    return loweredAddress.indexOf(city.name.toLowerCase()) !== -1 ||
      (city.name === "Bangalore" && loweredAddress.indexOf("bengaluru") !== -1);
  });

  if (knownCity) return knownCity.name;

  const firstPart = rawAddress.split(",")[0] || rawAddress;
  return firstPart.replace(/\d+/g, "").trim().replace(/\s+/g, " ") || "Chennai";
}

function getOrCreateCityIdFromAddress(address) {
  const cityName = extractCityNameFromAddress(address);
  const allCities = getBaseServeEaseCities().concat(getCustomServeEaseCities());
  const existingCity = allCities.find(function (city) {
    return city.name.toLowerCase() === cityName.toLowerCase();
  });

  if (existingCity) return Number(existingCity.id);

  const nextId = allCities.reduce(function (max, city) {
    return Math.max(max, Number(city.id) || 0);
  }, 0) + 1;
  const customCities = getCustomServeEaseCities();
  customCities.push({ id: nextId, name: cityName });
  saveCustomServeEaseCities(customCities);
  return nextId;
}

function inferCityIdFromAddress(address) {
  const value = String(address || "").toLowerCase();
  if (value.includes("bangalore") || value.includes("bengaluru")) return 2;
  if (value.includes("hyderabad")) return 3;
  if (value.includes("delhi")) return 4;
  if (value.includes("mumbai")) return 5;
  return getOrCreateCityIdFromAddress(address);
}

function slugifyProviderName(value) {
  return String(value || "provider")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "provider";
}

function readFileAsDataUrl(file) {
  return new Promise(function (resolve, reject) {
    const reader = new FileReader();
    reader.onload = function () { resolve(reader.result); };
    reader.onerror = function () { reject(reader.error); };
    reader.readAsDataURL(file);
  });
}

function escapeSignupHtml(value) {
  return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}

function providerDocumentKey(value) {
  const type = String(value || "").trim().toLowerCase();
  if (type.indexOf("id proof") === 0) return "id";
  if (type.indexOf("address proof") === 0) return "address";
  if (type.indexOf("skill certificate") === 0) return "skill";
  if (type.indexOf("experience proof") === 0) return "experience";
  if (type.indexOf("profile photo") === 0) return "profile";
  return "";
}

function readProviderPreviewStore(providerId) {
  try {
    return JSON.parse(localStorage.getItem("serveEaseProviderDocuments:" + providerId) || "{}") || {};
  } catch (error) {
    return {};
  }
}

async function buildProviderDocumentPayload(providerId, existingDocuments) {
  const idProofType = document.getElementById("idProofType")?.value || "ID Proof";
  const documentFields = [
    { inputId: "idProofFile", type: "ID Proof - " + idProofType, required: true },
    { inputId: "addressProofFile", type: "Address Proof", required: true },
    { inputId: "skillCertificateFile", type: "Skill Certificate", required: false },
    { inputId: "experienceProofFile", type: "Experience Proof", required: false },
    { inputId: "profilePhotoFile", type: "Profile Photo", required: true }
  ];

  const documents = [];
  const existing = Array.isArray(existingDocuments) ? existingDocuments : [];
  const previewStore = readProviderPreviewStore(providerId);
  const usedIds = {};

  function existingFor(type) {
    return existing.find(function (document) {
      return providerDocumentKey(document.documentType) === providerDocumentKey(type);
    }) || null;
  }

  function nextDocumentId() {
    let index = 1;
    let candidate = "DOC-" + providerId + "-" + index;
    while (usedIds[candidate] || existing.some(function (document) { return document.documentId === candidate; })) {
      index += 1;
      candidate = "DOC-" + providerId + "-" + index;
    }
    usedIds[candidate] = true;
    return candidate;
  }

  for (const field of documentFields) {
    const file = document.getElementById(field.inputId)?.files?.[0];
    const previous = existingFor(field.type);
    if (!file && !field.required && !previous) continue;
    if (!file && previous) {
      usedIds[previous.documentId] = true;
      documents.push(Object.assign({}, previous, { required: field.required }));
      continue;
    }
    const documentId = previous && previous.documentId ? previous.documentId : nextDocumentId();
    usedIds[documentId] = true;
    if (file) {
      try {
        previewStore[documentId] = {
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl: await (window.ServeEaseAttachments ? window.ServeEaseAttachments.readFileAsDataUrl(file) : readFileAsDataUrl(file))
        };
      } catch (error) {
        previewStore[documentId] = {
          name: file.name,
          type: file.type || "application/octet-stream",
          dataUrl: "",
          previewError: "Preview unavailable"
        };
      }
    }
    documents.push({
      documentId: documentId,
      documentType: field.type,
      documentName: file ? file.name : "",
      documentUrl: "local-document://" + providerId + "/" + documentId,
      required: field.required
    });
  }

  try {
    localStorage.setItem("serveEaseProviderDocuments:" + providerId, JSON.stringify(previewStore));
  } catch (error) {
    localStorage.setItem("serveEaseProviderDocuments:" + providerId, JSON.stringify({}));
  }
  return documents;
}

function authenticatedProviderId() {
  try {
    const currentSession = JSON.parse(sessionStorage.getItem("serveEaseSession") || "null") || {};
    return currentSession.role === "provider" ? String(currentSession.userId || currentSession.id || "") : "";
  } catch (error) {
    return "";
  }
}

function providerRecordMatchesId(record, providerId) {
  const expected = String(providerId || "").toLowerCase();
  if (!expected || !record) return false;
  return [record.id, record.providerId, record.ownerProviderId, record.userId].some(function (value) {
    return String(value || "").toLowerCase() === expected;
  });
}

function getProviderResubmissionRecord() {
  const providerId = authenticatedProviderId();
  if (!providerId) return null;
  const data = getData();
  const requests = getProviderApprovalRequests(data);
  return requests.find(function (record) {
    return providerRecordMatchesId(record, providerId);
  }) || (Array.isArray(data.users) ? data.users : []).find(function (record) {
    return record.role === "provider" && providerRecordMatchesId(record, providerId);
  }) || null;
}

function prepareProviderResubmission() {
  const record = getProviderResubmissionRecord();
  if (!record) return null;
  const providerTab = document.querySelector('#signupRoleTabs .role-tab[data-role="provider"]');
  if (providerTab) providerTab.click();
  const fields = {
    fullName: record.fullName || record.name,
    email: record.email,
    phone: record.phone,
    organisationName: record.organisationName,
    serviceType: record.serviceType || record.category,
    experience: record.experience,
    providerCity: record.cityId,
    address: record.address
  };
  Object.keys(fields).forEach(function (id) {
    const input = document.getElementById(id);
    if (input && fields[id] !== undefined && fields[id] !== null) input.value = fields[id];
  });
  ["password", "confirmPassword"].forEach(function (id) {
    const input = document.getElementById(id);
    if (input && record.password) input.value = record.password;
  });
  const idType = String((record.documents || []).find(function (document) {
    return providerDocumentKey(document.documentType) === "id";
  })?.documentType || "").split(" - ")[1];
  const idTypeInput = document.getElementById("idProofType");
  if (idTypeInput && idType) idTypeInput.value = idType;
  const notice = document.getElementById("providerResubmissionNotice");
  if (notice) {
    notice.classList.remove("hidden");
    notice.textContent = "Provider Verification Resubmission for " + (record.id || "existing provider") + ". Replace only the documents that need updating.";
  }
  const existingTarget = document.getElementById("providerExistingDocuments");
  const documents = (record.documents || []).filter(function (document) { return providerDocumentKey(document.documentType); });
  if (existingTarget && documents.length) {
    existingTarget.classList.remove("hidden");
    existingTarget.innerHTML = "<strong>Existing submitted documents</strong>" + documents.map(function (document) {
      return '<div><span>' + escapeSignupHtml(document.documentType) + '</span><span>Current file: ' + escapeSignupHtml(document.documentName || "Not submitted") + '</span><span>' + escapeSignupHtml(document.documentStatus || "Pending") + '</span></div>';
    }).join("");
  }
  const submit = document.querySelector('#signupForm button[type="submit"]');
  if (submit) submit.textContent = "Submit Resubmission";
  const subtitle = document.getElementById("signupSubtitle");
  if (subtitle) subtitle.textContent = "Update your provider verification documents and resubmit for review.";
  return record;
}

function syncProviderVerificationRequest(provider) {
  if (!window.ServeEaseApi || typeof window.ServeEaseApi.createProviderVerificationRequest !== "function") return;

  window.ServeEaseApi.createProviderVerificationRequest({
    id: provider.id,
    name: provider.fullName,
    email: provider.email,
    organisationName: provider.organisationName || provider.fullName,
    phone: provider.phone,
    category: provider.serviceType,
    experience: provider.experience,
    location: provider.location || provider.cityName,
    address: provider.address,
    documents: provider.documents || []
  }).catch(function (error) {
    console.warn("Provider verification request sync skipped.", error);
  });
}

function syncUpdatedProviderVerificationRequest(provider) {
  if (!window.ServeEaseApi || typeof window.ServeEaseApi.updateProviderVerificationRequest !== "function") return;
  return window.ServeEaseApi.updateProviderVerificationRequest(provider.id, {
    id: provider.id,
    name: provider.fullName,
    email: provider.email,
    organisationName: provider.organisationName || provider.fullName,
    phone: provider.phone,
    category: provider.serviceType,
    experience: provider.experience,
    location: provider.location || provider.cityName,
    address: provider.address,
    documents: provider.documents || []
  }).catch(function (error) {
    console.warn("Provider verification update sync skipped.", error);
  });
}

function normalizeProviderText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRemovedProviderRecord(record) {
  if (!record) return false;
  return [
    record.id,
    record.email,
    record.fullName,
    record.organisationName,
    record.name,
    record.providerCatalogId
  ].some(function (value) {
    return normalizeProviderText(value).indexOf("koushikpestcontrol") !== -1;
  });
}

function syncCatalogToBackend(data) {
  if (window.ServeEaseApi && typeof window.ServeEaseApi.syncCatalog === "function") {
    window.ServeEaseApi.syncCatalog(data).catch(function (error) {
      console.warn("ServeEase catalog sync skipped.", error);
    });
  }
}

function seedDefaultUsers() {
  const data = getData();
  if (!Array.isArray(data.users)) {
    data.users = [];
  }

  const defaultUsers = [
    {
      id: "CUS001",
      role: "customer",
      fullName: "Raghava Kumar",
      email: "user@serveease.com",
      phone: "9876543210",
      password: "Password@123"
    },
    {
      id: "PRO001",
      role: "provider",
      fullName: "CleanPro Services",
      email: "provider@serveease.com",
      phone: "9876501234",
      password: "Password@123",
      organisationName: "Cleanpro Services",
      serviceType: "Home Cleaning",
      experience: 6,
      cityId: 1,
      cityName: "Chennai",
      location: "Chennai",
      address: "No. 22, Anna Nagar, Chennai",
      providerCatalogId: "cleanpro-service",
      registrationDate: "12 Jan 2025"
    },
    {
      id: "SUP001",
      role: "support",
      fullName: "Priya Sharma",
      email: "support@serveease.com",
      phone: "9876505678",
      password: "Password@123"
    },
    {
      id: "SUR001",
      role: "superuser",
      fullName: "Super User",
      email: "super@serveease.com",
      phone: "9876509999",
      password: "Password@123"
    }
  ];

  const mergedUsers = [];

  data.users.forEach(function (user) {
    if (!user || !user.email || isRemovedProviderRecord(user)) return;
    const emailKey = user.email.toLowerCase();
    const alreadyTracked = mergedUsers.some(function (existingUser) {
      return existingUser.email && existingUser.email.toLowerCase() === emailKey;
    });

    if (!alreadyTracked) {
      mergedUsers.push(user);
    }
  });

  defaultUsers.forEach(function (defaultUser) {
    const existingIndex = mergedUsers.findIndex(function (user) {
      return user.email && user.email.toLowerCase() === defaultUser.email.toLowerCase();
    });

    if (existingIndex !== -1) {
      mergedUsers[existingIndex] = {
        ...mergedUsers[existingIndex],
        ...defaultUser,
        providerBaseId: mergedUsers[existingIndex].providerBaseId || defaultUser.providerCatalogId,
        providerCatalogId: mergedUsers[existingIndex].providerCatalogId || defaultUser.providerCatalogId
      };
    } else {
      mergedUsers.push(defaultUser);
    }
  });

  if (Array.isArray(data.providers)) {
    data.providers.forEach(function (provider, index) {
      if (!provider || !provider.id || !provider.name || provider.ownerProviderId || isRemovedProviderRecord(provider)) return;

      const category = Array.isArray(data.categories)
        ? data.categories.find(function (item) { return item.id === provider.category; })
        : null;
      const providerEmail = provider.id + "@serveease.com";
      const generatedUser = {
        id: "PRO-CAT-" + String(index + 1).padStart(3, "0"),
        role: "provider",
        fullName: provider.name,
        organisationName: provider.name,
        email: providerEmail,
        phone: "9" + String(100000000 + index).slice(-9),
        password: "Password@123",
        serviceType: category ? category.name : provider.category,
        experience: Number(provider.years) || 1,
        cityId: provider.cityId || inferCityIdFromAddress(provider.location),
        cityName: getCityById(provider.cityId || inferCityIdFromAddress(provider.location)).name,
        location: getCityById(provider.cityId || inferCityIdFromAddress(provider.location)).name,
        address: provider.location,
        providerCatalogId: provider.id,
        registrationDate: provider.registrationDate || provider.submittedDate || "Not available"
      };

      const existingIndex = mergedUsers.findIndex(function (user) {
        return user.email && user.email.toLowerCase() === providerEmail.toLowerCase();
      });

      if (existingIndex !== -1) {
        mergedUsers[existingIndex] = {
          ...mergedUsers[existingIndex],
          ...generatedUser
        };
      } else {
        mergedUsers.push(generatedUser);
      }
    });
  }

  data.users = mergedUsers;
  setData(data);
}

function setSession(user) {
  const sessionData = {
    isLoggedIn: true,
    userId: user.id,
    role: user.role,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone || "",
    organisationName: user.organisationName || "",
    serviceType: user.serviceType || "",
    experience: user.experience || "",
    cityId: user.cityId || "",
    cityName: user.cityName || user.location || "",
    location: user.location || user.cityName || "",
    address: user.address || "",
    providerCatalogId: user.providerCatalogId || "",
    approvalStatus: user.approvalStatus || "",
    verificationStatus: user.verificationStatus || "",
    accountStatus: user.accountStatus || user.status || "",
    rejectionReason: user.rejectionReason || user.reason || "",
    suspensionReason: user.suspensionReason || ""
  };
  sessionStorage.setItem("serveEaseSession", JSON.stringify(sessionData));
}

function getCustomerSuspensionReason(user) {
  const history = Array.isArray(user && user.statusHistory) ? user.statusHistory : [];
  const latest = history.find(function (entry) {
    return String(entry.newStatus || entry.status || "").toLowerCase() === "blocked" && String(entry.reason || "").trim();
  });
  return String((latest && latest.reason) || (user && user.blockReason) || (user && user.suspensionReason) || "Your account has been suspended. Please contact Support for more information.").trim();
}

function showBlockedCustomerState(user) {
  setSession(user);
  const form = document.getElementById("loginForm");
  const tabs = document.getElementById("loginRoleTabs");
  const switchText = document.getElementById("authSwitchText");
  const state = document.getElementById("blockedAccountState");
  const reason = document.getElementById("blockedAccountReason");
  const error = document.getElementById("loginFormError");
  if (form) form.classList.add("hidden");
  if (tabs) tabs.classList.add("hidden");
  if (switchText) switchText.classList.add("hidden");
  if (error) error.textContent = "";
  if (reason) reason.textContent = getCustomerSuspensionReason(user);
  if (state) state.classList.remove("hidden");
}

function logServeEaseActivity(action, details) {
  if (window.ServeEaseApi && typeof window.ServeEaseApi.logActivity === "function") {
    window.ServeEaseApi.logActivity({
      action: action,
      page: window.location.pathname.replace("/", "") || "auth",
      details: details || ""
    });
  }
}

function clearText(id) {
  const el = document.getElementById(id);
  if (el) el.textContent = "";
}

function showText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function clearInputState(input) {
  if (!input) return;
  input.classList.remove("error-field");
  input.classList.remove("success-field");
}

function setErrorState(input) {
  if (!input) return;
  input.classList.add("error-field");
  input.classList.remove("success-field");
}

function setSuccessState(input) {
  if (!input) return;
  input.classList.remove("error-field");
  input.classList.add("success-field");
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidPhone(value) {
  return /^[6-9]\d{9}$/.test(value.trim());
}

function isStrongPassword(value) {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@#$%^&*!]).{8,}$/.test(value);
}

function generateUserId(role, users) {
  const prefixMap = {
    customer: "CUS",
    provider: "PRO",
    support: "SUP",
    superuser: "SUR"
  };

  const prefix = prefixMap[role] || "USR";
  const data = getData();
  const candidates = users.concat(getProviderApprovalRequests(data));
  const maxId = candidates.reduce(function (max, user) {
    if (!user || user.role !== role || !String(user.id || "").startsWith(prefix)) return max;
    const numberPart = Number(String(user.id).replace(prefix, ""));
    return Number.isFinite(numberPart) ? Math.max(max, numberPart) : max;
  }, 0);

  return prefix + String(maxId + 1).padStart(3, "0");
}

function getEmployeeLoginDestination(employee) {
  const departmentParam = "?department=" + encodeURIComponent(employee.department || "");
  const destinations = {
    "Customer Operations": "customer-operations.html",
    "Provider Operations": "provider-operations.html",
    "Support": "support-dashboard.html",
    "Finance": "finance-operations.html"
  };
  return destinations[employee.department] || "employee-department-placeholder.html" + departmentParam;
}

function setupLoginTabs() {
  const tabsContainer = document.getElementById("loginRoleTabs");
  if (!tabsContainer) return;

  seedDefaultUsers();

  const tabs = tabsContainer.querySelectorAll(".role-tab");
  const label = document.getElementById("loginEmailLabel");
  const input = document.getElementById("loginEmail");
  const emailGroup = document.getElementById("loginEmailGroup");
  const employeeDepartmentGroup = document.getElementById("employeeDepartmentGroup");
  const employeeIdGroup = document.getElementById("employeeIdGroup");
  const employeeDepartmentInput = document.getElementById("employeeDepartment");
  const employeeIdInput = document.getElementById("loginEmployeeId");
  const forgotLink = document.querySelector(".login-forgot-link");
  const authSwitchText = document.getElementById("authSwitchText");

  function clearLoginMessages() {
    [
      "loginEmailError",
      "employeeDepartmentError",
      "loginEmployeeIdError",
      "loginPasswordError",
      "loginFormError",
      "loginSuccess"
    ].forEach(clearText);

    [
      input,
      employeeDepartmentInput,
      employeeIdInput,
      document.getElementById("loginPassword")
    ].forEach(clearInputState);
  }

  function updateSignupVisibility(role) {
    if (!authSwitchText) return;

    if (role === "customer" || role === "provider") {
      authSwitchText.innerHTML = 'Don’t have an account? <a href="signup.html" id="signupLink">Sign Up</a>';
    } else if (role === "employee") {
      authSwitchText.textContent = "Employee accounts are created by ServeEase administration.";
    } else if (role === "superuser") {
      authSwitchText.textContent = 'Super user access is restricted. No self-sign up is allowed.';
    }
  }

  function updateFormMode(role) {
    const isEmployee = role === "employee";

    if (emailGroup) emailGroup.classList.toggle("hidden", isEmployee);
    if (employeeDepartmentGroup) employeeDepartmentGroup.classList.toggle("hidden", !isEmployee);
    if (employeeIdGroup) employeeIdGroup.classList.toggle("hidden", !isEmployee);
    if (forgotLink) forgotLink.classList.toggle("hidden", isEmployee);

    if (!isEmployee && label && input) {
      if (role === "superuser") {
        label.textContent = "Super User Email";
        input.placeholder = "Enter your super user email";
      } else if (role === "provider") {
        label.textContent = "Provider Email";
        input.placeholder = "Enter your provider email";
      } else {
        label.textContent = "Email";
        input.placeholder = "Enter your email";
      }
    }
  }

  updateSignupVisibility("customer");
  updateFormMode("customer");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      const role = tab.dataset.role;

      clearLoginMessages();
      updateSignupVisibility(role);
      updateFormMode(role);
    });
  });

  const requestedRole = new URLSearchParams(window.location.search).get("role");
  const requestedTab = Array.from(tabs).find(function (tab) {
    return tab.dataset.role === requestedRole;
  });
  if (requestedTab && !requestedTab.classList.contains("active")) {
    requestedTab.click();
  }
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    clearText("loginEmailError");
    clearText("employeeDepartmentError");
    clearText("loginEmployeeIdError");
    clearText("loginPasswordError");
    clearText("loginFormError");
    clearText("loginSuccess");

    const emailInput = document.getElementById("loginEmail");
    const employeeDepartmentInput = document.getElementById("employeeDepartment");
    const employeeIdInput = document.getElementById("loginEmployeeId");
    const passwordInput = document.getElementById("loginPassword");

    clearInputState(emailInput);
    clearInputState(employeeDepartmentInput);
    clearInputState(employeeIdInput);
    clearInputState(passwordInput);

    const activeRole = document.querySelector("#loginRoleTabs .role-tab.active")?.dataset.role;
    const email = emailInput ? emailInput.value.trim() : "";
    const selectedDepartment = employeeDepartmentInput ? employeeDepartmentInput.value.trim() : "";
    const employeeId = employeeIdInput ? employeeIdInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    let valid = true;

    if (activeRole === "employee") {
      if (!selectedDepartment) {
        showText("employeeDepartmentError", "Department is required.");
        setErrorState(employeeDepartmentInput);
        valid = false;
      } else {
        setSuccessState(employeeDepartmentInput);
      }

      if (!employeeId) {
        showText("loginEmployeeIdError", "Employee ID is required.");
        setErrorState(employeeIdInput);
        valid = false;
      } else {
        setSuccessState(employeeIdInput);
      }

      if (!password) {
        showText("loginPasswordError", "Password is required.");
        setErrorState(passwordInput);
        valid = false;
      } else {
        setSuccessState(passwordInput);
      }

      if (!valid) return;

      const employeeAuth = window.ServeEaseEmployeeAuth;
      if (!employeeAuth || typeof employeeAuth.authenticate !== "function" || typeof employeeAuth.setEmployeeSession !== "function") {
        showText("loginFormError", "Employee authentication is unavailable. Please try again.");
        logServeEaseActivity("employee_login_unavailable", employeeId);
        return;
      }

      const employee = employeeAuth.authenticate(employeeId, password);
      if (!employee) {
        showText("loginFormError", "Invalid employee ID or password.");
        setErrorState(employeeIdInput);
        setErrorState(passwordInput);
        logServeEaseActivity("employee_login_failed", employeeId);
        return;
      }

      if (employee.department !== selectedDepartment) {
        showText("loginFormError", "Selected department does not match this employee account.");
        setErrorState(employeeDepartmentInput);
        logServeEaseActivity("employee_department_mismatch", employee.employeeId + " " + selectedDepartment);
        return;
      }

      employeeAuth.setEmployeeSession(employee);
      logServeEaseActivity("employee_login_success", employee.employeeId + " " + employee.department);
      showText("loginSuccess", "Login successful. Redirecting...");

      setTimeout(function () {
        window.location.href = getEmployeeLoginDestination(employee);
      }, 900);
      return;
    }

    if (!email) {
      showText("loginEmailError", "Email is required.");
      setErrorState(emailInput);
      valid = false;
    } else if (!isValidEmail(email)) {
      showText("loginEmailError", "Enter a valid email address.");
      setErrorState(emailInput);
      valid = false;
    } else {
      setSuccessState(emailInput);
    }

    if (!password) {
      showText("loginPasswordError", "Password is required.");
      setErrorState(passwordInput);
      valid = false;
    } else {
      setSuccessState(passwordInput);
    }

    if (!valid) return;

    const data = getData();
    const approvalRequests = getProviderApprovalRequests(data);
    const matchedUser = data.users.find(function (user) {
      return (
        user.role === activeRole &&
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password
      );
    });

    if (!matchedUser) {
      const pendingProvider = activeRole === "provider"
        ? approvalRequests.find(function (request) {
            return request.email &&
              request.email.toLowerCase() === email.toLowerCase() &&
              request.password === password;
          })
        : null;

      if (pendingProvider) {
        pendingProvider.role = "provider";
        setSession(pendingProvider);
        showText("loginSuccess", "Login successful. Redirecting to verification status...");
        logServeEaseActivity("provider_login_verification_status", email);
        setTimeout(function () {
          window.location.href = "provider-verification-status.html";
        }, 700);
        return;
      }

      const roleMismatchUser = data.users.find(function (user) {
        return user.email.toLowerCase() === email.toLowerCase() && user.password === password;
      });

      if (roleMismatchUser) {
        showText("loginFormError", "Invalid email or password.");
        logServeEaseActivity("login_role_mismatch", activeRole + " " + email);
      } else {
        showText("loginFormError", "Invalid email or password.");
        logServeEaseActivity("login_failed", activeRole + " " + email);
      }
      return;
    }

    const providerOperationalStatus = matchedUser.role === "provider"
      ? String(matchedUser.accountStatus || matchedUser.status || matchedUser.approvalStatus || matchedUser.verificationStatus || "Under Verification").trim().toLowerCase()
      : "";
    const customerOperationalStatus = matchedUser.role === "customer"
      ? String(matchedUser.accountStatus || matchedUser.status || "Active").trim().toLowerCase()
      : "";
    if (matchedUser.role === "customer" && customerOperationalStatus === "blocked") {
      showBlockedCustomerState(matchedUser);
      logServeEaseActivity("customer_login_status_blocked", matchedUser.email);
      return;
    }
    if (matchedUser.role === "provider" && ["active", "approved", "verified"].indexOf(providerOperationalStatus) === -1) {
      setSession(matchedUser);
      showText("loginSuccess", "Login successful. Redirecting to verification status...");
      logServeEaseActivity("provider_login_status_blocked", matchedUser.email);
      setTimeout(function () {
        window.location.href = "provider-verification-status.html";
      }, 700);
      return;
    }

    setSession(matchedUser);
    logServeEaseActivity("login_success", matchedUser.role + " " + matchedUser.email);
    showText("loginSuccess", "Login successful. Redirecting...");

    setTimeout(function () {
      if (matchedUser.role === "customer") {
        if (window.ServeEaseBookingDraft && window.ServeEaseBookingDraft.hasPendingBooking()) {
          window.location.href = "booking-checkout.html";
        } else {
          window.location.href = "customer-dashboard.html";
        }
      } else if (matchedUser.role === "provider") {
        window.location.href = "provider-dashboard.html";
      } else if (matchedUser.role === "support") {
        window.location.href = "support-dashboard.html";
      } else if (matchedUser.role === "superuser") {
        window.location.href = "superuser-dashboard.html";
      } else {
        window.location.href = "index.html";
      }
    }, 900);
  });
}

function populateProviderServiceCategories() {
  const serviceTypeSelect = document.getElementById("serviceType");
  if (!serviceTypeSelect) return;

  const serviceOptions = [
    "Home cleaning",
    "Carpentry",
    "Painting",
    "Salon at Home",
    "Plumbing",
    "Electrician",
    "Appliance Repair / Installation",
    "Pest Control"
  ];

  const options = serviceOptions
    .map(function (serviceName) {
      return '<option value="' + serviceName + '">' + serviceName + '</option>';
    })
    .join("");

  serviceTypeSelect.innerHTML = '<option value="">Select Service Category</option>' + options;
}

function populateProviderCities() {
  const citySelect = document.getElementById("providerCity");
  if (!citySelect) return;

  const options = getAllServeEaseCities()
    .map(function (city) {
      return '<option value="' + city.id + '">' + city.name + '</option>';
    })
    .join("");

  citySelect.innerHTML = '<option value="">Select City</option>' + options;
}


function setupSignupTabs() {
  const tabsContainer = document.getElementById("signupRoleTabs");
  if (!tabsContainer) return;

  const tabs = tabsContainer.querySelectorAll(".role-tab");
  const providerFields = document.getElementById("providerFields");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      if (tab.dataset.role === "provider") {
        providerFields.classList.remove("hidden");
        document.body.classList.add("provider-signup-mode");
      } else {
        providerFields.classList.add("hidden");
        document.body.classList.remove("provider-signup-mode");
      }
    });
  });
}

function setupSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    [
      "fullNameError",
      "emailError",
      "phoneError",
      "organisationNameError",
      "serviceTypeError",
      "experienceError",
      "providerCityError",
      "addressError",
      "idProofTypeError",
      "idProofFileError",
      "addressProofFileError",
      "skillCertificateFileError",
      "experienceProofFileError",
      "profilePhotoFileError",
      "passwordError",
      "confirmPasswordError",
      "signupFormError",
      "signupSuccess"
    ].forEach(clearText);

    const fullNameInput = document.getElementById("fullName");
    const emailInput = document.getElementById("email");
    const phoneInput = document.getElementById("phone");
    const organisationNameInput = document.getElementById("organisationName");
    const serviceTypeInput = document.getElementById("serviceType");
    const experienceInput = document.getElementById("experience");
    const providerCityInput = document.getElementById("providerCity");
    const addressInput = document.getElementById("address");
    const idProofTypeInput = document.getElementById("idProofType");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    [
      fullNameInput,
      emailInput,
      phoneInput,
      organisationNameInput,
      serviceTypeInput,
      experienceInput,
      providerCityInput,
      addressInput,
      idProofTypeInput,
      passwordInput,
      confirmPasswordInput
    ].forEach(clearInputState);

    const role = document.querySelector("#signupRoleTabs .role-tab.active")?.dataset.role;

    const data = getData();

    const approvalRequests = getProviderApprovalRequests(data);

    const resubmissionProviderId =
      role === "provider" ? authenticatedProviderId() : "";

    const resubmissionRecord =
      resubmissionProviderId
        ? getProviderResubmissionRecord()
        : null;

    if (resubmissionProviderId && !resubmissionRecord) {
      showText(
        "signupFormError",
        "Your provider profile could not be found. Please return to verification status and try again."
      );
      return;
    }

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const organisationName = organisationNameInput ? organisationNameInput.value.trim() : "";
    const serviceType = serviceTypeInput ? serviceTypeInput.value.trim() : "";
    const experience = experienceInput ? experienceInput.value.trim() : "";
    const providerCityId = providerCityInput ? providerCityInput.value.trim() : "";
    const providerCity = getCityById(providerCityId);
    const address = addressInput ? addressInput.value.trim() : "";
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    let valid = true;

    if (!fullName || fullName.length < 3) {
      showText("fullNameError", "Enter a valid full name.");
      setErrorState(fullNameInput);
      valid = false;
    } else if (!/^[A-Za-z\s]+$/.test(fullName)) {
      showText("fullNameError", "Name must contain letters only.");
      setErrorState(fullNameInput);
      valid = false;
    } else {
      setSuccessState(fullNameInput);
    }

    if (!email || !isValidEmail(email)) {
      showText("emailError", "Enter a valid email address.");
      setErrorState(emailInput);
      valid = false;
    } else {
      setSuccessState(emailInput);
    }

    if (!phone || !isValidPhone(phone)) {
      showText("phoneError", "Enter a valid 10-digit phone number.");
      setErrorState(phoneInput);
      valid = false;
    } else {
      setSuccessState(phoneInput);
    }

    if (role === "provider") {
      if (!organisationName || organisationName.length < 2) {
        showText("organisationNameError", "Enter a valid organisation name.");
        setErrorState(organisationNameInput);
        valid = false;
      } else {
        setSuccessState(organisationNameInput);
      }

      if (!serviceType) {
        showText("serviceTypeError", "Service category is required.");
        setErrorState(serviceTypeInput);
        valid = false;
      } else {
        setSuccessState(serviceTypeInput);
      }

      if (!experience || Number(experience) < 0 || Number(experience) > 50) {
        showText("experienceError", "Enter valid experience.");
        setErrorState(experienceInput);
        valid = false;
      } else {
        setSuccessState(experienceInput);
      }

      if (!providerCityId) {
        showText("providerCityError", "City is required.");
        setErrorState(providerCityInput);
        valid = false;
      } else {
        setSuccessState(providerCityInput);
      }

      if (!address || address.length < 5) {
        showText("addressError", "Enter a valid address.");
        setErrorState(addressInput);
        valid = false;
      } else {
        setSuccessState(addressInput);
      }

      if (!idProofTypeInput.value) {
        showText("idProofTypeError", "Select the ID proof type.");
        setErrorState(idProofTypeInput);
        valid = false;
      } else {
        setSuccessState(idProofTypeInput);
      }

      [
        ["idProofFile", "idProofFileError", "Upload ID proof.", "id"],
        ["addressProofFile", "addressProofFileError", "Upload address proof.", "address"],
        ["profilePhotoFile", "profilePhotoFileError", "Upload profile photo.", "profile"]
      ].forEach(function (item) {
        const input = document.getElementById(item[0]);
        const hasNewFile = Boolean(
          input &&
          input.files &&
          input.files.length
        );

        const hasExistingDocument = Boolean(
          resubmissionRecord &&
          Array.isArray(resubmissionRecord.documents) &&
          resubmissionRecord.documents.some(function (document) {
            return providerDocumentKey(document.documentType) === item[3];
          })
        );

        if (
          !hasNewFile &&
          !(resubmissionRecord && hasExistingDocument)
        ) {
          showText(item[1], item[2]);
          setErrorState(input);
          valid = false;
        } else {
          setSuccessState(input);
        }
      });
    }

    if (!password || !isStrongPassword(password)) {
      showText("passwordError", "Password must include upper, lower, number and special character.");
      setErrorState(passwordInput);
      valid = false;
    } else {
      setSuccessState(passwordInput);
    }

    if (!confirmPassword || confirmPassword !== password) {
      showText("confirmPasswordError", "Passwords do not match.");
      setErrorState(confirmPasswordInput);
      valid = false;
    } else {
      setSuccessState(confirmPasswordInput);
    }

    if (!valid) return;

    const canonicalProviderEmail =
      String(
        resubmissionRecord &&
        resubmissionRecord.email ||
        ""
      )
        .trim()
        .toLowerCase();

    const canonicalProviderPhone =
      String(
        resubmissionRecord &&
        resubmissionRecord.phone ||
        ""
      ).trim();

    const retainsCanonicalProviderEmail = Boolean(
      resubmissionProviderId &&
      canonicalProviderEmail &&
      email.toLowerCase() === canonicalProviderEmail
    );

    const retainsCanonicalProviderPhone = Boolean(
      resubmissionProviderId &&
      canonicalProviderPhone &&
      phone === canonicalProviderPhone
    );

    const duplicateEmail =
      !retainsCanonicalProviderEmail &&
      (
        data.users.some(function (user) {
          return (
            user.email &&
            user.email.toLowerCase() ===
              email.toLowerCase() &&
            (
              !resubmissionProviderId ||
              !providerRecordMatchesId(
                user,
                resubmissionProviderId
              )
            )
          );
        }) ||
        approvalRequests.some(function (request) {
          return (
            request.email &&
            request.email.toLowerCase() ===
              email.toLowerCase() &&
            (
              !resubmissionProviderId ||
              !providerRecordMatchesId(
                request,
                resubmissionProviderId
              )
            )
          );
        })
      );

    const duplicatePhone =
      !retainsCanonicalProviderPhone &&
      (
        data.users.some(function (user) {
          return (
            user.phone &&
            user.phone === phone &&
            (
              !resubmissionProviderId ||
              !providerRecordMatchesId(
                user,
                resubmissionProviderId
              )
            )
          );
        }) ||
        approvalRequests.some(function (request) {
          return (
            request.phone &&
            request.phone === phone &&
            (
              !resubmissionProviderId ||
              !providerRecordMatchesId(
                request,
                resubmissionProviderId
              )
            )
          );
        })
      );

    if (duplicateEmail) {
      showText("signupFormError", "Email already exists.");
      return;
    }

    if (duplicatePhone) {
      showText("signupFormError", "Phone number already exists.");
      return;
    }

    const newUser = resubmissionRecord ? Object.assign({}, resubmissionRecord, { id: resubmissionProviderId }) : {
      id: generateUserId(role, data.users),
      role: role,
      fullName: fullName,
      email: email,
      phone: phone,
      password: password
    };

    newUser.role = role;
    newUser.fullName = fullName;
    newUser.email = email;
    newUser.phone = phone;
    newUser.password = password;

    if (role === "provider") {
      newUser.organisationName = organisationName;
      newUser.serviceType = serviceType;
      newUser.experience = Number(experience);
      newUser.cityId = Number(providerCity.id);
      newUser.cityName = providerCity.name;
      newUser.location = providerCity.name;
      newUser.address = address;
      newUser.providerCatalogId = slugifyProviderName(organisationName || fullName);
      newUser.approvalStatus = "Pending Approval";
      newUser.verificationStatus = "Pending";
      newUser.accountStatus = "Under Verification";
      newUser.status = "Under Verification";
      try {
        newUser.documents = await buildProviderDocumentPayload(newUser.id, resubmissionRecord && resubmissionRecord.documents);
      } catch (error) {
        showText("signupFormError", "Unable to read uploaded documents. Please try again.");
        return;
      }
      const submittedDate = window.ServeEaseDate ? window.ServeEaseDate.nowDate() : new Date().toLocaleDateString("en-GB");
      const submittedDateTime = window.ServeEaseDate && typeof window.ServeEaseDate.nowDateTime === "function" ? window.ServeEaseDate.nowDateTime() : new Date().toLocaleString("en-IN");
      newUser.registrationDate = newUser.registrationDate || submittedDate;
      newUser.submittedDate = submittedDate;
      newUser.resubmittedDate = resubmissionRecord ? submittedDate : newUser.resubmittedDate;
      newUser.statusHistory = Array.isArray(newUser.statusHistory) ? newUser.statusHistory.slice() : [];
      newUser.statusHistory.push({
        dateTime: submittedDateTime,
        action: resubmissionRecord ? "Provider verification resubmitted" : "Provider signup submitted",
        previousStatus: resubmissionRecord ? "Rejected" : "New",
        newStatus: "Under Verification",
        reason: resubmissionRecord ? "Provider resubmitted verification after rejection." : "",
        remarks: "Awaiting Provider Operations verification",
        performedBy: "Provider"
      });
      newUser.rejectionReason = "";
    }

    if (role === "provider") {
      const existingIndex = approvalRequests.findIndex(function (request) { return providerRecordMatchesId(request, newUser.id); });
      if (existingIndex >= 0) approvalRequests[existingIndex] = newUser;
      else approvalRequests.push(newUser);
      data.users = data.users.map(function (user) {
        return user.role === "provider" && providerRecordMatchesId(user, newUser.id)
          ? Object.assign({}, user, newUser)
          : user;
      });
      data.providers = (Array.isArray(data.providers) ? data.providers : []).map(function (provider) {
        const matches = providerRecordMatchesId(provider, newUser.id);
        return matches ? Object.assign({}, provider, {
          accountStatus: "Under Verification",
          approvalStatus: "Pending Approval",
          verificationStatus: "Pending",
          status: "Under Verification",
          verified: false,
          rejectionReason: ""
        }) : provider;
      });
      Object.keys(localStorage).forEach(function (key) {
        if (key.indexOf("serveEaseProviderModuleData") !== 0) return;
        try {
          const moduleData = JSON.parse(localStorage.getItem(key) || "null");
          const profile = moduleData && moduleData.profile;
          if (!profile || !providerRecordMatchesId(profile, newUser.id)) return;
          Object.assign(profile, {
            accountStatus: "Under Verification",
            approvalStatus: "Pending Approval",
            verificationStatus: "Pending",
            status: "Under Verification",
            rejectionReason: ""
          });
          localStorage.setItem(key, JSON.stringify(moduleData));
        } catch (error) {}
      });
      if (resubmissionRecord) syncUpdatedProviderVerificationRequest(newUser);
      else syncProviderVerificationRequest(newUser);
    } else {
      data.users.push(newUser);
    }
    setData(data);
    logServeEaseActivity("signup_success", newUser.role + " " + newUser.email);

    showText(
      "signupSuccess",
      role === "provider"
        ? "Registration submitted for Provider Operations verification. You can log in to check status."
        : "Registration successful. Signing you in..."
    );

    setTimeout(function () {
      if (role === "customer") {
        // Reuse the same session creation path used by normal login.
        setSession(newUser);
        const hasPendingBooking = window.ServeEaseBookingDraft &&
          window.ServeEaseBookingDraft.hasPendingBooking() &&
          window.ServeEaseBookingDraft.hasCheckoutRedirect();
        window.location.href = hasPendingBooking
          ? "booking-checkout.html"
          : "customer-dashboard.html";
      } else if (resubmissionRecord) {
        setSession(newUser);
        try {
          sessionStorage.removeItem("serveEaseProviderResubmitId");
          sessionStorage.removeItem("serveEaseProviderResubmitEmail");
        } catch (error) {}
        window.location.href = "provider-verification-status.html";
      } else {
        // Provider accounts still require approval before login.
        window.location.href = "login.html";
      }
    }, 1000);
  });
}

function setupForgotPasswordForm() {
  const form = document.getElementById("forgotPasswordForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    clearText("forgotEmailError");
    clearText("forgotFormError");
    clearText("forgotSuccess");

    const emailInput = document.getElementById("forgotEmail");
    clearInputState(emailInput);

    const email = emailInput.value.trim();
    let valid = true;

    if (!email) {
      showText("forgotEmailError", "Registered email is required.");
      setErrorState(emailInput);
      valid = false;
    } else if (!isValidEmail(email)) {
      showText("forgotEmailError", "Enter a valid email address.");
      setErrorState(emailInput);
      valid = false;
    } else {
      setSuccessState(emailInput);
    }

    if (!valid) return;

    const resetCard = document.getElementById("forgotResetCard");
    const successCard = document.getElementById("forgotSuccessCard");

    if (resetCard && successCard) {
      resetCard.classList.add("hidden");
      successCard.classList.remove("hidden");
    }
  });
}

seedDefaultUsers();
populateProviderCities();
setupLoginTabs();
setupLoginForm();
setupSignupTabs();
setupSignupForm();
prepareProviderResubmission();
setupForgotPasswordForm();

function setupPasswordVisibility() {
  const passwordInputs = document.querySelectorAll("#loginPassword, #password, #confirmPassword");
  const eyeIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"></path><circle cx="12" cy="12" r="2.5"></circle></svg>';
  const eyeSlashIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 3 18 18"></path><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3.1 3.8M6.1 6.7C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6"></path><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"></path></svg>';

  passwordInputs.forEach(function (input) {
    if (!input || input.dataset.passwordToggleReady) return;

    const wrapper = document.createElement("div");
    wrapper.className = "password-input-wrap";
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "password-toggle";
    toggle.setAttribute("aria-label", "Show password");
    toggle.setAttribute("aria-pressed", "false");

    function updateToggle() {
      const isVisible = input.type === "text";
      toggle.innerHTML = isVisible ? eyeSlashIcon : eyeIcon;
      toggle.setAttribute("aria-label", isVisible ? "Hide password" : "Show password");
      toggle.setAttribute("aria-pressed", String(isVisible));
    }

    toggle.addEventListener("click", function () {
      input.type = input.type === "password" ? "text" : "password";
      updateToggle();
      input.focus({ preventScroll: true });
    });

    wrapper.appendChild(toggle);
    input.dataset.passwordToggleReady = "true";
    updateToggle();
  });
}

setupPasswordVisibility();
