(function () {
  const storageKey = "serveEaseBookingReviews";
  const demoFeedback = ["Professional and punctual.", "Excellent service.", "Highly recommended.", "Quick and clean work.", "Very satisfied.", "Good experience."];
  const demoRatings = [5, 5, 4, 3, 5, 5, 5, 4, 4, 5];

  function read() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); } catch (error) { return []; }
  }

  function write(reviews) {
    localStorage.setItem(storageKey, JSON.stringify(reviews));
  }

  function providerKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").replace(/s$/, "");
  }

  function find(bookingId) {
    return read().find(function (review) { return review.bookingId === bookingId; }) || null;
  }

  function submit(review) {
    const reviews = read();
    if (!review || !review.bookingId || find(review.bookingId)) return null;
    const saved = saveReview(review);
    if (!saved) return null;
    reviews.push(saved);
    write(reviews);
    return saved;
  }

  function saveReview(review, existing) {
    const rating = Number(review.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
    const saved = {
      bookingId: review.bookingId,
      providerId: review.providerId,
      customerId: review.customerId,
      rating: rating,
      feedback: String(review.feedback || "").trim(),
      createdAt: existing && existing.createdAt || review.createdAt || new Date().toISOString()
    };
    return saved;
  }

  function update(review) {
    const reviews = read();
    if (!review || !review.bookingId) return null;
    const index = reviews.findIndex(function (item) { return item.bookingId === review.bookingId; });
    if (index === -1) return null;
    const saved = saveReview(review, reviews[index]);
    if (!saved) return null;
    reviews[index] = saved;
    write(reviews);
    return saved;
  }

  function seedCompletedBookings(bookings, customerId) {
    if (!Array.isArray(bookings)) return;
    bookings.filter(function (booking) {
      return String(booking.status || booking.category || "").toLowerCase() === "completed";
    }).forEach(function (booking, index) {
      if (find(booking.id)) return;
      submit({
        bookingId: booking.id,
        providerId: booking.providerId || providerKey(booking.provider || booking.providerName),
        customerId: booking.customerId || customerId || "CUS001",
        rating: demoRatings[index % demoRatings.length],
        feedback: demoFeedback[index % demoFeedback.length],
        createdAt: new Date(Date.now() - (index + 1) * 86400000).toISOString()
      });
    });
  }

  function providerStats(providerIds) {
    const keys = (Array.isArray(providerIds) ? providerIds : [providerIds]).map(providerKey).filter(Boolean);
    const reviews = read().filter(function (review) { return keys.includes(providerKey(review.providerId)); });
    const total = reviews.length;
    return { total: total, average: total ? reviews.reduce(function (sum, review) { return sum + Number(review.rating || 0); }, 0) / total : 0 };
  }

  function forProvider(providerIds) {
    const keys = (Array.isArray(providerIds) ? providerIds : [providerIds]).map(providerKey).filter(Boolean);
    return read().filter(function (review) { return keys.includes(providerKey(review.providerId)); });
  }

  function stars(rating) {
    const rounded = Math.round(Number(rating) || 0);
    return "★".repeat(rounded) + "☆".repeat(5 - rounded);
  }

  window.ServeEaseReviews = { find: find, submit: submit, update: update, seedCompletedBookings: seedCompletedBookings, providerStats: providerStats, forProvider: forProvider, providerKey: providerKey, stars: stars };
})();
