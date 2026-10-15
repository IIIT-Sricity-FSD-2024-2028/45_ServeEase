import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { catalogApi } from '../../services/api'
import { getCities, getInitialCity, locationStorageKey } from './cityState'
import { homeFallbackCatalog } from './homeFallbackCatalog'
import { PublicFooter, PublicHeader } from './PublicChrome'
import './homePage.css'

function readLocalCatalog() {
  try {
    const value = JSON.parse(localStorage.getItem('serveEaseData') || 'null')
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

function compactCount(value) {
  const count = Math.max(0, Number(value) || 0)
  return count < 10 ? String(count) : `${Math.floor(count / 10) * 10}+`
}

function providerIdentity(provider) {
  return String(provider?.ownerProviderId || provider?.ownerProviderEmail || provider?.id || provider?.name || '').trim().toLowerCase()
}

function getActualCounts(providers) {
  const uniqueProviders = new Map()
  const services = new Set()
  providers.forEach((provider) => {
    const identity = providerIdentity(provider)
    if (!identity) return
    uniqueProviders.set(identity, provider)
    const listed = Array.isArray(provider.services) && provider.services.length
      ? provider.services
      : Array.isArray(provider.subServices) ? provider.subServices : []
    listed.forEach((service) => {
      const name = typeof service === 'string' ? service : service?.name || service?.title
      const status = typeof service === 'object' && service ? String(service.status || 'Active').toLowerCase() : 'active'
      if (name && status !== 'inactive') services.add(`${identity}|${String(name).trim().toLowerCase()}`)
    })
  })
  return { providers: uniqueProviders.size, services: services.size }
}

function imageUrl(value) {
  if (!value) return ''
  if (/^(https?:|data:|\/)/i.test(value)) return value
  return `/${value.replace(/^\.\//, '')}`
}

function HeroSection({ userRole, providerCount, serviceCount }) {
  const callTo = userRole === 'customer'
    ? '/customer/dashboard'
    : userRole === 'provider' ? '/provider/dashboard' : '/signup'
  return <section className="home-hero">
    <div className="home-container home-hero-grid">
      <div className="home-hero-left">
        <p className="home-hero-tag">Your Trusted Home Service Partner</p>
        <h1>Book Trusted Home Services Instantly</h1>
        <p className="home-hero-description">Find trusted professionals for cleaning, salon at home, plumbing, electrician, appliance repair, painting, and carpentry.</p>
        <div className="home-hero-actions"><Link className="home-button home-button-primary" to={callTo}>Get Started</Link></div>
        <div className="home-hero-stats">
          <article className="home-stat-card"><h2>{providerCount}</h2><p>Verified Providers</p></article>
          <article className="home-stat-card"><h2>{serviceCount}</h2><p>Services</p></article>
          <article className="home-stat-card"><h2>24/7</h2><p>Support Access</p></article>
        </div>
      </div>
      <div className="home-hero-right"><div className="home-hero-image-card"><img alt="Home service professional" src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1000&q=80" /></div></div>
    </div>
  </section>
}

function CategorySection({ categories, cityId }) {
  return <section className="home-categories" id="categories">
    <div className="home-container">
      <div className="home-section-head"><h2>Browse by Category</h2><p>Explore the most requested service categories on ServeEase.</p></div>
      {categories.length === 0
        ? <p className="home-empty">No categories available right now.</p>
        : <div className="home-category-grid">{categories.map((category) => <article className="home-category-card" key={category.id} style={{ backgroundImage: `url("${imageUrl(category.bgImage)}")` }}>
          <div className="home-category-overlay"><span className="home-category-icon">{category.icon || '🛎'}</span><h3>{category.name}</h3><Link className="home-button home-button-primary" to={`/services?category=${encodeURIComponent(category.id)}&city=${cityId}`}>Explore Services</Link></div>
        </article>)}</div>}
    </div>
  </section>
}

function PopularServicesSection({ services, cityId }) {
  const popularServices = services.filter((service) => String(service.title || '').toLowerCase() !== 'pest control')
  return <section className="home-services" id="services">
    <div className="home-container">
      <div className="home-section-head"><h2>Popular Services</h2><p>Choose from frequently booked services with trusted professionals.</p></div>
      {popularServices.length === 0
        ? <p className="home-empty">No popular services available right now.</p>
        : <div className="home-service-grid">{popularServices.map((service) => <article className="home-service-card" key={`${service.categoryId}-${service.title}`}>
          <img alt={service.title} src={imageUrl(service.image)} />
          <div className="home-service-body">
            <h3>{service.title}</h3>
            <p>{service.description}</p>
            <div className="home-service-meta"><span>{service.price}</span><span>⭐ {service.rating}</span></div>
            <Link className="home-button home-button-primary home-service-action" to={`/services?category=${encodeURIComponent(service.categoryId)}&city=${cityId}`}>Book Now</Link>
          </div>
        </article>)}</div>}
    </div>
  </section>
}

function InformationSections() {
  return <section className="home-footer-info">
    <div className="home-container home-footer-info-grid">
      <article className="home-info-content-card" id="about-us"><h2>About Us</h2><p>ServeEase helps customers discover verified home service professionals for everyday needs like cleaning, repairs, salon services, painting, and carpentry. We focus on reliable bookings, transparent pricing, and responsive customer support so every service experience feels simple and trustworthy.</p></article>
      <article className="home-info-content-card" id="terms-and-conditions"><h2>Terms &amp; Conditions</h2><p>By using ServeEase, customers agree to provide accurate booking details, follow platform guidelines, and use the service only for lawful household requirements. Pricing, provider availability, and service timelines may vary depending on location, demand, and provider confirmation.</p></article>
      <article className="home-info-content-card" id="privacy-policy"><h2>Privacy Policy</h2><p>We collect only the information needed to manage your account, bookings, payments, and support requests. ServeEase protects customer data and does not share personal details beyond what is necessary to complete services, process payments, and resolve support issues.</p></article>
      <article className="home-info-content-card" id="cancellation-policy"><h2>Cancellation Policy</h2><p>Customers can cancel a booking before the service begins, subject to timing and provider allocation. Refund eligibility depends on the booking stage, payment status, and reason for cancellation. Any approved refund is processed back to the original payment method within the standard settlement period.</p></article>
    </div>
  </section>
}

export default function HomePage() {
  const { currentUser, ready } = useAuth()
  const location = useLocation()
  const [cities] = useState(getCities)
  const initialCityOwnerKey = locationStorageKey(currentUser)
  const [citySelection, setCitySelection] = useState(() => ({
    ownerKey: initialCityOwnerKey,
    city: getInitialCity(currentUser, cities),
  }))
  const [catalog, setCatalog] = useState(() => {
    const local = readLocalCatalog()
    return local?.categories?.length ? local : { ...homeFallbackCatalog, providers: [] }
  })
  const [hasProviderData, setHasProviderData] = useState(() => Array.isArray(readLocalCatalog()?.providers))
  const activeCityStorageKey = locationStorageKey(currentUser)
  const city = ready && citySelection.ownerKey !== activeCityStorageKey
    ? getInitialCity(currentUser, cities)
    : citySelection.city

  useEffect(() => {
    let active = true
    catalogApi.getCatalog().then((response) => {
      if (!active) return
      if (!response || !Array.isArray(response.categories) || !response.categories.length) {
        const local = readLocalCatalog()
        if (local?.categories?.length) {
          setCatalog(local)
          setHasProviderData(Array.isArray(local.providers))
        }
        return
      }
      setCatalog(response)
      setHasProviderData(Array.isArray(response.providers))
    }).catch(() => {
      const local = readLocalCatalog()
      if (!active) return
      if (local?.categories?.length) {
        setCatalog(local)
        setHasProviderData(Array.isArray(local.providers))
      }
    })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (location.hash !== '#categories') return undefined
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('categories')?.scrollIntoView({ block: 'start', behavior: 'auto' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.hash])

  useEffect(() => {
    if (!ready || citySelection.ownerKey !== activeCityStorageKey) return
    try {
      localStorage.setItem(activeCityStorageKey, JSON.stringify(city))
    } catch {
      return undefined
    }
    return undefined
  }, [activeCityStorageKey, city, citySelection.ownerKey, ready])

  const counts = useMemo(() => getActualCounts(Array.isArray(catalog.providers) ? catalog.providers : []), [catalog.providers])
  const providerCount = hasProviderData ? compactCount(counts.providers) : compactCount(catalog.fallbackCounts?.providers)
  const serviceCount = hasProviderData ? compactCount(counts.services) : compactCount(catalog.fallbackCounts?.services)

  return <div className="serveease-home">
    <PublicHeader city={city} cities={cities} onCityChange={(cityId) => setCitySelection({ ownerKey: activeCityStorageKey, city: cities.find((item) => Number(item.id) === Number(cityId)) || cities[0] })} />
    <main>
      <HeroSection providerCount={providerCount} serviceCount={serviceCount} userRole={currentUser?.role} />
      <CategorySection cityId={city.id} categories={Array.isArray(catalog.categories) ? catalog.categories : []} />
      <PopularServicesSection cityId={city.id} services={Array.isArray(catalog.popularServices) ? catalog.popularServices : []} />
      <InformationSections />
    </main>
    <PublicFooter />
  </div>
}
