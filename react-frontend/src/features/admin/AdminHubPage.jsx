import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { listBookings, listCustomerAccounts, listEscalatedTickets, listProviderAccounts, listVerificationRequests } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

const actions = [
  { title: 'User Management · Customers', path: '/admin/customers' },
  { title: 'Administration · Not available', disabled: true },
  { title: 'Provider Verification', path: '/admin/verification' },
  { title: 'Service Categories', path: '/admin/categories' },
  { title: 'Monitor Bookings', path: '/admin/bookings' },
  { title: 'Escalated Tickets', path: '/admin/escalated-tickets' },
  { title: 'Finance & Revenue', path: '/admin/finance' },
]

function bookingTrend(bookings) {
  const months = new Map()
  bookings.forEach((booking) => {
    const raw = booking.date || booking.bookingDate
    const parsed = parseDate(raw)
    if (!parsed || Number.isNaN(parsed.getTime())) return
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    months.set(key, (months.get(key) || 0) + 1)
  })
  return Array.from(months.entries()).sort(([left], [right]) => left.localeCompare(right)).slice(-8)
}

function parseDate(value) {
  if (!value) return null
  const text = String(value)
  const dayFirst = text.match(/^(\d{2})-(\d{2})-(\d{4})/)
  const date = dayFirst ? new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1])) : new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function displayDate(value) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('en-GB').format(date) : 'Not available'
}

function Metric({ label, value, caption, attention = false, isLoading, error, onRetry }) {
  return <article className={`admin-stat-card${attention ? ' admin-stat-card--attention' : ''}`}>
    <span>{label}<span>SE</span></span>
    <strong>{isLoading ? '…' : error ? 'Unavailable' : value}</strong>
    <p>{caption}</p>
    {error && <button className="admin-button admin-button--secondary admin-button--small" onClick={onRetry} type="button">Retry</button>}
  </article>
}

export default function AdminHubPage() {
  const bookings = useAdminData(listBookings)
  const customersData = useAdminData(listCustomerAccounts)
  const providersData = useAdminData(listProviderAccounts)
  const verifications = useAdminData(listVerificationRequests)
  const tickets = useAdminData(listEscalatedTickets)
  const bookingRows = Array.isArray(bookings.data) ? bookings.data : []
  const customerAccounts = Array.isArray(customersData.data?.customers) ? customersData.data.customers : []
  const providerAccounts = Array.isArray(providersData.data?.providers) ? providersData.data.providers : []
  const requests = Array.isArray(verifications.data) ? verifications.data : []
  const escalations = Array.isArray(tickets.data) ? tickets.data : []
  const revenueRecords = bookingRows.filter((booking) => booking.platformRevenueAmount !== null && booking.platformRevenueAmount !== undefined && booking.platformRevenueAmount !== '')
  const revenue = revenueRecords.reduce((total, booking) => total + (Number.isFinite(Number(booking.platformRevenueAmount)) ? Number(booking.platformRevenueAmount) : 0), 0)
  const hasRevenue = revenueRecords.some((booking) => Number.isFinite(Number(booking.platformRevenueAmount)))
  const trend = bookingTrend(bookingRows)
  const maxTrend = Math.max(1, ...trend.map(([, count]) => count))
  const statusGroups = [...bookingRows.reduce((groups, booking) => groups.set(show(booking.status), (groups.get(show(booking.status)) || 0) + 1), new Map()).entries()]
    .sort(([left], [right]) => String(left).localeCompare(String(right)))
  const registrations = [
    ...customerAccounts.map((customer) => ({ name: customer.fullName, role: 'Customer', date: customer.registrationDate, status: customer.status })),
    ...providerAccounts.map((provider) => ({ name: provider.fullName, role: 'Provider', date: provider.registrationDate, status: provider.accountStatus })),
  ].sort((left, right) => (parseDate(right.date)?.getTime() || 0) - (parseDate(left.date)?.getTime() || 0)).slice(0, 8)

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader hero title="Welcome, Superuser" description="Monitor platform performance and manage system operations." />

        <section className="admin-panel admin-panel--compact">
          <h2>Quick Actions</h2>
          <div className="admin-grid admin-grid--actions">
            {actions.map((action) => action.disabled
              ? <div aria-disabled="true" className="admin-card admin-card--action admin-card--disabled" key={action.title} title="No employee-management API is available in the backend.">{action.title}</div>
              : <Link className="admin-card admin-card--action" key={action.path} to={action.path}>{action.title}</Link>)}
          </div>
        </section>

        <section aria-label="Platform summary" className="admin-grid admin-dashboard-stats">
          <Metric caption="Registered customers" error={customersData.error} isLoading={customersData.isLoading} label="Users" onRetry={customersData.reload} value={customersData.data ? (customersData.data.totals?.customers ?? customerAccounts.length) : 'Not available'} />
          <Metric caption="Service provider accounts" error={providersData.error} isLoading={providersData.isLoading} label="Pros" onRetry={providersData.reload} value={providersData.data ? (providersData.data.totals?.providers ?? providerAccounts.length) : 'Not available'} />
          <Metric caption="Total bookings" error={bookings.error} isLoading={bookings.isLoading} label="Jobs" onRetry={bookings.reload} value={bookings.data ? bookingRows.length : 'Not available'} />
          <Metric caption={`Platform revenue sum (${revenueRecords.length} booking records with this field)`} error={bookings.error} isLoading={bookings.isLoading} label="INR" onRetry={bookings.reload} value={hasRevenue ? money(revenue) : 'Not available'} />
          <Metric attention caption="Pending verifications" error={verifications.error} isLoading={verifications.isLoading} label="Docs" onRetry={verifications.reload} value={verifications.data ? requests.filter((request) => request.status === 'Pending').length : 'Not available'} />
        </section>

        <div className="admin-dashboard-grid">
          <section className="admin-panel admin-panel--compact">
            <h2>Monthly Bookings Trend</h2>
            {bookings.isLoading && <LoadingState message="Loading booking records…" />}
            {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button" onClick={bookings.reload} type="button">Retry</button></div>}
            {!bookings.isLoading && !bookings.error && trend.length === 0 && <EmptyState message="Booking dates are not available to display a monthly trend." />}
            {!bookings.isLoading && !bookings.error && trend.length > 0 && <div aria-label="Monthly booking counts" className="admin-chart" role="img">
              {trend.map(([month, count]) => <div className="admin-chart-column" key={month} title={`${month}: ${count} bookings`}>
                <strong>{count}</strong><div className="admin-chart-bar" style={{ height: `${Math.max(3, (count / maxTrend) * 78)}%` }} /><span>{month}</span>
              </div>)}
            </div>}
            <p className="admin-note">Counts are grouped from booking dates returned by the API.</p>
          </section>

          <aside className="admin-sidebar-stack">
            <section className="admin-panel admin-panel--compact">
              <div className="admin-panel-heading"><h2>Escalated Tickets</h2><span>{tickets.data ? `${escalations.length} records` : 'Not available'}</span></div>
              {tickets.isLoading && <LoadingState message="Loading escalated tickets…" />}
              {!tickets.isLoading && tickets.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={tickets.error} /><button className="admin-button" onClick={tickets.reload} type="button">Retry</button></div>}
              {!tickets.isLoading && !tickets.error && escalations.length === 0 && <EmptyState message="No escalated tickets are available." />}
              {!tickets.isLoading && !tickets.error && escalations.length > 0 && <div className="admin-notification-list">
                {escalations.slice(0, 4).map((ticket, index) => <article className="admin-notification" key={ticket.ticketId ?? index}>
                  <strong>{show(ticket.subject || ticket.ticketId)}</strong>
                  <span>{show(ticket.status)} · {show(ticket.priority)}</span>
                </article>)}
              </div>}
              <Link className="admin-button admin-button--secondary" to="/admin/bookings">View bookings and tickets</Link>
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>System Statistics</h2>
              <p className="admin-muted">Average platform response time: Not available</p>
              <p className="admin-note">No response-time metric is provided by the current API.</p>
            </section>
          </aside>
        </div>

        <div className="admin-dashboard-grid admin-dashboard-lower">
          <section className="admin-panel admin-panel--compact">
            <h2>Recent Registrations</h2>
            {(customersData.isLoading || providersData.isLoading) && <LoadingState message="Loading registration records…" />}
            {!customersData.isLoading && customersData.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={customersData.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={customersData.reload} type="button">Retry customers</button></div>}
            {!providersData.isLoading && providersData.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={providersData.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={providersData.reload} type="button">Retry providers</button></div>}
            {!customersData.isLoading && !providersData.isLoading && registrations.length === 0 && <EmptyState message="Registration dates are not available." />}
            {registrations.length > 0 && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Role</th><th>Registration Date</th><th>Status</th></tr></thead><tbody>
              {registrations.map((registration, index) => <tr key={`${registration.role}-${registration.name}-${index}`}><td>{show(registration.name)}</td><td>{registration.role}</td><td>{displayDate(registration.date)}</td><td>{show(registration.status)}</td></tr>)}
            </tbody></table></div>}
          </section>
          <section className="admin-panel admin-panel--compact">
            <h2>Booking Status Distribution</h2>
            {bookings.isLoading && <LoadingState message="Loading booking records…" />}
            {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button" onClick={bookings.reload} type="button">Retry</button></div>}
            {!bookings.isLoading && !bookings.error && statusGroups.length === 0 && <EmptyState message="No booking statuses are available." />}
            {!bookings.isLoading && !bookings.error && statusGroups.map(([status, count]) => <div className="admin-status-row" key={status}><span><i aria-hidden="true" />{status}</span><strong>{count}</strong></div>)}
          </section>
        </div>
      </section>
    </AdminAccessGate>
  )
}
