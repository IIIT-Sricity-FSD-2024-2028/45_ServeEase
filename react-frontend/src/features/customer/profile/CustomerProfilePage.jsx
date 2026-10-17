import { useCallback, useEffect, useState } from 'react'
import { authApi } from '../../../services/api'
import { useAuth } from '../../../context/useAuth'
import { CustomerPageHeader, LoadState } from '../CustomerOpsParts'
import { hasValue } from '../customerOperations'
import '../customerOperations.css'

const display = (value) => (hasValue(value) ? String(value) : 'Not provided')

// customer-profile.html + initCustomerProfilePage(); the account is read from GET /auth/session, which
// returns the signed-in user's own record without credentials.
export default function CustomerProfilePage() {
  const [load, setLoad] = useState({ state: 'loading', user: null, error: '' })
  const [editingPhone, setEditingPhone] = useState(false)
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const { refreshSession } = useAuth()

  const reload = useCallback(() => {
    setLoad((current) => ({ ...current, state: 'loading', error: '' }))
    authApi.session()
      .then((user) => { setPhone(user?.phone || ''); setLoad({ state: 'ready', user, error: '' }) })
      .catch((error) => setLoad({ state: 'error', user: null, error: error.message || 'Your profile could not be loaded.' }))
  }, [])

  useEffect(() => {
    let active = true
    authApi.session()
      .then((user) => { if (active) { setPhone(user?.phone || ''); setLoad({ state: 'ready', user, error: '' }) } })
      .catch((error) => { if (active) setLoad({ state: 'error', user: null, error: error.message || 'Your profile could not be loaded.' }) })
    return () => { active = false }
  }, [])

  const user = load.user
  async function savePhone() {
    const value = phone.trim()
    if (!/^\d{10}$/.test(value)) { setPhoneError('Enter a valid 10-digit phone number.'); return }
    setSavingPhone(true)
    setPhoneError('')
    try {
      const updated = await authApi.updateProfile({ phone: value })
      setLoad((current) => ({ ...current, user: { ...current.user, ...updated } }))
      await refreshSession()
      setEditingPhone(false)
    } catch (error) {
      setPhoneError(error.message || 'Your phone number could not be updated.')
    } finally {
      setSavingPhone(false)
    }
  }

  return <div className="customer-ops">
    <CustomerPageHeader crumbs={[['Home', '/'], ['Customer Dashboard', '/customer/dashboard'], ['My Profile']]} description="View your personal information and account details." title="My Profile" />
    <LoadState error={load.error} loadingText="Loading your profile…" onRetry={reload} state={load.state} />
    {load.state === 'ready' && <section className="customer-profile-layout">
      <div className="panel-card">
        <h2 className="panel-title">Profile Information</h2>
        <div className="info-grid profile-info-grid">
          <div className="info-box"><strong>Full Name</strong><div>{display(user?.fullName)}</div></div>
          <div className="info-box"><strong>Email</strong><div>{display(user?.email)}</div></div>
          <div className="info-box"><strong>Phone Number</strong>
            <div className="profile-edit-row">
              {editingPhone ? <input aria-label="Phone number" autoComplete="tel" inputMode="numeric" maxLength={10} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '')); setPhoneError('') }} type="tel" value={phone} /> : <span>{hasValue(user?.phone) ? user.phone : 'Not added'}</span>}
              {editingPhone ? <div className="profile-edit-actions"><button className="btn btn-outline profile-inline-btn" disabled={savingPhone} onClick={savePhone} type="button">{savingPhone ? 'Saving…' : 'Save'}</button><button className="btn btn-outline profile-inline-btn" disabled={savingPhone} onClick={() => { setPhone(user?.phone || ''); setPhoneError(''); setEditingPhone(false) }} type="button">Cancel</button></div> : <button className="btn btn-outline profile-inline-btn" onClick={() => setEditingPhone(true)} type="button">Edit</button>}
            </div>
            {phoneError && <small className="info-note" role="alert">{phoneError}</small>}
          </div>
          <div className="info-box"><strong>Account Status</strong><div>{display(user?.accountStatus || user?.status || 'Active')}</div></div>
        </div>
      </div>
    </section>}
  </div>
}
