/**
 * ServeEase — Location Module
 * ============================================================
 * Central module for city-based filtering.
 * All city data lives here.  Filtering logic is exposed via
 * getProvidersByCity() — one function, used everywhere.
 *
 * Future API swap:
 *   Replace getProvidersByCity() body with:
 *   return fetch(`/api/providers?cityId=${cityId}`).then(r => r.json());
 * ============================================================
 */

(function (global) {
  'use strict';

  /* ── 1. City catalogue ─────────────────────────────────── */
  var BASE_CITIES = [
    { id: 1, name: 'Chennai' },
    { id: 2, name: 'Bangalore' },
    { id: 3, name: 'Hyderabad' },
    { id: 4, name: 'Delhi' },
    { id: 5, name: 'Mumbai' }
  ];

  var LS_KEY = 'serveEaseSelectedCity';
  var CUSTOM_CITIES_KEY = 'serveEaseCustomCities';
  var DEFAULT_CITY = BASE_CITIES[0]; // Chennai

  function normalizeCityName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ');
  }

  function loadCustomCities() {
    try {
      var customCities = JSON.parse(localStorage.getItem(CUSTOM_CITIES_KEY));
      if (Array.isArray(customCities)) {
        return customCities.filter(function (city) {
          return city && city.id && city.name;
        });
      }
    } catch (e) { /* ignore */ }
    return [];
  }

  function saveCustomCities(cities) {
    localStorage.setItem(CUSTOM_CITIES_KEY, JSON.stringify(cities));
  }

  function getAllCities() {
    var seen = {};
    return BASE_CITIES.concat(loadCustomCities()).filter(function (city) {
      var key = String(city.name || '').toLowerCase();
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function registerCity(cityName) {
    var name = normalizeCityName(cityName);
    if (!name) return DEFAULT_CITY;

    var existing = getAllCities().find(function (city) {
      return city.name.toLowerCase() === name.toLowerCase();
    });
    if (existing) return existing;

    var allCities = getAllCities();
    var nextId = allCities.reduce(function (max, city) {
      return Math.max(max, Number(city.id) || 0);
    }, 0) + 1;
    var city = { id: nextId, name: name };
    var customCities = loadCustomCities();
    customCities.push(city);
    saveCustomCities(customCities);
    return city;
  }

  function getLocationStorageKey() {
    try {
      var session = JSON.parse(sessionStorage.getItem('serveEaseSession') || 'null');
      if (session && session.userId && session.email !== 'user@serveease.com' && session.email !== 'provider@serveease.com') {
        return LS_KEY + ':' + session.role + ':' + session.userId;
      }
    } catch (e) { /* ignore */ }
    return LS_KEY;
  }

  /* ── 2. State helpers ─────────────────────────────────────
   *  City is stored as { id, name } — never as a plain string.
   * ─────────────────────────────────────────────────────── */
  function saveCity(city) {
    localStorage.setItem(getLocationStorageKey(), JSON.stringify(city));
  }

  function loadCity() {
    try {
      var stored = JSON.parse(localStorage.getItem(getLocationStorageKey()));
      if (stored && stored.id && stored.name) {
        var cityExists = getAllCities().some(function (city) {
          return Number(city.id) === Number(stored.id);
        });
        if (cityExists) return stored;
      }
    } catch (e) { /* ignore */ }
    return DEFAULT_CITY;
  }

  /* ── 3. Core filtering function ───────────────────────────
   *  Single source of truth; no duplication elsewhere.
   *  Returns the slice of providers matching cityId.
   *  cityId must be a number (matches cityId field in mockdata).
   * ─────────────────────────────────────────────────────── */
  function getProvidersByCity(cityId) {
    var data;
    try {
      data = JSON.parse(localStorage.getItem('serveEaseData')) || {};
    } catch (e) {
      data = {};
    }
    var providers = data.providers || [];
    return providers.filter(function (p) {
      return Number(p.cityId) === Number(cityId);
    });
  }

  /* ── 4. Current selected city ─────────────────────────── */
  var _selectedCity = loadCity();

  function getSelectedCity() {
    return _selectedCity;
  }

  function setSelectedCity(city) {
    _selectedCity = city;
    saveCity(city);
    /* Notify all listeners */
    _listeners.forEach(function (fn) { fn(city); });
  }

  /* ── 5. Listener registry (pub-sub for city changes) ──── */
  var _listeners = [];

  function onCityChange(fn) {
    _listeners.push(fn);
  }

  /* ── 6. Build & inject the location selector ──────────── */
  function buildCitySelector(containerEl) {
    if (!containerEl) return;

    var wrap = document.createElement('div');
    wrap.className = 'city-selector-wrap';
    wrap.setAttribute('aria-label', 'Select city');

    var pin = document.createElement('span');
    pin.className = 'city-pin-icon';
    pin.textContent = '📍';

    var select = document.createElement('select');
    select.id = 'citySelectorDropdown';
    select.className = 'city-selector';
    select.setAttribute('aria-label', 'Choose your city');

    var cities = getAllCities();
    cities.forEach(function (city) {
      var option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.name;
      if (city.id === _selectedCity.id) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', function () {
      var chosenId = Number(this.value);
      var chosenCity = getAllCities().find(function (c) { return Number(c.id) === chosenId; });
      if (chosenCity) setSelectedCity(chosenCity);
    });

    wrap.appendChild(pin);
    wrap.appendChild(select);
    containerEl.appendChild(wrap);
  }

  /* ── 7. Auto-init: inject into every .nav-content ─────── */
  function initCitySelectors() {
    /* Look for a dedicated slot first; fall back to nav-actions */
    var slots = document.querySelectorAll('.city-selector-slot');
    if (slots.length === 0) {
      slots = document.querySelectorAll('.nav-actions');
    }
    slots.forEach(function (slot) {
      /* Avoid double-injection on pages that call init twice */
      if (!slot.querySelector('.city-selector-wrap')) {
        buildCitySelector(slot);
      }
    });
  }

  /* ── 8. Public API ─────────────────────────────────────── */
  global.ServeEaseLocation = {
    cities: getAllCities(),
    getCities: getAllCities,
    registerCity: registerCity,
    getSelectedCity: getSelectedCity,
    setSelectedCity: setSelectedCity,
    getProvidersByCity: getProvidersByCity,
    onCityChange: onCityChange,
    init: initCitySelectors
  };

  /* Auto-initialise when the DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCitySelectors);
  } else {
    initCitySelectors();
  }

}(window));
