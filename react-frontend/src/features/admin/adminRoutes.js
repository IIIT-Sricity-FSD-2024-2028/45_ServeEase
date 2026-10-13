import AdminHubPage from './AdminHubPage'
import CustomerOperationsPage from './CustomerOperationsPage'
import ProviderOperationsPage from './ProviderOperationsPage'
import ProviderVerificationPage from './ProviderVerificationPage'
import FinanceOverviewPage from './FinanceOverviewPage'
import AdminBookingsPage from './AdminBookingsPage'

// Register by mapping adminRoutes inside the admin/employee layout in routes.jsx.
export const adminRoutes = [
  { path: '/admin', Component: AdminHubPage },
  { path: '/admin/customers', Component: CustomerOperationsPage },
  { path: '/admin/providers', Component: ProviderOperationsPage },
  { path: '/admin/verification', Component: ProviderVerificationPage },
  { path: '/admin/finance', Component: FinanceOverviewPage },
  { path: '/admin/bookings', Component: AdminBookingsPage },
]
