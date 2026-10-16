import { Link } from 'react-router-dom'

export function AdminPageHeader({ section, title, description, hero = false, danger = false }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="admin-breadcrumb">
        <Link to="/admin">Superuser Dashboard</Link>
        {section && <><span aria-hidden="true">›</span><span>{section}</span></>}
      </nav>
      <header className={`admin-page-header${hero ? ' admin-hero' : ''}${danger ? ' admin-hero--danger' : ''}`}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
    </>
  )
}
