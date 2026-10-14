import { useCallback, useEffect, useState } from 'react'
import { catalogApi } from '../../services/api'
import { normalizeCatalog } from './catalogModel'

// Loads GET /api/catalog. `reload` retries after a failure.
export function useCatalog() {
  const [attempt, setAttempt] = useState(0)
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  useEffect(() => {
    let live = true
    catalogApi.getCatalog()
      .then((data) => live && setState({ loading: false, data: normalizeCatalog(data), error: '' }))
      .catch((error) => live && setState({ loading: false, data: null, error: error.message }))
    return () => { live = false }
  }, [attempt])
  const reload = useCallback(() => { setState({ loading: true, data: null, error: '' }); setAttempt((value) => value + 1) }, [])
  return { ...state, reload }
}
