import test from 'node:test'
import assert from 'node:assert/strict'
import { backendRole, requestContext } from '../src/services/requestContext.js'

test('normalizes existing UI role labels to the faculty API role headers', () => {
  assert.equal(backendRole('customer'), 'user')
  assert.equal(backendRole('user'), 'user')
  assert.equal(backendRole('provider'), 'provider')
  assert.equal(backendRole('support'), 'support')
  assert.equal(backendRole('admin'), 'admin')
  assert.equal(backendRole('superuser'), 'admin')
})

test('preserves the browser request identity headers used by the existing API workflow', () => {
  assert.deepEqual(requestContext({ role: 'customer', userId: 'CUS007', email: 'a@example.test' }), {
    role: 'user', 'user-id': 'CUS007', 'user-email': 'a@example.test',
  })
})

test('request identity values are caller supplied and provide no verification', () => {
  const changedHeaders = requestContext({ role: 'customer', userId: 'SOMEONE-ELSE', email: 'other@example.test' })
  assert.equal(changedHeaders['user-id'], 'SOMEONE-ELSE')
  assert.equal(changedHeaders['user-email'], 'other@example.test')
})
