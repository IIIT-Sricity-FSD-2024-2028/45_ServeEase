import { useEffect, useRef, useState } from 'react'
import { ticketsApi } from '../../services/api'
import { OpsModal } from '../customer/CustomerOpsParts'

// "Chat with Support" for the customer or provider who raised a ticket: the real conversation stored on the
// ticket. New replies from support appear while the dialog is open; sending adds a message the support agent
// sees on the ticket's Communication Panel. `audience` picks the original page's chat styling.
export function TicketChatModal({ ticket, audience, onClose }) {
  const [current, setCurrent] = useState(ticket)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const thread = useRef(null)
  const provider = audience === 'provider'
  const mine = provider ? 'provider' : 'customer'

  useEffect(() => {
    let live = true
    const load = () => ticketsApi.get(ticket.ticketId).then((record) => { if (live) { setCurrent(record); setError('') } }).catch((requestError) => { if (live) setError(requestError.message || 'The conversation could not be refreshed.') })
    load()
    const timer = window.setInterval(load, 8000)
    return () => { live = false; window.clearInterval(timer) }
  }, [ticket.ticketId])

  const messages = Array.isArray(current.messages) ? current.messages : []
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight }, [messages.length])

  async function send(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    setSending(true)
    setError('')
    try {
      setCurrent(await ticketsApi.sendMessage(ticket.ticketId, message))
      setText('')
    } catch (requestError) {
      setError(requestError.message || 'Your message could not be sent.')
    } finally {
      setSending(false)
    }
  }

  const threadClass = provider ? 'provider-chat-thread' : 'chat-thread'
  const bubbleClass = provider ? 'provider-chat-bubble' : 'chat-bubble'
  return <OpsModal className={provider ? 'provider-chat-modal-card' : 'support-chat-modal'} labelId="ticket-chat-title" onClose={onClose} title="Chat with Support">
    {provider && <div className="provider-chat-ticket-summary"><strong>{current.subject || current.ticketType}</strong><span>{current.ticketId} • {current.ticketType}</span></div>}
    <div aria-live="polite" className={threadClass} ref={thread} role="log">
      {!messages.length && <div className={`${bubbleClass} support`}>Hello! You are connected to ServeEase support for ticket {current.ticketId}. Share any extra details here and our team will reply.</div>}
      {messages.map((message) => <div className={`${bubbleClass} ${message.senderType === mine ? 'user' : 'support'}`} key={message.messageId || message.sentAt}>{message.senderType === 'admin' && <strong>Admin reply: </strong>}{message.text}</div>)}
    </div>
    {error && <p className="ops-alert" role="alert">{error}</p>}
    <form className={provider ? 'provider-chat-form' : 'chat-form'} onSubmit={send}>
      <input aria-label="Type your message" disabled={sending} maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder="Type your message here" value={text} />
      <button className="btn btn-primary" disabled={sending || !text.trim()} type="submit">{sending ? 'Sending…' : 'Send'}</button>
    </form>
  </OpsModal>
}
