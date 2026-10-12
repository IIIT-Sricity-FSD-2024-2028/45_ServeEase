import { Link } from 'react-router-dom'
import { ErrorState } from '../../../components/common/FeedbackStates'
import { useAuth } from '../../../context/useAuth'
import './customerProfile.css'

function ProfileField({ label, value }) {
  return <div className="customer-profile-field">
    <dt>{label}</dt>
    <dd>{value || 'Not provided'}</dd>
  </div>
}

export default function CustomerProfilePage() {
  const { currentUser, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <section className="customer-profile-page" aria-labelledby="customer-profile-title">
      <p className="customer-profile-eyebrow">Account</p>
      <h1 id="customer-profile-title">My Profile</h1>
      <ErrorState message="Please sign in to view your profile." />
    </section>
  }

  return <section className="customer-profile-page" aria-labelledby="customer-profile-title">
    <div className="customer-profile-heading">
      <div>
        <p className="customer-profile-eyebrow">Account</p>
        <h1 id="customer-profile-title">My Profile</h1>
        <p>View the customer information available in your current sign-in session.</p>
      </div>
      <Link className="customer-profile-bookings-link" to="/customer/bookings">My Bookings</Link>
    </div>

    <div className="customer-profile-card">
      <h2>Profile information</h2>
      <dl className="customer-profile-fields">
        <ProfileField label="Full name" value={currentUser?.fullName || currentUser?.name} />
        <ProfileField label="Email address" value={currentUser?.email} />
        <ProfileField label="Phone number" value={currentUser?.phone} />
      </dl>
      <p className="customer-profile-note" role="note">
        Profile editing is unavailable here because changes cannot currently be saved to a customer profile on the server.
      </p>
    </div>
  </section>
}
