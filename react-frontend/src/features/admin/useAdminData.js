import { useCallback, useEffect, useState } from 'react'
import { getSuperuserModuleData, saveSuperuserModuleData } from './adminApi'

export function show(value) {
  if (value === null || value === undefined) return 'Not available'
  if (typeof value === 'string' && value.trim() === '') return 'Not available'
  return value
}

export function money(value) {
  if (value === null || value === undefined || value === '' || !Number.isFinite(Number(value))) return 'Not available'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(value))
}

export function useAdminData(apiFunction) {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await apiFunction()
      setData(result)
      return result
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load admin data.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [apiFunction])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) reload()
    })
    return () => { active = false }
  }, [reload])

  return { data, isLoading, error, reload }
}

export function useSuperuserModuleData() {
  const [data, setData] = useState({})
  const [exists, setExists] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await getSuperuserModuleData()
      setData(result.value)
      setExists(result.exists)
      return result.value
    } catch (requestError) {
      setError(requestError?.message || 'Unable to load superuser dashboard state.')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const save = useCallback(async (nextData) => {
    const entry = await saveSuperuserModuleData(nextData, exists)
    setData(entry?.value && typeof entry.value === 'object' ? entry.value : nextData)
    setExists(true)
    setError('')
    return entry
  }, [exists])

  useEffect(() => { Promise.resolve().then(reload) }, [reload])

  return { data, exists, isLoading, error, reload, save }
}
