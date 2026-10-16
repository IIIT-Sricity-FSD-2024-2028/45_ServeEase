import { Link } from 'react-router-dom'

// superuser-*.html: a breadcrumb row (the current page in bold) above a left-accented title card, or the
// gradient hero on the dashboard and the ticket resolution panel.
export function AdminPageHeader({ section, title, description, hero = false, danger = false }) {
  return (
    <>
      <nav aria-label="Breadcrumb" className="admin-breadcrumb">
        {section
          ? <><Link to="/admin">Superuser Dashboard</Link><span aria-hidden="true">›</span><strong aria-current="page">{section}</strong></>
          : <strong aria-current="page">Superuser Dashboard</strong>}
      </nav>
      <header className={`admin-page-header${hero ? ' admin-hero' : ''}${danger ? ' admin-hero--danger' : ''}`}>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </header>
    </>
  )
}

