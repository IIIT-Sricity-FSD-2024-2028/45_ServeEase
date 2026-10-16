import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'

register('./support/jsx-hooks.mjs', import.meta.url)

const { ForgotPasswordPage } = await import('../src/features/auth/ForgotPasswordPage.jsx')
const { LoginPage } = await import('../src/features/auth/LoginPage.jsx')
const { AuthContext } = await import('../src/context/authContext.js')

globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const render = (element) => renderToStaticMarkup(createElement(MemoryRouter, null, element))

test('"Forgot Password?" points at the reset page, not the home page', () => {
  const context = { isAuthenticated: false, currentUser: null, ready: true, suspension: null, clearSuspension() {}, reportSuspension() {}, establishSession() {} }
  const html = render(createElement(AuthContext.Provider, { value: context }, createElement(LoginPage)))
  assert.match(html, /class="link-text login-forgot-link" href="\/forgot-password"/)
})

test('the reset page asks for the registered email and offers the way back to login', () => {
  const html = render(createElement(ForgotPasswordPage))
  assert.match(html, />Reset Your Password<\/h1>/)
  assert.match(html, /id="forgotEmail"/)
  assert.match(html, /Send Reset Link/)
  assert.match(html, /href="\/login"/)
  // Nothing is claimed to have been sent until the form is submitted.
  assert.doesNotMatch(html, /Password Reset Link Sent/)
})
