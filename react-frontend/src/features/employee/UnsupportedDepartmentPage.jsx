import { Navigate } from 'react-router-dom'
import { UNSUPPORTED_DEPARTMENT_PATH, destinationFor } from '../../app/destinations'
import { useAuth } from '../../context/useAuth'
import './employeeOperations.css'

// employee-access-denied.html: shown when an employee's stored department has no workspace. Employees with a
// supported department are sent to their own workspace instead.
export default function UnsupportedDepartmentPage() {
  const { currentUser } = useAuth()
  const destination = destinationFor(currentUser)
  if (destination !== UNSUPPORTED_DEPARTMENT_PATH) return <Navigate replace to={destination} />
  return <div className="employee-ops">
    <section className="ops-state ops-state--error" role="alert">
      <h2>Access Denied</h2>
      <p>This workspace is not included in the signed-in employee's department permissions.</p>
      <p>Department on record: <strong>{currentUser?.department || 'Not recorded'}</strong>. Contact a ServeEase administrator to have it corrected.</p>
    </section>
  </div>
}
