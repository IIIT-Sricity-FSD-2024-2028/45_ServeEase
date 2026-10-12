import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import './auth.css'

export function LoginPage() {
  const { isAuthenticated, startDevelopmentDemoSession } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const destination = location.state?.from || '/customer/dashboard'

  if (isAuthenticated) return <Navigate replace to={destination} />

  function submit(event) {
    event.preventDefault()
    setError('')
    if (!email.trim() || !password) { setError('Enter your email address and password.'); return }
    setError('Password login is unavailable because this backend does not provide an authentication endpoint.')
  }

  function demoLogin() {
    setLoading(true)
    setError('')
    if (startDevelopmentDemoSession()) navigate(destination, { replace: true })
    else setError('The development demo session is unavailable.')
    setLoading(false)
  }

  return <section className="auth-page"><form className="auth-card" onSubmit={submit}>
    <p className="auth-eyebrow">Welcome to ServeEase</p><h1>Sign in</h1>
    <p>Use your account when authentication becomes available.</p>
    <label>Email address<input autoComplete="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
    <label>Password<input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
    {error && <p className="auth-error" role="alert">{error}</p>}
    <button className="journey-button" type="submit">Sign in</button>
    {import.meta.env.DEV && <button className="journey-button journey-button--secondary" disabled={loading} onClick={demoLogin} type="button">{loading ? 'Starting demo…' : 'Use demo customer session'}</button>}
    {import.meta.env.DEV && <small>This demo-only session uses the documented CUS001 customer account; it is not secure authentication.</small>}
    <p className="auth-links"><Link to="/">Return home</Link></p>
  </form></section>
}
