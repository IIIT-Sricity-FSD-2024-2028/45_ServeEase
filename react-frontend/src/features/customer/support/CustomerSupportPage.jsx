import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import { ticketsApi } from '../../../services/api'
import './customerSupport.css'

const ticketTypes = ['Poor Service Quality', 'Provider Not Arrived', 'Late Arrival', 'Overcharging', 'Misbehavior', 'Payment Issue', 'Service Not Completed', 'Refund Request', 'Fraud', 'Safety Concern', 'Other']
const blankForm = { bookingId: '', ticketType: '', subject: '', description: '' }
const maxAttachmentSize = 5000 * 1024
const attachmentExtensions = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp'])
const attachmentMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])

function attachmentValidationError(file) {
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!attachmentExtensions.has(extension) || !attachmentMimeTypes.has(file.type)) {
    return 'Choose a PDF, JPG, PNG, or WebP file.'
  }
  if (file.size > maxAttachmentSize) return 'Attachment must be 5000 KB or smaller.'
  return ''
}

function formatDate(value) {
  const date = new Date(value || '')
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

function TicketDetailsModal({ ticket, onClose }) {
  const [details, setDetails] = useState(null)
  const [detailError, setDetailError] = useState('')

  useEffect(() => {
    let active = true
    ticketsApi.get(ticket.ticketId)
      .then((record) => { if (active) setDetails(record) })
      .catch((requestError) => { if (active) setDetailError(requestError.message || 'Ticket details could not be loaded.') })
    return () => { active = false }
  }, [ticket.ticketId])

  const record = details || ticket

  return <div className="customer-support-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation">
    <section aria-labelledby="customer-support-ticket-detail-title" aria-modal="true" className="customer-support-modal" role="dialog">
      <header className="customer-support-modal-head">
        <h2 id="customer-support-ticket-detail-title">Support Ticket Details</h2>
        <button aria-label="Close ticket details" className="customer-support-modal-close" onClick={onClose} type="button">×</button>
      </header>
      {detailError && <ErrorState message={detailError} />}
      <div className="customer-support-ticket-details">
        <section><h3>Ticket Information</h3><p><span>Ticket ID</span><strong>{record.ticketId}</strong></p><p><span>Status</span><strong>{record.status || 'Not provided'}</strong></p><p><span>Created On</span><strong>{formatDate(record.createdAt)}</strong></p></section>
        <section><h3>Issue Summary</h3><p><span>Booking Ref</span><strong>{record.relatedBookingId || 'Not provided'}</strong></p><p><span>Category</span><strong>{record.ticketType || 'Not provided'}</strong></p><p><span>Subject</span><strong>{record.subject || 'Not provided'}</strong></p><p><span>Description</span><strong>{record.description || 'Not provided'}</strong></p></section>
        <section><h3>Support Update</h3><p>{record.supportRemarks || 'Your ticket has been received and is currently being reviewed by the support team.'}</p></section>
      </div>
    </section>
  </div>
}

function ChatWithSupportModal({ ticket, customerId, onClose }) {
  const storageKey = `serveEaseChatDemo:${customerId || 'customer'}:${ticket.ticketId}`
  const inputRef = useRef(null)
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]')
      return Array.isArray(stored) ? stored : []
    } catch {
      return []
    }
  })
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    inputRef.current?.focus()
    function closeOnEscape(event) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function sendMessage(event) {
    event.preventDefault()
    const text = draft.trim()
    if (!text) {
      setError('Enter a message before sending.')
      return
    }

    const message = { sender: 'customer', text, createdAt: new Date().toISOString() }
    const nextMessages = [...messages, message]
    try {
      localStorage.setItem(storageKey, JSON.stringify(nextMessages))
      setMessages(nextMessages)
      setDraft('')
      setError('')
    } catch {
      setError('This browser could not save the demo message. Your text has not been sent.')
    }
  }

  return <div className="customer-support-modal-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }} role="presentation">
    <section aria-labelledby="customer-support-chat-title" aria-modal="true" className="customer-support-modal customer-support-chat-modal" role="dialog">
      <header className="customer-support-modal-head">
        <div><h2 id="customer-support-chat-title">Chat with Support</h2><p>Ticket {ticket.ticketId} · Booking {ticket.relatedBookingId || 'not provided'}</p></div>
        <button aria-label="Close chat" className="customer-support-modal-close" onClick={onClose} type="button">×</button>
      </header>
      <p className="customer-support-chat-demo-note">Demo only: messages are stored in this browser and are not delivered to Support.</p>
      <div aria-live="polite" className="customer-support-chat-thread">
        {ticket.description && <article className="customer-support-chat-bubble customer-support-chat-bubble--customer"><span>Ticket issue</span>{ticket.description}</article>}
        {ticket.supportRemarks && <article className="customer-support-chat-bubble customer-support-chat-bubble--support"><span>Support update</span>{ticket.supportRemarks}</article>}
        {messages.map((message, index) => <article className="customer-support-chat-bubble customer-support-chat-bubble--customer" key={`${message.createdAt || 'message'}-${index}`}>
          {message.text}<time>{message.createdAt ? new Intl.DateTimeFormat('en-IN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(message.createdAt)) : ''}</time>
        </article>)}
        {!ticket.description && !ticket.supportRemarks && messages.length === 0 && <p className="customer-support-chat-empty">No ticket context or saved demo messages are available.</p>}
      </div>
      <form className="customer-support-chat-form" onSubmit={sendMessage}>
        <label className="sr-only" htmlFor="customer-support-chat-input">Message</label>
        <input autoComplete="off" id="customer-support-chat-input" onChange={(event) => { setDraft(event.target.value); setError('') }} placeholder="Type your message here" ref={inputRef} value={draft} />
        <button className="journey-button" disabled={!draft.trim()} type="submit">Send</button>
      </form>
      {error && <p className="customer-support-chat-error" role="alert">{error}</p>}
    </section>
  </div>
}

function statusClass(status) {
  return String(status || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

export default function CustomerSupportPage() {
  const { currentUser } = useAuth()
  const attachmentInputRef = useRef(null)
  const [tickets, setTickets] = useState([])
  const [form, setForm] = useState(blankForm)
  const [attachment, setAttachment] = useState(null)
  const [uploadedAttachment, setUploadedAttachment] = useState(null)
  const [attachmentError, setAttachmentError] = useState('')
  const [loadState, setLoadState] = useState('loading')
  const [isSaving, setIsSaving] = useState(false)
  const [submissionStage, setSubmissionStage] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [chatTicket, setChatTicket] = useState(null)
  const chatTriggerRef = useRef(null)

  function closeChat() {
    setChatTicket(null)
    requestAnimationFrame(() => chatTriggerRef.current?.focus())
  }

  useEffect(() => {
    let active = true
    ticketsApi.listMine()
      .then((records) => { if (active) { setTickets(Array.isArray(records) ? records : []); setLoadState('ready') } })
      .catch((requestError) => { if (active) { setError(requestError.message || 'Your support tickets could not be loaded.'); setLoadState('error') } })
    return () => { active = false }
  }, [])

  function update(name, value) { setForm((current) => ({ ...current, [name]: value })); setError(''); setNotice('') }

  function chooseAttachment(event) {
    const file = event.target.files?.[0] || null
    setAttachmentError('')
    setUploadedAttachment(null)
    if (!file) {
      setAttachment(null)
      return
    }
    const validationError = attachmentValidationError(file)
    if (validationError) {
      setAttachment(null)
      setAttachmentError(validationError)
      event.target.value = ''
      return
    }
    setAttachment(file)
  }

  function removeAttachment() {
    setAttachment(null)
    setUploadedAttachment(null)
    setAttachmentError('')
    if (attachmentInputRef.current) attachmentInputRef.current.value = ''
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.bookingId.trim() || !form.ticketType || form.description.trim().length < 10) {
      setError('Enter a booking reference, issue category, and at least 10 characters of detail.')
      return
    }
    setIsSaving(true)
    setError('')
    try {
      let attachmentMetadata = uploadedAttachment
      if (attachment && !attachmentMetadata) {
        setSubmissionStage('Uploading attachment…')
        attachmentMetadata = await ticketsApi.uploadAttachment(attachment)
        if (!attachmentMetadata?.fileUrl) throw new Error('The attachment upload did not return a saved file reference.')
        setUploadedAttachment(attachmentMetadata)
      }

      setSubmissionStage('Submitting ticket…')
      const created = await ticketsApi.createCustomer({
        bookingId: form.bookingId.trim(),
        ticketType: form.ticketType,
        subject: form.subject.trim() || undefined,
        description: form.description.trim(),
        attachmentUrl: attachmentMetadata?.fileUrl,
        customerId: currentUser?.userId,
        customerName: currentUser?.fullName || currentUser?.name,
      })
      setTickets((current) => [created, ...current])
      setForm(blankForm)
      removeAttachment()
      setNotice(`Ticket ${created.ticketId} was submitted.`)
    } catch (requestError) {
      setError(requestError.message || 'The ticket could not be submitted.')
    } finally { setIsSaving(false); setSubmissionStage('') }
  }

  return <section className="customer-support-page">
    <p className="customer-support-breadcrumb"><Link to="/">Home</Link> › <Link to="/customer/dashboard">Customer Dashboard</Link> › <strong>Support Center</strong></p>
    <header className="customer-support-heading"><p>Customer care</p><h1>Customer Support Center</h1><span>Get help with bookings, payments, or service issues.</span></header>
    <div className="customer-support-layout">
      <form className="customer-support-card customer-support-form" onSubmit={submit}>
        <h2>Raise Support Ticket</h2>
        <label>Booking reference number<input maxLength="80" onChange={(event) => update('bookingId', event.target.value)} placeholder="Enter booking reference number" required value={form.bookingId} /></label>
        <label>Issue category<select onChange={(event) => update('ticketType', event.target.value)} required value={form.ticketType}><option value="">Select issue category</option>{ticketTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label>Subject (optional)<input maxLength="120" onChange={(event) => update('subject', event.target.value)} placeholder="Brief description of your issue" value={form.subject} /></label>
        <label>Description<textarea maxLength="1000" minLength="10" onChange={(event) => update('description', event.target.value)} placeholder="Provide detailed information about your issue" required value={form.description} /></label>
        <div className="customer-support-attachment-field">
          <label htmlFor="customer-support-attachment">Attachment (Optional)</label>
          <input accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" id="customer-support-attachment" onChange={chooseAttachment} ref={attachmentInputRef} type="file" />
          <small>PDF, JPG, PNG, or WebP. Maximum file size: 5000 KB.</small>
          {attachment && <div className="customer-support-attachment-selected"><span>📎 {attachment.name}</span><button onClick={removeAttachment} type="button">Remove</button></div>}
          {attachmentError && <small className="customer-support-attachment-error" role="alert">{attachmentError}</small>}
        </div>
        {error && <ErrorState message={error} />}{notice && <p className="customer-support-notice" role="status">{notice}</p>}
        <button className="journey-button" disabled={isSaving || Boolean(attachmentError)} type="submit">{isSaving ? submissionStage : 'Submit Ticket'}</button>
      </form>
      <aside className="customer-support-sidebar">
        <section className="customer-support-card"><h2>Help resources</h2><details><summary>How can I track a booking?</summary><p>Open My Bookings to review the latest booking status.</p></details><details><summary>When will I receive a refund?</summary><p>Refund handling depends on the booking review and payment workflow.</p></details><details><summary>What if a provider is late?</summary><p>Raise a ticket with the booking reference and relevant details.</p></details><details><summary>How do I report a payment issue?</summary><p>Select Payment Issue and include the booking reference.</p></details></section>
        <section className="customer-support-card customer-support-contact"><h2>Need Immediate Help?</h2><p>Our support team is available 24/7 to assist you.</p><p>📞 +91 1800-123-4567</p><p>📧 support@serveease.com</p></section>
      </aside>
    </div>
    <section className="customer-support-tickets"><h2>My Support Tickets</h2>{loadState === 'loading' && <LoadingState message="Loading your support tickets…" />}{loadState === 'error' && <ErrorState message={error} />}{loadState === 'ready' && (tickets.length ? <div className="customer-support-ticket-list">{tickets.map((ticket) => <article className="customer-support-ticket" key={ticket.ticketId}>
      <div className="customer-support-ticket-top"><h3>{ticket.subject || ticket.ticketType || 'Support request'}</h3><span className={`customer-support-status customer-support-status--${statusClass(ticket.status)}`}>{ticket.status || 'Not provided'}</span></div>
      <p className="customer-support-ticket-meta">Ticket ID: <strong>{ticket.ticketId || 'Not provided'}</strong></p>
      <p className="customer-support-ticket-meta">Booking Ref: <strong>{ticket.relatedBookingId || 'Not provided'}</strong></p>
      <p className="customer-support-ticket-meta">{ticket.ticketType || 'Category not provided'} <span aria-hidden="true">•</span> {formatDate(ticket.createdAt)}</p>
      <div className="customer-support-ticket-actions">
        <button className="customer-support-view-ticket" onClick={() => setSelectedTicket(ticket)} type="button">View Ticket</button>
        <button className="customer-support-chat-ticket" onClick={(event) => { chatTriggerRef.current = event.currentTarget; setChatTicket(ticket) }} type="button">Chat with Support</button>
      </div>
    </article>)}</div> : <EmptyState message="You have not raised any support tickets yet." />)}</section>
    {selectedTicket && <TicketDetailsModal onClose={() => setSelectedTicket(null)} ticket={selectedTicket} />}
    {chatTicket && <ChatWithSupportModal customerId={currentUser?.userId} key={chatTicket.ticketId} onClose={closeChat} ticket={chatTicket} />}
  </section>
}
