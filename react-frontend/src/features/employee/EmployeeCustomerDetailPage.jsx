import { useCallback, useReducer } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { employeeOperationsApi } from '../../services/api'
import { formatPrice } from '../customer/customerOperations'
import { CustomerStatusAction, CustomerStatusDialog } from './CustomerStatusControls'
import { Breadcrumb, Chip, LoadState, Metric } from './EmployeeOpsParts'
import { customerDetailStats, customerStatusAction, display, initialStatusChange, statusChangeError, statusChangeNotice, statusChangeReducer } from './employeeOperations'
import { useOperationsData } from './useOperationsData'
import './employeeOperations.css'

function InfoField({ label, value }) {
  return <div className="info-field"><span>{label}</span><strong>{display(value)}</strong></div>
}

// customer-operations-detail.html: GET /employee/customer-operations/customers/:id, plus Suspend/Activate through
// PATCH .../customers/:id/status. The page shows a new status only after the server confirms it.
export default function EmployeeCustomerDetailPage() {
  const { customerId } = useParams()
  const request = useCallback(() => employeeOperationsApi.customer(customerId), [customerId])
  const { state, data, error, retry, update } = useOperationsData(request)
  const [change, dispatch] = useReducer(statusChangeReducer, initialStatusChange)
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notFound = state === 'error' && /not found/i.test(error)
  const customer = data?.customer
  const bookings = data?.bookings || []
  const tickets = data?.tickets || []
  const stats = customerDetailStats(bookings, tickets)
  const action = customerStatusAction(customer)

  const confirmStatusChange = async ({ reason, remarks }) => {
    dispatch({ type: 'submit' })
    try {
      const result = await employeeOperationsApi.setCustomerStatus(customer.id, { status: change.nextStatus, reason, remarks })
      update((current) => ({ ...current, customer: result.customer }))
      dispatch({ type: 'succeeded', message: statusChangeNotice(result) })
    } catch (requestError) {
      dispatch({ type: 'failed', message: statusChangeError(requestError) })
    }
  }
  // The stored session is no longer accepted: clear it so the login page does not bounce back here.
  const signInAgain = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: location.pathname } })
  }

  return <div className="employee-ops">
    <Breadcrumb items={[['Home', '/'], ['Employee'], ['Customer Operations', '/employee/customer-operations'], ['Customer Profile']]} />
    <Link className="back-link" to="/employee/customer-operations">← Back to Customer Operations</Link>
    <section aria-labelledby="customer-detail-title" className="ops-hero ops-hero--detail">
      <h1 id="customer-detail-title">Customer Profile</h1>
      <p>Customer information and operational activity</p>
      {customer && <span>{display(customer.fullName)}</span>}
    </section>

    {notFound ? <section className="ops-state" role="alert">
      <h2>Customer not found.</h2>
      <p>The selected customer ID does not match an existing ServeEase customer record.</p>
      <Link className="btn btn-outline" to="/employee/customer-operations">← Back to Customer Operations</Link>
    </section> : <LoadState error={error} loadingText="Loading customer profile…" onRetry={retry} state={state} />}

    {state === 'ready' && customer && <>
      <section aria-labelledby="customer-information-title" className="ops-panel ops-panel--detail">
        <div className="ops-panel-head"><h2 id="customer-information-title">Customer Information</h2></div>
        <div className="info-grid">
          <InfoField label="Customer ID" value={customer.id} />
          <InfoField label="Full Name" value={customer.fullName} />
          <InfoField label="Email" value={customer.email} />
          <InfoField label="Phone" value={customer.phone} />
          <InfoField label="Location" value={customer.location} />
          <InfoField label="Registration Date" value={customer.registrationDate} />
          <InfoField label="Account Status" value={customer.status} />
        </div>
        <CustomerStatusAction action={action} change={change} onOpen={() => dispatch({ type: 'open', nextStatus: action.nextStatus })} status={customer.status} />
      </section>
      {change.phase !== 'idle' && action && <CustomerStatusDialog
        action={action}
        change={change}
        customerName={display(customer.fullName)}
        onCancel={() => dispatch({ type: 'cancel' })}
        onConfirm={confirmStatusChange}
        onInvalid={(message) => dispatch({ type: 'invalid', message })}
        onSignIn={signInAgain}
      />}

      <section aria-label="Selected customer statistics" className="ops-stats ops-stats--four">
        <Metric description="All linked customer bookings" icon="📅" label="Total Bookings" value={stats.total} />
        <Metric description="Pending or accepted bookings" icon="🟢" label="Active / Upcoming Bookings" value={stats.active} />
        <Metric description="Completed booking records" icon="✓" label="Completed Bookings" value={stats.completed} />
        <Metric description="Open operational support items" icon="🎟" label="Open Support Tickets" value={stats.openTickets} />
      </section>

      <section aria-labelledby="customer-bookings-title" className="ops-panel ops-panel--detail">
        <div className="ops-panel-head"><h2 id="customer-bookings-title">Customer Booking Activity</h2><span>{bookings.length} records</span></div>
        <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th scope="col">Booking ID</th><th scope="col">Service</th><th scope="col">Provider</th><th scope="col">Date / Time</th><th scope="col">Status</th><th scope="col">Payment</th></tr></thead>
          <tbody>{bookings.length ? bookings.map((booking) => <tr key={booking.id}>
            <td>{booking.id}</td><td>{display(booking.service)}</td><td>{display(booking.provider)}</td>
            <td>{display(booking.date)}{booking.time ? ` · ${booking.time}` : ''}</td>
            <td><Chip value={booking.status} /></td>
            <td>{booking.total === null || booking.total === undefined ? display(booking.paymentStatus) : `${formatPrice(booking.total)} · ${display(booking.paymentStatus)}`}</td>
          </tr>) : <tr><td colSpan="6"><div className="ops-empty">No bookings are linked to this customer.</div></td></tr>}</tbody>
        </table></div>
      </section>

      <section aria-labelledby="customer-tickets-title" className="ops-panel ops-panel--detail">
        <div className="ops-panel-head"><h2 id="customer-tickets-title">Customer Support Tickets</h2><span>{tickets.length} records</span></div>
        <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th scope="col">Ticket ID</th><th scope="col">Booking Reference</th><th scope="col">Subject</th><th scope="col">Category</th><th scope="col">Status</th><th scope="col">Created</th></tr></thead>
          <tbody>{tickets.length ? tickets.map((ticket) => <tr key={ticket.ticketId}>
            <td>{ticket.ticketId}</td><td>{display(ticket.relatedBookingId)}</td><td>{display(ticket.subject)}</td><td>{display(ticket.ticketType)}</td>
            <td><Chip value={ticket.status} /></td><td>{display(ticket.createdAt?.slice(0, 10))}</td>
          </tr>) : <tr><td colSpan="6"><div className="ops-empty">No support tickets are linked to this customer.</div></td></tr>}</tbody>
        </table></div>
      </section>
    </>}
  </div>
}
