import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminChip } from './AdminChip'
import { AdminNotifications } from './AdminNotifications'
import { AdminPageHeader } from './AdminPageHeader'
import {
  decideProviderAccountVerification,
  getProviderAccount,
  getProviderDocumentPreview,
  listProviderAccounts,
  updateProviderAccountStatus,
} from './adminApi'
import { matchesAdminSearch, useAdminSearch } from './adminSearch'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const statusOptions = ['All Verification States', 'Active', 'Suspended', 'Under Verification', 'Verification Rejected', 'Pending', 'Verified', 'Rejected']

function matchesStatus(record, fields, filter) {
  return filter === 'All statuses' || filter === 'All Verification States' || fields.some((field) => String(record?.[field] || '').toLocaleLowerCase() === filter.toLocaleLowerCase())
}

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

export default function ProviderOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('account')
  const selectedListing = searchParams.get('listing')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All Verification States')
  const [actionMode, setActionMode] = useState('')
  const [actionReason, setActionReason] = useState('')
  const [actionRemarks, setActionRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [documentPreview, setDocumentPreview] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [previewLoadingId, setPreviewLoadingId] = useState('')

  const accounts = useAdminData(listProviderAccounts)
  const topbarSearch = useAdminSearch('/admin/providers')
  const loadSelectedProvider = useCallback(() => selectedId ? getProviderAccount(selectedId, selectedListing) : Promise.resolve(null), [selectedId, selectedListing])
  const providerDetail = useAdminData(loadSelectedProvider)
  // superuser.js refreshManagementTables(): the topbar search and the table search both narrow the list.
  const searchTerm = [topbarSearch, query].filter((value) => value.trim()).join(' ')
  const providerRecords = Array.isArray(accounts.data?.providers) ? accounts.data.providers : []
  const visibleAccounts = providerRecords.filter((provider) => matchesAdminSearch(
    ['id', 'fullName', 'organisationName', 'email', 'phone', 'serviceType', 'location', 'accountStatus', 'verificationStatus'].map((field) => provider?.[field]), searchTerm)
    && matchesStatus(provider, ['accountStatus', 'verificationStatus'], statusFilter))
  const details = providerDetail.data
  const provider = details?.provider
  const detailDocuments = Array.isArray(details?.documents) ? details.documents : []
  const detailServices = Array.isArray(details?.services) ? details.services : []
  const detailBookings = Array.isArray(details?.bookings) ? details.bookings : []
  const detailTickets = Array.isArray(details?.tickets) ? details.tickets : []

  useEffect(() => {
    if (!documentPreview?.url) return undefined
    return () => URL.revokeObjectURL(documentPreview.url)
  }, [documentPreview])

  function selectProvider(record) {
    const next = new URLSearchParams(searchParams)
    next.set('account', String(record.id))
    if (record.providerCatalogId) next.set('listing', String(record.providerCatalogId))
    else next.delete('listing')
    setSearchParams(next)
    setActionMode('')
    setActionError('')
    setSuccessMessage('')
  }

  function clearProvider() {
    const next = new URLSearchParams(searchParams)
    next.delete('account')
    next.delete('listing')
    setSearchParams(next)
    setActionMode('')
    setActionError('')
    setSuccessMessage('')
  }

  function openAction(mode) {
    setActionMode(mode)
    setActionReason('')
    setActionRemarks('')
    setActionError('')
  }

  async function submitAccountAction(event) {
    event.preventDefault()
    if (!selectedId || !provider || isSubmitting) return
    const reason = actionReason.trim()
    const requiresReason = actionMode !== 'approve'
    if (requiresReason && (reason.length < (actionMode === 'reject' ? 5 : 1) || reason.length > (actionMode === 'reject' ? 300 : 500))) {
      setActionError(actionMode === 'reject' ? 'Rejection reason must be between 5 and 300 characters.' : 'A reason is required before changing provider status.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      if (actionMode === 'approve' || actionMode === 'reject') {
        await decideProviderAccountVerification(selectedId, {
          decision: actionMode,
          ...(actionMode === 'reject' ? { reason } : {}),
          remarks: actionRemarks.trim() || undefined,
          listing: selectedListing || undefined,
        })
        setSuccessMessage(`Provider verification ${actionMode === 'approve' ? 'approved' : 'rejected'} successfully.`)
      } else {
        const status = actionMode === 'suspend' ? 'Suspended' : 'Active'
        await updateProviderAccountStatus(selectedId, { status, reason, remarks: actionRemarks.trim() || undefined, listing: selectedListing || undefined })
        setSuccessMessage(`Provider ${actionMode === 'suspend' ? 'suspended' : 'activated'} successfully.`)
      }
      setActionMode('')
      await Promise.all([accounts.reload(), providerDetail.reload()])
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update provider account.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function previewDocument(document) {
    if (!selectedId || !document.documentId || previewLoadingId) return
    setPreviewLoadingId(document.documentId)
    setPreviewError('')
    try {
      const blob = await getProviderDocumentPreview(selectedId, document.documentId, selectedListing || undefined)
      setDocumentPreview({ url: URL.createObjectURL(blob), name: document.documentName || document.documentType || 'Provider document', type: blob.type })
    } catch (requestError) {
      setPreviewError(requestError?.message || 'Unable to preview provider document.')
    } finally {
      setPreviewLoadingId('')
    }
  }

  return (
    <AdminAccessGate>
      <section className="admin-page admin-user-management">
        <AdminPageHeader section="User Management" title="User Management" description="Manage registered customers and service providers across the platform." />
        <div aria-label="User management pages" className="admin-tabs">
          <Link className="admin-tab" to="/admin/customers">Customers</Link>
          <Link aria-current="page" className="admin-tab admin-tab--active" to="/admin/providers">Providers</Link>
        </div>
        <div className="admin-operations-layout admin-user-management-layout">
        <section className="admin-panel admin-panel--compact">
          <div className="admin-panel-heading"><h2>Providers ({accounts.data ? visibleAccounts.length : 'Not available'})</h2>
            <div className="admin-operations-filters">
              <label className="admin-sr-only" htmlFor="admin-provider-search">Search providers</label>
              <input className="admin-control" id="admin-provider-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search providers" type="search" value={query} />
              <label className="admin-sr-only" htmlFor="admin-provider-status">Filter provider status</label>
              <select className="admin-control" id="admin-provider-status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                {statusOptions.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          </div>
          {accounts.isLoading && <LoadingState message="Loading provider accounts…" />}
          {!accounts.isLoading && accounts.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={accounts.error} /><button className="admin-button" onClick={accounts.reload} type="button">Retry</button></div>}
          {!accounts.isLoading && !accounts.error && providerRecords.length === 0 && <EmptyState message="No provider accounts are available." />}
          {!accounts.isLoading && !accounts.error && providerRecords.length > 0 && visibleAccounts.length === 0 && <EmptyState message="No provider accounts match the current search and status." />}
          {!accounts.isLoading && !accounts.error && visibleAccounts.length > 0 && <div className="admin-table-wrap admin-user-table-wrap admin-user-table-wrap--ten-rows"><table className="admin-table admin-user-table">
            <thead><tr><th>Provider ID</th><th>Name</th><th>Organisation</th><th>Email</th><th>Phone</th><th>Category</th><th>Account Status</th><th>Action</th></tr></thead>
            <tbody>{visibleAccounts.map((record, index) => <tr key={`${record.id}-${record.providerCatalogId || index}`}>
              <td>{show(record.id)}</td><td>{show(record.fullName)}</td><td>{show(record.organisationName)}</td><td>{show(record.email)}</td><td>{show(record.phone)}</td>
              <td>{show(record.serviceType)}</td><td><AdminChip>{show(record.accountStatus)}</AdminChip></td>
              <td><div className="admin-inline-actions"><button className="admin-inline-action" onClick={() => selectProvider(record)} type="button">◉ View</button>
              </div></td>
            </tr>)}</tbody>
          </table></div>}
        </section>

        <AdminNotifications />
        </div>
        <div className="admin-user-return"><Link className="admin-button admin-button--secondary" to="/admin">‹ Return to Dashboard</Link></div>

        {selectedId && <div className="admin-modal-backdrop admin-user-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) clearProvider() }}>
        <section aria-label="Provider account details" aria-modal="true" className="admin-user-modal admin-user-modal--provider" onClick={(event) => event.stopPropagation()} role="dialog">
          <header className="admin-user-modal-header"><div><h2>{show(provider?.fullName || 'Provider Details')}</h2><p>Provider Details</p></div><button aria-label="Close provider details" className="admin-notification-close" onClick={clearProvider} type="button">×</button></header>
          <div className="admin-user-modal-content">
          {providerDetail.isLoading && <LoadingState message="Loading provider details…" />}
          {selectedId && !providerDetail.isLoading && providerDetail.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={providerDetail.error} /><button className="admin-button" onClick={providerDetail.reload} type="button">Retry</button></div>}
          {selectedId && !providerDetail.isLoading && !providerDetail.error && !provider && <EmptyState message="Provider details are not available." />}
          {provider && !providerDetail.isLoading && <>
            {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}{actionError && <ErrorState message={actionError} />}
            <h3>{show(provider.fullName)} · {show(provider.id)}</h3>
            <dl className="admin-detail-grid">
              <div><dt>Organisation</dt><dd>{show(provider.organisationName)}</dd></div><div><dt>Email</dt><dd>{show(provider.email)}</dd></div>
              <div><dt>Phone</dt><dd>{show(provider.phone)}</dd></div><div><dt>Service category</dt><dd>{show(provider.serviceType)}</dd></div>
              <div><dt>Experience</dt><dd>{provider.experience == null ? 'Not available' : `${provider.experience} years`}</dd></div>
              <div><dt>Location</dt><dd>{show(provider.location)}</dd></div><div><dt>Registration date</dt><dd>{formatDate(provider.registrationDate)}</dd></div>
              <div><dt>Account status</dt><dd>{show(provider.accountStatus)}</dd></div><div><dt>Verification status</dt><dd>{provider.verificationRecorded ? show(provider.verificationStatus) : 'Not available'}</dd></div>
              <div><dt>Rejection reason</dt><dd>{show(provider.rejectionReason)}</dd></div><div><dt>Suspension reason</dt><dd>{show(provider.suspensionReason)}</dd></div><div><dt>Admin remarks</dt><dd>{show(provider.adminRemarks)}</dd></div>
            </dl>

            <div className="admin-verification-actions">
              {!actionMode && <>
                {provider.accountStatus === 'Under Verification' && <><button className="admin-button" onClick={() => openAction('approve')} type="button">Approve provider</button><button className="admin-button admin-button--secondary" onClick={() => openAction('reject')} type="button">Reject provider</button></>}
                {provider.accountStatus === 'Active' && <button className="admin-button admin-button--secondary" onClick={() => openAction('suspend')} type="button">Suspend provider</button>}
                {provider.accountStatus === 'Suspended' && <button className="admin-button" onClick={() => openAction('activate')} type="button">Activate provider</button>}
              </>}
              {actionMode && <form className="admin-form" onSubmit={submitAccountAction}>
                <h3>Confirm {actionMode === 'approve' ? 'verification approval' : actionMode === 'reject' ? 'verification rejection' : actionMode === 'suspend' ? 'provider suspension' : 'provider activation'}</h3>
                {actionMode !== 'approve' && <label>{actionMode === 'reject' ? 'Rejection reason' : 'Reason'}<textarea maxLength={actionMode === 'reject' ? 300 : 500} minLength={actionMode === 'reject' ? 5 : 1} onChange={(event) => setActionReason(event.target.value)} required value={actionReason} /></label>}
                <label>Admin remarks (optional)<textarea maxLength={1000} onChange={(event) => setActionRemarks(event.target.value)} value={actionRemarks} /></label>
                <div className="admin-verification-actions"><button className="admin-button" disabled={isSubmitting || (actionMode !== 'approve' && actionReason.trim().length < (actionMode === 'reject' ? 5 : 1))} type="submit">{isSubmitting ? 'Submitting…' : 'Confirm action'}</button><button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => setActionMode('')} type="button">Cancel</button></div>
              </form>}
            </div>

            <h3>Documents ({detailDocuments.length})</h3>
            {previewError && <div className="admin-feedback admin-feedback--error"><ErrorState message={previewError} /></div>}
            {detailDocuments.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Required</th><th>Preview</th></tr></thead><tbody>{detailDocuments.map((document, index) => <tr key={document.documentId ?? index}><td>{show(document.documentName)}</td><td>{show(document.documentType)}</td><td>{show(document.documentStatus)}</td><td>{document.required === true ? 'Yes' : document.required === false ? 'No' : 'Not available'}</td><td>{document.documentId ? <button className="admin-button admin-button--secondary admin-button--small" disabled={Boolean(previewLoadingId)} onClick={() => previewDocument(document)} type="button">{previewLoadingId === document.documentId ? 'Loading…' : 'View'}</button> : 'Not available'}</td></tr>)}</tbody></table></div> : <EmptyState message="No provider documents are available." />}
            <h3>Services ({detailServices.length})</h3>
            {detailServices.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Service</th><th>Category</th><th>Price</th><th>Location</th><th>Status</th></tr></thead><tbody>{detailServices.map((service, index) => <tr key={service.id ?? index}><td>{show(service.name)}</td><td>{show(service.category)}</td><td>{show(service.price)}</td><td>{show(service.location)}</td><td>{show(service.status)}</td></tr>)}</tbody></table></div> : <EmptyState message="No provider services are available." />}
            <h3>Bookings ({detailBookings.length})</h3>
            {detailBookings.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Customer</th><th>Service</th><th>Date / time</th><th>Status</th><th>Payment</th></tr></thead><tbody>{detailBookings.map((booking, index) => <tr key={booking.id ?? index}><td>{show(booking.id)}</td><td>{show(booking.customer)}</td><td>{show(booking.service)}</td><td>{formatDate(booking.date)} · {show(booking.time)}</td><td>{show(booking.status)}</td><td>{show(booking.paymentStatus)}</td></tr>)}</tbody></table></div> : <EmptyState message="No bookings are linked to this provider account." />}
            <h3>Support Tickets ({detailTickets.length})</h3>
            {detailTickets.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>ID</th><th>Subject</th><th>Type</th><th>Status</th><th>Created</th></tr></thead><tbody>{detailTickets.map((ticket, index) => <tr key={ticket.ticketId ?? index}><td>{show(ticket.ticketId)}</td><td>{show(ticket.subject)}</td><td>{show(ticket.ticketType)}</td><td>{show(ticket.status)}</td><td>{formatDate(ticket.createdAt)}</td></tr>)}</tbody></table></div> : <EmptyState message="No support tickets are linked to this provider." />}
            <h3>Status History</h3>
            {Array.isArray(details.history) && details.history.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Date</th><th>Action</th><th>Previous status</th><th>New status</th><th>Reason</th><th>Remarks</th><th>Performed by</th></tr></thead><tbody>{details.history.map((entry, index) => <tr key={`${entry.dateTime || entry.action}-${index}`}><td>{formatDate(entry.dateTime)}</td><td>{show(entry.action)}</td><td>{show(entry.previousStatus)}</td><td>{show(entry.newStatus)}</td><td>{show(entry.reason)}</td><td>{show(entry.remarks)}</td><td>{show(entry.performedBy)}</td></tr>)}</tbody></table></div> : <EmptyState message="No provider status history is available." />}
          </>}
          </div>
        </section>
        </div>}
      </section>
      {documentPreview && <div className="admin-modal-backdrop" onClick={() => setDocumentPreview(null)} role="presentation">
        <section aria-label={`${documentPreview.name} preview`} aria-modal="true" className="admin-document-modal" onClick={(event) => event.stopPropagation()} role="dialog">
          <div className="admin-panel-heading"><h2>{documentPreview.name}</h2><button aria-label="Close document preview" className="admin-icon-button" onClick={() => setDocumentPreview(null)} type="button">×</button></div>
          {documentPreview.type?.startsWith('image/') ? <img alt={documentPreview.name} className="admin-document-preview-image" src={documentPreview.url} />
            : documentPreview.type === 'application/pdf' ? <iframe className="admin-document-preview-frame" title={documentPreview.name} src={documentPreview.url} />
              : <p>This file type cannot be previewed here. <a download={documentPreview.name} href={documentPreview.url}>Download document</a>.</p>}
        </section>
      </div>}
    </AdminAccessGate>
  )
}
