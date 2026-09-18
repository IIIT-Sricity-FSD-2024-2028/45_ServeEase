import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'
import { StatusBadge } from '../components/common/StatusBadge'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { EmployeeLayout } from '../layouts/EmployeeLayout'
import { ProviderLayout } from '../layouts/ProviderLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import CustomerBookingsPage from '../features/customer/bookings/CustomerBookingsPage'

function FoundationHome() {
  const navigate = useNavigate()
  const { isAuthenticated, startDevelopmentDemoSession } = useAuth()

  function useDemoSession() {
    if (startDevelopmentDemoSession()) navigate('/customer/bookings')
  }

  return <section className="foundation-card">
    <StatusBadge tone="ready">Foundation ready</StatusBadge>
    <h1>ServeEase React frontend</h1>
    <p>The React migration foundation is in place. Feature pages will be added by their workstream owners.</p>
    {import.meta.env.DEV && !isAuthenticated && <button className="foundation-dev-button" type="button" onClick={useDemoSession}>Use demo customer session</button>}
  </section>
}

function NotFound() {
  return <section className="foundation-card"><h1>Page not found</h1><p>This React route has not been defined yet.</p></section>
}

export function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<FoundationHome />} />
      <Route path="/not-found" element={<NotFound />} />
    </Route>
    <Route element={<CustomerLayout />}><Route path="/customer" element={<Navigate to="/not-found" replace />} /><Route path="/customer/bookings" element={<CustomerBookingsPage />} /></Route>
    <Route element={<ProviderLayout />}><Route path="/provider" element={<Navigate to="/not-found" replace />} /></Route>
    <Route element={<EmployeeLayout />}><Route path="/employee" element={<Navigate to="/not-found" replace />} /></Route>
    <Route path="*" element={<Navigate to="/not-found" replace />} />
  </Routes>
}
