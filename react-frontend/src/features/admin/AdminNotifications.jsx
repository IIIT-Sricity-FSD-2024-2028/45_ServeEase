import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { show } from './useAdminData'

function notificationDestination(actionPage) {
  const page = String(actionPage || '').toLowerCase()
  if (page.startsWith('/admin/')) return page
  if (page.includes('escalated-ticket')) return '/admin/escalated-tickets'
  if (page.includes('provider-verification')) return '/admin/verification'
  if (page.includes('booking')) return '/admin/bookings'
  if (page.includes('finance')) return '/admin/finance'
  if (page.includes('management')) return '/admin/customers'
  if (page.includes('service-categor')) return '/admin/categories'
  return '/admin'
}

function fromEscalatedTickets(tickets) {
  return tickets.map((ticket) => {
    const id = ticket.ticketId || ticket.id
    if (!id) return null
    return {
      id: `AN-escalated-${id}`,
      eventId: `ticket-escalated:${id}:superuser`,
      ticketId: id,
      text: `Support escalated ticket - ${id}`,
      type: 'red',
      createdAt: ticket.escalatedAt || ticket.createdAt,
      read: false,
      isRead: false,
      isNew: true,
      actionPage: '/admin/escalated-tickets',
    }
  }).filter(Boolean)
}

function visibleNotifications(data, tickets) {
  const stored = Array.isArray(data.notifications) ? data.notifications : fromEscalatedTickets(tickets)
  const seen = new Set()
  return stored.map((item, index) => {
    const id = String(item.id || item.eventId || `notification-${index}`)
    const eventId = String(item.eventId || id)
    const hasReadState = item.read !== undefined || item.isRead !== undefined || item.isNew !== undefined
    return {
      ...item,
      id,
      eventId,
      text: item.text || item.message || 'Platform update',
      createdAt: item.createdAt || item.createdAtIso || item.timestamp || item.time,
      isRead: hasReadState ? item.read === true || item.isRead === true || item.isNew === false : true,
    }
  }).filter((item) => {
    if (!item.createdAt || seen.has(item.eventId)) return false
    seen.add(item.eventId)
    return true
  })
}

function relativeTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Not available'
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  }
  if (minutes < 10080) {
    const days = Math.floor(minutes / 1440)
    return `${days} ${days === 1 ? 'day' : 'days'} ago`
  }
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

export function AdminNotifications({ moduleState, tickets, ticketsLoading, ticketsError, onRetryTickets }) {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [actionError, setActionError] = useState('')
  const notifications = visibleNotifications(moduleState.data || {}, Array.isArray(tickets) ? tickets : [])
  const unreadCount = notifications.filter((item) => !item.isRead).length

  useEffect(() => {
    if (!isOpen) return undefined
    function onKeyDown(event) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  async function saveNotifications(nextNotifications) {
    setIsSaving(true)
    setActionError('')
    try {
      await moduleState.save({ ...(moduleState.data || {}), notifications: nextNotifications })
      return true
    } catch (error) {
      setActionError(error?.message || 'Notification changes could not be saved.')
      await moduleState.reload()
      return false
    } finally {
      setIsSaving(false)
    }
  }

  async function markRead(id) {
    const next = notifications.map((item) => item.id === id
      ? { ...item, read: true, isRead: true, isNew: false }
      : item)
    return saveNotifications(next)
  }

  async function openNotification(item) {
    if (!item.isRead) await markRead(item.id)
    setIsOpen(false)
    navigate(notificationDestination(item.actionPage))
  }

  async function markAllRead() {
    await saveNotifications(notifications.map((item) => ({ ...item, read: true, isRead: true, isNew: false })))
  }

  async function clearAll() {
    await saveNotifications([])
  }

  const ticketNotificationsNeeded = !Array.isArray(moduleState.data?.notifications)
  const failed = moduleState.error || (ticketNotificationsNeeded && ticketsError)
  const loading = moduleState.isLoading || (ticketNotificationsNeeded && ticketsLoading)
  const retry = () => { moduleState.reload(); if (ticketNotificationsNeeded && ticketsError) onRetryTickets() }

  return (
    <section className="admin-panel admin-panel--compact admin-hub-notifications" id="admin-notifications">
      <div className="admin-panel-heading"><h2>Notifications</h2><span>{unreadCount} New</span></div>
      {loading && <LoadingState message="Loading notifications…" />}
      {!loading && failed && <div className="admin-feedback admin-feedback--error"><ErrorState message={moduleState.error || ticketsError} /><button className="admin-button admin-button--secondary admin-button--small" onClick={retry} type="button">Retry</button></div>}
      {!loading && !failed && notifications.length === 0 && <EmptyState message="No new notifications. You’re all caught up." />}
      {!loading && !failed && notifications.length > 0 && <div className="admin-notification-list">
        {notifications.slice(0, 4).map((item) => <button className={`admin-notification admin-notification-button${item.isRead ? ' admin-notification--read' : ''}${item.type === 'red' ? ' admin-notification--urgent' : ''}`} key={item.id} onClick={() => openNotification(item)} type="button">
          <strong>{show(item.text)}</strong>
          <span>{relativeTime(item.createdAt)}</span>
        </button>)}
      </div>}
      {actionError && <ErrorState message={actionError} />}
      <button className="admin-button admin-button--secondary admin-button--full" disabled={loading || Boolean(failed)} onClick={() => { setActionError(''); setIsOpen(true) }} type="button">View All Notifications</button>

      {isOpen && <div className="admin-notification-backdrop" onClick={(event) => { if (event.target === event.currentTarget) setIsOpen(false) }}>
        <section aria-labelledby="admin-notification-title" aria-modal="true" className="admin-notification-modal" role="dialog">
          <header className="admin-notification-modal-header">
            <div><h2 id="admin-notification-title">Notifications</h2><p>Latest platform updates</p></div>
            <button aria-label="Close notifications" className="admin-notification-close" onClick={() => setIsOpen(false)} type="button">×</button>
          </header>
          <div className="admin-notification-modal-content">
            <div className="admin-panel-heading"><h3>Recent Notifications</h3><span>{unreadCount} New</span></div>
            {moduleState.isLoading && <LoadingState message="Loading notifications…" />}
            {!moduleState.isLoading && moduleState.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={moduleState.error} /><button className="admin-button admin-button--secondary admin-button--small" onClick={moduleState.reload} type="button">Retry</button></div>}
            {!moduleState.isLoading && !moduleState.error && notifications.length === 0 && <EmptyState message="No new notifications. You’re all caught up." />}
            {!moduleState.isLoading && !moduleState.error && notifications.length > 0 && <div className="admin-notification-modal-list">
              {notifications.map((item) => <article className={`admin-notification admin-notification-row${item.isRead ? ' admin-notification--read' : ''}${item.type === 'red' ? ' admin-notification--urgent' : ''}`} key={item.id}>
                <div><strong>{show(item.text)}</strong><span>{relativeTime(item.createdAt)}</span></div>
                {!item.isRead && <button className="admin-button admin-button--secondary" disabled={isSaving} onClick={() => markRead(item.id)} type="button">Mark as Read</button>}
              </article>)}
            </div>}
          </div>
          <footer className="admin-notification-modal-actions">
            <button className="admin-button admin-button--secondary" disabled={isSaving || unreadCount === 0 || Boolean(moduleState.error)} onClick={markAllRead} type="button">Mark All as Read</button>
            <button className="admin-button admin-button--secondary" disabled={isSaving || notifications.length === 0 || Boolean(moduleState.error)} onClick={clearAll} type="button">Clear All</button>
            {isSaving && <span role="status">Saving…</span>}
            {actionError && <ErrorState message={actionError} />}
          </footer>
        </section>
      </div>}
    </section>
  )
}
