import { useMemo } from 'react'
import { useAuth } from '../../context/useAuth'
import { getCities, getInitialCity, saveCity } from '../home/cityState'

// Selected city: the `city` URL param wins (so refresh/back keep it), then the stored selection.
export function useJourneyCity(params, setParams) {
  const { currentUser } = useAuth()
  const cities = useMemo(() => getCities(), [])
  const fromUrl = cities.find((item) => Number(item.id) === Number(params.get('city')))
  const city = fromUrl || getInitialCity(currentUser, cities)
  function changeCity(cityId) {
    const next = cities.find((item) => Number(item.id) === Number(cityId)) || cities[0]
    saveCity(currentUser, next)
    setParams((previous) => {
      const updated = new URLSearchParams(previous)
      updated.set('city', String(next.id))
      return updated
    })
  }
  return { city, cities, changeCity }
}
