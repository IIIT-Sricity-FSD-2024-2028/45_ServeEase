import { formatDisplayDateTime } from '../../features/customer/customerOperations'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { bookingsApi, ticketsApi } from '../../services/api'
import { buildSupportNotifications, readSupportNotificationIds, saveSupportNotificationIds } from '../../features/support/supportNotifications'
import { buildProviderNotifications, readProviderNotificationIds, saveProviderNotificationIds } from '../../features/provider/providerNotifications'
import { applyProviderSearch, providerSearchPlaceholders } from './providerSearch'
import { getSuperuserModuleData, listEscalatedTickets, saveSuperuserModuleData } from '../../features/admin/adminApi'
import './Navbar.css'

// Authenticated dashboard topbar reconstructed from the original front-end pages:
// customer  -> customer-dashboard.html, my-bookings.html, booking-checkout.html, ...
// provider  -> provider-*.html (provider-topbar), with the same notification bell and panel the other
//              signed-in actors use, over the provider's own bookings and support tickets
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
    notifications: 'provider',
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

function buildSuperuserNotifications(moduleData, tickets) {
  const source = Array.isArray(moduleData?.notifications) ? moduleData.notifications : tickets.map((ticket) => {
    const id = ticket.ticketId || ticket.id
    return id ? { id: `AN-escalated-${id}`, eventId: `ticket-escalated:${id}:superuser`, text: `Support escalated ticket - ${id}`, type: 'red', createdAt: ticket.escalatedAt || ticket.createdAt, actionPage: '/admin/escalated-tickets', isNew: true } : null
  }).filter(Boolean)
  const seen = new Set()
  return source.map((item, index) => {
    const id = String(item.id || item.eventId || `notification-${index}`)
    const eventId = String(item.eventId || id)
    const hasReadState = item.read !== undefined || item.isRead !== undefined || item.isNew !== undefined
    return { ...item, id, eventId, text: item.text || item.message || 'Platform update', createdAt: item.createdAt || item.createdAtIso || item.timestamp || item.time, to: item.actionPage?.startsWith('/admin/') ? item.actionPage : '/admin' , isUnread: hasReadState ? !(item.read === true || item.isRead === true || item.isNew === false) : false }
  }).filter((item) => {
    if (!item.createdAt || seen.has(item.eventId)) return false
    seen.add(item.eventId)
    return true
  }).sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
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
  const [notifications, setNotifications] = useState([])
  const [superuserModuleData, setSuperuserModuleData] = useState(null)
  const [superuserStateExists, setSuperuserStateExists] = useState(false)
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
  const isSupportAgent = variant?.notifications === 'support' && currentUser?.role === 'support'
  const isProviderAccount = variant?.notifications === 'provider' && currentUser?.role === 'provider'
  const customerNotificationIdentity = currentUser?.role === 'customer' || isSupportAgent || isProviderAccount
    ? String(currentUser.userId || currentUser.email || '')
    : ''
  const customerNotifications = notificationOwnerKey === customerNotificationIdentity ? notifications : []
  const customerNotificationState = notificationOwnerKey === customerNotificationIdentity ? notificationState : 'idle'
  const activeNotifications = variant?.notifications === 'superuser' ? notifications : customerNotifications
  const notificationUnreadCount = activeNotifications.filter((notification) => notification.isUnread).length

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

  async function loadNotifications(silent = false) {
    if (variant?.notifications === 'superuser') {
      const requestId = ++notificationRequestRef.current
      if (!silent) { setNotificationState('loading'); setNotificationError('') }
      try {
        const [moduleResult, tickets] = await Promise.all([getSuperuserModuleData(), listEscalatedTickets()])
        if (requestId !== notificationRequestRef.current) return
        const moduleData = moduleResult.value || {}
        setSuperuserModuleData(moduleData)
        setSuperuserStateExists(moduleResult.exists)
        setNotifications(buildSuperuserNotifications(moduleData, Array.isArray(tickets) ? tickets : []))
        setNotificationState('ready')
      } catch (error) {
        if (requestId !== notificationRequestRef.current || silent) return
        setNotificationError(error.message || 'Notifications could not be loaded.')
        setNotificationState('error')
      }
      return
    }
    if (isSupportAgent) {
      const requestId = ++notificationRequestRef.current
      const ownerKey = String(currentUser.userId || currentUser.email || '')
      if (!silent) { setNotificationOwnerKey(ownerKey); setNotificationState('loading'); setNotificationError('') }
      try {
        const tickets = await ticketsApi.listForSupport()
        if (requestId !== notificationRequestRef.current) return
        setNotifications(buildSupportNotifications(Array.isArray(tickets) ? tickets : [], currentUser))
        setNotificationOwnerKey(ownerKey)
        setNotificationState('ready')
      } catch (error) {
        if (requestId !== notificationRequestRef.current || silent) return
        setNotificationError(error.message || 'Notifications could not be loaded.')
        setNotificationState('error')
      }
      return
    }
    if (isProviderAccount) {
      const requestId = ++notificationRequestRef.current
      const ownerKey = String(currentUser.userId || currentUser.email || '')
      if (!silent) { setNotificationOwnerKey(ownerKey); setNotificationState('loading'); setNotificationError('') }
      try {
        const [bookingRecords, ticketRecords] = await Promise.all([bookingsApi.listForProvider(), ticketsApi.listProvider()])
        if (requestId !== notificationRequestRef.current) return
        setNotifications(buildProviderNotifications(bookingRecords, ticketRecords, currentUser))
        setNotificationOwnerKey(ownerKey)
        setNotificationState('ready')
      } catch (error) {
        if (requestId !== notificationRequestRef.current || silent) return
        setNotificationError(error.message || 'Notifications could not be loaded.')
        setNotificationState('error')
      }
      return
    }
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

  // The support and provider bells show a live unread count, so new work is checked for in the background.
  useEffect(() => {
    if (!isSupportAgent && !isProviderAccount) return undefined
    const first = window.setTimeout(() => void loadNotifications(true), 0)
    const timer = window.setInterval(() => void loadNotifications(true), 30000)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSupportAgent, isProviderAccount, currentUser?.userId])

  const isSuperuser = variant?.notifications === 'superuser' && currentUser?.role === 'superuser'
  useEffect(() => {
    if (!isSuperuser) return undefined
    const first = window.setTimeout(() => void loadNotifications(true), 0)
    const timer = window.setInterval(() => void loadNotifications(true), 30000)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperuser, currentUser?.userId])

  function toggleProfile() {
    setOpenMenu(isProfileOpen ? null : 'profile')
  }

  const readIdsFor = () => (isSupportAgent ? readSupportNotificationIds(currentUser) : isProviderAccount ? readProviderNotificationIds(currentUser) : readNotificationIds(currentUser))
  const saveReadIds = (ids) => (isSupportAgent ? saveSupportNotificationIds(currentUser, ids)
    : isProviderAccount ? saveProviderNotificationIds(currentUser, ids)
    : localStorage.setItem(notificationReadKey(currentUser), JSON.stringify([...ids])))

  async function markNotificationRead(notification) {
    if (variant?.notifications === 'superuser') {
      const saved = await saveSuperuserNotifications(notifications.map((item) => item.id === notification.id ? { ...item, read: true, isRead: true, isNew: false } : item))
      if (!saved) return
      setOpenMenu(null)
      navigate(notification.to)
      return
    }
    try {
      const readIds = readIdsFor()
      readIds.add(notification.id)
      saveReadIds(readIds)
      setNotifications((current) => current.map((item) => item.id === notification.id ? { ...item, isUnread: false } : item))
      setOpenMenu(null)
      navigate(notification.to)
    } catch {
      setNotificationError('Read state could not be saved in this browser.')
    }
  }

  function markAllNotificationsRead() {
    if (variant?.notifications === 'superuser') {
      void saveSuperuserNotifications(notifications.map((item) => ({ ...item, read: true, isRead: true, isNew: false })))
      return
    }
    try {
      const readIds = readIdsFor()
      notifications.forEach((notification) => readIds.add(notification.id))
      saveReadIds(readIds)
      setNotifications((current) => current.map((notification) => ({ ...notification, isUnread: false })))
    } catch {
      setNotificationError('Read state could not be saved in this browser.')
    }
  }

  async function saveSuperuserNotifications(nextNotifications) {
    try {
      const entry = await saveSuperuserModuleData({ ...(superuserModuleData || {}), notifications: nextNotifications }, superuserStateExists)
      const nextData = entry?.value && typeof entry.value === 'object' ? entry.value : { ...(superuserModuleData || {}), notifications: nextNotifications }
      setSuperuserModuleData(nextData)
      setSuperuserStateExists(true)
      setNotifications(buildSuperuserNotifications(nextData, []))
      setNotificationState('ready')
      setNotificationError('')
      return true
    } catch (error) {
      setNotificationError(error.message || 'Notification changes could not be saved.')
      return false
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
  const visibleNotifications = showAllNotifications ? activeNotifications : activeNotifications.slice(0, 4)

  return <header className={`se-topbar${role ? ` se-topbar--${role}` : ''}`}>
    {variant?.brandLinksHome === false
      ? <div className="se-topbar__brand">{brandContent}</div>
      : <Link className="se-topbar__brand" to="/">{brandContent}</Link>}

    <div className="se-topbar__search">
      {isSupportPage
        ? <input type="search" placeholder="Search tickets or booking references..." aria-label="Search support tickets" value={ticketSearch} onChange={(event) => { setTicketSearch(event.target.value); if (isSupportDashboard) window.dispatchEvent(new CustomEvent('serveease-ticket-search', { detail: event.target.value })) }} onKeyDown={(event) => { if (event.key === 'Enter' && !isSupportDashboard) navigate(`/employee/support-tickets?search=${encodeURIComponent(ticketSearch)}`) }} />
        : role === 'provider'
        ? <input key={pathname} type="search" placeholder={providerSearchPlaceholders[pathname] || 'Search...'} aria-label="Search this page" onChange={(event) => applyProviderSearch(pathname, event.target.value)} />
        : <input key={pathname} type="search" placeholder={pathname === '/admin/finance' ? 'Search transaction, booking, customer or provider' : 'Search for services...'} aria-label={pathname === '/admin/finance' ? 'Search financial records' : 'Search for services'} onKeyDown={(event) => { if (event.key === 'Enter') { if (pathname === '/admin/finance') window.dispatchEvent(new CustomEvent('serveease-finance-search', { detail: event.currentTarget.value })); else navigate(`/services?q=${encodeURIComponent(event.currentTarget.value)}`) } }} />}
    </div>

    <div className="se-topbar__actions" ref={actionsRef}>
      {variant?.notifications && <div className="se-topbar__notifications">
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
            : <svg aria-hidden="true" className="se-topbar__bell" focusable="false" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v3.2l-1.3 2.6A1 1 0 0 0 5.6 16h12.8a1 1 0 0 0 .9-1.2L18 12.2V9a6 6 0 0 0-6-6Z" /><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" /></svg>}
          {notificationUnreadCount > 0 && <span className="se-topbar__count">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
        </button>
        {isNotificationsOpen && <section aria-label="Notifications" className="se-notification-panel" id="se-topbar-notification-panel">
          <div className="se-notification-panel__head">
            <h3>Notifications</h3>
          {(variant.notifications === 'superuser' ? notificationState : customerNotificationState) === 'ready' && <span className="se-notification-panel__badge">{notificationUnreadCount} New</span>}
          </div>
          {(variant.notifications === 'superuser' ? notificationState : customerNotificationState) === 'loading' && <p className="se-notification-panel__state" role="status">Loading notifications…</p>}
          {(variant.notifications === 'superuser' ? notificationState : customerNotificationState) === 'error' && <div className="se-notification-panel__error" role="alert">
            <p>{notificationError}</p>
            <button className="se-notification-panel__action" onClick={() => void loadNotifications()} type="button">Retry</button>
          </div>}
          {notificationError && (variant.notifications === 'superuser' ? notificationState : customerNotificationState) === 'ready' && <p className="se-notification-panel__error-message" role="alert">{notificationError}</p>}
          {customerNotificationState === 'signed-out' && <p className="se-notification-panel__state">Sign in to view notifications.</p>}
          {variant.notifications !== 'superuser' && customerNotificationState === 'unavailable' && <p className="se-notification-panel__state">Notifications are not available for this role in the React app yet.</p>}
          {(variant.notifications === 'superuser' ? notificationState : customerNotificationState) === 'ready' && <>
            {activeNotifications.length === 0
              ? <div className="se-notification-panel__empty"><strong>No notifications yet</strong><span>{isSupportAgent ? 'New tickets and customer or provider messages will appear here.' : isProviderAccount ? 'New booking requests and support replies will appear here.' : 'New booking, payment, and support updates will appear here.'}</span></div>
              : <div className="se-notification-panel__list">{visibleNotifications.map((notification) => <article className={`se-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id}>
                <button className="se-notification-item__open" onClick={() => markNotificationRead(notification)} type="button"><p>{notification.text}</p><time dateTime={notification.createdAt || undefined}>{formatNotificationTime(notification.createdAt)}</time></button>
                {variant.notifications === 'superuser' && notification.isUnread && <button className="se-notification-item__read" onClick={() => void saveSuperuserNotifications(notifications.map((item) => item.id === notification.id ? { ...item, read: true, isRead: true, isNew: false } : item))} type="button">Mark as Read</button>}
              </article>)}</div>}
            {notificationUnreadCount > 0 && <button className="se-notification-panel__action" onClick={markAllNotificationsRead} type="button">Mark All as Read</button>}
            {variant.notifications === 'superuser' && activeNotifications.length > 0 && <button className="se-notification-panel__action" onClick={() => void saveSuperuserNotifications([])} type="button">Clear All</button>}
            {activeNotifications.length > 4 && <button className="se-notification-panel__action" onClick={() => setShowAllNotifications((shown) => !shown)} type="button">{showAllNotifications ? 'Show Recent' : 'View All Notifications'}</button>}
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
