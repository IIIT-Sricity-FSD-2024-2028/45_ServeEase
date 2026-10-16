import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './contactSupport.css'

// The contact details the original customer support page shows (front-end/customer-support-center.html,
// "Need Immediate Help?"). There is no public ticket endpoint, so this page only lists the real channels and
// never submits anything or claims a request was sent.
export const SUPPORT_EMAIL = 'support@serveease.com'
export const SUPPORT_PHONE = '+91 1800-123-4567'
const SUBJECTS = {
  customer: 'Suspended ServeEase customer account',
  provider: 'Suspended ServeEase provider account',
}

export default function ContactSupportPage() {
  const location = useLocation()
  const { currentUser, isAuthenticated } = useAuth()
  // The navigation state only chooses the wording; it carries no account data and nothing here trusts it.
  const kind = Object.hasOwn(SUBJECTS, location.state?.suspended) ? location.state.suspended : null
  const subject = SUBJECTS[kind] || 'ServeEase support request'
  const ticketsPath = isAuthenticated && currentUser?.role === 'customer' ? '/customer/support' : isAuthenticated && currentUser?.role === 'provider' ? '/provider/support' : null
  return <main className="contact-support">
    <section aria-labelledby="contact-support-title" className="contact-support-card">
      <h1 id="contact-support-title">Contact ServeEase Support</h1>
      <p className="contact-support-lead">Our support team is available 24/7. You do not need to sign in to reach us.</p>
      {kind && <p className="contact-support-context" role="status">Your ServeEase {kind} account is currently suspended. Tell the support team the email address on your account and they can explain the suspension and the next steps.</p>}
      <div className="contact-support-methods">
        <article>
          <h2>Email</h2>
          <a className="btn btn-primary" href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`}>{SUPPORT_EMAIL}</a>
        </article>
        <article>
          <h2>Phone</h2>
          <a className="btn btn-primary" href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, '')}`}>{SUPPORT_PHONE}</a>
        </article>
      </div>
      <p className="contact-support-note">This page does not send a message or create a support ticket. Use the email or phone details above to reach the team.</p>
      <div className="contact-support-actions">
        <Link className="btn btn-outline" to="/login">Back to Login</Link>
        {ticketsPath && <Link className="btn btn-outline" to={ticketsPath}>Go to your support tickets</Link>}
      </div>
    </section>
  </main>
}
