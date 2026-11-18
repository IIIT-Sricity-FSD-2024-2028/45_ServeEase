const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

export function ServiceCard({ service, isUpdating, isDeleting, onEdit, onToggle, onDelete }) {
  const isActive = String(service.status || '').toLowerCase() === 'active' || service.isActive === true

  return (
    <div className="provider-service-card">
      <div className="provider-service-top">
        <div>
          <div className="provider-service-title">{service.name}</div>
          <div className="provider-service-subtitle">{service.category}</div>
        </div>
        <button
          aria-busy={isUpdating}
          aria-checked={isActive}
          aria-label={`${isActive ? 'Turn off' : 'Turn on'} ${service.name}`}
          className={`provider-service-toggle ${isActive ? 'is-on' : 'is-off'}`}
          disabled={isUpdating || isDeleting}
          onClick={() => onToggle(service)}
          role="switch"
          type="button"
        >
          <span className="provider-service-toggle-knob" />
        </button>
      </div>
      {service.description && <div className="provider-service-desc">{service.description}</div>}
      <div className="provider-service-meta">{formatCurrency(service.price)}</div>
      {service.location && <div className="provider-service-meta">📍 {service.location}</div>}
      <div className="provider-service-actions">
        <button aria-label={`Edit ${service.name}`} className="provider-service-edit" disabled={isDeleting} onClick={() => onEdit(service)} type="button">
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M13.7 3.3a1.8 1.8 0 0 1 2.5 2.5l-8.7 8.7-3.5.9.9-3.5 8.8-8.6Z"/><path d="m12.3 4.7 3 3"/></svg>
          Edit
        </button>
        <button aria-label={`Delete ${service.name}`} className="provider-service-delete" disabled={isDeleting} onClick={() => onDelete(service)} type="button">
          <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M4 6h12M8 6V4h4v2m3 0-.7 10H5.7L5 6m3 3v4m4-4v4"/></svg>
          Delete
        </button>
      </div>
    </div>
  )
}
