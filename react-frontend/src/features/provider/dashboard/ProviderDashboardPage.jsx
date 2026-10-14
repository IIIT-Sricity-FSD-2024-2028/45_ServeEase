import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, catalogApi, ticketsApi } from '../../../services/api'
import './providerDashboard.css'

const currency = (value) => value == null ? 'Unavailable' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const isCompleted = (booking) => String(booking?.status || '').toLowerCase() === 'completed'
const payoutFor = (booking) => isCompleted(booking) ? Number(booking.providerPayout ?? booking.providerPayoutAmount ?? Number(booking.amount || 0) * 0.9) : 0
const dateValue = (value) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed }
const statusClass = (value) => String(value || 'Unavailable').toLowerCase().replace(/\s+/g, '-')

function FeatureCard({ icon, tone, title, description, to }) {
  return <Link className="provider-dashboard-feature" to={to}><span aria-hidden="true" className={`provider-dashboard-feature-icon ${tone}`}>{icon}</span><h2>{title}</h2><p>{description}</p></Link>
}

function PanelHeading({ title, to, action }) {
  return <div className="provider-dashboard-panel-heading"><h2>{title}</h2>{to && <Link to={to}>{action}</Link>}</div>
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

  if (!isAuthenticated || role !== 'provider') return <section className="provider-dashboard-page"><div className="provider-dashboard-feedback">Please sign in with a provider account to view your dashboard.</div></section>
  if (!providerId) return <section className="provider-dashboard-page"><div className="provider-dashboard-feedback provider-dashboard-feedback--error">Your provider profile could not be identified.</div></section>

  return <section className="provider-dashboard-page">
    <div className="provider-dashboard-breadcrumb"><strong>Provider Dashboard</strong></div>
    <section className="provider-dashboard-hero"><div><h1>Welcome, {providerName}!</h1><p>Manage bookings, services, availability, earnings, and support from one place.</p></div><div className="provider-dashboard-hero-side"><div><strong>Provider ID:</strong> <span>{providerId}</span></div>{providerStatus && <div><strong>Status:</strong> <span className="provider-dashboard-status">{providerStatus}</span></div>}</div></section>
    {data.loading && <div className="provider-dashboard-feedback">Loading your provider dashboard…</div>}
    {!data.loading && Object.entries(data.errors).map(([key, message]) => <div className="provider-dashboard-feedback provider-dashboard-feedback--error" key={key} role="alert">{message}</div>)}
    <div className="provider-dashboard-feature-grid"><FeatureCard icon="🛠" tone="blue" title="Manage Services" description="Add, edit, activate, and manage availability slots." to="/provider/services" /><FeatureCard icon="📅" tone="orange" title="Booking Management" description="Accept, reject, and track service booking requests." to="/provider/bookings" /><FeatureCard icon="💰" tone="green" title="Earnings & Payments" description="Track payments, earnings, and transaction details." to="/provider/earnings" /><FeatureCard icon="🎧" tone="purple" title="Get Support" description="Raise support tickets and contact the support team." to="/provider/support" /></div>
    <div className="provider-dashboard-stat-grid" aria-label="Provider statistics">{[['🛠', 'Total Services', data.services?.length], ['📅', 'Total Bookings', data.bookings?.length], ['✓', 'Completed Bookings', data.bookings ? completed.length : null], ['₹', 'Total Earnings', totalEarnings]].map(([icon, label, value]) => <article className="provider-dashboard-stat" key={label}><span className="provider-dashboard-stat-icon">{icon}</span><div><strong>{value == null ? 'Unavailable' : label === 'Total Earnings' ? currency(value) : value}</strong><span>{label}</span></div></article>)}</div>
    <div className="provider-dashboard-two-column"><section className="provider-dashboard-panel"><PanelHeading title="Service Performance" to="/provider/bookings" action="View Bookings" />{data.bookings === null ? <p className="provider-dashboard-muted">Booking performance is unavailable.</p> : recentBookings.length === 0 ? <p className="provider-dashboard-muted">No bookings are available yet.</p> : <div>{recentBookings.map((booking) => <div className="provider-dashboard-preview-item" key={booking.id}><div><strong>{booking.service || 'Service unavailable'}</strong><span>{booking.customerName || 'Customer unavailable'}</span></div><div className="provider-dashboard-preview-meta"><span>{booking.date || 'Date unavailable'}</span><b className={`provider-dashboard-status-text ${statusClass(booking.status)}`}>{booking.status || 'Unavailable'}</b></div></div>)}</div>}</section><section className="provider-dashboard-panel"><PanelHeading title="Notifications" to="/provider/support" action="Open Support" />{data.tickets === null ? <p className="provider-dashboard-muted">Notifications are unavailable.</p> : data.tickets.length === 0 ? <p className="provider-dashboard-muted">No support notifications yet.</p> : <div>{data.tickets.slice(0, 4).map((ticket) => <div className="provider-dashboard-preview-item" key={ticket.id}><div><strong>{ticket.subject || ticket.category || 'Support ticket'}</strong><span>{ticket.remarks || 'Support ticket status updated.'}</span></div><b className={`provider-dashboard-status-text ${statusClass(ticket.status)}`}>{ticket.status || 'Open'}</b></div>)}</div>}</section></div>
    <div className="provider-dashboard-two-column"><section className="provider-dashboard-panel provider-dashboard-gradient"><h2>Earnings This Month</h2><strong className="provider-dashboard-monthly-value">{monthEarnings == null ? 'Unavailable' : currency(monthEarnings)}</strong><div className="provider-dashboard-earnings-mini"><div><span>Total Earnings</span><strong>{currency(totalEarnings)}</strong></div><div><span>Pending Payout</span><strong>{currency(pendingPayout)}</strong></div></div><Link className="provider-dashboard-light-button" to="/provider/earnings">View Earnings</Link></section><section className="provider-dashboard-panel"><PanelHeading title="Quick Links" /><div className="provider-dashboard-quick-links">{[['Manage Services', '/provider/services'], ['Booking Management', '/provider/bookings'], ['Earnings & Payments', '/provider/earnings'], ['Support Center', '/provider/support'], ['My Profile', '/provider/account']].map(([label, to]) => <Link key={to} to={to}>{label}</Link>)}</div></section></div>
  </section>
}
