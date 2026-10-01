import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../../context/useAuth'
import { ErrorState, EmptyState, LoadingState } from '../../../components/common/FeedbackStates'
import { bookingsApi } from '../../../services/api'
import { BookingCard } from './BookingCard'
import { BookingDetailsModal } from './BookingDetailsModal'
import { BookingHistory } from './BookingHistory'
import { BookingTabs } from './BookingTabs'
import './customerBookings.css'

const upcomingStatuses = ['Accepted', 'Pending', 'Requested']
const historyStatuses = ['Completed', 'Cancelled', 'Rejected']

function belongsToCustomer(booking, user) {
  if (booking.customerId && user?.userId) return String(booking.customerId) === String(user.userId)
  if (booking.customerEmail && user?.email) return String(booking.customerEmail).toLowerCase() === String(user.email).toLowerCase()
  return false
}

function filterForTab(bookings, tab) {
  if (tab === 'All') return bookings
  if (tab === 'Cancelled') return bookings.filter((booking) => ['Cancelled', 'Rejected'].includes(booking.status))
  return bookings.filter((booking) => booking.status === tab)
}

export default function CustomerBookingsPage() {
  const { currentUser, isAuthenticated } = useAuth()
  const [bookings, setBookings] = useState([])
  const [activeTab, setActiveTab] = useState('All')
  const [selectedBooking, setSelectedBooking] = useState(null)
  const [status, setStatus] = useState(() => isAuthenticated ? 'loading' : 'error')
  const [error, setError] = useState(() => isAuthenticated ? '' : 'Please sign in as a customer to view bookings.')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let cancelled = false
    if (!isAuthenticated) return undefined
    bookingsApi.list()
      .then((records) => {
        if (cancelled) return
        setBookings((Array.isArray(records) ? records : []).filter((booking) => belongsToCustomer(booking, currentUser)))
        setStatus('ready')
      })
      .catch((requestError) => { if (!cancelled) { setError(requestError.message); setStatus('error') } })
    return () => { cancelled = true }
  }, [currentUser, isAuthenticated])

  const filtered = useMemo(() => filterForTab(bookings, activeTab), [activeTab, bookings])
  const upcoming = filtered.filter((booking) => upcomingStatuses.includes(booking.status))
  const history = filtered.filter((booking) => historyStatuses.includes(booking.status))
  const showUpcoming = activeTab === 'All' || upcomingStatuses.includes(activeTab)
  const showHistory = activeTab === 'All' || historyStatuses.includes(activeTab) || activeTab === 'Cancelled'

  function raiseTicket() {
    // Customer ticket creation requires a support form and a verified ticket type.
    // That workflow is outside this slice; no unsupported mutation is attempted.
    setNotice('Raise Ticket is available through the customer support workflow, which is not part of this React slice yet.')
  }

  return <div className="customer-bookings-page">
    <div className="customer-bookings-breadcrumb">Home <span>›</span> Customer Dashboard <span>›</span> <strong>My Bookings</strong></div>
    <div className="customer-bookings-title"><h1>My Bookings</h1><p>View and manage all your service bookings.</p></div>
    <BookingTabs activeTab={activeTab} bookings={bookings} onChange={setActiveTab} />
    {notice && <ErrorState message={notice} />}
    {status === 'loading' && <LoadingState message="Loading your bookings…" />}
    {status === 'error' && <ErrorState message={error} />}
    {status === 'ready' && <>
      {showUpcoming && <section><h2 className="customer-bookings-section-title">{activeTab === 'All' ? 'Upcoming Bookings' : `${activeTab} Bookings`}</h2><div className="customer-bookings-grid">{upcoming.length ? upcoming.map((booking) => <BookingCard key={booking.id} booking={booking} onViewDetails={setSelectedBooking} onRaiseTicket={raiseTicket} />) : <EmptyState message={`No ${activeTab === 'All' ? 'upcoming' : activeTab.toLowerCase()} bookings found.`} />}</div></section>}
      {showHistory && <section className="customer-bookings-history"><h2 className="customer-bookings-section-title">{activeTab === 'All' ? 'Past Booking History' : `${activeTab} Bookings`}</h2><BookingHistory bookings={history} onViewDetails={setSelectedBooking} onRaiseTicket={raiseTicket} /></section>}
      {!showUpcoming && !showHistory && <EmptyState message={`No ${activeTab.toLowerCase()} bookings found.`} />}
    </>}
    <BookingDetailsModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
  </div>
}
