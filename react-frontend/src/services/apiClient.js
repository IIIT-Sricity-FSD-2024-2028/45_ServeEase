const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

const backendRole = (role) => {
  if (role === 'admin' || role === 'superuser') return 'admin'
  if (role === 'provider' || role === 'support') return role
  return 'user'
}

function session() {
  try {
    return JSON.parse(sessionStorage.getItem('serveEaseSession') || 'null') || {}
  } catch {
    return {}
  }
}

export async function apiRequest(path, options = {}) {
  const activeSession = session()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  headers.set('role', backendRole(activeSession.role))
  if (activeSession.userId) headers.set('user-id', activeSession.userId)
  if (activeSession.email) headers.set('user-email', activeSession.email)

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message
    throw new Error(message || 'Backend request failed.')
  }
  return payload?.data ?? null
}

export { API_BASE_URL, backendRole }

