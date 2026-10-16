import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import {
  approveProvider,
  approveProviderDocument,
  getProviderDocumentPreview,
  getVerificationRequest,
  listVerificationRequests,
  rejectProvider,
  rejectProviderDocument,
  suspendProvider,
} from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const verificationStatuses = ['All', 'Pending', 'Verified', 'Rejected', 'Suspended']
const documentNames = ['ID Proof', 'Address Proof', 'Skill Certificate', 'Experience Proof', 'Profile Photo']

function badgeTone(status) {
  return ['Verified', 'Approved', 'Active'].includes(status) ? 'ready' : status === 'Rejected' ? 'danger' : 'neutral'
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function SummaryCard({ label, count, attention = false }) {
  return <article className={`admin-stat-card${attention ? ' admin-stat-card--attention' : ''}`}>
    <span>{label}<span>SE</span></span><strong>{count}</strong><p>{label === 'Total' ? 'Total Providers' : `${label} Providers`}</p>
  </article>
}

function isImageType(type = '') {
  return type.startsWith('image/')
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
  const [previewDocument, setPreviewDocument] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewType, setPreviewType] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const scrollToDocuments = useRef(false)

  const requests = useAdminData(listVerificationRequests)
  const loadSelectedProvider = useCallback(() => selectedId ? getVerificationRequest(selectedId) : Promise.resolve(null), [selectedId])
  const provider = useAdminData(loadSelectedProvider)
  const requestList = useMemo(() => Array.isArray(requests.data) ? requests.data : [], [requests.data])
  const categories = useMemo(() => [...new Set(requestList.map((request) => request.category).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b))), [requestList])
  const filteredRequests = useMemo(() => requestList.filter((request) => (statusFilter === 'All' || request.status === statusFilter)
    && (categoryFilter === 'All categories' || request.category === categoryFilter))
    .sort((left, right) => {
      if (sortOrder === 'name') return String(left.name || '').localeCompare(String(right.name || ''))
      const dateDiff = Date.parse(left.submittedDate || '') - Date.parse(right.submittedDate || '')
      return sortOrder === 'oldest' ? dateDiff : -dateDiff
    }), [requestList, statusFilter, categoryFilter, sortOrder])

  function selectProvider(id) {
    const next = new URLSearchParams(searchParams)
    next.set('provider', id)
    setSearchParams(next)
    setActionMode('')
    setActionError('')
    setSuccessMessage('')
  }

  function selectProviderDocuments(id) {
    scrollToDocuments.current = true
    selectProvider(id)
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
    if (['reject', 'suspend'].includes(actionMode) && (reason.length < 5 || reason.length > 300)) {
      setActionError('Reason must be between 5 and 300 characters.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (actionMode === 'approve') {
        await approveProvider(selectedId, adminRemarks.trim() || undefined)
        setSuccessMessage('Provider approved successfully.')
      } else if (actionMode === 'reject') {
        await rejectProvider(selectedId, { rejectionReason: reason, adminRemarks: adminRemarks.trim() || undefined })
        setSuccessMessage('Provider rejected successfully.')
      } else if (actionMode === 'suspend') {
        await suspendProvider(selectedId, adminRemarks.trim() || reason)
        setSuccessMessage('Provider suspended successfully.')
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

  async function rejectDocument(documentId, reason) {
    if (!selectedId || isSubmitting) return
    const normalizedReason = reason.trim()
    if (normalizedReason.length < 5 || normalizedReason.length > 300) {
      setActionError('Document rejection reason must be between 5 and 300 characters.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await rejectProviderDocument(selectedId, documentId, normalizedReason)
      setSuccessMessage('Document rejected successfully.')
      await reloadPageData()
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to reject document.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function openDocumentPreview(document) {
    setPreviewDocument(document)
    setPreviewUrl('')
    setPreviewType('')
    setPreviewError('')
    setPreviewLoading(true)
    try {
      const blob = await getProviderDocumentPreview(selectedId, document.documentId)
      setPreviewUrl(URL.createObjectURL(blob))
      setPreviewType(blob.type || '')
    } catch (requestError) {
      // Some older records only have a browser or static-file URL. Keep that preview path usable.
      if (document.documentUrl) {
        setPreviewUrl(document.documentUrl)
        setPreviewType(document.documentUrl.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/*')
      } else {
        setPreviewError(requestError?.message || 'No preview is available for this document.')
      }
    } finally {
      setPreviewLoading(false)
    }
  }

  useEffect(() => () => {
    if (previewUrl.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    if (!scrollToDocuments.current || provider.isLoading || !provider.data) return
    const content = document.querySelector('.admin-verification-modal-content')
    const documents = content?.querySelector('.admin-provider-document-list')
    if (content && documents) content.scrollTo({ top: documents.offsetTop - content.offsetTop, behavior: 'smooth' })
    scrollToDocuments.current = false
  }, [provider.data, provider.isLoading])

  const details = provider.data
  const detailsLoading = Boolean(selectedId) && provider.isLoading
  const pendingCount = requestList.filter((request) => request.status === 'Pending').length
  const verifiedCount = requestList.filter((request) => request.status === 'Verified').length
  const rejectedCount = requestList.filter((request) => request.status === 'Rejected').length
  const suspendedCount = requestList.filter((request) => request.status === 'Suspended').length
  const requiredDocsApproved = Array.isArray(details?.documents) && details.documents.some((doc) => doc.required)
    && details.documents.filter((doc) => doc.required).every((doc) => doc.documentStatus === 'Approved')

  return <AdminAccessGate>
    <section className="admin-page admin-provider-verification">
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

      <section className="admin-panel admin-verification-filters">
        <div className="admin-filter-grid">
          <label className="admin-form">Status<select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>{verificationStatuses.map((status) => <option key={status} value={status}>{status === 'All' ? 'All Status' : status}</option>)}</select></label>
          <label className="admin-form">Category<select onChange={(event) => setCategoryFilter(event.target.value)} value={categoryFilter}><option>All categories</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="admin-form">Sort<select onChange={(event) => setSortOrder(event.target.value)} value={sortOrder}><option value="latest">Latest First</option><option value="oldest">Oldest First</option><option value="name">Name A to Z</option></select></label>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-heading"><h2>Verification Requests ({requests.data && !requests.error ? filteredRequests.length : 'Not available'})</h2><button className="admin-button admin-button--secondary" disabled={requests.isLoading} onClick={requests.reload} type="button">Refresh</button></div>
        {requests.isLoading && <LoadingState message="Loading verification requests…" />}
        {!requests.isLoading && requests.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={requests.error} /><button className="admin-button" onClick={requests.reload} type="button">Retry</button></div>}
        {!requests.isLoading && !requests.error && requestList.length === 0 && <EmptyState message="No verification requests are available." />}
        {!requests.isLoading && !requests.error && requestList.length > 0 && filteredRequests.length === 0 && <EmptyState message="No requests match the selected filters." />}
        {!requests.isLoading && !requests.error && filteredRequests.length > 0 && <div className="admin-table-wrap"><table className="admin-table admin-verification-table">
          <thead><tr><th>Provider ID</th><th>Name</th><th>Organisation</th><th>Email</th><th>Phone Number</th><th>Service Category</th><th>Experience</th><th>Location</th><th>Submitted Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>{filteredRequests.map((request, index) => <tr key={request.id ?? `${request.name || 'provider'}-${index}`}>
            <td><strong>{show(request.id)}</strong></td><td>{show(request.name)}</td><td>{show(request.organisationName)}</td><td>{show(request.email)}</td><td>{show(request.phone)}</td><td>{show(request.category)}</td>
            <td>{request.experience === null || request.experience === undefined ? 'Not available' : `${request.experience} years`}</td><td>{show(request.location)}</td><td>{formatDate(request.submittedDate)}</td>
            <td><StatusBadge tone={badgeTone(request.status)}>{show(request.status)}</StatusBadge></td>
            <td><div className="admin-provider-row-actions">
              <button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectProvider(String(request.id))} type="button">View</button>
              <button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectProviderDocuments(String(request.id))} type="button">Documents</button>
              <button className="admin-button admin-button--small admin-provider-approve" disabled={isSubmitting || request.status === 'Verified'} onClick={() => { selectProvider(String(request.id)); openAction('approve') }} type="button">Approve</button>
              <button className="admin-button admin-button--small admin-provider-reject" disabled={isSubmitting} onClick={() => { selectProvider(String(request.id)); openAction('reject') }} type="button">Reject</button>
              <button className="admin-button admin-button--small admin-provider-suspend" disabled={isSubmitting || request.status === 'Suspended'} onClick={() => { selectProvider(String(request.id)); openAction('suspend') }} type="button">Suspend</button>
            </div></td>
          </tr>)}</tbody>
        </table></div>}
      </section>

      {selectedId && <div className="admin-modal-backdrop admin-verification-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) clearProvider() }}>
        <section aria-labelledby="provider-verification-modal-title" aria-modal="true" className="admin-document-modal admin-verification-modal" role="dialog">
          {detailsLoading && <LoadingState message="Loading provider details…" />}
          {!detailsLoading && provider.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={provider.error} /><button className="admin-button" onClick={provider.reload} type="button">Retry</button></div>}
          {!detailsLoading && !provider.error && !details && <EmptyState message="Provider details are not available." />}
          {details && !detailsLoading && <>
            <header className="admin-verification-modal-header"><div><h2 id="provider-verification-modal-title">{show(details.name)}</h2><p>{show(details.id)} - {show(details.status)}</p></div><button aria-label="Close provider details" className="admin-notification-close" disabled={isSubmitting} onClick={clearProvider} type="button">×</button></header>
            <div className="admin-verification-modal-content">
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}{actionError && <ErrorState message={actionError} />}
              {actionMode ? <form className="admin-form admin-verification-action-form" onSubmit={submitAction}>
                <h3>{actionMode === 'approve' ? 'Approve Provider' : actionMode === 'reject' ? 'Reject Provider' : 'Suspend Provider'}</h3>
                {actionMode === 'reject' && <label>Rejection reason (required, 5–300 characters)<textarea maxLength={300} minLength={5} onChange={(event) => setRejectionReason(event.target.value)} required value={rejectionReason} /></label>}
                {actionMode === 'suspend' && <label>Reason for suspension (required, 5–300 characters)<textarea maxLength={300} minLength={5} onChange={(event) => setRejectionReason(event.target.value)} required value={rejectionReason} /></label>}
                <label>Admin remarks (optional)<textarea maxLength={500} onChange={(event) => setAdminRemarks(event.target.value)} value={adminRemarks} /></label>
                <div className="admin-verification-actions"><button className="admin-button" disabled={isSubmitting || (actionMode === 'approve' && !requiredDocsApproved) || (['reject', 'suspend'].includes(actionMode) && rejectionReason.trim().length < 5)} title={actionMode === 'approve' && !requiredDocsApproved ? 'Approve all required documents first' : undefined} type="submit">{isSubmitting ? 'Submitting…' : 'Confirm'}</button><button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => setActionMode('')} type="button">Cancel</button></div>
              </form> : <>
                <div className="admin-verification-facts">
                  <div><span>Category</span><strong>{show(details.category)}</strong></div><div><span>Location</span><strong>{show(details.location)}</strong></div><div><span>Email</span><strong>{show(details.email)}</strong></div><div><span>Phone</span><strong>{show(details.phone)}</strong></div>
                  <div><span>Experience</span><strong>{details.experience == null ? 'Not available' : `${details.experience} years`}</strong></div><div><span>Address</span><strong>{show(details.address)}</strong></div><div><span>Joined Date</span><strong>{formatDate(details.joinedDate || details.submittedDate)}</strong></div><div><span>Skills</span><strong>{Array.isArray(details.skills) && details.skills.length ? details.skills.join(', ') : 'N/A'}</strong></div>
                  <div><span>Certifications</span><strong>{Array.isArray(details.certifications) && details.certifications.length ? details.certifications.join(', ') : 'N/A'}</strong></div><div><span>Completed Jobs</span><strong>{details.completedJobs ?? 'N/A'}</strong></div><div><span>Rating</span><strong>{details.rating ?? 'N/A'}</strong></div>
                </div>
                <h3>Verification Documents</h3>
                {Array.isArray(details.documents) && details.documents.length ? <div className="admin-provider-document-list">{details.documents.filter((doc) => documentNames.some((name) => String(doc.documentType || '').toLowerCase().startsWith(name.toLowerCase()))).map((document, index) => <ProviderDocumentCard key={document.documentId || `${document.documentType}-${index}`} document={document} isSubmitting={isSubmitting} onPreview={openDocumentPreview} onApprove={approveDocument} onReject={rejectDocument} />)}</div> : <EmptyState message="No documents uploaded." />}
                <h3>Status History</h3>
                {Array.isArray(details.statusHistory) && details.statusHistory.length ? <div className="admin-provider-history">{details.statusHistory.map((entry, index) => <article key={`${entry.updatedAt || entry.status}-${index}`}><StatusBadge tone={badgeTone(entry.status)}>{show(entry.status)}</StatusBadge><div><strong>{show(entry.note)}</strong><p>{show(entry.updatedBy)} - {formatDate(entry.updatedAt)}</p></div></article>)}</div> : <EmptyState message="No status history available." />}
                <h3>Admin Remarks</h3><p className="admin-provider-remarks">{show(details.adminRemarks || details.rejectionReason || 'No remarks added yet.')}</p>
              </>}
            </div>
            {!actionMode && <footer className="admin-verification-modal-actions">
              <button className="admin-button admin-provider-approve" disabled={isSubmitting || details.status === 'Verified' || !requiredDocsApproved} onClick={() => openAction('approve')} title={!requiredDocsApproved ? 'Approve all required documents first' : ''} type="button">Approve Provider</button>
              <button className="admin-button admin-provider-reject" disabled={isSubmitting} onClick={() => openAction('reject')} type="button">Reject Provider</button>
              <button className="admin-button admin-provider-suspend" disabled={isSubmitting || details.status === 'Suspended'} onClick={() => openAction('suspend')} type="button">Suspend Provider</button>
              <button className="admin-button admin-button--secondary admin-button--full" disabled={isSubmitting} onClick={clearProvider} type="button">Close</button>
            </footer>}
          </>}
        </section>
      </div>}

      {previewDocument && <div className="admin-modal-backdrop admin-verification-preview-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreviewDocument(null) }}>
        <section aria-labelledby="verification-document-preview-title" aria-modal="true" className="admin-document-modal admin-verification-preview" role="dialog">
          <div className="admin-panel-heading"><div><h2 id="verification-document-preview-title">{show(previewDocument.documentType)}</h2><p className="admin-muted">{show(previewDocument.documentName)}</p></div><button aria-label="Close document preview" className="admin-button admin-button--secondary" onClick={() => setPreviewDocument(null)} type="button">Close</button></div>
          {previewLoading && <LoadingState message="Loading document preview…" />}{previewError && <ErrorState message={previewError} />}
          {!previewLoading && previewUrl && (isImageType(previewType) ? <img alt={show(previewDocument.documentType)} className="admin-document-preview-image" src={previewUrl} /> : <iframe className="admin-document-preview-frame" title={`${show(previewDocument.documentType)} preview`} src={previewUrl} />)}
        </section>
      </div>}
    </section>
  </AdminAccessGate>
}

function ProviderDocumentCard({ document, isSubmitting, onPreview, onApprove, onReject }) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState('')
  return <article className="admin-provider-document-card">
    <div className="admin-provider-document-info"><h4>{show(document.documentType)} {document.required && <span className="admin-provider-required">Required</span>}</h4><p>{show(document.documentName)}</p><StatusBadge tone={badgeTone(document.documentStatus)}>{show(document.documentStatus)}</StatusBadge>{document.rejectionReason && <small>Reason: {show(document.rejectionReason)}</small>}</div>
    <div className="admin-provider-document-controls">
      <button className="admin-button admin-button--secondary admin-button--small" disabled={isSubmitting} onClick={() => onPreview(document)} type="button">Preview</button>
      <button className="admin-button admin-provider-approve admin-button--small" disabled={isSubmitting || document.documentStatus === 'Approved'} onClick={() => onApprove(document.documentId)} type="button">Approve</button>
      {rejecting ? <form className="admin-provider-document-reject" onSubmit={(event) => { event.preventDefault(); onReject(document.documentId, reason); setRejecting(false) }}><label className="admin-sr-only" htmlFor={`reject-${document.documentId}`}>Rejection reason</label><input id={`reject-${document.documentId}`} maxLength={300} minLength={5} onChange={(event) => setReason(event.target.value)} placeholder="Reason for rejection" required value={reason} /><button className="admin-button admin-provider-reject admin-button--small" disabled={isSubmitting || reason.trim().length < 5} type="submit">Confirm</button><button className="admin-button admin-button--secondary admin-button--small" onClick={() => setRejecting(false)} type="button">Cancel</button></form> : <button className="admin-button admin-provider-reject admin-button--small" disabled={isSubmitting || document.documentStatus === 'Rejected'} onClick={() => setRejecting(true)} type="button">Reject</button>}
    </div>
  </article>
}
