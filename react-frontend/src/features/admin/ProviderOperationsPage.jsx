import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { listCatalog, listVerificationRequests } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

function includesQuery(record, fields, query) {
  return fields.some((field) => {
    const value = record?.[field]
    return value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(query)
  })
}

export default function ProviderOperationsPage() {
  const verification = useAdminData(listVerificationRequests)
  const catalog = useAdminData(listCatalog)
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const verificationRecords = useMemo(() => (Array.isArray(verification.data) ? verification.data : []), [verification.data])
  const catalogProviders = useMemo(() => (Array.isArray(catalog.data?.providers) ? catalog.data.providers : []), [catalog.data])
  const visibleVerification = verificationRecords.filter((record) => includesQuery(record,
    ['id', 'name', 'email', 'category', 'location', 'status'], normalizedQuery))
  const visibleCatalog = catalogProviders.filter((provider) => includesQuery(provider,
    ['id', 'name', 'category', 'accountStatus', 'approvalStatus', 'verificationStatus'], normalizedQuery))
  const isLoading = verification.isLoading || catalog.isLoading
  const error = verification.error || catalog.error

  async function retry() {
    await Promise.all([verification.reload(), catalog.reload()])
  }

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Providers</h1>
        <p className="admin-muted">Catalog visibility does not prove verification. Verification requests and catalog providers are shown as separate records.</p>

        <label className="admin-form">
          Search providers
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search either table" value={query} />
        </label>

        {isLoading && <LoadingState message="Loading provider records…" />}
        {!isLoading && error && <div className="admin-feedback admin-feedback--error"><ErrorState message={error} /><button className="admin-button" onClick={retry} type="button">Retry</button></div>}

        {!isLoading && !error && <>
          <section className="admin-panel">
            <h2>Verification requests</h2>
            {verificationRecords.length === 0 && <EmptyState message="No verification requests are available." />}
            {verificationRecords.length > 0 && visibleVerification.length === 0 && <EmptyState message="No verification requests match this search." />}
            {visibleVerification.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Category</th><th>Location</th><th>Verification status</th><th>Action</th></tr></thead>
              <tbody>{visibleVerification.map((record, index) => {
                const id = record.id
                const status = show(record.status)
                const tone = status === 'Not available' ? 'neutral' : 'ready'
                return <tr key={id ?? `${record.email || record.name || 'verification'}-${index}`}>
                  <td>{show(id)}</td><td>{show(record.name)}</td><td>{show(record.email)}</td><td>{show(record.category)}</td><td>{show(record.location)}</td>
                  <td><StatusBadge tone={tone}>{status}</StatusBadge></td>
                  <td>{id === null || id === undefined ? 'Not available' : <Link to={`/admin/verification?provider=${encodeURIComponent(id)}`}>Review</Link>}</td>
                </tr>
              })}</tbody>
            </table></div>}
          </section>

          <section className="admin-panel">
            <h2>Catalog providers</h2>
            {catalogProviders.length === 0 && <EmptyState message="No catalog providers are available." />}
            {catalogProviders.length > 0 && visibleCatalog.length === 0 && <EmptyState message="No catalog providers match this search." />}
            {visibleCatalog.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>ID</th><th>Name</th><th>Category</th><th>Rating</th><th>Account status</th><th>Approval status</th><th>Verification status</th></tr></thead>
              <tbody>{visibleCatalog.map((provider, index) => <tr key={provider.id ?? `${provider.name || 'provider'}-${index}`}>
                <td>{show(provider.id)}</td><td>{show(provider.name)}</td><td>{show(provider.category)}</td><td>{show(provider.rating)}</td>
                <td>{show(provider.accountStatus)}</td><td>{show(provider.approvalStatus)}</td><td>{show(provider.verificationStatus)}</td>
              </tr>)}</tbody>
            </table></div>}
          </section>
        </>}
      </section>
    </AdminAccessGate>
  )
}
