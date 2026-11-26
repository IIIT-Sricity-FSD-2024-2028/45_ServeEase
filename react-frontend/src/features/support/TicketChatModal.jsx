import { useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import {
  fetchOwnerTicketById, selectTicketById, selectTicketDetailFetchError,
  selectTicketMutationError, selectTicketMutationStatus, sendOwnerTicketMessage, ticketEntityKey,
} from '../../store/slices/ticketsSlice.js'
import { OpsModal } from '../customer/CustomerOpsParts'

// "Chat with Support" for the customer or provider who raised a ticket: the real conversation stored on the
// ticket. New replies from support appear while the dialog is open; sending adds a message the support agent
// sees on the ticket's Communication Panel. `audience` picks the original page's chat styling.
export function TicketChatModal({ ticket, audience, onClose }) {
  const dispatch = useAppDispatch()
  const ticketId = ticketEntityKey(ticket)
  const current = useAppSelector(selectTicketById(ticketId)) || ticket
  const fetchError = useAppSelector(selectTicketDetailFetchError(ticketId))
  const mutationStatus = useAppSelector(selectTicketMutationStatus('ownerMessageById', ticketId))
  const mutationError = useAppSelector(selectTicketMutationError('ownerMessageById', ticketId))
  const [text, setText] = useState('')
  const thread = useRef(null)
  const sending = mutationStatus === 'loading'
  const error = mutationError || fetchError
  const provider = audience === 'provider'
  const mine = provider ? 'provider' : 'customer'

  useEffect(() => {
    let live = true
    const scope = provider ? 'provider' : 'customer'
    const load = () => { if (live) dispatch(fetchOwnerTicketById({ ticketId, scope })) }
    load()
    const timer = window.setInterval(load, 8000)
    return () => { live = false; window.clearInterval(timer) }
  }, [dispatch, provider, ticketId])

  const messages = Array.isArray(current.messages) ? current.messages : []
  useEffect(() => { if (thread.current) thread.current.scrollTop = thread.current.scrollHeight }, [messages.length])

  async function send(event) {
    event.preventDefault()
    const message = text.trim()
    if (!message || sending) return
    try {
      await dispatch(sendOwnerTicketMessage({ ticketId, text: message, scope: provider ? 'provider' : 'customer' })).unwrap()
      setText('')
    } catch { /* The mutation error is rendered from Redux. */ }
  }

  const threadClass = provider ? 'provider-chat-thread' : 'chat-thread'
  const bubbleClass = provider ? 'provider-chat-bubble' : 'chat-bubble'
  return <OpsModal className={provider ? 'provider-chat-modal-card' : 'support-chat-modal'} labelId="ticket-chat-title" onClose={onClose} title="Chat with Support">
    {provider && <div className="provider-chat-ticket-summary"><strong>{current.subject || current.ticketType}</strong><span>{ticketEntityKey(current)} • {current.ticketType}</span></div>}
    <div aria-live="polite" className={threadClass} ref={thread} role="log">
      {!messages.length && <div className={`${bubbleClass} support`}>Hello! You are connected to ServeEase support for ticket {ticketEntityKey(current)}. Share any extra details here and our team will reply.</div>}
      {messages.map((message) => <div className={`${bubbleClass} ${message.senderType === mine ? 'user' : 'support'}`} key={message.messageId || message.sentAt}>{message.senderType === 'admin' && <strong>Admin reply: </strong>}{message.text}</div>)}
    </div>
    {error && <p className="ops-alert" role="alert">{error}</p>}
    <form className={provider ? 'provider-chat-form' : 'chat-form'} onSubmit={send}>
      <input aria-label="Type your message" disabled={sending} maxLength={1000} onChange={(event) => setText(event.target.value)} placeholder="Type your message here" value={text} />
      <button className="btn btn-primary" disabled={sending || !text.trim()} type="submit">{sending ? 'Sending…' : 'Send'}</button>
    </form>
  </OpsModal>
}
