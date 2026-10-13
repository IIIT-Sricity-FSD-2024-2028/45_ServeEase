import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../../services/api'
import { useAuth } from '../../context/useAuth'
import './auth.css'

const initial = { fullName: '', email: '', phone: '', password: '', confirmPassword: '', organisationName: '', serviceType: '', experience: '', cityId: '', address: '', idProofType: '' }
const services = ['Home cleaning', 'Carpentry', 'Painting', 'Salon at Home', 'Plumbing', 'Electrician', 'Appliance Repair / Installation', 'Pest Control']
const cities = [[1, 'Chennai'], [2, 'Bangalore'], [3, 'Hyderabad'], [4, 'Delhi'], [5, 'Mumbai']]
const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

export function SignupPage() {
  const [params] = useSearchParams(); const [role, setRole] = useState(params.get('role') === 'provider' ? 'provider' : 'customer')
  const [values, setValues] = useState(initial); const [documents, setDocuments] = useState({}); const [show, setShow] = useState(false); const [error, setError] = useState(''); const [loading, setLoading] = useState(false)
  const { isAuthenticated, currentUser, establishSession } = useAuth(); const navigate = useNavigate()
  if (isAuthenticated) return <Navigate to={currentUser.role === 'provider' ? '/provider/dashboard' : '/customer/dashboard'} replace />
  const update = (event) => setValues({ ...values, [event.target.name]: event.target.value })
  const choose = (event) => setDocuments({ ...documents, [event.target.name]: event.target.files?.[0] })
  const setAccountRole = (next) => { setRole(next); setError('') }
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!/^[A-Za-z\s]{3,}$/.test(values.fullName)) return setError('Enter a valid full name.')
    if (!/^\S+@\S+\.\S+$/.test(values.email)) return setError('Enter a valid email address.')
    if (!/^\d{10}$/.test(values.phone)) return setError('Enter a valid 10-digit phone number.')
    if (!strongPassword.test(values.password)) return setError('Password must include upper, lower, number and special character.')
    if (values.password !== values.confirmPassword) return setError('Passwords do not match.')
    if (role === 'provider') {
      if (!values.organisationName || !values.serviceType || !values.cityId || values.address.length < 5 || values.experience === '' || !values.idProofType) return setError('Complete all provider fields, including ID proof type.')
      if (!documents.idProof || !documents.addressProof || !documents.profilePhoto) return setError('Upload ID proof, address proof, and profile photo.')
    }
    setLoading(true)
    try {
      const documentData = Object.entries(documents).filter(([, file]) => file).map(([documentType, file]) => ({ documentType, documentName: file.name, required: ['idProof', 'addressProof', 'profilePhoto'].includes(documentType), documentStatus: 'Pending selection' }))
      const result = await authApi.register({ ...values, role, experience: values.experience === '' ? undefined : Number(values.experience), cityId: values.cityId === '' ? undefined : Number(values.cityId), documents: documentData })
      establishSession(result); navigate(role === 'provider' ? '/provider/dashboard' : '/customer/dashboard', { replace: true })
    } catch (requestError) { setError(requestError.message) } finally { setLoading(false) }
  }
  return <section className={`auth-page signup-page ${role === 'provider' ? 'provider-signup-mode' : ''}`}><div className="auth-wrapper"><div className="auth-left"><Link className="brand auth-brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link><div className="auth-card auth-card-large"><h1>Welcome to ServeEase</h1><p className="auth-subtitle">Create an account to continue</p><div className="role-tabs">{['customer', 'provider'].map((item) => <button key={item} type="button" className={`role-tab ${role === item ? 'active' : ''}`} onClick={() => setAccountRole(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}</div><form onSubmit={submit} noValidate><label className="form-group">Full Name<input name="fullName" value={values.fullName} onChange={update} /></label><label className="form-group">Email<input name="email" type="email" value={values.email} onChange={update} /></label><label className="form-group">Phone Number<input name="phone" inputMode="numeric" maxLength="10" value={values.phone} onChange={update} /></label>{role === 'provider' && <div className="provider-fields"><label className="form-group">Organisation Name<input name="organisationName" value={values.organisationName} onChange={update} /></label><label className="form-group">Service Category<select name="serviceType" value={values.serviceType} onChange={update}><option value="">Select Service Category</option>{services.map((value) => <option key={value}>{value}</option>)}</select></label><label className="form-group">Experience (years)<input name="experience" type="number" min="0" max="50" value={values.experience} onChange={update} /></label><label className="form-group">City<select name="cityId" value={values.cityId} onChange={update}><option value="">Select City</option>{cities.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label className="form-group provider-full">Address<input name="address" value={values.address} onChange={update} /></label><label className="form-group">ID Proof Type<select name="idProofType" value={values.idProofType} onChange={update}><option value="">Select ID Proof Type</option>{['Aadhaar', 'PAN', 'Driving License'].map((value) => <option key={value}>{value}</option>)}</select></label><div className="provider-document-upload-section provider-full"><h3>Valid Documents</h3><p>Files are selected for pending verification. Registration does not upload file content.</p>{[['idProof', 'ID Proof'], ['addressProof', 'Address Proof'], ['skillCertificate', 'Skill Certificate (optional)'], ['experienceProof', 'Experience Proof (optional)'], ['profilePhoto', 'Profile Photo']].map(([name, label]) => <label className="auth-file-label" key={name}>{label}<input name={name} type="file" accept={name === 'profilePhoto' ? '.jpg,.jpeg,.png' : '.pdf,.jpg,.jpeg,.png'} onChange={choose} /></label>)}</div></div>}<label className="form-group">Password<div className="password-control"><input name="password" type={show ? 'text' : 'password'} value={values.password} onChange={update} /><button type="button" onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></label><label className="form-group">Confirm Password<input name="confirmPassword" type={show ? 'text' : 'password'} value={values.confirmPassword} onChange={update} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="btn btn-primary btn-full" disabled={loading}>{loading ? 'Creating account…' : 'Create an account'}</button></form><p className="auth-switch">Already have an account? <Link to={`/login?role=${role}`}>Sign In</Link></p></div></div><aside className="auth-right"><div className="promo-image"><img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=900&q=80" alt="ServeEase service" /></div><h2>Book Trusted Home Services Easily</h2><p>Connect with verified professionals for your home service needs.</p></aside></div></section>
}
