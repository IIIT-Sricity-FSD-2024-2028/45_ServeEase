import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { getAdminTicket, listEscalatedTickets, submitAdminTicketDecision, saveAdminTicketRemarks } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const decisions = [
  'Refund Approved',
  'Refund Rejected',
  'Rework Scheduled',
  'Provider Warning Issued',
  'Provider Suspended',
  'Ticket Rejected',
  'No Action Required',
]

function formatDate(value) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? show(value) : new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export default function AdminEscalatedTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('ticket')
  const [query, setQuery] = useState('')
  const [remarks, setRemarks] = useState('')
  const [decision, setDecision] = useState(decisions[0])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const tickets = useAdminData(listEscalatedTickets)
  const loadSelectedTicket = useCallback(() => selectedId ? getAdminTicket(selectedId) : Promise.resolve(null), [selectedId])
  const details = useAdminData(loadSelectedTicket)
  const records = useMemo(() => Array.isArray(tickets.data) ? tickets.data : [], [tickets.data])
  const queryText = query.trim().toLocaleLowerCase()
  const filteredTickets = useMemo(() => records.filter((ticket) => [ticket.ticketId, ticket.subject, ticket.raisedByName, ticket.raisedByEmail,
    ticket.providerName, ticket.relatedBookingId, ticket.ticketType, ticket.priority, ticket.status].some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(queryText))), [records, queryText])
  const ticket = details.data
  const history = Array.isArray(ticket?.statusHistory) ? ticket.statusHistory : []
  const isEditable = ticket && ['Escalated', 'Under Review'].includes(ticket.status)

  function selectTicket(id) {
    const next = new URLSearchParams(searchParams)
    next.set('ticket', id)
    setSearchParams(next)
    setActionError('')
    setSuccessMessage('')
  }

  function clearTicket() {
    const next = new URLSearchParams(searchParams)
    next.delete('ticket')
    setSearchParams(next)
    setActionError('')
    setSuccessMessage('')
  }

  async function reloadTicketData() {
    await Promise.all([tickets.reload(), details.reload()])
  }

  async function saveRemarks(event) {
    event.preventDefault()
    if (!selectedId || isSubmitting || remarks.trim().length < 5) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await saveAdminTicketRemarks(selectedId, remarks.trim())
      setSuccessMessage('Admin remarks saved.')
      setRemarks('')
      await reloadTicketData()
    } catch (error) {
      setActionError(error?.message || 'Unable to save admin remarks.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function submitDecision(event) {
    event.preventDefault()
    if (!selectedId || isSubmitting || remarks.trim().length < 10) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await submitAdminTicketDecision(selectedId, decision, remarks.trim())
      setSuccessMessage(`Ticket decision recorded: ${decision}.`)
      setRemarks('')
      await reloadTicketData()
    } catch (error) {
      setActionError(error?.message || 'Unable to submit the final ticket decision.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader danger section="Escalated Tickets" title="Ticket Resolution Panel" description="Review escalated support tickets and record a supported final decision." />
        <div className="admin-grid admin-ticket-stats">
          <article className="admin-stat-card admin-stat-card--attention"><span>Escalated tickets<span>!</span></span><strong>{tickets.data ? records.length : tickets.error ? 'Not available' : '…'}</strong><p>Records returned by the admin escalations API</p></article>
          <article className="admin-stat-card"><span>Under Review<span>◷</span></span><strong>{tickets.data ? records.filter((record) => record.status === 'Under Review').length : tickets.error ? 'Not available' : '…'}</strong><p>Escalations with admin review started</p></article>
        </div>

        <label className="admin-form admin-ticket-search">Search tickets<input onChange={(event) => setQuery(event.target.value)} placeholder="Ticket ID, subject, requester, provider, booking, or category" type="search" value={query} /></label>
        {tickets.isLoading && <LoadingState message="Loading escalated tickets…" />}
        {!tickets.isLoading && tickets.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={tickets.error} /><button className="admin-button" onClick={tickets.reload} type="button">Retry</button></div>}
        {!tickets.isLoading && !tickets.error && records.length === 0 && <EmptyState message="No escalated tickets are available." />}
        {!tickets.isLoading && !tickets.error && records.length > 0 && filteredTickets.length === 0 && <EmptyState message="No tickets match this search." />}

        {!tickets.isLoading && !tickets.error && (filteredTickets.length > 0 || selectedId) && <div className="admin-ticket-layout">
          <section className="admin-panel admin-panel--compact">
            <h2>Escalated Tickets ({filteredTickets.length})</h2>
            {filteredTickets.length === 0 ? <EmptyState message="No other tickets match this search." /> : <div className="admin-ticket-list">{filteredTickets.map((record, index) => <button className="admin-ticket-card" key={record.ticketId ?? index} onClick={() => selectTicket(String(record.ticketId))} type="button">
              <div className="admin-panel-heading"><strong>{show(record.ticketId)}</strong><StatusBadge tone={record.status === 'Escalated' ? 'neutral' : 'ready'}>{show(record.status)}</StatusBadge></div>
              <p>{show(record.subject)}</p>
              <small>{show(record.raisedByName)} · {show(record.raisedByType)} · {show(record.ticketType)}</small>
              <small>Priority: {show(record.priority)} · Booking: {show(record.relatedBookingId)}</small>
            </button>)}</div>}
          </section>

          <section className="admin-panel admin-panel--compact">
            <div className="admin-panel-heading"><h2>Ticket Details</h2>{selectedId && <button className="admin-button admin-button--secondary" onClick={clearTicket} type="button">Close</button>}</div>
            {!selectedId && <EmptyState message="Select an escalated ticket to view details." />}
            {selectedId && details.isLoading && <LoadingState message="Loading ticket details…" />}
            {selectedId && !details.isLoading && details.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={details.error} /><button className="admin-button" onClick={details.reload} type="button">Retry</button></div>}
            {selectedId && !details.isLoading && !details.error && !ticket && <EmptyState message="Ticket details are not available." />}
            {ticket && !details.isLoading && <>
              <div className="admin-ticket-title"><div><h3>{show(ticket.ticketId)}</h3><StatusBadge tone={ticket.status === 'Escalated' ? 'neutral' : 'ready'}>{show(ticket.status)}</StatusBadge></div><span>Priority: {show(ticket.priority)}</span></div>
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}{actionError && <ErrorState message={actionError} />}
              <dl className="admin-detail-grid">
                <div><dt>Created</dt><dd>{formatDate(ticket.createdAt)}</dd></div><div><dt>Raised by</dt><dd>{show(ticket.raisedByName)} ({show(ticket.raisedByType)})</dd></div>
                <div><dt>Requester email</dt><dd>{show(ticket.raisedByEmail)}</dd></div><div><dt>Requester phone</dt><dd>{show(ticket.raisedByPhone)}</dd></div>
                <div><dt>Customer</dt><dd>{show(ticket.customerName)}</dd></div><div><dt>Provider</dt><dd>{show(ticket.providerName)}</dd></div>
                <div><dt>Related booking</dt><dd>{show(ticket.relatedBookingId)}</dd></div><div><dt>Payment</dt><dd>{show(ticket.relatedPaymentId)}</dd></div>
                <div><dt>Category</dt><dd>{show(ticket.ticketType)}</dd></div><div><dt>Escalated at</dt><dd>{formatDate(ticket.escalatedAt)}</dd></div>
                <div><dt>Assigned support</dt><dd>{show(ticket.assignedSupportName)}</dd></div><div><dt>Attachment</dt><dd>{show(ticket.attachmentName)}</dd></div>
                <div><dt>Escalation reason</dt><dd>{show(ticket.escalationReason)}</dd></div><div><dt>Support update</dt><dd>{show(ticket.supportUpdate)}</dd></div>
                <div><dt>Admin remarks</dt><dd>{show(ticket.adminRemarks)}</dd></div><div><dt>Final decision</dt><dd>{show(ticket.finalDecision)}</dd></div>
              </dl>
              <h3>Subject and description</h3><div className="admin-ticket-description"><strong>{show(ticket.subject)}</strong><p>{show(ticket.description)}</p></div>
              {Array.isArray(ticket.messages) && ticket.messages.length > 0 && <><h3>Conversation</h3><div className="admin-ticket-messages">{ticket.messages.map((message, index) => <article className="admin-ticket-message" key={message.id ?? index}><strong>{show(message.senderName || message.sender)}</strong><p>{show(message.message || message.text)}</p><small>{formatDate(message.createdAt || message.timestamp)}</small></article>)}</div></>}
              <h3>Status History</h3>
              {history.length > 0 ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Status</th><th>Note</th><th>Updated by</th><th>When</th></tr></thead><tbody>{history.map((entry, index) => <tr key={`${entry.updatedAt || entry.status}-${index}`}><td>{show(entry.status)}</td><td>{show(entry.note)}</td><td>{show(entry.updatedBy)}</td><td>{formatDate(entry.updatedAt)}</td></tr>)}</tbody></table></div> : <EmptyState message="No ticket status history is available." />}

              {isEditable && <>
                <form className="admin-form admin-ticket-action-form" onSubmit={saveRemarks}>
                  <h3>Admin Remarks</h3><label>Operational remarks<textarea maxLength={1000} minLength={5} onChange={(event) => setRemarks(event.target.value)} value={remarks} /></label>
                  <button className="admin-button admin-button--secondary" disabled={isSubmitting || remarks.trim().length < 5} type="submit">{isSubmitting ? 'Saving…' : 'Save remarks'}</button>
                </form>
                <form className="admin-form admin-ticket-action-form" onSubmit={submitDecision}>
                  <h3>Final Decision</h3><label>Decision<select onChange={(event) => setDecision(event.target.value)} value={decision}>{decisions.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label>Admin remarks (required, at least 10 characters)<textarea maxLength={1000} minLength={10} onChange={(event) => setRemarks(event.target.value)} required value={remarks} /></label>
                  <button className="admin-button" disabled={isSubmitting || remarks.trim().length < 10} type="submit">{isSubmitting ? 'Submitting…' : 'Record final decision'}</button>
                </form>
              </>}
            </>}
          </section>
        </div>}
      </section>
    </AdminAccessGate>
  )
}
