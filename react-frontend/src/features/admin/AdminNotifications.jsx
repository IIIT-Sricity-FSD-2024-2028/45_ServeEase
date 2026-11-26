import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import {
  fetchNotifications, markNotificationsRead, notificationOwner, openPanel, selectNotificationFeed,
} from '../../store/slices/notificationSlice'
import { formatDisplayDateTime } from '../customer/customerOperations'

// The Notifications card of superuser-dashboard.html / superuser-management.html. It reads the same
// store feed as the topbar bell, so marking an item read here clears it from the bell too.
export function AdminNotifications() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentUser } = useAuth()
  const feed = useAppSelector((state) => selectNotificationFeed(state, notificationOwner('superuser', currentUser)))
  const { items: notifications, unreadCount, error } = feed
  const state = feed.status === 'succeeded' ? 'ready' : feed.status === 'failed' ? 'error' : 'loading'

  const load = () => dispatch(fetchNotifications({ kind: 'superuser', user: currentUser }))
  useEffect(() => { dispatch(fetchNotifications({ kind: 'superuser', user: currentUser })) }, [dispatch, currentUser])

  async function openNotification(notification) {
    if (notification.isUnread) {
      const result = await dispatch(markNotificationsRead({ kind: 'superuser', user: currentUser, ids: [notification.id] }))
      if (result.error) return
    }
    navigate(notification.to)
  }

  return <section className="admin-panel admin-panel--compact admin-hub-notifications" id="notifications">
    <div className="admin-panel-heading"><h2>Notifications</h2>{state === 'ready' && <span className="se-notification-panel__badge">{unreadCount} New</span>}</div>
    {state === 'loading' && <p className="se-notification-panel__state" role="status">Loading notifications…</p>}
    {state === 'error' && <div className="se-notification-panel__error" role="alert"><p>{error}</p><button className="se-notification-panel__action" onClick={load} type="button">Retry</button></div>}
    {state === 'ready' && error && <p className="se-notification-panel__error-message" role="alert">{error}</p>}
    {state === 'ready' && (notifications.length === 0
      ? <div className="se-notification-panel__empty"><strong>No notifications yet</strong><span>Escalated tickets and platform updates will appear here.</span></div>
      : <div className="se-notification-panel__list admin-notification-card-list">{notifications.slice(0, 4).map((notification) => <article className={`se-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id}>
        <button className="se-notification-item__open" onClick={() => void openNotification(notification)} type="button"><p>{notification.text}</p><time dateTime={notification.createdAt || undefined}>{notification.createdAt ? formatDisplayDateTime(notification.createdAt) : 'Time unavailable'}</time></button>
      </article>)}</div>)}
    <button className="admin-button admin-button--secondary admin-button--full" disabled={state !== 'ready'} onClick={() => dispatch(openPanel({ showAll: true }))} type="button">View All Notifications</button>
  </section>
}
