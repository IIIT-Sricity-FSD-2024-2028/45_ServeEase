import { useState } from 'react'
import { reviewsApi } from '../../services/api'
import { OpsModal } from '../customer/CustomerOpsParts'
import { reviewStars } from './reviewFormat'
import './reviews.css'

// A rating shown as stars plus its number (booking tables and details).
export function ReviewRating({ rating }) {
  return <span aria-label={`${rating} out of 5 stars`} className="review-rating"><span className="review-stars">{reviewStars(rating)}</span><span className="booking-rating-value">{Number(rating).toFixed(1)}</span></span>
}

// The customer's own review of one completed booking: pick 1-5 stars, optional feedback; saving again edits it.
export function ReviewModal({ booking, existing, onClose, onSaved }) {
  const [rating, setRating] = useState(existing ? Number(existing.rating) : 0)
  const [feedback, setFeedback] = useState(existing?.feedback || '')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!rating) { setMessage('Please select a rating.'); return }
    setSaving(true)
    setMessage('')
    try {
      onSaved(await reviewsApi.save(booking.id, { rating, feedback: feedback.trim() }))
    } catch (error) {
      setMessage(error.message || 'Unable to save this review. Please try again.')
      setSaving(false)
    }
  }

  return <OpsModal className="review-modal-card" labelId="review-modal-title" onClose={() => { if (!saving) onClose() }} title={existing ? 'Edit Your Review' : 'Rate Your Experience'}>
    <form onSubmit={submit}>
      <div aria-label="Rating" className="review-star-picker" role="radiogroup">
        {[1, 2, 3, 4, 5].map((value) => <button aria-checked={rating === value} aria-label={`${value} star${value === 1 ? '' : 's'}`} key={value} onClick={() => setRating(value)} role="radio" type="button">{value <= rating ? '★' : '☆'}</button>)}
      </div>
      {message && <p className="review-validation" role="alert">{message}</p>}
      <label className="review-feedback-label" htmlFor="reviewFeedback">Feedback <span>(optional)</span></label>
      <textarea id="reviewFeedback" maxLength="1000" onChange={(event) => setFeedback(event.target.value)} placeholder="Share your experience" rows="4" value={feedback} />
      <div className="review-modal-actions"><button className="btn btn-outline" disabled={saving} onClick={onClose} type="button">Cancel</button><button className="btn btn-primary" disabled={saving} type="submit">{saving ? 'Saving…' : existing ? 'Save Changes' : 'Submit Review'}</button></div>
    </form>
  </OpsModal>
}
