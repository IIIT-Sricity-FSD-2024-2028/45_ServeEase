import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminChip } from './AdminChip'
import { AdminPageHeader } from './AdminPageHeader'
import {
  escalateAdminTicket,
  getAdminTicket,
  listAdminTickets,
  resolveAdminTicket,
  submitAdminTicketDecision,
  updateAdminTicketStatus,
} from './adminApi'
import { matchesAdminSearch, useAdminSearch } from './adminSearch'
import { addSuperuserNotification } from './superuserNotifications'
import { show, useAdminData } from './useAdminData'
import { API_BASE_URL } from '../../services/apiBase'
import './admin.css'

const groups = [
  { key: 'Escalated', title: 'Escalated Tickets', stat: 'Escalated Tickets', description: 'tickets requiring immediate attention', icon: '⚠', className: 'escalated' },
  { key: 'Open', title: 'Open Tickets', stat: 'Open Tickets', description: 'tickets awaiting assignment', icon: '◔', className: 'open' },
  { key: 'In Progress', title: 'In Progress Tickets', stat: 'In Progress', description: 'tickets being worked on', icon: '◉', className: 'progress' },
  { key: 'Resolved', title: 'Resolved Tickets', stat: 'Resolved', description: 'tickets successfully resolved', icon: '✓', className: 'resolved' },
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

function TicketMeta({ label, children }) {
  return <div className="admin-escalated-meta"><span>{label}</span><strong>{show(children)}</strong></div>
}

function attachmentUrl(value) {
  const url = String(value || '').trim()
  if (!url) return ''
  if (/^(data:|https?:\/\/)/i.test(url)) return url
  return `${new URL(API_BASE_URL).origin}${url.startsWith('/') ? '' : '/'}${url}`
}

function attachmentDetails(ticket) {
  const href = attachmentUrl(ticket.attachmentUrl)
  if (!href) return null
  const name = ticket.attachmentName || decodeURIComponent(href.split('/').pop().split('?')[0]) || 'Attached file'
  const type = String(ticket.attachmentType || '').toLowerCase()
  const image = type.startsWith('image/') || /\.(png|jpe?g|gif|webp)(\?.*)?$/i.test(href) || /^data:image\//i.test(href)
  const pdf = type === 'application/pdf' || /\.pdf(\?.*)?$/i.test(href) || /^data:application\/pdf/i.test(href)
  return { href, name, canPreview: image || pdf, image, pdf }
}

export default function AdminEscalatedTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedId = searchParams.get('ticket')
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
  const searchTerm = useAdminSearch('/admin/escalated-tickets')
  const filteredTickets = useMemo(() => records.filter((record) => matchesAdminSearch([
    record.ticketId, record.subject, record.description, record.raisedByName, record.raisedByEmail,
    record.providerName, record.customerName, record.relatedBookingId, record.ticketType,
    record.priority, record.status, record.service, record.raisedByType, record.supportRemarks,
  ], searchTerm)), [records, searchTerm])
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

  // superuser.js updateTicketStatus() / resolveEscalatedTicket() also post a superuser notification.
  async function performAction(action, successText, notification) {
    if (!ticket || isSubmitting) return
    setIsSubmitting(true)
    setActionError('')
    setSuccessMessage('')
    try {
      await action()
      setSuccessMessage(successText)
      if (notification) {
        await addSuperuserNotification({ ticketId: ticket.ticketId, referenceId: ticket.ticketId, actionPage: '/admin/escalated-tickets', ...notification })
          .catch(() => null)
      }
      await refreshData()
    } catch (error) {
      setActionError(error?.message || 'Unable to update this ticket.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function startProgress() {
    await performAction(() => updateAdminTicketStatus(ticket.ticketId, 'In Progress'), 'Ticket moved to In Progress.',
      { kind: 'ticket-in-progress', text: `${ticket.ticketId} moved to In Progress`, type: 'red' })
  }

  async function escalateTicket() {
    await performAction(() => escalateAdminTicket(ticket.ticketId, 'Escalated by the superuser for admin review.'), 'Ticket escalated for admin review.',
      { kind: 'ticket-escalated', text: `${ticket.ticketId} moved to Escalated`, type: 'red' })
  }

  async function resolveTicket(event) {
    event?.preventDefault()
    if (solution.trim().length < 10 || solution.trim().length > 600) return
    await performAction(async () => {
      if (canResolveEscalated) await submitAdminTicketDecision(ticket.ticketId, 'No Action Required', solution.trim())
      else await resolveAdminTicket(ticket.ticketId, solution.trim())
    }, 'Ticket resolved successfully.', { kind: 'ticket-resolved', text: `${ticket.ticketId} resolved by superuser`, type: 'blue' })
  }

  async function resolveProgressTicket() {
    const summary = window.prompt('Enter a resolution summary (at least 5 characters):', ticket.supportUpdate || '')
    if (summary === null) return
    if (summary.trim().length < 5 || summary.trim().length > 600) {
      setActionError('Enter a resolution summary between 5 and 600 characters.')
      return
    }
    setSolutionDraft({ ticketId: ticket.ticketId, value: summary.trim() })
    await performAction(() => resolveAdminTicket(ticket.ticketId, summary.trim()), 'Ticket resolved successfully.',
      { kind: 'ticket-resolved', text: `${ticket.ticketId} moved to Resolved`, type: 'blue' })
  }

  const totals = useMemo(() => Object.fromEntries(groups.map((group) => [
    group.key, records.filter((record) => queueFor(record.status) === group.key).length,
  ])), [records])

  return (
    <AdminAccessGate>
      <section className="admin-page admin-escalated-page">
        <AdminPageHeader danger section="Escalated Tickets" title="Ticket Resolution Panel" description="Review escalated tickets, provider tickets, refund requests, and critical support cases requiring admin decision." hero />

        <div className="admin-grid admin-escalated-stats">
          {groups.map((group) => <article className="admin-stat-card" key={group.key}>
            <span>{group.stat}<span>{group.icon}</span></span>
            <strong>{allTickets.data ? totals[group.key] : allTickets.error ? 'N/A' : '…'}</strong>
          </article>)}
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
                {items.length === 0 && <div className="admin-empty-card">No tickets found in this section.</div>}
                {items.map((record, index) => <article className="admin-escalated-card" key={record.ticketId || index}>
                  <div className="admin-escalated-card-main">
                    <div className="admin-escalated-card-heading"><h3>{show(record.ticketId)}</h3><AdminChip>{displayStatus(record.status)}</AdminChip><AdminChip>{record.raisedByType === 'provider' ? 'Provider' : 'Customer'}</AdminChip></div>
                    <p className="admin-escalated-subject">{show(record.subject)}</p>
                    <div className="admin-escalated-compact-meta">
                      <span>{record.raisedByType === 'provider' ? 'Provider' : 'Customer'}: {show(record.raisedByName)}</span>
                      <span>Provider: {show(record.providerName)}</span>
                      {record.customerName && <span>Related Customer: {record.customerName}</span>}
                      <span>Booking: {show(record.relatedBookingId)}</span>
                      <span>Created: {formatDate(record.createdAt)}</span>
                    </div>
                    <div className="admin-escalated-tags"><AdminChip tone="warning">{show(record.ticketType)}</AdminChip><AdminChip tone="pending">{show(record.priority || 'Medium')}</AdminChip>{record.service && <AdminChip tone="completed">{record.service}</AdminChip>}{attachmentUrl(record.attachmentUrl) && <AdminChip tone="refunded">📎 Attachment</AdminChip>}</div>
                  </div>
                  <button className="admin-button admin-button--secondary admin-button--small" onClick={() => selectTicket(record.ticketId)} type="button">◉ View Details</button>
                </article>)}
              </div>
            </section>
          })}
        </div>}
        <div className="admin-category-back"><Link className="admin-button admin-button--secondary" to="/admin">‹ Back to Dashboard</Link></div>
      </section>

      {selectedId && <div className="admin-escalated-backdrop" onClick={(event) => { if (event.target === event.currentTarget) closeTicket() }}>
        <section aria-labelledby="admin-ticket-modal-title" aria-modal="true" className={`admin-escalated-modal admin-escalated-modal--${activeQueue === 'Resolved' ? 'resolved' : canResolveEscalated ? 'escalated' : canStartOrEscalate ? 'open' : 'progress'}`} role="dialog">
          {details.isLoading && <LoadingState message="Loading ticket details…" />}
          {!details.isLoading && details.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={details.error} /><button className="admin-button" onClick={details.reload} type="button">Retry</button></div>}
          {!details.isLoading && !details.error && !ticket && <EmptyState message="Ticket details are not available." />}
          {ticket && !details.isLoading && <>
            <header className="admin-escalated-modal-header">
              <h2 aria-label={`${ticket.ticketId} ticket details`} id="admin-ticket-modal-title">{show(ticket.ticketId)}</h2>
              <button aria-label="Close ticket details" className="admin-escalated-close" onClick={closeTicket} type="button">×</button>
            </header>
            <div className="admin-escalated-modal-body">
              <AdminChip>{displayStatus(ticket.status)}</AdminChip>
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
                  <TicketMeta label="Requester Name:">{ticket.raisedByName}</TicketMeta><TicketMeta label="Provider:">{ticket.providerName}</TicketMeta>
                  <TicketMeta label="Related Customer:">{ticket.customerName}</TicketMeta><TicketMeta label="Phone:">{ticket.raisedByPhone}</TicketMeta>
                  <TicketMeta label="Email:">{ticket.raisedByEmail}</TicketMeta><TicketMeta label="Support Update:">{ticket.supportUpdate}</TicketMeta>
                  <TicketMeta label="Support Investigation:">{ticket.supportRemarks}</TicketMeta><TicketMeta label="Escalation Reason:">{ticket.escalationReason}</TicketMeta>
                  <TicketMeta label="Assigned Support:">{ticket.assignedSupportName}</TicketMeta><TicketMeta label="Escalated At:">{formatDate(ticket.escalatedAt, true)}</TicketMeta>
                  <TicketMeta label="Attachment:">{attachmentDetails(ticket)?.name || 'No attachment'}</TicketMeta><TicketMeta label="Final Decision:">{ticket.finalDecision}</TicketMeta>
                </div>
                {attachmentDetails(ticket) && <TicketAttachment attachment={attachmentDetails(ticket)} />}
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

function TicketAttachment({ attachment }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  return <div className="admin-escalated-attachment">
    <div className="admin-escalated-attachment-bar"><span aria-hidden="true">📎</span><strong>{attachment.name}</strong><div>
      {attachment.canPreview && <button className="admin-button admin-button--secondary admin-button--small" onClick={() => setPreviewOpen((open) => !open)} type="button">{previewOpen ? 'Hide preview' : 'Preview'}</button>}
      <a className="admin-button admin-button--secondary admin-button--small" href={attachment.href} rel="noreferrer" target="_blank">Open</a>
      <a className="admin-button admin-button--secondary admin-button--small" download href={attachment.href}>Download</a>
    </div></div>
    {previewOpen && attachment.image && <img alt={attachment.name} className="admin-ticket-preview-image" src={attachment.href} />}
    {previewOpen && attachment.pdf && <iframe className="admin-ticket-preview-pdf" src={attachment.href} title={attachment.name} />}
  </div>
}
