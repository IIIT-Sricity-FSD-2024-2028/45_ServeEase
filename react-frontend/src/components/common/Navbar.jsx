import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/useAuth'
import { API_BASE_URL } from '../../services/apiClient'
import './Navbar.css'

const legacyFrontendOrigin = new URL(API_BASE_URL).origin

export function Navbar({ area = 'ServeEase' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
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
  }

  return <header className="app-header">
    <Link className="brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
    <div className="dashboard-search"><input type="search" placeholder="Search for services..." aria-label="Search for services" /></div>
    <div className="dashboard-topbar-actions">
      <button className="icon-btn" type="button" aria-label="Notifications">🔔</button>
      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button className="profile-btn" type="button" aria-label={`${area} profile`} aria-expanded={isProfileOpen} onClick={() => setIsProfileOpen((open) => !open)}>👤</button>
        {isProfileOpen && <div className="profile-dropdown" role="menu">
          {isAuthenticated ? <>
            <div className="profile-dropdown__identity"><strong>{currentUser?.fullName || currentUser?.email || 'Signed-in user'}</strong><span>{currentUser?.email || currentUser?.role || ''}</span></div>
            {area === 'Customer' && <Link to="/customer/bookings" role="menuitem" onClick={() => setIsProfileOpen(false)}>My Bookings</Link>}
            <button type="button" role="menuitem" onClick={handleLogout}>Logout</button>
          </> : <>
            <a href={`${legacyFrontendOrigin}/login.html`} role="menuitem" onClick={() => setIsProfileOpen(false)}>Login</a>
            <a href={`${legacyFrontendOrigin}/signup.html`} role="menuitem" onClick={() => setIsProfileOpen(false)}>Register</a>
          </>}
        </div>}
      </div>
    </div>
  </header>
}
