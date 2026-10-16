import { useMemo, useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { listCatalog } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

export default function AdminServiceCategoriesPage() {
  const catalog = useAdminData(listCatalog)
  const [query, setQuery] = useState('')
  const categories = useMemo(() => Array.isArray(catalog.data?.categories) ? catalog.data.categories : [], [catalog.data])
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const filteredCategories = useMemo(() => categories.filter((category) => [category.name, category.description, category.id,
    ...(Array.isArray(category.subServices) ? category.subServices : [])].some((value) => value !== null && value !== undefined && String(value).toLocaleLowerCase().includes(normalizedQuery))), [categories, normalizedQuery])

  return (
    <AdminAccessGate>
      <section className="admin-page">
        <AdminPageHeader section="Service Categories" title="Service Categories" description="Browse service categories currently exposed by the catalog." />
        <section className="admin-panel">
          <div className="admin-panel-heading"><h2>Service Category Management</h2><span>{catalog.data ? `${categories.length} categories` : 'Not available'}</span></div>
          <p className="admin-note">The backend provides catalog categories for viewing. It does not expose dedicated category add, edit, or delete endpoints.</p>
          <label className="admin-form admin-category-search">Search service categories<input onChange={(event) => setQuery(event.target.value)} placeholder="Search service categories" type="search" value={query} /></label>
          {catalog.isLoading && <LoadingState message="Loading service categories…" />}
          {!catalog.isLoading && catalog.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={catalog.error} /><button className="admin-button" onClick={catalog.reload} type="button">Retry</button></div>}
          {!catalog.isLoading && !catalog.error && categories.length === 0 && <EmptyState message="No catalog categories are available." />}
          {!catalog.isLoading && !catalog.error && categories.length > 0 && filteredCategories.length === 0 && <EmptyState message="No categories match this search." />}
          {!catalog.isLoading && !catalog.error && filteredCategories.length > 0 && <div className="admin-category-grid">
            {filteredCategories.map((category) => <article className="admin-category-card" key={category.id}>
              <div className="admin-category-title"><span aria-hidden="true">{show(category.icon)}</span><h3>{show(category.name)}</h3></div>
              <p>{show(category.description)}</p>
              {Array.isArray(category.subServices) && category.subServices.length > 0
                ? <ul>{category.subServices.map((service) => <li key={service}>{service}</li>)}</ul>
                : <p className="admin-muted">No subcategories added.</p>}
            </article>)}
          </div>}
        </section>
      </section>
    </AdminAccessGate>
  )
}
