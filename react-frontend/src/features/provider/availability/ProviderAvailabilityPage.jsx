import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { ProviderAvailabilityPanel } from './ProviderAvailabilityPanel'
import '../providerPortal.css'

export function ProviderAvailabilityPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.userId || currentUser?.providerCatalogId
  if (!isAuthenticated || role !== 'provider') return <section className="provider-portal"><div className="panel-card ops-state">Please sign in with a provider account to manage availability.</div></section>
  if (!providerId) return <section className="provider-portal"><div className="panel-card ops-state ops-state--error">Your provider profile could not be identified.</div></section>
  return <section className="provider-portal">
    <div className="breadcrumb-row"><Link to="/provider/dashboard">Provider Dashboard</Link> &nbsp;›&nbsp; <strong>Availability</strong></div>
    <section className="page-title-block provider-page-title"><h1>Availability Management</h1><p>Set the recurring weekly slots when customers can request your services.</p></section>
    <section className="provider-services-layout"><div className="panel-card"><div className="panel-head"><h2>Availability Management</h2><Link className="btn btn-outline" to="/provider/services">Manage Services</Link></div><ProviderAvailabilityPanel providerId={providerId} /></div></section>
  </section>
}
