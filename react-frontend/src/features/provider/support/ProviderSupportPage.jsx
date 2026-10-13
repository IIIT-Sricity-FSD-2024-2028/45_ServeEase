import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../../services/api'
import '../../customer/support/customerSupport.css'

const ticketTypes = ['Payment Not Received', 'Verification Issue', 'Booking Assignment Issue', 'Technical Problem', 'Customer Misbehavior', 'Profile Update Request', 'Availability Issue', 'Account Suspension Appeal', 'Service Category Change', 'Other']
const blankForm = { ticketType: '', relatedBookingId: '', priority: 'Medium', subject: '', description: '' }

export function ProviderSupportPage() {
  const { currentUser } = useAuth()
  const [tickets, setTickets] = useState([])
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState(blankForm)
  const [loadState, setLoadState] = useState('loading')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let active = true
    Promise.allSettled([ticketsApi.listProvider(), bookingsApi.listForProvider()]).then(([ticketResult, bookingResult]) => {
      if (!active) return
      if (ticketResult.status === 'fulfilled') setTickets(Array.isArray(ticketResult.value) ? ticketResult.value : [])
      else setError(ticketResult.reason?.message || 'Your provider tickets could not be loaded.')
      if (bookingResult.status === 'fulfilled') setBookings(Array.isArray(bookingResult.value) ? bookingResult.value : [])
      setLoadState(ticketResult.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => { active = false }
  }, [])

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(''); setNotice('') }
  const selectedBooking = bookings.find((booking) => booking.id === form.relatedBookingId)

  async function submit(event) {
    event.preventDefault()
    if (!form.ticketType || !form.subject.trim() || form.description.trim().length < 10) { setError('Select a category and enter a subject with at least 10 characters of detail.'); return }
    setIsSaving(true); setError('')
    try {
      const created = await ticketsApi.createProvider({
        ticketType: form.ticketType, subject: form.subject.trim(), description: form.description.trim(), priority: form.priority,
        relatedBookingId: form.relatedBookingId || undefined, providerId: currentUser?.providerId || currentUser?.providerCatalogId || currentUser?.userId,
        providerName: currentUser?.organisationName || currentUser?.fullName, customerName: selectedBooking?.customerName, service: selectedBooking?.service,
      })
      setTickets((current) => [created, ...current]); setForm(blankForm); setNotice(`Ticket ${created.ticketId} was submitted.`)
    } catch (requestError) { setError(requestError.message || 'The ticket could not be submitted.') } finally { setIsSaving(false) }
  }

  return <section className="customer-support-page">
    <p className="customer-support-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link> › <strong>Provider Support Center</strong></p>
    <header className="customer-support-heading"><p>Provider care</p><h1>Provider Support Center</h1><span>Get help with payments, bookings, account issues, and platform support.</span></header>
    <div className="customer-support-layout"><aside className="customer-support-sidebar"><section className="customer-support-card"><h2>Quick contact</h2><p><strong>Phone support</strong><br />1800-123-4567</p><p><strong>Email support</strong><br />provider.support@serveease.com</p></section><section className="customer-support-card"><h2>Support guidance</h2><p>Select a related booking where applicable and include the relevant dates and details.</p><p>Attachments are not available in the React form yet.</p></section></aside><form className="customer-support-card customer-support-form" onSubmit={submit}><h2>Create support ticket</h2><label>Issue category<select required value={form.ticketType} onChange={(event) => update('ticketType', event.target.value)}><option value="">Select category</option>{ticketTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>Related booking<select value={form.relatedBookingId} onChange={(event) => update('relatedBookingId', event.target.value)}><option value="">General provider support</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} — {booking.service}</option>)}</select></label>{selectedBooking && <p className="customer-support-hint">Customer: {selectedBooking.customerName || '—'} · Service: {selectedBooking.service || '—'}</p>}<label>Priority<select value={form.priority} onChange={(event) => update('priority', event.target.value)}>{['Low', 'Medium', 'High', 'Critical'].map((priority) => <option key={priority}>{priority}</option>)}</select></label><label>Subject<input maxLength="120" required value={form.subject} onChange={(event) => update('subject', event.target.value)} /></label><label>Description<textarea maxLength="1000" minLength="10" required value={form.description} onChange={(event) => update('description', event.target.value)} /></label>{error && <ErrorState message={error} />}{notice && <p className="customer-support-notice" role="status">{notice}</p>}<button className="journey-button" disabled={isSaving} type="submit">{isSaving ? 'Submitting…' : 'Submit Ticket'}</button></form></div>
    <section className="customer-support-tickets"><h2>My support tickets</h2>{loadState === 'loading' && <LoadingState message="Loading your provider tickets…" />}{loadState === 'error' && <ErrorState message={error} />}{loadState === 'ready' && (tickets.length ? <div className="customer-support-ticket-list">{tickets.map((ticket) => <article className="customer-support-ticket" key={ticket.ticketId}><div><strong>{ticket.ticketId}</strong><h3>{ticket.subject}</h3><p>{ticket.relatedBookingId || 'General provider support'} · {ticket.priority}</p></div><span>{ticket.status}</span></article>)}</div> : <EmptyState message="You have not raised any provider support tickets yet." />)}</section>
  </section>
}
