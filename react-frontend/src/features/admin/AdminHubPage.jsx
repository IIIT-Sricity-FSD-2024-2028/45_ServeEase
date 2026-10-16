import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminNotifications } from './AdminNotifications'
import { AdminPageHeader } from './AdminPageHeader'
import { listBookings, listCatalog, listCustomerAccounts, listEscalatedTickets, listProviderAccounts, listVerificationRequests } from './adminApi'
import { money, show, useAdminData, useSuperuserModuleData } from './useAdminData'
import './admin.css'

const actions = [
  { title: '♟ User Management', path: '/admin/customers' },
  { title: 'Administration', path: '/admin/administration' },
  { title: 'Provider Verification', path: '/admin/verification' },
  { title: '⚙ Service Categories', path: '/admin/categories' },
  { title: '▣ Monitor Bookings', path: '/admin/bookings' },
  { title: 'Escalated Tickets', path: '/admin/escalated-tickets' },
  { title: 'Finance & Revenue', path: '/admin/finance' },
]

const pieColors = ['#1fba82', '#f34242', '#4a7fe6', '#8a5cf6', '#f59e0b', '#64748b']

function parseDate(value) {
  if (!value) return null
  const text = String(value).trim()
  const dayFirst = text.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/)
  const date = dayFirst
    ? new Date(Number(dayFirst[3]), Number(dayFirst[2]) - 1, Number(dayFirst[1]))
    : new Date(text)
  return Number.isNaN(date.getTime()) ? null : date
}

function displayDate(value) {
  const date = parseDate(value)
  return date ? new Intl.DateTimeFormat('en-GB').format(date) : 'Not available'
}

function bookingDate(booking) {
  return booking.date || booking.bookingDate || booking.serviceDate || booking.createdAt
}

function bookingTrend(bookings) {
  const months = new Map()
  bookings.forEach((booking) => {
    const date = parseDate(bookingDate(booking))
    if (!date) return
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    months.set(key, (months.get(key) || 0) + 1)
  })
  return Array.from(months.entries()).sort(([left], [right]) => left.localeCompare(right)).slice(-8)
}

function categoryName(booking) {
  return booking.category || booking.serviceCategory || booking.categoryName || booking.serviceType || ''
}

function categoryBookings(bookings, catalog) {
  const sourceCategories = Array.isArray(catalog?.categories) ? catalog.categories : []
  const names = sourceCategories.map((category) => ({
    key: String(category.id || category.name || category.category || ''),
    name: category.name || category.category || category.id || '',
  })).filter((category) => category.name)
  if (!names.length) {
    const distinct = new Map()
    bookings.forEach((booking) => {
      const name = categoryName(booking)
      if (name) distinct.set(String(name).toLowerCase(), String(name))
    })
    distinct.forEach((name) => names.push({ key: name, name }))
  }
  return names.map((category) => {
    const possibleNames = [category.key, category.name].map((value) => String(value).toLowerCase())
    const count = bookings.filter((booking) => possibleNames.includes(String(categoryName(booking)).toLowerCase())).length
    return { ...category, count }
  }).sort((left, right) => right.count - left.count || left.name.localeCompare(right.name))
}

function statusGroups(bookings) {
  const groups = new Map()
  bookings.forEach((booking) => {
    const status = booking.status
    if (status === null || status === undefined || String(status).trim() === '') return
    groups.set(String(status), (groups.get(String(status)) || 0) + 1)
  })
  return Array.from(groups.entries()).sort(([left], [right]) => left.localeCompare(right))
}

function pieGradient(groups) {
  const total = groups.reduce((sum, [, count]) => sum + count, 0)
  if (!total) return 'conic-gradient(#e7edf7 0 100%)'
  let start = 0
  const slices = groups.map(([, count], index) => {
    const end = start + (count / total) * 100
    const slice = pieColors[index % pieColors.length] + ' ' + start + '% ' + end + '%'
    start = end
    return slice
  })
  return 'conic-gradient(' + slices.join(', ') + ')'
}

function Metric({ label, value, caption, attention = false, isLoading, error, onRetry }) {
  return <article className={'admin-stat-card' + (attention ? ' admin-stat-card--attention' : '')}>
    <span>{label}<span>SE</span></span>
    <strong>{isLoading ? '…' : error ? 'Unavailable' : value}</strong>
    <p>{caption}</p>
    {error && <button className="admin-button admin-button--secondary admin-button--small" onClick={onRetry} type="button">Retry</button>}
  </article>
}

function MonthlyBookingsChart({ bookings, isLoading, error, reload }) {
  const points = bookingTrend(bookings)
  if (isLoading) return <LoadingState message="Loading booking records…" />
  if (error) return <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>
  if (!points.length) return <EmptyState message="No booking data available." />

  const maximum = Math.max(1, ...points.map(([, count]) => count))
  const coordinates = points.map(([, count], index) => {
    const x = points.length === 1 ? 400 : 38 + (index * 724) / (points.length - 1)
    const y = 184 - (count / maximum) * 140
    return { x, y, count }
  })
  const line = coordinates.map((point) => point.x + ',' + point.y).join(' ')

  return <div className="admin-line-chart">
    <svg aria-label="Monthly booking trend" role="img" viewBox="0 0 800 230" preserveAspectRatio="none">
      {[50, 100, 150, 190].map((y) => <line key={y} x1="28" x2="775" y1={y} y2={y} />)}
      <polyline points={line} />
      {coordinates.map((point, index) => <g key={points[index][0]}>
        <circle cx={point.x} cy={point.y} r="5" />
        <text className="admin-chart-value" x={point.x} y={point.y - 12}>{point.count}</text>
        <text className="admin-chart-label" x={point.x} y="218">{points[index][0].slice(5)}/{points[index][0].slice(0, 4)}</text>
      </g>)}
    </svg>
  </div>
}

function CategoryBookingsChart({ bookings, catalog, isLoading, error, reload }) {
  const categories = categoryBookings(bookings, catalog)
  const maximum = Math.max(1, ...categories.map((category) => category.count))
  if (isLoading) return <LoadingState message="Loading booking records…" />
  if (error) return <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={reload} type="button">Retry</button></div>
  if (!categories.length) return <EmptyState message="No service category booking data available." />
  return <div className="admin-category-chart">
    {categories.map((category) => <div className="admin-category-row" key={category.key}>
      <span>{category.name}</span>
      <div className="admin-category-track"><i style={{ width: (category.count / maximum) * 100 + '%' }} /></div>
      <strong>{category.count}</strong>
    </div>)}
  </div>
}

function RecentRegistrations({ customers, providers, customersLoading, providersLoading, customersError, providersError, reloadCustomers, reloadProviders }) {
  const records = [
    ...(Array.isArray(customers) ? customers : []).map((item) => ({ item, role: 'Customer', date: item.registrationDate || item.createdAt })),
    ...(Array.isArray(providers) ? providers : []).map((item) => ({ item, role: 'Provider', date: item.registrationDate || item.submittedDate || item.createdAt })),
  ].sort((left, right) => (parseDate(right.date)?.getTime() || 0) - (parseDate(left.date)?.getTime() || 0)).slice(0, 8)
  const loading = customersLoading || providersLoading

  return <>
    {loading && <LoadingState message="Loading registration records…" />}
    {customersError && <div className="admin-feedback admin-feedback--error"><ErrorState message={customersError} /><button className="admin-button admin-button--secondary admin-button--small" onClick={reloadCustomers} type="button">Retry customers</button></div>}
    {providersError && <div className="admin-feedback admin-feedback--error"><ErrorState message={providersError} /><button className="admin-button admin-button--secondary admin-button--small" onClick={reloadProviders} type="button">Retry providers</button></div>}
    {!loading && !customersError && !providersError && records.length === 0 && <EmptyState message="No registration data available." />}
    {!loading && records.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
      <thead><tr><th>Name</th><th>Role</th><th>Registration Date</th><th>Status</th></tr></thead>
      <tbody>{records.map(({ item, role, date }, index) => <tr key={String(item.id || item.email || role) + '-' + index}>
        <td>{show(item.fullName || item.name || item.organisationName)}</td>
        <td><span className={'admin-role-chip admin-role-chip--' + role.toLowerCase()}>{role}</span></td>
        <td>{displayDate(date)}</td>
        <td>{show(item.accountStatus || item.status || item.approvalStatus || item.verificationStatus)}</td>
      </tr>)}</tbody>
    </table></div>}
  </>
}

export default function AdminHubPage() {
  const bookings = useAdminData(listBookings)
  const catalog = useAdminData(listCatalog)
  const customersData = useAdminData(listCustomerAccounts)
  const providersData = useAdminData(listProviderAccounts)
  const verifications = useAdminData(listVerificationRequests)
  const tickets = useAdminData(listEscalatedTickets)
  const moduleState = useSuperuserModuleData()

  const bookingRows = Array.isArray(bookings.data) ? bookings.data : []
  const customerAccounts = Array.isArray(customersData.data?.customers) ? customersData.data.customers : []
  const providerAccounts = Array.isArray(providersData.data?.providers) ? providersData.data.providers : []
  const requests = Array.isArray(verifications.data) ? verifications.data : []
  const revenueRecords = bookingRows.filter((booking) => booking.platformRevenueAmount !== null && booking.platformRevenueAmount !== undefined && booking.platformRevenueAmount !== '')
  const revenue = revenueRecords.reduce((total, booking) => total + (Number.isFinite(Number(booking.platformRevenueAmount)) ? Number(booking.platformRevenueAmount) : 0), 0)
  const hasRevenue = revenueRecords.some((booking) => Number.isFinite(Number(booking.platformRevenueAmount)))
  const statuses = statusGroups(bookingRows)
  const pendingCount = requests.filter((request) => String(request.status || '').toLowerCase() === 'pending').length
  const activity = Array.isArray(moduleState.data.activities) ? moduleState.data.activities : []
  const validActivity = activity.filter((item) => item?.createdAt && !['state_saved', 'state_removed'].includes(String(item.action || '').toLowerCase()))
    .slice().sort((left, right) => (parseDate(right.createdAt)?.getTime() || 0) - (parseDate(left.createdAt)?.getTime() || 0)).slice(0, 8)

  return (
    <AdminAccessGate>
      <section className="admin-page admin-hub-page">
        <AdminPageHeader hero title="Welcome, Superuser" description="Monitor platform performance and manage system operations." />

        <section className="admin-panel admin-panel--compact admin-quick-actions">
          <h2>Quick Actions</h2>
          <div className="admin-grid admin-grid--actions">
            {actions.map((action) => action.disabled
              ? <div aria-disabled="true" className="admin-card admin-card--action admin-card--disabled" key={action.title} title="Employee administration is not available in the current backend API.">{action.title}</div>
              : <Link className="admin-card admin-card--action" key={action.path} to={action.path}>{action.title}</Link>)}
          </div>
        </section>

        <section aria-label="Platform summary" className="admin-grid admin-dashboard-stats">
          <Metric caption="Registered Customers" error={customersData.error} isLoading={customersData.isLoading} label="Users" onRetry={customersData.reload} value={customersData.data ? (customersData.data.totals?.customers ?? customerAccounts.length) : 'Not available'} />
          <Metric caption="Service Providers" error={providersData.error} isLoading={providersData.isLoading} label="Pros" onRetry={providersData.reload} value={providersData.data ? (providersData.data.totals?.providers ?? providerAccounts.length) : 'Not available'} />
          <Metric caption="Total Bookings" error={bookings.error} isLoading={bookings.isLoading} label="Jobs" onRetry={bookings.reload} value={bookings.data ? bookingRows.length : 'Not available'} />
          <Metric caption="Platform Revenue (15%)" error={bookings.error} isLoading={bookings.isLoading} label="INR" onRetry={bookings.reload} value={hasRevenue ? money(revenue) : 'Not available'} />
          <Metric attention caption="Pending Verifications" error={verifications.error} isLoading={verifications.isLoading} label="Docs" onRetry={verifications.reload} value={verifications.data ? pendingCount : 'Not available'} />
        </section>

        <div className="admin-hub-columns">
          <div className="admin-hub-main">
            <section className="admin-panel admin-panel--compact">
              <h2>Monthly Bookings Trend</h2>
              <MonthlyBookingsChart bookings={bookingRows} error={bookings.error} isLoading={bookings.isLoading} reload={bookings.reload} />
              <p className="admin-chart-legend">↗ Bookings</p>
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>Bookings per Service Category</h2>
              <CategoryBookingsChart bookings={bookingRows} catalog={catalog.data} error={bookings.error || catalog.error} isLoading={bookings.isLoading || catalog.isLoading} reload={() => { bookings.reload(); catalog.reload() }} />
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>Platform Activity Overview</h2>
              {moduleState.isLoading && <LoadingState message="Loading platform activity…" />}
              {!moduleState.isLoading && moduleState.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={moduleState.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={moduleState.reload} type="button">Retry</button></div>}
              {!moduleState.isLoading && !moduleState.error && validActivity.length === 0 && <div className="admin-activity-empty">No recent platform activity.</div>}
              {!moduleState.isLoading && !moduleState.error && validActivity.length > 0 && <div className="admin-activity-list">
                {validActivity.map((item, index) => <article className="admin-activity-item" key={item.id || String(item.action) + '-' + index}>
                  <span aria-hidden="true" className="admin-activity-icon">•</span>
                  <div><strong>{show(item.details ? item.action + ' — ' + item.details : item.action)}</strong><span>{displayDate(item.createdAt)}</span></div>
                </article>)}
              </div>}
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>Recent Registrations</h2>
              <RecentRegistrations
                customers={customerAccounts}
                providers={providerAccounts}
                customersLoading={customersData.isLoading}
                providersLoading={providersData.isLoading}
                customersError={customersData.error}
                providersError={providersData.error}
                reloadCustomers={customersData.reload}
                reloadProviders={providersData.reload}
              />
            </section>
          </div>

          <aside className="admin-hub-sidebar">
            <AdminNotifications
              moduleState={moduleState}
              tickets={Array.isArray(tickets.data) ? tickets.data : []}
              ticketsLoading={tickets.isLoading}
              ticketsError={tickets.error}
              onRetryTickets={tickets.reload}
            />
            <section className="admin-panel admin-panel--compact admin-system-stat-card">
              <h2>System Statistics</h2>
              <div className="admin-system-stat-row"><span>Average Platform Response Time</span><strong>Not available</strong></div>
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>Booking Status Distribution</h2>
              {bookings.isLoading && <LoadingState message="Loading booking records…" />}
              {!bookings.isLoading && bookings.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={bookings.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={bookings.reload} type="button">Retry</button></div>}
              {!bookings.isLoading && !bookings.error && statuses.length === 0 && <EmptyState message="No booking status data available." />}
              {!bookings.isLoading && !bookings.error && statuses.length > 0 && <>
                <div aria-label="Booking status chart" className="admin-status-pie" role="img" style={{ background: pieGradient(statuses) }} />
                <div className="admin-status-legend">
                  {statuses.map(([status, count], index) => <div className="admin-status-row" key={status}><span><i aria-hidden="true" style={{ background: pieColors[index % pieColors.length] }} />{status}</span><strong>{count}</strong></div>)}
                </div>
              </>}
            </section>
          </aside>
        </div>
      </section>
    </AdminAccessGate>
  )
}
