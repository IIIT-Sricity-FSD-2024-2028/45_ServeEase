const formatCurrency = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(Number(value) || 0)

export function ServiceCard({ service, isUpdating, onEdit, onToggle }) {
  const isActive = String(service.status || '').toLowerCase() === 'active' || service.isActive === true

  return (
    <article className="provider-service-card">
      <div className="provider-service-top">
        <div>
          <h2 className="provider-service-title">{service.name}</h2>
          <p className="provider-service-subtitle">{service.category}</p>
        </div>
        <button
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
      {service.description && <p className="provider-service-desc">{service.description}</p>}
      <p className="provider-service-price">{formatCurrency(service.price)}</p>
      {service.location && <p className="provider-service-meta">Location: {service.location}</p>}
      <div className="provider-service-actions">
        <span className={`provider-service-status ${isActive ? 'active' : 'inactive'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
        <button className="provider-service-edit" onClick={() => onEdit(service)} type="button">Edit</button>
      </div>
    </article>
  )
}
