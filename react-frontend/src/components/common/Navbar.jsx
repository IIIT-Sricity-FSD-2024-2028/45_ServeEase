import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import './Navbar.css'

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isSupportPage = location.pathname.startsWith('/employee/support-tickets')
  const isSupportDashboard = location.pathname === '/employee/support-tickets'
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [ticketSearch, setTicketSearch] = useState('')
  const [hasNewNotifications, setHasNewNotifications] = useState(() => {
    if (!location.pathname.startsWith('/employee/support-tickets')) return false
    try {
      const stored = JSON.parse(localStorage.getItem('serveEaseSupportModuleData') || 'null')
      return Boolean(stored?.notifications?.some((item) => item.read !== true && item.isNew !== false))
    } catch { return false }
  })
  const profileMenuRef = useRef(null)

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) setIsProfileOpen(false)
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setIsProfileOpen(false)
    }

    document.addEventListener('click', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('click', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [])

  useEffect(() => {
    if (!isSupportDashboard) return undefined
    const updateCount = (event) => setHasNewNotifications(Number(event.detail || 0) > 0)
    window.addEventListener('serveease-notifications-count', updateCount)
    return () => window.removeEventListener('serveease-notifications-count', updateCount)
  }, [isSupportDashboard])

  function handleLogout() {
    logout()
    setIsProfileOpen(false)
    navigate('/')
  }

  return <header className={`app-header${isSupportPage ? ' app-header--support' : ''}`}>
    <Link className="brand" to="/"><span className={`brand-icon${isSupportPage ? ' brand-icon--home' : ''}`}>{isSupportPage ? <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z" /></svg> : 'SE'}</span><span>ServeEase</span></Link>
    {!isSupportPage && <nav className="primary-nav" aria-label="Primary navigation"><NavLink to="/">Home</NavLink><NavLink to="/services">Services</NavLink>{isAuthenticated && currentUser?.role === 'customer' && <><NavLink to="/customer/dashboard">Dashboard</NavLink><NavLink to="/customer/bookings">My Bookings</NavLink></>}{isAuthenticated && currentUser?.role === 'provider' && <><NavLink to="/provider/dashboard">Dashboard</NavLink><NavLink to="/provider/bookings">Bookings</NavLink><NavLink to="/provider/availability">Availability</NavLink><NavLink to="/provider/services">Services</NavLink><NavLink to="/provider/earnings">Earnings</NavLink><NavLink to="/provider/support">Support</NavLink></>}{isAuthenticated && currentUser?.role === 'support' && <><NavLink to="/employee/support-tickets">Support tickets</NavLink><NavLink to="/employee/support-workspace">Workspace</NavLink></>}{isAuthenticated && currentUser?.role === 'superuser' && <NavLink to="/admin">Admin</NavLink>}</nav>}
    <div className="dashboard-search"><input type="search" placeholder={isSupportPage ? 'Search tickets or booking references...' : 'Search for services...'} aria-label={isSupportPage ? 'Search support tickets' : 'Search for services'} value={isSupportPage ? ticketSearch : undefined} onChange={isSupportPage ? (event) => { setTicketSearch(event.target.value); if (isSupportDashboard) window.dispatchEvent(new CustomEvent('serveease-ticket-search', { detail: event.target.value })) } : undefined} onKeyDown={isSupportPage ? (event) => { if (event.key === 'Enter' && !isSupportDashboard) navigate(`/employee/support-tickets?search=${encodeURIComponent(ticketSearch)}`) } : (event) => { if (event.key === 'Enter') navigate(`/services?q=${encodeURIComponent(event.currentTarget.value)}`) }} /></div>
    <div className="dashboard-topbar-actions">
      <button className={`icon-btn${isSupportPage ? ' support-header-bell' : ''}`} type="button" aria-label="Notifications" onClick={isSupportPage ? () => navigate('/employee/support-tickets#support-notifications') : undefined}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>{isSupportPage && hasNewNotifications && <span className="support-dot" />}</button>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button className={`profile-btn${isSupportPage ? ' support-profile-btn' : ''}`} type="button" aria-label={`${area} profile`} aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)}>{isSupportPage ? <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.6-3.6 3-5.5 7-5.5s6.4 1.9 7 5.5" /></svg> : '👤'}</button>
        {isProfileOpen && <div className="profile-dropdown" role="menu">
          {isAuthenticated ? <>
            <div className="profile-dropdown__identity"><strong>{currentUser?.fullName || currentUser?.email || 'Signed-in user'}</strong><span>{currentUser?.email || currentUser?.role || ''}</span></div>
            {currentUser?.role === 'customer' && <>
              <Link to="/customer/dashboard" role="menuitem" onClick={() => setIsProfileOpen(false)}>Dashboard</Link>
              <Link to="/customer/bookings" role="menuitem" onClick={() => setIsProfileOpen(false)}>My Bookings</Link>
              <Link to="/customer/profile" role="menuitem" onClick={() => setIsProfileOpen(false)}>My Profile</Link>
              <Link to="/customer/payments" role="menuitem" onClick={() => setIsProfileOpen(false)}>Payment History</Link>
              <Link to="/customer/support" role="menuitem" onClick={() => setIsProfileOpen(false)}>Support Center</Link>
            </>}
            {currentUser?.role === 'provider' && <>
              <Link to="/provider/dashboard" role="menuitem" onClick={() => setIsProfileOpen(false)}>Dashboard</Link>
              <Link to="/provider/bookings" role="menuitem" onClick={() => setIsProfileOpen(false)}>Bookings</Link>
              <Link to="/provider/availability" role="menuitem" onClick={() => setIsProfileOpen(false)}>Availability</Link>
              <Link to="/provider/services" role="menuitem" onClick={() => setIsProfileOpen(false)}>Services</Link>
              <Link to="/provider/support" role="menuitem" onClick={() => setIsProfileOpen(false)}>Support Center</Link>
              <Link to="/provider/account" role="menuitem" onClick={() => setIsProfileOpen(false)}>My Profile</Link>
              <Link to="/provider/earnings" role="menuitem" onClick={() => setIsProfileOpen(false)}>Earnings & Payments</Link>
            </>}
            {currentUser?.role === 'support' && <>
              <Link to="/employee/support-tickets" role="menuitem" onClick={() => setIsProfileOpen(false)}>Support tickets</Link>
              <Link to="/employee/support-workspace" role="menuitem" onClick={() => setIsProfileOpen(false)}>Support workspace</Link>
            </>}
            {currentUser?.role === 'superuser' && <>
              <Link to="/admin" role="menuitem" onClick={() => setIsProfileOpen(false)}>Admin dashboard</Link>
              <Link to="/admin/providers" role="menuitem" onClick={() => setIsProfileOpen(false)}>Providers</Link>
              <Link to="/admin/verification" role="menuitem" onClick={() => setIsProfileOpen(false)}>Verification</Link>
              <Link to="/admin/bookings" role="menuitem" onClick={() => setIsProfileOpen(false)}>Bookings</Link>
            </>}
            <button type="button" role="menuitem" onClick={handleLogout}>Logout</button>
          </> : <>
            <Link to="/login" role="menuitem" onClick={() => setIsProfileOpen(false)}>Login</Link>
          </>}
        </div>}
      </div>
    </div>
  </header>
}
