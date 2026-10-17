import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { getResponseMetrics } from '../../services/apiClient'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminChip } from './AdminChip'
import { AdminNotifications } from './AdminNotifications'
import { AdminPageHeader } from './AdminPageHeader'
import { listBookings, listCatalog, listCustomerAccounts, listProviderAccounts, listVerificationRequests } from './adminApi'
import { money, show, useAdminData, useSuperuserModuleData } from './useAdminData'
import './admin.css'

const actions = [
  { title: '👥 User Management', path: '/admin/customers' },
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

// Dashboard trends reflect when a booking is scheduled; older imported records often have a newer migration timestamp.
function bookingDate(booking) {
  return [booking.date, booking.serviceDate, booking.bookingDate, booking.createdAt, booking.createdDate].find((value) => parseDate(value))
}

function bookingTrend(bookings) {
  const months = new Map()
  bookings.forEach((booking) => {
    const date = parseDate(bookingDate(booking))
    if (!date) return
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    months.set(key, (months.get(key) || 0) + 1)
  })
  if (!months.size) return []
  const keys = [...months.keys()].sort()
  const [startYear, startMonth] = keys[0].split('-').map(Number)
  const [endYear, endMonth] = keys.at(-1).split('-').map(Number)
  const points = []
  for (let year = startYear, month = startMonth; year < endYear || (year === endYear && month <= endMonth); month += 1) {
    if (month === 13) { year += 1; month = 1 }
    const key = `${year}-${String(month).padStart(2, '0')}`
    points.push([key, months.get(key) || 0])
  }
  return points.map(([key, count]) => {
    const [year, month] = key.split('-').map(Number)
    return { key, count, label: new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) }
  })
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
  return <article className={'admin-stat-card admin-hub-stat' + (attention ? ' admin-stat-card--attention' : '')}>
    <span><span />{label}</span>
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

  // superuser.js renderLineChart(): 640x220 drawing, the count of each month shown on hover.
  const maximum = Math.max(...points.map((point) => point.count)) * 1.1 || 1
  const stepX = points.length === 1 ? 0 : (640 - 50) / (points.length - 1)
  const coordinates = points.map((point, index) => ({ ...point, x: 25 + index * stepX, y: 195 - (point.count / maximum) * 175 }))
  const path = coordinates.map((point, index) => (index === 0 ? 'M' : 'L') + point.x + ' ' + point.y).join(' ')

  return <div className="admin-line-chart">
    <svg aria-label="Monthly booking trend" role="img" viewBox="0 0 640 220" preserveAspectRatio="none">
      <path d={path} />
      {coordinates.map((point) => <g key={point.key}>
        <text className="admin-chart-label" x={point.x} y="215">{point.label}</text>
        <g className="admin-chart-point">
          <circle cx={point.x} cy={point.y} r="5" />
          <text className="admin-chart-tooltip" x={point.x} y={point.y - 12}>{point.count}</text>
        </g>
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
  // superuser.js renderBarChart(): one 42px row per category, purple bars scaled to the busiest one.
  const height = Math.max(220, categories.length * 42 + 24)
  const barWidth = 760 - 245 - 55
  return <div className="admin-category-chart">
    <svg aria-label="Bookings per service category" role="img" viewBox={'0 0 760 ' + height} preserveAspectRatio="xMinYMin meet">
      {categories.map((category, index) => {
        const y = 18 + index * 42
        const width = Math.max(3, (category.count / maximum) * barWidth)
        return <g key={category.key}>
          <text className="admin-category-chart-name" x="0" y={y + 16}>{category.name}</text>
          <rect height="22" rx="11" width={width} x="245" y={y} />
          <text className="admin-category-chart-count" x={245 + width + 10} y={y + 16}>{category.count}</text>
        </g>
      })}
    </svg>
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
        <td><AdminChip>{role}</AdminChip></td>
        <td>{displayDate(date)}</td>
        <td><AdminChip>{show(item.accountStatus || item.status || item.approvalStatus || item.verificationStatus || 'Active')}</AdminChip></td>
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
  const moduleState = useSuperuserModuleData()
  const [responseMetrics, setResponseMetrics] = useState(getResponseMetrics)

  // Earlier dashboard bookings remain in the superuser module while new ones use the canonical bookings API.
  // Combine both sources by booking id so the trend and totals cover the complete 2026 history.
  const canonicalBookingRows = Array.isArray(bookings.data) ? bookings.data : []
  const legacyBookingRows = Array.isArray(moduleState.data?.bookings) ? moduleState.data.bookings : []
  const bookingRows = [...new Map([...legacyBookingRows, ...canonicalBookingRows].map((booking, index) => [String(booking.id || `legacy-${index}`), booking])).values()]
  const customerAccounts = Array.isArray(customersData.data?.customers) ? customersData.data.customers : []
  const providerAccounts = Array.isArray(providersData.data?.providers) ? providersData.data.providers : []
  const requests = Array.isArray(verifications.data) ? verifications.data : []
  const revenueRecords = bookingRows.filter((booking) => booking.platformRevenueAmount !== null && booking.platformRevenueAmount !== undefined && booking.platformRevenueAmount !== '')
  const revenue = revenueRecords.reduce((total, booking) => total + (Number.isFinite(Number(booking.platformRevenueAmount)) ? Number(booking.platformRevenueAmount) : 0), 0)
  const hasRevenue = revenueRecords.some((booking) => Number.isFinite(Number(booking.platformRevenueAmount)))
  const statuses = statusGroups(bookingRows)
  const pendingCount = requests.filter((request) => String(request.status || '').toLowerCase() === 'pending').length

  // The average covers every request this tab has made, so it is re-read once the dashboard's own loads finish.
  const dashboardLoading = bookings.isLoading || catalog.isLoading || customersData.isLoading || providersData.isLoading || verifications.isLoading || moduleState.isLoading
  useEffect(() => {
    if (dashboardLoading) return undefined
    const timer = window.setTimeout(() => setResponseMetrics(getResponseMetrics()), 0)
    return () => window.clearTimeout(timer)
  }, [dashboardLoading])

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
          <Metric caption="Total Bookings" error={bookings.error} isLoading={bookings.isLoading || moduleState.isLoading} label="Jobs" onRetry={() => { bookings.reload(); moduleState.reload() }} value={bookings.data ? bookingRows.length : 'Not available'} />
          <Metric caption="Platform Revenue (15%)" error={bookings.error} isLoading={bookings.isLoading} label="INR" onRetry={bookings.reload} value={hasRevenue ? money(revenue) : 'Not available'} />
          <Metric attention caption="Pending Verifications" error={verifications.error} isLoading={verifications.isLoading} label="Docs" onRetry={verifications.reload} value={verifications.data ? pendingCount : 'Not available'} />
        </section>

        <div className="admin-hub-columns">
          <div className="admin-hub-main">
            <section className="admin-panel admin-panel--compact">
              <h2>Monthly Bookings Trend</h2>
              <MonthlyBookingsChart bookings={bookingRows} error={bookings.error} isLoading={bookings.isLoading || moduleState.isLoading} reload={() => { bookings.reload(); moduleState.reload() }} />
              <p className="admin-chart-legend">⤳ Bookings</p>
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>Bookings per Service Category</h2>
              <CategoryBookingsChart bookings={bookingRows} catalog={catalog.data} error={bookings.error || catalog.error} isLoading={bookings.isLoading || catalog.isLoading} reload={() => { bookings.reload(); catalog.reload() }} />
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
            <AdminNotifications />
            <section className="admin-panel admin-panel--compact admin-system-stat-card">
              <h2>System Statistics</h2>
              <div className="admin-system-stat-row"><span>Average Platform Response Time</span><strong title={responseMetrics.count ? 'Measured from ' + responseMetrics.count + ' API request' + (responseMetrics.count === 1 ? '' : 's') : undefined}>{responseMetrics.count && responseMetrics.averageMs != null ? Math.round(responseMetrics.averageMs) + ' ms' : 'No response data yet'}</strong></div>
            </section>
            <section className="admin-panel admin-panel--compact">
              <h2>〽 Booking Status Distribution</h2>
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
