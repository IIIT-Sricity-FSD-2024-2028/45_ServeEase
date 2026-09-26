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

  const startDevelopmentDemoSession = useCallback(() => {
    if (!import.meta.env.DEV || readSession()) return false

    // Mirrors the legacy setSession() shape for the verified primary demo customer.
    const demoSession = {
      isLoggedIn: true,
      userId: 'CUS001',
      role: 'customer',
      fullName: 'Raghava Kumar',
      email: 'user@serveease.com',
      phone: '9876543210',
      organisationName: '',
      serviceType: '',
      experience: '',
      cityId: '',
      cityName: '',
      location: '',
      address: '',
      providerCatalogId: '',
      approvalStatus: '',
      verificationStatus: '',
      accountStatus: '',
      rejectionReason: '',
      suspensionReason: '',
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify(demoSession))
    setCurrentUser(demoSession)
    return true
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
    startDevelopmentDemoSession,
  }), [currentUser, logout, refreshSession, startDevelopmentDemoSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
