// City selection shared by the public pages (mirrors front-end/JavaScript/location.js).
export const defaultCities = [
  { id: 1, name: 'Chennai' },
  { id: 2, name: 'Bangalore' },
  { id: 3, name: 'Hyderabad' },
  { id: 4, name: 'Delhi' },
  { id: 5, name: 'Mumbai' },
]

export function locationStorageKey(user) {
  if (user?.userId && !['user@serveease.com', 'provider@serveease.com'].includes(user.email)) {
    return `serveEaseSelectedCity:${user.role}:${user.userId}`
  }
  return 'serveEaseSelectedCity'
}

export function getCities() {
  try {
    const custom = JSON.parse(localStorage.getItem('serveEaseCustomCities') || '[]')
    const cities = [...defaultCities, ...(Array.isArray(custom) ? custom : [])]
    const known = new Set()
    return cities.filter((city) => {
      if (!city?.id || !city?.name) return false
      const key = String(city.name).toLowerCase()
      if (known.has(key)) return false
      known.add(key)
      return true
    })
  } catch {
    return defaultCities
  }
}

export function getInitialCity(user, cities) {
  try {
    const stored = JSON.parse(localStorage.getItem(locationStorageKey(user)) || 'null')
    return cities.find((city) => Number(city.id) === Number(stored?.id)) || cities[0]
  } catch {
    return cities[0]
  }
}

export function saveCity(user, city) {
  try {
    localStorage.setItem(locationStorageKey(user), JSON.stringify(city))
  } catch {
    // Storage can be unavailable (private mode); the URL still carries the city.
  }
}
