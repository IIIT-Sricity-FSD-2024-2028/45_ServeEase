import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { availabilityApi, bookingsApi, catalogApi } from '../../services/api'
import { availabilityProviderId, bookableServices, formatCurrency, formatDisplayDate, paymentMethodLabel, validateCustomerDetails, validatePayment } from './catalogModel'
import { readJourney, saveJourney } from './journeyState'
import './journey.css'

const UPI_APPS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Navi', 'MobiKwik', 'CRED', 'WhatsApp Pay', 'Airtel Payments Bank', 'Freecharge', 'super.money']
const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Union Bank of India', 'IndusInd Bank', 'IDFC FIRST Bank', 'Yes Bank', 'Federal Bank', 'AU Small Finance Bank', 'RBL Bank']
const POLICY = ['Provider cancellation: Full refund of amount paid.', 'Customer cancellation:', 'More than 24 hours: 100% Service Fee Refund', '24 hours to 3 hours: 70% Service Fee Refund', 'Less than 3 hours: No Service Fee Refund']
const PAYMENT_OPTIONS = [['card', '💳 Credit / Debit Card'], ['upi', '📱 UPI'], ['netbanking', '🏦 Net Banking']]

const formatCard = (value) => value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
function formatExpiry(value) {
  let digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length >= 2) {
    const month = Number(digits.slice(0, 2))
    if (month > 12) digits = `12${digits.slice(2)}`
    else if (month === 0) digits = `01${digits.slice(2)}`
  } else if (digits.length === 1 && Number(digits) > 1) digits = `0${digits}`
  return digits.length >= 3 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : digits
}

export function CheckoutPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const journey = readJourney()
  const selection = {
    providerId: params.get('provider') || '',
    serviceName: params.get('service') || '',
    date: params.get('date') || '',
    time: params.get('time') || '',
    city: params.get('city') || '',
  }
  const selectionKey = [selection.providerId, selection.serviceName, selection.date, selection.time].join('|')
  const draft = journey?.draft
  const [state, setState] = useState({ loading: true, provider: null, categories: [], slots: null, error: '' })
  const [customer, setCustomer] = useState({ name: currentUser?.fullName || '', phone: currentUser?.phone || '', address: '' })
  const [paymentType, setPaymentType] = useState('card')
  const [payment, setPayment] = useState({})
  const [errors, setErrors] = useState({ customer: '', payment: '' })
  const [submitting, setSubmitting] = useState(false)
  const inFlight = useRef(false)
  const fieldRefs = useRef({})

  useEffect(() => {
    if (!selection.providerId) return undefined
    let live = true
    Promise.all([
      catalogApi.getProvider(selection.providerId),
      catalogApi.getCatalog().catch(() => null),
    ]).then(async ([provider, catalog]) => {
      // null = unknown (availability failed to load); the booking API still enforces it on submit.
      const slots = await availabilityApi.get(availabilityProviderId(provider))
        .then((availability) => (availability?.dates || []).find((item) => item.date === selection.date)?.slots || [])
        .catch(() => null)
      if (live) setState({ loading: false, provider, categories: catalog?.categories || [], slots, error: '' })
    }).catch((error) => live && setState({ loading: false, provider: null, categories: [], slots: null, error: error.message }))
    return () => { live = false }
  }, [selection.providerId, selection.date])

  const provider = state.provider
  const service = useMemo(() => bookableServices(provider).find((item) => item.name === selection.serviceName), [provider, selection.serviceName])

  // A login redirect can drop the query string; recover the selection saved on the profile page.
  if (!selection.providerId) {
    if (draft?.providerId) {
      const query = new URLSearchParams({ provider: draft.providerId, service: draft.serviceName, date: draft.date, time: draft.time, ...(draft.city ? { city: draft.city } : {}) })
      return <Navigate replace to={`/customer/checkout?${query}`} />
    }
    return <div className="se-journey journey-in-shell"><div className="checkout-page">
      <h1 className="checkout-title">Booking &amp; Checkout</h1>
      <div className="empty-state-card">No service is selected for checkout. <Link className="link-inline" to="/services">Browse services</Link> to choose a provider, service, date and time.</div>
    </div></div>
  }

  const profileUrl = `/providers/${encodeURIComponent(selection.providerId)}?${new URLSearchParams({ service: selection.serviceName, date: selection.date, time: selection.time, ...(selection.city ? { city: selection.city } : {}) })}`
  const alreadyBooked = journey?.booked?.key === selectionKey ? journey.booked : null
  const slotUnavailable = Array.isArray(state.slots) && !state.slots.includes(selection.time)
  const category = state.categories.find((item) => item.id === provider?.category)

  const setField = (key, value) => { setPayment((previous) => ({ ...previous, [key]: value })); setErrors((previous) => ({ ...previous, payment: '' })) }
  function focusField(name) {
    const field = fieldRefs.current[name]
    if (!field) return
    field.scrollIntoView({ block: 'center' })
    field.focus({ preventScroll: true })
  }

  async function confirm() {
    if (inFlight.current || alreadyBooked || !service) return
    const customerError = validateCustomerDetails(customer)
    if (customerError) { setErrors({ customer: customerError.message, payment: '' }); focusField(customerError.field); return }
    const paymentError = validatePayment(paymentType, payment)
    if (paymentError) { setErrors({ customer: '', payment: paymentError.message }); focusField(paymentError.field); return }
    inFlight.current = true
    setSubmitting(true)
    setErrors({ customer: '', payment: '' })
    try {
      const booking = await bookingsApi.createForCustomer({
        service: service.name,
        providerId: provider.id,
        date: selection.date,
        time: selection.time,
        address: customer.address.trim(),
        customerName: customer.name.trim(),
        customerPhone: customer.phone.trim(),
        paymentMethod: paymentMethodLabel(paymentType, payment),
      })
      if (!booking?.id) throw new Error('The booking service did not return a booking reference.')
      saveJourney({ booked: { key: selectionKey, booking, paymentMethod: paymentMethodLabel(paymentType, payment), categoryName: category?.name || '', location: provider.location || '' } })
      navigate(`/customer/booking-confirmation?booking=${encodeURIComponent(booking.id)}`, { replace: true })
    } catch (error) {
      setErrors({ customer: '', payment: `Booking could not be created. ${error.message}` })
      inFlight.current = false
      setSubmitting(false)
    }
  }

  const breadcrumbs = <div className="breadcrumb-row booking-breadcrumbs">
    <Link to="/">Home</Link> &nbsp;›&nbsp; <Link to={`/services?${new URLSearchParams({ ...(provider?.category ? { category: provider.category } : {}), ...(selection.city ? { city: selection.city } : {}) })}`}>Service Providers</Link> &nbsp;›&nbsp; <Link to={profileUrl}>Provider Profile</Link> &nbsp;›&nbsp; <strong>Booking &amp; Checkout</strong>
  </div>

  if (state.loading || state.error || !service) {
    let message = 'Loading booking details…'
    if (state.error) message = /not found/i.test(state.error) ? 'Booking details not found. The selected provider is not in the catalog.' : `We couldn't load the booking details. ${state.error}`
    else if (!state.loading) message = 'The selected service is not offered by this provider.'
    return <div className="se-journey journey-in-shell"><div className="checkout-page">
      {breadcrumbs}
      <h1 className="checkout-title">Booking &amp; Checkout</h1>
      <div className="empty-state-card" role={state.loading ? 'status' : 'alert'}>{message} {!state.loading && <Link className="link-inline" to={profileUrl}>Back to provider profile</Link>}</div>
    </div></div>
  }

  const total = service.price
  const input = (name, props) => <input ref={(node) => { fieldRefs.current[name] = node }} {...props} />

  return <div className="se-journey journey-in-shell"><div className="checkout-page">
    {breadcrumbs}
    <h1 className="checkout-title">Booking &amp; Checkout</h1>
    {alreadyBooked && <p className="journey-notice" role="status">This booking was already submitted as <strong>{alreadyBooked.booking.id}</strong>. <Link to={`/customer/booking-confirmation?booking=${encodeURIComponent(alreadyBooked.booking.id)}`}>View confirmation</Link></p>}
    {slotUnavailable && !alreadyBooked && <p className="journey-notice" role="alert">The selected time slot is no longer available. <Link to={profileUrl}>Choose another slot</Link></p>}

    <section className="checkout-layout">
      <div className="checkout-main">
        <div className="checkout-card">
          <h2>Booking Summary</h2>
          <div className="checkout-info-row"><span>Service Name</span><strong>{service.name}</strong></div>
          <div className="checkout-info-row"><span>Service Provider</span><strong>{provider.name}</strong></div>
          <div className="checkout-info-row"><span>Service Category</span><strong>{category?.name || '-'}</strong></div>
          <div className="checkout-info-row"><span>Service Location</span><strong>{provider.location || '-'}</strong></div>
          <div className="checkout-info-row"><span>Booking Date</span><strong>{formatDisplayDate(selection.date)}</strong></div>
          <div className="checkout-info-row"><span>Time Slot</span><strong>{selection.time}</strong></div>
        </div>

        <div className="checkout-card">
          <h2>Customer Details</h2>
          <label htmlFor="checkoutCustomerName">Customer Name</label>
          {input('name', { id: 'checkoutCustomerName', type: 'text', value: customer.name, maxLength: 60, autoComplete: 'name', onChange: (event) => { setCustomer({ ...customer, name: event.target.value }); setErrors({ ...errors, customer: '' }) } })}
          <label htmlFor="checkoutCustomerPhone">Phone Number</label>
          {input('phone', { id: 'checkoutCustomerPhone', type: 'tel', value: customer.phone, maxLength: 15, inputMode: 'tel', autoComplete: 'tel', onChange: (event) => { setCustomer({ ...customer, phone: event.target.value }); setErrors({ ...errors, customer: '' }) } })}
          <label htmlFor="checkoutCustomerEmail">Email Address</label>
          <input id="checkoutCustomerEmail" type="email" value={currentUser?.email || ''} readOnly />
          <label htmlFor="checkoutCustomerAddress">Service Address</label>
          <textarea id="checkoutCustomerAddress" ref={(node) => { fieldRefs.current.address = node }} maxLength={300} autoComplete="street-address" placeholder="Enter the address where you need the service" value={customer.address} onChange={(event) => { setCustomer({ ...customer, address: event.target.value }); setErrors({ ...errors, customer: '' }) }} />
          <small className="error" aria-live="polite">{errors.customer}</small>
        </div>

        <div className="checkout-card">
          <h2>Payment Method</h2>
          {PAYMENT_OPTIONS.map(([type, label]) => <div className={`payment-option${paymentType === type ? ' active-option' : ''}`} key={type} role="radio" aria-checked={paymentType === type} tabIndex={0} onClick={() => { setPaymentType(type); setPayment({}); setErrors({ ...errors, payment: '' }) }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setPaymentType(type); setPayment({}) } }}>{label}</div>)}
          <div className="payment-form-box">
            {paymentType === 'card' && <>
              <label htmlFor="paymentCardHolder">Cardholder Name</label>
              {input('cardHolder', { id: 'paymentCardHolder', type: 'text', placeholder: 'Name as on card', maxLength: 60, value: payment.cardHolder || '', onChange: (event) => setField('cardHolder', event.target.value) })}
              <label htmlFor="paymentCardNumber">Card Number</label>
              {input('cardNumber', { id: 'paymentCardNumber', type: 'text', placeholder: '1234 5678 9012 3456', inputMode: 'numeric', maxLength: 19, value: payment.cardNumber || '', onChange: (event) => setField('cardNumber', formatCard(event.target.value)) })}
              <div className="two-col-form">
                <div>
                  <label htmlFor="paymentExpiryDate">Expiry Date</label>
                  {input('expiry', { id: 'paymentExpiryDate', type: 'text', placeholder: 'MM-YY', inputMode: 'numeric', maxLength: 5, value: payment.expiry || '', onChange: (event) => setField('expiry', formatExpiry(event.target.value)) })}
                </div>
                <div>
                  <label htmlFor="paymentCvv">CVV</label>
                  {input('cvv', { id: 'paymentCvv', type: 'password', placeholder: '123', inputMode: 'numeric', maxLength: 3, value: payment.cvv || '', onChange: (event) => setField('cvv', event.target.value.replace(/\D/g, '').slice(0, 3)) })}
                </div>
              </div>
            </>}
            {paymentType === 'upi' && <>
              <label htmlFor="paymentUpiId">UPI ID</label>
              {input('upiId', { id: 'paymentUpiId', type: 'text', placeholder: 'example@upi', value: payment.upiId || '', onChange: (event) => setField('upiId', event.target.value) })}
              <label htmlFor="paymentUpiApp">UPI App</label>
              <select id="paymentUpiApp" ref={(node) => { fieldRefs.current.upiApp = node }} value={payment.upiApp || ''} onChange={(event) => setField('upiApp', event.target.value)}>
                <option value="">Select UPI App</option>
                {UPI_APPS.map((app) => <option key={app} value={app}>{app}</option>)}
              </select>
            </>}
            {paymentType === 'netbanking' && <>
              <label htmlFor="paymentBankName">Select Bank</label>
              <select id="paymentBankName" ref={(node) => { fieldRefs.current.bankName = node }} value={payment.bankName || ''} onChange={(event) => setField('bankName', event.target.value)}>
                <option value="">Select Bank</option>
                {BANKS.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </>}
          </div>
          <p className="checkout-fee-note">Payment details are checked here only. No charge is made; the booking is created with payment status Pending.</p>
          <small className="error" role="alert">{errors.payment}</small>
        </div>
      </div>

      <aside className="checkout-sidebar">
        <div className="checkout-side-card">
          <h2>Pricing Breakdown</h2>
          <div className="checkout-info-row"><span>Service Fee</span><strong>{formatCurrency(service.price)}</strong></div>
          <div className="checkout-total-row"><span>Total Payable</span><strong>{formatCurrency(total)}</strong></div>
          <p className="checkout-fee-note">The booking service records the service fee as the booking total; no tax or platform fee is added.</p>
        </div>
        <div className="checkout-side-card">
          <h2>Confirm Your Booking</h2>
          <div className="checkout-info-row"><span>Service:</span><strong>{service.name}</strong></div>
          <div className="checkout-info-row"><span>Provider:</span><strong>{provider.name}</strong></div>
          <div className="checkout-info-row"><span>Date:</span><strong>{formatDisplayDate(selection.date)}</strong></div>
          <div className="checkout-info-row"><span>Time:</span><strong>{selection.time}</strong></div>
          <div className="checkout-total-row compact"><span>Total:</span><strong>{formatCurrency(total)}</strong></div>
          <button className="btn btn-primary btn-full" type="button" disabled={submitting || Boolean(alreadyBooked) || slotUnavailable} onClick={confirm}>{submitting ? 'Submitting booking…' : 'Confirm Booking'}</button>
          <button className="secondary-btn full-width-btn" type="button" disabled={submitting} onClick={() => navigate(profileUrl)}>Cancel Booking</button>
        </div>
        <div className="checkout-side-card trust-card">
          <h3>Safety &amp; Trust</h3>
          <ul>
            <li>Secure Payment Gateway</li>
            <li>Verified Service Providers</li>
            <li>24/7 Customer Support Available</li>
          </ul>
          <div className="cancellation-policy-copy"><strong>Cancellation Policy</strong>{POLICY.map((line) => <span key={line}>{line}</span>)}</div>
        </div>
      </aside>
    </section>
  </div></div>
}
