import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ticketsApi } from '../../../services/api'
import { CustomerPageHeader, LoadState, OpsModal, TicketDetails, TicketStatus } from '../CustomerOpsParts'
import { filterTickets, formatDisplayDate, sortNewestFirst } from '../customerOperations'
import '../customerOperations.css'

// my-tickets.html + renderMyTicketsPage() (tickets.js), backed by GET /tickets/my-tickets and GET /tickets/:id.
// The search box lives in the page's own topbar (TicketsTopbar) and filters through the `q` parameter.
export default function CustomerTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const viewTicketId = searchParams.get('ticket') || ''
  const [load, setLoad] = useState({ state: 'loading', tickets: [], error: '' })

  const fetchTickets = useCallback(async () => {
    const records = await ticketsApi.listMine()
    if (!Array.isArray(records)) throw new Error('The ticket service returned an invalid response.')
    return sortNewestFirst(records)
  }, [])

  const reload = useCallback(() => {
    setLoad((current) => ({ ...current, state: 'loading', error: '' }))
    fetchTickets()
      .then((tickets) => setLoad({ state: 'ready', tickets, error: '' }))
      .catch((error) => setLoad({ state: 'error', tickets: [], error: error.message || 'Your tickets could not be loaded.' }))
  }, [fetchTickets])

  useEffect(() => {
    let active = true
    fetchTickets()
      .then((tickets) => { if (active) setLoad({ state: 'ready', tickets, error: '' }) })
      .catch((error) => { if (active) setLoad({ state: 'error', tickets: [], error: error.message || 'Your tickets could not be loaded.' }) })
    return () => { active = false }
  }, [fetchTickets])

  const visible = useMemo(() => filterTickets(load.tickets, query), [load.tickets, query])
  const selectedTicket = load.tickets.find((ticket) => ticket.ticketId === viewTicketId)

  function setParam(key, value, replace = false) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next, { replace })
  }

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Customer Dashboard', '/customer/dashboard'], ['My Tickets']]} description="Track ticket status, support investigation remarks, and final admin decisions." title="My Tickets" />
    <LoadState error={load.error} loadingText="Loading your tickets…" onRetry={reload} state={load.state} />
    {load.state === 'ready' && (visible.length ? <section aria-label="My tickets" className="ticket-list">{visible.map((ticket) => <article className="ticket-card" key={ticket.ticketId}>
      <div><h3>{ticket.ticketId}</h3><p>{ticket.ticketType} • {ticket.providerName || 'Provider not recorded'}</p></div>
      <TicketStatus status={ticket.status} />
      <div className="ticket-meta"><span>Booking: {ticket.relatedBookingId || 'Not provided'}</span><span>Raised: {formatDisplayDate(ticket.createdAt)}</span></div>
      <div className="ticket-meta"><span>Support: {ticket.supportRemarks ? 'Update available' : 'Pending review'}</span><span>Decision: {ticket.finalDecision || 'Awaiting decision'}</span></div>
      <button className="secondary-action" onClick={() => setParam('ticket', ticket.ticketId)} type="button">View Details</button>
    </article>)}</section> : <div className="empty-state-card">{query ? 'No tickets match your search.' : 'No tickets found.'}</div>)}

    {viewTicketId && <OpsModal labelId="my-ticket-title" onClose={() => setParam('ticket', '')} title="Ticket Details">
      <TicketDetails fallback={selectedTicket} key={viewTicketId} ticketId={viewTicketId} />
    </OpsModal>}
  </div>
}
