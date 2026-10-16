import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { customerStatusAction, initialStatusChange, statusChangeError, statusChangeNotice, statusChangeReducer } from '../src/features/employee/employeeOperations.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const { CustomerStatusAction, CustomerStatusDialog } = await import('../src/features/employee/CustomerStatusControls.jsx')

const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)))
const noop = () => {}
const suspend = customerStatusAction({ status: 'Active' })
const activate = customerStatusAction({ status: 'Blocked' })
const httpError = (status, message) => Object.assign(new Error(message), { status })

test('active and unrecorded customers can be suspended, blocked ones activated, other statuses are left alone', () => {
  assert.deepEqual(suspend, { nextStatus: 'Blocked', verb: 'Suspend', label: 'Suspend Customer', pending: 'Suspending…', tone: 'btn-danger' })
  assert.equal(customerStatusAction({ status: null }).nextStatus, 'Blocked')
  assert.deepEqual(activate, { nextStatus: 'Active', verb: 'Activate', label: 'Activate Customer', pending: 'Activating…', tone: 'btn-success' })
  assert.equal(customerStatusAction({ status: 'Deleted' }), null)
})

test('the status change flow confirms first, locks while submitting and applies only confirmed results', () => {
  let state = statusChangeReducer(initialStatusChange, { type: 'open', nextStatus: 'Blocked' })
  assert.deepEqual(state, { phase: 'confirming', nextStatus: 'Blocked', error: '', notice: '' })
  state = statusChangeReducer(state, { type: 'invalid', message: 'A reason is required.' })
  assert.equal(state.error, 'A reason is required.')

  state = statusChangeReducer(state, { type: 'submit' })
  assert.deepEqual(state, { phase: 'submitting', nextStatus: 'Blocked', error: '', notice: '' })
  assert.equal(statusChangeReducer(state, { type: 'cancel' }), state, 'cannot dismiss while the request runs')
  assert.equal(statusChangeReducer(state, { type: 'open', nextStatus: 'Active' }), state, 'cannot start a second change')
  assert.equal(statusChangeReducer(state, { type: 'submit' }), state, 'cannot submit twice')

  const failed = statusChangeReducer(state, { type: 'failed', message: 'Server down' })
  assert.deepEqual(failed, { phase: 'confirming', nextStatus: 'Blocked', error: 'Server down', notice: '' }, 'dialog stays open with the error')

  const done = statusChangeReducer(statusChangeReducer(failed, { type: 'submit' }), { type: 'succeeded', message: 'Asha has been suspended and signed out of ServeEase.' })
  assert.deepEqual(done, { phase: 'idle', nextStatus: null, error: '', notice: 'Asha has been suspended and signed out of ServeEase.' })
  assert.equal(statusChangeReducer(done, { type: 'succeeded', message: 'late' }), done, 'a stray result outside a request is ignored')
  assert.equal(statusChangeReducer(failed, { type: 'cancel' }).phase, 'idle')
})

test('success and failure messages explain what happened', () => {
  assert.equal(statusChangeNotice({ changed: true, customer: { fullName: 'Asha', status: 'Blocked' } }), 'Asha has been suspended and signed out of ServeEase.')
  assert.equal(statusChangeNotice({ changed: true, customer: { fullName: 'Asha', status: 'Active' } }), 'Asha has been activated and can sign in again.')
  assert.equal(statusChangeNotice({ changed: false, customer: { fullName: 'Asha', status: 'Blocked' } }), 'Asha is already suspended.')

  assert.match(statusChangeError(httpError(403, 'Authentication is required.')), /session has expired/)
  assert.match(statusChangeError(httpError(401, 'Session is invalid or expired.')), /session has expired/)
  assert.equal(statusChangeError(httpError(403, 'Your department does not have access to this resource.')), 'Your department does not have access to this resource.')
  assert.match(statusChangeError(httpError(404, 'Customer with id "CUS9" was not found.')), /no longer exists/)
  assert.equal(statusChangeError(httpError(400, 'A reason is required.')), 'A reason is required.')
  assert.equal(statusChangeError(httpError(409, 'A customer with account status "Deleted" cannot be suspended or activated here.')), 'A customer with account status "Deleted" cannot be suspended or activated here.')
  assert.match(statusChangeError(httpError(500, 'Internal server error')), /could not update the customer status/)
  assert.match(statusChangeError(new Error('Request to http://localhost:3000/api/x could not be completed: Failed to fetch')), /could not be sent: .*Failed to fetch/)
})

test('the Actions row keeps the original labels and colours and disables itself while a change runs', () => {
  const idle = render(CustomerStatusAction, { action: suspend, change: initialStatusChange, onOpen: noop, status: 'Active' })
  assert.match(idle, /<button[^>]*class="btn btn-danger"[^>]*>Suspend Customer<\/button>/)
  assert.doesNotMatch(idle, /disabled/)

  const busy = render(CustomerStatusAction, { action: suspend, change: { ...initialStatusChange, phase: 'submitting' }, onOpen: noop, status: 'Active' })
  assert.match(busy, /<button[^>]*disabled=""[^>]*>Suspending…<\/button>/)

  const blocked = render(CustomerStatusAction, { action: activate, change: { ...initialStatusChange, notice: 'Asha has been suspended and signed out of ServeEase.' }, onOpen: noop, status: 'Blocked' })
  assert.match(blocked, /class="btn btn-success"[^>]*>Activate Customer</)
  assert.match(blocked, /role="status">Asha has been suspended and signed out of ServeEase\.</)

  const unmanaged = render(CustomerStatusAction, { action: null, change: initialStatusChange, onOpen: noop, status: 'Deleted' })
  assert.doesNotMatch(unmanaged, /<button/)
  assert.match(unmanaged, /Account status &quot;Deleted&quot; cannot be changed/)
})

test('the confirmation dialog asks for a reason, locks during the request and shows errors', () => {
  const props = { action: suspend, customerName: 'Asha', onCancel: noop, onConfirm: noop, onInvalid: noop, onSignIn: noop }
  const confirming = render(CustomerStatusDialog, { ...props, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Blocked' } })
  assert.match(confirming, /<h2 id="customer-status-dialog-title">Suspend Customer<\/h2>/)
  assert.match(confirming, /<p>Suspend Asha\?<\/p>/)
  assert.match(confirming, /Reason <span aria-hidden="true">\*<\/span>/)
  assert.match(confirming, /Admin Remarks <span>\(optional\)<\/span>/)
  assert.match(confirming, /type="submit">Confirm Suspend<\/button>/)
  assert.doesNotMatch(confirming, /disabled/)

  const submitting = render(CustomerStatusDialog, { ...props, change: { ...initialStatusChange, phase: 'submitting', nextStatus: 'Blocked' } })
  assert.equal(submitting.match(/disabled=""/g).length, 4, 'both fields and both buttons are disabled')
  assert.match(submitting, /aria-busy="true"[^>]*>Suspending…<\/button>/)

  const failed = render(CustomerStatusDialog, { ...props, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Blocked', error: 'Your department does not have access to this resource.' } })
  assert.match(failed, /role="alert">Your department does not have access to this resource\.</)
  assert.doesNotMatch(failed, /Sign in again/)

  const expired = render(CustomerStatusDialog, { ...props, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Blocked', error: statusChangeError(httpError(403, 'Authentication is required.')) } })
  assert.match(expired, /session has expired or was signed out\. <button class="ops-link-button" type="button">Sign in again<\/button>/)

  const reactivate = render(CustomerStatusDialog, { ...props, action: activate, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Active' } })
  assert.match(reactivate, /Activate Customer<\/h2>/)
  assert.match(reactivate, /class="btn btn-success"[^>]*type="submit">Confirm Activate</)
})

test('the status change is a PATCH to the backend with the session token; failures keep the HTTP status', async () => {
  const calls = []
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ role: 'support', userId: 'EMP-CO-001', token: 'tok' }) }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method, body: JSON.parse(options.body), auth: options.headers.get('Authorization') })
    return new Response(JSON.stringify({ success: true, data: { changed: true, customer: { id: 'CUS 1', status: 'Blocked' } } }), { status: 200 })
  }
  const { employeeOperationsApi } = await import('../src/services/api.js')
  const result = await employeeOperationsApi.setCustomerStatus('CUS 1', { status: 'Blocked', reason: 'Fraud review' })
  assert.deepEqual(result, { changed: true, customer: { id: 'CUS 1', status: 'Blocked' } })
  assert.deepEqual(calls, [{ url: 'http://localhost:3000/api/employee/customer-operations/customers/CUS%201/status', method: 'PATCH', body: { status: 'Blocked', reason: 'Fraud review' }, auth: 'Bearer tok' }])

  globalThis.fetch = async () => new Response(JSON.stringify({ statusCode: 404, message: 'Customer with id "CUS 1" was not found.' }), { status: 404 })
  await assert.rejects(employeeOperationsApi.setCustomerStatus('CUS 1', { status: 'Active', reason: 'x' }), (error) => error.status === 404 && /was not found/.test(error.message))
})
