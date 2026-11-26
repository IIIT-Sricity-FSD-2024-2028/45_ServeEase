import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import {
  fetchSupportTickets, selectTicketListFetchError, selectTicketListFetchStatus,
  selectTicketsForScope, ticketEntityKey,
} from '../../store/slices/ticketsSlice.js'
import { useAuth } from '../../context/useAuth'
import { markNotificationsRead } from '../../store/slices/notificationSlice.js'
import { buildSupportNotifications } from './supportNotifications'
import './support.css'
export { default as SupportTicketDetailPage } from './SupportTicketDetailPage'

const statusClass = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
const formatCreatedDate = (value) => {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
export function SupportDashboardPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const tickets = useAppSelector(selectTicketsForScope('support'))
  const fetchStatus = useAppSelector(selectTicketListFetchStatus('support'))
  const fetchError = useAppSelector(selectTicketListFetchError('support'))
  const [settledFetchStatus, setSettledFetchStatus] = useState(fetchStatus)
  const visibleFetchStatus = fetchStatus === 'loading' ? settledFetchStatus : fetchStatus
  const loading = visibleFetchStatus === 'idle' || visibleFetchStatus === 'loading'
  const [query, setQuery] = useState(() => (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search') || ''))
  const [queue, setQueue] = useState('all')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const readVersion = useAppSelector((state) => state.notification.readVersion)

  useEffect(() => {
    const handleSearch = (event) => setQuery(String(event.detail || ''))
    window.addEventListener('serveease-ticket-search', handleSearch)
    return () => window.removeEventListener('serveease-ticket-search', handleSearch)
  }, [])

  function openNotification(notification) {
    dispatch(markNotificationsRead({ kind: 'support', user: currentUser, ids: [notification.id] }))
  }
  useEffect(() => {
    let active = true
    dispatch(fetchSupportTickets()).then((action) => {
      if (active) setSettledFetchStatus(action.meta.requestStatus === 'fulfilled' ? 'succeeded' : 'failed')
    })
    return () => { active = false }
  }, [dispatch])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const notifications = useMemo(() => buildSupportNotifications(tickets, currentUser), [tickets, currentUser, readVersion])
  const visibleTickets = useMemo(() => tickets.filter((ticket) => {
    const text = [ticket.ticketId, ticket.subject, ticket.raisedByName, ticket.customerName, ticket.providerName, ticket.relatedBookingId, ticket.bookingReference].join(' ').toLowerCase()
    const matchesQueue = queue === 'all' || (queue === 'escalated' ? ticket.status === 'Escalated' || Boolean(ticket.escalatedAt) : ticket.raisedByType === queue)
    return (!query || text.includes(query.trim().toLowerCase())) && matchesQueue && (!status || ticket.status === status) && (!priority || ticket.priority === priority)
  }), [tickets, query, queue, status, priority])
  const count = (statuses) => tickets.filter((ticket) => statuses.includes(ticket.status)).length
  const assigned = tickets.filter((ticket) => Boolean(ticket.assignedTo || ticket.assignedSupportName) && !['Resolved', 'Rejected'].includes(ticket.status)).length
  return <section className="support-page support-dashboard">
    <h1 className="support-dashboard-title">Customer Support Dashboard</h1>
    <header className="support-hero"><h2>Welcome, Support Agent {currentUser?.fullName || 'Support Employee'}!</h2><span>Monitor and resolve customer issues efficiently.</span></header>
    <div className="support-stats">{[['Open Tickets',count(['Open','Pending']),'open'],['Assigned Tickets',assigned,'assigned'],['Pending Tickets',count(['Open','Pending']),'pending'],['Resolved Tickets',count(['Resolved','Rejected']),'resolved']].map(([label,value,icon])=><article key={label}><span className={`support-stat-icon ${icon}`} aria-hidden="true">{icon==='open'?<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>:icon==='assigned'?<svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>:<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>}</span><strong>{value}</strong><span>{label}</span></article>)}</div>
    <div className="support-overview-heading"><h2>Ticket Overview (<span>{visibleTickets.length}</span>)</h2></div>
    <div className="support-filter-row"><div className="support-queues" role="group" aria-label="Support queues">{['all','customer','provider','escalated'].map((item)=><button aria-pressed={queue===item} className={queue===item?'active':''} key={item} onClick={()=>setQueue(item)} type="button">{item[0].toUpperCase()+item.slice(1)}</button>)}</div><div className="support-selects"><select aria-label="Filter by status" onChange={(event)=>setStatus(event.target.value)} value={status}><option value="">All statuses</option>{[...new Set(tickets.map((ticket)=>ticket.status).filter(Boolean))].sort().map((item)=><option key={item}>{item}</option>)}</select><select aria-label="Filter by priority" onChange={(event)=>setPriority(event.target.value)} value={priority}><option value="">All priorities</option>{[...new Set(tickets.map((ticket)=>ticket.priority).filter(Boolean))].sort().map((item)=><option key={item}>{item}</option>)}</select></div></div>
    {loading&&<LoadingState message="Loading support tickets…"/>}{visibleFetchStatus === 'failed'&&<ErrorState message={fetchError || 'Support tickets could not be loaded.'}/>}
    {!loading&&visibleFetchStatus !== 'failed'&&<div className="support-dashboard-layout"><section className="support-ticket-list" aria-label="Support tickets">{visibleTickets.length?visibleTickets.map((ticket)=><article className="support-ticket-card" key={ticketEntityKey(ticket)}><div className="support-ticket-top"><div className="support-ticket-content"><h3>{ticketEntityKey(ticket)}</h3><p>Provider: {ticket.providerName||'ServeEase Provider'}</p>{ticket.customerName&&<p>Related Customer: {ticket.customerName}</p>}<p>Booking: {ticket.relatedBookingId||ticket.bookingReference||'N/A'}</p><p>Created: {formatCreatedDate(ticket.createdAt)}</p></div><div className="support-ticket-tags"><span className={`support-role-badge ${ticket.raisedByType==='provider'?'provider':'customer'}`}>{ticket.raisedByType==='provider'?'Provider':'Customer'}</span><span className={`support-status-badge ${statusClass(ticket.status)}`}>{ticket.status}</span><span className={`support-status-badge ${statusClass(ticket.priority||'Medium')}`}>{ticket.priority||'Medium'}</span></div></div><div className="support-ticket-body"><strong>{ticket.ticketType||ticket.issueCategory||'General Support'}</strong><p>{ticket.subject}</p></div><Link className="support-ticket-action" to={`/employee/support-tickets/${encodeURIComponent(ticketEntityKey(ticket))}`}>View Ticket Details</Link></article>):<div className="support-empty-state"><h3>No support tickets match the selected filters.</h3><p>Adjust the queue, status, priority, or search to see more tickets.</p><button className="support-empty-clear" onClick={()=>{setQuery('');setStatus('');setPriority('');setQueue('all')}} type="button">Clear Search</button></div>}</section>
      <aside className="support-notifications panel-card" id="support-notifications"><div className="support-notifications-heading"><h2>Notifications</h2><span>{notifications.filter((item)=>item.isUnread).length} New</span></div>{notifications.length?<div className="support-notification-list">{notifications.map((item)=><button className={`support-notification-item${item.isUnread?'':' read'}`} key={item.id} onClick={()=>{openNotification(item);navigate(item.to)}} type="button"><span>{item.text||'Ticket update'}</span><small>{item.createdAt?formatCreatedDate(item.createdAt):''}</small></button>)}</div>:<p className="support-notifications-empty">No notifications to display.</p>}<button className="support-notifications-all" onClick={()=>document.getElementById('support-notifications')?.scrollIntoView({behavior:'smooth'})} type="button">View All Notifications</button></aside>
    </div>}
  </section>
}
