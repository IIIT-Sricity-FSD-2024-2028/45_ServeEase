import { backendRole } from './requestContext'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

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
  if (activeSession.token) headers.set('Authorization', `Bearer ${activeSession.token}`)

  const requestUrl = `${API_BASE_URL}${path}`
  let response
  try {
    response = await fetch(requestUrl, { ...options, headers })
  } catch (error) {
    throw new Error(`Request to ${requestUrl} could not be completed: ${error.message}`, { cause: error })
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message
    throw new Error(message || 'Backend request failed.')
  }
  return payload?.data ?? null
}

export { API_BASE_URL, backendRole }
