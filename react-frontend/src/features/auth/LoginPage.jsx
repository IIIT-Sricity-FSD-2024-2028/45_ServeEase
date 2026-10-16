import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { destinationFor } from '../../app/destinations'
import { useAuth } from '../../context/useAuth'
import { authApi } from '../../services/api'
import { suspendedKind } from '../../services/apiClient'
import { AuthFooterLinks, AuthPromo, FieldError, PasswordInput } from './AuthParts'
import { SuspendedAccountNotice } from './SuspendedAccountNotice'
import './auth.css'

export function LoginPage() {
  const { isAuthenticated, currentUser, establishSession, suspension, clearSuspension, reportSuspension } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [values, setValues] = useState({ identifier: '', password: '' }); const [errors, setErrors] = useState({}); const [submitted, setSubmitted] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const backToLogin = () => { clearSuspension(); setValues((current) => ({ ...current, password: '' })); setError('') }
  if (isAuthenticated) return <Navigate replace to={location.state?.from || destinationFor(currentUser)} />
  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value })
  const stateClass = (name) => (errors[name] ? 'error-field' : submitted ? 'success-field' : undefined)

  async function submit(event) {
    event.preventDefault(); setError('')
    const nextErrors = { identifier: !values.identifier.trim() && 'Email or ServeEase ID is required.', password: !values.password && 'Password is required.' }
    setErrors(nextErrors); setSubmitted(true)
    if (Object.values(nextErrors).some(Boolean)) return
    setLoading(true); clearSuspension()
    // The account and its workspace come from the identifier alone; the page claims no role.
    try { const result = await authApi.login({ identifier: values.identifier.trim(), password: values.password }); establishSession(result); navigate(location.state?.from || destinationFor(result.user), { replace: true }) } catch (requestError) { const kind = suspendedKind(requestError); if (kind) reportSuspension({ kind, reason: requestError.reason || '' }); else setError(requestError.message) } finally { setLoading(false) }
  }

  return (
    <section className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-left">
          <Link className="brand auth-brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
          <div className="auth-card">
            {suspension ? <SuspendedAccountNotice kind={suspension.kind} onBack={backToLogin} reason={suspension.reason} /> : <>
            <h1>Welcome to ServeEase</h1>
            <p className="auth-subtitle">Login or create an account to continue</p>
            <form onSubmit={submit} noValidate>
              <div className="form-group">
                <label htmlFor="loginIdentifier">Email or ServeEase ID</label>
                <input id="loginIdentifier" name="identifier" type="text" className={stateClass('identifier')} value={values.identifier} onChange={update} placeholder="Enter your email or ServeEase ID" autoComplete="username" />
                <FieldError error={errors.identifier} />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <PasswordInput id="loginPassword" name="password" className={stateClass('password')} value={values.password} onChange={update} placeholder="Enter your password" autoComplete="current-password" />
                <FieldError error={errors.password} />
              </div>
              <Link className="link-text login-forgot-link" to="/forgot-password">Forgot Password?</Link>
              <small className="error form-error" role="alert">{error}</small>
              <small className="success-message" />
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            </form>
            <p className="auth-switch">Don’t have an account? <Link to="/signup?role=customer">Sign Up</Link></p>
            </>}
          </div>
          <AuthFooterLinks />
        </div>
        <AuthPromo />
      </div>
    </section>
  )
}
