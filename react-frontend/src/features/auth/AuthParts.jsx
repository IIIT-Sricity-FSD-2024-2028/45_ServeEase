import { useRef, useState } from 'react'

export function FieldError({ id, error }) {
  return <small className="error" id={id}>{error || ''}</small>
}

export function PasswordInput(props) {
  const inputRef = useRef(null)
  const [visible, setVisible] = useState(false)
  function toggle() {
    setVisible(!visible)
    inputRef.current?.focus({ preventScroll: true })
  }
  return (
    <div className="password-input-wrap">
      <input {...props} ref={inputRef} type={visible ? 'text' : 'password'} />
      <button className="password-toggle" type="button" aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} onClick={toggle}>
        {visible ? (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 3 18 18" /><path d="M10.6 6.2A10.8 10.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17.5 17.5 0 0 1-3.1 3.8M6.1 6.7C3.8 8.2 2.5 12 2.5 12s3.5 6 9.5 6c1.2 0 2.3-.2 3.3-.6" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.5" /></svg>
        )}
      </button>
    </div>
  )
}

export function AuthFooterLinks() {
  return (
    <div className="auth-footer-links">
      <a href="/#about-us">About Us</a>
      <a href="/#privacy-policy">Privacy Policy</a>
      <a href="/#terms-and-conditions">Terms &amp; Conditions</a>
      <a href="/customer/support">Contact Support</a>
    </div>
  )
}

export function AuthPromo() {
  return (
    <div className="auth-right">
      <div className="promo-image">
        <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80" alt="ServeEase service" />
      </div>
      <h2>Book Trusted Home Services Easily</h2>
      <p>Connect with verified professionals for your home service needs.</p>
    </div>
  )
}
