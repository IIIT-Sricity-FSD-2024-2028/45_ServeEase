import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { bookingsApi } from '../../../services/api'
import './customerDashboard.css'

const upcomingStatuses = new Set(['Pending', 'Accepted'])
const completedStatuses = new Set(['Completed'])
const endedStatuses = new Set(['Cancelled', 'Rejected'])
const emptyBookings = []

function belongsToCustomer(booking, userId, email) {
  if (!booking) return false
  if (booking.customerId && userId) return String(booking.customerId) === String(userId)
  if (booking.customerEmail && email) return String(booking.customerEmail).toLowerCase() === String(email).toLowerCase()
  return false
}

function bookingCreatedTime(booking) {
  const parsed = Date.parse(booking.createdAt || '')
  return Number.isFinite(parsed) ? parsed : null
}

function serviceDateTime(booking) {
  const parsed = Date.parse(booking.date || '')
  return Number.isFinite(parsed) ? parsed : null
}

function compareRecentBookings(left, right) {
  const leftCreated = bookingCreatedTime(left)
  const rightCreated = bookingCreatedTime(right)

  if (leftCreated !== null && rightCreated !== null) return rightCreated - leftCreated
  if (leftCreated !== null) return -1
  if (rightCreated !== null) return 1

  const leftServiceDate = serviceDateTime(left)
  const rightServiceDate = serviceDateTime(right)
  if (leftServiceDate !== null && rightServiceDate !== null && leftServiceDate !== rightServiceDate) {
    return rightServiceDate - leftServiceDate
  }

  return String(right.id || '').localeCompare(String(left.id || ''))
}

function formatBookingDate(value) {
  if (!value) return 'Date not provided'
  const dateOnly = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(value)

  if (Number.isNaN(parsed.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(parsed)
}

function statusClass(status) {
  return String(status || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function SummaryCard({ label, value, detail }) {
  return <article className="customer-dashboard-summary-card">
    <h2>{label}</h2>
    <p className="customer-dashboard-summary-value">{value}</p>
    <p className="customer-dashboard-summary-detail">{detail}</p>
  </article>
}

function RecentBooking({ booking }) {
  return <article className="customer-dashboard-booking">
    <div className="customer-dashboard-booking-main">
      <h3>{booking.service || 'Service booking'}</h3>
      <p>{booking.provider || 'Provider not provided'}</p>
      <p className="customer-dashboard-booking-meta">
        {formatBookingDate(booking.date)}
        {booking.id ? ` · ${booking.id}` : ''}
      </p>
    </div>
    <span className={`customer-dashboard-status customer-dashboard-status--${statusClass(booking.status)}`}>
      {booking.status || 'Status unavailable'}
    </span>
  </article>
}

export default function CustomerDashboardPage() {
  const { currentUser, isAuthenticated } = useAuth()
  const userId = currentUser?.userId
  const email = currentUser?.email
  const identityKey = JSON.stringify([userId || '', email || ''])
  const [result, setResult] = useState({ identityKey: '', status: 'loading', bookings: [], error: '' })

  useEffect(() => {
    let active = true

    if (!isAuthenticated) return () => { active = false }

    bookingsApi.list()
      .then((records) => {
        if (!active) return
        if (!Array.isArray(records)) throw new Error('The booking service returned an invalid response.')
        setResult({
          identityKey,
          status: 'ready',
          bookings: records.filter((booking) => belongsToCustomer(booking, userId, email)),
          error: '',
        })
      })
      .catch((requestError) => {
        if (!active) return
        setResult({
          identityKey,
          status: 'error',
          bookings: [],
          error: requestError.message || 'Your bookings could not be loaded.',
        })
      })

    return () => { active = false }
  }, [email, identityKey, isAuthenticated, userId])

  const loadState = !isAuthenticated
    ? 'error'
    : result.identityKey === identityKey ? result.status : 'loading'
  const error = !isAuthenticated
    ? 'Please sign in as a customer to view your dashboard.'
    : result.error
  const bookings = result.identityKey === identityKey ? result.bookings : emptyBookings

  const summary = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter((booking) => upcomingStatuses.has(booking.status)).length,
    completed: bookings.filter((booking) => completedStatuses.has(booking.status)).length,
    ended: bookings.filter((booking) => endedStatuses.has(booking.status)).length,
  }), [bookings])

  const recentBookings = useMemo(
    () => [...bookings].sort(compareRecentBookings).slice(0, 4),
    [bookings],
  )

  const customerName = String(currentUser?.fullName || currentUser?.name || '').trim()

  return <div className="customer-dashboard-page">
    <section className="customer-dashboard-hero" aria-labelledby="customer-dashboard-title">
      <div>
        <p className="customer-dashboard-eyebrow">Customer Dashboard</p>
        <h1 id="customer-dashboard-title">{customerName ? `Welcome back, ${customerName}` : 'Welcome back'}</h1>
        <p>Keep track of your service bookings in one place.</p>
      </div>
      <Link className="customer-dashboard-primary-link" to="/customer/bookings">View My Bookings</Link>
    </section>

    {loadState === 'loading' && <LoadingState message="Loading your dashboard…" />}
    {loadState === 'error' && <ErrorState message={error} />}

    {loadState === 'ready' && <>
      <section className="customer-dashboard-summary" aria-label="Booking summary">
        <SummaryCard label="Total bookings" value={summary.total} detail="All bookings linked to your account" />
        <SummaryCard label="Upcoming" value={summary.upcoming} detail="Pending or accepted bookings" />
        <SummaryCard label="Completed" value={summary.completed} detail="Bookings marked completed" />
        <SummaryCard label="Cancelled or rejected" value={summary.ended} detail="Bookings marked cancelled or rejected" />
      </section>

      <section className="customer-dashboard-recent" aria-labelledby="customer-dashboard-recent-title">
        <div className="customer-dashboard-section-heading">
          <div>
            <p className="customer-dashboard-eyebrow">Your activity</p>
            <h2 id="customer-dashboard-recent-title">Recent bookings</h2>
          </div>
          <Link to="/customer/bookings">See all bookings</Link>
        </div>

        {recentBookings.length
          ? <div className="customer-dashboard-booking-list">{recentBookings.map((booking, index) => (
            <RecentBooking key={booking.id || `${booking.createdAt || booking.date || 'booking'}-${index}`} booking={booking} />
          ))}</div>
          : <EmptyState message="You do not have any bookings yet." />}
      </section>
    </>}
  </div>
}
