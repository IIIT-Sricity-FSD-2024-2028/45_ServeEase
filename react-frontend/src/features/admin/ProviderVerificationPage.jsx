import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import {
  approveProvider,
  approveProviderDocument,
  getVerificationRequest,
  listVerificationRequests,
  rejectProvider,
  rejectProviderDocument,
} from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const verificationStatuses = ['All', 'Pending', 'Verified', 'Rejected', 'Suspended']

function badgeTone(status) {
  return status === 'Verified' || status === 'Approved' ? 'ready' : 'neutral'
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function SummaryCard({ label, count, attention = false }) {
  return <article className={`admin-stat-card${attention ? ' admin-stat-card--attention' : ''}`}>
    <span>{label}<span>SE</span></span><strong>{count}</strong><p>{label === 'Total' ? 'Total providers' : `${label} providers`}</p>
  </article>
}

export default function ProviderVerificationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('provider')
  const [statusFilter, setStatusFilter] = useState('All')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [sortOrder, setSortOrder] = useState('latest')
  const [actionMode, setActionMode] = useState('')
  const [adminRemarks, setAdminRemarks] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [rejectingDocumentId, setRejectingDocumentId] = useState('')
  const [documentRejectionReason, setDocumentRejectionReason] = useState('')

  const requests = useAdminData(listVerificationRequests)
  const loadSelectedProvider = useCallback(() => selectedId ? getVerificationRequest(selectedId) : Promise.resolve(null), [selectedId])
  const provider = useAdminData(loadSelectedProvider)
  const requestList = useMemo(() => Array.isArray(requests.data) ? requests.data : [], [requests.data])
  const categories = useMemo(() => [...new Set(requestList.map((request) => request.category).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))), [requestList])
  const filteredRequests = useMemo(() => {
    const filtered = requestList.filter((request) => (statusFilter === 'All' || request.status === statusFilter)
      && (categoryFilter === 'All categories' || request.category === categoryFilter))
    return filtered.sort((left, right) => {
      if (sortOrder === 'name') return String(left.name || '').localeCompare(String(right.name || ''))
      const dateDiff = Date.parse(left.submittedDate || '') - Date.parse(right.submittedDate || '')
      return sortOrder === 'oldest' ? dateDiff : -dateDiff
    })
  }, [requestList, statusFilter, categoryFilter, sortOrder])

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

  async function reloadPageData() {
    await Promise.all([requests.reload(), provider.reload()])
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
      await reloadPageData()
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update provider verification.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function approveDocument(documentId) {
    if (!selectedId || isSubmitting) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await approveProviderDocument(selectedId, documentId)
      setSuccessMessage('Document approved successfully.')
      await reloadPageData()
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to approve document.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitDocumentRejection(event, documentId) {
    event.preventDefault()
    const reason = documentRejectionReason.trim()
    if (reason.length < 5 || reason.length > 300 || !selectedId || isSubmitting) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await rejectProviderDocument(selectedId, documentId, reason)
      setSuccessMessage('Document rejected successfully.')
      setRejectingDocumentId('')
      setDocumentRejectionReason('')
      await reloadPageData()
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to reject document.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const details = provider.data
  const detailsLoading = Boolean(selectedId) && provider.isLoading
  const pendingCount = requestList.filter((request) => request.status === 'Pending').length
  const verifiedCount = requestList.filter((request) => request.status === 'Verified').length
  const rejectedCount = requestList.filter((request) => request.status === 'Rejected').length
  const suspendedCount = requestList.filter((request) => request.status === 'Suspended').length

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader section="Provider Verification" title="Provider Verification" description="Review provider profiles, validate documents, and control onboarding status." />

        {requests.isLoading && <LoadingState message="Loading provider summary…" />}
        {!requests.isLoading && requests.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={requests.error} /><button className="admin-button" onClick={requests.reload} type="button">Retry</button></div>}
        {!requests.isLoading && !requests.error && <div className="admin-grid admin-verification-summary">
          <SummaryCard count={requestList.length} label="Total" />
          <SummaryCard attention count={pendingCount} label="Pending" />
          <SummaryCard count={verifiedCount} label="Verified" />
          <SummaryCard attention count={rejectedCount} label="Rejected" />
          <SummaryCard attention count={suspendedCount} label="Suspended" />
        </div>}

        <section className="admin-panel">
          <div className="admin-filter-grid">
            <label className="admin-form">Status
              <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                {verificationStatuses.map((status) => <option key={status} value={status}>{status === 'All' ? 'All statuses' : status}</option>)}
              </select>
            </label>
            <label className="admin-form">Category
              <select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}>
                <option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}
              </select>
            </label>
            <label className="admin-form">Sort
              <select onChange={(event) => setSortOrder(event.target.value)} value={sortOrder}>
                <option value="latest">Latest first</option><option value="oldest">Oldest first</option><option value="name">Name A to Z</option>
              </select>
            </label>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Verification Requests ({requests.data && !requests.error ? filteredRequests.length : 'Not available'})</h2><button className="admin-button admin-button--secondary" disabled={requests.isLoading} onClick={requests.reload} type="button">Refresh</button></div>
          {requests.isLoading && <LoadingState message="Loading verification requests…" />}
          {!requests.isLoading && requests.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={requests.error} /><button className="admin-button" onClick={requests.reload} type="button">Retry</button></div>}
          {!requests.isLoading && !requests.error && requestList.length === 0 && <EmptyState message="No verification requests are available." />}
          {!requests.isLoading && !requests.error && requestList.length > 0 && filteredRequests.length === 0 && <EmptyState message="No requests match the selected filters." />}
          {!requests.isLoading && !requests.error && filteredRequests.length > 0 && <div className="admin-table-wrap"><table className="admin-table admin-verification-table">
            <thead><tr><th>Provider ID</th><th>Name</th><th>Organisation</th><th>Email</th><th>Phone Number</th><th>Service Category</th><th>Experience</th><th>Location</th><th>Submitted Date</th><th>Status</th><th>Review</th></tr></thead>
            <tbody>{filteredRequests.map((request, index) => <tr key={request.id ?? `${request.name || 'provider'}-${index}`}>
              <td><strong>{show(request.id)}</strong></td><td>{show(request.name)}</td><td>{show(request.organisationName)}</td><td>{show(request.email)}</td><td>{show(request.phone)}</td><td>{show(request.category)}</td>
              <td>{request.experience === null || request.experience === undefined ? 'Not available' : `${request.experience} years`}</td><td>{show(request.location)}</td><td>{formatDate(request.submittedDate)}</td>
              <td><StatusBadge tone={badgeTone(request.status)}>{show(request.status)}</StatusBadge></td>
              <td><button aria-current={String(request.id) === selectedId ? 'true' : undefined} className="admin-button admin-button--secondary admin-button--small" onClick={() => selectProvider(String(request.id))} type="button">Review</button></td>
            </tr>)}</tbody>
          </table></div>}
        </section>

        <section className="admin-panel" aria-label="Selected provider details">
          <div className="admin-panel-heading"><h2>Provider Review</h2>{selectedId && <button className="admin-button admin-button--secondary" onClick={clearProvider} type="button">Clear selection</button>}</div>
          {!selectedId && <EmptyState message="Select a verification request to review provider details and documents." />}
          {detailsLoading && <LoadingState message="Loading provider details…" />}
          {selectedId && !detailsLoading && provider.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={provider.error} /><button className="admin-button" onClick={provider.reload} type="button">Retry</button></div>}
          {selectedId && !detailsLoading && !provider.error && !details && <EmptyState message="Provider details are not available." />}
          {details && !detailsLoading && <>
            <div className="admin-verification-title"><div><h3>{show(details.name)}</h3><p className="admin-muted">{show(details.id)} · <StatusBadge tone={badgeTone(details.status)}>{show(details.status)}</StatusBadge></p></div></div>
            {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}
            {actionError && <ErrorState message={actionError} />}

            <h3>Provider details</h3>
            <dl className="admin-detail-grid">
              <div><dt>Category</dt><dd>{show(details.category)}</dd></div><div><dt>Location</dt><dd>{show(details.location)}</dd></div>
              <div><dt>Email</dt><dd>{show(details.email)}</dd></div><div><dt>Phone</dt><dd>{show(details.phone)}</dd></div>
              <div><dt>Experience</dt><dd>{details.experience === null || details.experience === undefined ? 'Not available' : `${details.experience} years`}</dd></div>
              <div><dt>Address</dt><dd>{show(details.address)}</dd></div><div><dt>Submitted date</dt><dd>{formatDate(details.submittedDate)}</dd></div>
              <div><dt>Rejection reason</dt><dd>{show(details.rejectionReason)}</dd></div><div><dt>Admin remarks</dt><dd>{show(details.adminRemarks)}</dd></div>
            </dl>

            <h3>Documents</h3>
            {Array.isArray(details.documents) && details.documents.length > 0 ? <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Type</th><th>Name</th><th>Required</th><th>Status</th><th>Rejection reason</th><th>Review action</th></tr></thead>
              <tbody>{details.documents.map((document, index) => <tr key={document.documentId ?? `${document.documentType}-${index}`}>
                <td>{show(document.documentType)}</td><td>{show(document.documentName)}</td><td>{document.required === true ? 'Yes' : document.required === false ? 'No' : 'Not available'}</td>
                <td><StatusBadge tone={badgeTone(document.documentStatus)}>{show(document.documentStatus)}</StatusBadge></td><td>{show(document.rejectionReason)}</td>
                <td>{document.documentStatus === 'Approved' ? 'Reviewed' : <div className="admin-document-actions">
                  <button className="admin-button admin-button--small" disabled={isSubmitting} onClick={() => approveDocument(document.documentId)} type="button">Approve</button>
                  {rejectingDocumentId === document.documentId ? <form className="admin-form" onSubmit={(event) => submitDocumentRejection(event, document.documentId)}>
                    <label>Reason (5–300 characters)<textarea maxLength={300} minLength={5} onChange={(event) => setDocumentRejectionReason(event.target.value)} required value={documentRejectionReason} /></label>
                    <button className="admin-button admin-button--small" disabled={isSubmitting || documentRejectionReason.trim().length < 5} type="submit">{isSubmitting ? 'Submitting…' : 'Confirm rejection'}</button>
                    <button className="admin-button admin-button--secondary admin-button--small" disabled={isSubmitting} onClick={() => setRejectingDocumentId('')} type="button">Cancel</button>
                  </form> : <button className="admin-button admin-button--secondary admin-button--small" disabled={isSubmitting} onClick={() => { setRejectingDocumentId(document.documentId); setDocumentRejectionReason('') }} type="button">Reject</button>}
                </div>}</td>
              </tr>)}</tbody>
            </table></div> : <EmptyState message="No documents are available." />}

            <h3>Status history</h3>
            {Array.isArray(details.statusHistory) && details.statusHistory.length > 0 ? <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Status</th><th>Note</th><th>Updated by</th><th>Updated at</th></tr></thead>
              <tbody>{details.statusHistory.map((entry, index) => <tr key={`${entry.updatedAt || entry.status}-${index}`}>
                <td>{show(entry.status)}</td><td>{show(entry.note)}</td><td>{show(entry.updatedBy)}</td><td>{formatDate(entry.updatedAt)}</td>
              </tr>)}</tbody>
            </table></div> : <EmptyState message="No status history is available." />}

            <div className="admin-verification-actions">
              {!actionMode && <>
                <button className="admin-button" disabled={isSubmitting || details.status === 'Verified'} onClick={() => openAction('approve')} type="button">Approve provider</button>
                <button className="admin-button admin-button--secondary" disabled={isSubmitting || details.status === 'Rejected'} onClick={() => openAction('reject')} type="button">Reject provider</button>
              </>}
              {actionMode && <form className="admin-form" onSubmit={submitAction}>
                <h3>{actionMode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</h3>
                {actionMode === 'reject' && <label>Rejection reason (required, 5–300 characters)<textarea maxLength={300} minLength={5} onChange={(event) => setRejectionReason(event.target.value)} required value={rejectionReason} /></label>}
                <label>Admin remarks (optional)<textarea maxLength={500} onChange={(event) => setAdminRemarks(event.target.value)} value={adminRemarks} /></label>
                <div className="admin-verification-actions">
                  <button className="admin-button" disabled={isSubmitting || (actionMode === 'reject' && rejectionReason.trim().length < 5)} type="submit">{isSubmitting ? 'Submitting…' : actionMode === 'approve' ? 'Confirm approval' : 'Confirm rejection'}</button>
                  <button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => setActionMode('')} type="button">Cancel</button>
                </div>
              </form>}
            </div>
          </>}
        </section>
      </section>
    </AdminAccessGate>
  )
}
