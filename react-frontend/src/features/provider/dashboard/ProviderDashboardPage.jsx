import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { availabilityApi, catalogApi } from '../../../services/api'
import './providerDashboard.css'

function isActiveService(service) {
  return String(service?.status || '').toLowerCase() === 'active' || service?.isActive === true
}

function scheduleEntries(schedule) {
  return Object.entries(schedule?.weeklySchedule || {}).flatMap(([day, slots]) => (
    (Array.isArray(slots) ? slots : []).map((slot) => ({ day, slot }))
  ))
}

export function ProviderDashboardPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.userId || currentUser?.providerCatalogId
  const [services, setServices] = useState([])
  const [schedule, setSchedule] = useState(null)
  const [isLoading, setIsLoading] = useState(Boolean(providerId && role === 'provider'))
  const [error, setError] = useState('')
  const [availabilityError, setAvailabilityError] = useState('')

  useEffect(() => {
    if (!providerId || role !== 'provider') return undefined

    let active = true

    Promise.allSettled([
      catalogApi.getProviderServices(providerId),
      availabilityApi.getWeeklySchedule(providerId),
    ]).then(([servicesResult, scheduleResult]) => {
      if (!active) return

      if (servicesResult.status === 'fulfilled') {
        setServices(Array.isArray(servicesResult.value) ? servicesResult.value : [])
      } else {
        setError(servicesResult.reason?.message || 'Unable to load your services.')
      }

      if (scheduleResult.status === 'fulfilled') {
        setSchedule(scheduleResult.value)
      } else {
        setSchedule(null)
        setAvailabilityError(scheduleResult.reason?.message || 'Availability has not been configured yet.')
      }
    }).finally(() => {
      if (active) setIsLoading(false)
    })

    return () => { active = false }
  }, [providerId, role])

  const serviceSummary = useMemo(() => ({
    total: services.length,
    active: services.filter(isActiveService).length,
    inactive: services.filter((service) => !isActiveService(service)).length,
  }), [services])

  const providerName = currentUser?.fullName || currentUser?.organisationName
  const providerStatus = currentUser?.accountStatus || currentUser?.status || currentUser?.approvalStatus || currentUser?.verificationStatus

  const scheduleSummary = useMemo(() => {
    const entries = scheduleEntries(schedule)
    return {
      entries,
      days: new Set(entries.map((entry) => entry.day)).size,
    }
  }, [schedule])

  if (!isAuthenticated || role !== 'provider') {
    return <section className="provider-dashboard-page"><div className="provider-dashboard-feedback">Please sign in with a provider account to view your dashboard.</div></section>
  }

  if (!providerId) {
    return <section className="provider-dashboard-page"><div className="provider-dashboard-feedback provider-dashboard-feedback--error">Your provider profile could not be identified.</div></section>
  }

  return (
    <section className="provider-dashboard-page">
      <div className="provider-dashboard-breadcrumb">Provider Dashboard</div>
      <section className="provider-dashboard-hero">
        <div>
          <p className="provider-dashboard-eyebrow">Provider workspace</p>
          <h1>{providerName ? `Welcome, ${providerName}` : 'Provider Dashboard'}</h1>
          <p>Manage your service listings and weekly availability from one place.</p>
        </div>
        <div className="provider-dashboard-hero-side">
          {providerId && <div><strong>Provider ID:</strong> <span>{providerId}</span></div>}
          {providerStatus && <div><strong>Status:</strong> <span className="provider-dashboard-status">{providerStatus}</span></div>}
        </div>
      </section>
      <div className="provider-dashboard-title-row">
        <div>
          <h2>Service overview</h2>
          <p>Review your service listings and weekly availability.</p>
        </div>
        <div className="provider-dashboard-actions">
          <Link className="provider-dashboard-secondary" to="/provider/availability">Availability</Link>
          <Link className="provider-dashboard-primary" to="/provider/services">Manage Services</Link>
        </div>
      </div>

      {isLoading && <div className="provider-dashboard-feedback">Loading your provider summary…</div>}
      {error && <div className="provider-dashboard-feedback provider-dashboard-feedback--error" role="alert">{error}</div>}
      {availabilityError && !isLoading && <div className="provider-dashboard-feedback" role="status">Availability schedule is not available yet: {availabilityError}</div>}

      {!isLoading && !error && (
        <>
          <div className="provider-dashboard-stats" aria-label="Service summary">
            <article className="provider-dashboard-stat"><span>Total Services</span><strong>{serviceSummary.total}</strong></article>
            <article className="provider-dashboard-stat provider-dashboard-stat--active"><span>Active Services</span><strong>{serviceSummary.active}</strong></article>
            <article className="provider-dashboard-stat provider-dashboard-stat--inactive"><span>Inactive Services</span><strong>{serviceSummary.inactive}</strong></article>
          </div>

          <div className="provider-dashboard-panels">
            <section className="provider-dashboard-panel">
              <div className="provider-dashboard-panel-heading"><h2>Service Summary</h2><Link to="/provider/services">View services</Link></div>
              {serviceSummary.total === 0
                ? <p className="provider-dashboard-muted">You have not added any services yet.</p>
                : <p className="provider-dashboard-muted">{serviceSummary.active} active and {serviceSummary.inactive} inactive service listing{serviceSummary.total === 1 ? '' : 's'}.</p>}
            </section>

            <section className="provider-dashboard-panel">
              <div className="provider-dashboard-panel-heading"><h2>Weekly Availability</h2><span>{scheduleSummary.entries.length} slot{scheduleSummary.entries.length === 1 ? '' : 's'}</span></div>
              {scheduleSummary.entries.length === 0
                ? <p className="provider-dashboard-muted">No weekly availability slots are configured.</p>
                : <p className="provider-dashboard-muted">Availability is configured across {scheduleSummary.days} day{scheduleSummary.days === 1 ? '' : 's'}.</p>}
              {scheduleSummary.entries.length > 0 && <ul className="provider-dashboard-schedule">{scheduleSummary.entries.slice(0, 6).map(({ day, slot }) => <li key={`${day}-${slot}`}><span>{day}</span><strong>{slot}</strong></li>)}</ul>}
            </section>
          </div>
        </>
      )}
    </section>
  )
}
