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
  var CITIES = [
    { id: 1, name: 'Chennai' },
    { id: 2, name: 'Bangalore' },
    { id: 3, name: 'Hyderabad' },
    { id: 4, name: 'Delhi' },
    { id: 5, name: 'Mumbai' }
  ];

  var LS_KEY = 'serveEaseSelectedCity';
  var DEFAULT_CITY = CITIES[0]; // Chennai

  /* ── 2. State helpers ─────────────────────────────────────
   *  City is stored as { id, name } — never as a plain string.
   * ─────────────────────────────────────────────────────── */
  function saveCity(city) {
    localStorage.setItem(LS_KEY, JSON.stringify(city));
  }

  function loadCity() {
    try {
      var stored = JSON.parse(localStorage.getItem(LS_KEY));
      if (stored && stored.id && stored.name) return stored;
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
      return p.cityId === cityId;
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

    CITIES.forEach(function (city) {
      var option = document.createElement('option');
      option.value = city.id;
      option.textContent = city.name;
      if (city.id === _selectedCity.id) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', function () {
      var chosenId = Number(this.value);
      var chosenCity = CITIES.find(function (c) { return c.id === chosenId; });
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
    cities: CITIES,
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
