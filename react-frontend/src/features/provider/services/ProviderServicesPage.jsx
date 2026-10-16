import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ServiceCard } from './ServiceCard'
import { useAuth } from '../../../context/useAuth'
import { catalogApi } from '../../../services/api'
import { ProviderAvailabilityPanel } from '../availability/ProviderAvailabilityPanel'
import '../providerPortal.css'

const emptyService = { name: '', description: '', price: '' }

// A service is saved against the provider's own category and city, which is what puts it in the right
// customer discovery page. Both come from the signed-in account, never from free text.
function serviceFormData(service, { category, cityId, cityName }) {
  return {
    name: service.name.trim(),
    category,
    description: service.description.trim(),
    price: Number(service.price),
    // The provider's recorded city is the service location; the form does not ask for one.
    location: cityName || '',
    ...(Number(cityId) > 0 ? { cityId: Number(cityId) } : {}),
    ...(cityName ? { cityName } : {}),
  }
}

export function ProviderServicesPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.userId || currentUser?.providerCatalogId
  const category = currentUser?.serviceType || currentUser?.category || currentUser?.serviceCategory
  const cityName = currentUser?.cityName || currentUser?.location || ''
  const serviceContext = { category, cityId: currentUser?.cityId, cityName }
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(providerId))
  const [error, setError] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [form, setForm] = useState(emptyService)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const showLoading = Boolean(providerId) && role === 'provider' && isLoading

  useEffect(() => {
    if (!providerId || role !== 'provider') {
      return undefined
    }

    let active = true
    const loadServices = async () => {
      setIsLoading(true)
      setError('')
      try {
        const result = await catalogApi.getProviderServices(providerId)
        if (active) setServices(Array.isArray(result) ? result : [])
      } catch (requestError) {
        if (active) setError(requestError.message || 'Unable to load your services.')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadServices()

    return () => { active = false }
  }, [providerId, role])

  const closeModal = () => {
    setEditingService(null)
    setForm(emptyService)
    setError('')
  }

  const openAdd = () => {
    setError('')
    setForm(emptyService)
    setEditingService({ isNew: true })
  }

  const openEdit = (service) => {
    setError('')
    setForm({ name: service.name || '', description: service.description || '', price: String(service.price ?? '') })
    setEditingService(service)
  }

  const saveService = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.description.trim() || Number(form.price) <= 0) {
      setError('Enter a name, a description, and a price greater than zero.')
      return
    }
    setIsSaving(true)
    setError('')
    const payload = serviceFormData(form, serviceContext)
    try {
      if (editingService.isNew) {
        const created = await catalogApi.createProviderService(providerId, payload)
        setServices((current) => [created, ...current])
      } else {
        const updated = await catalogApi.updateProviderService(providerId, editingService.id, payload)
        setServices((current) => current.map((service) => service.id === updated.id ? updated : service))
      }
      closeModal()
    } catch (requestError) {
      setError(requestError.message || 'Unable to save this service.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleService = async (service) => {
    const isActive = String(service.status || '').toLowerCase() === 'active' || service.isActive === true
    const patch = { status: isActive ? 'Inactive' : 'Active', isActive: !isActive }
    setUpdatingId(service.id)
    setError('')
    try {
      const updated = await catalogApi.updateProviderService(providerId, service.id, patch)
      setServices((current) => current.map((item) => item.id === updated.id ? updated : item))
    } catch (requestError) {
      setError(requestError.message || 'Unable to update the service status.')
    } finally {
      setUpdatingId(null)
    }
  }

  if (!isAuthenticated || role !== 'provider') {
    return <section className="provider-portal"><div className="panel-card ops-state">Please sign in with a provider account to manage services.</div></section>
  }

  if (!providerId) {
    return <section className="provider-portal"><div className="panel-card ops-state ops-state--error">Your provider profile could not be identified.</div></section>
  }

  if (!category) {
    return <section className="provider-portal"><div className="panel-card ops-state ops-state--error">Your account has no service category recorded, so services cannot be published to customers. Contact ServeEase Support.</div></section>
  }

  return (
    <section className="provider-portal">
      <div className="breadcrumb-row"><Link to="/provider/dashboard">Provider Dashboard</Link> &nbsp;›&nbsp; <strong>Manage Services &amp; Availability</strong></div>
      <section className="page-title-block provider-page-title"><h1>Manage Services</h1><p>Manage your service listings, activation status, and availability slots.</p></section>
      {error && !editingService && <div className="panel-card ops-state ops-state--error" role="alert">{error}</div>}
      <section className="provider-services-layout">
        <div className="panel-card">
          <div className="panel-head"><h2>Your Services</h2><button className="btn btn-primary" onClick={openAdd} type="button">+ Add New Service</button></div>
          <div className="provider-service-grid" id="providerServiceGrid">
            {showLoading && <div className="superuser-empty-state">Loading your services…</div>}
            {!showLoading && services.length === 0 && !error && <div className="superuser-empty-state">You have not added any services yet.</div>}
            {!showLoading && services.map((service) => <ServiceCard key={service.id} isUpdating={updatingId === service.id} onEdit={openEdit} onToggle={toggleService} service={service} />)}
          </div>
        </div>
        <div className="panel-card"><div className="panel-head"><h2>Availability Management</h2></div><div id="providerAvailabilityPanel"><ProviderAvailabilityPanel embedded providerId={providerId} /></div></div>
      </section>
      {editingService && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) closeModal() }}>
        <div aria-labelledby="providerServiceModalTitle" aria-modal="true" className="modal-card provider-modal-card" role="dialog">
          <div className="modal-head"><h2 id="providerServiceModalTitle">{editingService.isNew ? 'Add New Service' : 'Edit Service'}</h2><button aria-label="Close" className="close-modal-btn" disabled={isSaving} onClick={closeModal} type="button">×</button></div>
          <form className="provider-modal-form" onSubmit={saveService}>
            <label htmlFor="providerServiceName">Service Name</label>
            <input id="providerServiceName" maxLength="120" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Enter service name" required value={form.name} />
            <label htmlFor="providerServiceDescription">Service Description</label>
            <textarea id="providerServiceDescription" maxLength="1000" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Enter service description" required value={form.description} />
            <label htmlFor="providerServicePrice">Price (₹)</label>
            <input id="providerServicePrice" min="1" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} placeholder="799" required type="number" value={form.price} />
            {cityName && <p className="provider-modal-note">Offered in {cityName}, the city recorded on your provider account.</p>}
            <small className="error" id="providerServiceError" role="alert">{error}</small>
            <div className="provider-modal-actions"><button className="btn btn-primary" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : 'Save Changes'}</button><button className="secondary-btn" disabled={isSaving} onClick={closeModal} type="button">Cancel</button></div>
          </form>
        </div>
      </div>}
    </section>
  )
}
