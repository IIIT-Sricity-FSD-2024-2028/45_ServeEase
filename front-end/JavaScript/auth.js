function getData() {
  return JSON.parse(localStorage.getItem("serveEaseData")) || { users: [] };
}

function setData(data) {
  localStorage.setItem("serveEaseData", JSON.stringify(data));
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
      serviceType: "Home Cleaning",
      experience: 6,
      address: "No. 22, Anna Nagar, Chennai"
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
    if (!user || !user.email) return;
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
        ...defaultUser
      };
    } else {
      mergedUsers.push(defaultUser);
    }
  });

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
    address: user.address || ""
  };
  sessionStorage.setItem("serveEaseSession", JSON.stringify(sessionData));
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
  const count = users.filter(function (user) {
    return user.role === role;
  }).length + 1;

  return prefix + String(count).padStart(3, "0");
}

function setupLoginTabs() {
  const tabsContainer = document.getElementById("loginRoleTabs");
  if (!tabsContainer) return;

  seedDefaultUsers();

  const tabs = tabsContainer.querySelectorAll(".role-tab");
  const label = document.getElementById("loginEmailLabel");
  const input = document.getElementById("loginEmail");
  const authSwitchText = document.getElementById("authSwitchText");
  const signupLink = document.getElementById("signupLink");

  function updateSignupVisibility(role) {
    if (!authSwitchText || !signupLink) return;

    if (role === "customer" || role === "provider") {
      authSwitchText.innerHTML = 'Don’t have an account? <a href="signup.html" id="signupLink">Sign Up</a>';
    } else if (role === "support") {
      authSwitchText.textContent = 'Support staff accounts are created by the system superuseristrator.';
    } else if (role === "superuser") {
      authSwitchText.textContent = 'Super user access is restricted. No self-sign up is allowed.';
    }
  }

  updateSignupVisibility("customer");

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      tabs.forEach(function (item) {
        item.classList.remove("active");
      });

      tab.classList.add("active");

      const role = tab.dataset.role;

      updateSignupVisibility(role);

      if (role === "support") {
        label.textContent = "Support Staff Email";
        input.placeholder = "Enter your staff email";
      } else if (role === "superuser") {
        label.textContent = "Super User Email";
        input.placeholder = "Enter your super user email";
      } else if (role === "provider") {
        label.textContent = "Provider Email";
        input.placeholder = "Enter your provider email";
      } else {
        label.textContent = "Email";
        input.placeholder = "Enter your email";
      }
    });
  });
}

function setupLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    clearText("loginEmailError");
    clearText("loginPasswordError");
    clearText("loginFormError");
    clearText("loginSuccess");

    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");

    clearInputState(emailInput);
    clearInputState(passwordInput);

    const activeRole = document.querySelector("#loginRoleTabs .role-tab.active")?.dataset.role;
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    let valid = true;

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
    const matchedUser = data.users.find(function (user) {
      return (
        user.role === activeRole &&
        user.email.toLowerCase() === email.toLowerCase() &&
        user.password === password
      );
    });

    if (!matchedUser) {
      const roleMismatchUser = data.users.find(function (user) {
        return user.email.toLowerCase() === email.toLowerCase() && user.password === password;
      });

      if (roleMismatchUser) {
        showText("loginFormError", "Credentials are correct, but the selected role is different. Please choose the " + roleMismatchUser.role + " tab.");
      } else {
        showText("loginFormError", "Invalid credentials for selected role.");
      }
      return;
    }

    setSession(matchedUser);
    showText("loginSuccess", "Login successful. Redirecting...");

    setTimeout(function () {
      if (matchedUser.role === "customer") {
        window.location.href = "customer-dashboard.html";
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
      } else {
        providerFields.classList.add("hidden");
      }
    });
  });
}

function setupSignupForm() {
  const form = document.getElementById("signupForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    [
      "fullNameError",
      "emailError",
      "phoneError",
      "organisationNameError",
      "serviceTypeError",
      "experienceError",
      "addressError",
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
    const addressInput = document.getElementById("address");
    const passwordInput = document.getElementById("password");
    const confirmPasswordInput = document.getElementById("confirmPassword");

    [
      fullNameInput,
      emailInput,
      phoneInput,
      organisationNameInput,
      serviceTypeInput,
      experienceInput,
      addressInput,
      passwordInput,
      confirmPasswordInput
    ].forEach(clearInputState);

    const role = document.querySelector("#signupRoleTabs .role-tab.active")?.dataset.role;

    const fullName = fullNameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();
    const organisationName = organisationNameInput ? organisationNameInput.value.trim() : "";
    const serviceType = serviceTypeInput ? serviceTypeInput.value.trim() : "";
    const experience = experienceInput ? experienceInput.value.trim() : "";
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

      if (!address || address.length < 5) {
        showText("addressError", "Enter a valid address.");
        setErrorState(addressInput);
        valid = false;
      } else {
        setSuccessState(addressInput);
      }
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

    const data = getData();

    const duplicateEmail = data.users.some(function (user) {
      return user.email.toLowerCase() === email.toLowerCase();
    });

    const duplicatePhone = data.users.some(function (user) {
      return user.phone === phone;
    });

    if (duplicateEmail) {
      showText("signupFormError", "Email already exists.");
      return;
    }

    if (duplicatePhone) {
      showText("signupFormError", "Phone number already exists.");
      return;
    }

    const newUser = {
      id: generateUserId(role, data.users),
      role: role,
      fullName: fullName,
      email: email,
      phone: phone,
      password: password
    };

    if (role === "provider") {
      newUser.organisationName = organisationName;
      newUser.serviceType = serviceType;
      newUser.experience = Number(experience);
      newUser.address = address;
    }

    data.users.push(newUser);
    setData(data);

    showText("signupSuccess", "Registration successful. Redirecting to login...");

    setTimeout(function () {
      window.location.href = "login.html";
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

    const data = getData();
    const userExists = data.users.some(function (user) {
      return user.email.toLowerCase() === email.toLowerCase();
    });

    if (!userExists) {
      showText("forgotFormError", "No account found with this email.");
      return;
    }

    const resetCard = document.getElementById("forgotResetCard");
    const successCard = document.getElementById("forgotSuccessCard");

    if (resetCard && successCard) {
      resetCard.classList.add("hidden");
      successCard.classList.remove("hidden");
    }
  });
}

seedDefaultUsers();
setupLoginTabs();
setupLoginForm();
setupSignupTabs();
setupSignupForm();
setupForgotPasswordForm();