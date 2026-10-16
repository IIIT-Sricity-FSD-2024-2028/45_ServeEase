import { Link } from 'react-router-dom'
import '../../features/home/homePage.css'

// Customer and public pages use the footer of front-end/customer-dashboard.html (same markup and look as the
// home page footer, styled by homePage.css). Provider and employee areas keep the compact footer.
export function Footer({ area }) {
  // provider-*.html carry the same footer as the customer pages; the customer-only links go to their provider/public equivalents.
  if (area === 'Provider') {
    return <footer className="home-footer customer-footer">
      <div className="home-container home-footer-grid">
        <div><h4>Company</h4><a href="/#about-us">About Us</a></div>
        <div><h4>Support</h4><Link to="/contact-support">Contact Support</Link><Link to="/provider/bookings">Track Booking</Link></div>
        <div><h4>Legal</h4><a href="/#terms-and-conditions">Terms &amp; Conditions</a><a href="/#privacy-policy">Privacy Policy</a><a href="/#cancellation-policy">Cancellation Policy</a></div>
      </div>
      <div className="home-container home-footer-bottom-row"><p>© 2026 ServeEase. All rights reserved.</p><div className="home-footer-socials"><span>f</span><span>𝕏</span><span>in</span></div></div>
    </footer>
  }
  if (area === 'Customer' || area === 'Public') {
    return <footer className="home-footer customer-footer">
      <div className="home-container home-footer-grid">
        <div><h4>Company</h4><a href="/#about-us">About Us</a></div>
        <div><h4>Support</h4><Link to="/customer/support">Contact Support</Link><Link to="/customer/bookings">Track Booking</Link></div>
        <div><h4>Legal</h4><a href="/#terms-and-conditions">Terms &amp; Conditions</a><a href="/#privacy-policy">Privacy Policy</a><a href="/#cancellation-policy">Cancellation Policy</a></div>
      </div>
      <div className="home-container home-footer-bottom-row"><p>© 2026 ServeEase. All rights reserved.</p><div className="home-footer-socials"><span>f</span><span>𝕏</span><span>𝕏</span><span>in</span></div></div>
    </footer>
  }
  return <footer className="app-footer">
    <div className="footer-grid">
      <div><h4>Company</h4><a href="/#about-us">About Us</a></div>
      <div><h4>Support</h4><Link to="/customer/bookings">Track Booking</Link></div>
      <div><h4>Legal</h4><a href="/#terms-and-conditions">Terms &amp; Conditions</a><a href="/#privacy-policy">Privacy Policy</a><a href="/#cancellation-policy">Cancellation Policy</a></div>
    </div>
    <div className="footer-bottom-row"><p>© 2026 ServeEase. All rights reserved.</p><div>f · 𝕏 · in</div></div>
  </footer>
}
