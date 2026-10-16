import { useCallback, useEffect, useState } from 'react'

// Loads one API resource with retry; `request` must be stable (memoised by the caller). `update` replaces the
// loaded data with a server-confirmed change.
export function useOperationsData(request) {
  const [result, setResult] = useState({ state: 'loading', data: null, error: '' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    request()
      .then((data) => { if (active) setResult({ state: 'ready', data, error: '' }) })
      .catch((error) => { if (active) setResult({ state: 'error', data: null, error: error.message || 'The workspace could not be loaded.' }) })
    return () => { active = false }
  }, [attempt, request])

  const retry = useCallback(() => {
    setResult((current) => ({ ...current, state: 'loading', error: '' }))
    setAttempt((count) => count + 1)
  }, [])

  const update = useCallback((change) => {
    setResult((current) => ({ ...current, data: change(current.data) }))
  }, [])

  return { ...result, retry, update }
}
