import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import './customerProfile.css'

function displayValue(value) {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Not provided'
  }

  return String(value)
}

export default function CustomerProfilePage() {
  const { currentUser, isAuthenticated } = useAuth()
  const initialPhone = displayValue(currentUser?.phone).replace('Not provided', '')
  const [isEditingPhone, setIsEditingPhone] = useState(false)
  const [draftPhone, setDraftPhone] = useState(initialPhone)
  const [profilePhone, setProfilePhone] = useState(initialPhone)
  const [phoneMessage, setPhoneMessage] = useState('')

  const fullName = displayValue(currentUser?.fullName || currentUser?.name)
  const email = displayValue(currentUser?.email)
  const phone = displayValue(profilePhone || currentUser?.phone || '')
  const accountStatus = displayValue(currentUser?.accountStatus || currentUser?.status || 'Active')

  const handlePhoneSave = () => {
    const nextPhone = draftPhone.trim()

    if (!/^[6-9]\d{9}$/.test(nextPhone)) {
      setPhoneMessage('Enter a valid 10-digit phone number.')
      return
    }

    const storedSession = JSON.parse(sessionStorage.getItem('serveEaseSession') || '{}')
    if (storedSession) {
      sessionStorage.setItem('serveEaseSession', JSON.stringify({ ...storedSession, phone: nextPhone }))
    }

    setProfilePhone(nextPhone)
    setDraftPhone(nextPhone)
    setIsEditingPhone(false)
    setPhoneMessage('')
  }

  if (!isAuthenticated) {
    return <section className="customer-profile-page" aria-labelledby="customer-profile-title">
      <div className="customer-profile-container">
        <div className="customer-profile-breadcrumb">
          <Link to="/">Home</Link>
          <span>›</span>
          <strong>My Profile</strong>
        </div>
        <h1 id="customer-profile-title">My Profile</h1>
        <ErrorState message="Please sign in to view your profile." />
      </div>
    </section>
  }

  return <section className="customer-profile-page" aria-labelledby="customer-profile-title">
    <div className="customer-profile-container">
      <div className="customer-profile-breadcrumb">
        <Link to="/">Home</Link>
        <span>›</span>
        <Link to="/customer/dashboard">Customer Dashboard</Link>
        <span>›</span>
        <strong>My Profile</strong>
      </div>

      <div className="customer-profile-header">
        <div className="customer-profile-title-wrap">
          <h1 id="customer-profile-title">My Profile</h1>
          <p>View your personal information and account details.</p>
        </div>
        <Link className="customer-profile-bookings-link" to="/customer/bookings">My Bookings</Link>
      </div>

      <div className="customer-profile-main">
        <section className="customer-profile-card">
          <h2 className="panel-title">Profile Information</h2>

          <div className="customer-profile-info-grid">
            <div className="customer-profile-info-box">
              <strong>Full Name</strong>
              <span>{fullName}</span>
            </div>

            <div className="customer-profile-info-box">
              <strong>Email</strong>
              <span>{email}</span>
            </div>

            <div className="customer-profile-info-box">
              <strong>Phone Number</strong>

              {!isEditingPhone ? (
                <div className="customer-profile-phone-row">
                  <span>{phone}</span>
                  <button type="button" className="customer-profile-edit-btn" onClick={() => { setDraftPhone(phone === 'Not provided' ? '' : phone); setPhoneMessage(''); setIsEditingPhone(true) }}>
                    Edit
                  </button>
                </div>
              ) : (
                <div className="customer-profile-edit-wrap">
                  <input
                    className="customer-profile-inline-input"
                    maxLength={10}
                    onChange={(event) => setDraftPhone(event.target.value.replace(/\D/g, ''))}
                    value={draftPhone}
                  />

                  <div className="customer-profile-edit-actions">
                    <button type="button" className="customer-profile-save-btn" onClick={handlePhoneSave}>Save</button>
                    <button type="button" className="customer-profile-cancel-btn" onClick={() => { setDraftPhone(phone === 'Not provided' ? '' : phone); setPhoneMessage(''); setIsEditingPhone(false) }}>
                      Cancel
                    </button>
                  </div>

                  {phoneMessage && <small className="customer-profile-inline-message">{phoneMessage}</small>}
                </div>
              )}
            </div>

            <div className="customer-profile-info-box">
              <strong>Account Status</strong>
              <span>{accountStatus}</span>
            </div>
          </div>
        </section>

        <aside className="customer-profile-status-card">
          <div>
            <h2>Account Status</h2>
            <p>Your customer account is active and ready to use.</p>
            <p>Use your dashboard to manage bookings, payments, and support.</p>
          </div>

          <Link className="customer-profile-status-button" to="/customer/dashboard">Go to Dashboard</Link>
        </aside>
      </div>
    </div>
  </section>
}
