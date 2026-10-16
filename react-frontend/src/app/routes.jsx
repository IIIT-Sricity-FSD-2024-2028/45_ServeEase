import { Navigate, Route, Routes } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { EmployeeLayout } from '../layouts/EmployeeLayout'
import { ProviderLayout } from '../layouts/ProviderLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { ProviderServicesPage } from '../features/provider/services/ProviderServicesPage'
import { ProviderDashboardPage } from '../features/provider/dashboard/ProviderDashboardPage'
import { ProviderBookingsPage } from '../features/provider/bookings/ProviderBookingsPage'
import { ProviderAvailabilityPage } from '../features/provider/availability/ProviderAvailabilityPage'
import { ProviderSupportPage } from '../features/provider/support/ProviderSupportPage'
import { ProviderEarningsPage } from '../features/provider/account/ProviderAccountPages'
import { ProviderAccountPage } from '../features/provider/account/ProviderProfilePage'
import { SupportDashboardPage, SupportTicketDetailPage } from '../features/support/SupportPages'
import { adminRoutes } from '../features/admin/adminRoutes'
import CustomerBookingsPage from '../features/customer/bookings/CustomerBookingsPage'
import CustomerDashboardPage from '../features/customer/dashboard/CustomerDashboardPage'
import CustomerPaymentHistoryPage from '../features/customer/payments/CustomerPaymentHistoryPage'
import CustomerProfilePage from '../features/customer/profile/CustomerProfilePage'
import ContactSupportPage from '../features/support/ContactSupportPage'
import CustomerSupportPage from '../features/customer/support/CustomerSupportPage'
import CustomerTicketsPage from '../features/customer/tickets/CustomerTicketsPage'
import HomePage from '../features/home/HomePage'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { useAuth } from '../context/useAuth'
import EmployeeCustomerDetailPage from '../features/employee/EmployeeCustomerDetailPage'
import EmployeeCustomerOperationsPage from '../features/employee/EmployeeCustomerOperationsPage'
import EmployeeProviderOperationsPage from '../features/employee/EmployeeProviderOperationsPage'
import EmployeeProviderDetailPage from '../features/employee/EmployeeProviderDetailPage'
import EmployeeProviderVerificationPage from '../features/employee/EmployeeProviderVerificationPage'
import UnsupportedDepartmentPage from '../features/employee/UnsupportedDepartmentPage'
import { destinationFor } from './destinations'
import { LoginPage } from '../features/auth/LoginPage'
import { SignupPage } from '../features/auth/SignupPage'
import { BookingFormPage, CheckoutPage, ConfirmationPage, ProviderDetailsPage, ServicesPage } from '../features/discovery/DiscoveryPages'

// /employee sends each employee to their department's workspace (superusers to the admin hub).
function EmployeeHome() {
  const { currentUser } = useAuth()
  return <Navigate replace to={destinationFor(currentUser)} />
}

function NotFound() {
  return <section className="foundation-card"><h1>Page not found</h1><p>This React route has not been defined yet.</p></section>
}

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<HomePage />} />
    {/* Discovery pages and the booking confirmation render the original page chrome themselves. */}
    <Route path="/services" element={<ServicesPage />} />
    <Route path="/services/:serviceId" element={<ServicesPage />} />
    <Route path="/providers/:providerId" element={<ProviderDetailsPage />} />
    <Route path="/customer/booking-confirmation" element={<ProtectedRoute role="customer"><ConfirmationPage /></ProtectedRoute>} />

    <Route element={<PublicLayout />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/contact-support" element={<ContactSupportPage />} />
      <Route path="/not-found" element={<NotFound />} />
    </Route>

    <Route element={<CustomerLayout />}>
      <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboardPage /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute role="customer"><CustomerBookingsPage /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute role="customer"><CustomerProfilePage /></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute role="customer"><CustomerPaymentHistoryPage /></ProtectedRoute>} />
      <Route path="/customer/support" element={<ProtectedRoute role="customer"><CustomerSupportPage /></ProtectedRoute>} />
      <Route path="/customer/tickets" element={<ProtectedRoute role="customer"><CustomerTicketsPage /></ProtectedRoute>} />
      <Route path="/customer/bookings/new" element={<ProtectedRoute role="customer"><BookingFormPage /></ProtectedRoute>} />
      <Route path="/customer/checkout" element={<ProtectedRoute role="customer"><CheckoutPage /></ProtectedRoute>} />
    </Route>

    <Route element={<ProviderLayout />}>
      <Route path="/provider" element={<Navigate to="/provider/dashboard" replace />} />
      <Route path="/provider/dashboard" element={<ProtectedRoute role="provider"><ProviderDashboardPage /></ProtectedRoute>} />
      <Route path="/provider/bookings" element={<ProtectedRoute role="provider"><ProviderBookingsPage /></ProtectedRoute>} />
      <Route path="/provider/availability" element={<ProtectedRoute role="provider"><ProviderAvailabilityPage /></ProtectedRoute>} />
      <Route path="/provider/services" element={<ProtectedRoute role="provider"><ProviderServicesPage /></ProtectedRoute>} />
      <Route path="/provider/support" element={<ProtectedRoute role="provider"><ProviderSupportPage /></ProtectedRoute>} />
      <Route path="/provider/account" element={<ProtectedRoute role="provider"><ProviderAccountPage /></ProtectedRoute>} />
      <Route path="/provider/earnings" element={<ProtectedRoute role="provider"><ProviderEarningsPage /></ProtectedRoute>} />
    </Route>

    <Route element={<EmployeeLayout />}>
      <Route path="/employee" element={<ProtectedRoute role={['support', 'superuser']}><EmployeeHome /></ProtectedRoute>} />
      <Route path="/employee/support-tickets" element={<ProtectedRoute department="Support" role="support"><SupportDashboardPage /></ProtectedRoute>} />
      <Route path="/employee/support-tickets/:ticketId" element={<ProtectedRoute department="Support" role="support"><SupportTicketDetailPage /></ProtectedRoute>} />
      <Route path="/employee/customer-operations" element={<ProtectedRoute department="Customer Operations" role={['support', 'superuser']}><EmployeeCustomerOperationsPage /></ProtectedRoute>} />
      <Route path="/employee/customer-operations/:customerId" element={<ProtectedRoute department="Customer Operations" role={['support', 'superuser']}><EmployeeCustomerDetailPage /></ProtectedRoute>} />
      <Route path="/employee/provider-operations" element={<ProtectedRoute department="Provider Operations" role={['support', 'superuser']}><EmployeeProviderOperationsPage /></ProtectedRoute>} />
      <Route path="/employee/provider-operations/:providerId" element={<ProtectedRoute department="Provider Operations" role={['support', 'superuser']}><EmployeeProviderDetailPage /></ProtectedRoute>} />
      <Route path="/employee/provider-operations/:providerId/verification-review" element={<ProtectedRoute department="Provider Operations" role={['support', 'superuser']}><EmployeeProviderVerificationPage /></ProtectedRoute>} />
      <Route path="/employee/unsupported-department" element={<ProtectedRoute role="support"><UnsupportedDepartmentPage /></ProtectedRoute>} />
      {adminRoutes.map(({ path, Component }) => <Route key={path} path={path} element={<ProtectedRoute role="superuser"><Component /></ProtectedRoute>} />)}
    </Route>

    <Route path="*" element={<Navigate to="/not-found" replace />} />
  </Routes>
}
