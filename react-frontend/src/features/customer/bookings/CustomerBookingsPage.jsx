import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, reviewsApi } from '../../../services/api'
import { ReviewModal } from '../../reviews/ReviewParts'
import { CustomerPageHeader, LoadState, OpsModal } from '../CustomerOpsParts'
import { belongsToCustomer, bookingTabs, bookingTabView, canCustomerCancel, sortNewestFirst } from '../customerOperations'
import { BookingCard } from './BookingCard'
import { BookingDetailsModal } from './BookingDetailsModal'
import { BookingHistory } from './BookingHistory'
import { BookingTabs } from './BookingTabs'
import '../customerOperations.css'

// my-bookings.html + initMyBookings(). Bookings come from GET /bookings, which the backend already scopes
// to the signed-in customer; the ownership filter is kept as a second guard.
export default function CustomerBookingsPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [load, setLoad] = useState({ state: 'loading', bookings: [], error: '' })
  const [notice, setNotice] = useState('')
  const [cancelState, setCancelState] = useState(null)
  const [reviews, setReviews] = useState({})
  const [reviewTarget, setReviewTarget] = useState(null)
  const tabParam = searchParams.get('tab')
  const activeTab = bookingTabs.includes(tabParam) ? tabParam : 'All'
  const selectedId = searchParams.get('booking') || ''

  const loadBookings = useCallback(async () => {
    const records = await bookingsApi.list()
    if (!Array.isArray(records)) throw new Error('The booking service returned an invalid response.')
    return sortNewestFirst(records.filter((booking) => belongsToCustomer(booking, currentUser)))
  }, [currentUser])

  // The customer's own reviews, keyed by booking. A failure only hides ratings; bookings still load.
  const loadReviews = useCallback(() => reviewsApi.mine()
    .then((records) => setReviews(Object.fromEntries((Array.isArray(records) ? records : []).map((review) => [review.bookingId, review]))))
    .catch(() => setReviews({})), [])
  useEffect(() => { loadReviews() }, [loadReviews])

  const refresh = useCallback(() => {
    setLoad((current) => ({ ...current, state: 'loading', error: '' }))
    loadBookings()
      .then((bookings) => setLoad({ state: 'ready', bookings, error: '' }))
      .catch((error) => setLoad({ state: 'error', bookings: [], error: error.message || 'Your bookings could not be loaded.' }))
  }, [loadBookings])

  useEffect(() => {
    let active = true
    loadBookings()
      .then((bookings) => { if (active) setLoad({ state: 'ready', bookings, error: '' }) })
      .catch((error) => { if (active) setLoad({ state: 'error', bookings: [], error: error.message || 'Your bookings could not be loaded.' }) })
    return () => { active = false }
  }, [loadBookings])

  const view = useMemo(() => bookingTabView(load.bookings, activeTab), [activeTab, load.bookings])
  const selectedBooking = load.bookings.find((booking) => booking.id === selectedId)

  function updateParams(changes) {
    const next = new URLSearchParams(searchParams)
    Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key) })
    setSearchParams(next)
  }

  const openDetails = (booking) => updateParams({ booking: booking.id })
  const closeDetails = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('booking')
    setSearchParams(next)
  }, [searchParams, setSearchParams])
  // createSupportTicketDraft(): continue in the Support Center with the booking reference filled in.
  const raiseTicket = (booking) => navigate(`/customer/support?bookingRef=${encodeURIComponent(booking.id)}`)

  async function confirmCancel() {
    const booking = cancelState.booking
    setCancelState({ booking, saving: true, error: '' })
    try {
      // persistCustomerCancellation(): re-read the canonical booking before asking for the transition.
      const latest = await bookingsApi.get(booking.id)
      if (!canCustomerCancel(latest)) throw new Error(`This booking is ${String(latest.status).toLowerCase()} and can no longer be cancelled.`)
      const saved = await bookingsApi.updateStatus(booking.id, 'Cancelled')
      if (saved?.status !== 'Cancelled') throw new Error('The server did not confirm the cancellation.')
      setCancelState(null)
      setNotice(`Booking ${booking.id} was cancelled.`)
      refresh()
    } catch (error) {
      setCancelState({ booking, saving: false, error: error.message || 'The booking could not be cancelled.' })
    }
  }

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['My Bookings']]} description="View and manage all your service bookings." title="My Bookings" />
    <BookingTabs activeTab={activeTab} bookings={load.bookings} onChange={(tab) => updateParams({ tab: tab === 'All' ? '' : tab })} />
    {notice && <p className="ops-notice" role="status">{notice}</p>}
    <LoadState error={load.error} loadingText="Loading your bookings…" onRetry={refresh} state={load.state} />

    {load.state === 'ready' && <>
      {view.upcoming && <section aria-labelledby="upcoming-bookings-heading">
        <h2 className="section-title-left" id="upcoming-bookings-heading">{view.upcomingHeading}</h2>
        <div className="booking-grid">{view.upcoming.length
          ? view.upcoming.map((booking) => <BookingCard booking={booking} key={booking.id} onCancel={(item) => setCancelState({ booking: item, saving: false, error: '' })} onRaiseTicket={raiseTicket} onViewDetails={openDetails} />)
          : <div className="empty-state-card">No {activeTab === 'All' ? 'upcoming' : activeTab.toLowerCase()} bookings found.</div>}
        </div>
      </section>}
      {view.history && <section aria-labelledby="booking-history-heading" className="table-section">
        <h2 className="section-title-left" id="booking-history-heading">{view.historyHeading}</h2>
        <BookingHistory bookings={view.history} onRate={setReviewTarget} reviews={reviews} emptyLabel={`No ${activeTab === 'All' ? 'past' : activeTab.toLowerCase()} bookings found.`} onRaiseTicket={raiseTicket} onViewDetails={openDetails} />
      </section>}
    </>}

    {selectedId && <BookingDetailsModal bookingId={selectedId} fallback={selectedBooking} key={selectedId} onClose={closeDetails} review={reviews[selectedId]} />}

    {reviewTarget && <ReviewModal booking={reviewTarget} existing={reviews[reviewTarget.id]} onClose={() => setReviewTarget(null)} onSaved={(saved) => { setReviews((current) => ({ ...current, [saved.bookingId]: saved })); setNotice(`Your review of booking ${saved.bookingId} was saved.`); setReviewTarget(null) }} />}

    {cancelState && <OpsModal labelId="cancel-booking-title" onClose={() => { if (!cancelState.saving) setCancelState(null) }} title="Cancel Booking" variant="confirm">
      <h3 id="cancel-booking-title">Cancel Booking</h3>
      <p>Are you sure you want to cancel this booking? This action cannot be undone.</p>
      {cancelState.error && <p className="ops-alert" role="alert">{cancelState.error}</p>}
      <div className="confirm-actions">
        <button className="btn btn-outline" disabled={cancelState.saving} onClick={() => setCancelState(null)} type="button">No, Keep It</button>
        <button className="btn btn-danger" disabled={cancelState.saving} onClick={confirmCancel} type="button">{cancelState.saving ? 'Cancelling…' : 'Yes, Cancel'}</button>
      </div>
    </OpsModal>}
  </div>
}
