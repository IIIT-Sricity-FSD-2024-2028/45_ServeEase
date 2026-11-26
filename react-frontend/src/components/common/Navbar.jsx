import { formatDisplayDateTime } from '../../features/customer/customerOperations'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import {
  clearNotifications, closePanel, fetchNotifications, markNotificationsRead, notificationOwner, openPanel,
  selectNotificationFeed, toggleShowAll,
} from '../../store/slices/notificationSlice.js'
import { applyProviderSearch, providerSearchPlaceholders } from './providerSearch'
import { adminSearchPlaceholder, applyAdminSearch } from '../../features/admin/adminSearch'
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
    // superuser-management.html and superuser-provider-verification.html add a Provider Verification link.
    profileLinks: (pathname) => [
      { label: '⌂ Superuser Dashboard', to: '/admin' },
      ...(['/admin/customers', '/admin/providers', '/admin/verification'].includes(pathname) ? [{ label: 'Provider Verification', to: '/admin/verification' }] : []),
    ],
  },
  // Employees outside Support (customer-operations.html / provider-operations.html have no notification bell).
  'customer-operations': {
    brandLinksHome: false,
    notifications: 'customer-operations',
    profileCard: 'Customer Operations',
    profileLinks: () => [{ label: 'Customer Operations', to: '/employee/customer-operations' }],
  },
  'provider-operations': {
    brandLinksHome: false,
    notifications: 'provider-operations',
    profileCard: 'Provider Operations',
    profileLinks: () => [{ label: 'Provider Operations', to: '/employee/provider-operations' }],
  },
  // A department without a workspace gets no links, only Logout.
  employee: { brandLinksHome: false, notifications: null, profileCard: 'Employee', profileLinks: () => [] },
}

// Every employee signs in with the 'support' role; the topbar follows the department on their record.
const employeeVariants = { 'Customer Operations': 'customer-operations', 'Provider Operations': 'provider-operations', Support: 'support' }
const areaRoles = { Customer: 'customer', Provider: 'provider' }

// api.js ServeEaseDate.formatDateTime(): DD-MM-YYYY hh:mm AM/PM, as the original notification panel shows it.
function formatNotificationTime(value) {
  return value ? formatDisplayDateTime(value) : 'Time unavailable'
}

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const dispatch = useAppDispatch()
  const { panelOpen, showAll: showAllNotifications } = useAppSelector((state) => state.notification)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [profileOpen, setProfileOpen] = useState(false)
  const isSupportPage = pathname.startsWith('/employee/support-tickets')
  const isSupportDashboard = pathname === '/employee/support-tickets'
  const [ticketSearch, setTicketSearch] = useState('')
  const actionsRef = useRef(null)
  const profileButtonRef = useRef(null)
  const notificationButtonRef = useRef(null)
  const openMenu = panelOpen ? 'notifications' : profileOpen ? 'profile' : null
  const setOpenMenu = useCallback((menu) => {
    setProfileOpen(menu === 'profile')
    dispatch(menu === 'notifications' ? openPanel() : closePanel())
  }, [dispatch])

  // Route changes (including browser back/forward) always leave both menus closed.
  const [menuPathname, setMenuPathname] = useState(pathname)
  if (menuPathname !== pathname) {
    setMenuPathname(pathname)
    setProfileOpen(false)
  }
  useEffect(() => { dispatch(closePanel()) }, [pathname, dispatch])

  const accountVariant = currentUser?.role === 'support' ? employeeVariants[currentUser.department] || 'employee' : currentUser?.role
  const role = (isAuthenticated && topbarVariants[accountVariant] ? accountVariant : null) || areaRoles[area] || null
  const variant = role ? topbarVariants[role] : null
  const isProfileOpen = openMenu === 'profile'
  const isNotificationsOpen = openMenu === 'notifications'
  const isSupportAgent = variant?.notifications === 'support' && currentUser?.role === 'support'
  const isOperationsEmployee = ['customer-operations', 'provider-operations'].includes(role) && currentUser?.role === 'support'
  const isProviderAccount = variant?.notifications === 'provider' && currentUser?.role === 'provider'
  const isSuperuser = variant?.notifications === 'superuser' && currentUser?.role === 'superuser'
  const isCustomer = variant?.notifications === 'customer' && currentUser?.role === 'customer'
  // The kind of feed this account may load; null when the bell has nothing to show for it.
  const kind = isSuperuser || isSupportAgent || isProviderAccount || isOperationsEmployee || isCustomer ? variant.notifications : null
  const feed = useAppSelector((state) => selectNotificationFeed(state, notificationOwner(kind, currentUser)))
  const activeNotifications = feed.items
  const notificationUnreadCount = feed.unreadCount
  const notificationState = !kind ? (isAuthenticated ? 'unavailable' : 'signed-out')
    : feed.status === 'succeeded' ? 'ready' : feed.status === 'failed' ? 'error' : feed.status

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
  }, [openMenu, setOpenMenu])

  function loadNotifications(silent = false) {
    if (kind) dispatch(fetchNotifications({ kind, user: currentUser, silent }))
  }

  function toggleNotifications() {
    if (isNotificationsOpen) {
      setOpenMenu(null)
      return
    }
    setOpenMenu('notifications')
    loadNotifications()
  }

  // Every bell except the customer's shows a live unread count, so new work is checked for in the background.
  useEffect(() => {
    if (!kind || kind === 'customer') return undefined
    const load = () => dispatch(fetchNotifications({ kind, user: currentUser, silent: true }))
    const first = window.setTimeout(load, 0)
    const timer = window.setInterval(load, 30000)
    return () => { window.clearTimeout(first); window.clearInterval(timer) }
  }, [kind, currentUser, dispatch])

  function toggleProfile() {
    setOpenMenu(isProfileOpen ? null : 'profile')
  }

  const markRead = (ids) => dispatch(markNotificationsRead({ kind, user: currentUser, ids }))

  async function markNotificationRead(notification) {
    if (notification.isUnread || kind !== 'superuser') {
      const result = await markRead([notification.id])
      if (result.error) return
    }
    setOpenMenu(null)
    navigate(notification.to)
  }

  function markAllNotificationsRead() {
    markRead(activeNotifications.map((notification) => notification.id))
  }

  async function handleLogout() {
    setOpenMenu(null)
    // Leave the protected route before the session clears; otherwise its guard redirects to /login
    // instead of home (the original pages log out to index.html). Providers never land on the home page.
    navigate(role === 'provider' || currentUser?.role === 'support' ? '/login' : '/')
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
        : role === 'superuser' && pathname.startsWith('/admin') && pathname !== '/admin/finance'
        ? <input key={pathname} type="search" placeholder={adminSearchPlaceholder(pathname)} aria-label="Search this page" onChange={(event) => applyAdminSearch(pathname, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { const target = applyAdminSearch(pathname, event.currentTarget.value, true); if (target) navigate(target) } }} />
        : role === 'customer-operations' || role === 'provider-operations'
        ? <input type="search" placeholder={role === 'customer-operations' ? 'Search customers...' : 'Search providers...'} aria-label={role === 'customer-operations' ? 'Search customers' : 'Search providers'} onChange={(event) => window.dispatchEvent(new CustomEvent('serveease-operations-search', { detail: event.target.value }))} />
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
          <svg aria-hidden="true" className="se-topbar__bell" focusable="false" viewBox="0 0 24 24"><path d="M12 3a6 6 0 0 0-6 6v3.2l-1.3 2.6A1 1 0 0 0 5.6 16h12.8a1 1 0 0 0 .9-1.2L18 12.2V9a6 6 0 0 0-6-6Z" /><path d="M9.5 18.5a2.5 2.5 0 0 0 5 0" /></svg>
          {notificationUnreadCount > 0 && <span className="se-topbar__count">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>}
        </button>
        {isNotificationsOpen && <section aria-label="Notifications" className="se-notification-panel" id="se-topbar-notification-panel">
          <div className="se-notification-panel__head">
            <h3>Notifications</h3>
          {notificationState === 'ready' && <span className="se-notification-panel__badge">{notificationUnreadCount} New</span>}
          </div>
          {notificationState === 'loading' && <p className="se-notification-panel__state" role="status">Loading notifications…</p>}
          {notificationState === 'error' && <div className="se-notification-panel__error" role="alert">
            <p>{feed.error}</p>
            <button className="se-notification-panel__action" onClick={() => loadNotifications()} type="button">Retry</button>
          </div>}
          {feed.error && notificationState === 'ready' && <p className="se-notification-panel__error-message" role="alert">{feed.error}</p>}
          {notificationState === 'signed-out' && <p className="se-notification-panel__state">Sign in to view notifications.</p>}
          {notificationState === 'unavailable' && <p className="se-notification-panel__state">Notifications are not available for this role in the React app yet.</p>}
          {notificationState === 'ready' && <>
            {activeNotifications.length === 0
              ? <div className="se-notification-panel__empty"><strong>No notifications yet</strong><span>{variant.notifications === 'superuser' ? 'Escalated tickets and platform updates will appear here.' : isOperationsEmployee ? 'Relevant support tickets, signups, and verification work will appear here.' : isSupportAgent ? 'New tickets and customer or provider messages will appear here.' : isProviderAccount ? 'New booking requests and support replies will appear here.' : 'New booking, payment, and support updates will appear here.'}</span></div>
              : <div className="se-notification-panel__list">{visibleNotifications.map((notification) => <article className={`se-notification-item${notification.isUnread ? ' is-unread' : ''}`} key={notification.id}>
                <button className="se-notification-item__open" onClick={() => markNotificationRead(notification)} type="button"><p>{notification.text}</p><time dateTime={notification.createdAt || undefined}>{formatNotificationTime(notification.createdAt)}</time></button>
              </article>)}</div>}
            {notificationUnreadCount > 0 && <button className="se-notification-panel__action" onClick={markAllNotificationsRead} type="button">Mark All as Read</button>}
            {variant.notifications === 'superuser' && activeNotifications.length > 0 && <button className="se-notification-panel__action" onClick={() => dispatch(clearNotifications(currentUser))} type="button">Clear All</button>}
            {activeNotifications.length > 4 && <button className="se-notification-panel__action" onClick={() => dispatch(toggleShowAll())} type="button">{showAllNotifications ? 'Show Recent' : 'View All Notifications'}</button>}
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
          </> : <Link onClick={() => setOpenMenu(null)} to="/login">Login/Signup</Link>}
        </div>}
      </div>
    </div>
  </header>
}
