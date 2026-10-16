import test from 'node:test'
import assert from 'node:assert/strict'
import { categoryImageFor, cityIdFor, isUnderVerification, validateBank, validatePersonal, validateProfessional } from '../src/features/provider/account/providerProfile.js'

test('personal details are checked with the same rules the server applies', () => {
  const good = { fullName: 'Asha Rao', organisationName: 'Asha Care', phone: '9876543210', cityId: '2' }
  assert.deepEqual(validatePersonal(good, true), {})
  assert.deepEqual(Object.keys(validatePersonal({ fullName: 'A1', organisationName: '', phone: '123', cityId: '' }, true)).sort(), ['cityId', 'fullName', 'organisationName', 'phone'])
  assert.deepEqual(validatePersonal({ ...good, organisationName: '' }, false), {})
})

test('bank details are optional as a whole but must be complete and valid once started', () => {
  assert.deepEqual(validateBank({ bankName: '', accountHolder: '', accountNumber: '', ifsc: '' }), {})
  assert.deepEqual(validateBank({ bankName: 'HDFC', accountHolder: 'Asha Rao', accountNumber: '123456789012', ifsc: 'HDFC0001234' }), {})
  assert.deepEqual(Object.keys(validateBank({ bankName: 'HDFC', accountHolder: '', accountNumber: '12', ifsc: 'bad' })).sort(), ['accountHolder', 'accountNumber', 'ifsc'])
})

test('experience must be whole years up to 50', () => {
  assert.deepEqual(validateProfessional({ experience: '7' }), {})
  assert.ok(validateProfessional({ experience: '51' }).experience)
  assert.ok(validateProfessional({ experience: '' }).experience)
})

test('city, category image and verification lookups follow the account record', () => {
  assert.equal(cityIdFor({ cityId: 3 }), '3')
  assert.equal(cityIdFor({ location: 'Bengaluru' }), '2')
  assert.equal(cityIdFor({ location: 'Nowhere' }), '')
  assert.equal(categoryImageFor('Pest Control'), '/assets/images/pest-control/pest1.jpg.jpeg')
  assert.equal(categoryImageFor('Unknown'), '/assets/images/home-cleaning/clean1.jpg')
  assert.equal(isUnderVerification({ accountStatus: 'Under Verification' }), true)
  assert.equal(isUnderVerification({ accountStatus: 'Active' }), false)
})
