import { formatDisplayDateTime } from '../../features/customer/customerOperations'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../services/api'
import { applyProviderSearch, providerSearchPlaceholders } from './providerSearch'
import './Navbar.css'

// Authenticated dashboard topbar reconstructed from the original front-end pages:
// customer  -> customer-dashboard.html, my-bookings.html, booking-checkout.html, ...
// provider  -> provider-*.html (provider-topbar: static brand, no notification bell)
// support   -> support-dashboard.html (support-topbar)
// superuser -> superuser-*.html (superuser-topbar)
// The original topbar is brand + search + actions only; page navigation lives in the page bodies.
const topbarVariants = {
  customer: {
    brandLinksHome: true,
    notifications: 'customer',
    profileCard: null,
    profileLinks: (pathname) => [
      { label: 'My Profile', to: '/customer/profile' },
      // my-bookings.html adds "My Tickets" to its menu.
      ...(pathname === '/customer/bookings' ? [{ label: 'My Tickets', to: '/customer/tickets' }] : []),
      // customer-dashboard.html offers "Go to Home"; every other customer page offers "Go to Dashboard".
      pathname === '/customer/dashboard'
        ? { label: 'Go to Home', to: '/' }
        : { label: 'Go to Dashboard', to: '/customer/dashboard' },
    ],
  },
  provider: {
    brandLinksHome: false,
    notifications: null,
    profileCard: null,
    profileLinks: () => [
      { label: 'My Profile', to: '/provider/account' },
      { label: 'Go to Dashboard', to: '/provider/dashboard' },
    ],
  },
  support: {
    brandLinksHome: false,
    notifications: 'support',
    profileCard: 'Support Agent',
    // The original "My Profile" (employee-profile.html) has no React route. The workspace page exists only in
    // React and is reachable from nowhere else, so it stays here alongside the dashboard link.
    profileLinks: () => [
      { label: 'Support Dashboard', to: '/employee/support-tickets' },
      { label: 'Support Workspace', to: '/employee/support-workspace' },
    ],
  },
  superuser: {
    brandLinksHome: false,
    notifications: 'superuser',
    profileCard: 'Superuser',
    profileLinks: () => [{ label: '⌂ Superuser Dashboard', to: '/admin' }],
  },
  // Employees outside Support (customer-operations.html / provider-operations.html have no notification bell).
  'customer-operations': {
    brandLinksHome: false,
    notifications: null,
    profileCard: 'Customer Operations',
    profileLinks: () => [{ label: 'Customer Operations', to: '/employee/customer-operations' }],
  },
  'provider-operations': {
    brandLinksHome: false,
    notifications: null,
    profileCard: 'Provider Operations',
    profileLinks: () => [{ label: 'Provider Operations', to: '/employee/provider-operations' }],
  },
  // A department without a workspace gets no links, only Logout.
  employee: { brandLinksHome: false, notifications: null, profileCard: 'Employee', profileLinks: () => [] },
}

// Every employee signs in with the 'support' role; the topbar follows the department on their record.
const employeeVariants = { 'Customer Operations': 'customer-operations', 'Provider Operations': 'provider-operations', Support: 'support' }
const areaRoles = { Customer: 'customer', Provider: 'provider' }

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

// api.js ServeEaseDate.formatDateTime(): DD-MM-YYYY hh:mm AM/PM, as the original notification panel shows it.
function formatNotificationTime(value) {
  return value ? formatDisplayDateTime(value) : 'Time unavailable'
}

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [openMenu, setOpenMenu] = useState(null)
  const isSupportPage = pathname.startsWith('/employee/support-tickets')
  const isSupportDashboard = pathname === '/employee/support-tickets'
  const [ticketSearch, setTicketSearch] = useState('')
  const [hasNewNotifications, setHasNewNotifications] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationOwnerKey, setNotificationOwnerKey] = useState('')
  const [notificationState, setNotificationState] = useState('idle')
  const [notificationError, setNotificationError] = useState('')
  const [showAllNotifications, setShowAllNotifications] = useState(false)
  const actionsRef = useRef(null)
  const profileButtonRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const notificationRequestRef = useRef(0)
  const [menuPathname, setMenuPathname] = useState(pathname)

  // Route changes (including browser back/forward) always leave both menus closed.
  if (menuPathname !== pathname) {
    setMenuPathname(pathname)
    setOpenMenu(null)
  }

  const accountVariant = currentUser?.role === 'support' ? employeeVariants[currentUser.department] || 'employee' : currentUser?.role
  const role = (isAuthenticated && topbarVariants[accountVariant] ? accountVariant : null) || areaRoles[area] || null
  const variant = role ? topbarVariants[role] : null
  const isProfileOpen = openMenu === 'profile'
  const isNotificationsOpen = openMenu === 'notifications'
  const customerNotificationIdentity = currentUser?.role === 'customer'
    ? String(currentUser.userId || currentUser.email || '')
    : ''
  const customerNotifications = notificationOwnerKey === customerNotificationIdentity ? notifications : []
  const customerNotificationState = notificationOwnerKey === customerNotificationIdentity ? notificationState : 'idle'
  const notificationUnreadCount = customerNotifications.filter((notification) => notification.isUnread).length

  useEffect(() => {
    if (!openMenu) return undefined

    function closeOnOutsideClick(event) {
      if (!actionsRef.current?.contains(event.target)) setOpenMenu(null)
    }

    function closeOnEscape(event) {
      if (event.key !== 'Escape') return
      setOpenMenu(null)
      ;(openMenu === 'profile' ? profileButtonRef : notificationButtonRef).current?.focus()
    }

    document.addEventListener('mousedown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [openMenu])

  useEffect(() => {
    if (!isSupportPage) return undefined
    const refreshCount = () => {
      try {
        const stored = JSON.parse(localStorage.getItem('serveEaseSupportModuleData') || 'null')
        setHasNewNotifications(Boolean(stored?.notifications?.some((item) => item.read !== true && item.isNew !== false)))
      } catch { setHasNewNotifications(false) }
    }
    refreshCount()
    if (!isSupportDashboard) return undefined
    const updateCount = (event) => setHasNewNotifications(Number(event.detail || 0) > 0)
    window.addEventListener('serveease-notifications-count', updateCount)
    return () => window.removeEventListener('serveease-notifications-count', updateCount)
  }, [isSupportDashboard, isSupportPage])

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
    setShowAllNotifications(false)
    if (isNotificationsOpen) {
      setOpenMenu(null)
      return
    }
    setOpenMenu('notifications')
    void loadNotifications()
  }

  function toggleProfile() {
    setOpenMenu(isProfileOpen ? null : 'profile')
  }

  function markNotificationRead(notification) {
    try {
      const readIds = readNotificationIds(currentUser)
      readIds.add(notification.id)
      localStorage.setItem(notificationReadKey(currentUser), JSON.stringify([...readIds]))
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isUnread: false } : item))
      setOpenMenu(null)
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

  async function handleLogout() {
    setOpenMenu(null)
    // Leave the protected route before the session clears; otherwise its guard redirects to /login
    // instead of home (the original pages log out to index.html).
    navigate('/')
    try {
      await logout()
    } catch (logoutError) {
      console.error('Logout request failed.', logoutError)
    }
  }

  const brandContent = <><span className="brand-icon">SE</span><span>ServeEase</span></>
  const visibleNotifications = showAllNotifications ? customerNotifications : customerNotifications.slice(0, 4)

  return <header className={`se-topbar${role ? ` se-topbar--${role}` : ''}`}>
    {variant?.brandLinksHome === false
      ? <div className="se-topbar__brand">{brandContent}</div>
      : <Link className="se-topbar__brand" to="/">{brandContent}</Link>}

    <div className="se-topbar__search">
      {isSupportPage
        ? <input type="search" placeholder="Search tickets or booking references..." aria-label="Search support tickets" value={ticketSearch} onChange={(event) => { setTicketSearch(event.target.value); if (isSupportDashboard) window.dispatchEvent(new CustomEvent('serveease-ticket-search', { detail: event.target.value })) }} onKeyDown={(event) => { if (event.key === 'Enter' && !isSupportDashboard) navigate(`/employee/support-tickets?search=${encodeURIComponent(ticketSearch)}`) }} />
        : role === 'provider'
        ? <input key={pathname} type="search" placeholder={providerSearchPlaceholders[pathname] || 'Search...'} aria-label="Search this page" onChange={(event) => applyProviderSearch(pathname, event.target.value)} />
        : <input type="search" placeholder="Search for services..." aria-label="Search for services" onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/services?q=${encodeURIComponent(event.currentTarget.value)}`) }} />}
    </div>

    <div className="se-topbar__actions" ref={actionsRef}>
      {isSupportPage && variant?.notifications === 'support'
        ? <div className="se-topbar__notifications">
          <button aria-label="Notifications" className="se-topbar__icon-btn" onClick={() => navigate('/employee/support-tickets#support-notifications')} type="button">
            <span aria-hidden="true">🔔</span>{hasNewNotifications && <span className="se-topbar__count se-topbar__count--dot" />}
          </button>
        </div>
        : variant?.notifications && <div className="se-topbar__notifications">
        <button
          aria-controls="se-topbar-notification-panel"
          aria-expanded={isNotificationsOpen}
          aria-label={notificationUnreadCount ? `Notifications, ${notificationUnreadCount} unread` : 'Notifications'}
          className="se-topbar__icon-btn"
          onClick={toggleNotifications}
          ref={notificationButtonRef}
          type="button"
        >
          {variant.notifications === 'superuser'
            ? <span aria-hidden="true" className="se-topbar__alert-symbol">!</span>
            : <span aria-hidden="true">🔔</span>}
          {notificationUnreadCount > 0 && <span className="se-topbar__count">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
        </button>
        {isNotificationsOpen && <section aria-label="Notifications" className="se-notification-panel" id="se-topbar-notification-panel">
          <div className="se-notification-panel__head">
            <h3>Notifications</h3>
            {customerNotificationState === 'ready' && <span className="se-notification-panel__badge">{notificationUnreadCount} New</span>}
          </div>
          {customerNotificationState === 'loading' && <p className="se-notification-panel__state" role="status">Loading notifications…</p>}
          {customerNotificationState === 'error' && <div className="se-notification-panel__error" role="alert">
            <p>{notificationError}</p>
            <button className="se-notification-panel__action" onClick={() => void loadNotifications()} type="button">Retry</button>
          </div>}
          {notificationError && customerNotificationState === 'ready' && <p className="se-notification-panel__error-message" role="alert">{notificationError}</p>}
          {customerNotificationState === 'signed-out' && <p className="se-notification-panel__state">Sign in to view notifications.</p>}
          {customerNotificationState === 'unavailable' && <p className="se-notification-panel__state">Notifications are not available for this role in the React app yet.</p>}
          {customerNotificationState === 'ready' && <>
            {customerNotifications.length === 0
              ? <div className="se-notification-panel__empty"><strong>No notifications yet</strong><span>New booking, payment, and support updates will appear here.</span></div>
              : <div className="se-notification-panel__list">{visibleNotifications.map((notification) => <button className={`se-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id} onClick={() => markNotificationRead(notification)} type="button">
                <p>{notification.text}</p>
                <time dateTime={notification.createdAt || undefined}>{formatNotificationTime(notification.createdAt)}</time>
              </button>)}</div>}
            {notificationUnreadCount > 0 && <button className="se-notification-panel__action" onClick={markAllNotificationsRead} type="button">Mark All as Read</button>}
            {customerNotifications.length > 4 && <button className="se-notification-panel__action" onClick={() => setShowAllNotifications((shown) => !shown)} type="button">{showAllNotifications ? 'Show Recent' : 'View All Notifications'}</button>}
          </>}
        </section>}
      </div>}

      <div className="se-topbar__profile">
        <button
          aria-controls="se-topbar-profile-dropdown"
          aria-expanded={isProfileOpen}
          aria-label="Open account menu"
          className="se-topbar__profile-btn"
          onClick={toggleProfile}
          ref={profileButtonRef}
          type="button"
        />
        {isProfileOpen && <div className={`se-profile-dropdown${variant?.profileCard ? ' se-profile-dropdown--card' : ''}`} id="se-topbar-profile-dropdown">
          {isAuthenticated && variant ? <>
            {variant.profileCard && <div className="se-profile-dropdown__card">
              <strong>{currentUser?.fullName || currentUser?.email || variant.profileCard}</strong>
              <span>{variant.profileCard}</span>
            </div>}
            {variant.profileLinks(pathname).map((item) => <Link key={item.to} onClick={() => setOpenMenu(null)} to={item.to}>{item.label}</Link>)}
            <button onClick={handleLogout} type="button">Logout</button>
          </> : <Link onClick={() => setOpenMenu(null)} to="/login">Login</Link>}
        </div>}
      </div>
    </div>
  </header>
}
