import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { ticketsApi } from '../../services/api'
import { API_BASE_URL } from '../../services/apiClient'
import { AttachmentPreview } from './AttachmentPreview'
import './support.css'

const dateLabel = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
const dateTimeLabel = (value) => {
  if (!value) return 'N/A'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
const valueLabel = (value) => value === null || value === undefined || value === '' ? 'N/A' : String(value)
const statusTone = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
// Escalating is a separate Quick Action, so it is not a status that can be picked here.
const statuses = ['Open', 'In Progress', 'Resolved']
const lockedStatuses = ['Resolved by Support', 'Escalated', 'Under Review', 'Resolved', 'Rejected']

function displayStatus(status) {
  if (status === 'Pending') return 'Open'
  if (status === 'Resolved by Support') return 'Resolved'
  return status
}

function selectableStatus(status) {
  const shown = displayStatus(status)
  return statuses.includes(shown) ? shown : shown === 'Rejected' ? 'Resolved' : ''
}

// Ticket Resolution page. Every change here is saved through the support API, so the customer or provider who
// raised the ticket sees the new status, solution and replies on their own pages.
export default function SupportTicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loadedTicketId, setLoadedTicketId] = useState('')
  const [errorState, setErrorState] = useState({ ticketId: '', message: '' })
  const [notice, setNotice] = useState('')
  const [remarks, setRemarks] = useState('')
  const [solution, setSolution] = useState('')
  const [solutionFeedback, setSolutionFeedback] = useState({ type: '', message: '' })
  const solutionRef = useRef(null)
  const [reply, setReply] = useState('')
  const [replyFeedback, setReplyFeedback] = useState({ type: '', message: '' })
  const [selectedStatus, setSelectedStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [showEscalationDialog, setShowEscalationDialog] = useState(false)
  const [escalationError, setEscalationError] = useState('')

  useEffect(() => {
    let active = true
    ticketsApi.getForSupport(ticketId).then((record) => {
      if (!active) return
      setTicket(record)
      setLoadedTicketId(ticketId)
      setSelectedStatus(selectableStatus(record.status))
      setRemarks(record.supportRemarks ?? '')
      setSolution(record.supportUpdate ?? '')
    }).catch((requestError) => { if (active) { setErrorState({ ticketId, message: requestError.message || 'Unable to load this ticket.' }); setLoadedTicketId(ticketId) } })
    return () => { active = false }
  }, [ticketId])

  // New customer or provider messages arrive while the page is open; only the ticket itself is refreshed, so
  // anything being typed is kept.
  useEffect(() => {
    if (loadedTicketId !== ticketId) return undefined
    const timer = window.setInterval(() => { ticketsApi.getForSupport(ticketId).then(setTicket).catch(() => {}) }, 8000)
    return () => window.clearInterval(timer)
  }, [loadedTicketId, ticketId])

  const error = errorState.ticketId === ticketId ? errorState.message : ''
  const fail = useCallback((message) => setErrorState({ ticketId, message }), [ticketId])
  const clearFeedback = () => { setErrorState({ ticketId, message: '' }); setNotice('') }
  const adopt = (record) => { setTicket(record); setSelectedStatus(selectableStatus(record.status)); return record }
  const locked = ticket ? lockedStatuses.includes(ticket.status) : false
  const savedSolution = String(ticket?.supportUpdate || '')

  async function saveRemarks() {
    const note = remarks.trim()
    if (note.length < 5) return fail('Internal remarks must contain at least 5 characters.')
    setSaving(true); clearFeedback()
    try { adopt(await ticketsApi.updateSupportRemarks(ticketId, note)); setNotice('Internal remarks saved for support/admin review.') } catch (requestError) { fail(requestError.message || 'Ticket update failed.') } finally { setSaving(false) }
  }

  async function saveSolution(event) {
    event.preventDefault()
    const next = solution.trim()
    if (next.length < 10) { setSolutionFeedback({ type: 'error', message: 'Solution must contain at least 10 characters.' }); solutionRef.current?.focus(); return }
    setSaving(true); clearFeedback()
    try {
      adopt(await ticketsApi.saveSupportSolution(ticketId, next))
      setSolution(next)
      setSolutionFeedback({ type: 'success', message: 'Solution saved and shared with the user.' })
    } catch (requestError) { setSolutionFeedback({ type: 'error', message: requestError.message || 'The solution could not be saved.' }) } finally { setSaving(false) }
  }

  async function submitStatus(event) {
    event.preventDefault()
    if (!selectedStatus) return fail('Select a ticket status.')
    if (selectedStatus === displayStatus(ticket.status)) { clearFeedback(); setNotice('Status already set to the selected value.'); return }
    if (selectedStatus === 'Open') return fail('A ticket that has been started cannot be moved back to Open.')
    if (selectedStatus === 'Resolved' && (savedSolution.trim().length < 10 || solution.trim() !== savedSolution.trim())) {
      setSolutionFeedback({ type: 'error', message: 'Save a support update/solution before setting the ticket to Resolved.' })
      solutionRef.current?.focus()
      return
    }
    setSaving(true); clearFeedback(); setSolutionFeedback({ type: '', message: '' })
    try {
      let current = ticket
      if (current.status === 'Pending') current = await ticketsApi.updateSupportStatus(ticketId, 'In Progress')
      if (selectedStatus === 'Resolved') current = await ticketsApi.resolveForSupport(ticketId, savedSolution.trim())
      adopt(current)
      setNotice(`Ticket status updated to ${selectedStatus}.`)
    } catch (requestError) { fail(requestError.message || 'Ticket update failed.') } finally { setSaving(false) }
  }

  async function escalate() {
    const note = remarks.trim()
    if (ticket.status === 'Escalated') return setNotice('Ticket is already escalated to the superuser queue.')
    if (note.length < 10) return setEscalationError('Add at least 10 characters of internal investigation remarks before escalating.')
    setEscalationError(''); setShowEscalationDialog(false); setSaving(true); clearFeedback()
    try {
      adopt(await ticketsApi.escalateForSupport(ticketId, note))
      setNotice('Ticket escalated to the superuser queue.')
    } catch (requestError) { fail(requestError.message || 'Ticket update failed.') } finally { setSaving(false) }
  }

  async function sendReply(event) {
    event.preventDefault()
    const text = reply.trim()
    if (!text) return setReplyFeedback({ type: 'error', message: 'Reply message cannot be empty.' })
    if (text.length < 5) return setReplyFeedback({ type: 'error', message: 'Reply must contain at least 5 characters.' })
    setSaving(true); clearFeedback()
    try {
      adopt(await ticketsApi.sendSupportMessage(ticketId, text))
      setReply('')
      setReplyFeedback({ type: 'success', message: 'Reply sent successfully.' })
    } catch (requestError) { setReplyFeedback({ type: 'error', message: requestError.message || 'The reply could not be sent.' }) } finally { setSaving(false) }
  }

  if (loadedTicketId !== ticketId) return <main className="support-page"><LoadingState message="Loading ticket…" /></main>
  if (error && !ticket) return <main className="support-page"><ErrorState message={error} /><Link className="support-back-link" to="/employee/support-tickets">Back to Dashboard</Link></main>

  const messages = Array.isArray(ticket.messages) ? ticket.messages : []
  const details = [
    ['Ticket ID', ticket.ticketId], ['Booking Reference', ticket.relatedBookingId || ticket.bookingReference],
    ['Provider Name', ticket.providerName || 'ServeEase Provider'], ['Related Customer', ticket.customerName || ticket.raisedByName],
    ['Service', ticket.service || ticket.serviceName], ['Priority', ticket.priority || 'Medium'],
    ['Issue Category', ticket.issueCategory || ticket.ticketType], ['Date Created', dateLabel(ticket.createdAt)],
    ['Current Status', displayStatus(ticket.status)],
  ]
  const history = [...(ticket.statusHistory || [])].sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())

  return <main className="support-page support-detail-page">
    <nav aria-label="Breadcrumb" className="support-breadcrumb"><Link to="/employee/support-tickets">Customer Support Dashboard</Link><span aria-hidden="true">›</span><span>Ticket Resolution</span></nav>
    <header className="support-ticket-page-heading"><h1>Ticket Resolution &amp; Escalation</h1><p>View ticket details, communicate with customers, and resolve issues.</p></header>
    {error && <p className="support-feedback support-feedback--error" role="alert">{error}</p>}{notice && <p className="support-feedback support-feedback--success" role="status">{notice}</p>}
    {locked && <p className="support-feedback" role="status">This ticket is {displayStatus(ticket.status).toLowerCase()} and can no longer be edited by support. You can still reply in the Communication Panel.</p>}
    <div className="support-detail-layout">
      <div className="support-detail-main-column">
        <section className="support-card"><h2>Ticket Details</h2><dl className="support-ticket-detail-grid">{details.map(([label, value]) => <div className="support-detail-box" key={label}><dt>{label}</dt><dd>{label === 'Current Status' ? <span className={`support-status-badge ${statusTone(value)}`}>{valueLabel(value)}</span> : valueLabel(value)}</dd></div>)}</dl><div className="support-contact"><h3>Contact Information</h3><p><strong>Phone:</strong> {ticket.raisedByPhone ? <a href={`tel:${ticket.raisedByPhone}`}>{ticket.raisedByPhone}</a> : 'N/A'}</p><p><strong>Email:</strong> {ticket.raisedByEmail ? <a href={`mailto:${ticket.raisedByEmail}`}>{ticket.raisedByEmail}</a> : 'N/A'}</p></div></section>
        <section className="support-card support-customer-ticket"><h2>{ticket.raisedByType === 'provider' ? 'Provider Ticket' : 'Customer Ticket'}</h2><div className="support-ticket-copy support-ticket-subject"><span>Subject</span><strong>{valueLabel(ticket.subject)}</strong></div><div className="support-ticket-copy support-ticket-description"><span>Description</span><p>{valueLabel(ticket.description)}</p></div>
          <AttachmentPreview apiBaseUrl={API_BASE_URL} ticket={ticket} />
          <div className="support-ticket-edit-block"><label htmlFor="support-detail-solution">Solution</label><form onSubmit={saveSolution}><textarea disabled={locked} id="support-detail-solution" maxLength={600} onChange={(event) => { setSolution(event.target.value); if (event.target.value.trim().length >= 10 && solutionFeedback.type === 'error') setSolutionFeedback({ type: '', message: '' }) }} placeholder="Type the resolution customers/providers will see as Support Update..." ref={solutionRef} value={solution} />{solutionFeedback.message && <p className={`support-chat-feedback support-chat-feedback--${solutionFeedback.type}`} role={solutionFeedback.type === 'error' ? 'alert' : 'status'}>{solutionFeedback.message}</p>}<div className="support-solution-footer"><small>{solution.length} / 600</small><button className="support-action-button" disabled={saving || locked} type="submit">Save Solution</button></div></form></div>
          <div className="support-ticket-edit-block"><label htmlFor="support-detail-remarks">Internal Investigation Remarks</label><textarea disabled={locked} id="support-detail-remarks" maxLength={700} onChange={(event) => setRemarks(event.target.value)} placeholder="Add what Support checked: booking, payment, customer, provider, evidence..." value={remarks} /><div className="support-solution-footer"><small>{remarks.length} / 700</small><button className="support-action-button" disabled={saving || locked} onClick={saveRemarks} type="button">Save Internal Remarks</button></div></div>
        </section>
        <section className="support-card"><h2>Communication Panel</h2>{messages.length ? <div className="support-message-thread">{messages.map((message) => <article className={`support-message${['agent', 'admin', 'support'].includes(message.senderType) ? ' is-agent' : ''}`} key={message.messageId || message.sentAt}><strong>{valueLabel(message.sender)}</strong><p>{valueLabel(message.text)}</p><time>{dateTimeLabel(message.sentAt)}</time></article>)}</div> : <p className="support-muted">No messages yet.</p>}<form className="support-reply-form" onSubmit={sendReply}><input aria-label="Type your reply" onChange={(event) => { setReply(event.target.value); if (replyFeedback.type === 'error') setReplyFeedback({ type: '', message: '' }) }} placeholder="Type your reply..." value={reply} /><button className="support-update-button" disabled={saving} type="submit">Send</button></form>{replyFeedback.message && <p className={`support-chat-feedback support-chat-feedback--${replyFeedback.type}`} role={replyFeedback.type === 'error' ? 'alert' : 'status'}>{replyFeedback.message}</p>}</section>
      </div>
      <aside className="support-detail-sidebar">
        <section className="support-card"><h2>Update Ticket Status</h2><form onSubmit={submitStatus}><div className="support-status-options">{statuses.map((status) => <label className={`support-status-option support-status-option--${statusTone(status)}${selectedStatus === status ? ' is-selected' : ''}`} key={status}><input checked={selectedStatus === status} disabled={locked} name="support-ticket-status" onChange={() => { setSelectedStatus(status); setSolutionFeedback({ type: '', message: '' }); clearFeedback() }} type="radio" value={status} /><span>{status}</span></label>)}</div><button className="support-update-button" disabled={saving || locked} type="submit">{saving ? 'Updating…' : 'Update Status'}</button></form></section>
        <section className="support-card"><h2>Quick Actions</h2><div className="support-quick-actions"><button className="support-escalate-button" disabled={saving || ticket.status === 'Escalated' || locked} onClick={() => { setEscalationError(''); setShowEscalationDialog(true) }} type="button">Escalate to Superuser</button><button className="support-back-button" onClick={() => navigate('/employee/support-tickets')} type="button">Back to Dashboard</button></div></section>
        {!!history.length && <section className="support-card"><h2>Ticket History</h2><History entries={history} /></section>}
      </aside>
    </div>
    {showEscalationDialog && <div className="support-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowEscalationDialog(false) }}><section aria-labelledby="support-escalation-title" aria-modal="true" className="support-modal-card" role="dialog"><div className="support-modal-title-row"><span aria-hidden="true" className="support-modal-icon">⚠</span><h2 id="support-escalation-title">Escalate Ticket</h2></div><p>Escalate only when refund approval, provider action, fraud, safety, misconduct, compensation, or payment settlement authority is needed.</p><label className="support-escalation-reason">Internal Investigation Remarks<textarea autoFocus maxLength={700} onChange={(event) => { setRemarks(event.target.value); setEscalationError('') }} placeholder="Describe what Support checked and why superuser action is needed (at least 10 characters)." value={remarks} /></label>{escalationError && <p className="support-chat-feedback support-chat-feedback--error" role="alert">{escalationError}</p>}<div className="support-modal-actions"><button className="support-escalate-button" disabled={saving} onClick={escalate} type="button">Yes, Escalate</button><button className="support-back-button" onClick={() => setShowEscalationDialog(false)} type="button">Cancel</button></div></section></div>}
  </main>
}

function History({ entries }) { return <ol className="support-detail-history">{entries.map((entry, index) => <li key={`${entry.updatedAt || entry.status}-${index}`}><strong>{valueLabel(displayStatus(entry.status))}</strong><time>{dateTimeLabel(entry.updatedAt)}</time><p>{valueLabel(entry.note)}</p><small>{entry.updatedBy ? `Updated by ${entry.updatedBy}` : ''}</small></li>)}</ol> }
