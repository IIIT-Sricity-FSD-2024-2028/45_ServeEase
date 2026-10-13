import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import './Navbar.css'

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [isProfileOpen, setIsProfileOpen] = useState(false)
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

  function handleLogout() {
    logout()
    setIsProfileOpen(false)
    navigate('/')
  }

  return <header className="app-header">
    <Link className="brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
    <nav className="primary-nav" aria-label="Primary navigation"><NavLink to="/">Home</NavLink><NavLink to="/services">Services</NavLink>{isAuthenticated && currentUser?.role === 'customer' && <><NavLink to="/customer/dashboard">Dashboard</NavLink><NavLink to="/customer/bookings">My Bookings</NavLink></>}{isAuthenticated && currentUser?.role === 'provider' && <><NavLink to="/provider/dashboard">Dashboard</NavLink><NavLink to="/provider/bookings">Bookings</NavLink><NavLink to="/provider/availability">Availability</NavLink><NavLink to="/provider/services">Services</NavLink><NavLink to="/provider/earnings">Earnings</NavLink><NavLink to="/provider/support">Support</NavLink></>}</nav>
    <div className="dashboard-search"><input type="search" placeholder="Search for services..." aria-label="Search for services" onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/services?q=${encodeURIComponent(event.currentTarget.value)}`) }} /></div>
    <div className="dashboard-topbar-actions">
      <button className="icon-btn" type="button" aria-label="Notifications">🔔</button>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button className="profile-btn" type="button" aria-label={`${area} profile`} aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)}>👤</button>
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
            <button type="button" role="menuitem" onClick={handleLogout}>Logout</button>
          </> : <>
            <Link to="/login" role="menuitem" onClick={() => setIsProfileOpen(false)}>Login</Link>
          </>}
        </div>}
      </div>
    </div>
  </header>
}
