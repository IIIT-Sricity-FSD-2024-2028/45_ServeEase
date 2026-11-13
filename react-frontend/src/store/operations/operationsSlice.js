import { createSlice } from '@reduxjs/toolkit'
import { nonEmptyKey } from '../entityReconciliation.js'

// Employee and superuser/admin resources remain separated because their endpoints, access
// rules, and page workflows differ. Booking and ticket data intentionally belong to their
// dedicated slices, including when rendered on an admin page.
export function providerOperationEntityKey(providerId, listing) {
  const accountKey = nonEmptyKey(providerId)
  const listingKey = nonEmptyKey(listing)
  if (!accountKey) return null
  // Employee provider endpoints use the listing query only for shared account ids, so this
  // composite key prevents those detail responses from overwriting one another.
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
  },
  admin: {
    customerAccounts: null,
    customerDetailsById: {},
    providerAccounts: null,
    providerDetailsByKey: {},
    verificationRequests: null,
    verificationDetailsById: {},
    activities: null,
    superuserModuleData: null,
    employeeModuleData: null,
    fetchStatus: {
      customerAccounts: 'idle',
      customerDetailsById: {},
      providerAccounts: 'idle',
      providerDetailsByKey: {},
      verificationRequests: 'idle',
      verificationDetailsById: {},
      activities: 'idle',
      superuserModuleData: 'idle',
      employeeModuleData: 'idle',
    },
    fetchError: {
      customerAccounts: null,
      customerDetailsById: {},
      providerAccounts: null,
      providerDetailsByKey: {},
      verificationRequests: null,
      verificationDetailsById: {},
      activities: null,
      superuserModuleData: null,
      employeeModuleData: null,
    },
    mutationStatus: {
      updateCustomerAccountStatusById: {},
      updateProviderAccountStatusByKey: {},
      decideProviderAccountVerificationByKey: {},
      approveProviderById: {},
      rejectProviderById: {},
      suspendProviderById: {},
      approveProviderDocumentByKey: {},
      rejectProviderDocumentByKey: {},
      saveSuperuserModuleData: 'idle',
      saveEmployeeModuleData: 'idle',
    },
    mutationError: {
      updateCustomerAccountStatusById: {},
      updateProviderAccountStatusByKey: {},
      decideProviderAccountVerificationByKey: {},
      approveProviderById: {},
      rejectProviderById: {},
      suspendProviderById: {},
      approveProviderDocumentByKey: {},
      rejectProviderDocumentByKey: {},
      saveSuperuserModuleData: null,
      saveEmployeeModuleData: null,
    },
  },
}

const operationsSlice = createSlice({
  name: 'operations',
  initialState: initialOperationsState,
  reducers: {},
})

export const selectOperationsState = (state) => state.operations
export const selectEmployeeOperations = (state) => state.operations.employee
export const selectAdminOperations = (state) => state.operations.admin
export const selectEmployeeCustomerDetailFetchStatus = (customerId) => (state) => state.operations.employee.fetchStatus.customerDetailsById[customerId] || 'idle'
export const selectEmployeeCustomerDetailFetchError = (customerId) => (state) => state.operations.employee.fetchError.customerDetailsById[customerId] || null
export const selectEmployeeProviderDetailFetchStatus = (providerId, listing) => (state) => state.operations.employee.fetchStatus.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || 'idle'
export const selectEmployeeProviderDetailFetchError = (providerId, listing) => (state) => state.operations.employee.fetchError.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || null
export const selectAdminCustomerDetailFetchStatus = (customerId) => (state) => state.operations.admin.fetchStatus.customerDetailsById[customerId] || 'idle'
export const selectAdminCustomerDetailFetchError = (customerId) => (state) => state.operations.admin.fetchError.customerDetailsById[customerId] || null
export const selectAdminProviderDetailFetchStatus = (providerId, listing) => (state) => state.operations.admin.fetchStatus.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || 'idle'
export const selectAdminProviderDetailFetchError = (providerId, listing) => (state) => state.operations.admin.fetchError.providerDetailsByKey[providerOperationEntityKey(providerId, listing)] || null
export const selectAdminVerificationDetailFetchStatus = (providerId) => (state) => state.operations.admin.fetchStatus.verificationDetailsById[providerId] || 'idle'
export const selectAdminVerificationDetailFetchError = (providerId) => (state) => state.operations.admin.fetchError.verificationDetailsById[providerId] || null
export const selectEmployeeMutationStatus = (operation, key) => (state) => state.operations.employee.mutationStatus[operation]?.[key] || 'idle'
export const selectEmployeeMutationError = (operation, key) => (state) => state.operations.employee.mutationError[operation]?.[key] || null
export const selectAdminMutationStatus = (operation, key) => (state) => {
  const value = state.operations.admin.mutationStatus[operation]
  return key === undefined ? value : value?.[key] || 'idle'
}
export const selectAdminMutationError = (operation, key) => (state) => {
  const value = state.operations.admin.mutationError[operation]
  return key === undefined ? value : value?.[key] || null
}

export default operationsSlice.reducer
