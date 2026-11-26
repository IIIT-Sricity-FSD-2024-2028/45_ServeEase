import { createSlice } from '@reduxjs/toolkit'

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, role: null, suspension: null },
  reducers: {
    setAuthSession(state, action) {
      // The token is never stored in Redux; apiClient reads it from sessionStorage.
      const user = { ...action.payload }
      delete user.token
      delete user.password
      state.user = user
      state.role = user.role ?? null
    },
    clearAuthSession(state) {
      state.user = null
      state.role = null
    },
    setAuthSuspension(state, action) {
      state.suspension = action.payload
    },
  },
})

export const { setAuthSession, clearAuthSession, setAuthSuspension } = authSlice.actions

export default authSlice.reducer
