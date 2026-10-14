import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import { AuthFooterLinks, AuthPromo, FieldError, PasswordInput } from './AuthParts'
import './auth.css'

const initial = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', organisationName: '', serviceType: '', experience: '', cityId: '', address: '', idProofType: '' }
const services = ['Home cleaning', 'Carpentry', 'Painting', 'Salon at Home', 'Plumbing', 'Electrician', 'Appliance Repair / Installation', 'Pest Control']
const cities = [[1, 'Chennai'], [2, 'Bangalore'], [3, 'Hyderabad'], [4, 'Delhi'], [5, 'Mumbai']]
const documentFields = [['idProof', 'ID Proof', 'Upload ID proof.'], ['addressProof', 'Address Proof', 'Upload address proof.'], ['skillCertificate', 'Skill Certificate'], ['experienceProof', 'Experience Proof'], ['profilePhoto', 'Profile Photo', 'Upload profile photo.']]
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/
const sanitizers = { fullName: (value) => value.replace(/[^A-Za-z\s]/g, ''), phone: (value) => value.replace(/[^0-9]/g, '') }

function validate(role, values, documents) {
  const errors = {
    fullName: !/^[A-Za-z\s]{3,}$/.test(values.fullName) && 'Enter a valid full name.',
    email: !/^\S+@\S+\.\S+$/.test(values.email) && 'Enter a valid email address.',
    phone: !/^\d{10}$/.test(values.phone) && 'Enter a valid 10-digit phone number.',
    password: !strongPassword.test(values.password) && 'Password must include upper, lower, number and special character.',
    confirmPassword: (!values.confirmPassword || values.password !== values.confirmPassword) && 'Passwords do not match.',
  }
  if (role === 'provider') {
    Object.assign(errors, {
      organisationName: !values.organisationName && 'Enter a valid organisation name.',
      serviceType: !values.serviceType && 'Service category is required.',
      experience: values.experience === '' && 'Enter valid experience.',
      cityId: !values.cityId && 'City is required.',
      address: values.address.length < 5 && 'Enter a valid address.',
      idProofType: !values.idProofType && 'Select the ID proof type.',
    })
    documentFields.forEach(([name, , message]) => { if (message) errors[name] = !documents[name] && message })
  }
  return errors
}

export function SignupPage() {
  const [params] = useSearchParams(); const [role, setRole] = useState(params.get('role') === 'provider' ? 'provider' : 'customer')
  const [values, setValues] = useState(initial); const [documents, setDocuments] = useState({}); const [errors, setErrors] = useState({}); const [submitted, setSubmitted] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const { isAuthenticated, currentUser, establishSession } = useAuth(); const navigate = useNavigate()
  if (isAuthenticated) return <Navigate to={currentUser.role === 'provider' ? '/provider/dashboard' : '/customer/dashboard'} replace />
  const update = (event) => { const { name, value } = event.target; setValues({ ...values, [name]: sanitizers[name] ? sanitizers[name](value) : value }) }
  const choose = (event) => setDocuments({ ...documents, [event.target.name]: event.target.files?.[0] })
  const setAccountRole = (next) => { setRole(next); setErrors({}); setSubmitted(false); setError('') }
  const stateClass = (name) => (errors[name] ? 'error-field' : submitted && name in errors ? 'success-field' : undefined)
  const field = (name, props = {}) => <div className="form-group"><input name={name} aria-label={props.placeholder} className={stateClass(name)} value={values[name]} onChange={update} {...props} /><FieldError error={errors[name]} /></div>
  const select = (name, placeholder, options) => <div className="form-group"><select name={name} aria-label={placeholder} className={`service-category-select ${stateClass(name) || ''}`} value={values[name]} onChange={update}><option value="">{placeholder}</option>{options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><FieldError error={errors[name]} /></div>

  async function submit(event) {
    event.preventDefault(); setError('')
    const nextErrors = validate(role, values, documents)
    setErrors(nextErrors); setSubmitted(true)
    if (Object.values(nextErrors).some(Boolean)) return
    setLoading(true)
    try {
      const documentData = Object.entries(documents).filter(([, file]) => file).map(([documentType, file]) => ({ documentType, documentName: file.name, required: ['idProof', 'addressProof', 'profilePhoto'].includes(documentType), documentStatus: 'Pending selection' }))
      const result = await authApi.register({ ...values, role, experience: values.experience === '' ? undefined : Number(values.experience), cityId: values.cityId === '' ? undefined : Number(values.cityId), documents: documentData })
      establishSession(result); navigate(role === 'provider' ? '/provider/dashboard' : '/customer/dashboard', { replace: true })
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }

  return (
    <section className={`auth-page signup-page ${role === 'provider' ? 'provider-signup-mode' : ''}`}>
      <div className="auth-wrapper">
        <div className="auth-left">
          <Link className="brand auth-brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
          <div className="auth-card auth-card-large">
            <h1>Welcome to ServeEase</h1>
            <p className="auth-subtitle">Create an account to continue</p>
            <div className="role-tabs signup-tabs">
              {[['customer', 'Customer'], ['provider', 'Provider']].map(([key, label]) => <button key={key} type="button" className={`role-tab ${role === key ? 'active' : ''}`} aria-pressed={role === key} onClick={() => setAccountRole(key)}>{label}</button>)}
            </div>
            <form onSubmit={submit} noValidate>
              {field('fullName', { placeholder: 'Full Name', autoComplete: 'name' })}
              {field('email', { type: 'email', placeholder: 'Email', autoComplete: 'email' })}
              {field('phone', { type: 'tel', placeholder: 'Phone Number', maxLength: 10, inputMode: 'numeric', autoComplete: 'tel' })}
              {role === 'provider' && <div className="provider-fields">
                {field('organisationName', { placeholder: 'Organisation Name' })}
                {select('serviceType', 'Select Service Category', services.map((value) => [value, value]))}
                {field('experience', { type: 'number', placeholder: 'Experience', min: 0, max: 50 })}
                {select('cityId', 'Select City', cities)}
                {field('address', { placeholder: 'Address', autoComplete: 'street-address' })}
                <div className="provider-document-upload-section">
                  <h3>Valid Documents</h3>
                  <p>Upload the required proof documents for admin verification. Skill and experience documents are optional.</p>
                  {select('idProofType', 'Select ID Proof Type', ['Aadhaar', 'PAN', 'Driving License'].map((value) => [value, value]))}
                  {documentFields.map(([name, label]) => <div className="form-group" key={name}><label className="auth-file-label">{label}<input name={name} type="file" className={stateClass(name)} accept={name === 'profilePhoto' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'} onChange={choose} /></label><FieldError error={errors[name]} /></div>)}
                </div>
              </div>}
              <div className="form-group"><PasswordInput name="password" aria-label="Password" placeholder="Password" className={stateClass('password')} value={values.password} onChange={update} autoComplete="new-password" /><FieldError error={errors.password} /></div>
              <div className="form-group"><PasswordInput name="confirmPassword" aria-label="Confirm Password" placeholder="Confirm Password" className={stateClass('confirmPassword')} value={values.confirmPassword} onChange={update} autoComplete="new-password" /><FieldError error={errors.confirmPassword} /></div>
              <small className="error form-error" role="alert">{error}</small>
              <small className="success-message" />
              <button className="btn btn-primary btn-full" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create an account'}</button>
            </form>
            <p className="auth-switch">Already have an account? <Link to={`/login?role=${role}`}>Sign In</Link></p>
          </div>
          <AuthFooterLinks />
        </div>
        <AuthPromo />
      </div>
    </section>
  )
}
