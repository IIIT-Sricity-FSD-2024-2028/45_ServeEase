// reviews.js stars(): the rounded rating as filled and empty stars.
export const reviewStars = (rating) => {
  const rounded = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)))
  return '\u2605'.repeat(rounded) + '\u2606'.repeat(5 - rounded)
}

// Average rating with one decimal, as the original shows it ("4.0").
export const formatAverage = (average) => Number(average || 0).toFixed(1)
