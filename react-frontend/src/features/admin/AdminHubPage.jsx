import { Link } from 'react-router-dom'
import { StatusBadge } from '../../components/common/StatusBadge'
import { AdminAccessGate } from './AdminAccessGate'
import './admin.css'

const sections = [
  { title: 'Customers', path: '/admin/customers', description: 'View customer records.' },
  { title: 'Providers', path: '/admin/providers', description: 'Review provider records.' },
  { title: 'Verification', path: '/admin/verification', description: 'Review provider verification requests.' },
  { title: 'Finance', path: '/admin/finance', description: 'View available finance information.' },
  { title: 'Bookings', path: '/admin/bookings', description: 'Review bookings and escalated tickets.' },
]

export default function AdminHubPage() {
  return (
    <AdminAccessGate>
      <section className="admin-page">
        <h1>Admin <StatusBadge tone="ready">Admin access</StatusBadge></h1>
        <p className="admin-muted">Choose an area to manage.</p>
        <div className="admin-grid">
          {sections.map((section) => (
            <Link className="admin-card" key={section.path} to={section.path}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </AdminAccessGate>
  )
}
