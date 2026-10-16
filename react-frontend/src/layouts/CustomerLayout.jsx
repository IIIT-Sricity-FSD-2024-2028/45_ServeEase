import { useLocation } from 'react-router-dom'
import { TicketsTopbar } from '../components/common/TicketsTopbar'
import { AppShell } from './AppShell'

// my-tickets.html is the one customer page with its own header and no footer.
export function CustomerLayout() {
  const { pathname } = useLocation()
  return pathname === '/customer/tickets' ? <AppShell area="Customer" footer={false} header={<TicketsTopbar />} /> : <AppShell area="Customer" />
}
