import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { employeeOperationsApi } from '../../services/api.js'
import { mergePartialRecord, nonEmptyKey, replaceFullRecord } from './entityReconciliation.js'

function createEmployeeFetchThunk(name, request) {
  return createAsyncThunk(`operations/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await request(arg)
    } catch (error) {
      return rejectWithValue(error?.message || 'The employee workspace could not be loaded.')
    }
  })
}

function createEmployeeMutationThunk(name, request) {
  return createAsyncThunk(`operations/${name}`, async (arg, { rejectWithValue }) => {
    try {
      return await request(arg)
    } catch (error) {
      return rejectWithValue(error?.message || 'The employee operation could not be completed.')
    }
  })
}

export const fetchEmployeeCustomers = createEmployeeFetchThunk('fetchEmployeeCustomers', () => employeeOperationsApi.customers())
export const fetchEmployeeCustomerById = createEmployeeFetchThunk('fetchEmployeeCustomerById', (customerId) => employeeOperationsApi.customer(customerId))
export const fetchEmployeeCustomerNotifications = createEmployeeFetchThunk('fetchEmployeeCustomerNotifications', () => employeeOperationsApi.customerNotifications())
export const fetchEmployeeProviders = createEmployeeFetchThunk('fetchEmployeeProviders', () => employeeOperationsApi.providers())
export const fetchEmployeeProviderById = createEmployeeFetchThunk('fetchEmployeeProviderById', ({ providerId, listing }) => employeeOperationsApi.provider(providerId, listing))
export const fetchEmployeeProviderNotifications = createEmployeeFetchThunk('fetchEmployeeProviderNotifications', () => employeeOperationsApi.providerNotifications())

export const setEmployeeCustomerStatus = createEmployeeMutationThunk(
  'setEmployeeCustomerStatus',
  ({ customerId, change }) => employeeOperationsApi.setCustomerStatus(customerId, change),
)
export const setEmployeeProviderStatus = createEmployeeMutationThunk(
  'setEmployeeProviderStatus',
  ({ providerId, listing, change }) => employeeOperationsApi.setProviderStatus(providerId, listing, change),
)
export const decideEmployeeProviderVerification = createEmployeeMutationThunk(
  'decideEmployeeProviderVerification',
  ({ providerId, listing, decision }) => employeeOperationsApi.decideProviderVerification(providerId, listing, decision),
)

const employeeMutationConfig = {
  [setEmployeeCustomerStatus.pending.type]: {
    operation: 'setCustomerStatusById',
    key: (action) => String(action.meta.arg.customerId),
  },
  [setEmployeeCustomerStatus.fulfilled.type]: {
    operation: 'setCustomerStatusById',
    key: (action) => String(action.meta.arg.customerId),
    reconcile(state, action) {
      const { customerId } = action.meta.arg
      const response = action.payload
      const existingDetail = state.employee.customerDetailsById[customerId]
      if (existingDetail && response?.customer) {
        state.employee.customerDetailsById[customerId] = {
          ...existingDetail,
          customer: mergePartialRecord(existingDetail.customer, response.customer),
        }
      }
      const customers = state.employee.customerList?.customers
      if (Array.isArray(customers) && response?.customer) {
        state.employee.customerList.customers = customers.map((record) => String(record.id) === String(customerId)
          ? mergePartialRecord(record, response.customer)
          : record)
      }
    },
  },
  [setEmployeeCustomerStatus.rejected.type]: {
    operation: 'setCustomerStatusById',
    key: (action) => String(action.meta.arg.customerId),
  },
  [setEmployeeProviderStatus.pending.type]: {
    operation: 'setProviderStatusByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
  },
  [setEmployeeProviderStatus.fulfilled.type]: {
    operation: 'setProviderStatusByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
    reconcile(state, action) {
      reconcileProviderMutation(state.employee, action)
    },
  },
  [setEmployeeProviderStatus.rejected.type]: {
    operation: 'setProviderStatusByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
  },
  [decideEmployeeProviderVerification.pending.type]: {
    operation: 'decideProviderVerificationByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
  },
  [decideEmployeeProviderVerification.fulfilled.type]: {
    operation: 'decideProviderVerificationByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
    reconcile(state, action) {
      reconcileProviderMutation(state.employee, action)
    },
  },
  [decideEmployeeProviderVerification.rejected.type]: {
    operation: 'decideProviderVerificationByKey',
    key: (action) => providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing),
  },
}

function reconcileProviderMutation(employee, action) {
  const { providerId, listing } = action.meta.arg
  const key = providerOperationEntityKey(providerId, listing)
  const response = action.payload
  if (response?.provider) {
    const detail = { ...response }
    delete detail.changed
    employee.providerDetailsByKey[key] = replaceFullRecord(detail)
    const providers = employee.providerList?.providers
    if (Array.isArray(providers)) {
      employee.providerList.providers = providers.map((record) => {
        const recordKey = providerOperationEntityKey(record.id, record.sharedId ? record.providerCatalogId : undefined)
        return recordKey === key ? mergePartialRecord(record, response.provider) : record
      })
    }
  }
}

const employeeFetchTargets = {
  [fetchEmployeeCustomers.pending.type]: (employee) => [employee, 'customerList', null],
  [fetchEmployeeCustomers.fulfilled.type]: (employee) => [employee, 'customerList', null],
  [fetchEmployeeCustomers.rejected.type]: (employee) => [employee, 'customerList', null],
  [fetchEmployeeCustomerById.pending.type]: (employee, action) => [employee, 'customerDetailsById', String(action.meta.arg)],
  [fetchEmployeeCustomerById.fulfilled.type]: (employee, action) => [employee, 'customerDetailsById', String(action.meta.arg)],
  [fetchEmployeeCustomerById.rejected.type]: (employee, action) => [employee, 'customerDetailsById', String(action.meta.arg)],
  [fetchEmployeeCustomerNotifications.pending.type]: (employee) => [employee, 'customerNotifications', null],
  [fetchEmployeeCustomerNotifications.fulfilled.type]: (employee) => [employee, 'customerNotifications', null],
  [fetchEmployeeCustomerNotifications.rejected.type]: (employee) => [employee, 'customerNotifications', null],
  [fetchEmployeeProviders.pending.type]: (employee) => [employee, 'providerList', null],
  [fetchEmployeeProviders.fulfilled.type]: (employee) => [employee, 'providerList', null],
  [fetchEmployeeProviders.rejected.type]: (employee) => [employee, 'providerList', null],
  [fetchEmployeeProviderById.pending.type]: (employee, action) => [employee, 'providerDetailsByKey', providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing)],
  [fetchEmployeeProviderById.fulfilled.type]: (employee, action) => [employee, 'providerDetailsByKey', providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing)],
  [fetchEmployeeProviderById.rejected.type]: (employee, action) => [employee, 'providerDetailsByKey', providerOperationEntityKey(action.meta.arg.providerId, action.meta.arg.listing)],
  [fetchEmployeeProviderNotifications.pending.type]: (employee) => [employee, 'providerNotifications', null],
  [fetchEmployeeProviderNotifications.fulfilled.type]: (employee) => [employee, 'providerNotifications', null],
  [fetchEmployeeProviderNotifications.rejected.type]: (employee) => [employee, 'providerNotifications', null],
}

const employeeFetchThunks = [
  fetchEmployeeCustomers,
  fetchEmployeeCustomerById,
  fetchEmployeeCustomerNotifications,
  fetchEmployeeProviders,
  fetchEmployeeProviderById,
  fetchEmployeeProviderNotifications,
]

export function providerOperationEntityKey(providerId, listing) {
  const accountKey = nonEmptyKey(providerId)
  const listingKey = nonEmptyKey(listing)
  if (!accountKey) return null
  return listingKey ? JSON.stringify([accountKey, listingKey]) : accountKey
}

export const initialOperationsState = {
  employee: {
    customerList: null,
    customerDetailsById: {},
    providerList: null,
    providerDetailsByKey: {},
    customerNotifications: null,
    providerNotifications: null,
    fetchStatus: {
      customerList: 'idle',
      customerDetailsById: {},
      providerList: 'idle',
      providerDetailsByKey: {},
      customerNotifications: 'idle',
      providerNotifications: 'idle',
    },
    fetchError: {
      customerList: null,
      customerDetailsById: {},
      providerList: null,
      providerDetailsByKey: {},
      customerNotifications: null,
      providerNotifications: null,
    },
    mutationStatus: {
      setCustomerStatusById: {},
      setProviderStatusByKey: {},
      decideProviderVerificationByKey: {},
    },
    mutationError: {
      setCustomerStatusById: {},
      setProviderStatusByKey: {},
      decideProviderVerificationByKey: {},
    },
    _activeFetchRequestId: {
      customerDetailsById: {},
      providerDetailsByKey: {},
    },
    _activeMutationRequestId: {
      setCustomerStatusById: {},
      setProviderStatusByKey: {},
      decideProviderVerificationByKey: {},
    },
  },
}

const operationsSlice = createSlice({
  name: 'operations',
  initialState: initialOperationsState,
  reducers: {
    clearEmployeeMutationState(state, action) {
      const { operation, key } = action.payload || {}
      if (!operation || key === undefined || state.employee.mutationStatus[operation]?.[key] === 'loading') return
      if (state.employee.mutationStatus[operation]) state.employee.mutationStatus[operation][key] = 'idle'
      if (state.employee.mutationError[operation]) state.employee.mutationError[operation][key] = null
    },
  },
  extraReducers: (builder) => {
    employeeFetchThunks.forEach((thunk) => {
      builder.addCase(thunk.pending, (state, action) => {
        const [employee, resource, key] = employeeFetchTargets[action.type](state.employee, action)
        if (key === null) {
          employee.fetchStatus[resource] = 'loading'
          employee.fetchError[resource] = null
          employee._activeFetchRequestId[resource] = action.meta.requestId
        } else {
          employee.fetchStatus[resource][key] = 'loading'
          employee.fetchError[resource][key] = null
          employee._activeFetchRequestId[resource][key] = action.meta.requestId
        }
      })
      builder.addCase(thunk.fulfilled, (state, action) => {
        const [employee, resource, key] = employeeFetchTargets[action.type](state.employee, action)
        const activeId = key === null ? employee._activeFetchRequestId[resource] : employee._activeFetchRequestId[resource][key]
        if (activeId !== action.meta.requestId) return
        if (key === null) {
          employee[resource] = action.payload
          employee.fetchStatus[resource] = 'succeeded'
          employee.fetchError[resource] = null
          delete employee._activeFetchRequestId[resource]
        } else {
          employee[resource][key] = action.payload
          employee.fetchStatus[resource][key] = 'succeeded'
          employee.fetchError[resource][key] = null
          delete employee._activeFetchRequestId[resource][key]
        }
      })
      builder.addCase(thunk.rejected, (state, action) => {
        const [employee, resource, key] = employeeFetchTargets[action.type](state.employee, action)
        const activeId = key === null ? employee._activeFetchRequestId[resource] : employee._activeFetchRequestId[resource][key]
        if (activeId !== action.meta.requestId) return
        const message = action.payload || action.error.message || 'The employee workspace could not be loaded.'
        if (key === null) {
          employee.fetchStatus[resource] = 'failed'
          employee.fetchError[resource] = message
          delete employee._activeFetchRequestId[resource]
        } else {
          employee.fetchStatus[resource][key] = 'failed'
          employee.fetchError[resource][key] = message
          delete employee._activeFetchRequestId[resource][key]
        }
      })
    })
    Object.entries(employeeMutationConfig).forEach(([type, config]) => {
      builder.addCase(type, (state, action) => {
        const { operation } = config
        const key = config.key(action)
        const activeRequests = state.employee._activeMutationRequestId[operation]
        const statuses = state.employee.mutationStatus[operation]
        const errors = state.employee.mutationError[operation]
        if (type.endsWith('/pending')) {
          statuses[key] = 'loading'
          errors[key] = null
          activeRequests[key] = action.meta.requestId
          return
        }
        if (activeRequests[key] !== action.meta.requestId) return
        if (type.endsWith('/fulfilled')) {
          statuses[key] = 'succeeded'
          errors[key] = null
          delete activeRequests[key]
          config.reconcile?.(state, action)
          return
        }
        statuses[key] = 'failed'
        errors[key] = action.payload || action.error.message || 'The employee operation could not be completed.'
        delete activeRequests[key]
      })
    })
  },
})

export const { clearEmployeeMutationState } = operationsSlice.actions

export const selectOperationsState = (state) => state.operations
export const selectEmployeeOperations = (state) => state.operations.employee
export const selectEmployeeCustomerList = (state) => state.operations.employee.customerList
export const selectEmployeeCustomerListFetchStatus = (state) => state.operations.employee.fetchStatus.customerList
export const selectEmployeeCustomerListFetchError = (state) => state.operations.employee.fetchError.customerList
export const selectEmployeeCustomerNotifications = (state) => state.operations.employee.customerNotifications
export const selectEmployeeCustomerNotificationsFetchStatus = (state) => state.operations.employee.fetchStatus.customerNotifications
export const selectEmployeeCustomerNotificationsFetchError = (state) => state.operations.employee.fetchError.customerNotifications
export const selectEmployeeProviderList = (state) => state.operations.employee.providerList
export const selectEmployeeProviderListFetchStatus = (state) => state.operations.employee.fetchStatus.providerList
export const selectEmployeeProviderListFetchError = (state) => state.operations.employee.fetchError.providerList
export const selectEmployeeProviderNotifications = (state) => state.operations.employee.providerNotifications
export const selectEmployeeProviderNotificationsFetchStatus = (state) => state.operations.employee.fetchStatus.providerNotifications
export const selectEmployeeProviderNotificationsFetchError = (state) => state.operations.employee.fetchError.providerNotifications
export const selectEmployeeCustomerDetail = (customerId) => (state) => state.operations.employee.customerDetailsById[customerId] ?? null
export const selectEmployeeProviderDetail = (providerId, listing) => (state) => state.operations.employee.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] ?? null
export const selectEmployeeCustomerDetailFetchStatus = (customerId) => (state) => state.operations.employee.fetchStatus.customerDetailsById[customerId] || 'idle'
export const selectEmployeeCustomerDetailFetchError = (customerId) => (state) => state.operations.employee.fetchError.customerDetailsById[customerId] || null
export const selectEmployeeProviderDetailFetchStatus = (providerId, listing) => (state) => state.operations.employee.fetchStatus.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || 'idle'
export const selectEmployeeProviderDetailFetchError = (providerId, listing) => (state) => state.operations.employee.fetchError.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || null
export const selectEmployeeMutationStatus = (operation, key) => (state) => state.operations.employee.mutationStatus[operation]?.[key] || 'idle'
export const selectEmployeeMutationError = (operation, key) => (state) => state.operations.employee.mutationError[operation]?.[key] || null

export default operationsSlice.reducer
