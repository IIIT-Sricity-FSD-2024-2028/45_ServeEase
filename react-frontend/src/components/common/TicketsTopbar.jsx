import { Link, useSearchParams } from 'react-router-dom'

// front-end/my-tickets.html has its own header: brand, a ticket search and two text actions (no profile menu).
// The search drives the page's `q` parameter, so the list filters as the original's #myTicketSearch did.
export function TicketsTopbar() {
  const [params, setParams] = useSearchParams()
  const update = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('q', value); else next.delete('q')
    setParams(next, { replace: true })
  }
  return <header className="se-topbar se-topbar--tickets">
    <Link className="se-topbar__brand" to="/"><span className="brand-icon">SE</span><span>ServeEase</span></Link>
    <div className="se-topbar__search"><input aria-label="Search tickets" onChange={(event) => update(event.target.value)} placeholder="Search tickets..." type="search" value={params.get('q') || ''} /></div>
    <div className="se-topbar__actions">
      <Link className="se-topbar__btn se-topbar__btn--outline" to="/customer/bookings">My Bookings</Link>
      <Link className="se-topbar__btn se-topbar__btn--primary" to="/customer/dashboard">Dashboard</Link>
    </div>
  </header>
}
