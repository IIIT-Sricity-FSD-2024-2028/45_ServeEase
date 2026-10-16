import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

register('./support/jsx-hooks.mjs', import.meta.url)

const { AppRoutes } = await import('../src/app/routes.jsx')
const { AuthContext } = await import('../src/context/authContext.js')
const { SuspendedAccountNotice } = await import('../src/features/auth/SuspendedAccountNotice.jsx')

const signedOut = { isAuthenticated: false, currentUser: null, ready: true, suspension: null, clearSuspension() {}, reportSuspension() {}, async logout() {}, establishSession() {} }
const at = (entry, value = signedOut) => renderToStaticMarkup(createElement(AuthContext.Provider, { value }, createElement(MemoryRouter, { initialEntries: [entry] }, createElement(AppRoutes))))

test('a signed-out visitor can open the public contact page, with the real contact methods and no pretence of sending', () => {
  const html = at('/contact-support')
  assert.match(html, /<h1 id="contact-support-title">Contact ServeEase Support<\/h1>/)
  assert.match(html, /href="mailto:support@serveease\.com\?subject=ServeEase%20support%20request"/)
  assert.match(html, /href="tel:\+9118001234567"[^>]*>\+91 1800-123-4567</)
  assert.match(html, /does not send a message or create a support ticket/)
  assert.doesNotMatch(html, /<form|<textarea|ticket (?:has been )?(?:submitted|created|sent)|Submit/i)
  assert.match(html, /href="\/login"[^>]*>Back to Login/)
  assert.doesNotMatch(html, /Welcome to ServeEase|loginPassword/, 'not redirected to the login page')
})

test('the page adapts its wording to a suspended customer or provider without exposing account data', () => {
  for (const kind of ['customer', 'provider']) {
    const html = at({ pathname: '/contact-support', state: { suspended: kind } })
    assert.match(html, new RegExp(`Your ServeEase ${kind} account is currently suspended`))
    assert.match(html, new RegExp(`subject=Suspended%20ServeEase%20${kind}%20account`))
  }
  const forged = at({ pathname: '/contact-support', state: { suspended: '<script>' } })
  assert.doesNotMatch(forged, /currently suspended|<script>/)
  assert.doesNotMatch(at({ pathname: '/contact-support', search: '?reason=Fraud&id=CUS1' }), /Fraud|CUS1/)
})

test('signed-in customers and providers also get a way to their own ticket pages', () => {
  const customer = at('/contact-support', { ...signedOut, isAuthenticated: true, currentUser: { role: 'customer' } })
  assert.match(customer, /href="\/customer\/support"[^>]*>Go to your support tickets/)
  const provider = at('/contact-support', { ...signedOut, isAuthenticated: true, currentUser: { role: 'provider' } })
  assert.match(provider, /href="\/provider\/support"/)
})

test('the notice sends both kinds of suspended user to the public page, not a protected one', () => {
  for (const kind of ['customer', 'provider']) {
    const html = renderToStaticMarkup(createElement(MemoryRouter, null, createElement(SuspendedAccountNotice, { kind, reason: 'x', onBack() {} })))
    assert.match(html, /href="\/contact-support"/)
    assert.doesNotMatch(html, /href="\/(?:customer|provider)\/support"/)
  }
})

test('the protected support and ticket routes stay behind their guards for a signed-out visitor', () => {
  const routes = readFileSync(new URL('../src/app/routes.jsx', import.meta.url), 'utf8')
  for (const [path, guard] of [['/customer/support', 'role="customer"'], ['/provider/support', 'role="provider"'], ['/employee/support-tickets', 'department="Support"']]) {
    assert.match(routes, new RegExp(`path="${path}"[^\n]*<ProtectedRoute[^>]*${guard}`), path)
    const html = at(path)
    assert.doesNotMatch(html, /Help Resources|My Support Tickets|Contact ServeEase Support/, `${path} renders nothing of the page while signed out`)
  }
  assert.doesNotMatch(routes, /path="\/contact-support"[^\r\n]*ProtectedRoute/)
})
