import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import {
  escalateAdminTicket,
  getAdminTicket,
  listAdminTickets,
  resolveAdminTicket,
  submitAdminTicketDecision,
  updateAdminTicketStatus,
} from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

const groups = [
  { key: 'Escalated', title: 'Escalated Tickets', description: 'tickets requiring immediate attention', icon: '⚠', className: 'escalated' },
  { key: 'Open', title: 'Open Tickets', description: 'tickets awaiting assignment', icon: '◷', className: 'open' },
  { key: 'In Progress', title: 'In Progress Tickets', description: 'tickets being worked on', icon: '◉', className: 'progress' },
  { key: 'Resolved', title: 'Resolved Tickets', description: 'tickets successfully resolved', icon: '✓', className: 'resolved' },
]

function queueFor(status) {
  if (status === 'Escalated' || status === 'Under Review') return 'Escalated'
  if (status === 'Open' || status === 'Pending') return 'Open'
  if (status === 'In Progress') return 'In Progress'
  if (['Resolved', 'Resolved by Support', 'Rejected'].includes(status)) return 'Resolved'
  return null
}

function formatDate(value, withTime = false) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('en-GB', withTime
    ? { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function displayStatus(status) {
  return status === 'Pending' ? 'Open' : status === 'Resolved by Support' ? 'Resolved' : status
}

function badgeTone(status) {
  if (['Escalated', 'Under Review', 'Rejected'].includes(status)) return 'attention'
  if (['Open', 'Pending'].includes(status)) return 'warning'
  if (status === 'In Progress') return 'info'
  return 'success'
}

function TicketMeta({ label, children }) {
  return <div className="admin-escalated-meta"><span>{label}</span><strong>{show(children)}</strong></div>
}

function attachmentPreview(ticket) {
  const url = ticket.attachmentUrl
  if (!url || !/^(data:image\/|data:application\/pdf|https?:\/\/)/i.test(url)) return null
  if (/^data:image\//i.test(url) || /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(url)) {
    return <img alt={ticket.attachmentName || 'Ticket attachment'} className="admin-ticket-preview-image" src={url} />
  }
  if (/^data:application\/pdf/i.test(url) || /\.pdf(\?.*)?$/i.test(url)) {
    return <iframe className="admin-ticket-preview-pdf" src={url} title={ticket.attachmentName || 'Ticket attachment'} />
  }
  return <a className="admin-button admin-button--secondary" href={url} rel="noreferrer" target="_blank">Open attachment</a>
}

export default function AdminEscalatedTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('ticket')
  const [query, setQuery] = useState('')
  const [solutionDraft, setSolutionDraft] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const allTickets = useAdminData(listAdminTickets)
  const loadSelectedTicket = useCallback(() => selectedId ? getAdminTicket(selectedId) : Promise.resolve(null), [selectedId])
  const details = useAdminData(loadSelectedTicket)
  const records = useMemo(() => Array.isArray(allTickets.data) ? allTickets.data : [], [allTickets.data])
  const ticket = details.data
  const solution = solutionDraft && solutionDraft.ticketId === ticket?.ticketId
    ? solutionDraft.value
    : (ticket?.supportUpdate || ticket?.adminRemarks || '')
  const statusHistory = Array.isArray(ticket?.statusHistory) ? ticket.statusHistory : []
  const messages = Array.isArray(ticket?.messages) ? ticket.messages : []
  const searchText = query.trim().toLocaleLowerCase()
  const filteredTickets = useMemo(() => records.filter((record) => [
    record.ticketId, record.subject, record.description, record.raisedByName, record.raisedByEmail,
    record.providerName, record.customerName, record.relatedBookingId, record.ticketType,
    record.priority, record.status,
  ].some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(searchText))), [records, searchText])
  const activeQueue = queueFor(ticket?.status)
  const canResolveEscalated = ['Escalated', 'Under Review'].includes(ticket?.status)
  const canStartOrEscalate = ['Open', 'Pending'].includes(ticket?.status)
  const canResolveProgress = ticket?.status === 'In Progress'

  function selectTicket(id) {
    const next = new URLSearchParams(searchParams)
    next.set('ticket', id)
    setSearchParams(next)
    setActionError('')
    setSuccessMessage('')
    setSolutionDraft(null)
  }

  const closeTicket = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete('ticket')
    setSearchParams(next)
    setActionError('')
    setSuccessMessage('')
    setSolutionDraft(null)
  }, [searchParams, setSearchParams])

  useEffect(() => {
    if (!selectedId) return undefined
    const onKeyDown = (event) => { if (event.key === 'Escape') closeTicket() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [selectedId, closeTicket])

  async function refreshData() {
    await Promise.all([allTickets.reload(), details.reload()])
  }

  async function performAction(action, successText) {
    if (!ticket || isSubmitting) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await action()
      setSuccessMessage(successText)
      await refreshData()
    } catch (error) {
      setActionError(error?.message || 'Unable to update this ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function startProgress() {
    await performAction(() => updateAdminTicketStatus(ticket.ticketId, 'In Progress'), 'Ticket moved to In Progress.')
  }

  async function escalateTicket() {
    await performAction(() => escalateAdminTicket(ticket.ticketId, 'Escalated by the superuser for admin review.'), 'Ticket escalated for admin review.')
  }

  async function resolveTicket(event) {
    event?.preventDefault()
    if (solution.trim().length < 10 || solution.trim().length > 600) return
    await performAction(async () => {
      if (canResolveEscalated) await submitAdminTicketDecision(ticket.ticketId, 'No Action Required', solution.trim())
      else await resolveAdminTicket(ticket.ticketId, solution.trim())
    }, 'Ticket resolved successfully.')
  }

  async function resolveProgressTicket() {
    const summary = window.prompt('Enter a resolution summary (at least 5 characters):', ticket.supportUpdate || '')
    if (summary === null) return
    if (summary.trim().length < 5 || summary.trim().length > 600) {
      setActionError('Enter a resolution summary between 5 and 600 characters.')
      return
    }
    setSolutionDraft({ ticketId: ticket.ticketId, value: summary.trim() })
    await performAction(() => resolveAdminTicket(ticket.ticketId, summary.trim()), 'Ticket resolved successfully.')
  }

  const totals = useMemo(() => Object.fromEntries(groups.map((group) => [
    group.key, records.filter((record) => queueFor(record.status) === group.key).length,
  ])), [records])

  return (
    <AdminAccessGate>
      <section className="admin-page admin-escalated-page">
        <AdminPageHeader danger section="Escalated Tickets" title="Ticket Resolution Panel" description="Review escalated tickets, provider tickets, refund requests, and critical support cases requiring admin decision." hero />

        <div className="admin-grid admin-escalated-stats">
          {groups.map((group) => <article className={`admin-stat-card ${group.key === 'Escalated' ? 'admin-stat-card--attention' : ''}`} key={group.key}>
            <span>{group.key === 'In Progress' ? group.key : `${group.key} Tickets`}<span>{group.icon}</span></span>
            <strong>{allTickets.data ? totals[group.key] : allTickets.error ? 'N/A' : '…'}</strong>
          </article>)}
        </div>

        <div className="admin-escalated-toolbar">
          <label className="admin-form">Search tickets<input onChange={(event) => setQuery(event.target.value)} placeholder="Search ticket, customer, provider, or category..." type="search" value={query} /></label>
          <button className="admin-button admin-button--secondary" disabled={allTickets.isLoading} onClick={allTickets.reload} type="button">Refresh</button>
        </div>

        {allTickets.isLoading && <LoadingState message="Loading tickets…" />}
        {!allTickets.isLoading && allTickets.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={allTickets.error} /><button className="admin-button" onClick={allTickets.reload} type="button">Retry</button></div>}
        {!allTickets.isLoading && !allTickets.error && records.length === 0 && <EmptyState message="There are no support tickets to display." />}
        {!allTickets.isLoading && !allTickets.error && records.length > 0 && filteredTickets.length === 0 && <EmptyState message="No tickets match this search." />}

        {!allTickets.isLoading && !allTickets.error && filteredTickets.length > 0 && <div className="admin-escalated-queues">
          {groups.map((group) => {
            const items = filteredTickets.filter((record) => queueFor(record.status) === group.key)
            return <section className={`admin-escalated-queue admin-escalated-queue--${group.className}`} key={group.key}>
              <div className="admin-escalated-queue-heading"><span aria-hidden="true">{group.icon}</span><div><h2>{group.title}</h2><p>{items.length} {group.description}</p></div></div>
              <div className="admin-escalated-cards">
                {items.length === 0 && <p className="admin-escalated-empty">No tickets found in this section.</p>}
                {items.map((record, index) => <article className="admin-escalated-card" key={record.ticketId || index}>
                  <div className="admin-escalated-card-main">
                    <div className="admin-escalated-card-heading"><h3>{show(record.ticketId)}</h3><StatusBadge tone={badgeTone(record.status)}>{displayStatus(record.status)}</StatusBadge><StatusBadge tone={record.raisedByType === 'provider' ? 'info' : 'neutral'}>{record.raisedByType === 'provider' ? 'Provider' : 'Customer'}</StatusBadge></div>
                    <p className="admin-escalated-subject">{show(record.subject)}</p>
                    <div className="admin-escalated-compact-meta">
                      <span>{record.raisedByType === 'provider' ? 'Provider' : 'Customer'}: {show(record.raisedByName)}</span>
                      <span>Provider: {show(record.providerName || (record.raisedByType === 'provider' ? record.raisedByName : 'ServeEase Provider'))}</span>
                      {record.customerName && <span>Related Customer: {record.customerName}</span>}
                      <span>Booking: {show(record.relatedBookingId)}</span>
                      <span>Created: {formatDate(record.createdAt)}</span>
                    </div>
                    <div className="admin-escalated-tags"><StatusBadge tone="warning">{show(record.ticketType)}</StatusBadge><StatusBadge tone="warning">{show(record.priority || 'Medium')}</StatusBadge>{record.service && <StatusBadge tone="neutral">{record.service}</StatusBadge>}</div>
                  </div>
                  <button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectTicket(record.ticketId)} type="button">◉ View Details</button>
                </article>)}
              </div>
            </section>
          })}
        </div>}
      </section>

      {selectedId && <div className="admin-escalated-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeTicket() }}>
        <section aria-labelledby="admin-ticket-modal-title" aria-modal="true" className={`admin-escalated-modal admin-escalated-modal--${activeQueue === 'Resolved' ? 'resolved' : canResolveEscalated ? 'escalated' : canStartOrEscalate ? 'open' : 'progress'}`} role="dialog">
          {details.isLoading && <LoadingState message="Loading ticket details…" />}
          {!details.isLoading && details.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={details.error} /><button className="admin-button" onClick={details.reload} type="button">Retry</button></div>}
          {!details.isLoading && !details.error && !ticket && <EmptyState message="Ticket details are not available." />}
          {ticket && !details.isLoading && <>
            <header className="admin-escalated-modal-header">
              <h2 id="admin-ticket-modal-title">{show(ticket.ticketId)} — Ticket Details</h2>
              <button aria-label="Close ticket details" className="admin-escalated-close" onClick={closeTicket} type="button">×</button>
            </header>
            <div className="admin-escalated-modal-body">
              <StatusBadge tone={badgeTone(ticket.status)}>{displayStatus(ticket.status)}</StatusBadge>
              {successMessage && <p className="admin-feedback" role="status">{successMessage}</p>}
              {actionError && <div className="admin-feedback admin-feedback--error" role="alert">{actionError}</div>}

              <section className="admin-escalated-detail-section">
                <div className="admin-escalated-detail-grid">
                  <TicketMeta label="Ticket ID:">{ticket.ticketId}</TicketMeta><TicketMeta label="Created:">{formatDate(ticket.createdAt)}</TicketMeta>
                  <TicketMeta label="Booking Ref:">{ticket.relatedBookingId}</TicketMeta><TicketMeta label="Raised By:">{ticket.raisedByType}</TicketMeta>
                  <TicketMeta label="Issue Category:">{ticket.ticketType}</TicketMeta><TicketMeta label="Service:">{ticket.service}</TicketMeta>
                  <TicketMeta label="Priority:">{ticket.priority || 'Medium'}</TicketMeta><TicketMeta label="Status:">{displayStatus(ticket.status)}</TicketMeta>
                </div>
              </section>

              <section className="admin-escalated-detail-section">
                <h3>Contact Information</h3>
                <div className="admin-escalated-detail-grid">
                  <TicketMeta label="Requester Name:">{ticket.raisedByName}</TicketMeta><TicketMeta label="Provider:">{ticket.providerName || (ticket.raisedByType === 'provider' ? ticket.raisedByName : 'ServeEase Provider')}</TicketMeta>
                  <TicketMeta label="Related Customer:">{ticket.customerName}</TicketMeta><TicketMeta label="Phone:">{ticket.raisedByPhone}</TicketMeta>
                  <TicketMeta label="Email:">{ticket.raisedByEmail}</TicketMeta><TicketMeta label="Support Update:">{ticket.supportUpdate}</TicketMeta>
                  <TicketMeta label="Support Investigation:">{ticket.supportRemarks}</TicketMeta><TicketMeta label="Escalation Reason:">{ticket.escalationReason}</TicketMeta>
                  <TicketMeta label="Assigned Support:">{ticket.assignedSupportName}</TicketMeta><TicketMeta label="Escalated At:">{formatDate(ticket.escalatedAt, true)}</TicketMeta>
                  <TicketMeta label="Attachment:">{ticket.attachmentName || (ticket.attachmentUrl ? 'Attached file' : 'No attachment')}</TicketMeta><TicketMeta label="Final Decision:">{ticket.finalDecision}</TicketMeta>
                </div>
                {ticket.attachmentUrl && <details className="admin-escalated-attachment"><summary>Preview attachment</summary>{attachmentPreview(ticket) || <p>Preview unavailable for this stored attachment.</p>}</details>}
              </section>

              <section className="admin-escalated-detail-section">
                <h3>Description</h3>
                <div className="admin-escalated-description"><p>{show(ticket.description)}</p>
                  <div className="admin-escalated-timeline">
                    {statusHistory.map((entry, index) => <article key={`${entry.updatedAt || entry.status}-${index}`}><strong>{show(entry.note || entry.status)}</strong><span>{show(entry.updatedBy)} · {formatDate(entry.updatedAt, true)}</span></article>)}
                    {messages.map((message, index) => <article key={message.messageId || `message-${index}`}><strong>{show(message.sender || message.senderType)}</strong><span>{show(message.text)} · {formatDate(message.sentAt, true)}</span></article>)}
                    {!statusHistory.length && !messages.length && <article><strong>Ticket received</strong><span>No support history has been recorded yet.</span></article>}
                  </div>
                </div>
              </section>

              {canResolveEscalated && <form className="admin-escalated-solution" onSubmit={resolveTicket}>
                <h3>Solution</h3><textarea aria-label="Resolution solution" maxLength={600} onChange={(event) => setSolutionDraft({ ticketId: ticket.ticketId, value: event.target.value })} required value={solution} />
                <div className="admin-escalated-counter">{solution.length} / 600</div>
                <button className="admin-button admin-escalated-resolve" disabled={isSubmitting || solution.trim().length < 10} type="submit">{isSubmitting ? 'Resolving…' : '✓ Resolve Ticket'}</button>
              </form>}

              {canStartOrEscalate && <div className="admin-escalated-actions"><button className="admin-button" disabled={isSubmitting} onClick={startProgress} type="button">{isSubmitting ? 'Updating…' : 'Start Progress'}</button><button className="admin-button admin-button--secondary" disabled={isSubmitting} onClick={escalateTicket} type="button">Escalate Ticket</button></div>}
              {canResolveProgress && <div className="admin-escalated-actions"><button className="admin-button admin-escalated-resolve" disabled={isSubmitting} onClick={resolveProgressTicket} type="button">{isSubmitting ? 'Resolving…' : '✓ Mark Resolved'}</button></div>}

              {activeQueue === 'Resolved' && (ticket.adminRemarks || ticket.supportUpdate) && <section className="admin-escalated-detail-section"><h3>Solution</h3><div className="admin-escalated-description">{ticket.adminRemarks || ticket.supportUpdate}</div></section>}
            </div>
            {activeQueue === 'Resolved' && <footer className="admin-escalated-modal-footer"><button className="admin-button admin-button--secondary" onClick={closeTicket} type="button">Close</button></footer>}
          </>}
        </section>
      </div>}
    </AdminAccessGate>
  )
}
