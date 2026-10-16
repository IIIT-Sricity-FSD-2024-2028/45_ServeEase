import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { availabilityApi } from '../../services/api'
import { MAX_PRICE, PRICE_STEP, categoryProviders, filterProviders, resolveCategory } from './catalogModel'
import { DiscoveryResults } from './DiscoveryResults'
import { PublicJourneyShell } from './PublicJourneyShell'
import { useCatalog } from './useCatalog'
import { useJourneyCity } from './useJourneyCity'

const localToday = () => {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function ServicesPage() {
  const { serviceId } = useParams()
  const [params, setParams] = useSearchParams()
  const { city, cities, changeCity } = useJourneyCity(params, setParams)
  const catalog = useCatalog()
  const categories = useMemo(() => (Array.isArray(catalog.data?.categories) ? catalog.data.categories : []), [catalog.data])
  const categoryParam = params.get('category') || serviceId || ''
  const category = resolveCategory(categories, categoryParam)
  const query = params.get('q') || ''
  const service = params.get('service') || 'all'
  const maxPrice = Math.min(MAX_PRICE, Math.max(0, Number(params.get('maxPrice')) || MAX_PRICE))
  const [todayAvailability, setTodayAvailability] = useState({})

  function setParam(key, value, fallback, replace = false) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value === fallback || value === '') next.delete(key)
      else next.set(key, String(value))
      if (key === 'category') next.delete('service')
      return next
    }, { replace })
  }

  function resetFilters() {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      ;['q', 'service', 'maxPrice'].forEach((key) => next.delete(key))
      return next
    })
  }

  const catalogEmpty = !catalog.loading && !catalog.error && !catalog.data?.providers?.length
  const unknownCategory = Boolean(categoryParam) && !catalog.loading && !catalog.error && !catalogEmpty && !category
  const allRows = useMemo(
    () => (catalog.data && !unknownCategory ? categoryProviders(catalog.data, { categoryId: category?.id, cityId: city.id }) : []),
    [catalog.data, category, city.id, unknownCategory],
  )
  const rows = useMemo(() => filterProviders(allRows, { query, service, maxPrice, categories }), [allRows, query, service, maxPrice, categories])
  const serviceOptions = useMemo(() => {
    const names = new Set(category?.subServices || [])
    allRows.forEach((row) => row.serviceNames.forEach((name) => names.add(name)))
    return [...names]
  }, [allRows, category])

  // Providers with a live schedule: replace the catalog's static availableToday flag with the
  // availability API result (initCategoryServicesPage → loadTodayAvailability in the original).
  const ownedIds = useMemo(() => [...new Set(allRows.filter((row) => row.ownerProviderId).map((row) => `${row.id}|${row.ownerProviderId}`))], [allRows])
  useEffect(() => {
    if (!ownedIds.length) return undefined
    let live = true
    Promise.all(ownedIds.map(async (key) => {
      const [id, ownerId] = key.split('|')
      try {
        const response = await availabilityApi.get(ownerId)
        const today = (response?.dates || []).find((item) => item.date === localToday())
        return [id, Boolean(today?.slots?.length)]
      } catch {
        return [id, false]
      }
    })).then((entries) => live && setTodayAvailability((previous) => ({ ...previous, ...Object.fromEntries(entries) })))
    return () => { live = false }
  }, [ownedIds])

  const categoryLabel = category ? `${category.name} Services` : 'All Services'
  return <PublicJourneyShell city={city} cities={cities} className="listing-page" onCityChange={changeCity}>
    <div className="container">
      <Link className="back-home-link" to="/">‹ Previous Page / Home</Link>
      <nav aria-label="Breadcrumb" className="breadcrumbs"><Link to="/">Home</Link> &nbsp; › &nbsp; <Link to="/#categories">Categories</Link> &nbsp; › &nbsp; {categoryLabel}</nav>

      <section className="listing-hero">
        <h1>Available Service Providers</h1>
        <p>{category ? `Choose from trusted ${category.name.toLowerCase()} professionals near your location.` : 'Choose from trusted professionals near your location.'}</p>
      </section>

      <section className="listing-layout">
        <aside className="filter-card" aria-label="Filters">
          <div className="filter-head">
            <h3>Filters</h3>
            <button type="button" className="text-btn" onClick={resetFilters}>Reset All</button>
          </div>

          {/* The original page filters only by service type and price; search and category appear when the page was opened without a category or from a search. */}
          {(!category || query) && <>
          <div className="filter-block">
            <label htmlFor="searchFilter">Search</label>
            <input id="searchFilter" type="search" placeholder="Search by service or provider" value={query} onChange={(event) => setParam('q', event.target.value, '', true)} />
          </div>

          <div className="filter-block">
            <label htmlFor="categoryFilter">Category</label>
            <select id="categoryFilter" value={category?.id || ''} onChange={(event) => setParam('category', event.target.value, '')}>
              <option value="">All Categories</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          </>}

          <div className="filter-block">
            <label htmlFor="serviceTypeFilter">Service Type</label>
            <select id="serviceTypeFilter" value={serviceOptions.includes(service) ? service : 'all'} onChange={(event) => setParam('service', event.target.value, 'all')}>
              <option value="all">All {category ? `${category.name} ` : ''}Services</option>
              {serviceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>

          <div className="filter-block">
            <label htmlFor="priceFilter">Price Range</label>
            <input type="range" id="priceFilter" min="0" max={MAX_PRICE} step={PRICE_STEP} value={maxPrice} onChange={(event) => setParam('maxPrice', Number(event.target.value), MAX_PRICE, true)} />
            <div className="range-row">
              <span>₹0</span>
              <span>₹{maxPrice}</span>
            </div>
          </div>
        </aside>

        <div className="listing-content">
          {!catalog.loading && !catalog.error && !catalogEmpty && !unknownCategory && <p className="results-count" aria-live="polite">Showing {rows.length} of {allRows.length} providers in {city.name}</p>}
          <DiscoveryResults catalogEmpty={catalogEmpty} cityId={city.id} error={catalog.error} loading={catalog.loading} onRetry={catalog.reload} rows={rows} todayAvailability={todayAvailability} totalRows={allRows.length} unknownCategory={unknownCategory} />
        </div>
      </section>
    </div>
  </PublicJourneyShell>
}
