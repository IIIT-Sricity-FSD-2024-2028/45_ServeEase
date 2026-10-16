import { Navigate, useLocation } from 'react-router-dom'
import { accessRedirect } from '../../app/destinations'
import { useAuth } from '../../context/useAuth'

// `role` may be one role or a list. `department` (one or a list) narrows employee ('support') sessions to
// their department's workspace; other allowed roles, such as superuser, are not department-bound.
// Anyone who does not belong is sent to their own destination, never to another department's page.
export function ProtectedRoute({ children, role, department }) {
  const { isAuthenticated, currentUser, ready } = useAuth()
  const location = useLocation()
  if (!ready) return null
  if (!isAuthenticated) return <Navigate replace to="/login" state={{ from: location.pathname }} />
  const redirect = accessRedirect(currentUser, { role, department })
  return redirect ? <Navigate replace to={redirect} /> : children
}
