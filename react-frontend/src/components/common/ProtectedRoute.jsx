import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

const homeForRole = (role) => ({
  customer: '/customer/dashboard',
  provider: '/provider/dashboard',
  support: '/employee/support-tickets',
  superuser: '/admin',
}[role] || '/')

export function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!isAuthenticated) return <Navigate replace to="/login" state={{ from: location.pathname }} />
  if (role && currentUser?.role !== role) return <Navigate replace to={homeForRole(currentUser?.role)} />
  return children
}
