import { Outlet } from 'react-router-dom'
import { Footer } from '../components/common/Footer'
import { Navbar } from '../components/common/Navbar'

export function AppShell({ area = 'ServeEase' }) {
  return (
    <div className="app-shell">
      <Navbar area={area} />
      <main className="app-main"><Outlet /></main>
      <Footer />
    </div>
  )
}
