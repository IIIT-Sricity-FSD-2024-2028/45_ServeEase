const KEY = 'serveEaseCustomerJourney'
export function readJourney() { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null') } catch { return null } }
export function saveJourney(value) { sessionStorage.setItem(KEY, JSON.stringify(value)) }
export function clearJourney() { sessionStorage.removeItem(KEY) }
