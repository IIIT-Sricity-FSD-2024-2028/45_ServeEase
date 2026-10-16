import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { API_BASE_URL } from '../../services/apiClient'
import { ticketsApi } from '../../services/api'
import { attachmentHref, formatDisplayDate, formatDisplayDateTime, hasValue, ticketStatusClass } from './customerOperations'

// Breadcrumb + title block shared by the original customer pages (.breadcrumb-row, .page-title-block).
export function CustomerPageHeader({ crumbs, title, description }) {
  return <>
    <nav aria-label="Breadcrumb" className="breadcrumb-row">
      {crumbs.map(([label, to]) => <span key={label}>{to ? <Link to={to}>{label}</Link> : <strong aria-current="page">{label}</strong>}{to && <span aria-hidden="true" className="breadcrumb-sep">›</span>}</span>)}
    </nav>
    <section className="page-title-block"><h1>{title}</h1>{description && <p>{description}</p>}</section>
  </>
}

export function LoadState({ state, error, loadingText, onRetry }) {
  if (state === 'loading') return <div className="empty-state-card ops-state" role="status">{loadingText}</div>
  if (state === 'error') return <div className="empty-state-card ops-state ops-state--error" role="alert">
    <p>{error}</p>
    {onRetry && <button className="btn btn-outline" onClick={onRetry} type="button">Retry</button>}
  </div>
  return null
}

// .modal-backdrop/.modal-card with Escape, backdrop click, focus on open and focus restore on close.
export function OpsModal({ title, labelId, onClose, className = '', variant, children }) {
  const closeRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTarget = closeRef.current || document.querySelector(`[aria-labelledby="${labelId}"] button`)
    focusTarget?.focus()
    function handleKey(event) { if (event.key === 'Escape') onCloseRef.current() }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [labelId])

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation">
    <section aria-labelledby={labelId} aria-modal="true" className={`modal-card ${variant === 'confirm' ? 'modal-card--confirm' : ''} ${className}`.trim()} role="dialog">
      {variant === 'confirm' ? children : <>
        <div className="modal-head"><h2 id={labelId}>{title}</h2><button aria-label={`Close ${title.toLowerCase()}`} className="close-modal-btn" onClick={onClose} ref={closeRef} type="button">×</button></div>
        <div className="modal-body">{children}</div>
      </>}
    </section>
  </div>
}

export function InfoRow({ label, children }) {
  return <div className="info-row"><span>{label}</span><span>{hasValue(children) || (children !== null && typeof children === 'object') ? children : 'Not provided'}</span></div>
}

export function TicketStatus({ status }) {
  return <span className={`ticket-status ${ticketStatusClass(status)}`}>{status || 'Not provided'}</span>
}

// Ticket details from GET /tickets/:id (tickets.js ticketDetailsMarkup + the Support Center "Support Update").
// Only fields the backend recorded are shown; the history is the server's statusHistory.
export function TicketDetails({ ticketId, fallback }) {
  const [result, setResult] = useState({ id: '', ticket: null, error: '' })

  useEffect(() => {
    let active = true
    ticketsApi.get(ticketId)
      .then((ticket) => { if (active) setResult({ id: ticketId, ticket, error: '' }) })
      .catch((error) => { if (active) setResult({ id: ticketId, ticket: null, error: error.message || 'Ticket details could not be loaded.' }) })
    return () => { active = false }
  }, [ticketId])

  const loaded = result.id === ticketId
  const ticket = (loaded && result.ticket) || fallback
  if (!ticket) return <LoadState error={result.error} loadingText="Loading ticket…" state={loaded ? 'error' : 'loading'} />

  const href = attachmentHref(ticket.attachmentUrl, API_BASE_URL)
  return <>
    {loaded && result.error && <p className="ops-alert" role="alert">Showing the last loaded copy: {result.error}</p>}
    {!loaded && <p className="info-note" role="status">Refreshing ticket…</p>}
    <div className="info-grid">
      <div className="info-box"><strong>Ticket Details</strong>
        <InfoRow label="Ticket ID:">{ticket.ticketId}</InfoRow>
        <InfoRow label="Type:">{ticket.ticketType}</InfoRow>
        <InfoRow label="Subject:">{ticket.subject}</InfoRow>
        <InfoRow label="Status:"><TicketStatus status={ticket.status} /></InfoRow>
        <InfoRow label="Priority:">{ticket.priority}</InfoRow>
        <InfoRow label="Created On:">{formatDisplayDate(ticket.createdAt)}</InfoRow>
      </div>
      <div className="info-box"><strong>Booking Details</strong>
        <InfoRow label="Booking:">{ticket.relatedBookingId}</InfoRow>
        <InfoRow label="Provider:">{ticket.providerName}</InfoRow>
        <InfoRow label="Customer:">{ticket.customerName}</InfoRow>
      </div>
      <div className="info-box"><strong>Evidence</strong>
        {href ? <a className="attachment-link" href={href} rel="noreferrer" target="_blank">View attachment</a> : <div>No evidence uploaded</div>}
      </div>
      <div className="info-box"><strong>Ticket Description</strong><div>{ticket.description || 'Not provided'}</div></div>
      <div className="info-box"><strong>Support Update</strong><div>{ticket.supportRemarks || 'Your ticket has been received and is currently being reviewed by the support team.'}</div></div>
      <div className="info-box"><strong>Final Decision</strong><div>{ticket.finalDecision || 'Awaiting admin decision.'}</div>{ticket.adminRemarks && <div>{ticket.adminRemarks}</div>}</div>
    </div>
    {Array.isArray(ticket.statusHistory) && ticket.statusHistory.length > 0 && <div className="ticket-history" aria-label="Ticket history">
      {ticket.statusHistory.map((entry, index) => <div key={`${entry.updatedAt}-${index}`}><strong>{entry.status}</strong><span>{[entry.note, entry.updatedBy, formatDisplayDateTime(entry.updatedAt)].filter(Boolean).join(' • ')}</span></div>)}
    </div>}
  </>
}
