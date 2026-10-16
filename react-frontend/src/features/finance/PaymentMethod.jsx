import { paymentMethodParts } from './revenueModel'

export function PaymentMethod({ value }) {
  const parts = paymentMethodParts(value)
  if (!parts) return <span>Not recorded</span>
  return <span>{parts.method}{parts.detail && <small style={{ display: 'block', opacity: 0.75 }}>{parts.detail}</small>}</span>
}
