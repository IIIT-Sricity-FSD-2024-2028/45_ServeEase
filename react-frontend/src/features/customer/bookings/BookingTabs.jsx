import { bookingTabs, countForTab } from '../customerOperations'

// my-bookings.html #bookingTabs (.tabs-row / .tab-btn)
export function BookingTabs({ activeTab, bookings, onChange }) {
  return <section aria-label="Booking status" className="tabs-row" role="tablist">
    {bookingTabs.map((tab) => <button
      aria-selected={activeTab === tab}
      className={`tab-btn${activeTab === tab ? ' active' : ''}`}
      key={tab}
      onClick={() => onChange(tab)}
      role="tab"
      type="button"
    >{tab} <span>{countForTab(bookings, tab)}</span></button>)}
  </section>
}
