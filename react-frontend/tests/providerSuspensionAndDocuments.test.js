import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { initialStatusChange, statusChangeReducer } from '../src/features/employee/employeeOperations.js'
import { previewError, previewKind, providerStatusAction, providerStatusError, providerStatusNotice, startPreview } from '../src/features/employee/providerOperations.js'
import { MAX_DOCUMENT_BYTES, documentFileError, uploadRegisteredDocuments } from '../src/features/auth/providerDocuments.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const { DocumentPreviewDialog, ProviderStatusModal } = await import('../src/features/employee/ProviderOpsParts.jsx')
const { ProviderOperationsList } = await import('../src/features/employee/EmployeeProviderOperationsPage.jsx')

const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)))
const noop = () => {}
const httpError = (status, message) => Object.assign(new Error(message), { status })
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

test('Suspend/Activate follow the original actions: only verified providers, with the original copy', () => {
  const suspend = providerStatusAction({ accountStatus: 'Active' })
  assert.deepEqual([suspend.nextStatus, suspend.label, suspend.tone, suspend.title, suspend.confirm], ['Suspended', 'Suspend', 'danger', 'Suspend Provider', 'Confirm Suspend'])
  assert.equal(suspend.prompt, 'Enter the suspension reason before blocking this verified provider from operations.')
  const activate = providerStatusAction({ accountStatus: 'Suspended' })
  assert.deepEqual([activate.nextStatus, activate.label, activate.tone, activate.title, activate.confirm], ['Active', 'Activate', 'success', 'Activate Provider', 'Confirm Activate'])
  assert.equal(providerStatusAction({ accountStatus: 'Under Verification' }), null)
  assert.equal(providerStatusAction({ accountStatus: 'Verification Rejected' }), null)
})

test('the list renders live status buttons and disables them while a change is in flight', () => {
  const data = { providers: [{ id: 'P1', fullName: 'Asha', organisationName: 'Asha Co', accountStatus: 'Active', serviceCount: 1 }, { id: 'P2', fullName: 'Ravi', accountStatus: 'Suspended', serviceCount: 0 }, { id: 'P3', fullName: 'Meena', accountStatus: 'Under Verification', documentCount: 1, serviceCount: 0 }], totals: { services: 1 } }
  const idle = render(ProviderOperationsList, { data, status: 'all', query: '', onStatus: noop, onQuery: noop, onStatusAction: noop })
  assert.match(idle, /<button aria-label="Suspend Asha Co" class="provider-operations-inline-action danger" type="button">Suspend<\/button>/)
  assert.match(idle, /<button aria-label="Activate Ravi" class="provider-operations-inline-action success" type="button">Activate<\/button>/)
  assert.equal(idle.match(/>(Suspend|Activate)<\/button>/g).length, 2, 'no status action for a provider under verification')
  const busy = render(ProviderOperationsList, { data, status: 'all', query: '', onStatus: noop, onQuery: noop, onStatusAction: noop, busy: true })
  assert.equal(busy.match(/disabled=""[^>]*>(Suspend|Activate)</g).length, 2)
})

test('the status modal requires a reason, locks while submitting and shows server errors', () => {
  const action = providerStatusAction({ accountStatus: 'Active' })
  const base = { action, providerName: 'Asha Co', onCancel: noop, onConfirm: noop, onInvalid: noop, onSignIn: noop }
  const open = render(ProviderStatusModal, { ...base, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Suspended' } })
  assert.match(open, /<h2 id="provider-operations-modal-title">Suspend Provider<\/h2><p>Enter the suspension reason before blocking this verified provider from operations\. <strong>Asha Co<\/strong><\/p>/)
  assert.match(open, /Reason <span class="provider-operations-required">\*<\/span><textarea[^>]*placeholder="Required suspension reason"/)
  assert.match(open, /Admin Remarks <span>\(optional\)<\/span><textarea[^>]*placeholder="Optional internal remarks"/)
  assert.match(open, /<button class="btn btn-outline" type="button">Cancel<\/button><button aria-busy="false" class="btn btn-primary" type="submit">Confirm Suspend<\/button>/)

  const invalid = render(ProviderStatusModal, { ...base, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Suspended', error: action.required } })
  assert.match(invalid, /aria-invalid="true"/)
  assert.match(invalid, /role="alert">Suspension reason is required\.</)

  const submitting = render(ProviderStatusModal, { ...base, change: { ...initialStatusChange, phase: 'submitting', nextStatus: 'Suspended' } })
  assert.equal(submitting.match(/disabled=""/g).length, 4)
  assert.match(submitting, /aria-busy="true"[^>]*>Suspending…<\/button>/)

  const expired = render(ProviderStatusModal, { ...base, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'Suspended', error: providerStatusError(httpError(403, 'Authentication is required.')) } })
  assert.match(expired, /signed out\. <button class="provider-operations-link-button" type="button">Sign in again<\/button>/)
})

test('the page changes only after the server confirms, with clear success and failure messages', () => {
  let state = statusChangeReducer(initialStatusChange, { type: 'open', nextStatus: 'Suspended' })
  state = statusChangeReducer(state, { type: 'submit' })
  assert.equal(statusChangeReducer(state, { type: 'cancel' }), state)
  const failed = statusChangeReducer(state, { type: 'failed', message: providerStatusError(httpError(409, 'Only verified providers can be suspended or activated (account status: Under Verification).')) })
  assert.equal(failed.phase, 'confirming')
  assert.match(failed.error, /Only verified providers/)
  const done = statusChangeReducer(statusChangeReducer(failed, { type: 'submit' }), { type: 'succeeded', message: providerStatusNotice({ changed: true, provider: { organisationName: 'Asha Co', accountStatus: 'Suspended' } }) })
  assert.equal(done.notice, 'Asha Co has been suspended and signed out of ServeEase.')
  assert.equal(providerStatusNotice({ changed: true, provider: { fullName: 'Ravi', accountStatus: 'Active' } }), 'Ravi has been activated and can sign in again.')
  assert.equal(providerStatusNotice({ changed: false, provider: { id: 'P1', accountStatus: 'Suspended' } }), 'P1 is already suspended.')
  assert.equal(providerStatusError(httpError(403, 'Your department does not have access to this resource.')), 'Your department does not have access to this resource.')
  assert.match(providerStatusError(httpError(404, 'x')), /no longer exists/)
  assert.match(providerStatusError(httpError(500, 'x')), /could not update the provider status/)
  assert.match(providerStatusError(new Error('Request to x could not be completed: Failed to fetch')), /could not be sent: .*Failed to fetch/)
})

test('the preview dialog shows loading for uploaded files and the honest message for metadata-only documents', () => {
  let loads = 0
  const uploaded = render(DocumentPreviewDialog, { document: { documentId: 'D1', documentType: 'ID Proof', documentName: 'id.png', hasFile: true }, load: () => { loads += 1; return new Promise(noop) }, onClose: noop })
  // attachments.js previewProviderDocument(): type heading, file name, then Filename / File Type / Status / Preview.
  assert.match(uploaded, /<h3 id="provider-document-preview-title">ID Proof<\/h3><p>id\.png<\/p><\/div><button aria-label="Close" class="attachment-preview-close" type="button">×<\/button>/)
  assert.match(uploaded, /<strong>Filename<\/strong><span>id\.png<\/span><strong>File Type<\/strong><span>Unknown<\/span><strong>Status<\/strong><span>Pending<\/span><strong>Preview<\/strong>/)
  assert.match(uploaded, /<button class="btn btn-outline btn-full" type="button">Close<\/button>/)
  assert.match(uploaded, /role="status">Loading document…</)
  assert.doesNotMatch(uploaded, /<img|<iframe|Preview unavailable/)
  const legacy = render(DocumentPreviewDialog, { document: { documentId: 'D2', documentType: 'Address Proof', documentName: 'bill.pdf', hasFile: false }, load: () => { loads += 1 }, onClose: noop })
  assert.match(legacy, /Preview unavailable\. ServeEase keeps only this document&#x27;s details on the server/)
  assert.doesNotMatch(legacy, /<img|<iframe/)
  const browserOnly = render(DocumentPreviewDialog, { document: { documentId: 'DOC-PRO140-1', documentType: 'ID Proof - Aadhaar', documentName: 'homecleaning 4.jpg.jpeg', documentStatus: null, hasFile: false, unavailableReason: 'awaiting-browser-import' }, load: () => { loads += 1 }, onClose: noop })
  assert.match(browserOnly, /<h3 id="provider-document-preview-title">ID Proof - Aadhaar<\/h3><p>homecleaning 4\.jpg\.jpeg<\/p>/)
  assert.match(browserOnly, /kept only in the web browser where the provider registered on the original ServeEase site; it can be shown here once it is imported from that browser/)
  assert.doesNotMatch(browserOnly, /<img|<iframe/)
  const missing = render(DocumentPreviewDialog, { document: { documentId: 'D3', documentType: 'ID Proof', documentName: 'x.pdf', hasFile: false, unavailableReason: 'missing-source' }, load: () => { loads += 1 }, onClose: noop })
  assert.match(missing, /The uploaded file for this document is missing from the server\./)
  // The canonical registry's own message wins over the local fallback text.
  const canonical = render(DocumentPreviewDialog, { document: { documentId: 'D4', documentType: 'ID Proof', documentName: 'y.pdf', hasFile: false, unavailableReason: 'pending-migration', message: 'Run the provider document migration to make it viewable.' }, load: () => { loads += 1 }, onClose: noop })
  assert.match(canonical, /<p>Run the provider document migration to make it viewable\.<\/p>/)
  assert.equal(loads, 0, 'server rendering never fetches')
})

test('startPreview renders images and PDFs from object URLs, handles errors and always revokes the URL', async () => {
  const created = []
  const revoked = []
  const urls = { createObjectURL: (blob) => { created.push(blob.type); return `blob:test/${created.length}` }, revokeObjectURL: (url) => revoked.push(url) }
  const states = []
  let stop = startPreview(async () => new Blob([new Uint8Array([0x89, 0x50])], { type: 'image/png' }), (state) => states.push(state), urls)
  await flush()
  assert.deepEqual(states.at(-1), { state: 'ready', kind: 'image', url: 'blob:test/1', type: 'image/png' })
  stop()
  assert.deepEqual(revoked, ['blob:test/1'])

  stop = startPreview(async () => new Blob(['%PDF-'], { type: 'application/pdf' }), (state) => states.push(state), urls)
  await flush()
  assert.deepEqual(states.at(-1), { state: 'ready', kind: 'pdf', url: 'blob:test/2', type: 'application/pdf' })
  stop()

  startPreview(async () => new Blob(['x'], { type: 'text/html' }), (state) => states.push(state), urls)
  await flush()
  assert.deepEqual(states.at(-1), { state: 'unsupported', type: 'text/html' })

  startPreview(async () => { throw httpError(404, 'No file was uploaded for this document. Only its details were recorded, so there is nothing to preview.') }, (state) => states.push(state), urls)
  await flush()
  assert.deepEqual(states.at(-1), { state: 'error', message: 'No file was uploaded for this document. Only its details were recorded, so there is nothing to preview.' })

  let resolve
  const late = []
  stop = startPreview(() => new Promise((done) => { resolve = done }), (state) => late.push(state), urls)
  stop()
  resolve(new Blob(['x'], { type: 'image/png' }))
  await flush()
  assert.deepEqual(late, [], 'a result arriving after close is ignored')
  assert.equal(created.length, 2, 'no object URL is created after close')
  assert.deepEqual(revoked, ['blob:test/1', 'blob:test/2'])

  assert.equal(previewKind('image/jpeg'), 'image')
  assert.equal(previewKind('image/svg+xml'), 'unsupported')
  assert.match(previewError(httpError(403, 'Authentication is required.')), /session has expired/)
})

test('signup checks verification files and uploads each to the id the server assigned', async () => {
  const file = (name, size = 10) => ({ name, size })
  assert.equal(documentFileError('idProof', file('id.pdf')), '')
  assert.equal(documentFileError('idProof', file('id.exe')), 'Upload a PDF, JPG or PNG file.')
  assert.equal(documentFileError('profilePhoto', file('me.pdf')), 'Upload a JPG or PNG image.')
  assert.equal(documentFileError('idProof', file('id.png', 0)), 'The selected file is empty.')
  assert.equal(documentFileError('idProof', file('id.png', MAX_DOCUMENT_BYTES + 1)), 'The file must be 5 MB or smaller.')

  const calls = []
  const files = { idProof: file('id.png'), profilePhoto: file('me.png') }
  const user = { documents: [{ documentId: 'DOC-PRO9-1', documentType: 'idProof' }, { documentId: 'DOC-PRO9-2', documentType: 'profilePhoto' }, { documentId: 'DOC-PRO9-3', documentType: 'skillCertificate' }] }
  const failures = await uploadRegisteredDocuments({ user, token: 'tok', files, upload: async (id, chosen, options) => { calls.push([id, chosen.name, options.token]); if (id === 'DOC-PRO9-2') throw new Error('The declared file type does not match the file contents.') } })
  assert.deepEqual(calls, [['DOC-PRO9-1', 'id.png', 'tok'], ['DOC-PRO9-2', 'me.png', 'tok']])
  assert.deepEqual(failures, [{ documentType: 'profilePhoto', name: 'me.png', message: 'The declared file type does not match the file contents.' }])
})

test('status, preview and upload requests use the session or registration token and the right endpoints', async () => {
  const calls = []
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ role: 'support', userId: 'EMP-PO-001', token: 'tok' }) }
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, method: options.method || 'GET', auth: new Headers(options.headers).get('Authorization'), body: options.body instanceof FormData ? 'form' : options.body && JSON.parse(options.body) })
    if (url.endsWith('/preview')) return new Response(new Blob([new Uint8Array([0x89, 0x50])], { type: 'image/png' }), { status: 200, headers: { 'Content-Type': 'image/png' } })
    return new Response(JSON.stringify({ success: true, data: { changed: true } }), { status: 200 })
  }
  const { employeeOperationsApi, providerDocumentsApi } = await import('../src/services/api.js')
  await employeeOperationsApi.setProviderStatus('PRO1', undefined, { status: 'Suspended', reason: 'No-shows' })
  await employeeOperationsApi.setProviderStatus('PRO-CAT-1', 'fixit two', { status: 'Active', reason: 'Resolved' })
  const blob = await employeeOperationsApi.providerDocument('PRO1', undefined, 'DOC-PRO1-1')
  assert.equal(blob.type, 'image/png')
  globalThis.sessionStorage = { getItem: () => null }
  await providerDocumentsApi.upload('DOC-PRO9-1', new Blob(['x'], { type: 'image/png' }), { token: 'registration-token' })
  assert.deepEqual(calls, [
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO1/status', method: 'PATCH', auth: 'Bearer tok', body: { status: 'Suspended', reason: 'No-shows' } },
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO-CAT-1/status?listing=fixit%20two', method: 'PATCH', auth: 'Bearer tok', body: { status: 'Active', reason: 'Resolved' } },
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO1/documents/DOC-PRO1-1/preview', method: 'GET', auth: 'Bearer tok', body: undefined },
    { url: 'http://localhost:3000/api/provider/verification-documents/DOC-PRO9-1/file', method: 'POST', auth: 'Bearer registration-token', body: 'form' },
  ])
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ token: 'tok' }) }
  globalThis.fetch = async () => new Response(JSON.stringify({ statusCode: 404, message: 'The stored file for this document is missing from the server.' }), { status: 404 })
  await assert.rejects(employeeOperationsApi.providerDocument('PRO1', undefined, 'DOC-PRO1-1'), (error) => error.status === 404 && /missing from the server/.test(error.message))
})

test('signup sends only the fields the backend accepts for each role', async () => {
  const { signupPayload } = await import('../src/features/auth/signupPayload.js')
  const values = { fullName: 'Asha Rao', email: 'a@example.test', phone: '9000000001', password: 'Strong@123', confirmPassword: 'Strong@123', organisationName: '', serviceType: '', experience: '', cityId: '', address: '', idProofType: '' }
  assert.deepEqual(signupPayload('customer', values), { role: 'customer', fullName: 'Asha Rao', email: 'a@example.test', phone: '9000000001', password: 'Strong@123' })
  const provider = signupPayload('provider', { ...values, organisationName: 'Asha Co', serviceType: 'Plumbing', experience: '4', cityId: '1', address: 'Street 1', idProofType: 'PAN' }, [{ documentType: 'idProof' }])
  assert.equal('confirmPassword' in provider, false)
  assert.deepEqual([provider.experience, provider.cityId, provider.documents.length], [4, 1, 1])
})

test('signup sends the services the provider ticked, priced by the provider, and none by default', async () => {
  const { categoryServices, servicesPayload, signupPayload } = await import('../src/features/auth/signupPayload.js')
  const categories = [{ id: 'plumbing', name: 'Plumbing', subServices: ['Tap Repair', 'Pipe Fitting'] }, { id: 'home-cleaning', name: 'Home Cleaning', subServices: ['Kitchen Cleaning'] }]
  assert.deepEqual(categoryServices(categories, 'Plumbing'), ['Tap Repair', 'Pipe Fitting'])
  assert.deepEqual(categoryServices(categories, 'Home cleaning'), ['Kitchen Cleaning'])
  assert.deepEqual(categoryServices(categories, 'Unknown'), [])
  assert.deepEqual(categoryServices(undefined, 'Plumbing'), [])
  assert.deepEqual(servicesPayload({ 'Tap Repair': '450.50' }), [{ name: 'Tap Repair', price: 450.5 }])
  assert.deepEqual(servicesPayload(), [])
  const values = { fullName: 'Asha Rao', email: 'a@example.test', phone: '9000000001', password: 'Strong@123', organisationName: 'Asha Co', serviceType: 'Plumbing', experience: '4', cityId: '1', address: 'Street 1', idProofType: 'PAN' }
  assert.deepEqual(signupPayload('provider', values, [], { 'Tap Repair': '450' }).services, [{ name: 'Tap Repair', price: 450 }])
  assert.deepEqual(signupPayload('provider', values).services, [])
  assert.equal('services' in signupPayload('customer', values, [], { 'Tap Repair': '450' }), false)
})
