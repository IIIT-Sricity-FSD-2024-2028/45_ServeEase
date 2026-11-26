import { combineReducers, configureStore } from '@reduxjs/toolkit'
import authReducer, { clearAuthSession } from './slices/authSlice.js'
import catalogReducer from './slices/catalogSlice.js'
import bookingsReducer from './slices/bookingsSlice.js'
import ticketsReducer from './slices/ticketsSlice.js'
import availabilityReducer from './slices/availabilitySlice.js'
import employeeOperationsReducer from './slices/employeeOperationsSlice.js'
import adminReducer from './slices/adminSlice.js'
import notificationReducer from './slices/notificationSlice.js'
import reviewsReducer from './slices/reviewsSlice.js'

const appReducer = combineReducers({
  auth: authReducer,
  catalog: catalogReducer,
  bookings: bookingsReducer,
  tickets: ticketsReducer,
  availability: availabilityReducer,
  operations: employeeOperationsReducer,
  admin: adminReducer,
  notification: notificationReducer,
  reviews: reviewsReducer,
})

// On logout every user-specific slice is reset; the public catalog is kept.
function rootReducer(state, action) {
  const loggedOut = clearAuthSession.match(action) && state?.auth.user
  return appReducer(loggedOut ? { auth: state.auth, catalog: state.catalog } : state, action)
}

export const store = configureStore({ reducer: rootReducer })
