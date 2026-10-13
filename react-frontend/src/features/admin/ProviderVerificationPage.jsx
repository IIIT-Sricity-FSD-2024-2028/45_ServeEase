import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { approveProvider, getVerificationRequest, listVerificationRequests, rejectProvider } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const verificationStatuses = ['All', 'Pending', 'Verified', 'Rejected', 'Suspended']

function badgeTone(status) {
  return status === 'Verified' || status === 'Approved' ? 'ready' : 'neutral'
}

export default function ProviderVerificationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('provider')
  const [statusFilter, setStatusFilter] = useState('All')
  const [actionMode, setActionMode] = useState('')
  const [adminRemarks, setAdminRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const requests = useAdminData(listVerificationRequests)
  const loadSelectedProvider = useCallback(() => selectedId ? getVerificationRequest(selectedId) : Promise.resolve(null), [selectedId])
  const provider = useAdminData(loadSelectedProvider)

  const requestList = useMemo(() => Array.isArray(requests.data) ? requests.data : [], [requests.data])
  const filteredRequests = useMemo(() => requestList.filter((request) => statusFilter === 'All' || request.status === statusFilter), [requestList, statusFilter])

  function selectProvider(id) {
    const next = new URLSearchParams(searchParams)
    next.set('provider', id)
    setSearchParams(next)
    setActionMode('')
    setActionError('')
    setSuccessMessage('')
  }

  function clearProvider() {
    const next = new URLSearchParams(searchParams)
    next.delete('provider')
    setSearchParams(next)
    setActionMode('')
    setActionError('')
    setSuccessMessage('')
  }

  function openAction(mode) {
    setActionMode(mode)
    setAdminRemarks('')
    setRejectionReason('')
    setActionError('')
    setSuccessMessage('')
  }

  async function submitAction(event) {
    event.preventDefault()
    if (!selectedId || isSubmitting) return
    const reason = rejectionReason.trim()
    if (actionMode === 'reject' && (reason.length < 5 || reason.length > 300)) {
      setActionError('Rejection reason must be between 5 and 300 characters.')
      return
    }

    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (actionMode === 'approve') {
        await approveProvider(selectedId, adminRemarks.trim() || undefined)
        setSuccessMessage('Provider approved successfully.')
      } else {
        await rejectProvider(selectedId, { rejectionReason: reason, adminRemarks: adminRemarks.trim() || undefined })
        setSuccessMessage('Provider rejected successfully.')
      }
      setActionMode('')
      await Promise.all([requests.reload(), provider.reload()])
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update provider verification.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const details = provider.data
  const detailsLoading = Boolean(selectedId) && provider.isLoading
  const listError = requests.error

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Provider verification</h1>
        <div className="admin-verification-layout">
          <section className="admin-panel" aria-label="Verification requests">
            <h2>Requests</h2>
            <label className="admin-form">
              Status filter
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                {verificationStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </label>
            {requests.isLoading && <LoadingState message="Loading verification requests…" />}
            {!requests.isLoading && listError && <div className="admin-feedback admin-feedback--error"><ErrorState message={listError} /><button className="admin-button" onClick={requests.reload} type="button">Retry</button></div>}
            {!requests.isLoading && !listError && requestList.length === 0 && <EmptyState message="No verification requests are available." />}
            {!requests.isLoading && !listError && requestList.length > 0 && filteredRequests.length === 0 && <EmptyState message="No requests match this status." />}
            {!requests.isLoading && !listError && filteredRequests.length > 0 && <ul className="admin-verification-list">
              {filteredRequests.map((request, index) => (
                <li key={request.id ?? index}>
                  <button aria-current={String(request.id) === selectedId ? 'true' : undefined} className="admin-verification-select" onClick={() => selectProvider(String(request.id))} type="button">
                    <span><strong>{show(request.name)}</strong><small>{show(request.id)} · {show(request.email)}</small></span>
                    <StatusBadge tone={badgeTone(request.status)}>{show(request.status)}</StatusBadge>
                  </button>
                </li>
              ))}
            </ul>}
          </section>

          <section className="admin-panel" aria-label="Selected provider details">
            {!selectedId && <EmptyState message="Select a verification request to review provider details." />}
            {detailsLoading && <LoadingState message="Loading provider details…" />}
            {selectedId && !detailsLoading && provider.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={provider.error} /><button className="admin-button" onClick={provider.reload} type="button">Retry</button></div>}
            {selectedId && !detailsLoading && !provider.error && !details && <EmptyState message="Provider details are not available." />}
            {details && !detailsLoading && <>
              <div className="admin-verification-title"><div><h2>{show(details.name)}</h2><p className="admin-muted">{show(details.id)} · <StatusBadge tone={badgeTone(details.status)}>{show(details.status)}</StatusBadge></p></div><button className="admin-button admin-button--secondary" onClick={clearProvider} type="button">Clear selection</button></div>
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}
              {actionError && <ErrorState message={actionError} />}

              <h3>Provider details</h3>
              <dl className="admin-detail-grid">
                <div><dt>Category</dt><dd>{show(details.category)}</dd></div>
                <div><dt>Location</dt><dd>{show(details.location)}</dd></div>
                <div><dt>Email</dt><dd>{show(details.email)}</dd></div>
                <div><dt>Phone</dt><dd>{show(details.phone)}</dd></div>
                <div><dt>Experience</dt><dd>{details.experience === null || details.experience === undefined ? 'Not available' : `${details.experience} years`}</dd></div>
                <div><dt>Address</dt><dd>{show(details.address)}</dd></div>
                <div><dt>Submitted date</dt><dd>{show(details.submittedDate)}</dd></div>
                <div><dt>Rejection reason</dt><dd>{show(details.rejectionReason)}</dd></div>
                <div><dt>Admin remarks</dt><dd>{show(details.adminRemarks)}</dd></div>
              </dl>

              <h3>Documents</h3>
              {Array.isArray(details.documents) && details.documents.length > 0 ? <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Type</th><th>Name</th><th>Required</th><th>Status</th></tr></thead>
                <tbody>{details.documents.map((document, index) => <tr key={document.documentId ?? `${document.documentType}-${index}`}>
                  <td>{show(document.documentType)}</td><td>{show(document.documentName)}</td><td>{document.required === true ? 'Yes' : document.required === false ? 'No' : 'Not available'}</td><td>{show(document.documentStatus)}</td>
                </tr>)}</tbody>
              </table></div> : <EmptyState message="No documents are available." />}

              <h3>Status history</h3>
              {Array.isArray(details.statusHistory) && details.statusHistory.length > 0 ? <div className="admin-table-wrap"><table className="admin-table">
                <thead><tr><th>Status</th><th>Note</th><th>Updated by</th><th>Updated at</th></tr></thead>
                <tbody>{details.statusHistory.map((entry, index) => <tr key={`${entry.updatedAt || entry.status}-${index}`}>
                  <td>{show(entry.status)}</td><td>{show(entry.note)}</td><td>{show(entry.updatedBy)}</td><td>{show(entry.updatedAt)}</td>
                </tr>)}</tbody>
              </table></div> : <EmptyState message="No status history is available." />}

              <div className="admin-verification-actions">
                {!actionMode && <>
                  <button className="admin-button" disabled={isSubmitting} onClick={() => openAction('approve')} type="button">Approve provider</button>
                  <button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => openAction('reject')} type="button">Reject provider</button>
                </>}
                {actionMode && <form className="admin-form" onSubmit={submitAction}>
                  <h3>{actionMode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</h3>
                  {actionMode === 'reject' && <label>Rejection reason (required, 5–300 characters)<textarea maxLength={300} minLength={5} onChange={(event) => setRejectionReason(event.target.value)} required value={rejectionReason} /></label>}
                  <label>Admin remarks (optional)<textarea maxLength={500} onChange={(event) => setAdminRemarks(event.target.value)} value={adminRemarks} /></label>
                  <div className="admin-verification-actions">
                    <button className="admin-button" disabled={isSubmitting} type="submit">{isSubmitting ? 'Submitting…' : actionMode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</button>
                    <button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => setActionMode('')} type="button">Cancel</button>
                  </div>
                </form>}
              </div>
            </>}
          </section>
        </div>
      </section>
    </AdminAccessGate>
  )
}
