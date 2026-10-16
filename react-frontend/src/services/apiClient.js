import { backendRole } from './requestContext'

import { API_BASE_URL } from './apiBase'

function session() {
  try {
    return JSON.parse(sessionStorage.getItem('serveEaseSession') || 'null') || {}
  } catch {
    return {}
  }
}

export const SUSPENDED_EVENT = 'serveease:account-suspended'
const SUSPENDED_CODES = { CUSTOMER_ACCOUNT_SUSPENDED: 'customer', PROVIDER_ACCOUNT_SUSPENDED: 'provider' }

// 'customer' | 'provider' when the error is the server's structured suspended-account 403, else null.
export function suspendedKind(error) {
  return error?.status === 403 && Object.hasOwn(SUSPENDED_CODES, error?.code) ? SUSPENDED_CODES[error.code] : null
}

function announceSuspension(error) {
  try { sessionStorage.removeItem('serveEaseSession') } catch { /* nothing stored to discard */ }
  window.dispatchEvent(new CustomEvent(SUSPENDED_EVENT, { detail: { kind: suspendedKind(error), reason: error.reason || '' } }))
}

// api.js responseMetrics: round-trip time of every completed API request in this tab, shown on the superuser
// dashboard as "Average Platform Response Time".
const responseMetrics = { count: 0, totalMs: 0 }

export function getResponseMetrics() {
  return { count: responseMetrics.count, totalMs: responseMetrics.totalMs, averageMs: responseMetrics.count ? responseMetrics.totalMs / responseMetrics.count : null }
}

export async function apiRequest(path, options = {}) {
  const activeSession = session()
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json')
  headers.set('role', backendRole(activeSession.role))
  if (activeSession.userId) headers.set('user-id', activeSession.userId)
  if (activeSession.email) headers.set('user-email', activeSession.email)
  if (activeSession.token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${activeSession.token}`)

  const requestUrl = `${API_BASE_URL}${path}`
  let response
  const startedAt = Date.now()
  try {
    response = await fetch(requestUrl, { ...options, headers })
  } catch (error) {
    throw new Error(`Request to ${requestUrl} could not be completed: ${error.message}`, { cause: error })
  }
  responseMetrics.count += 1
  responseMetrics.totalMs += Math.max(0, Date.now() - startedAt)
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message
    const error = new Error(message || 'Backend request failed.')
    error.status = response.status
    if (typeof payload?.code === 'string') { error.code = payload.code; error.reason = typeof payload.reason === 'string' ? payload.reason : '' }
    // A signed-in session the server rejects because the account was suspended ends here, for every caller.
    if (response.status === 403 && activeSession.token && suspendedKind(error)) announceSuspension(error)
    throw error
  }
  return payload?.data ?? null
}

// `token` lets a just-registered account upload before its session is stored.
export async function uploadRequest(path, file, { token } = {}) {
  const body = new FormData()
  body.append('file', file)
  return apiRequest(path, { method: 'POST', body, ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}) })
}

// Authenticated binary download (document previews). Returns the Blob; failures carry the HTTP status and
// the server's JSON message like apiRequest.
export async function blobRequest(path) {
  const activeSession = session()
  const headers = new Headers()
  if (activeSession.token) headers.set('Authorization', `Bearer ${activeSession.token}`)
  const requestUrl = `${API_BASE_URL}${path}`
  let response
  try {
    response = await fetch(requestUrl, { headers })
  } catch (error) {
    throw new Error(`Request to ${requestUrl} could not be completed: ${error.message}`, { cause: error })
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message = Array.isArray(payload?.message) ? payload.message.join(' ') : payload?.message
    const error = new Error(message || 'Backend request failed.')
    error.status = response.status
    throw error
  }
  return response.blob()
}

export { API_BASE_URL, backendRole }
