import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { authApi } from '../services/api'
import { SUSPENDED_EVENT, suspendedKind } from '../services/apiClient'
const SESSION_KEY = 'serveEaseSession'
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null } }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [ready, setReady] = useState(false)
  // Set only from the server's structured suspended-account answer: { kind: 'customer' | 'provider', reason }.
  const [suspension, setSuspension] = useState(null)
  const refreshSession = useCallback(async () => { const existing = readSession(); if (!existing?.token) { setCurrentUser(null); setReady(true); return null }; try { const session = await authApi.session(); const user = { ...session, token: existing.token, isLoggedIn: true, userId: session.id }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); setCurrentUser(user); return user } catch (error) { sessionStorage.removeItem(SESSION_KEY); setCurrentUser(null); const kind = suspendedKind(error); if (kind) setSuspension({ kind, reason: error.reason || '' }); return null } finally { setReady(true) } }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void refreshSession() }, 0); return () => window.clearTimeout(timer) }, [refreshSession])
  useEffect(() => {
    const onSuspended = (event) => { setCurrentUser(null); setSuspension({ kind: event.detail.kind, reason: event.detail.reason }) }
    window.addEventListener(SUSPENDED_EVENT, onSuspended)
    return () => window.removeEventListener(SUSPENDED_EVENT, onSuspended)
  }, [])
  const clearSuspension = useCallback(() => setSuspension(null), [])
  const reportSuspension = useCallback((next) => setSuspension(next), [])
  const establishSession = useCallback((result) => { const user = { ...result.user, token: result.token, isLoggedIn: true, userId: result.user.id }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); setCurrentUser(user); return user }, [])
  const logout = useCallback(async () => { try { if (readSession()?.token) await authApi.logout() } finally { sessionStorage.removeItem(SESSION_KEY); setCurrentUser(null) } }, [])

  const value = useMemo(() => ({
    currentUser,
    role: currentUser?.role ?? null,
    isAuthenticated: Boolean(currentUser), ready,
    suspension, clearSuspension, reportSuspension,
    refreshSession,
    establishSession,
    logout,
  }), [currentUser, ready, suspension, clearSuspension, reportSuspension, logout, refreshSession, establishSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
