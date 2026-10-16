const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

export function ServiceCard({ service, isUpdating, onEdit, onToggle }) {
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
          disabled={isUpdating}
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
        <button className="provider-service-edit" onClick={() => onEdit(service)} type="button">Edit</button>
      </div>
    </div>
  )
}
