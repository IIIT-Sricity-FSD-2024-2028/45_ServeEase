import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../../services/api'
import './providerSupport.css'

const ticketTypes = ['Payment Not Received', 'Verification Issue', 'Booking Assignment Issue', 'Customer Misbehavior', 'Technical Problem', 'Service Category Change', 'Availability Issue', 'Account Suspension Appeal', 'Other']
const priorities = ['Medium', 'Low', 'High', 'Critical']
const faqItems = [
  ['How do I manage booking requests?', 'Go to Booking Management to accept, reject, or complete requests. You can also open View Details to see the full booking information.'],
  ['Where can I view my payout details?', 'Open Earnings & Payments to review transaction history, pending payouts, and processed payment details.'],
  ['How do I contact customer support?', 'Create a support ticket from this page for assistance with your provider account, bookings, or payments.'],
  ['How do I update my availability?', 'Open your provider availability settings from the dashboard, update the days and hours you can accept bookings, and save your changes.'],
  ['How do I update my service details?', 'Open Manage Services, select the service you want to change, update its details, and save the changes so customers see the latest information.'],
]
const blankForm = { ticketType: '', relatedBookingId: '', priority: 'Medium', subject: '', description: '' }
const allowedAttachmentTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const allowedAttachmentExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.webp']
const maxAttachmentSize = 5 * 1024 * 1024

function formatDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

function statusClass(value) { return String(value || 'pending').toLowerCase().replace(/\s+/g, '-') }
function ticketId(ticket) { return ticket?.ticketId || ticket?.id || 'Ticket reference unavailable' }

function attachmentIsSupported(file) {
  const extension = `.${String(file.name || '').split('.').pop()}`.toLowerCase()
  return allowedAttachmentTypes.includes(file.type) && allowedAttachmentExtensions.includes(extension)
}

function TicketDetailsModal({ ticket, onClose }) {
  if (!ticket) return null
  return <div aria-label="Support ticket details" className="provider-support-modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()} role="presentation">
    <section aria-labelledby="provider-ticket-details-title" aria-modal="true" className="provider-support-modal" role="dialog">
      <div className="provider-support-modal-head"><h2 id="provider-ticket-details-title">Support Ticket Details</h2><button aria-label="Close ticket details" className="provider-support-close" onClick={onClose} type="button">×</button></div>
      <div className="provider-support-detail-grid">
        <div className="provider-support-detail-box"><strong>Ticket Information</strong><p><span>Ticket ID:</span><b>{ticketId(ticket)}</b></p><p><span>Status:</span><b className={`provider-support-status ${statusClass(ticket.status)}`}>{ticket.status || 'Pending'}</b></p><p><span>Created On:</span><b>{formatDate(ticket.createdAt)}</b></p></div>
        <div className="provider-support-detail-box"><strong>Issue Summary</strong><p><span>Booking Ref:</span><b>{ticket.relatedBookingId || 'General provider support'}</b></p><p><span>Related Customer:</span><b>{ticket.customerName || 'N/A'}</b></p><p><span>Service:</span><b>{ticket.service || 'N/A'}</b></p><p><span>Priority:</span><b>{ticket.priority || 'Medium'}</b></p><p><span>Category:</span><b>{ticket.ticketType || 'Other'}</b></p><p><span>Subject:</span><b>{ticket.subject || ticket.ticketType || 'Provider support request'}</b></p></div>
        <div className="provider-support-detail-box"><strong>Description</strong><p className="provider-support-detail-copy">{ticket.description || 'No description provided.'}</p>{ticket.attachmentUrl && <a href={ticket.attachmentUrl} rel="noreferrer" target="_blank">Preview attachment</a>}</div>
        <div className="provider-support-detail-box"><strong>Support Update</strong><p className="provider-support-detail-copy">{ticket.supportUpdate || ticket.supportRemarks || 'Your ticket has been received and is currently being reviewed by the support team.'}</p></div>
      </div>
    </section>
  </div>
}

export function ProviderSupportPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const [tickets, setTickets] = useState([])
  const [bookings, setBookings] = useState([])
  const [form, setForm] = useState(blankForm)
  const [attachment, setAttachment] = useState(null)
  const [attachmentInputKey, setAttachmentInputKey] = useState(0)
  const [faqOpen, setFaqOpen] = useState(null)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!isAuthenticated || role !== 'provider') return undefined
    let active = true
    Promise.allSettled([ticketsApi.listProvider(), bookingsApi.listForProvider()]).then(([ticketResult, bookingResult]) => {
      if (!active) return
      if (ticketResult.status === 'fulfilled') setTickets(Array.isArray(ticketResult.value) ? ticketResult.value : [])
      else setError(ticketResult.reason?.message || 'Your provider tickets could not be loaded.')
      if (bookingResult.status === 'fulfilled') setBookings(Array.isArray(bookingResult.value) ? bookingResult.value : [])
      setLoadState(ticketResult.status === 'fulfilled' ? 'ready' : 'error')
    })
    return () => { active = false }
  }, [isAuthenticated, role])

  const selectedBooking = useMemo(() => bookings.find((booking) => booking.id === form.relatedBookingId), [bookings, form.relatedBookingId])
  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(''); setNotice('') }

  function handleAttachment(event) {
    const file = event.target.files?.[0] || null
    setError('')
    if (!file) { setAttachment(null); return }
    if (!attachmentIsSupported(file)) { setAttachment(null); setError('Attachment must be a PDF, JPG, PNG, or WEBP file.'); event.target.value = ''; return }
    if (file.size > maxAttachmentSize) { setAttachment(null); setError('Attachment must be 5 MB or smaller.'); event.target.value = ''; return }
    setAttachment(file)
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.ticketType || !form.subject.trim() || form.description.trim().length < 10) { setError('Select a category and enter a subject with at least 10 characters of detail.'); return }
    setIsSaving(true); setError(''); setNotice('')
    try {
      let uploaded = null
      if (attachment) uploaded = await ticketsApi.uploadAttachment(attachment)
      const created = await ticketsApi.createProvider({
        ticketType: form.ticketType, subject: form.subject.trim(), description: form.description.trim(), priority: form.priority,
        relatedBookingId: form.relatedBookingId || undefined, providerId: currentUser?.providerId || currentUser?.providerCatalogId || currentUser?.userId,
        providerName: currentUser?.organisationName || currentUser?.fullName, customerName: selectedBooking?.customerName, service: selectedBooking?.service,
        attachmentUrl: uploaded?.fileUrl,
      })
      setTickets((current) => [created, ...current]); setForm(blankForm); setAttachment(null); setAttachmentInputKey((current) => current + 1); setNotice(`Ticket ${ticketId(created)} was submitted.`)
    } catch (requestError) { setError(requestError.message || 'The ticket could not be submitted.') } finally { setIsSaving(false) }
  }

  async function openDetails(ticket) {
    setError('')
    try { setSelectedTicket(await ticketsApi.get(ticketId(ticket))) } catch (requestError) { setError(requestError.message || 'Ticket details could not be loaded.') }
  }

  if (!isAuthenticated || role !== 'provider') return <section className="provider-support-page"><ErrorState message="Please sign in with a provider account to open Provider Support Center." /></section>

  return <section className="provider-support-page">
    <p className="provider-support-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link> <span aria-hidden="true">›</span> <strong>Provider Support Center</strong></p>
    <header className="provider-support-heading"><h1>Provider Support Center</h1><p>Get help with payments, bookings, account issues, and platform support.</p></header>
    <div className="provider-support-layout">
      <div className="provider-support-left">
        <section className="provider-support-card"><h2>Quick Contact</h2><div className="provider-quick-contact-box"><p><strong>Phone Support</strong></p><p>1800-123-4567</p></div><div className="provider-quick-contact-box"><p><strong>Email Support</strong></p><p>provider.support@serveease.com</p></div></section>
        <section className="provider-support-card"><h2>Common Issues</h2><div className="provider-common-issues">{faqItems.map(([question, answer], index) => <div className="provider-faq-item-wrap" key={question}><button aria-controls={`provider-faq-answer-${index}`} aria-expanded={faqOpen === index} className="provider-faq-item" onClick={() => setFaqOpen(faqOpen === index ? null : index)} type="button"><span>{question}</span><span aria-hidden="true">{faqOpen === index ? '−' : '+'}</span></button>{faqOpen === index && <div className="provider-faq-answer" id={`provider-faq-answer-${index}`}>{answer}</div>}</div>)}</div></section>
        <section className="provider-support-card provider-support-guidance"><h2>Support Guidance</h2><p>Before submitting a ticket:</p><ul><li>Select the related booking when applicable.</li><li>Clearly describe the issue and relevant dates.</li><li>Include the booking ID when the issue is booking-related.</li><li>Attach supporting evidence when necessary.</li></ul><p><strong>After submitting:</strong></p><p>Your ticket will appear in My Support Tickets, where you can view its status and continue the conversation.</p></section>
      </div>
      <div className="provider-support-right">
        <form className="provider-support-card provider-support-form" onSubmit={submit}><h2>Create Support Ticket</h2><label>Issue Category<select onChange={(event) => update('ticketType', event.target.value)} required value={form.ticketType}><option value="">Select category</option>{ticketTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>Related Booking<select onChange={(event) => update('relatedBookingId', event.target.value)} value={form.relatedBookingId}><option value="">General provider support</option>{bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.id} — {booking.customerName || 'Customer'} — {booking.service || 'Service'}</option>)}</select></label><label>Related Customer<input placeholder="Auto-filled from booking" readOnly value={selectedBooking?.customerName || ''} /></label><label>Service<input placeholder="Auto-filled from booking or provider category" readOnly value={selectedBooking?.service || currentUser?.serviceType || currentUser?.category || ''} /></label><label>Priority<select onChange={(event) => update('priority', event.target.value)} value={form.priority}>{priorities.map((priority) => <option key={priority}>{priority}</option>)}</select></label><label>Subject<input maxLength="120" onChange={(event) => update('subject', event.target.value)} placeholder="Enter ticket subject" required value={form.subject} /></label><label>Description<textarea maxLength="1000" minLength="10" onChange={(event) => update('description', event.target.value)} placeholder="Please provide detailed description about your issue." required value={form.description} /></label><label>Optional Attachment<input accept=".pdf,.jpg,.jpeg,.png,.webp" key={attachmentInputKey} onChange={handleAttachment} type="file" /></label>{attachment && <small className="provider-support-file-name">Selected: {attachment.name}</small>}{error && <ErrorState message={error} />}{notice && <p className="provider-support-notice" role="status">{notice}</p>}<button className="provider-support-primary" disabled={isSaving} type="submit">{isSaving ? 'Submitting…' : 'Submit Ticket'}</button></form>
      </div>
    </div>
    <section className="provider-support-tickets"><h2>My Support Tickets</h2>{loadState === 'loading' && <LoadingState message="Loading your provider tickets…" />}{loadState === 'error' && <ErrorState message={error} />}{loadState === 'ready' && (tickets.length ? <div className="provider-support-ticket-list">{tickets.map((ticket) => <article className="provider-support-ticket-card" key={ticketId(ticket)}><div className="provider-support-ticket-top"><h3>{ticket.subject || ticket.ticketType || 'Provider support request'}</h3><span className={`provider-support-status ${statusClass(ticket.status)}`}>{ticket.status || 'Pending'}</span></div><p className="provider-support-ticket-meta">Ticket ID: <strong>{ticketId(ticket)}</strong></p><p className="provider-support-ticket-meta">{ticket.ticketType || 'Other'} · {ticket.priority || 'Medium'} · {formatDate(ticket.createdAt)}</p><p className="provider-support-ticket-meta">Booking: {ticket.relatedBookingId || 'General provider support'}{ticket.customerName ? ` · Customer: ${ticket.customerName}` : ''}{ticket.service ? ` · Service: ${ticket.service}` : ''}</p><div className="provider-support-ticket-actions"><button className="provider-support-secondary" onClick={() => openDetails(ticket)} type="button">View Details</button></div></article>)}</div> : <EmptyState message="You have not raised any provider support tickets yet." />)}</section>
    {selectedTicket && <TicketDetailsModal onClose={() => setSelectedTicket(null)} ticket={selectedTicket} />}
  </section>
}
