import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { destinationFor } from '../../app/destinations'
import { useAuth } from '../../context/useAuth'
import { authApi } from '../../services/api'
import { suspendedKind } from '../../services/apiClient'
import { AuthFooterLinks, AuthPromo, FieldError, PasswordInput } from './AuthParts'
import { SuspendedAccountNotice } from './SuspendedAccountNotice'
import './auth.css'

const roleTabs = [['customer', 'Customer'], ['provider', 'Provider'], ['employee', 'Employee'], ['superuser', 'Superuser']]
const emailCopy = {
  customer: ['Email', 'Enter your email'],
  provider: ['Provider Email', 'Enter your provider email'],
  superuser: ['Super User Email', 'Enter your super user email'],
}

export function LoginPage() {
  const { isAuthenticated, currentUser, establishSession, suspension, clearSuspension, reportSuspension } = useAuth(); const navigate = useNavigate(); const location = useLocation()
  const [role, setRole] = useState('customer'); const [values, setValues] = useState({ email: '', employeeId: '', department: 'Customer Operations', password: '' }); const [errors, setErrors] = useState({}); const [submitted, setSubmitted] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const backToLogin = () => { clearSuspension(); setValues((current) => ({ ...current, password: '' })); setError('') }
  if (isAuthenticated) return <Navigate replace to={location.state?.from || destinationFor(currentUser)} />
  const employee = role === 'employee'
  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value })
  const stateClass = (name) => (errors[name] ? 'error-field' : submitted ? 'success-field' : undefined)
  const selectRole = (key) => { setRole(key); setErrors({}); setSubmitted(false); setError('') }

  async function submit(event) {
    event.preventDefault(); setError('')
    const nextErrors = employee
      ? { department: !values.department && 'Department is required.', employeeId: !values.employeeId && 'Employee ID is required.', password: !values.password && 'Password is required.' }
      : { email: !values.email && 'Email is required.', password: !values.password && 'Password is required.' }
    setErrors(nextErrors); setSubmitted(true)
    if (Object.values(nextErrors).some(Boolean)) return
    setLoading(true); clearSuspension()
    try { const result = await authApi.login(employee ? { role, employeeId: values.employeeId, department: values.department, password: values.password } : { role, email: values.email, password: values.password }); establishSession(result); navigate(location.state?.from || destinationFor(result.user), { replace: true }) } catch (requestError) { const kind = suspendedKind(requestError); if (kind) reportSuspension({ kind, reason: requestError.reason || '' }); else setError(requestError.message) } finally { setLoading(false) }
  }

  const [emailLabel, emailPlaceholder] = emailCopy[role] || emailCopy.customer
  return (
    <section className="auth-page">
      <div className="auth-wrapper">
        <div className="auth-left">
          <Link className="brand auth-brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
          <div className="auth-card">
            {suspension ? <SuspendedAccountNotice kind={suspension.kind} onBack={backToLogin} reason={suspension.reason} /> : <>
            <h1>Welcome to ServeEase</h1>
            <p className="auth-subtitle">Login or create an account to continue</p>
            <div className="role-tabs">
              {roleTabs.map(([key, label]) => <button key={key} className={`role-tab ${role === key ? 'active' : ''}`} type="button" aria-pressed={role === key} onClick={() => selectRole(key)}>{label}</button>)}
            </div>
            <form onSubmit={submit} noValidate>
              {employee ? <>
                <div className="form-group">
                  <label htmlFor="employeeDepartment">Department</label>
                  <select id="employeeDepartment" name="department" className={stateClass('department')} value={values.department} onChange={update}>{['Customer Operations', 'Provider Operations', 'Support'].map((value) => <option key={value}>{value}</option>)}</select>
                  <FieldError error={errors.department} />
                </div>
                <div className="form-group">
                  <label htmlFor="loginEmployeeId">Employee ID</label>
                  <input id="loginEmployeeId" name="employeeId" className={stateClass('employeeId')} value={values.employeeId} onChange={update} autoComplete="username" placeholder="Enter your employee ID" />
                  <FieldError error={errors.employeeId} />
                </div>
              </> : <div className="form-group">
                <label htmlFor="loginEmail">{emailLabel}</label>
                <input id="loginEmail" name="email" type="email" className={stateClass('email')} value={values.email} onChange={update} placeholder={emailPlaceholder} autoComplete="email" />
                <FieldError error={errors.email} />
              </div>}
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <PasswordInput id="loginPassword" name="password" className={stateClass('password')} value={values.password} onChange={update} placeholder="Enter your password" autoComplete="current-password" />
                <FieldError error={errors.password} />
              </div>
              {!employee && <Link className="link-text login-forgot-link" to="/">Forgot Password?</Link>}
              <small className="error form-error" role="alert">{error}</small>
              <small className="success-message" />
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</button>
            </form>
            <p className="auth-switch">{role === 'customer' || role === 'provider' ? <>Don’t have an account? <Link to={`/signup?role=${role}`}>Sign Up</Link></> : employee ? 'Employee accounts are created by ServeEase administration.' : 'Super user access is restricted. No self-sign up is allowed.'}</p>
            </>}
          </div>
          <AuthFooterLinks />
        </div>
        <AuthPromo />
      </div>
    </section>
  )
}
