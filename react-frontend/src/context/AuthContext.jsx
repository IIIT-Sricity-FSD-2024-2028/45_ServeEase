import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './authContext'

const SESSION_KEY = 'serveEaseSession'

function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readSession)

  const refreshSession = useCallback(() => setCurrentUser(readSession()), [])

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY)
    setCurrentUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('storage', refreshSession)
    return () => window.removeEventListener('storage', refreshSession)
  }, [refreshSession])

  const value = useMemo(() => ({
    currentUser,
    role: currentUser?.role ?? null,
    isAuthenticated: Boolean(currentUser),
    refreshSession,
    logout,
  }), [currentUser, logout, refreshSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
