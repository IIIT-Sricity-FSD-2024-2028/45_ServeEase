import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../../services/api'
import { CustomerPageHeader, LoadState, OpsModal, TicketDetails, TicketStatus } from '../CustomerOpsParts'
import { TicketChatModal } from '../../support/TicketChatModal'
import {
  attachmentValidationError, belongsToCustomer, canonicalBookingId, customerTicketTypes, formatDisplayDate, openTicketForBooking, sortNewestFirst, validateTicketForm,
} from '../customerOperations'
import '../customerOperations.css'

const blankForm = { bookingId: '', ticketType: '', subject: '', description: '' }

// Help Resources accordion, text from customer-support-center.html.
const faqs = [
  ['How can I track my booking status?', 'You can check live booking progress from the My Bookings page, where upcoming, completed, and pending bookings are listed with their current status.'],
  ['When will I receive my refund after cancellation?', 'Approved refunds are usually processed to the original payment method after cancellation review. Processing time may vary based on the payment provider and booking stage.'],
  ['What should I do if the provider is late?', 'Raise a support ticket with your booking reference and issue details. Our team will review the delay and coordinate with the assigned provider.'],
  ['How do I report a payment issue?', 'Choose Payment Issue while submitting a support ticket, add the transaction reference if available, and describe the failed, delayed, or incorrect payment issue.'],
]

// customer-support-center.html + initSupportCenter(), backed by POST /tickets/customer, GET /tickets/my-tickets
// and POST /uploads/tickets.
export default function CustomerSupportPage() {
  const { currentUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const prefillRef = (searchParams.get('bookingRef') || '').trim()
  const viewTicketId = searchParams.get('ticket') || ''
  const attachmentInputRef = useRef(null)
  const [form, setForm] = useState(() => ({ ...blankForm, bookingId: prefillRef }))
  const [errors, setErrors] = useState({})
  const [attachment, setAttachment] = useState(null)
  const [uploadedAttachment, setUploadedAttachment] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState('')
  const [stage, setStage] = useState('')
  const [openFaq, setOpenFaq] = useState(-1)
  const [ticketsLoad, setTicketsLoad] = useState({ state: 'loading', tickets: [], error: '' })
  const [chatTicket, setChatTicket] = useState(null)
  const [bookingsLoad, setBookingsLoad] = useState({ state: 'loading', bookings: [], error: '' })

  const fetchTickets = useCallback(async () => {
    const records = await ticketsApi.listMine()
    if (!Array.isArray(records)) throw new Error('The ticket service returned an invalid response.')
    return sortNewestFirst(records)
  }, [])

  const fetchBookings = useCallback(async () => {
    const records = await bookingsApi.list()
    if (!Array.isArray(records)) throw new Error('The booking service returned an invalid response.')
    return records.filter((booking) => belongsToCustomer(booking, currentUser))
  }, [currentUser])

  const reloadTickets = useCallback(() => {
    setTicketsLoad((current) => ({ ...current, state: 'loading', error: '' }))
    return fetchTickets()
      .then((tickets) => setTicketsLoad({ state: 'ready', tickets, error: '' }))
      .catch((error) => setTicketsLoad({ state: 'error', tickets: [], error: error.message || 'Your support tickets could not be loaded.' }))
  }, [fetchTickets])

  const reloadBookings = useCallback(() => {
    setBookingsLoad((current) => ({ ...current, state: 'loading', error: '' }))
    fetchBookings()
      .then((bookings) => setBookingsLoad({ state: 'ready', bookings, error: '' }))
      .catch((error) => setBookingsLoad({ state: 'error', bookings: [], error: error.message || 'Your bookings could not be loaded.' }))
  }, [fetchBookings])

  useEffect(() => {
    let active = true
    fetchTickets()
      .then((tickets) => { if (active) setTicketsLoad({ state: 'ready', tickets, error: '' }) })
      .catch((error) => { if (active) setTicketsLoad({ state: 'error', tickets: [], error: error.message || 'Your support tickets could not be loaded.' }) })
    fetchBookings()
      .then((bookings) => { if (active) setBookingsLoad({ state: 'ready', bookings, error: '' }) })
      .catch((error) => { if (active) setBookingsLoad({ state: 'error', bookings: [], error: error.message || 'Your bookings could not be loaded.' }) })
    return () => { active = false }
  }, [fetchBookings, fetchTickets])

  const prefillBooking = useMemo(() => bookingsLoad.bookings.find((booking) => String(booking.id).toLowerCase() === prefillRef.toLowerCase()), [bookingsLoad.bookings, prefillRef])
  const existingTicket = prefillRef ? openTicketForBooking(ticketsLoad.tickets, prefillRef) : null
  const selectedTicket = ticketsLoad.tickets.find((ticket) => ticket.ticketId === viewTicketId)

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value); else next.delete(key)
    setSearchParams(next)
  }

  function update(name, value) {
    setForm((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setSubmitError('')
    setSuccess('')
  }

  function chooseAttachment(event) {
    const file = event.target.files?.[0] || null
    setUploadedAttachment(null)
    setErrors((current) => ({ ...current, attachment: undefined }))
    if (!file) { setAttachment(null); return }
    const validationError = attachmentValidationError(file)
    if (validationError) {
      setAttachment(null)
      setErrors((current) => ({ ...current, attachment: validationError }))
      event.target.value = ''
      return
    }
    setAttachment(file)
  }

  function removeAttachment() {
    setAttachment(null)
    setUploadedAttachment(null)
    if (attachmentInputRef.current) attachmentInputRef.current.value = ''
  }

  async function submit(event) {
    event.preventDefault()
    setSubmitError('')
    setSuccess('')
    if (bookingsLoad.state !== 'ready') {
      setSubmitError('Your bookings must load before a ticket can be linked to one.')
      return
    }
    const nextErrors = validateTicketForm(form, bookingsLoad.bookings)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    try {
      let attachmentMetadata = uploadedAttachment
      if (attachment && !attachmentMetadata) {
        setStage('Uploading attachment…')
        attachmentMetadata = await ticketsApi.uploadAttachment(attachment)
        if (!attachmentMetadata?.fileUrl) throw new Error('The attachment upload did not return a saved file reference.')
        setUploadedAttachment(attachmentMetadata)
      }
      setStage('Submitting ticket…')
      // Customer identity is taken from the authenticated session on the server, not from this body.
      const created = await ticketsApi.createCustomer({
        bookingId: canonicalBookingId(bookingsLoad.bookings, form.bookingId),
        ticketType: form.ticketType,
        subject: form.subject.trim(),
        description: form.description.trim(),
        ...(attachmentMetadata?.fileUrl ? { attachmentUrl: attachmentMetadata.fileUrl } : {}),
      })
      if (!created?.ticketId) throw new Error('The server did not return the new ticket.')
      setForm(blankForm)
      removeAttachment()
      setSuccess(`Support ticket ${created.ticketId} submitted successfully. Status: ${created.status || 'not provided'}.`)
      if (prefillRef) setParam('bookingRef', '')
      await reloadTickets()
    } catch (error) {
      setSubmitError(error.message || 'The ticket could not be submitted.')
    } finally {
      setStage('')
    }
  }

  const fieldProps = (name) => ({ 'aria-describedby': `support-${name}-error`, 'aria-invalid': errors[name] ? 'true' : undefined, id: `support-${name}` })
  const fieldError = (name) => <small className="field-error" id={`support-${name}-error`}>{errors[name] || ''}</small>

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['Support Center']]} description="Get help with bookings, payments, or service issues." title="Customer Support Center" />

    <section className="support-layout">
      <div className="panel-card">
        <h2 className="panel-title">Raise Support Ticket</h2>
        <form className="support-form" noValidate onSubmit={submit}>
          <label htmlFor="support-bookingId">Booking Reference Number</label>
          <input {...fieldProps('bookingId')} list="support-own-bookings" maxLength="80" onChange={(event) => update('bookingId', event.target.value)} placeholder="Enter booking reference number" readOnly={Boolean(prefillRef)} value={form.bookingId} />
          <datalist id="support-own-bookings">{bookingsLoad.bookings.map((booking) => <option key={booking.id} value={booking.id}>{booking.service}</option>)}</datalist>
          {fieldError('bookingId')}
          {prefillRef && <small className="support-form-hint">{prefillBooking ? `Booking context loaded for ${prefillBooking.service}. Please describe the issue in your own words.` : 'Booking reference loaded. Please select the issue category and describe the problem.'}</small>}
          {existingTicket && <small className="support-form-hint">Ticket {existingTicket.ticketId} is already open for this booking ({existingTicket.status}).</small>}
          {bookingsLoad.state === 'error' && <p className="ops-alert" role="alert">{bookingsLoad.error} <button className="table-link-btn" onClick={reloadBookings} type="button">Retry</button></p>}

          <label htmlFor="support-ticketType">Issue Category</label>
          <select {...fieldProps('ticketType')} onChange={(event) => update('ticketType', event.target.value)} value={form.ticketType}>
            <option value="">Select issue category</option>
            {customerTicketTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          {fieldError('ticketType')}

          <label htmlFor="support-subject">Subject</label>
          <input {...fieldProps('subject')} maxLength="120" onChange={(event) => update('subject', event.target.value)} placeholder="Brief description of your issue" value={form.subject} />
          {fieldError('subject')}

          <label htmlFor="support-description">Description</label>
          <textarea {...fieldProps('description')} maxLength="1000" onChange={(event) => update('description', event.target.value)} placeholder="Provide detailed information about your issue" value={form.description} />
          {fieldError('description')}

          <label htmlFor="support-attachment">Attachment <span>(Optional)</span></label>
          <input {...fieldProps('attachment')} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={chooseAttachment} ref={attachmentInputRef} type="file" />
          {attachment && <div className="support-attachment"><span>📎 {attachment.name}</span><button onClick={removeAttachment} type="button">Remove</button></div>}
          {fieldError('attachment')}

          {submitError && <p className="ops-alert" role="alert">{submitError}</p>}
          {success && <p className="ops-notice" role="status">{success}</p>}
          <button className="btn btn-primary btn-full" disabled={Boolean(stage)} type="submit">{stage || 'Submit Ticket'}</button>
        </form>
      </div>

      <div className="support-sidebar">
        <div className="panel-card">
          <h2 className="panel-title">Help Resources</h2>
          <div className="faq-list">{faqs.map(([question, answer], index) => <div key={question}>
            <button aria-controls={`support-faq-${index}`} aria-expanded={openFaq === index} className="faq-item" onClick={() => setOpenFaq(openFaq === index ? -1 : index)} type="button">
              <span>{question}</span><span aria-hidden="true" className="faq-toggle">{openFaq === index ? '−' : '+'}</span>
            </button>
            <div className="faq-answer" hidden={openFaq !== index} id={`support-faq-${index}`}>{answer}</div>
          </div>)}</div>
        </div>
        <div className="panel-card gradient-panel">
          <h2>Need Immediate Help?</h2>
          <p>Our support team is available 24/7 to assist you.</p>
          <p>📞 +91 1800-123-4567</p>
          <p>📧 support@serveease.com</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="my-support-tickets-heading" className="table-section">
      <h2 className="section-title-left" id="my-support-tickets-heading">My Support Tickets</h2>
      <LoadState error={ticketsLoad.error} loadingText="Loading your support tickets…" onRetry={reloadTickets} state={ticketsLoad.state} />
      {ticketsLoad.state === 'ready' && (ticketsLoad.tickets.length ? <div className="ticket-list">{ticketsLoad.tickets.map((ticket) => <article className="ticket-card" key={ticket.ticketId}>
        <div className="ticket-top"><h3>{ticket.subject || ticket.ticketType}</h3><TicketStatus status={ticket.status} /></div>
        <p>Ticket ID: <strong>{ticket.ticketId}</strong></p>
        <p>Booking Ref: {ticket.relatedBookingId || 'Not provided'}</p>
        <p>{ticket.ticketType} • {formatDisplayDate(ticket.createdAt)}</p>
        <div className="ticket-actions">
          <button className="secondary-action" onClick={() => setParam('ticket', ticket.ticketId)} type="button">View Ticket</button>
          <button className="btn btn-primary" onClick={() => setChatTicket(ticket)} type="button">Chat with Support</button>
        </div>
        {ticket.supportUpdate && <p className="ticket-note">Support update: {ticket.supportUpdate}</p>}
      </article>)}</div> : <div className="empty-state-card">You have not raised any support tickets yet.</div>)}
    </section>

    {chatTicket && <TicketChatModal audience="customer" key={chatTicket.ticketId} onClose={() => setChatTicket(null)} ticket={chatTicket} />}

    {viewTicketId && <OpsModal labelId="support-ticket-title" onClose={() => setParam('ticket', '')} title="Support Ticket Details">
      <TicketDetails fallback={selectedTicket} key={viewTicketId} ticketId={viewTicketId} />
    </OpsModal>}
  </div>
}
