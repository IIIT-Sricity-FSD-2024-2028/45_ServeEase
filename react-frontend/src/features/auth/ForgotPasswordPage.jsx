import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FieldError } from './AuthParts'
import './auth.css'

// front-end/forgot-password.html + auth.js setupForgotPasswordForm(): the reset request is validated in the
// page and then swapped for the confirmation card. ServeEase has no mail service, so this stays a demo
// workflow — nothing is sent and no account is revealed, which is also what a real reset endpoint should do.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  function submit(event) {
    event.preventDefault()
    const value = email.trim()
    if (!value) return setError('Registered email is required.')
    if (!emailPattern.test(value)) return setError('Enter a valid email address.')
    setError('')
    setSent(true)
  }

  return (
    <section className="auth-page forgot-page">
      <Link className="back-link" to="/login">← Back to Login</Link>
      <div className="forgot-brand">ServeEase</div>

      {sent ? (
        <div className="forgot-card">
          <div className="forgot-icon success" aria-hidden="true">✓</div>
          <h1>Password Reset Link Sent</h1>
          <p>If an account exists for this email address, a password reset link has been sent. Please check your inbox.</p>
          <div className="note-box">Demo mode: this project simulates the password reset process. In a production system, a secure password reset email would be sent automatically.</div>
          <Link className="btn forgot-btn" to="/login">Return to Login</Link>
        </div>
      ) : (
        <div className="forgot-card">
          <div className="forgot-icon" aria-hidden="true">✉</div>
          <h1>Reset Your Password</h1>
          <p>Enter your registered email address to receive a password reset link.</p>
          <form onSubmit={submit} noValidate>
            <div className="form-group">
              <label htmlFor="forgotEmail">Email Address</label>
              <input
                id="forgotEmail"
                name="email"
                type="email"
                autoComplete="email"
                className={error ? 'error-field' : undefined}
                placeholder="Enter your registered email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setError('') }}
              />
              <FieldError error={error} />
            </div>
            <button className="btn forgot-btn" type="submit">Send Reset Link</button>
          </form>
          <Link className="forgot-bottom-link" to="/login">Back to Login</Link>
        </div>
      )}
    </section>
  )
}
