import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { ProviderAvailabilityPanel } from './ProviderAvailabilityPanel'
import './providerAvailability.css'

export function ProviderAvailabilityPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.userId || currentUser?.providerCatalogId
  if (!isAuthenticated || role !== 'provider') return <section className="provider-availability-page"><div className="provider-availability-feedback">Please sign in with a provider account to manage availability.</div></section>
  if (!providerId) return <section className="provider-availability-page"><div className="provider-availability-feedback provider-availability-feedback--error">Your provider profile could not be identified.</div></section>
  return <section className="provider-availability-page"><div className="provider-availability-breadcrumb"><Link to="/provider/dashboard">Provider Dashboard</Link><span aria-hidden="true">›</span><strong>Availability</strong></div><div className="provider-availability-title-row"><div><h1>Availability Management</h1><p>Set the recurring weekly slots when customers can request your services.</p></div><Link className="provider-availability-secondary-link" to="/provider/services">Manage Services</Link></div><ProviderAvailabilityPanel providerId={providerId} /></section>
}
