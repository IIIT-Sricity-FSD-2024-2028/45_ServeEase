import { createAsyncThunk, createSelector, createSlice, isAnyOf } from '@reduxjs/toolkit'
import * as adminApi from '../../features/admin/adminApi.js'

const loaders = []
function loader(name, request) {
  const thunk = createAsyncThunk(`admin/${name}`, (arg) => request(arg))
  thunk.resource = name
  loaders.push(thunk)
  return thunk
}

export const fetchAdminBookings = loader('bookings', () => adminApi.listBookings())
export const fetchCustomerAccounts = loader('customerAccounts', () => adminApi.listCustomerAccounts())
export const fetchProviderAccounts = loader('providerAccounts', () => adminApi.listProviderAccounts())
export const fetchVerificationRequests = loader('verificationRequests', () => adminApi.listVerificationRequests())
export const fetchAdminTickets = loader('tickets', () => adminApi.listAdminTickets())
export const fetchEmployeeModuleData = loader('employeeModule', () => adminApi.getEmployeeModuleData())

export const fetchAdminBookingById = loader('bookingDetail', (id) => adminApi.getBooking(id))
export const fetchCustomerAccountById = loader('customerDetail', (id) => adminApi.getCustomerAccount(id))
export const fetchProviderAccountById = loader('providerDetail', ({ providerId, listing }) => adminApi.getProviderAccount(providerId, listing))
export const fetchVerificationRequestById = loader('verificationDetail', (id) => adminApi.getVerificationRequest(id))
export const fetchAdminTicketById = loader('ticketDetail', (id) => adminApi.getAdminTicket(id))

// Each action saves to the server, then reloads the data it changed.
function action(name, request, reloads) {
  return createAsyncThunk(`admin/${name}`, async (arg, { dispatch }) => {
    await request(arg)
    await Promise.all(reloads(arg).map((thunk) => dispatch(thunk)))
  })
}

const verificationReloads = ({ providerId }) => [fetchVerificationRequests(), fetchVerificationRequestById(providerId)]
const providerReloads = ({ providerId, listing }) => [fetchProviderAccounts(), fetchProviderAccountById({ providerId, listing })]
const ticketReloads = ({ ticketId }) => [fetchAdminTickets(), fetchAdminTicketById(ticketId)]

export const approveProvider = action('approveProvider',
  ({ providerId, adminRemarks }) => adminApi.approveProvider(providerId, adminRemarks), verificationReloads)
export const rejectProvider = action('rejectProvider',
  ({ providerId, rejectionReason, adminRemarks }) => adminApi.rejectProvider(providerId, { rejectionReason, adminRemarks }), verificationReloads)
export const approveProviderDocument = action('approveProviderDocument',
  ({ providerId, documentId }) => adminApi.approveProviderDocument(providerId, documentId), verificationReloads)
export const rejectProviderDocument = action('rejectProviderDocument',
  ({ providerId, documentId, rejectionReason }) => adminApi.rejectProviderDocument(providerId, documentId, rejectionReason), verificationReloads)

export const updateCustomerAccountStatus = action('updateCustomerAccountStatus',
  ({ customerId, ...change }) => adminApi.updateCustomerAccountStatus(customerId, change),
  ({ customerId }) => [fetchCustomerAccounts(), fetchCustomerAccountById(customerId)])
export const updateProviderAccountStatus = action('updateProviderAccountStatus',
  ({ providerId, ...change }) => adminApi.updateProviderAccountStatus(providerId, change), providerReloads)
export const decideProviderAccountVerification = action('decideProviderAccountVerification',
  ({ providerId, ...decision }) => adminApi.decideProviderAccountVerification(providerId, decision), providerReloads)

export const updateAdminTicketStatus = action('updateAdminTicketStatus',
  ({ ticketId, status }) => adminApi.updateAdminTicketStatus(ticketId, status), ticketReloads)
export const escalateAdminTicket = action('escalateAdminTicket',
  ({ ticketId, remarks }) => adminApi.escalateAdminTicket(ticketId, remarks), ticketReloads)
export const resolveAdminTicket = action('resolveAdminTicket',
  ({ ticketId, solution }) => adminApi.resolveAdminTicket(ticketId, solution), ticketReloads)
export const submitAdminTicketDecision = action('submitAdminTicketDecision',
  ({ ticketId, finalDecision, adminRemarks }) => adminApi.submitAdminTicketDecision(ticketId, finalDecision, adminRemarks), ticketReloads)

export const saveEmployeeModuleData = action('saveEmployeeModuleData',
  ({ value, exists }) => adminApi.saveEmployeeModuleData(value, exists), () => [fetchEmployeeModuleData()])

const resourceKey = (arg) => JSON.stringify(arg ?? null)
const emptyResource = { data: null, status: 'idle', error: null, key: null, requestId: null }
const initialState = Object.fromEntries(loaders.map((thunk) => [thunk.resource, emptyResource]))
const resourceOf = (state, action) => state[action.type.split('/')[1]]

const adminSlice = createSlice({
  name: 'admin',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addMatcher(isAnyOf(...loaders.map((thunk) => thunk.pending)), (state, action) => {
        const resource = resourceOf(state, action)
        resource.status = 'loading'
        resource.error = null
        resource.key = resourceKey(action.meta.arg)
        resource.requestId = action.meta.requestId
      })
      .addMatcher(isAnyOf(...loaders.map((thunk) => thunk.fulfilled)), (state, action) => {
        const resource = resourceOf(state, action)
        if (resource.requestId !== action.meta.requestId) return
        resource.status = 'succeeded'
        resource.data = action.payload
      })
      .addMatcher(isAnyOf(...loaders.map((thunk) => thunk.rejected)), (state, action) => {
        const resource = resourceOf(state, action)
        if (resource.requestId !== action.meta.requestId) return
        resource.status = 'failed'
        resource.error = action.error.message || 'Unable to load admin data.'
      })
  },
})

export function selectAdminResource(state, name, arg) {
  const { data, status, error, key } = state.admin[name]
  const current = key === resourceKey(arg)
  const loaded = current && status === 'succeeded'
  const failed = current && status === 'failed'
  return { data: loaded ? data : null, isLoading: !loaded && !failed, error: failed ? error : '' }
}

const loadedData = (name) => (state) => (state.admin[name].status === 'succeeded' ? state.admin[name].data : null)

export const selectAdminBookingRows = createSelector(
  [loadedData('bookings')],
  (bookings) => (Array.isArray(bookings) ? bookings : []),
)

const accountTotal = (data, field) => (data ? data.totals?.[field] ?? data[field]?.length ?? 0 : null)

export const selectAdminStats = createSelector(
  [selectAdminBookingRows, loadedData('bookings'), loadedData('customerAccounts'), loadedData('providerAccounts')],
  (rows, bookings, customers, providers) => ({
    totalBookings: bookings ? rows.length : null,
    totalCustomers: accountTotal(customers, 'customers'),
    totalProviders: accountTotal(providers, 'providers'),
  }),
)

export const selectPendingVerificationCount = createSelector(
  [loadedData('verificationRequests')],
  (requests) => (requests ? requests.filter((request) => String(request.status || '').toLowerCase() === 'pending').length : null),
)

export const selectAdminBookingStatusCounts = createSelector([selectAdminBookingRows], (rows) => {
  const counts = new Map()
  rows.forEach(({ status }) => {
    if (String(status ?? '').trim()) counts.set(String(status), (counts.get(String(status)) || 0) + 1)
  })
  return [...counts].sort(([left], [right]) => left.localeCompare(right))
})

export const selectAdminRevenue = createSelector([selectAdminBookingRows], (rows) => {
  const amounts = rows.map((booking) => booking.platformRevenueAmount)
    .filter((amount) => amount !== null && amount !== undefined && amount !== '' && Number.isFinite(Number(amount)))
  return { total: amounts.reduce((sum, amount) => sum + Number(amount), 0), hasRevenue: amounts.length > 0 }
})

export default adminSlice.reducer
