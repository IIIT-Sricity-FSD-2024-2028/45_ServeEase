import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { ticketsApi } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import './support.css'
export { default as SupportTicketDetailPage } from './SupportTicketDetailPage'

const statusClass = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
const formatCreatedDate = (value) => {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}
function applySavedTicketStatuses(tickets) {
  try {
    const saved = JSON.parse(localStorage.getItem('serveEaseSupportTicketDetails') || '{}')
    return tickets.map((ticket) => saved[ticket.ticketId]?.status ? { ...ticket, status: saved[ticket.ticketId].status } : ticket)
  } catch { return tickets }
}
export function SupportDashboardPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState({ loading: true, tickets: [], error: '' })
  const [query, setQuery] = useState(() => (typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('search') || ''))
  const [queue, setQueue] = useState('all')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [notifications, setNotifications] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('serveEaseSupportModuleData') || 'null')
      return Array.isArray(stored?.notifications) ? stored.notifications : []
    } catch { return [] }
  })

  useEffect(() => {
    const handleSearch = (event) => setQuery(String(event.detail || ''))
    window.addEventListener('serveease-ticket-search', handleSearch)
    return () => window.removeEventListener('serveease-ticket-search', handleSearch)
  }, [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('serveease-notifications-count', {
      detail: notifications.filter((item) => item.read !== true && item.isNew !== false).length,
    }))
  }, [notifications])

  function openNotification(notification) {
    const updated = notifications.map((item) => item.id === notification.id ? { ...item, read: true, isRead: true, isNew: false } : item)
    setNotifications(updated)
    try {
      const stored = JSON.parse(localStorage.getItem('serveEaseSupportModuleData') || '{}')
      localStorage.setItem('serveEaseSupportModuleData', JSON.stringify({ ...stored, notifications: updated }))
    } catch { /* keep the read state for this view if storage is unavailable */ }
  }
  useEffect(() => {
    ticketsApi.listForSupport()
      .then((tickets) => setState({ loading: false, tickets: applySavedTicketStatuses(Array.isArray(tickets) ? tickets : []), error: '' }))
      .catch((error) => setState({ loading: false, tickets: [], error: error.message }))
  }, [])
  const tickets = useMemo(() => state.tickets.filter((ticket) => {
    const text = [ticket.ticketId, ticket.subject, ticket.raisedByName, ticket.customerName, ticket.providerName, ticket.relatedBookingId, ticket.bookingReference].join(' ').toLowerCase()
    const matchesQueue = queue === 'all' || (queue === 'escalated' ? ticket.status === 'Escalated' || Boolean(ticket.escalatedAt) : ticket.raisedByType === queue)
    return (!query || text.includes(query.trim().toLowerCase())) && matchesQueue && (!status || ticket.status === status) && (!priority || ticket.priority === priority)
  }), [state.tickets, query, queue, status, priority])
  const count = (statuses) => state.tickets.filter((ticket) => statuses.includes(ticket.status)).length
  const assigned = state.tickets.filter((ticket) => Boolean(ticket.assignedTo || ticket.assignedSupportName) && !['Resolved', 'Rejected'].includes(ticket.status)).length
  return <section className="support-page support-dashboard">
    <h1 className="support-dashboard-title">Customer Support Dashboard</h1>
    <header className="support-hero"><h2>Welcome, Support Agent {currentUser?.fullName || 'Support Employee'}!</h2><span>Monitor and resolve customer issues efficiently.</span></header>
    <div className="support-stats">{[['Open Tickets',count(['Open','Pending']),'open'],['Assigned Tickets',assigned,'assigned'],['Pending Tickets',count(['Open','Pending']),'pending'],['Resolved Tickets',count(['Resolved','Resolved by Support','Rejected']),'resolved']].map(([label,value,icon])=><article key={label}><span className={`support-stat-icon ${icon}`} aria-hidden="true">{icon==='open'?<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/></svg>:icon==='assigned'?<svg viewBox="0 0 24 24"><path d="M12 19V5m-6 6 6-6 6 6"/></svg>:<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>}</span><strong>{value}</strong><span>{label}</span></article>)}</div>
    <div className="support-overview-heading"><h2>Ticket Overview (<span>{tickets.length}</span>)</h2></div>
    <div className="support-filter-row"><div className="support-queues" role="group" aria-label="Support queues">{['all','customer','provider','escalated'].map((item)=><button aria-pressed={queue===item} className={queue===item?'active':''} key={item} onClick={()=>setQueue(item)} type="button">{item[0].toUpperCase()+item.slice(1)}</button>)}</div><div className="support-selects"><select aria-label="Filter by status" onChange={(event)=>setStatus(event.target.value)} value={status}><option value="">All statuses</option>{[...new Set(state.tickets.map((ticket)=>ticket.status).filter(Boolean))].sort().map((item)=><option key={item}>{item}</option>)}</select><select aria-label="Filter by priority" onChange={(event)=>setPriority(event.target.value)} value={priority}><option value="">All priorities</option>{[...new Set(state.tickets.map((ticket)=>ticket.priority).filter(Boolean))].sort().map((item)=><option key={item}>{item}</option>)}</select></div></div>
    {state.loading&&<LoadingState message="Loading support tickets…"/>}{state.error&&<ErrorState message={state.error}/>}
    {!state.loading&&!state.error&&<div className="support-dashboard-layout"><section className="support-ticket-list" aria-label="Support tickets">{tickets.length?tickets.map((ticket)=><article className="support-ticket-card" key={ticket.ticketId}><div className="support-ticket-top"><div className="support-ticket-content"><h3>{ticket.ticketId}</h3><p>Provider: {ticket.providerName||'ServeEase Provider'}</p>{ticket.customerName&&<p>Related Customer: {ticket.customerName}</p>}<p>Booking: {ticket.relatedBookingId||ticket.bookingReference||'N/A'}</p><p>Created: {formatCreatedDate(ticket.createdAt)}</p></div><div className="support-ticket-tags"><span className={`support-role-badge ${ticket.raisedByType==='provider'?'provider':'customer'}`}>{ticket.raisedByType==='provider'?'Provider':'Customer'}</span><span className={`support-status-badge ${statusClass(ticket.status)}`}>{ticket.status}</span><span className={`support-status-badge ${statusClass(ticket.priority||'Medium')}`}>{ticket.priority||'Medium'}</span></div></div><div className="support-ticket-body"><strong>{ticket.ticketType||ticket.issueCategory||'General Support'}</strong><p>{ticket.subject}</p></div><Link className="support-ticket-action" to={`/employee/support-tickets/${encodeURIComponent(ticket.ticketId)}`}>View Ticket Details</Link></article>):<div className="support-empty-state"><h3>No support tickets match the selected filters.</h3><p>Adjust the queue, status, priority, or search to see more tickets.</p><button className="support-empty-clear" onClick={()=>{setQuery('');setStatus('');setPriority('');setQueue('all')}} type="button">Clear Search</button></div>}</section>
      <aside className="support-notifications panel-card" id="support-notifications"><div className="support-notifications-heading"><h2>Notifications</h2><span>{notifications.filter((item)=>item.read!==true&&item.isNew!==false).length} New</span></div>{notifications.length?<div className="support-notification-list">{notifications.map((item)=><button className={`support-notification-item${item.read===true||item.isNew===false?' read':''}`} key={item.id} onClick={()=>{openNotification(item);if(item.ticketId)navigate(`/employee/support-tickets/${encodeURIComponent(item.ticketId)}`)}} type="button"><span>{item.text||'Ticket update'}</span><small>{item.time||item.createdAt||''}</small></button>)}</div>:<p className="support-notifications-empty">No notifications to display.</p>}<button className="support-notifications-all" onClick={()=>document.getElementById('support-notifications')?.scrollIntoView({behavior:'smooth'})} type="button">View All Notifications</button></aside>
    </div>}
  </section>
}
