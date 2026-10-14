import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { bookingsApi, ticketsApi } from '../../../services/api'
import './customerDashboard.css'

const upcomingStatuses = new Set(['Pending', 'Accepted'])
const openTicketStatuses = new Set(['Open', 'Pending', 'In Progress', 'Escalated'])

function belongsToCustomer(booking, userId, email) {
  if (!booking) return false
  if (booking.customerId && userId) return String(booking.customerId) === String(userId)
  if (booking.customerEmail && email) return String(booking.customerEmail).toLowerCase() === String(email).toLowerCase()
  return false
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

function formatMoney(value) {
  if (value === undefined || value === null || value === '') return 'Not provided'
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return String(value)
  return `₹${numericValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatTicketDate(value) {
  if (!value) return 'Date unavailable'
  const parsed = new Date(value)
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

function ActionCard({ icon, title, description, to, tone }) {
  return <Link className={`customer-dashboard-action-card customer-dashboard-action-card--${tone}`} to={to}>
    <div className={`customer-dashboard-feature-icon customer-dashboard-feature-icon--${tone}`}>{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </Link>
}

function PreviewBooking({ booking }) {
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

function PreviewPayment({ booking }) {
  return <article className="customer-dashboard-payment-item">
    <div>
      <h3>{booking.service || 'Service booking'}</h3>
      <p>{booking.provider || 'Provider not provided'}</p>
    </div>
    <div className="customer-dashboard-payment-meta">
      <strong>{formatMoney(booking.customerTotal ?? booking.amount)}</strong>
      <span className={`customer-dashboard-status customer-dashboard-status--${statusClass(booking.paymentStatus)}`}>
        {booking.paymentStatus || 'Not provided'}
      </span>
    </div>
  </article>
}

function PreviewSupportTicket({ ticket }) {
  const title = ticket.subject || ticket.ticketType || 'Support request'
  return <article className="customer-dashboard-preview-item">
    <div className="customer-dashboard-preview-copy">
      <h3>{title}</h3>
      <p>{ticket.ticketId ? `${ticket.ticketId} · ` : ''}{formatTicketDate(ticket.createdAt)}</p>
    </div>
    <span className={`customer-dashboard-status customer-dashboard-status--${statusClass(ticket.status)}`}>
      {ticket.status || 'Open'}
    </span>
  </article>
}

export default function CustomerDashboardPage() {
  const { currentUser, isAuthenticated } = useAuth()
  const userId = currentUser?.userId
  const email = currentUser?.email
  const [result, setResult] = useState({ status: 'loading', bookings: [], tickets: [], error: '' })

  useEffect(() => {
    let active = true

    if (!isAuthenticated) return () => { active = false }

    Promise.all([
      bookingsApi.list(),
      ticketsApi.listMine(),
    ])
      .then(([bookingRecords, ticketRecords]) => {
        if (!active) return
        if (!Array.isArray(bookingRecords) || !Array.isArray(ticketRecords)) {
          throw new Error('One or more customer dashboard services returned an invalid response.')
        }

        const customerBookings = bookingRecords.filter((booking) => belongsToCustomer(booking, userId, email))
        setResult({
          status: 'ready',
          bookings: customerBookings,
          tickets: Array.isArray(ticketRecords) ? ticketRecords : [],
          error: '',
        })
      })
      .catch((requestError) => {
        if (!active) return
        setResult({
          status: 'error',
          bookings: [],
          tickets: [],
          error: requestError.message || 'Your dashboard data could not be loaded.',
        })
      })

    return () => { active = false }
  }, [email, isAuthenticated, userId])

  const loadState = !isAuthenticated ? 'error' : result.status
  const error = !isAuthenticated ? 'Please sign in as a customer to view your dashboard.' : result.error

  const bookings = useMemo(() => (!isAuthenticated ? [] : result.bookings), [isAuthenticated, result.bookings])
  const tickets = useMemo(() => (!isAuthenticated ? [] : result.tickets), [isAuthenticated, result.tickets])

  const summary = useMemo(() => ({
    total: bookings.length,
    upcoming: bookings.filter((booking) => upcomingStatuses.has(booking.status)).length,
    successful: bookings.filter((booking) => booking.paymentStatus === 'Successful').length,
    openTickets: tickets.filter((ticket) => openTicketStatuses.has(ticket.status)).length,
  }), [bookings, tickets])

  const recentBookings = useMemo(
    () => [...bookings].sort((a, b) => {
      const leftDate = new Date(a.date || 0).getTime()
      const rightDate = new Date(b.date || 0).getTime()
      return rightDate - leftDate
    }).slice(0, 3),
    [bookings],
  )

  const recentPayments = useMemo(
    () => [...bookings].filter((booking) => booking.paymentStatus || booking.customerTotal || booking.amount).slice(0, 3),
    [bookings],
  )

  const recentTickets = useMemo(() => [...tickets].slice(0, 3), [tickets])
  const customerName = String(currentUser?.fullName || currentUser?.name || '').trim()

  return <div className="customer-dashboard-page">
    <div className="customer-dashboard-breadcrumb">
      <Link to="/">Home</Link>
      <span>›</span>
      <strong>Customer Dashboard</strong>
    </div>

    <section className="customer-dashboard-hero" aria-labelledby="customer-dashboard-title">
      <div>
        <p className="customer-dashboard-eyebrow">Customer Dashboard</p>
        <h1 id="customer-dashboard-title">{customerName ? `Welcome back, ${customerName}` : 'Welcome back!'}</h1>
        <p>Manage your bookings, payments, and support requests from one place.</p>
      </div>
    </section>

    {loadState === 'loading' && <LoadingState message="Loading your dashboard…" />}
    {loadState === 'error' && <ErrorState message={error} />}

    {loadState === 'ready' && <>
      <section className="customer-dashboard-actions-grid" aria-label="Customer actions">
        <ActionCard icon="🗓" title="Book a Service" description="Browse services and book professionals instantly." to="/#categories" tone="blue" />
        <ActionCard icon="📋" title="View My Bookings" description="Track upcoming and past service bookings." to="/customer/bookings" tone="green" />
        <ActionCard icon="💲" title="Payment History" description="See all your service payments and transaction records." to="/customer/payments" tone="orange" />
        <ActionCard icon="🎧" title="Contact Support" description="Raise tickets and get help with issues quickly." to="/customer/support" tone="purple" />
      </section>

      <section className="customer-dashboard-summary" aria-label="Summary cards">
        <SummaryCard label="Total Bookings" value={summary.total} detail="All bookings linked to your account" />
        <SummaryCard label="Upcoming Bookings" value={summary.upcoming} detail="Pending or accepted bookings" />
        <SummaryCard label="Successful Payments" value={summary.successful} detail="Payments marked successful" />
        <SummaryCard label="Open Tickets" value={summary.openTickets} detail="Support tickets still active" />
      </section>

      <section className="customer-dashboard-panel-grid">
        <div className="customer-dashboard-panel-card">
          <div className="customer-dashboard-panel-head">
            <h2>Upcoming Bookings</h2>
            <Link to="/customer/bookings">View All</Link>
          </div>
          {recentBookings.length
            ? <div className="customer-dashboard-preview-list">{recentBookings.map((booking) => <PreviewBooking key={booking.id || booking._id || `booking-${booking.date}`} booking={booking} />)}</div>
            : <EmptyState message="You do not have any upcoming bookings yet." />}
        </div>

        <div className="customer-dashboard-panel-card">
          <div className="customer-dashboard-panel-head">
            <h2>Recent Payments</h2>
            <Link to="/customer/payments">View All</Link>
          </div>
          {recentPayments.length
            ? <div className="customer-dashboard-preview-list">{recentPayments.map((booking) => <PreviewPayment key={booking.id || booking._id || `payment-${booking.date}`} booking={booking} />)}</div>
            : <EmptyState message="No payment records are available for your account yet." />}
        </div>
      </section>

      <section className="customer-dashboard-panel-grid">
        <div className="customer-dashboard-panel-card">
          <div className="customer-dashboard-panel-head">
            <h2>Support Center</h2>
            <Link to="/customer/support">Open Support</Link>
          </div>
          {recentTickets.length
            ? <div className="customer-dashboard-preview-list">{recentTickets.map((ticket) => <PreviewSupportTicket key={ticket.ticketId || ticket.id || `ticket-${ticket.createdAt}`} ticket={ticket} />)}</div>
            : <EmptyState message="You have not raised any support tickets yet." />}
        </div>

        <div className="customer-dashboard-panel-card customer-dashboard-panel-card--gradient">
          <h2>Need Immediate Help?</h2>
          <p>Our support team is available 24/7 to assist you.</p>
          <p>📞 +91 1800-123-4567</p>
          <p>📧 support@serveease.com</p>
          <Link className="customer-dashboard-help-link" to="/customer/support">Open Support Center</Link>
        </div>
      </section>
    </>}
  </div>
}
