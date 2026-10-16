import { useLocation } from 'react-router-dom'
import { PublicHeader } from '../features/home/PublicChrome'
import { AppShell } from './AppShell'

// The original login.html and signup.html have no navbar (the auth card carries the brand); other
// public pages use the public navbar from index.html, never the authenticated dashboard topbar.
const headerlessPaths = ['/login', '/signup']

export function PublicLayout() {
  const { pathname } = useLocation()
  const header = headerlessPaths.includes(pathname)
    ? null
    : <div className="serveease-home public-layout-header"><PublicHeader sectionBase="/" /></div>
  // The original login and signup pages end with their own auth footer links; they have no site footer.
  return <AppShell area="Public" bare={headerlessPaths.includes(pathname)} footer={!headerlessPaths.includes(pathname)} header={header} />
}
