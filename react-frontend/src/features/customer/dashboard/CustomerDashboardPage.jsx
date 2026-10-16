import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { bookingsApi, ticketsApi } from '../../../services/api'
import { formatDisplayDate, formatPrice, paymentTag, transactionId } from '../customerOperations'
import { settleBooking } from '../../finance/revenueModel'
import '../customerOperations.css'

const upcomingStatuses = new Set(['Pending', 'Accepted', 'Requested'])
const openTicketStatuses = new Set(['Open', 'Pending', 'In Progress', 'Escalated'])

function belongsToCustomer(booking, userId, email) {
  if (!booking) return false
  if (booking.customerId && userId) return String(booking.customerId) === String(userId)
  if (booking.customerEmail && email) return String(booking.customerEmail).toLowerCase() === String(email).toLowerCase()
  return false
}

const preview = (...parts) => parts.filter((part) => part !== undefined && part !== null && part !== '').join(' • ')

function ActionCard({ icon, title, description, to, tone }) {
  return <Link className="feature-card" to={to}>
    <div className={`feature-icon ${tone}`}>{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </Link>
}

function StatCard({ icon, tone, value, label }) {
  return <div className="stat-card-dashboard"><div className={`feature-icon ${tone}`}>{icon}</div><h3>{value}</h3><p>{label}</p></div>
}

function PreviewItem({ title, meta }) {
  return <div className="preview-item"><div className="preview-title">{title}</div><div className="preview-meta">{meta}</div></div>
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
    successful: bookings.filter((booking) => booking.paymentStatus && paymentTag(booking.paymentStatus) === 'Paid').length,
    openTickets: tickets.filter((ticket) => openTicketStatuses.has(ticket.status)).length,
  }), [bookings, tickets])

  const recentBookings = useMemo(() => bookings.filter((booking) => upcomingStatuses.has(booking.status)).slice(0, 3), [bookings])
  const recentPayments = useMemo(() => bookings.filter((booking) => booking.paymentStatus || booking.customerTotal || booking.amount).slice(0, 4).map(settleBooking), [bookings])
  const recentTickets = tickets
  const customerName = String(currentUser?.fullName || currentUser?.name || '').trim()

  return <div className="customer-ops">
    <nav aria-label="Breadcrumb" className="breadcrumb-row"><Link to="/">Home</Link><span aria-hidden="true" className="breadcrumb-sep">›</span><strong aria-current="page">Customer Dashboard</strong></nav>

    <section className="dashboard-hero" aria-labelledby="customer-dashboard-title">
      <div>
        <h1 id="customer-dashboard-title">{customerName ? `Welcome back, ${customerName}!` : 'Welcome back!'}</h1>
        <p>Manage your bookings, payments, and support requests from one place.</p>
      </div>
    </section>

    {loadState === 'loading' && <LoadingState message="Loading your dashboard…" />}
    {loadState === 'error' && <ErrorState message={error} />}

    {loadState === 'ready' && <>
      <section className="dashboard-actions-grid" aria-label="Customer actions">
        <ActionCard icon="🗓" title="Book a Service" description="Browse services and book professionals instantly." to="/#categories" tone="blue" />
        <ActionCard icon="📋" title="View My Bookings" description="Track upcoming and past service bookings." to="/customer/bookings" tone="green" />
        <ActionCard icon="💲" title="Payment History" description="See all your service payments and transaction records." to="/customer/payments" tone="orange" />
        <ActionCard icon="🎧" title="Contact Support" description="Raise tickets and get help with issues quickly." to="/customer/support" tone="purple" />
      </section>

      <section className="dashboard-stats-grid" aria-label="Summary cards">
        <StatCard icon="📘" tone="blue" value={summary.total} label="Total Bookings" />
        <StatCard icon="📅" tone="green" value={summary.upcoming} label="Upcoming Bookings" />
        <StatCard icon="💳" tone="orange" value={summary.successful} label="Paid Payments" />
        <StatCard icon="🎫" tone="purple" value={summary.openTickets} label="Open Tickets" />
      </section>

      <section className="dashboard-two-column">
        <div className="panel-card">
          <div className="panel-head"><h2>Upcoming Bookings</h2><Link to="/customer/bookings">View All</Link></div>
          {recentBookings.length
            ? recentBookings.map((booking) => <PreviewItem key={booking.id || `booking-${booking.date}`} meta={preview(booking.provider, formatDisplayDate(booking.date), booking.time)} title={booking.service || 'Service booking'} />)
            : <div className="empty-state-card">No upcoming bookings yet.</div>}
        </div>
        <div className="panel-card">
          <div className="panel-head"><h2>Recent Payments</h2><Link to="/customer/payments">View All</Link></div>
          {recentPayments.length
            ? recentPayments.map((booking) => <PreviewItem key={booking.id || `payment-${booking.date}`} meta={preview(transactionId(booking), formatPrice(booking.customerTotal), paymentTag(booking.paymentStatus))} title={booking.service || 'Service booking'} />)
            : <div className="empty-state-card">No payments yet.</div>}
        </div>
      </section>

      <section className="dashboard-two-column">
        <div className="panel-card">
          <div className="panel-head"><h2>Support Center</h2><Link to="/customer/support">Open Support</Link></div>
          {recentTickets.length
            ? recentTickets.map((ticket) => <PreviewItem key={ticket.ticketId || `ticket-${ticket.createdAt}`} meta={preview(ticket.ticketId, ticket.relatedBookingId, ticket.status)} title={ticket.subject || ticket.ticketType || 'Support request'} />)
            : <div className="empty-state-card">No support tickets yet.</div>}
        </div>
        <div className="panel-card gradient-panel">
          <h2>Need Immediate Help?</h2>
          <p>Our support team is available 24/7 to assist you.</p>
          <p>📞 +91 1800-123-4567</p>
          <p>📧 support@serveease.com</p>
          <Link className="btn btn-light" to="/customer/support">Open Support Center</Link>
        </div>
      </section>
    </>}
  </div>
}
