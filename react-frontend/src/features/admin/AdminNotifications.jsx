import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDisplayDateTime } from '../customer/customerOperations'
import { loadSuperuserNotifications, markSuperuserNotificationsRead, openNotificationPanel, SUPERUSER_NOTIFICATIONS_CHANGED } from './superuserNotifications'

// The Notifications card of superuser-dashboard.html / superuser-management.html, rendered with the same
// notification items as the topbar panel. Both read and save through superuserNotifications.js, so marking
// an item read here clears it from the bell too; "View All Notifications" opens that panel.
export function AdminNotifications() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [state, setState] = useState('loading')
  const [error, setError] = useState('')
  const requestRef = useRef(0)

  const load = useCallback(async (silent = false) => {
    const requestId = ++requestRef.current
    if (!silent) { setState('loading'); setError('') }
    try {
      const result = await loadSuperuserNotifications()
      if (requestId !== requestRef.current) return
      setNotifications(result.notifications)
      setState('ready')
    } catch (loadError) {
      if (requestId !== requestRef.current || silent) return
      setError(loadError?.message || 'Notifications could not be loaded.')
      setState('error')
    }
  }, [])

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0)
    const refresh = () => void load(true)
    window.addEventListener(SUPERUSER_NOTIFICATIONS_CHANGED, refresh)
    return () => { window.clearTimeout(first); window.removeEventListener(SUPERUSER_NOTIFICATIONS_CHANGED, refresh) }
  }, [load])

  async function openNotification(notification) {
    if (notification.isUnread) {
      try {
        await markSuperuserNotificationsRead(notifications, [notification.id])
      } catch (saveError) {
        setError(saveError?.message || 'Notification changes could not be saved.')
        return
      }
    }
    navigate(notification.to)
  }

  const unreadCount = notifications.filter((item) => item.isUnread).length

  return <section className="admin-panel admin-panel--compact admin-hub-notifications" id="notifications">
    <div className="admin-panel-heading"><h2>Notifications</h2>{state === 'ready' && <span className="se-notification-panel__badge">{unreadCount} New</span>}</div>
    {state === 'loading' && <p className="se-notification-panel__state" role="status">Loading notifications…</p>}
    {state === 'error' && <div className="se-notification-panel__error" role="alert"><p>{error}</p><button className="se-notification-panel__action" onClick={() => void load()} type="button">Retry</button></div>}
    {state === 'ready' && error && <p className="se-notification-panel__error-message" role="alert">{error}</p>}
    {state === 'ready' && (notifications.length === 0
      ? <div className="se-notification-panel__empty"><strong>No notifications yet</strong><span>Escalated tickets and platform updates will appear here.</span></div>
      : <div className="se-notification-panel__list admin-notification-card-list">{notifications.slice(0, 4).map((notification) => <article className={`se-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id}>
        <button className="se-notification-item__open" onClick={() => void openNotification(notification)} type="button"><p>{notification.text}</p><time dateTime={notification.createdAt || undefined}>{notification.createdAt ? formatDisplayDateTime(notification.createdAt) : 'Time unavailable'}</time></button>
      </article>)}</div>)}
    <button className="admin-button admin-button--secondary admin-button--full" disabled={state !== 'ready'} onClick={() => openNotificationPanel(true)} type="button">View All Notifications</button>
  </section>
}
