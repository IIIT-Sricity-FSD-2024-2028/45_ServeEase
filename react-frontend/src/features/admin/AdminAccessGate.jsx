import { useAuth } from '../../context/useAuth'
import { ErrorState } from '../../components/common/FeedbackStates'

export function AdminAccessGate({ children }) {
  const { role } = useAuth()

  if (role !== 'admin' && role !== 'superuser') {
    return <section className="admin-page"><ErrorState message="Admin access required" /></section>
  }

  return children
}
