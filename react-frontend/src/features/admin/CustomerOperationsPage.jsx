import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminNotifications } from './AdminNotifications'
import { AdminPageHeader } from './AdminPageHeader'
import { getCustomerAccount, listCustomerAccounts, listEscalatedTickets, updateCustomerAccountStatus } from './adminApi'
import { show, useAdminData, useSuperuserModuleData } from './useAdminData'
import './admin.css'

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

export default function CustomerOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('customer')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [statusReason, setStatusReason] = useState('')
  const [statusRemarks, setStatusRemarks] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const accounts = useAdminData(listCustomerAccounts)
  const tickets = useAdminData(listEscalatedTickets)
  const moduleState = useSuperuserModuleData()
  const loadSelectedCustomer = useCallback(() => selectedId ? getCustomerAccount(selectedId) : Promise.resolve(null), [selectedId])
  const detailsData = useAdminData(loadSelectedCustomer)
  const customers = useMemo(() => Array.isArray(accounts.data?.customers) ? accounts.data.customers : [], [accounts.data])
  const queryText = query.trim().toLocaleLowerCase()
  const visibleCustomers = useMemo(() => customers.filter((customer) => {
    const matchesQuery = [customer.fullName, customer.name, customer.email, customer.phone, customer.phoneNumber, customer.id]
      .some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(queryText))
    const status = customer.status || customer.accountStatus || 'Active'
    return matchesQuery && (statusFilter === 'all' || String(status).toLocaleLowerCase() === statusFilter)
  }), [customers, queryText, statusFilter])
  const displayedCustomers = showAll ? visibleCustomers : visibleCustomers.slice(0, 10)
  const details = detailsData.data?.customer

  function selectCustomer(id) {
    const next = new URLSearchParams(searchParams)
    next.set('customer', id)
    setSearchParams(next)
    setStatusReason('')
    setStatusRemarks('')
    setActionError('')
    setSuccessMessage('')
  }

  function closeDetails() {
    const next = new URLSearchParams(searchParams)
    next.delete('customer')
    setSearchParams(next)
    setActionError('')
    setSuccessMessage('')
  }

  async function submitStatusChange(event) {
    event.preventDefault()
    if (!details || isSubmitting) return
    const currentStatus = details.status || details.accountStatus || 'Active'
    const nextStatus = currentStatus === 'Blocked' ? 'Active' : 'Blocked'
    const reason = statusReason.trim()
    if (reason.length < 5 || reason.length > 200) {
      setActionError('Please enter a reason between 5 and 200 characters.')
      return
    }
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await updateCustomerAccountStatus(details.id, { status: nextStatus, reason, remarks: statusRemarks.trim() || undefined })
      setSuccessMessage(`Customer ${nextStatus === 'Blocked' ? 'suspended' : 'activated'} successfully.`)
      setStatusReason('')
      setStatusRemarks('')
      await Promise.all([accounts.reload(), detailsData.reload()])
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update customer status.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentStatus = details?.status || details?.accountStatus || 'Active'
  const blocked = currentStatus === 'Blocked'

  return (
    <AdminAccessGate>
      <section className="admin-page admin-user-management">
        <AdminPageHeader section="User Management" title="User Management" description="Manage registered customers and service providers across the platform." />
        <div aria-label="User management pages" className="admin-tabs">
          <Link aria-current="page" className="admin-tab admin-tab--active" to="/admin/customers">Customers</Link>
          <Link className="admin-tab" to="/admin/providers">Providers</Link>
        </div>

        <div className="admin-operations-layout admin-user-management-layout">
          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel-heading">
              <h2>Customers ({accounts.data?.totals?.customers ?? (accounts.data ? customers.length : 'Not available')})</h2>
              <div className="admin-operations-filters">
                <label className="admin-sr-only" htmlFor="admin-customer-search">Search customers</label>
                <input className="admin-control" id="admin-customer-search" onChange={(event) => { setQuery(event.target.value); setShowAll(false) }} placeholder="Search customers" type="search" value={query} />
                <label className="admin-sr-only" htmlFor="admin-customer-status">Filter customer status</label>
                <select className="admin-control" id="admin-customer-status" onChange={(event) => { setStatusFilter(event.target.value); setShowAll(false) }} value={statusFilter}>
                  <option value="all">All Status</option><option value="active">Active</option><option value="blocked">Blocked</option>
                </select>
              </div>
            </div>

            {accounts.isLoading && <LoadingState message="Loading customer accounts…" />}
            {!accounts.isLoading && accounts.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={accounts.error} /><button className="admin-button" onClick={accounts.reload} type="button">Retry</button></div>}
            {!accounts.isLoading && !accounts.error && customers.length === 0 && <EmptyState message="No customer accounts are available." />}
            {!accounts.isLoading && !accounts.error && customers.length > 0 && visibleCustomers.length === 0 && <EmptyState message="No customers match this search or status." />}
            {!accounts.isLoading && !accounts.error && visibleCustomers.length > 0 && <>
              <div className="admin-table-wrap admin-user-table-wrap"><table className="admin-table admin-user-table">
                <thead><tr><th>Customer Name</th><th>Email</th><th>Phone Number</th><th>Registration Date</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{displayedCustomers.map((customer, index) => {
                  const status = customer.status || customer.accountStatus || 'Active'
                  return <tr key={customer.id ?? `${customer.email || customer.fullName || index}`}>
                    <td>{show(customer.fullName || customer.name)}</td><td>{show(customer.email)}</td><td>{show(customer.phone || customer.phoneNumber)}</td>
                    <td>{formatDate(customer.registrationDate || customer.createdAt)}</td>
                    <td><StatusBadge tone={status === 'Active' ? 'ready' : 'neutral'}>{show(status)}</StatusBadge></td>
                    <td><button aria-label={`View ${customer.fullName || customer.name || 'customer'} details`} className="admin-button admin-button--secondary admin-button--small" onClick={() => selectCustomer(String(customer.id))} type="button">◉</button></td>
                  </tr>
                })}</tbody>
              </table></div>
              {visibleCustomers.length > 10 && <div className="admin-user-show-more"><button className="admin-button admin-button--secondary admin-button--small" onClick={() => setShowAll((value) => !value)} type="button">{showAll ? 'Show Less' : 'Show More'}</button></div>}
            </>}
          </section>

          <AdminNotifications moduleState={moduleState} tickets={tickets.data} ticketsLoading={tickets.isLoading} ticketsError={tickets.error} onRetryTickets={tickets.reload} />
        </div>
        <div className="admin-user-return"><Link className="admin-button admin-button--secondary" to="/admin">‹ Return to Dashboard</Link></div>
      </section>

      {selectedId && <div className="admin-modal-backdrop admin-user-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeDetails() }}>
        <section aria-labelledby="admin-customer-modal-title" aria-modal="true" className="admin-user-modal" role="dialog">
          {detailsData.isLoading && <div className="admin-user-modal-state"><LoadingState message="Loading customer details…" /></div>}
          {!detailsData.isLoading && detailsData.error && <div className="admin-user-modal-state"><ErrorState message={detailsData.error} /><button className="admin-button admin-button--secondary" onClick={detailsData.reload} type="button">Retry</button></div>}
          {!detailsData.isLoading && !detailsData.error && !details && <div className="admin-user-modal-state"><EmptyState message="Customer details are not available." /></div>}
          {!detailsData.isLoading && !detailsData.error && details && <>
            <header className="admin-user-modal-header">
              <div><h2 id="admin-customer-modal-title">{show(details.fullName || details.name)}</h2><p>Customer Details</p></div>
              <button aria-label="Close customer details" className="admin-notification-close" onClick={closeDetails} type="button">×</button>
            </header>
            <div className="admin-user-modal-content">
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}
              {actionError && <ErrorState message={actionError} />}
              <h3>Registration Information</h3>
              <div className="admin-user-detail-card"><span>Registration Date</span><strong>{formatDate(details.registrationDate || details.createdAt)}</strong></div>
              <h3>Account Status</h3>
              <div className="admin-user-detail-card"><span>Current Status:</span><StatusBadge tone={currentStatus === 'Active' ? 'ready' : 'neutral'}>{show(currentStatus)}</StatusBadge></div>
              <h3>Actions</h3>
              <form className="admin-user-action-form" onSubmit={submitStatusChange}>
                <label htmlFor="admin-customer-status-reason">Reason for {blocked ? 'Activate' : 'Suspend'} Customer *</label>
                <textarea id="admin-customer-status-reason" maxLength={200} minLength={5} onChange={(event) => setStatusReason(event.target.value)} placeholder={blocked ? 'Required activation reason' : 'Required suspension reason'} required value={statusReason} />
                <span className="admin-user-character-count">{statusReason.length} / 200</span>
                <label htmlFor="admin-customer-status-remarks">Admin Remarks (optional)</label>
                <textarea id="admin-customer-status-remarks" maxLength={200} onChange={(event) => setStatusRemarks(event.target.value)} placeholder="Optional operational remarks" value={statusRemarks} />
                <button className={`admin-user-status-button${blocked ? ' admin-user-status-button--active' : ''}`} disabled={isSubmitting || statusReason.trim().length < 5} type="submit">{isSubmitting ? 'Saving…' : blocked ? '◉ Activate Customer' : '⊘ Suspend Customer'}</button>
              </form>
            </div>
            <footer className="admin-user-modal-footer"><button className="admin-button admin-button--secondary admin-button--full" onClick={closeDetails} type="button">Close</button></footer>
          </>}
        </section>
      </div>}
    </AdminAccessGate>
  )
}
