import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'
import { authApi } from '../services/api'
const SESSION_KEY = 'serveEaseSession'
const readSession = () => { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null') } catch { return null } }

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [ready, setReady] = useState(false)
  const refreshSession = useCallback(async () => { const existing = readSession(); if (!existing?.token) { setCurrentUser(null); setReady(true); return null }; try { const session = await authApi.session(); const user = { ...session, token: existing.token, isLoggedIn: true, userId: session.id }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); setCurrentUser(user); return user } catch { sessionStorage.removeItem(SESSION_KEY); setCurrentUser(null); return null } finally { setReady(true) } }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void refreshSession() }, 0); return () => window.clearTimeout(timer) }, [refreshSession])
  const establishSession = useCallback((result) => { const user = { ...result.user, token: result.token, isLoggedIn: true, userId: result.user.id }; sessionStorage.setItem(SESSION_KEY, JSON.stringify(user)); setCurrentUser(user); return user }, [])
  const logout = useCallback(async () => { try { if (readSession()?.token) await authApi.logout() } finally { sessionStorage.removeItem(SESSION_KEY); setCurrentUser(null) } }, [])

  const value = useMemo(() => ({
    currentUser,
    role: currentUser?.role ?? null,
    isAuthenticated: Boolean(currentUser), ready,
    refreshSession,
    establishSession,
    logout,
  }), [currentUser, ready, logout, refreshSession, establishSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
