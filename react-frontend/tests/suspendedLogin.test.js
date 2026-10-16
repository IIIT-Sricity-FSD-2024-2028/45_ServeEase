import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

register('./support/jsx-hooks.mjs', import.meta.url)

const { SuspendedAccountNotice } = await import('../src/features/auth/SuspendedAccountNotice.jsx')
const { LoginPage } = await import('../src/features/auth/LoginPage.jsx')
const { AuthContext } = await import('../src/context/authContext.js')

const store = {}
const events = []
globalThis.sessionStorage = { getItem: (key) => store[key] ?? null, setItem: (key, value) => { store[key] = String(value) }, removeItem: (key) => { delete store[key] } }
globalThis.window = { dispatchEvent: (event) => events.push(event) }
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail } }
const { apiRequest, suspendedKind, SUSPENDED_EVENT } = await import('../src/services/apiClient.js')

const reply = (status, body) => { globalThis.fetch = async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }) }
const failure = (call) => call.then(() => { throw new Error('expected a rejection') }, (error) => error)
const render = (element) => renderToStaticMarkup(createElement(MemoryRouter, null, element))
const suspendedBody = (code, reason) => ({ statusCode: 403, error: 'Forbidden', message: 'Your account is currently suspended.', code, reason })

test('the suspended-customer screen shows the heading, the recorded reason and working actions', () => {
  const html = render(createElement(SuspendedAccountNotice, { kind: 'customer', reason: 'Chargeback <b>investigation</b>', onBack() {} }))
  assert.match(html, /<h2 id="suspendedAccountHeading"[^>]*>Account Suspended<\/h2>/)
  assert.match(html, /customer account is currently suspended/)
  assert.match(html, /Reason:<\/p><p class="blocked-account-reason">Chargeback &lt;b&gt;investigation&lt;\/b&gt;<\/p>/, 'reason is escaped text')
  assert.match(html, /<a class="btn btn-primary btn-full" href="\/contact-support"[^>]*>Contact Support<\/a>/)
  assert.doesNotMatch(html, /\/customer\/support/)
  assert.match(html, /<button class="btn btn-outline btn-full" type="button">Back to Login<\/button>/)
  assert.match(html, /do not need to sign in/)
})

test('the suspended-provider screen has provider copy, and a missing reason gets a useful explanation', () => {
  const html = render(createElement(SuspendedAccountNotice, { kind: 'provider', reason: '  ', onBack() {} }))
  assert.match(html, />Provider Account Suspended<\/h2>/)
  assert.match(html, /provider account is currently suspended/)
  assert.match(html, /No reason was recorded for this suspension\. Please contact ServeEase Support/)
  assert.match(html, /href="\/contact-support"[^>]*>Contact Support/)
})

test('only the structured suspended codes on a 403 count as suspension', () => {
  assert.equal(suspendedKind({ status: 403, code: 'CUSTOMER_ACCOUNT_SUSPENDED' }), 'customer')
  assert.equal(suspendedKind({ status: 403, code: 'PROVIDER_ACCOUNT_SUSPENDED' }), 'provider')
  assert.equal(suspendedKind({ status: 403, message: 'Your ServeEase provider account is currently suspended.' }), null, 'message text alone is not enough')
  assert.equal(suspendedKind({ status: 401, code: 'PROVIDER_ACCOUNT_SUSPENDED' }), null)
  assert.equal(suspendedKind({ status: 403, code: 'toString' }), null)
  assert.equal(suspendedKind(new Error('Request could not be completed')), null)
  assert.equal(suspendedKind(undefined), null)
})

test('a suspended login surfaces the code and reason without signalling a session end', async () => {
  delete store.serveEaseSession; events.length = 0
  reply(403, suspendedBody('CUSTOMER_ACCOUNT_SUSPENDED', 'Policy review'))
  const error = await failure(apiRequest('/auth/login', { method: 'POST', body: '{}' }))
  assert.deepEqual([error.status, error.code, error.reason, suspendedKind(error)], [403, 'CUSTOMER_ACCOUNT_SUSPENDED', 'Policy review', 'customer'])
  assert.deepEqual(events, [], 'there was no session to end')
})

test('ordinary failures keep their message and never look like a suspension', async () => {
  store.serveEaseSession = JSON.stringify({ token: 'tok', role: 'customer', userId: 'CUS1' }); events.length = 0
  for (const [status, body, message] of [
    [401, { statusCode: 401, message: 'Invalid email, password, or account type.' }, 'Invalid email, password, or account type.'],
    [400, { statusCode: 400, message: ['email must be an email', 'password should not be empty'] }, 'email must be an email password should not be empty'],
    [429, { statusCode: 429, message: 'Too many attempts. Try again later.' }, 'Too many attempts. Try again later.'],
    [403, { statusCode: 403, message: 'Your department does not have access to this resource.' }, 'Your department does not have access to this resource.'],
    [403, { statusCode: 403, message: 'Your ServeEase provider account is currently suspended.' }, 'Your ServeEase provider account is currently suspended.'],
  ]) {
    reply(status, body)
    const error = await failure(apiRequest('/anything'))
    assert.equal(error.message, message)
    assert.equal(suspendedKind(error), null)
  }
  assert.deepEqual(events, [])
  assert.ok(store.serveEaseSession, 'the session survives unrelated errors')
  globalThis.fetch = async () => { throw new TypeError('Failed to fetch') }
  const offline = await failure(apiRequest('/anything'))
  assert.match(offline.message, /could not be completed: Failed to fetch/)
  assert.equal(suspendedKind(offline), null)
  assert.deepEqual(events, [])
})

test('a signed-in session rejected for suspension is discarded and announced with the recorded reason', async () => {
  store.serveEaseSession = JSON.stringify({ token: 'tok', role: 'provider', userId: 'PRO1' }); events.length = 0
  reply(403, suspendedBody('PROVIDER_ACCOUNT_SUSPENDED', 'Repeated no-shows'))
  const error = await failure(apiRequest('/provider/dashboard'))
  assert.equal(suspendedKind(error), 'provider')
  assert.equal(store.serveEaseSession, undefined, 'no usable session remains')
  assert.equal(events.length, 1)
  assert.equal(events[0].type, SUSPENDED_EVENT)
  assert.deepEqual(events[0].detail, { kind: 'provider', reason: 'Repeated no-shows' })
})

test('the login page shows the screen for a rejected session instead of the form, and the form otherwise', () => {
  const context = (suspension) => ({ isAuthenticated: false, currentUser: null, ready: true, suspension, clearSuspension() {}, reportSuspension() {}, establishSession() {} })
  const page = (value) => render(createElement(AuthContext.Provider, { value }, createElement(LoginPage)))
  const suspended = page(context({ kind: 'provider', reason: 'Repeated no-shows' }))
  assert.match(suspended, />Provider Account Suspended<\/h2>/)
  assert.match(suspended, /Repeated no-shows/)
  assert.doesNotMatch(suspended, /Sign In|loginPassword|Welcome to ServeEase/)
  const normal = page(context(null))
  assert.match(normal, /Welcome to ServeEase/)
  assert.match(normal, /Sign In/)
  assert.doesNotMatch(normal, /Account Suspended/)
})
