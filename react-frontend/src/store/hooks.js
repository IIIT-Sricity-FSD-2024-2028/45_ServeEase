import { useCallback, useEffect } from 'react'
import { shallowEqual, useDispatch, useSelector } from 'react-redux'
import { selectAdminResource } from './slices/adminSlice.js'

export const useAppDispatch = useDispatch
export const useAppSelector = useSelector

// Dispatches an admin fetch thunk and returns what the store holds for it. Pass null to skip.
export function useAdminResource(thunk, arg) {
  const dispatch = useAppDispatch()
  const skip = arg === null
  const key = JSON.stringify(arg ?? null)
  const view = useAppSelector((state) => selectAdminResource(state, thunk.resource, JSON.parse(key)), shallowEqual)
  const reload = useCallback(() => (skip ? undefined : dispatch(thunk(JSON.parse(key)))), [dispatch, thunk, key, skip])
  useEffect(() => { reload() }, [reload])
  return skip ? { data: null, isLoading: false, error: '', reload } : { ...view, reload }
}
