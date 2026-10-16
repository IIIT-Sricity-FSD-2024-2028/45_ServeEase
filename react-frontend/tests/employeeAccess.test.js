import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { UNSUPPORTED_DEPARTMENT_PATH, accessRedirect, destinationFor } from '../src/app/destinations.js'
import { customerDetailStats, customerStats, display, filterCustomers } from '../src/features/employee/employeeOperations.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const { AppRoutes } = await import('../src/app/routes.jsx')
const { AuthContext } = await import('../src/context/authContext.js')

const employee = (department) => ({ role: 'support', department, userId: 'EMP-1', email: 'emp@example.test' })
const users = {
  customerOps: employee('Customer Operations'),
  providerOps: employee('Provider Operations'),
  support: employee('Support'),
  unknown: employee('Finance'),
  noDepartment: employee(undefined),
  superuser: { role: 'superuser', userId: 'SU1' },
  customer: { role: 'customer', userId: 'CUS1' },
  provider: { role: 'provider', userId: 'PRO1' },
}

// Renders the real route table; a page's own content appears only when its guard lets the user in.
const renderAt = (path, user) => {
  const originalError = console.error
  const originalWarn = console.warn
  console.error = () => {}
  console.warn = () => {}
  try {
    return renderToStaticMarkup(createElement(AuthContext.Provider, { value: { currentUser: user, role: user.role, isAuthenticated: true, ready: true } },
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(AppRoutes))))
  } finally {
    console.error = originalError
    console.warn = originalWarn
  }
}
const marks = {
  customerOps: 'Loading customer records…',
  customerDetail: 'Loading customer profile…',
  providerOps: 'Loading provider records…',
  support: 'Welcome, Support Agent',
}

test('resolves each account to its own landing page; unknown departments never land on Support', () => {
  assert.equal(destinationFor(users.customerOps), '/employee/customer-operations')
  assert.equal(destinationFor(users.providerOps), '/employee/provider-operations')
  assert.equal(destinationFor(users.support), '/employee/support-tickets')
  assert.equal(destinationFor(users.unknown), UNSUPPORTED_DEPARTMENT_PATH)
  assert.equal(destinationFor(users.noDepartment), UNSUPPORTED_DEPARTMENT_PATH)
  assert.equal(destinationFor(users.superuser), '/admin')
  assert.equal(destinationFor(users.customer), '/customer/dashboard')
  assert.equal(destinationFor(users.provider), '/provider/dashboard')
  assert.equal(destinationFor(null), '/')
})

test('route guard keeps employees inside their department and redirects to their own workspace', () => {
  const supportRoute = { role: 'support', department: 'Support' }
  const customerOpsRoute = { role: ['support', 'superuser'], department: 'Customer Operations' }
  assert.equal(accessRedirect(users.support, supportRoute), null)
  assert.equal(accessRedirect(users.customerOps, supportRoute), '/employee/customer-operations')
  assert.equal(accessRedirect(users.providerOps, supportRoute), '/employee/provider-operations')
  assert.equal(accessRedirect(users.unknown, supportRoute), UNSUPPORTED_DEPARTMENT_PATH)
  assert.equal(accessRedirect(users.customerOps, customerOpsRoute), null)
  assert.equal(accessRedirect(users.support, customerOpsRoute), '/employee/support-tickets')
  assert.equal(accessRedirect(users.superuser, customerOpsRoute), null)
  assert.equal(accessRedirect(users.customer, customerOpsRoute), '/customer/dashboard')
  assert.equal(accessRedirect(users.superuser, { role: 'superuser' }), null)
  assert.equal(accessRedirect(users.customerOps, { role: 'superuser' }), '/employee/customer-operations')
})

test('the real route table opens each department workspace only to that department', () => {
  assert.ok(renderAt('/employee/customer-operations', users.customerOps).includes(marks.customerOps))
  assert.ok(renderAt('/employee/customer-operations/CUS001', users.customerOps).includes(marks.customerDetail))
  assert.ok(renderAt('/employee/provider-operations', users.providerOps).includes(marks.providerOps))
  assert.ok(renderAt('/employee/support-tickets', users.support).includes(marks.support))

  for (const user of [users.providerOps, users.support, users.unknown, users.customer, users.provider]) {
    assert.ok(!renderAt('/employee/customer-operations', user).includes(marks.customerOps), `${user.role}/${user.department} reached Customer Operations`)
  }
  for (const user of [users.customerOps, users.support, users.unknown, users.customer]) {
    assert.ok(!renderAt('/employee/provider-operations', user).includes(marks.providerOps), `${user.role}/${user.department} reached Provider Operations`)
  }
  for (const user of [users.customerOps, users.providerOps, users.unknown, users.noDepartment, users.customer]) {
    assert.ok(!renderAt('/employee/support-tickets', user).includes(marks.support), `${user.role}/${user.department} reached Support`)
  }
  assert.ok(renderAt('/employee/customer-operations', users.superuser).includes(marks.customerOps))
  assert.ok(renderAt('/employee/provider-operations', users.superuser).includes(marks.providerOps))
})

test('unsupported departments see Access Denied, never another workspace', () => {
  const html = renderAt(UNSUPPORTED_DEPARTMENT_PATH, users.unknown)
  assert.match(html, /Access Denied/)
  assert.match(html, /Finance/)
  assert.ok(!renderAt(UNSUPPORTED_DEPARTMENT_PATH, users.customerOps).includes('Access Denied'))
})

test('customer operations stats and filters follow the original page', () => {
  const overview = {
    customers: [
      { id: 'CUS1', fullName: 'Asha', email: 'asha@example.test', phone: '9000000001', location: 'Chennai', status: 'Active' },
      { id: 'CUS2', fullName: 'Ravi', email: 'ravi@example.test', phone: null, location: null, status: 'Blocked' },
      { id: 'CUS3', fullName: 'Meena', email: 'meena@example.test', phone: null, location: 'Delhi', status: null },
    ],
    totals: { customers: 3, bookings: 7, customerTickets: 2 },
  }
  assert.deepEqual(customerStats(overview), { customers: 3, active: 1, blocked: 1, bookings: 7, tickets: 2 })
  assert.deepEqual(filterCustomers(overview.customers, { status: 'N/A' }).map((c) => c.id), ['CUS3'])
  assert.deepEqual(filterCustomers(overview.customers, { status: 'Blocked' }).map((c) => c.id), ['CUS2'])
  assert.deepEqual(filterCustomers(overview.customers, { query: 'chennai' }).map((c) => c.id), ['CUS1'])
  assert.equal(display(null), 'N/A')
  assert.deepEqual(customerDetailStats([{ status: 'Pending' }, { status: 'Accepted' }, { status: 'Completed' }, { status: 'Cancelled' }], [{ status: 'Pending' }, { status: 'Resolved' }]), { total: 4, active: 2, completed: 1, openTickets: 1 })
})

test('employee workspaces call only their read-only endpoints with the session token', async () => {
  const calls = []
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ role: 'support', userId: 'EMP-1', token: 'tok' }) }
  globalThis.fetch = async (url, options) => {
    calls.push(`${options.method || 'GET'} ${url} ${options.headers.get('Authorization')}`)
    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 })
  }
  const { employeeOperationsApi } = await import('../src/services/api.js')
  await employeeOperationsApi.customers()
  await employeeOperationsApi.customer('CUS 1')
  await employeeOperationsApi.providers()
  assert.deepEqual(calls, [
    'GET http://localhost:3000/api/employee/customer-operations/customers Bearer tok',
    'GET http://localhost:3000/api/employee/customer-operations/customers/CUS%201 Bearer tok',
    'GET http://localhost:3000/api/employee/provider-operations/providers Bearer tok',
  ])
  globalThis.fetch = async () => new Response(JSON.stringify({ statusCode: 403, message: 'Your department does not have access to this resource.' }), { status: 403 })
  await assert.rejects(employeeOperationsApi.providers(), /department does not have access/)
})
