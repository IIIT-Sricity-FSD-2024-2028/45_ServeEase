import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../../services/api'
import { CustomerPageHeader, LoadState } from '../CustomerOpsParts'
import { hasValue } from '../customerOperations'
import '../customerOperations.css'

// The original edits the phone number in localStorage. The backend has no customer profile update
// endpoint, so the control stays visible but disabled instead of pretending to save.
const phoneEditUnavailable = 'Phone number changes are not supported by the ServeEase backend yet.'

const display = (value) => (hasValue(value) ? String(value) : 'Not provided')

// customer-profile.html + initCustomerProfilePage(); the account is read from GET /auth/session, which
// returns the signed-in user's own record without credentials.
export default function CustomerProfilePage() {
  const [load, setLoad] = useState({ state: 'loading', user: null, error: '' })

  const reload = useCallback(() => {
    setLoad((current) => ({ ...current, state: 'loading', error: '' }))
    authApi.session()
      .then((user) => setLoad({ state: 'ready', user, error: '' }))
      .catch((error) => setLoad({ state: 'error', user: null, error: error.message || 'Your profile could not be loaded.' }))
  }, [])

  useEffect(() => {
    let active = true
    authApi.session()
      .then((user) => { if (active) setLoad({ state: 'ready', user, error: '' }) })
      .catch((error) => { if (active) setLoad({ state: 'error', user: null, error: error.message || 'Your profile could not be loaded.' }) })
    return () => { active = false }
  }, [])

  const user = load.user
  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['My Profile']]} description="View your personal information and account details." title="My Profile" />
    <LoadState error={load.error} loadingText="Loading your profile…" onRetry={reload} state={load.state} />
    {load.state === 'ready' && <section className="dashboard-two-column">
      <div className="panel-card">
        <h2 className="panel-title">Profile Information</h2>
        <div className="info-grid profile-info-grid">
          <div className="info-box"><strong>Full Name</strong><div>{display(user?.fullName)}</div></div>
          <div className="info-box"><strong>Email</strong><div>{display(user?.email)}</div></div>
          <div className="info-box"><strong>Phone Number</strong>
            <div className="profile-edit-row">
              <span>{hasValue(user?.phone) ? user.phone : 'Not added'}</span>
              <button aria-describedby="profile-phone-note" className="btn btn-outline profile-inline-btn" disabled title={phoneEditUnavailable} type="button">Edit</button>
            </div>
            <small className="info-note" id="profile-phone-note">{phoneEditUnavailable}</small>
          </div>
          <div className="info-box"><strong>Account Status</strong><div>{display(user?.accountStatus || user?.status || 'Active')}</div></div>
        </div>
      </div>
      <div className="panel-card gradient-panel">
        <h2>Account Status</h2>
        <p>Your customer account is active and ready to use.</p>
        <p>Use your dashboard to manage bookings, payments, and support.</p>
        <Link className="btn btn-light" to="/customer/dashboard">Go to Dashboard</Link>
      </div>
    </section>}
  </div>
}
