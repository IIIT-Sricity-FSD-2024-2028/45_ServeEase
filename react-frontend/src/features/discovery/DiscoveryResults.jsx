import { Link } from 'react-router-dom'
import { formatCurrency, imageFallback, providerDisplayImage, ratingSummary } from './catalogModel'

const hasNumber = (value) => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))

function ProviderCard({ provider, availableToday, cityId }) {
  const rating = ratingSummary(provider)
  return <div className="provider-card">
    <div className="provider-image-wrap">
      <img src={providerDisplayImage(provider)} alt={provider.name} onError={imageFallback} />
      {availableToday && <span className="provider-status">Available Today</span>}
    </div>
    <div className="provider-card-body">
      <h3>{provider.name}</h3>
      {hasNumber(provider.years) && <p className="provider-muted">{provider.years}+ Years Experience</p>}
      <div className="provider-offered">
        <strong>Services Offered:</strong>
        {provider.serviceNames.map((item) => <span className="tag-pill" key={item}>{item}</span>)}
      </div>
      <div className="rating-row">{rating ? `⭐ ${rating.rating} (${rating.reviews} reviews)` : <span className="new-provider-label">New Provider</span>}</div>
      <div className="provider-bottom">
        <div>{provider.distance ? `${provider.distance} away` : provider.location || ''}</div>
        <div className="provider-price">
          <span>Starting at</span>
          <strong>{formatCurrency(provider.startingPrice)}</strong>
        </div>
      </div>
      <Link className="btn btn-primary provider-cta" to={`/providers/${encodeURIComponent(provider.id)}${cityId ? `?city=${cityId}` : ''}`}>View Profile &amp; Book</Link>
    </div>
  </div>
}

// Result area of the discovery page. Order matters: a failed request is an error (never an empty
// catalog), an empty catalog is reported as such, and cards render whenever matching rows exist.
export function DiscoveryResults({ loading, error, catalogEmpty, unknownCategory, rows, totalRows, todayAvailability = {}, cityId, onRetry }) {
  if (loading) return <div className="empty-state-card" role="status">Loading service providers…</div>
  if (error) return <div className="empty-state-card" role="alert">
    <p>We couldn't load service providers. {error}</p>
    <button className="secondary-btn journey-retry-btn" type="button" onClick={onRetry}>Retry</button>
  </div>
  if (catalogEmpty) return <div className="empty-state-card">No service providers are listed in the catalog right now.</div>
  if (unknownCategory) return <div className="empty-state-card">Category not found.</div>
  if (!rows.length) return <div className="empty-state-card">{totalRows ? 'No providers found for the selected filters.' : 'No services available in this city yet'}</div>
  return <div className="provider-grid">
    {rows.map((provider) => <ProviderCard availableToday={todayAvailability[provider.id] ?? Boolean(provider.availableToday)} cityId={cityId} key={provider.id} provider={provider} />)}
  </div>
}
