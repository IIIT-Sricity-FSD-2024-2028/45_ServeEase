import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorState, LoadingState } from '../../components/common/FeedbackStates'
import { AdminAccessGate } from './AdminAccessGate'
import { AdminPageHeader } from './AdminPageHeader'
import { listCatalog, saveCatalogCategories, syncCatalog } from './adminApi'
import { show, useAdminData } from './useAdminData'
import './admin.css'

function slugify(value) {
  return String(value || 'service').trim().toLowerCase().replace(/\s*\/\s*/g, '-').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'service'
}

function iconFor(name) {
  const value = String(name || '').toLowerCase()
  if (value.includes('clean')) return '🧹'
  if (value.includes('salon') || value.includes('beauty')) return '💇'
  if (value.includes('plumb')) return '🔧'
  if (value.includes('electric')) return '⚡'
  if (value.includes('appliance') || value.includes('repair')) return '🛠️'
  if (value.includes('pest')) return '🐜'
  if (value.includes('paint')) return '🎨'
  if (value.includes('carpent')) return '🪚'
  return '🧰'
}

function normalizedCategory(category) {
  return {
    ...category,
    id: category.id || slugify(category.name),
    name: String(category.name || '').trim(),
    description: String(category.description || '').trim(),
    icon: category.icon || iconFor(category.name),
    bgImage: category.bgImage || '',
    subServices: Array.isArray(category.subServices) ? category.subServices : [],
  }
}

function prepareCatalog(catalog, categories) {
  const imageByCategory = {
    'home-cleaning': 'assets/images/home-cleaning/clean1.jpg',
    carpentry: 'assets/images/carpentry/carpentry1.jpg.jpeg',
    painting: 'assets/images/painting/painting1.jpg.jpeg',
    'salon-at-home': 'assets/images/salon-at-home/salon1.jpg',
    plumbing: 'assets/images/plumbing/plumbing1.jpg.jpeg',
    electrician: 'assets/images/electrician/ele1.jpg.jpeg',
    'appliance-repair-installation': 'assets/images/appliance-repair/ACrepair.jpg.jpeg',
    'pest-control': 'assets/images/pest-control/pest1.jpg.jpeg',
  }
  return {
    ...catalog,
    categories: categories.map(normalizedCategory),
    providers: Array.isArray(catalog.providers) ? catalog.providers.map((provider) => {
      const image = String(provider.image || '')
      return {
        id: provider.id,
        name: provider.name,
        category: provider.category,
        subServices: Array.isArray(provider.subServices) ? provider.subServices : [],
        years: Number(provider.years) || 0,
        rating: Number(provider.rating) || 0,
        reviews: Number(provider.reviews) || 0,
        distance: provider.distance || '0 km',
        startingPrice: Number(provider.startingPrice) || 0,
        location: provider.location || 'Chennai',
        jobsDone: Number(provider.jobsDone) || 0,
        availableToday: provider.availableToday !== false,
        verified: provider.verified !== false,
        cityId: Number(provider.cityId) || 1,
        image: image && !/^data:/i.test(image) && image.length <= 300 && !/^\/uploads\/profiles\//i.test(image)
          ? image : (imageByCategory[provider.category] || imageByCategory['home-cleaning']),
        availabilitySlots: provider.availabilitySlots,
        ownerProviderId: provider.ownerProviderId,
        ownerProviderEmail: provider.ownerProviderEmail,
        accountStatus: provider.accountStatus,
        approvalStatus: provider.approvalStatus,
        verificationStatus: provider.verificationStatus,
        profilePhoto: provider.profilePhoto,
        servicePricing: provider.servicePricing,
        services: provider.services,
      }
    }) : [],
    popularServices: Array.isArray(catalog.popularServices) ? catalog.popularServices : [],
  }
}

export default function AdminServiceCategoriesPage() {
  const catalog = useAdminData(listCatalog)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [subcategories, setSubcategories] = useState('')
  const [formError, setFormError] = useState('')
  const [formNotice, setFormNotice] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const categories = useMemo(() => Array.isArray(catalog.data?.categories) ? catalog.data.categories : [], [catalog.data])

  function openAddForm() {
    setEditingId('')
    setName('')
    setDescription('')
    setSubcategories('')
    setFormError('')
    setFormNotice('')
    setIsFormOpen(true)
  }

  function openEditForm(category) {
    setEditingId(category.id)
    setName(category.name || '')
    setDescription(category.description || '')
    setSubcategories((category.subServices || []).join(', '))
    setFormError('')
    setFormNotice('')
    setIsFormOpen(true)
  }

  function closeForm() {
    if (isSaving) return
    setIsFormOpen(false)
    setFormError('')
  }

  async function submitCategory(event) {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanDescription = description.trim()
    const subServices = subcategories.split(',').map((item) => item.trim()).filter(Boolean)
    if (!cleanName) return setFormError('Category name is required.')
    if (!cleanDescription) return setFormError('Category description is required.')
    if (cleanName.length > 120) return setFormError('Category name must be 120 characters or fewer.')
    if (cleanDescription.length > 300) return setFormError('Category description must be 300 characters or fewer.')
    if (subServices.some((item) => item.length > 140)) return setFormError('Each subcategory must be 140 characters or fewer.')
    const duplicate = categories.some((category) => category.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase() && category.id !== editingId)
    if (duplicate) return setFormError('This category already exists.')

    const nextCategory = normalizedCategory({
      ...(categories.find((category) => category.id === editingId) || {}),
      id: editingId || slugify(cleanName),
      name: cleanName,
      description: cleanDescription,
      icon: categories.find((category) => category.id === editingId)?.icon || iconFor(cleanName),
      subServices,
    })
    const nextCategories = editingId
      ? categories.map((category) => category.id === editingId ? nextCategory : category)
      : [...categories, nextCategory]
    setIsSaving(true)
    setFormError('')
    setFormNotice('')
    try {
      await syncCatalog(prepareCatalog(catalog.data || {}, nextCategories))
      await saveCatalogCategories(nextCategories)
      setFormNotice(editingId ? 'Category updated successfully.' : 'Category added successfully.')
      setIsFormOpen(false)
      await catalog.reload()
    } catch (error) {
      setFormError(error?.message || 'Unable to save the category.')
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteCategory(category) {
    setIsSaving(true)
    setFormError('')
    setFormNotice('')
    try {
      await syncCatalog(prepareCatalog(catalog.data || {}, categories.filter((item) => item.id !== category.id)))
      await saveCatalogCategories(categories.filter((item) => item.id !== category.id))
      setFormNotice(`${category.name} deleted successfully.`)
      await catalog.reload()
    } catch (error) {
      setFormError(error?.message || 'Unable to delete the category.')
    } finally {
      setIsSaving(false)
    }
  }

  return <AdminAccessGate>
    <section className="admin-page admin-service-categories">
      <AdminPageHeader section="Service Categories" title="Service Categories" description="Manage platform service categories from a dedicated page." />
      <section className="admin-panel admin-category-management">
        <div className="admin-panel-heading"><h2>Service Category Management</h2><button className="admin-button" disabled={catalog.isLoading || Boolean(catalog.error) || isSaving} onClick={openAddForm} type="button">+ Add Category</button></div>
        {formNotice && <p className="admin-category-notice" role="status">{formNotice}</p>}
        {formError && !isFormOpen && <div className="admin-feedback admin-feedback--error" role="alert">{formError}</div>}
        {isFormOpen && <form className="admin-category-form" onSubmit={submitCategory}>
          <div className="admin-category-form-heading"><h3>{editingId ? 'Edit Category' : 'Add New Category'}</h3><button aria-label="Close category form" className="admin-category-form-close" disabled={isSaving} onClick={closeForm} type="button">×</button></div>
          <label className="admin-form">Category Name<input maxLength={120} onChange={(event) => setName(event.target.value)} required value={name} /></label>
          <label className="admin-form">Category Description<textarea maxLength={300} onChange={(event) => setDescription(event.target.value)} required value={description} /></label>
          <label className="admin-form">Subcategories <span className="admin-muted">Optional</span><textarea onChange={(event) => setSubcategories(event.target.value)} placeholder="Example: Full Home Cleaning, Kitchen Cleaning" value={subcategories} /></label>
          <small>Separate multiple subcategories with commas.</small>
          {formError && <p className="admin-category-error" role="alert">{formError}</p>}
          <footer><button className="admin-button" disabled={isSaving} type="submit">{isSaving ? 'Saving…' : editingId ? 'Update Category' : 'Add Category'}</button><button className="admin-button admin-button--secondary" disabled={isSaving} onClick={closeForm} type="button">Cancel</button></footer>
        </form>}
        {catalog.isLoading && <LoadingState message="Loading service categories…" />}
        {!catalog.isLoading && catalog.error && <div className="admin-feedback admin-feedback--error"><ErrorState message={catalog.error} /><button className="admin-button" onClick={catalog.reload} type="button">Retry</button></div>}
        {!catalog.isLoading && !catalog.error && categories.length === 0 && <EmptyState message="No service categories are available." />}
        {!catalog.isLoading && !catalog.error && categories.length > 0 && <div className="admin-category-grid">
          {categories.map((category) => <article className="admin-category-card" key={category.id}>
            <div className="admin-category-card-top"><div className="admin-category-card-content">
              <div className="admin-category-title"><span aria-hidden="true">{show(category.icon || iconFor(category.name))}</span><h3>{show(category.name)}</h3></div>
              <p className="admin-category-description">{show(category.description || 'No description added.')}</p>
            </div><div className="admin-category-actions">
              <button aria-label={`Edit ${category.name}`} className="admin-category-icon-button" disabled={isSaving} onClick={() => openEditForm(category)} title="Edit category" type="button">✎</button>
              <button aria-label={`Delete ${category.name}`} className="admin-category-icon-button" disabled={isSaving} onClick={() => deleteCategory(category)} title="Delete category" type="button">🗑️</button>
            </div></div>
            {Array.isArray(category.subServices) && category.subServices.length > 0
              ? <ul>{category.subServices.map((service, index) => <li key={`${service}-${index}`}>{service}</li>)}</ul>
              : <p className="admin-muted admin-category-empty">No subcategories added.</p>}
          </article>)}
        </div>}
      </section>
      <div className="admin-category-back"><Link className="admin-button admin-button--secondary" to="/admin">Back to Dashboard</Link></div>
    </section>
  </AdminAccessGate>
}
