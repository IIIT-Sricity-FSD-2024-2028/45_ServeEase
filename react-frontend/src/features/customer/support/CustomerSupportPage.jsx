import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { ticketsApi } from '../../../services/api'
import './customerSupport.css'

const ticketTypes = ['Poor Service Quality', 'Provider Not Arrived', 'Late Arrival', 'Overcharging', 'Misbehavior', 'Payment Issue', 'Service Not Completed', 'Refund Request', 'Fraud', 'Safety Concern', 'Other']
const blankForm = { bookingId: '', ticketType: '', subject: '', description: '' }

function formatDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

export default function CustomerSupportPage() {
  const { currentUser } = useAuth()
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState(blankForm)
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    ticketsApi.listMine()
      .then((records) => { if (active) { setTickets(Array.isArray(records) ? records : []); setLoadState('ready') } })
      .catch((requestError) => { if (active) { setError(requestError.message || 'Your support tickets could not be loaded.'); setLoadState('error') } })
    return () => { active = false }
  }, [])

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(''); setNotice('') }

  async function submit(event) {
    event.preventDefault()
    if (!form.bookingId.trim() || !form.ticketType || form.description.trim().length < 10) {
      setError('Enter a booking reference, issue category, and at least 10 characters of detail.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      const created = await ticketsApi.createCustomer({
        bookingId: form.bookingId.trim(),
        ticketType: form.ticketType,
        subject: form.subject.trim() || undefined,
        description: form.description.trim(),
        customerId: currentUser?.userId,
        customerName: currentUser?.fullName || currentUser?.name,
      })
      setTickets((current) => [created, ...current])
      setForm(blankForm)
      setNotice(`Ticket ${created.ticketId} was submitted.`)
    } catch (requestError) {
      setError(requestError.message || 'The ticket could not be submitted.')
    } finally { setIsSaving(false) }
  }

  return <section className="customer-support-page">
    <p className="customer-support-breadcrumb"><Link to="/">Home</Link> › <Link to="/customer/dashboard">Customer Dashboard</Link> › <strong>Support Center</strong></p>
    <header className="customer-support-heading"><p>Customer care</p><h1>Customer Support Center</h1><span>Get help with bookings, payments, or service issues.</span></header>
    <div className="customer-support-layout">
      <form className="customer-support-card customer-support-form" onSubmit={submit}>
        <h2>Raise a support ticket</h2>
        <label>Booking reference number<input maxLength="80" onChange={(event) => update('bookingId', event.target.value)} placeholder="Enter booking reference number" required value={form.bookingId} /></label>
        <label>Issue category<select onChange={(event) => update('ticketType', event.target.value)} required value={form.ticketType}><option value="">Select issue category</option>{ticketTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Subject (optional)<input maxLength="120" onChange={(event) => update('subject', event.target.value)} placeholder="Brief description of your issue" value={form.subject} /></label>
        <label>Description<textarea maxLength="1000" minLength="10" onChange={(event) => update('description', event.target.value)} placeholder="Provide detailed information about your issue" required value={form.description} /></label>
        <p className="customer-support-hint">Attachments are not available in the React support form yet.</p>
        {error && <ErrorState message={error} />}{notice && <p className="customer-support-notice" role="status">{notice}</p>}
        <button className="journey-button" disabled={isSaving} type="submit">{isSaving ? 'Submitting…' : 'Submit Ticket'}</button>
      </form>
      <aside className="customer-support-sidebar">
        <section className="customer-support-card"><h2>Help resources</h2><details><summary>How can I track a booking?</summary><p>Open My Bookings to review the latest booking status.</p></details><details><summary>When will I receive a refund?</summary><p>Refund handling depends on the booking review and payment workflow.</p></details><details><summary>What if a provider is late?</summary><p>Raise a ticket with the booking reference and relevant details.</p></details><details><summary>How do I report a payment issue?</summary><p>Select Payment Issue and include the booking reference.</p></details></section>
        <section className="customer-support-card customer-support-contact"><h2>Need immediate help?</h2><p>Our support team is available 24/7.</p><p>📞 +91 1800-123-4567</p><p>✉ support@serveease.com</p></section>
      </aside>
    </div>
    <section className="customer-support-tickets"><h2>My support tickets</h2>{loadState === 'loading' && <LoadingState message="Loading your support tickets…" />}{loadState === 'error' && <ErrorState message={error} />}{loadState === 'ready' && (tickets.length ? <div className="customer-support-ticket-list">{tickets.map((ticket) => <article className="customer-support-ticket" key={ticket.ticketId}><div><strong>{ticket.ticketId}</strong><h3>{ticket.subject || ticket.ticketType}</h3><p>{ticket.relatedBookingId || 'No booking reference'} · {formatDate(ticket.createdAt)}</p></div><span>{ticket.status}</span></article>)}</div> : <EmptyState message="You have not raised any support tickets yet." />)}</section>
  </section>
}
