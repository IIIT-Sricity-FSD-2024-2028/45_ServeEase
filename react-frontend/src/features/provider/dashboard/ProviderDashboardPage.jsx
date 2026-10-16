import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, catalogApi, ticketsApi } from '../../../services/api'
import { formatDisplayDate } from '../../customer/customerOperations'
import '../providerPortal.css'

const currency = (value) => value == null ? 'Unavailable' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const isCompleted = (booking) => String(booking?.status || '').toLowerCase() === 'completed'
const payoutFor = (booking) => isCompleted(booking) ? Number(booking.providerPayout ?? booking.providerPayoutAmount ?? Number(booking.amount || 0) * 0.9) : 0
const dateValue = (value) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed }

function FeatureCard({ icon, tone, title, description, to }) {
  return <Link className="feature-card" to={to}><div className={`feature-icon ${tone}`}>{icon}</div><h3>{title}</h3><p>{description}</p></Link>
}

function PanelHeading({ title, to, action }) {
  return <div className="panel-head"><h2>{title}</h2>{to && <Link to={to}>{action}</Link>}</div>
}

const pillClass = (status) => {
  const key = String(status || '').toLowerCase()
  if (['active', 'approved', 'verified'].includes(key)) return 'status-accepted'
  if (['suspended', 'rejected', 'blocked', 'inactive'].includes(key)) return 'status-cancelled'
  return 'status-pending'
}

export function ProviderDashboardPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.userId || currentUser?.providerCatalogId
  const [data, setData] = useState({ services: null, bookings: null, tickets: null, loading: true, errors: {} })

  useEffect(() => {
    if (!isAuthenticated || role !== 'provider' || !providerId) return undefined
    let active = true
    Promise.allSettled([catalogApi.getProviderServices(providerId), bookingsApi.listForProvider(), ticketsApi.listProvider()]).then(([services, bookings, tickets]) => {
      if (!active) return
      const errors = {}
      const read = (result, key, message) => { if (result.status === 'fulfilled') return Array.isArray(result.value) ? result.value : []; errors[key] = result.reason?.message || message; return null }
      setData({ services: read(services, 'services', 'Services are unavailable.'), bookings: read(bookings, 'bookings', 'Bookings are unavailable.'), tickets: read(tickets, 'tickets', 'Notifications are unavailable.'), loading: false, errors })
    })
    return () => { active = false }
  }, [isAuthenticated, providerId, role])

  const bookings = useMemo(() => data.bookings || [], [data.bookings])
  const completed = bookings.filter(isCompleted)
  const totalEarnings = data.bookings ? completed.reduce((sum, booking) => sum + payoutFor(booking), 0) : null
  const pendingPayout = data.bookings ? bookings.filter((booking) => ['pending', 'accepted'].includes(String(booking.status || '').toLowerCase())).reduce((sum, booking) => sum + Number(booking.providerPayout ?? booking.providerPayoutAmount ?? booking.amount ?? 0), 0) : null
  const monthEarnings = data.bookings ? completed.filter((booking) => { const date = dateValue(booking.date); const now = new Date(); return date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() }).reduce((sum, booking) => sum + payoutFor(booking), 0) : null
  const recentBookings = useMemo(() => bookings.slice().sort((a, b) => (dateValue(b.date)?.getTime() || 0) - (dateValue(a.date)?.getTime() || 0)).slice(0, 4), [bookings])
  const providerName = currentUser?.fullName || currentUser?.organisationName || 'Provider'
  const providerStatus = currentUser?.accountStatus || currentUser?.status || currentUser?.approvalStatus || currentUser?.verificationStatus

  if (!isAuthenticated || role !== 'provider') return <section className="provider-portal"><div className="panel-card ops-state">Please sign in with a provider account to view your dashboard.</div></section>
  if (!providerId) return <section className="provider-portal"><div className="panel-card ops-state ops-state--error">Your provider profile could not be identified.</div></section>

  const stats = [['orange', '🧰', 'Total Services', data.services?.length], ['blue', '📋', 'Total Bookings', data.bookings?.length], ['green', '✅', 'Completed Bookings', data.bookings ? completed.length : null], ['purple', '💰', 'Total Earnings', totalEarnings == null ? null : currency(totalEarnings)]]
  return <section className="provider-portal">
    <div className="breadcrumb-row"><strong>Provider Dashboard</strong></div>
    <section className="provider-hero-card"><div><h1>Welcome, {providerName}!</h1><p>Manage bookings, services, availability, earnings, and support from one place.</p></div><div className="provider-hero-side"><div className="provider-hero-line"><strong>Provider ID:</strong> <span>{providerId}</span></div>{providerStatus && <div className="provider-hero-line"><strong>Status:</strong> <span className={`status-pill ${pillClass(providerStatus)}`}>{providerStatus}</span></div>}</div></section>
    {data.loading && <div className="panel-card ops-state">Loading your provider dashboard…</div>}
    {!data.loading && Object.entries(data.errors).map(([key, message]) => <div className="panel-card ops-state ops-state--error" key={key} role="alert">{message}</div>)}
    <section className="dashboard-actions-grid provider-actions-grid"><FeatureCard icon="🛠" tone="blue" title="Manage Services" description="Add, edit, activate, and manage availability slots." to="/provider/services" /><FeatureCard icon="📅" tone="orange" title="Booking Management" description="Accept, reject, and track service booking requests." to="/provider/bookings" /><FeatureCard icon="💰" tone="green" title="Earnings & Payments" description="Track payments, earnings, and transaction details." to="/provider/earnings" /><FeatureCard icon="🎧" tone="purple" title="Get Support" description="Raise support tickets and contact the support team." to="/provider/support" /></section>
    <section className="dashboard-stats-grid" aria-label="Provider statistics">{stats.map(([tone, icon, label, value]) => <div className="stat-card-dashboard" key={label}><div className={`feature-icon ${tone}`}>{icon}</div><h3>{value == null ? 'Unavailable' : value}</h3><p>{label}</p></div>)}</section>
    <section className="dashboard-two-column provider-two-column"><div className="panel-card"><PanelHeading title="Service Performance" to="/provider/bookings" action="View Bookings" /><div id="providerPerformanceList">{data.bookings === null ? <div className="preview-item"><div className="preview-meta">Booking performance is unavailable.</div></div> : recentBookings.length === 0 ? <div className="preview-item"><div className="preview-meta">No bookings yet.</div></div> : recentBookings.map((booking) => <div className="preview-item" key={booking.id}><div className="preview-title">{booking.service || 'Service unavailable'}</div><div className="preview-meta">{[booking.customerName || 'Customer unavailable', booking.date ? formatDisplayDate(booking.date) : 'Date unavailable', booking.status || 'Unavailable'].join(' • ')}</div></div>)}</div></div>
      <div className="panel-card"><PanelHeading title="Notifications" to="/provider/support" action="Open Support" /><div id="providerNotificationPreview">{data.tickets === null ? <div className="preview-item"><div className="preview-meta">Notifications are unavailable.</div></div> : data.tickets.length === 0 ? <div className="preview-item"><div className="preview-meta">No new notifications.</div></div> : data.tickets.slice(0, 4).map((ticket) => <div className="preview-item" key={ticket.id}><div className="preview-title">{ticket.subject || ticket.category || 'Support ticket'}</div><div className="preview-meta">{ticket.remarks || `Support ticket is ${ticket.status || 'Open'}.`}</div></div>)}</div></div></section>
    <section className="dashboard-two-column provider-two-column"><div className="panel-card gradient-panel"><h2>Earnings This Month</h2><p>{monthEarnings == null ? 'Unavailable' : currency(monthEarnings)}</p><div className="provider-earnings-mini"><div><span>Total Earnings</span><strong>{currency(totalEarnings)}</strong></div><div><span>Pending Payout</span><strong>{currency(pendingPayout)}</strong></div></div><Link className="btn btn-light" to="/provider/earnings">View Earnings</Link></div>
      <div className="panel-card"><div className="panel-head"><h2>Quick Links</h2></div><div className="provider-quick-links">{[['Manage Services', '/provider/services'], ['Booking Management', '/provider/bookings'], ['Earnings & Payments', '/provider/earnings'], ['Support Center', '/provider/support'], ['My Profile', '/provider/account']].map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}</div></div></section>
  </section>
}
