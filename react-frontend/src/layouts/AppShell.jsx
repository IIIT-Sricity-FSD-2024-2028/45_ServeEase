import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export function AppShell({ area = 'ServeEase' }) {
  const { isAuthenticated, role, logout } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link className="brand" to="/">ServeEase</Link>
        <span className="area-label">{area}</span>
        <div className="session-summary">
          {isAuthenticated ? <><span>{role}</span><button type="button" onClick={logout}>Log out</button></> : <span>Guest</span>}
        </div>
      </header>
      <main className="app-main"><Outlet /></main>
      <footer className="app-footer">ServeEase React foundation</footer>
    </div>
  )
}
