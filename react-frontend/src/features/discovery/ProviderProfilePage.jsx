import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { availabilityApi, catalogApi } from '../../services/api'
import { availabilityProviderId, bookableServices, dateParts, formatCurrency, formatSlot, imageFallback, listingRow, providerDisplayImage, providerIsDiscoverable, ratingSummary } from './catalogModel'
import { saveJourney } from './journeyState'
import { PublicJourneyShell } from './PublicJourneyShell'

function BookingCard({ provider, services, cityParam }) {
  const { isAuthenticated, currentUser } = useAuth()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [attempt, setAttempt] = useState(0)
  const [availability, setAvailability] = useState({ loading: true, dates: [], error: '' })
  const [notice, setNotice] = useState('')
  const ownerId = availabilityProviderId(provider)

  useEffect(() => {
    let live = true
    availabilityApi.get(ownerId)
      .then((response) => live && setAvailability({ loading: false, dates: Array.isArray(response?.dates) ? response.dates : [], error: '' }))
      .catch((error) => live && setAvailability({ loading: false, dates: [], error: error.message }))
    return () => { live = false }
  }, [ownerId, attempt])
  const retry = () => { setAvailability({ loading: true, dates: [], error: '' }); setAttempt((value) => value + 1) }

  const datesWithSlots = availability.dates.filter((item) => Array.isArray(item.slots) && item.slots.length)
  const requestedService = params.get('service')
  const selectedService = services.find((service) => service.name === requestedService) || services[0]
  const selectedDate = datesWithSlots.some((item) => item.date === params.get('date')) ? params.get('date') : ''
  const slots = datesWithSlots.find((item) => item.date === selectedDate)?.slots || []
  const selectedSlot = slots.includes(params.get('time')) ? params.get('time') : ''

  const select = (changes) => setParams((previous) => {
    const next = new URLSearchParams(previous)
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)))
    return next
  }, { replace: true })

  function proceed() {
    setNotice('')
    if (!selectedService || !selectedDate || !selectedSlot) return
    const query = new URLSearchParams({ provider: provider.id, service: selectedService.name, date: selectedDate, time: selectedSlot })
    if (cityParam) query.set('city', cityParam)
    const checkoutUrl = `/customer/checkout?${query}`
    saveJourney({ draft: { providerId: provider.id, serviceName: selectedService.name, date: selectedDate, time: selectedSlot, city: cityParam || '' } })
    if (!isAuthenticated) {
      navigate('/login', { state: { from: checkoutUrl } })
      return
    }
    if (currentUser?.role !== 'customer') {
      setNotice('Bookings can be made only from a customer account.')
      return
    }
    navigate(checkoutUrl)
  }

  if (availability.loading) return <aside className="booking-card">
    <h2>Book Appointment</h2>
    <div className="availability-loading" role="status" aria-live="polite"><span>Finding available appointments...</span></div>
    <div className="availability-skeleton-group" aria-hidden="true">
      <span className="availability-skeleton-label"></span>
      <div className="availability-skeleton-row availability-date-skeletons"><span></span><span></span><span></span><span></span></div>
      <span className="availability-skeleton-label"></span>
      <div className="availability-skeleton-row availability-slot-skeletons"><span></span><span></span></div>
    </div>
  </aside>

  if (availability.error) return <aside className="booking-card">
    <h2>Book Appointment</h2>
    <div className="availability-state availability-error" role="alert">
      <span className="availability-state-icon" aria-hidden="true">⚠</span>
      <h3>We couldn't load availability</h3>
      <p>Unable to load provider availability. Please try again.</p>
      <button className="secondary-btn" type="button" onClick={retry}>Retry</button>
    </div>
  </aside>

  if (!datesWithSlots.length || !services.length) return <aside className="booking-card">
    <h2>Book Appointment</h2>
    <div className="availability-state availability-empty-state">
      <span className="availability-state-icon" aria-hidden="true">🗓</span>
      <h3>{services.length ? 'No appointments available for the next 7 days.' : 'This provider has no bookable services right now.'}</h3>
      <p>Please check back soon or choose another provider.</p>
    </div>
    <button className="btn btn-primary" type="button" disabled>Proceed to Booking</button>
  </aside>

  return <aside className="booking-card">
    <h2>Book Appointment</h2>
    <label htmlFor="bookingService">Select Service</label>
    <select id="bookingService" value={selectedService.name} onChange={(event) => select({ service: event.target.value })}>
      {services.map((service) => <option key={service.name} value={service.name}>{service.name} - {formatCurrency(service.price)}</option>)}
    </select>
    <section className="availability-section" aria-labelledby="availableDatesHeading">
      <h3 id="availableDatesHeading">Available Dates</h3>
      <div className="availability-date-list" role="listbox" aria-label="Available booking dates">
        {datesWithSlots.map((item) => {
          const parts = dateParts(item)
          const isSelected = item.date === selectedDate
          return <button className={`availability-date-card${isSelected ? ' is-selected' : ''}`} key={item.date} type="button" role="option" aria-selected={isSelected} aria-label={`Select ${parts.weekday}, ${parts.date}`} onClick={() => select({ date: item.date, time: '' })}><span>{parts.weekday.slice(0, 3)}</span><strong>{parts.date}</strong></button>
        })}
      </div>
    </section>
    <section className="availability-section" aria-labelledby="availableSlotsHeading">
      <h3 id="availableSlotsHeading">Available Time Slots</h3>
      <div className="availability-time-list">
        {selectedDate && slots.length
          ? slots.map((slot) => <button className={`time-slot-card${slot === selectedSlot ? ' is-selected' : ''}`} key={slot} type="button" aria-pressed={slot === selectedSlot} aria-label={`Select time slot ${formatSlot(slot)}`} onClick={() => select({ time: slot })}>{formatSlot(slot)}</button>)
          : <p className="availability-empty-slots">Select a date to view available time slots.</p>}
      </div>
    </section>
    {notice && <p className="error" role="alert">{notice}</p>}
    <button className="btn btn-primary" type="button" disabled={!selectedDate || !selectedSlot} onClick={proceed}>Proceed to Booking</button>
  </aside>
}

export function ProviderProfilePage() {
  const { providerId } = useParams()
  const [params] = useSearchParams()
  const cityParam = params.get('city') || ''
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ loading: true, provider: null, catalog: null, error: '' })

  useEffect(() => {
    let live = true
    Promise.all([catalogApi.getProvider(providerId), catalogApi.getCatalog().catch(() => null)])
      .then(([provider, catalog]) => live && setState({ loading: false, provider, catalog, error: '' }))
      .catch((error) => live && setState({ loading: false, provider: null, catalog: null, error: error.message }))
    return () => { live = false }
  }, [providerId, attempt])
  const retry = useCallback(() => { setState({ loading: true, provider: null, catalog: null, error: '' }); setAttempt((value) => value + 1) }, [])

  const provider = state.provider
  const services = useMemo(() => bookableServices(provider), [provider])
  const category = state.catalog?.categories?.find((item) => item.id === provider?.category)
  const similar = useMemo(() => (state.catalog?.providers || [])
    .filter((item) => provider && item.category === provider.category && item.id !== provider.id && providerIsDiscoverable(item))
    .map(listingRow)
    .filter((item) => item.serviceNames.length)
    .slice(0, 3), [state.catalog, provider])
  const backTo = `/services?${new URLSearchParams({ ...(provider?.category ? { category: provider.category } : {}), ...(cityParam ? { city: cityParam } : {}) })}`

  let body
  if (state.loading) body = <div className="empty-state-card" role="status">Loading provider…</div>
  else if (state.error) body = <div className="empty-state-card" role="alert">
    <p>{/not found/i.test(state.error) ? 'Provider not found.' : `We couldn't load this provider. ${state.error}`}</p>
    {!/not found/i.test(state.error) && <button className="secondary-btn journey-retry-btn" type="button" onClick={retry}>Retry</button>}
  </div>
  else {
    const rating = ratingSummary(provider)
    body = <section className="profile-layout">
      <div className="profile-main">
        <div className="provider-summary-card">
          <div className="summary-top">
            <img src={providerDisplayImage(provider)} alt={provider.name} onError={imageFallback} />
            <div>
              <h1>{provider.name} {provider.verified && <span className="verified-badge">Verified Professional</span>}</h1>
              <div className="summary-services">
                <strong>Services Offered:</strong>
                <div className="subservice-list">{services.map((service) => <span className="tag-pill" key={service.name}>{service.name}</span>)}</div>
              </div>
              <div className="metrics-row">
                <div className="metric-item"><strong>{rating ? `⭐ ${rating.rating}` : 'New'}</strong><span>{rating ? `${rating.reviews} Reviews` : 'No reviews yet'}</span></div>
                {Number.isFinite(Number(provider.years)) && <div className="metric-item"><strong>👜 {provider.years}+ Years</strong><span>Experience</span></div>}
                {provider.distance && <div className="metric-item"><strong>📍 {provider.distance}</strong><span>Away</span></div>}
                {Number.isFinite(Number(provider.jobsDone)) && <div className="metric-item"><strong>✅ {provider.jobsDone}+</strong><span>Jobs Done</span></div>}
              </div>
              {provider.location && <p className="location-line">📍 {provider.location}</p>}
            </div>
          </div>
        </div>

        <div className="pricing-card">
          <h2>Service Pricing</h2>
          {services.map((service) => <div className="price-table-row" key={service.name}>
            <span>{service.name}{service.duration ? ` · ${service.duration}` : ''}</span>
            <strong>{formatCurrency(service.price)}</strong>
          </div>)}
          <div className="info-note">Final price may vary depending on service requirements and specific needs.</div>
        </div>

        <div className="reviews-card">
          <h2>Customer Reviews</h2>
          {rating
            ? <div className="review-card">
              <div className="review-stars" aria-label={`${rating.rating} out of 5 stars`}>{'★'.repeat(Math.round(rating.rating))}{'☆'.repeat(5 - Math.round(rating.rating))}</div>
              <p className="review-feedback">Rated {rating.rating} out of 5 from {rating.reviews} customer reviews.</p>
            </div>
            : <div className="empty-state-card">No customer reviews yet. This provider is newly verified.</div>}
        </div>

        <section className="benefits-section">
          <h2>Why Choose ServeEase?</h2>
          <div className="benefits-grid">
            <div className="benefit-card"><div className="benefit-icon">✅</div><h3>Verified Professionals</h3><p>All service providers are background verified</p></div>
            <div className="benefit-card"><div className="benefit-icon">✅</div><h3>Secure Payments</h3><p>100% safe and secure payment gateway</p></div>
            <div className="benefit-card"><div className="benefit-icon">✅</div><h3>Customer Support</h3><p>24/7 customer support available</p></div>
          </div>
        </section>

        {similar.length > 0 && <section className="similar-section">
          <h2>Similar Service Providers</h2>
          <div className="similar-grid">
            {similar.map((item) => {
              const itemRating = ratingSummary(item)
              return <div className="similar-card" key={item.id}>
                <img src={providerDisplayImage(item)} alt={item.name} onError={imageFallback} />
                <div className="similar-card-body">
                  <h3>{item.name}</h3>
                  <div className="rating-row">{itemRating ? `⭐ ${itemRating.rating} (${itemRating.reviews} reviews)` : <span className="new-provider-label">New Provider</span>}</div>
                  <div className="provider-price"><span>Starting at</span><strong>{formatCurrency(item.startingPrice)}</strong></div>
                  <Link className="secondary-btn" to={`/providers/${encodeURIComponent(item.id)}${cityParam ? `?city=${cityParam}` : ''}`}>View Profile</Link>
                </div>
              </div>
            })}
          </div>
        </section>}
      </div>

      <BookingCard cityParam={cityParam} key={provider.id} provider={provider} services={services} />
    </section>
  }

  return <PublicJourneyShell className="profile-page">
    <div className="container">
      <Link className="back-inline" to={backTo}>Back to Services</Link>
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <Link to="/">Home</Link> &nbsp; › &nbsp; <Link to={backTo}>Services</Link>{category && <> &nbsp; › &nbsp; {category.name}</>}{provider && <> &nbsp; › &nbsp; {provider.name}</>}
      </nav>
      {body}
    </div>
  </PublicJourneyShell>
}
