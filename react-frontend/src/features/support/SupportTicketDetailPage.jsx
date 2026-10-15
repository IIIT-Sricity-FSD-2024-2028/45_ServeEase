import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { ticketsApi } from '../../services/api'
import './support.css'

const detailStorageKey = 'serveEaseSupportTicketDetails'
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

function attachmentSizeLabel(value) {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return 'Unknown size'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function attachmentTypeLabel(ticket, name) {
  const raw = ticket.attachmentType || ticket.fileType || name.split('.').pop() || 'file'
  return String(raw).includes('/') ? String(raw) : String(raw).toUpperCase()
}

function readTicketExtras(id) {
  try {
    const stored = JSON.parse(localStorage.getItem(detailStorageKey) || '{}')
    return stored[id] || {}
  } catch { return {} }
}

function saveTicketExtras(id, value) {
  try {
    const stored = JSON.parse(localStorage.getItem(detailStorageKey) || '{}')
    localStorage.setItem(detailStorageKey, JSON.stringify({ ...stored, [id]: value }))
  } catch { /* Keep the interaction available for this page if browser storage is unavailable. */ }
}

function addSupportNotification(ticketId, text) {
  try {
    const key = 'serveEaseSupportModuleData'
    const stored = JSON.parse(localStorage.getItem(key) || '{}')
    const notifications = Array.isArray(stored.notifications) ? stored.notifications : []
    notifications.unshift({
      id: `support-detail-${ticketId}-${Date.now()}`,
      eventId: `support:ticket:${ticketId}:${Date.now()}`,
      ticketId,
      text,
      time: new Date().toISOString(),
      read: false,
      isRead: false,
      isNew: true,
    })
    localStorage.setItem(key, JSON.stringify({ ...stored, notifications }))
    window.dispatchEvent(new CustomEvent('serveease-notifications-count', {
      detail: notifications.filter((item) => item.read !== true && item.isNew !== false).length,
    }))
  } catch { /* Notification persistence is optional when storage is unavailable. */ }
}

export default function SupportTicketDetailPage() {
  const { ticketId } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loadedTicketId, setLoadedTicketId] = useState('')
  const [errorState, setErrorState] = useState({ ticketId: '', message: '' })
  const [notice, setNotice] = useState('')
  const [remarks, setRemarks] = useState('')
  const [solution, setSolution] = useState('')
  const [savedSolution, setSavedSolution] = useState('')
  const [solutionFeedback, setSolutionFeedback] = useState({ type: '', message: '' })
  const [statusAfterSolutionSave, setStatusAfterSolutionSave] = useState('')
  const solutionRef = useRef(null)
  const [reply, setReply] = useState('')
  const [replyFeedback, setReplyFeedback] = useState({ type: '', message: '' })
  const [messages, setMessages] = useState([])
  const [localHistory, setLocalHistory] = useState([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [showEscalationDialog, setShowEscalationDialog] = useState(false)
  const [escalationError, setEscalationError] = useState('')

  useEffect(() => {
    let active = true
    ticketsApi.getForSupport(ticketId).then((record) => {
      if (!active) return
      const extras = readTicketExtras(ticketId)
      const currentTicket = extras.status ? { ...record, status: extras.status } : record
      setTicket(currentTicket)
      setLoadedTicketId(ticketId)
      setSelectedStatus(normalizeStatus(currentTicket.status))
      setRemarks(extras.remarks ?? record.supportRemarks ?? '')
      setSolution(extras.solution ?? record.solution ?? record.supportUpdate ?? '')
      setSavedSolution(extras.solution ?? record.solution ?? record.supportUpdate ?? '')
      setMessages(extras.messages ?? (Array.isArray(record.messages) ? record.messages : []))
      setLocalHistory(Array.isArray(extras.history) ? extras.history : [])
    }).catch((requestError) => { if (active) { setErrorState({ ticketId, message: requestError.message || 'Unable to load this ticket.' }); setLoadedTicketId(ticketId) } })
    return () => { active = false }
  }, [ticketId])
  const error = errorState.ticketId === ticketId ? errorState.message : ''

  async function update(action) {
    const note = remarks.trim()
    if (action === 'save' && note.length < 5) return setErrorState({ ticketId, message: 'Internal remarks must contain at least 5 characters.' })
    if (action === 'resolve' && solution.trim().length < 10) return setErrorState({ ticketId, message: 'Save a support update/solution before resolving the ticket.' })
    if (action === 'escalate' && ticket.status !== 'Escalated' && note.length < 10) return setErrorState({ ticketId, message: 'Internal investigation remarks must contain at least 10 characters before escalation.' })
    if (action === 'escalate' && ticket.status === 'Escalated') return setNotice('Ticket is already escalated to the superuser queue.')
    setSaving(true); setErrorState({ ticketId, message: '' }); setNotice('')
    const priorTicket = ticket
    const priorLocalHistory = localHistory
    if (action === 'escalate') {
      const updatedAt = new Date().toISOString()
      const escalationEntry = { status: 'Escalated', note, updatedBy: 'Support', updatedAt }
      setTicket({ ...ticket, status: 'Escalated', updatedAt })
      setSelectedStatus('Escalated')
      setLocalHistory([escalationEntry, ...localHistory])
    }
    try {
      let refreshed
      if (action === 'start') await ticketsApi.updateSupportStatus(ticketId, 'In Progress')
      else if (action === 'resolve') await ticketsApi.resolveForSupport(ticketId, solution.trim())
      else if (action === 'escalate') {
        // Use the updated ticket returned by the escalation request itself. A
        // second GET can fail after the server has already saved the change,
        // which would otherwise leave the page displaying the previous status.
        refreshed = await ticketsApi.escalateForSupport(ticketId, note)
      } else await ticketsApi.updateSupportRemarks(ticketId, note)
      if (!refreshed) refreshed = await ticketsApi.getForSupport(ticketId)
      const statusOverride = action === 'escalate'
        ? 'Escalated'
        : ['start', 'resolve'].includes(action)
          ? normalizeStatus(refreshed.status)
        : readTicketExtras(ticketId).status || displayStatus(refreshed.status)
      const hasCurrentEscalationHistory = refreshed.statusHistory?.[0]?.status === 'Escalated'
      const nextLocalHistory = action === 'escalate' && !hasCurrentEscalationHistory
        ? [{ status: 'Escalated', note, updatedBy: 'Support', updatedAt: refreshed.escalatedAt || refreshed.updatedAt || new Date().toISOString() }, ...localHistory]
        : localHistory
      const visibleTicket = { ...refreshed, status: statusOverride }
      setTicket(visibleTicket)
      setSelectedStatus(normalizeStatus(statusOverride))
      setRemarks(readTicketExtras(ticketId).remarks ?? refreshed.supportRemarks ?? note)
      setLocalHistory(nextLocalHistory)
      saveTicketExtras(ticketId, { ...readTicketExtras(ticketId), status: statusOverride, solution, remarks: action === 'save' ? note : remarks, messages, history: nextLocalHistory })
      setNotice(action === 'start' ? 'Ticket moved to In Progress.' : action === 'resolve' ? 'Ticket resolved.' : action === 'escalate' ? 'Ticket escalated to the superuser queue.' : 'Internal remarks saved for support/admin review.')
      if (action === 'escalate') addSupportNotification(ticketId, `Ticket escalated to superuser - ${ticket.ticketId}`)
      if (action === 'save') saveTicketExtras(ticketId, { ...readTicketExtras(ticketId), solution, remarks: note, messages, history: localHistory })
    } catch (requestError) {
      if (action === 'escalate') {
        setTicket(priorTicket)
        setSelectedStatus(normalizeStatus(priorTicket.status))
        setLocalHistory(priorLocalHistory)
      }
      setErrorState({ ticketId, message: requestError.message || 'Ticket update failed.' })
    }
    finally { setSaving(false) }
  }

  function applySelectedStatus(status, savedUpdate = solution, historyBase = localHistory, messagesBase = messages) {
    setErrorState({ ticketId, message: '' })
    setNotice('')
    const updatedAt = new Date().toISOString()
    const nextHistory = [{
      status,
      note: status === 'Resolved' ? 'Support resolved simple issue' : `Ticket status updated to ${status}`,
      updatedBy: 'Support',
      updatedAt,
    }, ...historyBase]
    setTicket({ ...ticket, status, updatedAt })
    setSelectedStatus(status)
    setLocalHistory(nextHistory)
    setStatusAfterSolutionSave('')
    saveTicketExtras(ticketId, { ...readTicketExtras(ticketId), status, solution: savedUpdate, remarks, messages: messagesBase, history: nextHistory })
    setNotice(`Ticket status updated to ${status}.`)
    addSupportNotification(ticketId, `Ticket status updated - ${ticket.ticketId}`)
  }

  async function saveSolution(event) {
    event.preventDefault()
    const nextSolution = solution.trim()
    if (nextSolution.length < 10) {
      setSolutionFeedback({ type: 'error', message: 'Solution must contain at least 10 characters.' })
      solutionRef.current?.focus()
      return
    }
    setErrorState({ ticketId, message: '' })
    const message = { sender: 'Support Agent', senderType: 'agent', text: nextSolution, time: new Date().toISOString() }
    const nextMessages = messages.some((item) => item.senderType === 'agent' && (item.text || item.message) === nextSolution)
      ? messages
      : [...messages, message]
    const savedAt = new Date().toISOString()
    const nextHistory = [{ status: displayStatus(ticket.status), note: 'Support solution updated', updatedBy: 'Support', updatedAt: savedAt }, ...localHistory]
    const statusToApply = statusAfterSolutionSave
    setMessages(nextMessages)
    setLocalHistory(nextHistory)
    setSolution(nextSolution)
    setSavedSolution(nextSolution)
    saveTicketExtras(ticketId, { ...readTicketExtras(ticketId), solution: nextSolution, remarks, messages: nextMessages, history: nextHistory })
    addSupportNotification(ticketId, `Support update saved - ${ticket.ticketId}`)
    setSolutionFeedback({ type: 'success', message: 'Solution saved and shared with the user.' })
    setNotice('')
    if (statusToApply) applySelectedStatus(statusToApply, nextSolution, nextHistory, nextMessages)
  }

  function sendReply(event) {
    event.preventDefault()
    const text = reply.trim()
    if (!text) return setReplyFeedback({ type: 'error', message: 'Reply message cannot be empty.' })
    if (text.length < 5) return setReplyFeedback({ type: 'error', message: 'Reply must contain at least 5 characters.' })
    const nextMessages = [...messages, { sender: 'Support Agent', senderType: 'agent', text, time: new Date().toISOString() }]
    const nextHistory = [{ status: displayStatus(ticket.status), note: 'Support agent responded to customer', updatedBy: 'Support', updatedAt: new Date().toISOString() }, ...localHistory]
    setMessages(nextMessages)
    setLocalHistory(nextHistory)
    setReply('')
    setReplyFeedback({ type: 'success', message: 'Reply sent successfully.' })
    saveTicketExtras(ticketId, { ...readTicketExtras(ticketId), solution, remarks, messages: nextMessages, history: nextHistory })
    addSupportNotification(ticketId, `New reply sent for ${ticket.ticketId}`)
    setErrorState({ ticketId, message: '' })
    setNotice('Reply sent successfully.')
  }

  async function submitStatus(event) {
    event.preventDefault()
    if (!selectedStatus) return setErrorState({ ticketId, message: 'Select a ticket status.' })
    if (selectedStatus === displayStatus(ticket.status)) { setErrorState({ ticketId, message: '' }); setNotice('Status already set to the selected value.'); return }
    if (['Resolved', 'Escalated'].includes(selectedStatus) && savedSolution.trim().length < 10) {
      setStatusAfterSolutionSave(selectedStatus)
      setErrorState({ ticketId, message: '' })
      setNotice('')
      setSolutionFeedback({ type: 'error', message: `Save a support update/solution before setting the ticket to ${selectedStatus}.` })
      solutionRef.current?.focus()
      return
    }
    setStatusAfterSolutionSave('')
    await applySelectedStatus(selectedStatus, savedSolution)
  }

  if (loadedTicketId !== ticketId) return <main className="support-page"><LoadingState message="Loading ticket…" /></main>
  if (error && !ticket) return <main className="support-page"><ErrorState message={error} /><Link className="support-back-link" to="/employee/support-tickets">Back to Dashboard</Link></main>

  const details = [
    ['Ticket ID', ticket.ticketId], ['Booking Reference', ticket.relatedBookingId || ticket.bookingReference],
    ['Provider Name', ticket.providerName || 'ServeEase Provider'], ['Related Customer', ticket.customerName || ticket.raisedByName],
    ['Service', ticket.service || ticket.serviceName], ['Priority', ticket.priority || 'Medium'],
    ['Issue Category', ticket.issueCategory || ticket.ticketType], ['Date Created', dateLabel(ticket.createdAt || ticket.createdAtIso || ticket.createdDate || ticket.created)],
    ['Current Status', displayStatus(ticket.status)],
  ]
  const statuses = ['Open', 'In Progress', 'Resolved', 'Escalated']
  const history = [...(ticket.statusHistory || []), ...localHistory]
    .sort((left, right) => new Date(right.updatedAt || right.time || 0).getTime() - new Date(left.updatedAt || left.time || 0).getTime())
    .concat(ticket.history || [])

  return <main className="support-page support-detail-page">
    <nav aria-label="Breadcrumb" className="support-breadcrumb"><Link to="/employee/support-tickets">Customer Support Dashboard</Link><span aria-hidden="true">›</span><span>Ticket Resolution</span></nav>
    <header className="support-ticket-page-heading"><h1>Ticket Resolution &amp; Escalation</h1><p>View ticket details, communicate with customers, and resolve issues.</p></header>
    {error && <p className="support-feedback support-feedback--error" role="alert">{error}</p>}{notice && <p className="support-feedback support-feedback--success" role="status">{notice}</p>}
    <div className="support-detail-layout">
      <div className="support-detail-main-column">
        <section className="support-card"><h2>Ticket Details</h2><dl className="support-ticket-detail-grid">{details.map(([label, value]) => <div className="support-detail-box" key={label}><dt>{label}</dt><dd>{label === 'Current Status' ? <span className={`support-status-badge ${statusTone(value)}`}>{valueLabel(value)}</span> : valueLabel(value)}</dd></div>)}</dl><div className="support-contact"><h3>Contact Information</h3><p><strong>Phone:</strong> {ticket.raisedByPhone || ticket.phone ? <a href={`tel:${ticket.raisedByPhone || ticket.phone}`}>{ticket.raisedByPhone || ticket.phone}</a> : 'N/A'}</p><p><strong>Email:</strong> {ticket.raisedByEmail || ticket.email ? <a href={`mailto:${ticket.raisedByEmail || ticket.email}`}>{ticket.raisedByEmail || ticket.email}</a> : 'N/A'}</p></div></section>
        <section className="support-card support-customer-ticket"><h2>Customer Ticket</h2><div className="support-ticket-copy support-ticket-subject"><span>Subject</span><strong>{valueLabel(ticket.subject)}</strong></div><div className="support-ticket-copy support-ticket-description"><span>Description</span><p>{valueLabel(ticket.description)}</p></div>{ticket.attachmentName && ticket.attachmentName !== 'No attachment' && <div className="support-original-attachment"><div className="support-original-attachment-row"><span aria-hidden="true">📎</span><strong>{ticket.attachmentName}</strong><span>·</span><span>{attachmentTypeLabel(ticket, ticket.attachmentName)}</span><span>·</span><span>{attachmentSizeLabel(ticket.attachmentSize || ticket.fileSize)}</span>{ticket.attachmentUrl ? <a download href={ticket.attachmentUrl}>Download</a> : <button aria-disabled="true" disabled type="button">Download</button>}{!ticket.attachmentUrl && <small>Preview unavailable. This attachment was created before the attachment preview feature was introduced.</small>}</div></div>}
          <div className="support-ticket-edit-block"><label htmlFor="support-detail-solution">Solution</label><form onSubmit={saveSolution}><textarea id="support-detail-solution" maxLength={600} onChange={(event) => { setSolution(event.target.value); if (event.target.value.trim().length >= 10 && solutionFeedback.type === 'error') setSolutionFeedback({ type: '', message: '' }) }} placeholder="Type the resolution customers/providers will see as Support Update..." ref={solutionRef} value={solution} />{solutionFeedback.message && <p className={`support-chat-feedback support-chat-feedback--${solutionFeedback.type}`} role={solutionFeedback.type === 'error' ? 'alert' : 'status'}>{solutionFeedback.message}</p>}<div className="support-solution-footer"><small>{solution.length} / 600</small><button className="support-action-button" disabled={saving} type="submit">Save Solution</button></div></form></div>
          <div className="support-ticket-edit-block"><label htmlFor="support-detail-remarks">Internal Investigation Remarks</label><textarea id="support-detail-remarks" maxLength={700} onChange={(event) => setRemarks(event.target.value)} placeholder="Add what Support checked: booking, payment, customer, provider, evidence..." value={remarks} /><div className="support-solution-footer"><small>{remarks.length} / 700</small><button className="support-action-button" disabled={saving} onClick={() => update('save')} type="button">Save Internal Remarks</button></div></div>
        </section>
        <section className="support-card"><h2>Communication Panel</h2>{messages.length ? <div className="support-message-thread">{messages.map((message, index) => <article className={`support-message${['agent', 'admin', 'support'].includes(message.senderType) ? ' is-agent' : ''}`} key={`${message.time || message.createdAt || index}-${index}`}><strong>{valueLabel(message.sender || message.senderName)}</strong><p>{valueLabel(message.text || message.message)}</p><time>{dateTimeLabel(message.time || message.createdAt)}</time></article>)}</div> : <p className="support-muted">No messages yet.</p>}<form className="support-reply-form" onSubmit={sendReply}><input aria-label="Type your reply" onChange={(event) => { setReply(event.target.value); if (replyFeedback.type === 'error') setReplyFeedback({ type: '', message: '' }) }} placeholder="Type your reply..." value={reply} /><button className="support-update-button" type="submit">Send</button></form>{replyFeedback.message && <p className={`support-chat-feedback support-chat-feedback--${replyFeedback.type}`} role={replyFeedback.type === 'error' ? 'alert' : 'status'}>{replyFeedback.message}</p>}</section>
      </div>
      <aside className="support-detail-sidebar">
        <section className="support-card"><h2>Update Ticket Status</h2><form onSubmit={submitStatus}><div className="support-status-options">{statuses.map((status) => <label className={`support-status-option support-status-option--${statusTone(status)}${selectedStatus === status ? ' is-selected' : ''}`} key={status}><input checked={selectedStatus === status} name="support-ticket-status" onChange={() => { setSelectedStatus(status); setStatusAfterSolutionSave(''); setSolutionFeedback({ type: '', message: '' }); setErrorState({ ticketId, message: '' }); setNotice('') }} type="radio" value={status} /><span>{status}</span></label>)}</div><button className="support-update-button" disabled={saving} type="submit">{saving ? 'Updating…' : 'Update Status'}</button></form></section>
        <section className="support-card"><h2>Quick Actions</h2><div className="support-quick-actions"><button className="support-escalate-button" disabled={saving || ticket.status === 'Escalated'} onClick={() => { if (ticket.status === 'Escalated') return; setEscalationError(''); setShowEscalationDialog(true) }} type="button">Escalate to Superuser</button><button className="support-back-button" onClick={() => navigate('/employee/support-tickets')} type="button">Back to Dashboard</button></div></section>
        {!!history.length && <section className="support-card"><h2>Ticket History</h2><History entries={history} /></section>}
      </aside>
    </div>
    {showEscalationDialog && <div className="support-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setShowEscalationDialog(false) }}><section aria-labelledby="support-escalation-title" aria-modal="true" className="support-modal-card" role="dialog"><div className="support-modal-title-row"><span aria-hidden="true" className="support-modal-icon">⚠</span><h2 id="support-escalation-title">Escalate Ticket</h2></div><p>Escalate only when refund approval, provider action, fraud, safety, misconduct, compensation, or payment settlement authority is needed.</p>{ticket.status !== 'Escalated' && <label className="support-escalation-reason">Internal Investigation Remarks<textarea autoFocus maxLength={700} onChange={(event) => { setRemarks(event.target.value); setEscalationError('') }} placeholder="Describe what Support checked and why superuser action is needed (at least 10 characters)." value={remarks} /></label>}{escalationError && <p className="support-chat-feedback support-chat-feedback--error" role="alert">{escalationError}</p>}<div className="support-modal-actions"><button className="support-escalate-button" disabled={saving} onClick={async () => { if (ticket.status !== 'Escalated' && remarks.trim().length < 10) { setEscalationError('Add at least 10 characters of internal investigation remarks before escalating.'); return } setEscalationError(''); setShowEscalationDialog(false); await update('escalate') }} type="button">Yes, Escalate</button><button className="support-back-button" onClick={() => setShowEscalationDialog(false)} type="button">Cancel</button></div></section></div>}
  </main>
}

function History({ entries }) { return <ol className="support-detail-history">{entries.map((entry, index) => <li key={`${entry.updatedAt || entry.time || entry.status || entry.label}-${index}`}><strong>{valueLabel(entry.status ? displayStatus(entry.status) : entry.label)}</strong><time>{dateTimeLabel(entry.updatedAt || entry.time)}</time><p>{valueLabel(entry.note)}</p><small>{entry.updatedBy ? `Updated by ${entry.updatedBy}` : ''}</small></li>)}</ol> }

function normalizeStatus(status) {
  if (status === 'Pending') return 'Open'
  if (['Resolved', 'Resolved by Support', 'Rejected'].includes(status)) return 'Resolved'
  return ['Open', 'In Progress', 'Escalated'].includes(status) ? status : ''
}

function displayStatus(status) {
  if (status === 'Pending') return 'Open'
  if (status === 'Resolved by Support') return 'Resolved'
  return status
}
