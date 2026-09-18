const tabs = ['All', 'Pending', 'Requested', 'Accepted', 'Completed', 'Rejected', 'Cancelled']

export function BookingTabs({ activeTab, bookings, onChange }) {
  return <div className="customer-bookings-tabs" role="tablist" aria-label="Booking status">
    {tabs.map((tab) => {
      const count = tab === 'All' ? bookings.length : bookings.filter((booking) => booking.status === tab).length
      return <button
        className={`customer-bookings-tab${activeTab === tab ? ' customer-bookings-tab--active' : ''}`}
        key={tab}
        type="button"
        role="tab"
        aria-selected={activeTab === tab}
        onClick={() => onChange(tab)}
      >{tab} <span>{count}</span></button>
    })}
  </div>
}

