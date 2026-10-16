import { useCallback, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { getCustomerAccount, listBookings, listCustomerAccounts, updateCustomerAccountStatus } from './adminApi'
import { money, show, useAdminData } from './useAdminData'
import './admin.css'

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB').format(date)
}

function bookingsForCustomer(bookings, customer) {
  const email = String(customer.email || '').trim().toLocaleLowerCase()
  return bookings.filter((booking) => String(booking.customerId || '') === String(customer.id)
    || (email && String(booking.customerEmail || '').trim().toLocaleLowerCase() === email))
}

export default function CustomerOperationsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('customer')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All statuses')
  const [statusReason, setStatusReason] = useState('')
  const [statusRemarks, setStatusRemarks] = useState('')
  const [statusFormOpen, setStatusFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  const accounts = useAdminData(listCustomerAccounts)
  const bookingsData = useAdminData(listBookings)
  const loadSelectedCustomer = useCallback(() => selectedId ? getCustomerAccount(selectedId) : Promise.resolve(null), [selectedId])
  const detailsData = useAdminData(loadSelectedCustomer)
  const customers = useMemo(() => Array.isArray(accounts.data?.customers) ? accounts.data.customers : [], [accounts.data])
  const bookings = Array.isArray(bookingsData.data) ? bookingsData.data : []
  const queryText = query.trim().toLocaleLowerCase()
  const visibleCustomers = useMemo(() => customers.filter((customer) => {
    const matchesQuery = [customer.fullName, customer.email, customer.phone, customer.id]
      .some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(queryText))
    const matchesStatus = statusFilter === 'All statuses' || String(customer.status || '').toLocaleLowerCase() === statusFilter.toLocaleLowerCase()
    return matchesQuery && matchesStatus
  }), [customers, queryText, statusFilter])
  const details = detailsData.data?.customer
  const detailBookings = Array.isArray(detailsData.data?.bookings) ? detailsData.data.bookings : []
  const detailTickets = Array.isArray(detailsData.data?.tickets) ? detailsData.data.tickets : []
  const customerBookings = selectedId && details ? bookingsForCustomer(bookings, details) : []
  const lastBooking = customerBookings.reduce((latest, booking) => {
    const date = booking.date || booking.bookingDate
    return date && (!latest || Date.parse(date) > Date.parse(latest)) ? date : latest
  }, null)

  function selectCustomer(id) {
    const next = new URLSearchParams(searchParams)
    next.set('customer', id)
    setSearchParams(next)
    setStatusFormOpen(false)
    setActionError('')
    setSuccessMessage('')
  }

  function closeDetails() {
    const next = new URLSearchParams(searchParams)
    next.delete('customer')
    setSearchParams(next)
    setStatusFormOpen(false)
    setActionError('')
    setSuccessMessage('')
  }

  async function submitStatusChange(event) {
    event.preventDefault()
    if (!details || isSubmitting) return
    const nextStatus = details.status === 'Blocked' ? 'Active' : 'Blocked'
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await updateCustomerAccountStatus(details.id, { status: nextStatus, reason: statusReason.trim(), remarks: statusRemarks.trim() || undefined })
      setSuccessMessage(`Customer account ${nextStatus === 'Blocked' ? 'blocked' : 'activated'} successfully.`)
      setStatusFormOpen(false)
      setStatusReason('')
      setStatusRemarks('')
      await Promise.all([accounts.reload(), detailsData.reload()])
    } catch (requestError) {
      setActionError(requestError?.message || 'Unable to update customer status.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader section="User Management" title="User Management" description="Manage registered customers and service providers across the platform." />
        <div aria-label="User management pages" className="admin-tabs">
          <Link aria-current="page" className="admin-tab admin-tab--active" to="/admin/customers">Customers</Link>
          <Link className="admin-tab" to="/admin/providers">Providers</Link>
        </div>

        <div className="admin-operations-layout">
          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel-heading"><h2>Customers ({accounts.data?.totals?.customers ?? (accounts.data ? customers.length : 'Not available')})</h2>
              <div className="admin-operations-filters">
                <label className="admin-sr-only" htmlFor="admin-customer-search">Search customers</label>
                <input className="admin-control" id="admin-customer-search" onChange={(event) => setQuery(event.target.value)} placeholder="Search customers" type="search" value={query} />
                <label className="admin-sr-only" htmlFor="admin-customer-status">Filter customer status</label>
                <select className="admin-control" id="admin-customer-status" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option>All statuses</option><option>Active</option><option>Blocked</option>
                </select>
              </div>
            </div>

            {accounts.isLoading && <LoadingState message="Loading customer accounts…" />}
            {!accounts.isLoading && accounts.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={accounts.error} /><button className="admin-button" onClick={accounts.reload} type="button">Retry</button></div>}
            {!accounts.isLoading && !accounts.error && customers.length === 0 && <EmptyState message="No customer accounts are available." />}
            {!accounts.isLoading && !accounts.error && customers.length > 0 && visibleCustomers.length === 0 && <EmptyState message="No customers match this search or status." />}
            {!accounts.isLoading && !accounts.error && visibleCustomers.length > 0 && <div className="admin-table-wrap"><table className="admin-table">
              <thead><tr><th>Customer ID</th><th>Customer Name</th><th>Email</th><th>Phone</th><th>Location</th><th>Registration Date</th><th>Bookings</th><th>Last Booking</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>{visibleCustomers.map((customer, index) => {
                const relatedBookings = bookingsForCustomer(bookings, customer)
                const last = relatedBookings.reduce((latest, booking) => {
                  const date = booking.date || booking.bookingDate
                  return date && (!latest || Date.parse(date) > Date.parse(latest)) ? date : latest
                }, null)
                return <tr key={customer.id ?? `${customer.email || customer.fullName || index}`}>
                  <td>{show(customer.id)}</td><td>{show(customer.fullName)}</td><td>{show(customer.email)}</td><td>{show(customer.phone)}</td><td>{show(customer.location)}</td>
                  <td>{formatDate(customer.registrationDate)}</td><td>{bookingsData.data ? relatedBookings.length : 'Not available'}</td><td>{bookingsData.data ? formatDate(last) : 'Not available'}</td>
                  <td><StatusBadge tone={customer.status === 'Active' ? 'ready' : 'neutral'}>{show(customer.status)}</StatusBadge></td>
                  <td><button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectCustomer(String(customer.id))} type="button">View</button></td>
                </tr>
              })}</tbody>
            </table></div>}
            {bookingsData.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={`Booking counts unavailable: ${bookingsData.error}`} /><button className="admin-button admin-button--secondary admin-button--small" onClick={bookingsData.reload} type="button">Retry bookings</button></div>}
          </section>

          <aside className="admin-panel admin-panel--compact admin-customer-detail">
            {!selectedId && <EmptyState message="Choose View on a customer to inspect account details." />}
            {selectedId && detailsData.isLoading && <LoadingState message="Loading customer details…" />}
            {selectedId && !detailsData.isLoading && detailsData.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={detailsData.error} /><button className="admin-button" onClick={detailsData.reload} type="button">Retry</button></div>}
            {selectedId && !detailsData.isLoading && !detailsData.error && details && <>
              <div className="admin-panel-heading"><h2>{show(details.fullName)}</h2><button className="admin-icon-button" aria-label="Close customer details" onClick={closeDetails} type="button">×</button></div>
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}{actionError && <ErrorState message={actionError} />}
              <dl className="admin-detail-grid">
                <div><dt>Customer ID</dt><dd>{show(details.id)}</dd></div><div><dt>Email</dt><dd>{show(details.email)}</dd></div>
                <div><dt>Phone</dt><dd>{show(details.phone)}</dd></div><div><dt>Location</dt><dd>{show(details.location)}</dd></div>
                <div><dt>Registration date</dt><dd>{formatDate(details.registrationDate)}</dd></div><div><dt>Status</dt><dd>{show(details.status)}</dd></div>
                <div><dt>Booking count</dt><dd>{bookingsData.data ? customerBookings.length : 'Not available'}</dd></div><div><dt>Last booking</dt><dd>{bookingsData.data ? formatDate(lastBooking) : 'Not available'}</dd></div>
              </dl>
              {!statusFormOpen && <button className="admin-button" onClick={() => { setStatusFormOpen(true); setStatusReason(''); setStatusRemarks('') }} type="button">{details.status === 'Blocked' ? 'Activate customer' : 'Block customer'}</button>}
              {statusFormOpen && <form className="admin-form admin-status-form" onSubmit={submitStatusChange}>
                <h3>Confirm {details.status === 'Blocked' ? 'activation' : 'block'}</h3>
                <label>Reason<textarea maxLength={500} minLength={1} onChange={(event) => setStatusReason(event.target.value)} required value={statusReason} /></label>
                <label>Admin remarks (optional)<textarea maxLength={1000} onChange={(event) => setStatusRemarks(event.target.value)} value={statusRemarks} /></label>
                <button className="admin-button" disabled={isSubmitting || !statusReason.trim()} type="submit">{isSubmitting ? 'Submitting…' : 'Confirm status change'}</button>
                <button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={() => setStatusFormOpen(false)} type="button">Cancel</button>
              </form>}
              <h3>Customer Booking Activity ({detailBookings.length})</h3>
              {detailBookings.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Booking ID</th><th>Service</th><th>Provider</th><th>Date / time</th><th>Status</th><th>Payment</th><th>Total</th></tr></thead>
                <tbody>{detailBookings.map((booking, index) => <tr key={booking.id ?? index}><td>{show(booking.id)}</td><td>{show(booking.service)}</td><td>{show(booking.provider)}</td><td>{formatDate(booking.date)} · {show(booking.time)}</td><td>{show(booking.status)}</td><td>{show(booking.paymentStatus)}</td><td>{booking.total === null || booking.total === undefined ? 'Not available' : money(booking.total)}</td></tr>)}</tbody>
              </table></div> : <EmptyState message="No bookings are linked to this customer." />}
              <h3>Customer Support Tickets ({detailTickets.length})</h3>
              {detailTickets.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ticket ID</th><th>Booking Reference</th><th>Subject</th><th>Type</th><th>Status</th><th>Created</th></tr></thead>
                <tbody>{detailTickets.map((ticket, index) => <tr key={ticket.ticketId ?? index}><td>{show(ticket.ticketId)}</td><td>{show(ticket.relatedBookingId)}</td><td>{show(ticket.subject)}</td><td>{show(ticket.ticketType)}</td><td>{show(ticket.status)}</td><td>{formatDate(ticket.createdAt)}</td></tr>)}</tbody>
              </table></div> : <EmptyState message="No support tickets are linked to this customer." />}
            </>}
          </aside>
        </div>
      </section>
    </AdminAccessGate>
  )
}
