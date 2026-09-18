import { useEffect, useMemo, useState } from 'react'
import { ServiceCard } from '../../components/provider/ServiceCard'
import { useAuth } from '../../context/useAuth'
import { catalogApi } from '../../services/api'
import '../../styles/provider-services.css'

const emptyService = { name: '', description: '', price: '', location: '' }

function serviceFormData(service, category) {
  return {
    name: service.name.trim(),
    category: category || 'General',
    description: service.description.trim(),
    price: Number(service.price),
    location: service.location.trim(),
  }
}

export function ProviderServicesPage() {
  const { currentUser, isAuthenticated, role } = useAuth()
  const providerId = currentUser?.providerId || currentUser?.providerCatalogId || currentUser?.userId
  const category = currentUser?.category || currentUser?.serviceCategory
  const [services, setServices] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(providerId))
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [editingService, setEditingService] = useState(null)
  const [form, setForm] = useState(emptyService)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)

  useEffect(() => {
    if (!providerId || role !== 'provider') {
      setIsLoading(false)
      return undefined
    }

    let active = true
    setIsLoading(true)
    setError('')
    catalogApi.getProviderServices(providerId)
      .then((result) => {
        if (active) setServices(Array.isArray(result) ? result : [])
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Unable to load your services.')
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => { active = false }
  }, [providerId, role])

  const visibleServices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return services
    return services.filter((service) => [service.name, service.category, service.description, service.location, service.status]
      .some((value) => String(value || '').toLowerCase().includes(normalizedQuery)))
  }, [query, services])

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
    setForm({ name: service.name || '', description: service.description || '', price: String(service.price ?? ''), location: service.location || '' })
    setEditingService(service)
  }

  const saveService = async (event) => {
    event.preventDefault()
    if (!form.name.trim() || !form.description.trim() || !form.location.trim() || Number(form.price) <= 0) {
      setError('Enter a name, description, location, and a price greater than zero.')
      return
    }
    setIsSaving(true)
    setError('')
    const payload = serviceFormData(form, category)
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
    return <section className="provider-services-page"><div className="provider-feedback">Please sign in with a provider account to manage services.</div></section>
  }

  if (!providerId) {
    return <section className="provider-services-page"><div className="provider-feedback provider-feedback--error">Your provider profile could not be identified.</div></section>
  }

  return (
    <section className="provider-services-page">
      <div className="provider-breadcrumb">Provider Dashboard <span aria-hidden="true">›</span> <strong>Manage Services</strong></div>
      <div className="provider-page-title">
        <div><h1>Manage Services</h1><p>Manage your service listings, activation status, and availability slots.</p></div>
        <button className="provider-primary-button" onClick={openAdd} type="button">+ Add New Service</button>
      </div>
      {error && <div className="provider-feedback provider-feedback--error" role="alert">{error}</div>}
      <div className="provider-services-panel">
        <div className="provider-panel-head"><h2>Your Services</h2><label className="provider-search">Search services<input onChange={(event) => setQuery(event.target.value)} placeholder="Search services..." value={query} /></label></div>
        {isLoading && <div className="provider-feedback">Loading your services…</div>}
        {!isLoading && !error && visibleServices.length === 0 && <div className="provider-feedback">{services.length ? 'No services found for the current search.' : 'You have not added any services yet.'}</div>}
        {!isLoading && visibleServices.length > 0 && <div className="provider-service-grid">
          {visibleServices.map((service) => <ServiceCard key={service.id} isUpdating={updatingId === service.id} onEdit={openEdit} onToggle={toggleService} service={service} />)}
        </div>}
      </div>
      {editingService && <div className="provider-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSaving) closeModal() }}>
        <div aria-modal="true" className="provider-modal-card" role="dialog">
          <div className="provider-modal-head"><h2>{editingService.isNew ? 'Add New Service' : 'Edit Service'}</h2><button aria-label="Close" disabled={isSaving} onClick={closeModal} type="button">×</button></div>
          <form className="provider-service-form" onSubmit={saveService}>
            <label>Service Name<input maxLength="120" onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required value={form.name} /></label>
            <label>Service Description<textarea maxLength="1000" onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} required value={form.description} /></label>
            <label>Price (₹)<input min="1" onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} required type="number" value={form.price} /></label>
            <label>Service Location<input maxLength="120" onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} required value={form.location} /></label>
            <div className="provider-modal-actions"><button className="provider-primary-button" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : 'Save Changes'}</button><button className="provider-secondary-button" disabled={isSaving} onClick={closeModal} type="button">Cancel</button></div>
          </form>
        </div>
      </div>}
    </section>
  )
}
