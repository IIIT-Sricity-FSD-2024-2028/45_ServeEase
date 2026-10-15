import { Navigate, useSearchParams } from 'react-router-dom'
// Still loaded here: support pages reuse its .journey-* classes.
import './discovery.css'

export { CheckoutPage } from './CheckoutPage'
export { ConfirmationPage } from './ConfirmationPage'
export { ProviderProfilePage as ProviderDetailsPage } from './ProviderProfilePage'
export { ServicesPage } from './ServicesPage'

// Legacy /customer/bookings/new links: scheduling now happens on the provider profile, so forward
// to checkout when a full selection is present, otherwise to the profile or discovery page.
export function BookingFormPage() {
  const [params] = useSearchParams()
  const provider = params.get('provider')
  if (!provider) return <Navigate replace to="/services" />
  const service = params.get('service') || ''
  if (params.get('date') && params.get('time')) {
    return <Navigate replace to={`/customer/checkout?${new URLSearchParams({ provider, service, date: params.get('date'), time: params.get('time') })}`} />
  }
  return <Navigate replace to={`/providers/${encodeURIComponent(provider)}${service ? `?service=${encodeURIComponent(service)}` : ''}`} />
}
