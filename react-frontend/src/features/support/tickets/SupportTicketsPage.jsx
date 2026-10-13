import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { supportApi } from '../../../services/api'
import './supportTickets.css'

const statuses = ['Pending', 'In Progress', 'Resolved by Support', 'Escalated', 'Under Review', 'Resolved', 'Rejected']
const priorities = ['Low', 'Medium', 'High', 'Critical']
const editableStatuses = ['Pending', 'In Progress']
const supportRoles = ['support', 'admin', 'superuser']

function displayValue(value) {
  return value === null || value === undefined || value === '' ? 'Not provided' : String(value)
}

function formatDate(value) {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function ticketIdentifier(ticket) {
  return ticket?.ticketId || ticket?.id
}

function statusClass(status) {
  return String(status || '').toLowerCase().replaceAll(' ', '-')
}

function TicketDetails({ ticket, disabled, onRemarksSubmit, onPriorityChange, onStartWork, onResolve, onEscalate, isMutating }) {
  const [remarks, setRemarks] = useState(ticket.supportRemarks || '')
  const [resolutionRemarks, setResolutionRemarks] = useState('')
  const [escalationRemarks, setEscalationRemarks] = useState('')
  const isEditable = editableStatuses.includes(ticket.status)

  function submitRemarks(event) {
    event.preventDefault()
    onRemarksSubmit(remarks.trim())
  }

  function submitResolution(event) {
    event.preventDefault()
    onResolve(resolutionRemarks.trim())
  }

  function submitEscalation(event) {
    event.preventDefault()
    onEscalate(escalationRemarks.trim())
  }

  return <section aria-labelledby="support-ticket-detail-heading" className="support-ticket-detail">
    <div className="support-detail-heading">
      <div>
        <p className="support-eyebrow">Ticket details</p>
        <h2 id="support-ticket-detail-heading">{ticket.subject || 'Support request'}</h2>
        <p className="support-ticket-reference">{displayValue(ticketIdentifier(ticket))} <span aria-hidden="true">·</span> {displayValue(ticket.ticketType)}</p>
      </div>
      <span className={`support-status support-status--${statusClass(ticket.status)}`}>{displayValue(ticket.status)}</span>
    </div>

    <div className="support-detail-section">
      <h3>Description</h3>
      <p className="support-description">{displayValue(ticket.description)}</p>
    </div>

    <div className="support-detail-grid">
      <div className="support-detail-item"><span>Requester</span><strong>{displayValue(ticket.raisedByName)}</strong><small>{displayValue(ticket.raisedByType)} · {displayValue(ticket.raisedByEmail)}</small></div>
      <div className="support-detail-item"><span>Requester phone</span><strong>{displayValue(ticket.raisedByPhone)}</strong><small>Requester ID: {displayValue(ticket.raisedById)}</small></div>
      <div className="support-detail-item"><span>Booking reference</span><strong>{displayValue(ticket.relatedBookingId)}</strong><small>Payment reference: {displayValue(ticket.relatedPaymentId)}</small></div>
      <div className="support-detail-item"><span>Customer / provider</span><strong>{displayValue(ticket.customerName || ticket.providerName)}</strong><small>Provider: {displayValue(ticket.providerName)}</small></div>
      <div className="support-detail-item"><span>Created</span><strong>{formatDate(ticket.createdAt)}</strong><small>Updated: {formatDate(ticket.updatedAt)}</small></div>
      <div className="support-detail-item"><span>Resolved / escalated</span><strong>{formatDate(ticket.resolvedAt)}</strong><small>Escalated: {formatDate(ticket.escalatedAt)}</small></div>
    </div>

    <div className="support-detail-section">
      <h3>Priority and support notes</h3>
      <div className="support-priority-row">
        <label htmlFor="support-ticket-priority">Priority</label>
        <select
          disabled={disabled || !isEditable}
          id="support-ticket-priority"
          onChange={(event) => {
            const nextPriority = event.target.value
            if (!onPriorityChange(nextPriority)) event.target.value = ticket.priority || 'Medium'
          }}
          value={ticket.priority || 'Medium'}
        >
          {priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
      </div>
      {ticket.priority === 'Critical' && isEditable && <p className="support-inline-note">Critical priority automatically escalates this ticket on the backend.</p>}
      <p className="support-remarks-display"><strong>Current support remarks</strong>{ticket.supportRemarks || 'No support remarks have been added.'}</p>
      {ticket.escalationReason && <p className="support-remarks-display"><strong>Escalation reason</strong>{ticket.escalationReason}</p>}
      <form className="support-form" onSubmit={submitRemarks}>
        <label htmlFor="support-remarks">Add or edit support remarks</label>
        <textarea
          disabled={disabled || !isEditable}
          id="support-remarks"
          minLength={5}
          onChange={(event) => setRemarks(event.target.value)}
          required
          value={remarks}
        />
        <button className="support-button support-button--secondary" disabled={disabled || !isEditable} type="submit">
          {isMutating ? 'Saving…' : 'Save support remarks'}
        </button>
      </form>
    </div>

    <div className="support-detail-section support-ticket-actions">
      <h3>Ticket actions</h3>
      {!isEditable && <p className="support-inline-note">This ticket is no longer editable by support.</p>}
      {ticket.status === 'Pending' && <button className="support-button support-button--primary" disabled={disabled} onClick={onStartWork} type="button">Start work</button>}
      {ticket.status === 'In Progress' && <>
        <form className="support-form" onSubmit={submitResolution}>
          <label htmlFor="support-resolution-remarks">Resolution remarks (at least 10 characters)</label>
          <textarea disabled={disabled} id="support-resolution-remarks" minLength={10} onChange={(event) => setResolutionRemarks(event.target.value)} required value={resolutionRemarks} />
          <button className="support-button support-button--primary" disabled={disabled} type="submit">Resolve ticket</button>
        </form>
        <form className="support-form" onSubmit={submitEscalation}>
          <label htmlFor="support-escalation-remarks">Escalation remarks</label>
          <textarea disabled={disabled} id="support-escalation-remarks" minLength={5} onChange={(event) => setEscalationRemarks(event.target.value)} required value={escalationRemarks} />
          <button className="support-button support-button--danger" disabled={disabled} type="submit">Escalate ticket</button>
        </form>
      </>}
    </div>

    <div className="support-detail-section">
      <h3>Status history</h3>
      {Array.isArray(ticket.statusHistory) && ticket.statusHistory.length > 0
        ? <ol className="support-history">{ticket.statusHistory.map((entry, index) => <li key={`${entry.updatedAt || entry.status}-${index}`}>
          <div><strong>{displayValue(entry.status)}</strong><time dateTime={entry.updatedAt || undefined}>{formatDate(entry.updatedAt)}</time></div>
          <p>{displayValue(entry.note)}</p>
          <small>Updated by {displayValue(entry.updatedBy)}</small>
        </li>)}</ol>
        : <p className="support-muted">No status history is available.</p>}
    </div>
  </section>
}

export default function SupportTicketsPage() {
  const { isAuthenticated, role } = useAuth()
  const canAccess = Boolean(isAuthenticated && supportRoles.includes(role))
  const detailRequestRef = useRef(0)
  const mutationInFlightRef = useRef(false)
  const [tickets, setTickets] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [isLoading, setIsLoading] = useState(canAccess)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [pageError, setPageError] = useState('')
  const [detailError, setDetailError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [raiserFilter, setRaiserFilter] = useState('')

  useEffect(() => {
    if (!canAccess) return undefined
    let active = true
    async function loadQueue() {
      setIsLoading(true)
      setPageError('')
      let detailRequest = null
      try {
        const result = await supportApi.list()
        if (!active) return
        const records = Array.isArray(result) ? result : []
        setTickets(records)
        const firstId = records.length ? ticketIdentifier(records[0]) : null
        setSelectedId(firstId)
        if (firstId) {
          detailRequest = ++detailRequestRef.current
          setIsLoadingDetail(true)
          const detail = await supportApi.get(firstId)
          if (active && detailRequestRef.current === detailRequest) setSelectedTicket(detail)
        } else {
          detailRequest = ++detailRequestRef.current
          setSelectedTicket(null)
        }
      } catch (requestError) {
        if (active) setPageError(requestError.message || 'Unable to load support tickets.')
      } finally {
        if (active) {
          setIsLoading(false)
          if (detailRequest !== null && detailRequestRef.current === detailRequest) setIsLoadingDetail(false)
        }
      }
    }
    loadQueue()
    return () => { active = false }
  }, [canAccess])

  const filteredTickets = useMemo(() => {
    const search = query.trim().toLowerCase()
    return tickets.filter((ticket) => {
      const matchesQuery = !search || [
        ticketIdentifier(ticket), ticket.subject, ticket.raisedByName, ticket.customerName,
        ticket.providerName, ticket.relatedBookingId,
      ].some((value) => String(value || '').toLowerCase().includes(search))
      return matchesQuery
        && (!statusFilter || ticket.status === statusFilter)
        && (!priorityFilter || ticket.priority === priorityFilter)
        && (!raiserFilter || ticket.raisedByType === raiserFilter)
    })
  }, [priorityFilter, query, raiserFilter, statusFilter, tickets])

  async function loadQueueAndSelected(preferredId) {
    const result = await supportApi.list()
    const records = Array.isArray(result) ? result : []
    setTickets(records)
    const nextId = records.some((ticket) => String(ticketIdentifier(ticket)) === String(preferredId))
      ? preferredId
      : records.length ? ticketIdentifier(records[0]) : null
    setSelectedId(nextId)
    if (!nextId) {
      detailRequestRef.current += 1
      setSelectedTicket(null)
      setIsLoadingDetail(false)
      return
    }
    const detailRequest = ++detailRequestRef.current
    setSelectedTicket(null)
    setIsLoadingDetail(true)
    try {
      const detail = await supportApi.get(nextId)
      if (detailRequestRef.current === detailRequest) {
        setSelectedTicket(detail)
        setDetailError('')
      }
    } finally {
      if (detailRequestRef.current === detailRequest) setIsLoadingDetail(false)
    }
  }

  async function refreshTickets() {
    setIsRefreshing(true)
    setPageError('')
    setMutationError('')
    setNotice('')
    try {
      await loadQueueAndSelected(selectedId)
    } catch (requestError) {
      setPageError(requestError.message || 'Unable to refresh support tickets.')
    } finally {
      setIsRefreshing(false)
    }
  }

  async function selectTicket(id) {
    setSelectedId(id)
    setSelectedTicket(null)
    setDetailError('')
    setNotice('')
    setMutationError('')
    setIsLoadingDetail(true)
    const detailRequest = ++detailRequestRef.current
    try {
      const detail = await supportApi.get(id)
      if (detailRequestRef.current === detailRequest) setSelectedTicket(detail)
    } catch (requestError) {
      if (detailRequestRef.current === detailRequest) setDetailError(requestError.message || 'Unable to load this ticket.')
    } finally {
      if (detailRequestRef.current === detailRequest) setIsLoadingDetail(false)
    }
  }

  async function runMutation(action, successMessage) {
    if (!selectedTicket || mutationInFlightRef.current) return
    mutationInFlightRef.current = true
    setIsMutating(true)
    setMutationError('')
    setNotice('')
    setPageError('')
    try {
      await action()
      try {
        await loadQueueAndSelected(ticketIdentifier(selectedTicket))
      } catch (requestError) {
        setMutationError(`The update succeeded, but the refreshed ticket could not be loaded: ${requestError.message || 'Unknown error.'}`)
        return
      }
      setNotice(successMessage)
    } catch (requestError) {
      setMutationError(requestError.message || 'Unable to update this ticket.')
    } finally {
      mutationInFlightRef.current = false
      setIsMutating(false)
    }
  }

  function saveRemarks(remarks) {
    if (remarks.length < 5) {
      setMutationError('Support remarks must contain at least 5 characters.')
      return
    }
    runMutation(() => supportApi.updateRemarks(ticketIdentifier(selectedTicket), remarks), 'Support remarks saved.')
  }

  function changePriority(priority) {
    if (isMutating || isRefreshing || mutationInFlightRef.current) return false
    if (priority === 'Critical' && !window.confirm(
      'Setting this ticket to Critical will automatically escalate it to the admin review queue. Continue?',
    )) return false
    runMutation(
      () => supportApi.updatePriority(ticketIdentifier(selectedTicket), priority),
      priority === 'Critical' ? 'Priority updated. Critical priority is automatically escalated by the backend.' : 'Ticket priority updated.',
    )
    return true
  }

  function startWork() {
    runMutation(() => supportApi.updateStatus(ticketIdentifier(selectedTicket), 'In Progress'), 'Ticket moved to In Progress.')
  }

  function resolveTicket(remarks) {
    if (remarks.length < 10) {
      setMutationError('Resolution remarks must contain at least 10 characters.')
      return
    }
    if (!window.confirm('Resolve this ticket with the remarks provided?')) return
    runMutation(() => supportApi.resolve(ticketIdentifier(selectedTicket), remarks), 'Ticket resolved by support.')
  }

  function escalateTicket(remarks) {
    if (remarks.length < 5) {
      setMutationError('Escalation remarks must contain at least 5 characters.')
      return
    }
    if (!window.confirm('Escalate this ticket to the admin review queue?')) return
    runMutation(() => supportApi.escalate(ticketIdentifier(selectedTicket), remarks), 'Ticket escalated for admin review.')
  }

  if (!canAccess) {
    const roleMessage = isAuthenticated
      ? `Your current role (${role || 'unknown'}) cannot access support ticket management. Sign in with a support, admin, or superuser account.`
      : 'Sign in with a support, admin, or superuser account to manage support tickets. Customer demo sessions cannot access the support queue.'
    return <section className="support-tickets-page"><ErrorState message={roleMessage} /></section>
  }

  return <main className="support-tickets-page">
    <header className="support-page-header">
      <div>
        <p className="support-eyebrow">ServeEase support</p>
        <h1>Customer Support &amp; Tickets</h1>
        <p>Review customer and provider requests, track progress, and document support actions.</p>
      </div>
      <button className="support-button support-button--secondary" disabled={isRefreshing || isMutating} onClick={refreshTickets} type="button">
        {isRefreshing ? 'Refreshing…' : 'Refresh tickets'}
      </button>
    </header>

    {pageError && <ErrorState message={pageError} />}
    {mutationError && <ErrorState message={mutationError} />}
    {notice && <p className="support-success" role="status">{notice}</p>}

    <section aria-label="Ticket count summary" className="support-summary">
      <div className="support-summary-card"><span>Total tickets</span><strong>{tickets.length}</strong></div>
      {['Pending', 'In Progress', 'Escalated'].map((status) => <div className="support-summary-card" key={status}><span>{status}</span><strong>{tickets.filter((ticket) => ticket.status === status).length}</strong></div>)}
    </section>

    <section aria-label="Search and filter tickets" className="support-filters">
      <label className="support-search" htmlFor="support-ticket-search">Search tickets
        <input id="support-ticket-search" onChange={(event) => setQuery(event.target.value)} placeholder="Ticket ID, subject, name, booking…" type="search" value={query} />
      </label>
      <label htmlFor="support-status-filter">Status
        <select id="support-status-filter" onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
          <option value="">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
      </label>
      <label htmlFor="support-priority-filter">Priority
        <select id="support-priority-filter" onChange={(event) => setPriorityFilter(event.target.value)} value={priorityFilter}>
          <option value="">All priorities</option>{priorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
      </label>
      <label htmlFor="support-raiser-filter">Raised by
        <select id="support-raiser-filter" onChange={(event) => setRaiserFilter(event.target.value)} value={raiserFilter}>
          <option value="">Customers and providers</option><option value="customer">Customer</option><option value="provider">Provider</option>
        </select>
      </label>
    </section>

    {isLoading && <LoadingState message="Loading support tickets…" />}
    {!isLoading && !pageError && tickets.length === 0 && <EmptyState message="There are no tickets in the support queue." />}
    {!isLoading && tickets.length > 0 && <div className="support-workspace">
      <section aria-label="Support ticket queue" className="support-queue">
        <div className="support-queue-heading"><h2>Ticket queue</h2><span>{filteredTickets.length} shown</span></div>
        {filteredTickets.length === 0
          ? <EmptyState message="No tickets match the current search and filters." />
          : <ul className="support-ticket-list">{filteredTickets.map((ticket) => {
            const id = ticketIdentifier(ticket)
            return <li key={id}>
              <button aria-pressed={String(selectedId) === String(id)} className={`support-ticket-option${String(selectedId) === String(id) ? ' is-selected' : ''}`} disabled={isMutating || isLoadingDetail} onClick={() => selectTicket(id)} type="button">
                <span className="support-ticket-option__top"><strong>{displayValue(id)}</strong><span className={`support-priority support-priority--${String(ticket.priority || 'medium').toLowerCase()}`}>{displayValue(ticket.priority)}</span></span>
                <span className="support-ticket-option__subject">{displayValue(ticket.subject)}</span>
                <span className="support-ticket-option__meta">{displayValue(ticket.raisedByName)} · {displayValue(ticket.raisedByType)}</span>
                <span className="support-ticket-option__bottom"><span>{displayValue(ticket.relatedBookingId)}</span><span className={`support-status support-status--${statusClass(ticket.status)}`}>{displayValue(ticket.status)}</span></span>
              </button>
            </li>
          })}</ul>}
      </section>

      <div className="support-detail-column">
        {isLoadingDetail && <LoadingState message="Loading ticket details…" />}
        {detailError && <ErrorState message={detailError} />}
        {!isLoadingDetail && !detailError && selectedTicket && <TicketDetails
          disabled={isMutating || isRefreshing || isLoadingDetail}
          isMutating={isMutating}
          key={`${ticketIdentifier(selectedTicket)}-${selectedTicket.updatedAt || ''}-${selectedTicket.supportRemarks || ''}`}
          onEscalate={escalateTicket}
          onPriorityChange={changePriority}
          onRemarksSubmit={saveRemarks}
          onResolve={resolveTicket}
          onStartWork={startWork}
          ticket={selectedTicket}
        />}
        {!isLoadingDetail && !detailError && !selectedTicket && <EmptyState message="Select a ticket to view its details." />}
      </div>
    </div>}
  </main>
}
