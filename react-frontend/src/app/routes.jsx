import { Navigate, Route, Routes } from 'react-router-dom'
import { CustomerLayout } from '../layouts/CustomerLayout'
import { EmployeeLayout } from '../layouts/EmployeeLayout'
import { ProviderLayout } from '../layouts/ProviderLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { ProviderServicesPage } from '../features/provider/services/ProviderServicesPage'
import CustomerBookingsPage from '../features/customer/bookings/CustomerBookingsPage'
import CustomerDashboardPage from '../features/customer/dashboard/CustomerDashboardPage'
import CustomerPaymentHistoryPage from '../features/customer/payments/CustomerPaymentHistoryPage'
import CustomerProfilePage from '../features/customer/profile/CustomerProfilePage'
import { ProtectedRoute } from '../components/common/ProtectedRoute'
import { LoginPage } from '../features/auth/LoginPage'
import { BookingFormPage, CheckoutPage, ConfirmationPage, HomePage, ProviderDetailsPage, ServicesPage } from '../features/discovery/DiscoveryPages'

function NotFound() {
  return <section className="foundation-card"><h1>Page not found</h1><p>This React route has not been defined yet.</p></section>
}

export function AppRoutes() {
  return <Routes>
    <Route element={<PublicLayout />}>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/services/:serviceId" element={<ServicesPage />} />
      <Route path="/providers/:providerId" element={<ProviderDetailsPage />} />
      <Route path="/not-found" element={<NotFound />} />
    </Route>

    <Route element={<CustomerLayout />}>
      <Route path="/customer" element={<Navigate to="/customer/dashboard" replace />} />
      <Route path="/customer/dashboard" element={<ProtectedRoute role="customer"><CustomerDashboardPage /></ProtectedRoute>} />
      <Route path="/customer/bookings" element={<ProtectedRoute role="customer"><CustomerBookingsPage /></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute role="customer"><CustomerProfilePage /></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute role="customer"><CustomerPaymentHistoryPage /></ProtectedRoute>} />
      <Route path="/customer/bookings/new" element={<ProtectedRoute role="customer"><BookingFormPage /></ProtectedRoute>} />
      <Route path="/customer/checkout" element={<ProtectedRoute role="customer"><CheckoutPage /></ProtectedRoute>} />
      <Route path="/customer/booking-confirmation" element={<ProtectedRoute role="customer"><ConfirmationPage /></ProtectedRoute>} />
    </Route>

    <Route element={<ProviderLayout />}>
      <Route path="/provider" element={<Navigate to="/provider/services" replace />} />
      <Route path="/provider/services" element={<ProviderServicesPage />} />
    </Route>

    <Route element={<EmployeeLayout />}>
      <Route path="/employee" element={<Navigate to="/not-found" replace />} />
    </Route>

    <Route path="*" element={<Navigate to="/not-found" replace />} />
  </Routes>
}
