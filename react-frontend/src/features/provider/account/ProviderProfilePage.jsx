import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../../context/useAuth'
import { authApi, bookingsApi, catalogApi, providerPhotoApi, reviewsApi } from '../../../services/api'
import { documentFileError } from '../../auth/providerDocuments'
import { formatAverage } from '../../reviews/reviewFormat'
import { categoryImageFor, cityIdFor, supportedCities, validateBank, validatePersonal, validateProfessional } from './providerProfile'
import '../providerPortal.css'

const text = (value) => (value === undefined || value === null ? '' : String(value))

function Info({ label, value }) {
  return <div className="info-box"><strong>{label}</strong><div>{value === undefined || value === null || value === '' ? 'Not provided' : value}</div></div>
}

function Field({ label, id, error, children }) {
  return <div className="info-box"><strong><label htmlFor={id}>{label}</label></strong>{children}<small className="error" id={`${id}-error`} aria-live="polite">{error}</small></div>
}

// One save button per section, like the original: green "saved" feedback for two seconds, or the server's reason.
function SaveRow({ label, busy, saved, serverError, onClick }) {
  return <div className="provider-profile-save-row">
    {serverError && <small className="error" role="alert">{serverError}</small>}
    <button className={`btn btn-primary${saved ? ' is-saved' : ''}`} disabled={busy} onClick={onClick} type="button">{busy ? 'Saving…' : saved ? 'Saved Successfully!' : label}</button>
  </div>
}

export function ProviderAccountPage() {
  const { currentUser, refreshSession } = useAuth()
  const user = currentUser || {}
  const providerId = user.providerId || user.providerCatalogId || user.userId || user.id
  const [personal, setPersonal] = useState(() => ({ fullName: text(user.fullName), organisationName: text(user.organisationName), phone: text(user.phone), cityId: cityIdFor(user) }))
  const [professional, setProfessional] = useState(() => ({ experience: text(user.experience) }))
  const [bank, setBank] = useState(() => ({ bankName: text(user.bankName), accountHolder: text(user.accountHolder), accountNumber: text(user.accountNumber), ifsc: text(user.ifsc) }))
  const [errors, setErrors] = useState({ personal: {}, professional: {}, bank: {} })
  const [state, setState] = useState({ section: '', saved: '', error: '', errorSection: '' })
  const [activity, setActivity] = useState({ services: null, bookings: null, reviews: null, error: '' })
  const [photo, setPhoto] = useState({ url: '', loading: true, error: '', pendingUrl: '', pendingFile: null })
  const photoUrls = useRef([])

  useEffect(() => {
    let active = true
    Promise.allSettled([providerId ? catalogApi.getProviderServices(providerId) : Promise.resolve([]), bookingsApi.listForProvider(), reviewsApi.forProvider()]).then(([services, bookings, reviews]) => {
      if (!active) return
      setActivity({
        services: services.status === 'fulfilled' && Array.isArray(services.value) ? services.value.length : null,
        bookings: bookings.status === 'fulfilled' && Array.isArray(bookings.value) ? bookings.value.length : null,
        reviews: reviews.status === 'fulfilled' ? { total: Number(reviews.value?.total) || 0, average: Number(reviews.value?.average) || 0 } : null,
        error: [services, bookings, reviews].find((result) => result.status === 'rejected')?.reason?.message || '',
      })
    })
    return () => { active = false }
  }, [providerId])

  // The current photo is read through the owner-only route; a 404 just means none was ever added.
  useEffect(() => {
    let active = true
    const urls = photoUrls.current
    providerPhotoApi.get().then((blob) => {
      const url = URL.createObjectURL(blob)
      urls.push(url)
      if (active) setPhoto((current) => ({ ...current, url, loading: false }))
    }).catch((error) => { if (active) setPhoto((current) => ({ ...current, loading: false, error: error.status === 404 ? '' : error.message || 'Your profile photo could not be loaded.' })) })
    return () => { active = false; urls.forEach((url) => URL.revokeObjectURL(url)); urls.length = 0 }
  }, [])

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const message = documentFileError('profilePhoto', file)
    if (message) { setPhoto((current) => ({ ...current, error: message })); event.target.value = ''; return }
    const url = URL.createObjectURL(file)
    photoUrls.current.push(url)
    setPhoto((current) => ({ ...current, error: '', pendingUrl: url, pendingFile: file }))
  }

  async function save(section, payload, validation, extra) {
    setErrors((current) => ({ ...current, [section]: validation }))
    setState({ section: '', saved: '', error: '', errorSection: '' })
    if (Object.keys(validation).length) return
    setState({ section, saved: '', error: '', errorSection: '' })
    try {
      if (extra) await extra()
      if (Object.keys(payload).length) { await authApi.updateProviderProfile(payload); await refreshSession() }
      setState({ section: '', saved: section, error: '', errorSection: '' })
      window.setTimeout(() => setState((current) => (current.saved === section ? { ...current, saved: '' } : current)), 2000)
    } catch (error) {
      setState({ section: '', saved: '', error: error.message || 'Your changes could not be saved.', errorSection: section })
    }
  }

  const savePersonal = () => save('personal', {
    fullName: personal.fullName.trim(), ...(user.organisationName !== undefined ? { organisationName: personal.organisationName.trim() } : {}), phone: personal.phone.trim(), cityId: Number(personal.cityId),
  }, validatePersonal(personal, user.organisationName !== undefined), photo.pendingFile ? async () => {
    await providerPhotoApi.replace(photo.pendingFile)
    const url = URL.createObjectURL(await providerPhotoApi.get())
    photoUrls.current.push(url)
    setPhoto((current) => ({ ...current, url, pendingUrl: '', pendingFile: null }))
  } : undefined)
  const saveProfessional = () => save('professional', { experience: Number(professional.experience) }, validateProfessional(professional))
  const saveBank = () => save('bank', {
    bankName: bank.bankName.trim(), accountHolder: bank.accountHolder.trim(), accountNumber: bank.accountNumber.trim(), ifsc: bank.ifsc.trim().toUpperCase(),
  }, validateBank(bank))

  const setter = (update) => (event) => update((current) => ({ ...current, [event.target.name]: event.target.value }))
  const rowProps = (section, label) => ({ label, busy: state.section === section, saved: state.saved === section, serverError: state.errorSection === section ? state.error : '' })
  const displayName = user.organisationName || user.fullName
  const photoSource = photo.pendingUrl || photo.url || categoryImageFor(user.serviceType || user.category)

  return <section className="provider-portal">
    <div className="breadcrumb-row"><Link to="/provider/dashboard">Provider Dashboard</Link> &nbsp;›&nbsp; <strong>My Profile</strong></div>
    <section className="page-title-block provider-page-title"><h1>My Profile</h1><p>View your personal, professional, bank, and service profile details.</p></section>
    {activity.error && <div className="panel-card ops-state ops-state--error" role="alert">{activity.error}</div>}
    <section className="provider-profile-layout">
      <div className="panel-card"><h2 className="panel-title">Personal Information</h2>
        <div className="info-grid" id="providerPersonalInfo">
          <div className="provider-profile-photo-box">
            <img alt={displayName || 'Provider'} id="providerProfilePhotoPreview" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = categoryImageFor(user.serviceType || user.category) }} src={photoSource} />
            <div>
              <strong>Profile Photo</strong>
              <input accept="image/png,image/jpeg" className="provider-edit-input" disabled={state.section === 'personal'} id="providerProfilePhotoInput" onChange={choosePhoto} type="file" />
              <small className={photo.error ? 'error' : 'info-note'} aria-live="polite">{photo.error || (photo.loading ? 'Loading your photo…' : 'JPG or PNG, up to 5 MB. Saved with Save Profile.')}</small>
            </div>
          </div>
          <Field error={errors.personal.fullName} id="providerFullNameInput" label="Name"><input className="provider-edit-input" id="providerFullNameInput" name="fullName" onChange={setter(setPersonal)} type="text" value={personal.fullName} /></Field>
          {user.organisationName !== undefined && <Field error={errors.personal.organisationName} id="providerOrgNameInput" label="Organisation Name"><input className="provider-edit-input" id="providerOrgNameInput" name="organisationName" onChange={setter(setPersonal)} type="text" value={personal.organisationName} /></Field>}
          <Info label="Email" value={user.email} />
          <Field error={errors.personal.phone} id="providerPhoneInput" label="Phone"><input className="provider-edit-input" id="providerPhoneInput" inputMode="numeric" name="phone" onChange={setter(setPersonal)} type="text" value={personal.phone} /></Field>
          <Field error={errors.personal.cityId} id="providerLocationInput" label="Location"><select className="provider-edit-input" id="providerLocationInput" name="cityId" onChange={setter(setPersonal)} value={personal.cityId}><option value="">Select provider city</option>{supportedCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></Field>
          <SaveRow {...rowProps('personal', 'Save Profile')} onClick={savePersonal} />
        </div>
      </div>
      <div className="panel-card"><h2 className="panel-title">Account Activity</h2>
        <div className="info-grid" id="providerAccountStats">
          <Info label="Account Status" value={user.accountStatus || user.status || user.approvalStatus || user.verificationStatus} />
          <Info label="Total Services" value={activity.services ?? 'Unavailable'} />
          <Info label="Total Bookings" value={activity.bookings ?? 'Unavailable'} />
          <Info label="Average Rating" value={activity.reviews ? `⭐ ${formatAverage(activity.reviews.average)}` : 'Unavailable'} />
          <Info label="Total Reviews" value={activity.reviews ? activity.reviews.total : 'Unavailable'} />
        </div>
      </div>
    </section>
    <section className="provider-profile-layout">
      <div className="panel-card"><h2 className="panel-title">Professional Information</h2>
        <div className="info-grid" id="providerProfessionalInfo">
          <Info label="Service Category" value={user.serviceType || user.category} />
          <Field error={errors.professional.experience} id="providerExperienceInput" label="Experience (years)"><input className="provider-edit-input" id="providerExperienceInput" inputMode="numeric" name="experience" onChange={setter(setProfessional)} type="text" value={professional.experience} /></Field>
          <Info label="Provider ID" value={user.id || providerId} />
          <Info label="Account Created" value={user.registrationDate} />
          <SaveRow {...rowProps('professional', 'Save Professional Details')} onClick={saveProfessional} />
        </div>
      </div>
      <div className="panel-card"><h2 className="panel-title">Bank Information</h2>
        <div className="info-grid" id="providerBankInfo">
          <Field error={errors.bank.bankName} id="bankNameInput" label="Bank Name"><input className="provider-edit-input" id="bankNameInput" name="bankName" onChange={setter(setBank)} type="text" value={bank.bankName} /></Field>
          <Field error={errors.bank.accountHolder} id="accountHolderInput" label="Account Holder"><input className="provider-edit-input" id="accountHolderInput" name="accountHolder" onChange={setter(setBank)} type="text" value={bank.accountHolder} /></Field>
          <Field error={errors.bank.accountNumber} id="accountNumberInput" label="Account Number"><input autoComplete="off" className="provider-edit-input" id="accountNumberInput" inputMode="numeric" name="accountNumber" onChange={setter(setBank)} type="text" value={bank.accountNumber} /></Field>
          <Field error={errors.bank.ifsc} id="ifscInput" label="IFSC Code"><input className="provider-edit-input" id="ifscInput" name="ifsc" onChange={setter(setBank)} type="text" value={bank.ifsc} /></Field>
          <SaveRow {...rowProps('bank', 'Save Details')} onClick={saveBank} />
        </div>
      </div>
    </section>
  </section>
}
