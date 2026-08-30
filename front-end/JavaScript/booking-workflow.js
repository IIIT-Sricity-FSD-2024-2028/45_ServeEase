(function () {
  "use strict";
  const AUTO_CANCEL_REASON = "Automatically cancelled because the provider did not confirm the booking before the scheduled service date.";
  const REFERENCE_PATTERN = /^BOOK-\d{8}-\d{4}-\d{4}$/;

  function parseServiceDate(value) {
    const text = String(value || "").trim();
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    match = text.match(/^(\d{1,2})[-/]([\d]{1,2})[-/](\d{4})/);
    if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
    match = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (match) {
      const month = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"].indexOf(match[2].toLowerCase());
      if (month !== -1) return new Date(Number(match[3]), month, Number(match[1]));
    }
    const parsed = new Date(text);
    return Number.isNaN(parsed.getTime()) ? null : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  function normalizeReference(value, mapping) {
    const source = String(value || "").trim();
    if (!source) return source;
    if (REFERENCE_PATTERN.test(source)) return source;
    if (mapping && mapping[source]) return mapping[source];
    const numberMatch = source.match(/(\d{1,})$/);
    const sequence = numberMatch ? Math.max(1, Number(numberMatch[1])) : 1;
    return "BOOK-20260101-0000-" + String(sequence).padStart(4, "0").slice(-4);
  }

  function referenceTimestamp(value, fallbackTime) {
    const date = value ? new Date(value) : new Date();
    const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
    let hours = 0; let minutes = 0;
    const match = String(fallbackTime || "").match(/(\d{1,2}):(\d{2})\s*([AP]M)?/i);
    if (match) {
      hours = Number(match[1]); minutes = Number(match[2]);
      if ((match[3] || "").toUpperCase() === "PM" && hours < 12) hours += 12;
      if ((match[3] || "").toUpperCase() === "AM" && hours === 12) hours = 0;
    }
    return new Date(safeDate.getFullYear(), safeDate.getMonth(), safeDate.getDate(), hours, minutes);
  }

  function generateReference(bookings, createdAt, time) {
    const stamp = referenceTimestamp(createdAt, time);
    const datePart = stamp.getFullYear() + String(stamp.getMonth() + 1).padStart(2, "0") + String(stamp.getDate()).padStart(2, "0");
    const timePart = String(stamp.getHours()).padStart(2, "0") + String(stamp.getMinutes()).padStart(2, "0");
    const list = Array.isArray(bookings) ? bookings : [];
    const used = new Set(list.map(function (item) { return String(item && (item.bookingRef || item.id) || ""); }));
    let sequence = list.reduce(function (max, item) {
      const match = String(item && (item.bookingRef || item.id) || "").match(/BOOK-\d{8}-\d{4}-(\d{4})$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    let result = "BOOK-" + datePart + "-" + timePart + "-" + String(sequence).padStart(4, "0");
    while (used.has(result)) result = "BOOK-" + datePart + "-" + timePart + "-" + String(++sequence).padStart(4, "0");
    return result;
  }

  function autoCancel(bookings, now) {
    let changed = false;
    (Array.isArray(bookings) ? bookings : []).forEach(function (booking) {
      if (!booking) return;
      if (booking.cancellationReason === AUTO_CANCEL_REASON) {
        booking.status = "Pending";
        booking.category = "Pending";
        delete booking.cancellationReason;
        changed = true;
      }
    });
    return changed;
  }

  function normalizeData(data) {
    if (!data || typeof data !== "object") return { data: data, changed: false };
    let changed = false; const mapping = {};
    const bookings = Array.isArray(data.bookings) ? data.bookings : [];
    bookings.forEach(function (booking) {
      if (!booking) return;
      const old = booking.bookingRef || booking.id; const next = normalizeReference(old, mapping);
      if (old && next !== old) { mapping[old] = next; changed = true; }
      if (booking.id !== next) { booking.id = next; changed = true; }
      if (booking.bookingRef && booking.bookingRef !== next) { booking.bookingRef = next; changed = true; }
    });
    if (autoCancel(bookings)) changed = true;
    ["payments", "tickets", "transactions"].forEach(function (key) {
      (Array.isArray(data[key]) ? data[key] : []).forEach(function (item) {
        ["bookingRef", "bookingReference", "bookingId", "relatedBookingId"].forEach(function (field) {
          if (!item || !item[field]) return;
          const next = normalizeReference(item[field], mapping);
          if (next !== item[field]) { item[field] = next; changed = true; }
        });
      });
    });
    return { data: data, changed: changed };
  }

  window.ServeEaseBookingWorkflow = { autoCancel: autoCancel, normalizeData: normalizeData, normalizeReference: normalizeReference, generateReference: generateReference, getAutoCancelReason: function () { return AUTO_CANCEL_REASON; } };
})();
