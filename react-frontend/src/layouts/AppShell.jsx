import { Outlet } from 'react-router-dom'
import { Footer } from '../components/common/Footer'
import { Navbar } from '../components/common/Navbar'

// `header` replaces the authenticated topbar (null renders no header at all).
export function AppShell({ area = 'ServeEase', header, footer = true, bare = false }) {
  return (
    <div className="app-shell">
      {header === undefined ? <Navbar area={area} /> : header}
      <main className={bare ? 'app-main app-main--bare' : area === 'Customer' || area === 'Provider' ? 'app-main app-main--customer' : 'app-main'}><Outlet /></main>
      {footer && <Footer area={area} />}
    </div>
  )
}
