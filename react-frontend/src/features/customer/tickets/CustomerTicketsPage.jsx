import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../../../store/hooks.js'
import {
  fetchCustomerTickets, selectTicketListFetchError, selectTicketListFetchStatus, selectTicketsForScope, ticketEntityKey,
} from '../../../store/slices/ticketsSlice.js'
import { CustomerPageHeader, LoadState, OpsModal, TicketDetails, TicketStatus } from '../CustomerOpsParts'
import { filterTickets, formatDisplayDate, sortNewestFirst } from '../customerOperations'
import '../customerOperations.css'

// my-tickets.html + renderMyTicketsPage() (tickets.js), backed by GET /tickets/my-tickets and GET /tickets/:id.
// The search box lives in the page's own topbar (TicketsTopbar) and filters through the `q` parameter.
export default function CustomerTicketsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const dispatch = useAppDispatch()
  const tickets = useAppSelector(selectTicketsForScope('customer'))
  const fetchStatus = useAppSelector(selectTicketListFetchStatus('customer'))
  const fetchError = useAppSelector(selectTicketListFetchError('customer'))
  const query = searchParams.get('q') || ''
  const viewTicketId = searchParams.get('ticket') || ''
  const loadState = fetchStatus === 'failed' ? 'error' : fetchStatus === 'succeeded' ? 'ready' : 'loading'

  useEffect(() => {
    dispatch(fetchCustomerTickets())
  }, [dispatch])

  const sortedTickets = useMemo(() => sortNewestFirst(tickets), [tickets])
  const visible = useMemo(() => filterTickets(sortedTickets, query), [sortedTickets, query])
  const selectedTicket = sortedTickets.find((ticket) => ticketEntityKey(ticket) === viewTicketId)

  function setParam(key, value, replace = false) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next, { replace })
  }

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Customer Dashboard', '/customer/dashboard'], ['My Tickets']]} description="Track ticket status, support investigation remarks, and final admin decisions." title="My Tickets" />
    <LoadState error={fetchError || 'Your tickets could not be loaded.'} loadingText="Loading your tickets…" onRetry={() => dispatch(fetchCustomerTickets())} state={loadState} />
    {loadState === 'ready' && (visible.length ? <section aria-label="My tickets" className="ticket-list">{visible.map((ticket) => <article className="ticket-card" key={ticketEntityKey(ticket)}>
      <div><h3>{ticketEntityKey(ticket)}</h3><p>{ticket.ticketType} • {ticket.providerName || 'Provider not recorded'}</p></div>
      <TicketStatus status={ticket.status} />
      <div className="ticket-meta"><span>Booking: {ticket.relatedBookingId || 'Not provided'}</span><span>Raised: {formatDisplayDate(ticket.createdAt)}</span></div>
      <div className="ticket-meta"><span>Support: {ticket.supportUpdate ? 'Update available' : 'Pending review'}</span><span>Decision: {ticket.finalDecision || 'Awaiting decision'}</span></div>
      <button className="secondary-action" onClick={() => setParam('ticket', ticketEntityKey(ticket))} type="button">View Details</button>
    </article>)}</section> : <div className="empty-state-card">{query ? 'No tickets match your search.' : 'No tickets found.'}</div>)}

    {viewTicketId && <OpsModal labelId="my-ticket-title" onClose={() => setParam('ticket', '')} title="Ticket Details">
      <TicketDetails fallback={selectedTicket} key={viewTicketId} ticketId={viewTicketId} />
    </OpsModal>}
  </div>
}
