import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './homePage.css'

// Public navbar from front-end/index.html and category-services.html. `sectionBase` is '' on the
// home page (in-page anchors) and '/' elsewhere. Pass `city` to show the city selector.
export function PublicHeader({ city, cities, onCityChange, sectionBase = '' }) {
  const { currentUser, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [profileOpen, setProfileOpen] = useState(false)
  const menuRef = useRef(null)
  const profileButtonRef = useRef(null)
  const isCustomer = currentUser?.role === 'customer'
  const isProvider = currentUser?.role === 'provider'

  useEffect(() => {
    function closeOutside(event) {
      if (!menuRef.current?.contains(event.target)) setProfileOpen(false)
    }
    function closeEscape(event) {
      if (event.key === 'Escape' && profileOpen) {
        setProfileOpen(false)
        profileButtonRef.current?.focus()
      }
    }
    document.addEventListener('click', closeOutside)
    document.addEventListener('keydown', closeEscape)
    return () => {
      document.removeEventListener('click', closeOutside)
      document.removeEventListener('keydown', closeEscape)
    }
  }, [profileOpen])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setProfileOpen(false)
      navigate('/')
    }
  }

  return <header className="home-navbar">
    <div className="home-container home-nav-content">
      <Link className="home-brand" to="/">
        <span className="home-brand-icon">SE</span>
        <span>ServeEase</span>
      </Link>
      <nav aria-label="Home page sections" className="home-nav-links">
        <a href={`${sectionBase}#services`}>Services</a>
        <a href={`${sectionBase}#categories`}>Categories</a>
      </nav>
      {city && <div className="home-city-selector-slot">
        <span aria-hidden="true" className="home-city-pin">📍</span>
        <select aria-label="Choose your city" className="home-city-selector" onChange={(event) => onCityChange(Number(event.target.value))} value={city.id}>
          {cities.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </div>}
      <div className="home-nav-actions">
        {isAuthenticated && (isCustomer || isProvider) ? <div className="home-profile-menu-wrap" ref={menuRef}>
          <button aria-expanded={profileOpen} aria-label="Open profile menu" className="home-profile-button" onClick={() => setProfileOpen((open) => !open)} ref={profileButtonRef} type="button">👤</button>
          {profileOpen && <div className="home-profile-dropdown" role="menu">
            <Link onClick={() => setProfileOpen(false)} role="menuitem" to={isProvider ? '/provider/account' : '/customer/profile'}>My Profile</Link>
            <Link onClick={() => setProfileOpen(false)} role="menuitem" to={isProvider ? '/provider/dashboard' : '/customer/dashboard'}>Go to Dashboard</Link>
            <button onClick={handleLogout} role="menuitem" type="button">Logout</button>
          </div>}
        </div> : <Link className="home-button home-button-primary" to="/login">Login / Register</Link>}
      </div>
    </div>
  </header>
}

export function PublicFooter({ sectionBase = '' }) {
  return <footer className="home-footer" id="footer">
    <div className="home-container home-footer-grid">
      <div><h4>Company</h4><a href={`${sectionBase}#about-us`}>About Us</a></div>
      <div><h4>Support</h4><Link to="/contact-support">Contact Support</Link><Link to="/customer/bookings">Track Booking</Link></div>
      <div><h4>Legal</h4><a href={`${sectionBase}#terms-and-conditions`}>Terms &amp; Conditions</a><a href={`${sectionBase}#privacy-policy`}>Privacy Policy</a><a href={`${sectionBase}#cancellation-policy`}>Cancellation Policy</a></div>
    </div>
    <div className="home-container home-footer-bottom-row"><p>© 2026 ServeEase. All rights reserved.</p><div className="home-footer-socials"><span>f</span><span>◎</span><span>𝕏</span><span>in</span></div></div>
  </footer>
}
