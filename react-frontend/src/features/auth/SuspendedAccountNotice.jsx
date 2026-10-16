import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'

const copy = {
  customer: { heading: 'Account Suspended', summary: 'Your ServeEase customer account is currently suspended, so access to it is restricted.' },
  provider: { heading: 'Provider Account Suspended', summary: 'Your ServeEase provider account is currently suspended, so access to your provider dashboard is restricted.' },
}

// The restricted-access state of the original login.html (#blockedAccountState), for customers and providers.
// `reason` is whatever the server recorded for this account; it is shown as text only.
export function SuspendedAccountNotice({ kind, reason, onBack }) {
  const heading = useRef(null)
  useEffect(() => { heading.current?.focus() }, [])
  const text = copy[kind] || copy.customer
  const recorded = String(reason || '').trim()
  return <section aria-labelledby="suspendedAccountHeading" className="blocked-account-state" data-suspended-kind={kind}>
    <h2 id="suspendedAccountHeading" ref={heading} tabIndex={-1}>{text.heading}</h2>
    <p role="status">{text.summary}</p>
    <p className="blocked-account-reason-label">Reason:</p>
    <p className="blocked-account-reason">{recorded || 'No reason was recorded for this suspension. Please contact ServeEase Support for more information.'}</p>
    <div className="blocked-account-actions">
      <Link className="btn btn-primary btn-full" state={{ suspended: kind }} to="/contact-support">Contact Support</Link>
      <button className="btn btn-outline btn-full" onClick={onBack} type="button">Back to Login</button>
    </div>
    <p className="blocked-account-note">Contact Support is open to everyone, so you do not need to sign in to reach us.</p>
  </section>
}
