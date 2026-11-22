import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'

// Employee server data and request state live in operations Redux; this hook only
// coordinates a fetch and exposes its selectors to the existing page UI.
export function useOperationsData(thunk, arg, dataSelector, statusSelector, errorSelector) {
  const dispatch = useAppDispatch()
  const data = useAppSelector(dataSelector)
  const status = useAppSelector(statusSelector)
  const error = useAppSelector(errorSelector)

  const retry = useCallback(() => dispatch(thunk(arg)), [arg, dispatch, thunk])
  useEffect(() => {
    retry()
  }, [retry])

  return {
    data,
    state: status === 'succeeded' ? 'ready' : status === 'failed' ? 'error' : 'loading',
    error: typeof error === 'string' ? error : error?.message || '',
    retry,
  }
}
