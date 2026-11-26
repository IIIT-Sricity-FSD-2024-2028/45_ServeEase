import { createAsyncThunk, createSelector, createSlice } from '@reduxjs/toolkit'
import { bookingsApi } from '../../services/api.js'
import * as superuser from '../../features/admin/superuserNotifications.js'
import { buildCustomerNotifications, readCustomerNotificationIds, saveCustomerNotificationIds } from '../../features/customer/customerNotifications.js'
import { buildProviderNotifications, readProviderNotificationIds, saveProviderNotificationIds } from '../../features/provider/providerNotifications.js'
import { buildSupportNotifications, readSupportNotificationIds, saveSupportNotificationIds } from '../../features/support/supportNotifications.js'
import { buildEmployeeNotifications, readEmployeeNotificationIds, saveEmployeeNotificationIds } from '../../features/employee/employeeNotifications.js'
import { fetchCustomerTickets, fetchProviderTickets, fetchSupportTickets, selectTicketsForScope } from './ticketsSlice.js'
import {
  fetchEmployeeCustomerNotifications, fetchEmployeeProviderNotifications,
  selectEmployeeCustomerNotifications, selectEmployeeProviderNotifications,
} from './employeeOperationsSlice.js'

const departments = { 'customer-operations': 'Customer Operations', 'provider-operations': 'Provider Operations' }

export const notificationOwner = (kind, user) => `${kind}:${user?.userId || user?.email || ''}`

async function listBookings(request) {
  const bookings = await request()
  if (!Array.isArray(bookings)) throw new Error('Notification data returned an invalid response.')
  return bookings
}

async function loadFeed(kind, user, { dispatch, getState }) {
  if (kind === 'superuser') return (await superuser.loadSuperuserNotifications()).notifications
  if (kind === 'support') {
    await dispatch(fetchSupportTickets()).unwrap()
    return buildSupportNotifications(selectTicketsForScope('support')(getState()), user)
  }
  if (kind === 'provider') {
    const [bookings] = await Promise.all([listBookings(bookingsApi.listForProvider), dispatch(fetchProviderTickets()).unwrap()])
    return buildProviderNotifications(bookings, selectTicketsForScope('provider')(getState()), user)
  }
  if (kind === 'customer') {
    const [bookings] = await Promise.all([listBookings(bookingsApi.list), dispatch(fetchCustomerTickets()).unwrap()])
    return buildCustomerNotifications(bookings, selectTicketsForScope('customer')(getState()), user)
  }
  const forCustomers = kind === 'customer-operations'
  await dispatch(forCustomers ? fetchEmployeeCustomerNotifications() : fetchEmployeeProviderNotifications()).unwrap()
  const data = (forCustomers ? selectEmployeeCustomerNotifications : selectEmployeeProviderNotifications)(getState())
  return buildEmployeeNotifications({
    department: departments[kind],
    tickets: Array.isArray(data?.tickets) ? data.tickets : [],
    customers: Array.isArray(data?.customers) ? data.customers : [],
    providers: Array.isArray(data?.providers) ? data.providers : [],
  }, user)
}

export const fetchNotifications = createAsyncThunk('notification/fetch', ({ kind, user }, api) => loadFeed(kind, user, api))

// Read ids stay in localStorage so they survive a reload.
function saveReadIds(kind, user, ids) {
  const stores = {
    customer: [readCustomerNotificationIds, saveCustomerNotificationIds],
    provider: [readProviderNotificationIds, saveProviderNotificationIds],
    support: [readSupportNotificationIds, saveSupportNotificationIds],
  }
  const department = departments[kind]
  const [read, save] = department
    ? [() => readEmployeeNotificationIds(user, department), (_user, next) => saveEmployeeNotificationIds(user, department, next)]
    : stores[kind]
  const saved = read(user)
  ids.forEach((id) => saved.add(id))
  save(user, saved)
}

export const markNotificationsRead = createAsyncThunk('notification/markRead', async ({ kind, user, ids }, { dispatch, getState }) => {
  if (kind !== 'superuser') {
    try { saveReadIds(kind, user, ids) } catch { throw new Error('Read state could not be saved in this browser.') }
    return ids
  }
  await superuser.markSuperuserNotificationsRead(getState().notification.items, ids)
  await dispatch(fetchNotifications({ kind, user, silent: true }))
  return ids
})

export const clearNotifications = createAsyncThunk('notification/clear', async (user, { dispatch, getState }) => {
  await superuser.clearSuperuserNotifications(getState().notification.items)
  await dispatch(fetchNotifications({ kind: 'superuser', user, silent: true }))
})

export const addSuperuserNotification = createAsyncThunk('notification/add', async (notification) => {
  await superuser.addSuperuserNotification(notification)
  return (await superuser.loadSuperuserNotifications()).notifications
})

const initialState = {
  owner: '', items: [], status: 'idle', error: '', saveError: '', requestId: null,
  readVersion: 0,
  panelOpen: false, showAll: false,
}

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    openPanel(state, action) { state.panelOpen = true; state.showAll = Boolean(action.payload?.showAll) },
    closePanel(state) { state.panelOpen = false },
    toggleShowAll(state) { state.showAll = !state.showAll },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state, { meta }) => {
        const owner = notificationOwner(meta.arg.kind, meta.arg.user)
        if (state.owner !== owner) { state.owner = owner; state.items = []; state.status = 'loading' }
        else if (!meta.arg.silent) state.status = 'loading'
        if (!meta.arg.silent) { state.error = ''; state.saveError = '' }
        state.requestId = meta.requestId
      })
      .addCase(fetchNotifications.fulfilled, (state, { meta, payload }) => {
        if (state.requestId !== meta.requestId) return
        state.items = payload
        state.status = 'succeeded'
      })
      .addCase(fetchNotifications.rejected, (state, { meta, error }) => {
        if (state.requestId !== meta.requestId || (meta.arg.silent && state.status === 'succeeded')) return
        state.status = 'failed'
        state.error = error.message || 'Notifications could not be loaded.'
      })
      .addCase(addSuperuserNotification.fulfilled, (state, { payload }) => {
        if (state.owner.startsWith('superuser:')) state.items = payload
      })
      .addCase(markNotificationsRead.fulfilled,(state, { payload }) => {
        state.items.forEach((item) => { if (payload.includes(item.id)) item.isUnread = false })
        state.readVersion += 1
        state.saveError = ''
      })
      .addCase(markNotificationsRead.rejected, (state, { error }) => { state.saveError = error.message || 'Notification changes could not be saved.' })
      .addCase(clearNotifications.rejected, (state, { error }) => { state.saveError = error.message || 'Notification changes could not be saved.' })
  },
})

export const { openPanel, closePanel, toggleShowAll } = notificationSlice.actions

const noItems = []
export const selectNotificationFeed = createSelector(
  [(state) => state.notification, (_state, owner) => owner],
  (feed, owner) => {
    const mine = feed.owner === owner
    const items = mine ? feed.items : noItems
    return {
      items,
      unreadCount: items.filter((item) => item.isUnread).length,
      status: mine ? feed.status : 'idle',
      error: feed.status === 'failed' ? feed.error : feed.saveError,
    }
  },
)

export default notificationSlice.reducer
