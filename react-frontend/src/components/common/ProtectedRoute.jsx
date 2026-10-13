import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'

export function ProtectedRoute({ children, role }) {
  const { isAuthenticated, currentUser, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!isAuthenticated) return <Navigate replace to="/login" state={{ from: location.pathname }} />
  if (role && currentUser?.role !== role) return <Navigate replace to="/" />
  return children
}
