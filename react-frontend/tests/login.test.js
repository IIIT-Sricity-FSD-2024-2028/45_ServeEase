import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

register('./support/jsx-hooks.mjs', import.meta.url)

const { LoginPage } = await import('../src/features/auth/LoginPage.jsx')
const { AuthContext } = await import('../src/context/authContext.js')

const store = {}
globalThis.sessionStorage = { getItem: (key) => store[key] ?? null, setItem: (key, value) => { store[key] = String(value) }, removeItem: (key) => { delete store[key] } }
globalThis.window = { dispatchEvent: () => {} }
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init?.detail } }

const { authApi } = await import('../src/services/api.js')
const { destinationFor } = await import('../src/app/destinations.js')

const context = () => ({ isAuthenticated: false, currentUser: null, ready: true, suspension: null, clearSuspension() {}, reportSuspension() {}, establishSession() {} })
const page = () => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(AuthContext.Provider, { value: context() }, createElement(LoginPage))))

// The faculty objection was that the login asked you to declare your role before authenticating. The form
// must therefore offer one identifier and a password, and nothing that names an actor type.
test('the login form offers one identifier field and no role choice', () => {
  const html = page()
  assert.match(html, /<label for="loginIdentifier">Email or ServeEase ID<\/label>/)
  assert.match(html, /name="identifier"/)
  assert.match(html, /id="loginPassword"/)
  assert.doesNotMatch(html, /role-tab/, 'the login page has no actor tabs')
  assert.doesNotMatch(html, /name="employeeId"|name="department"/, 'no employee id or department field')
  assert.doesNotMatch(html, />Superuser<|>Employee</, 'no actor is named as a choice')
  // Exactly two inputs: the identifier and the password.
  assert.equal((html.match(/<input /g) || []).length, 2)
})

test('the form says which accounts use an email and which use an issued id, and keeps password recovery', () => {
  const html = page()
  assert.match(html, /placeholder="Enter your email or ServeEase ID"/)
  assert.match(html, /href="\/forgot-password"/)
  assert.match(html, /href="\/signup\?role=customer"/)
})

test('login posts only an identifier and a password', async () => {
  let sent = null
  globalThis.fetch = async (url, options) => {
    sent = { url: String(url), body: JSON.parse(options.body) }
    return new Response(JSON.stringify({ data: { token: 't', user: { id: 'PRO147', role: 'provider' } } }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  const result = await authApi.login({ identifier: 'PRO147', password: 'Pass@123' })
  assert.match(sent.url, /\/auth\/login$/)
  assert.deepEqual(Object.keys(sent.body).sort(), ['identifier', 'password'])
  assert.deepEqual(sent.body, { identifier: 'PRO147', password: 'Pass@123' })
  // The role comes back from the server and decides the landing page; the page never supplied one.
  assert.equal(destinationFor(result.user), '/provider/dashboard')
})

// Each identifier resolves server-side to one account; the client only routes on the role it is handed.
test('every stored role lands on its own workspace without the page choosing', () => {
  assert.equal(destinationFor({ role: 'customer' }), '/customer/dashboard')
  assert.equal(destinationFor({ role: 'provider' }), '/provider/dashboard')
  assert.equal(destinationFor({ role: 'superuser' }), '/admin')
  assert.equal(destinationFor({ role: 'support', department: 'Customer Operations' }), '/employee/customer-operations')
  assert.equal(destinationFor({ role: 'support', department: 'Provider Operations' }), '/employee/provider-operations')
  assert.equal(destinationFor({ role: 'support', department: 'Support' }), '/employee/support-tickets')
  assert.equal(destinationFor({ role: 'support', department: 'Finance' }), '/employee/unsupported-department')
})
