import test from 'node:test'
import assert from 'node:assert/strict'
import { formatAverage, reviewStars } from '../src/features/reviews/reviewFormat.js'
import { ratingSummary } from '../src/features/discovery/catalogModel.js'

test('stars round the rating and always show five', () => {
  assert.equal(reviewStars(4), '★★★★☆')
  assert.equal(reviewStars(4.6), '★★★★★')
  assert.equal(reviewStars(0), '☆☆☆☆☆')
  assert.equal(reviewStars(9), '★★★★★')
})

test('averages show one decimal and providers without reviews stay "new"', () => {
  assert.equal(formatAverage(4), '4.0')
  assert.equal(formatAverage(undefined), '0.0')
  assert.deepEqual(ratingSummary({ rating: 4.5, reviews: 2 }), { rating: '4.5', reviews: 2 })
  assert.equal(ratingSummary({ rating: 0, reviews: 0 }), null)
})
