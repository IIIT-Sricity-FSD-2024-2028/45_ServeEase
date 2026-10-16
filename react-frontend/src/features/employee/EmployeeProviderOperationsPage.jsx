import { useEffect, useReducer, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { employeeOperationsApi } from '../../services/api'
import { Breadcrumb } from './EmployeeOpsParts'
import { initialStatusChange, statusChangeReducer } from './employeeOperations'
import { Chip, LoadState, ProviderStatusModal } from './ProviderOpsParts'
import { countLabel, display, filterProviders, formatDate, formatExperience, isPendingVerification, providerPath, providerStats, providerStatusAction, providerStatusError, providerStatusNotice, statusOptions } from './providerOperations'
import { useOperationsData } from './useOperationsData'
import './providerOperations.css'

function StatCard({ icon, label, value, description }) {
  return <article className="provider-operations-stat-card">
    <div className="provider-operations-stat-label"><span aria-hidden="true" className="provider-operations-stat-icon">{icon}</span><span>{label}</span></div>
    <strong>{value}</strong>
    <small>{description}</small>
  </article>
}

// provider-operations.html list body; `data` is GET /employee/provider-operations/providers.
export function ProviderOperationsList({ data, status, query, onStatus, onQuery, onStatusAction, busy = false }) {
  const stats = providerStats(data)
  const all = data?.providers || []
  const providers = filterProviders(all, { status, query })
  const pending = all.filter(isPendingVerification)
  return <>
    <section aria-label="Provider operations summary" className="provider-operations-stats">
      <StatCard description="All provider records" icon="💼" label="Total Providers" value={stats.providers} />
      <StatCard description="Verified and dashboard-eligible" icon="🟢" label="Active Providers" value={stats.active} />
      <StatCard description="Providers awaiting review" icon="🟠" label="Pending Verification" value={stats.pending} />
      <StatCard description="Temporarily blocked accounts" icon="⛔" label="Suspended Providers" value={stats.suspended} />
      <StatCard description="Linked provider service records" icon="🛠" label="Total Services" value={stats.services} />
    </section>

    <section aria-labelledby="provider-management-title" className="provider-operations-card" id="provider-management">
      <div className="provider-operations-section-head">
        <h2 id="provider-management-title">Provider Management ({providers.length})</h2>
        <select aria-label="Filter providers by account status" className="provider-operations-filter" onChange={(event) => onStatus(event.target.value)} value={status}>
          {statusOptions(all).map((value) => <option key={value} value={value}>{value === 'all' ? 'All Status' : value}</option>)}
        </select>
      </div>
      <label className="provider-operations-search">Search providers<input onChange={(event) => onQuery(event.target.value)} placeholder="Name, email, phone, location, or service" type="search" value={query} /></label>
      <div className="provider-operations-table-wrap table-scroll"><table className="provider-operations-table">
        <thead><tr><th scope="col">Provider ID</th><th scope="col">Name</th><th scope="col">Organisation</th><th scope="col">Email</th><th scope="col">Phone</th><th scope="col">Service Category</th><th scope="col">Experience</th><th scope="col">Location</th><th scope="col">No. of Services</th><th scope="col">Account Status</th><th scope="col">Actions</th></tr></thead>
        <tbody>{providers.length ? providers.map((provider) => <tr key={`${provider.id}:${provider.providerCatalogId || ''}`}>
          <td>{provider.id}</td><td>{display(provider.fullName)}</td><td>{display(provider.organisationName)}</td><td>{display(provider.email)}</td><td>{display(provider.phone)}</td>
          <td>{display(provider.serviceType)}</td><td>{formatExperience(provider.experience)}</td><td>{display(provider.location)}</td><td>{provider.serviceCount}</td>
          <td><Chip value={provider.accountStatus} /></td>
          <td><div className="provider-operations-actions">
            {providerStatusAction(provider) && <button aria-label={`${providerStatusAction(provider).label} ${display(provider.organisationName || provider.fullName)}`} className={`provider-operations-inline-action ${providerStatusAction(provider).tone}`} disabled={busy} onClick={() => onStatusAction(provider)} type="button">{providerStatusAction(provider).label}</button>}
            <Link aria-label={`View ${display(provider.organisationName || provider.fullName)}`} className="provider-operations-inline-action" to={providerPath(provider)}>View</Link>
          </div></td>
        </tr>) : <tr><td colSpan="11"><div className="provider-operations-empty-state">No providers match the current search or filter.</div></td></tr>}</tbody>
      </table></div>
    </section>

    <section aria-labelledby="pending-verification-title" className="provider-operations-card provider-operations-card-warning" id="pending-verification-requests">
      <div className="provider-operations-section-head">
        <div>
          <h2 id="pending-verification-title">Pending Verification Requests ({pending.length})</h2>
          <p className="provider-operations-muted">Providers awaiting document and eligibility review.</p>
        </div>
      </div>
      <div className="provider-operations-table-wrap table-scroll"><table className="provider-operations-table provider-operations-pending-table">
        <thead><tr><th scope="col">Provider ID</th><th scope="col">Provider Name</th><th scope="col">Email</th><th scope="col">Category</th><th scope="col">Location</th><th scope="col">Submitted</th><th scope="col">Documents</th><th scope="col">Action</th></tr></thead>
        <tbody>{pending.length ? pending.map((provider) => <tr key={`${provider.id}:${provider.providerCatalogId || ''}`}>
          <td>{provider.id}</td><td>{display(provider.fullName)}</td><td>{display(provider.email)}</td><td>{display(provider.serviceType)}</td><td>{display(provider.location)}</td>
          <td>{formatDate(provider.registrationDate)}</td>
          <td><div className="provider-operations-documents-cell"><span>{countLabel(provider.documentCount, 'document')}</span><Link className="provider-operations-inline-action" to={providerPath(provider, 'verification-review')}>Preview Documents</Link></div></td>
          <td><Link className="provider-operations-inline-action warning" to={providerPath(provider, 'verification-review')}>Review</Link></td>
        </tr>) : <tr><td colSpan="8"><div className="provider-operations-empty-state">No pending verification requests.</div></td></tr>}</tbody>
      </table></div>
    </section>
  </>
}

// provider-operations.html. Search and status filter live in the URL so they survive refresh and Back.
// Suspend/Activate goes through the original confirmation modal; the list reloads from the server only after
// the change is confirmed.
export default function EmployeeProviderOperationsPage() {
  const { state, data, error, retry } = useOperationsData(employeeOperationsApi.providers)
  const [change, dispatch] = useReducer(statusChangeReducer, initialStatusChange)
  const [target, setTarget] = useState(null)
  const { logout } = useAuth()
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  // A decision made on the review page arrives as a one-time notice; drop it from history so refresh does not repeat it.
  const [routeNotice] = useState(() => location.state?.notice || '')
  const notice = change.notice || routeNotice
  const action = target ? providerStatusAction(target) : null

  const openStatus = (provider) => { setTarget(provider); dispatch({ type: 'open', nextStatus: providerStatusAction(provider).nextStatus }) }
  const confirmStatus = async (body) => {
    dispatch({ type: 'submit' })
    try {
      const result = await employeeOperationsApi.setProviderStatus(target.id, target.sharedId ? target.providerCatalogId : undefined, body)
      dispatch({ type: 'succeeded', message: providerStatusNotice(result) })
      setTarget(null)
      retry()
    } catch (requestError) {
      dispatch({ type: 'failed', message: providerStatusError(requestError) })
    }
  }
  // The stored session is no longer accepted: clear it so the login page does not bounce back here.
  const signInAgain = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}` } })
  }
  useEffect(() => {
    if (location.state?.notice) navigate(`${location.pathname}${location.search}`, { replace: true, state: null })
  }, [location.pathname, location.search, location.state, navigate])

  const options = statusOptions(data?.providers || [])
  const status = options.includes(params.get('status')) ? params.get('status') : 'all'
  const setParam = (key, value) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value && value !== 'all') next.set(key, value); else next.delete(key)
    return next
  }, { replace: true })

  return <div className="provider-ops provider-ops--list">
    <Breadcrumb items={[['Home', '/'], ['Employee'], ['Provider Operations']]} />
    <section aria-labelledby="provider-operations-title" className="provider-operations-hero">
      <h1 id="provider-operations-title">Provider Operations</h1>
      <p>Internal provider management, verification and operational visibility for ServeEase.</p>
    </section>
    {notice && <p className="provider-operations-notice" role="status">{notice}</p>}
    <LoadState error={error} loadingText="Loading provider records…" onRetry={retry} state={state} />
    {state === 'ready' && <ProviderOperationsList busy={change.phase === 'submitting'} data={data} onQuery={(value) => setParam('q', value)} onStatus={(value) => setParam('status', value)} onStatusAction={openStatus} query={params.get('q') || ''} status={status} />}
    {change.phase !== 'idle' && action && <ProviderStatusModal
      action={action}
      change={change}
      onCancel={() => { dispatch({ type: 'cancel' }); if (change.phase !== 'submitting') setTarget(null) }}
      onConfirm={confirmStatus}
      onInvalid={(message) => dispatch({ type: 'invalid', message })}
      onSignIn={signInAgain}
      providerName={display(target.organisationName || target.fullName)}
    />}
  </div>
}
