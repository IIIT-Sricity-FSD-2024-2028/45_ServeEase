import { Link } from 'react-router-dom'
import { chipClass, display } from './employeeOperations'

export function Breadcrumb({ items }) {
  return <nav aria-label="Breadcrumb" className="breadcrumb-row">
    {items.map(([label, to], index) => <span key={label}>
      {to ? <Link to={to}>{label}</Link> : index === items.length - 1 ? <strong aria-current="page">{label}</strong> : <span>{label}</span>}
      {index < items.length - 1 && <span aria-hidden="true"> ›</span>}
    </span>)}
  </nav>
}

export function Metric({ icon, label, value, description }) {
  return <article className="ops-metric">
    <div className="ops-metric-label"><span aria-hidden="true" className="ops-metric-icon">{icon}</span><span>{label}</span></div>
    <strong>{value}</strong>
    <small>{description}</small>
  </article>
}

export function Chip({ value }) {
  return <span className={`ops-chip ${chipClass(value)}`}>{display(value)}</span>
}

export function LoadState({ state, error, loadingText, onRetry }) {
  if (state === 'loading') return <div className="ops-state" role="status">{loadingText}</div>
  if (state === 'error') return <div className="ops-state ops-state--error" role="alert">
    <p>{error}</p>
    <button className="btn btn-outline" onClick={onRetry} type="button">Retry</button>
  </div>
  return null
}
