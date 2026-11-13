import { configureStore } from '@reduxjs/toolkit'
import availabilityReducer from './availability/availabilitySlice.js'
import bookingsReducer from './bookings/bookingsSlice.js'
import catalogReducer from './catalog/catalogSlice.js'
import operationsReducer from './operations/operationsSlice.js'
import ticketsReducer from './tickets/ticketsSlice.js'

// Shared client-state infrastructure. Feature migrations add thunks and reducers to their
// own slice without changing authentication, routing, or the existing API client.
export const store = configureStore({
  reducer: {
    catalog: catalogReducer,
    bookings: bookingsReducer,
    tickets: ticketsReducer,
    availability: availabilityReducer,
    operations: operationsReducer,
  },
})
