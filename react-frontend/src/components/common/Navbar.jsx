import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../services/api'
import './Navbar.css'

const notificationReadKey = (user) => `serveEaseCustomerNotificationReads:${user?.userId || user?.email || 'customer'}`

function readNotificationIds(user) {
  try {
    const stored = JSON.parse(localStorage.getItem(notificationReadKey(user)) || '[]')
    return new Set(Array.isArray(stored) ? stored : [])
  } catch {
    return new Set()
  }
}

function belongsToCustomer(record, user) {
  if (record.customerId && user?.userId) return String(record.customerId) === String(user.userId)
  if (record.customerEmail && user?.email) return String(record.customerEmail).toLowerCase() === String(user.email).toLowerCase()
  return false
}

function buildCustomerNotifications(bookings, tickets, user) {
  const readIds = readNotificationIds(user)
  const notifications = []

  tickets.forEach((ticket) => {
    if (!ticket.ticketId || !ticket.status) return
    const status = String(ticket.status)
    const statusKey = status.toLowerCase()
    const id = `ticket:${ticket.ticketId.toLowerCase()}:${statusKey}`
    const createdAt = ticket.updatedAt || ticket.createdAt
    notifications.push({
      id,
      text: statusKey.startsWith('resolved')
        ? `Support ticket ${ticket.ticketId} has been resolved.`
        : `Support ticket ${ticket.ticketId} is ${statusKey}.`,
      createdAt,
      isUnread: statusKey === 'open' && !readIds.has(id),
      to: '/customer/support',
    })
  })

  bookings.filter((booking) => belongsToCustomer(booking, user)).forEach((booking) => {
    if (!booking.id || !booking.status) return
    const status = String(booking.status)
    const statusKey = status.toLowerCase()
    const createdAt = booking.statusUpdatedAt || booking.createdAt
    const id = `booking:${String(booking.id).toLowerCase()}:${statusKey}`
    notifications.push({
      id,
      text: `${booking.service || 'Your booking'} is ${statusKey}.`,
      createdAt,
      isUnread: ['pending', 'accepted'].includes(statusKey) && !readIds.has(id),
      to: '/customer/bookings',
    })

    if (!booking.paymentStatus) return
    const paymentStatus = String(booking.paymentStatus)
    const paymentStatusKey = paymentStatus.toLowerCase()
    const paymentId = booking.paymentId || booking.id
    const paymentNotificationId = `payment:${String(paymentId).toLowerCase()}:${paymentStatusKey}`
    notifications.push({
      id: paymentNotificationId,
      text: `Payment ${booking.paymentId ? `${booking.paymentId} ` : ''}for ${booking.service || 'your service'} is ${paymentStatusKey}.`,
      createdAt: booking.paymentDate || booking.statusUpdatedAt || booking.createdAt,
      isUnread: ['pending', 'failed'].includes(paymentStatusKey) && !readIds.has(paymentNotificationId),
      to: '/customer/payments',
    })
  })

  return notifications.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0)).slice(0, 30)
}

function formatNotificationTime(value) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Time unavailable'
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationOwnerKey, setNotificationOwnerKey] = useState('')
  const [notificationState, setNotificationState] = useState('idle')
  const [notificationError, setNotificationError] = useState('')
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const profileMenuRef = useRef(null)
  const notificationPanelRef = useRef(null)
  const profileButtonRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const notificationRequestRef = useRef(0)
  const isCustomerRole = currentUser?.role === 'customer' || area === 'Customer'
  const isProviderRole = currentUser?.role === 'provider'
  const customerNotificationIdentity = currentUser?.role === 'customer'
    ? String(currentUser.userId || currentUser.email || '')
    : ''
  const customerNotifications = notificationOwnerKey === customerNotificationIdentity ? notifications : []
  const customerNotificationState = notificationOwnerKey === customerNotificationIdentity ? notificationState : 'idle'

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) setIsProfileOpen(false)
      if (!notificationPanelRef.current?.contains(event.target)) setIsNotificationsOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        if (isProfileOpen) {
          setIsProfileOpen(false)
          profileButtonRef.current?.focus()
        }
        if (isNotificationsOpen) {
          setIsNotificationsOpen(false)
          notificationButtonRef.current?.focus()
        }
      }
    }

    document.addEventListener('click', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('click', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isNotificationsOpen, isProfileOpen])

  async function loadNotifications() {
    if (!isAuthenticated || currentUser?.role !== 'customer') {
      setNotificationOwnerKey('')
      setNotificationState(isAuthenticated ? 'unavailable' : 'signed-out')
      setNotifications([])
      return
    }

    const requestId = ++notificationRequestRef.current
    const ownerKey = String(currentUser.userId || currentUser.email || '')
    setNotificationOwnerKey(ownerKey)
    setNotifications([])
    setNotificationState('loading')
    setNotificationError('')
    try {
      const [bookingRecords, ticketRecords] = await Promise.all([bookingsApi.list(), ticketsApi.listMine()])
      if (requestId !== notificationRequestRef.current) return
      if (!Array.isArray(bookingRecords) || !Array.isArray(ticketRecords)) throw new Error('Notification data returned an invalid response.')
      const nextNotifications = buildCustomerNotifications(bookingRecords, ticketRecords, currentUser)
      setNotifications(nextNotifications)
      setNotificationOwnerKey(ownerKey)
      setNotificationState('ready')
    } catch (error) {
      if (requestId !== notificationRequestRef.current) return
      setNotificationError(error.message || 'Notifications could not be loaded.')
      setNotificationState('error')
    }
  }

  function toggleNotifications() {
    setIsProfileOpen(false)
    setShowAllNotifications(false)
    if (isNotificationsOpen) {
      setIsNotificationsOpen(false)
      return
    }
    setIsNotificationsOpen(true)
    void loadNotifications()
  }

  function markNotificationRead(notification) {
    try {
      const readIds = readNotificationIds(currentUser)
      readIds.add(notification.id)
      localStorage.setItem(notificationReadKey(currentUser), JSON.stringify([...readIds]))
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isUnread: false } : item))
      setIsNotificationsOpen(false)
      navigate(notification.to)
    } catch {
      setNotificationError('Read state could not be saved in this browser.')
    }
  }

  function markAllNotificationsRead() {
    try {
      const readIds = readNotificationIds(currentUser)
      notifications.forEach((notification) => readIds.add(notification.id))
      localStorage.setItem(notificationReadKey(currentUser), JSON.stringify([...readIds]))
      setNotifications((current) => current.map((notification) => ({ ...notification, isUnread: false })))
    } catch {
      setNotificationError('Read state could not be saved in this browser.')
    }
  }

  const notificationUnreadCount = customerNotifications.filter((notification) => notification.isUnread).length

  async function handleLogout() {
    try {
      await logout()
    } catch (logoutError) {
      console.error('Logout request failed.', logoutError)
    } finally {
      setIsProfileOpen(false)
      navigate('/')
    }
  }

  return <header className="app-header">
    <Link className="brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
    <nav className="primary-nav" aria-label="Primary navigation">
      <NavLink end to="/">Home</NavLink>
      <NavLink to="/services">Services</NavLink>
      {isCustomerRole && <>
        <NavLink end to="/customer/dashboard">Dashboard</NavLink>
        <NavLink end to="/customer/bookings">My Bookings</NavLink>
      </>}
      {isProviderRole && <>
        <NavLink end to="/provider/dashboard">Dashboard</NavLink>
        <NavLink end to="/provider/bookings">Bookings</NavLink>
        <NavLink to="/provider/availability">Availability</NavLink>
        <NavLink to="/provider/services">Services</NavLink>
        <NavLink to="/provider/earnings">Earnings</NavLink>
        <NavLink to="/provider/support">Support</NavLink>
      </>}
    </nav>
    <div className="dashboard-search"><input type="search" placeholder="Search for services..." aria-label="Search for services" onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/services?q=${encodeURIComponent(event.currentTarget.value)}`) }} /></div>
    <div className="dashboard-topbar-actions">
      <div className="notification-wrap" ref={notificationPanelRef}>
        <button aria-expanded={isNotificationsOpen} aria-label={notificationUnreadCount ? `Notifications, ${notificationUnreadCount} unread` : 'Notifications'} className="icon-btn notification-trigger" onClick={toggleNotifications} ref={notificationButtonRef} type="button">
          🔔{notificationUnreadCount > 0 && <span className="notification-count">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
        </button>
        {isNotificationsOpen && <section aria-label="Notifications" className="navbar-notification-panel">
          <div className="navbar-notification-head"><h2>Notifications</h2>{notificationState === 'ready' && <span className="navbar-notification-badge">{notificationUnreadCount} New</span>}</div>
          {customerNotificationState === 'loading' && <p className="navbar-notification-state">Loading notifications…</p>}
          {customerNotificationState === 'error' && <div className="navbar-notification-error"><p>{notificationError}</p><button onClick={() => void loadNotifications()} type="button">Retry</button></div>}
          {notificationError && customerNotificationState === 'ready' && <p className="navbar-notification-error-message" role="alert">{notificationError}</p>}
          {customerNotificationState === 'signed-out' && <p className="navbar-notification-state">Sign in to view notifications.</p>}
          {customerNotificationState === 'unavailable' && <p className="navbar-notification-state">Notifications are not available for this role in the React app yet.</p>}
          {customerNotificationState === 'ready' && <>
            {customerNotifications.length === 0
              ? <p className="navbar-notification-empty">No notifications yet. New booking, payment, and support updates will appear here.</p>
              : <div className="navbar-notification-list">{(showAllNotifications ? customerNotifications : customerNotifications.slice(0, 4)).map((notification) => <button className={`navbar-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id} onClick={() => markNotificationRead(notification)} type="button">
                <span>{notification.text}</span><time>{formatNotificationTime(notification.createdAt)}</time>
              </button>)}</div>}
            {customerNotifications.some((notification) => notification.isUnread) && <button className="navbar-notification-mark-read" onClick={markAllNotificationsRead} type="button">Mark All as Read</button>}
            {customerNotifications.length > 4 && <button className="navbar-notification-view-all" onClick={() => setShowAllNotifications((shown) => !shown)} type="button">{showAllNotifications ? 'Show Recent' : 'View All Notifications'}</button>}
            <p className="navbar-notification-local-note">Read state is stored in this browser for this customer.</p>
          </>}
        </section>}
      </div>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button className="profile-btn" ref={profileButtonRef} type="button" aria-label={`${area} profile`} aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)}>👤</button>
        {isProfileOpen && <div className={`profile-dropdown${currentUser?.role === 'customer' ? ' profile-dropdown--customer' : ''}`} role="menu">
          {isAuthenticated ? <>
            {currentUser?.role === 'customer' && <>
              <Link role="menuitem" to="/customer/profile" onClick={() => setIsProfileOpen(false)}>My Profile</Link>
              <Link role="menuitem" to="/" onClick={() => setIsProfileOpen(false)}>Go to Home</Link>
              <button role="menuitem" type="button" onClick={handleLogout}>Logout</button>
            </>}
            {currentUser?.role === 'provider' && <>
              <div className="profile-dropdown__identity"><strong>{currentUser?.fullName || currentUser?.email || 'Signed-in user'}</strong><span>{currentUser?.email || currentUser?.role || ''}</span></div>
              <Link role="menuitem" to="/provider/dashboard" onClick={() => setIsProfileOpen(false)}>Dashboard</Link>
              <Link role="menuitem" to="/provider/bookings" onClick={() => setIsProfileOpen(false)}>Bookings</Link>
              <Link role="menuitem" to="/provider/availability" onClick={() => setIsProfileOpen(false)}>Availability</Link>
              <Link role="menuitem" to="/provider/services" onClick={() => setIsProfileOpen(false)}>Services</Link>
              <Link role="menuitem" to="/provider/support" onClick={() => setIsProfileOpen(false)}>Support Center</Link>
              <Link role="menuitem" to="/provider/account" onClick={() => setIsProfileOpen(false)}>My Profile</Link>
              <Link role="menuitem" to="/provider/earnings" onClick={() => setIsProfileOpen(false)}>Earnings & Payments</Link>
            </>}
            {!['customer', 'provider'].includes(currentUser?.role) && <>
              <div className="profile-dropdown__identity"><strong>{currentUser?.fullName || currentUser?.email || 'Signed-in user'}</strong><span>{currentUser?.email || currentUser?.role || ''}</span></div>
              <button role="menuitem" type="button" onClick={handleLogout}>Logout</button>
            </>}
          </> : <>
            <Link role="menuitem" to="/login" onClick={() => setIsProfileOpen(false)}>Login</Link>
          </>}
        </div>}
      </div>
    </div>
  </header>
}
