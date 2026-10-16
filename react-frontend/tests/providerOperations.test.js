import test from 'node:test'
import assert from 'node:assert/strict'
import { register } from 'node:module'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { initialStatusChange, statusChangeReducer } from '../src/features/employee/employeeOperations.js'
import {
  availabilityRows, decisionBlocker, decisionError, decisionNotice, filterProviders, formatDate, formatExperience, formatPrice, hasVerificationDetails,
  isPendingVerification, providerDetailStats, providerPath, providerStats, statusOptions, validateDecision, verificationDecisions,
} from '../src/features/employee/providerOperations.js'

register('./support/jsx-hooks.mjs', import.meta.url)

const { ProviderOperationsList } = await import('../src/features/employee/EmployeeProviderOperationsPage.jsx')
const { ProviderDetailSections } = await import('../src/features/employee/EmployeeProviderDetailPage.jsx')
const { VerificationReview } = await import('../src/features/employee/EmployeeProviderVerificationPage.jsx')
const { DecisionDialog, DocumentPreviewDialog, LoadState, ProviderNotFound } = await import('../src/features/employee/ProviderOpsParts.jsx')
const { AppRoutes } = await import('../src/app/routes.jsx')
const { AuthContext } = await import('../src/context/authContext.js')

const render = (component, props) => renderToStaticMarkup(createElement(MemoryRouter, null, createElement(component, props)))
const noop = () => {}
const httpError = (status, message) => Object.assign(new Error(message), { status })

// Shapes returned by GET /employee/provider-operations/providers and /providers/:id.
const overview = {
  providers: [
    { id: 'PRO1', fullName: 'Asha Rao', organisationName: 'Asha Fixers', email: 'asha@example.test', phone: '9000000001', serviceType: 'Plumbing', experience: 4, location: 'Chennai', registrationDate: '2026-10-14T09:00:00.000Z', accountStatus: 'Under Verification', verificationStatus: 'Pending', providerCatalogId: null, sharedId: false, documentCount: 2, serviceCount: 0 },
    { id: 'PRO2', fullName: 'Ravi Kumar', organisationName: 'Ravi Electricals', email: 'ravi@example.test', phone: null, serviceType: 'Electrical', experience: null, location: 'Delhi', registrationDate: '14/10/2026', accountStatus: 'Under Verification', verificationStatus: 'Pending', providerCatalogId: null, sharedId: false, documentCount: 0, serviceCount: 0 },
    { id: 'PRO-CAT-1', fullName: 'Fix Team', organisationName: 'FixIt', email: 'fix@example.test', serviceType: 'Carpentry', experience: 7, location: 'Mumbai', accountStatus: 'Active', verificationStatus: 'Verified', providerCatalogId: 'fixit', sharedId: true, documentCount: 0, serviceCount: 3 },
    { id: 'PRO-CAT-1', fullName: 'Fix Team Two', organisationName: 'FixIt Two', email: 'fix2@example.test', serviceType: 'Plumbing', location: 'Pune', accountStatus: 'Suspended', verificationStatus: 'Verified', providerCatalogId: 'fixit two', sharedId: true, documentCount: 0, serviceCount: 1 },
    { id: 'PRO5', fullName: 'Meena', accountStatus: 'Verification Rejected', verificationStatus: 'Rejected', sharedId: false, documentCount: 3, serviceCount: 0 },
  ],
  totals: { providers: 5, services: 4 },
}
const detail = {
  provider: { id: 'PRO1', fullName: 'Asha Rao', organisationName: 'Asha Fixers', email: 'asha@example.test', phone: '9000000001', serviceType: 'Plumbing', experience: 4, location: 'Chennai', registrationDate: '2026-10-14T09:00:00.000Z', accountStatus: 'Under Verification', verificationStatus: 'Pending', rejectionReason: null, adminRemarks: null },
  documents: [
    { documentId: 'DOC-1', documentType: 'ID Proof - Aadhaar', documentName: 'aadhaar.jpg', documentStatus: 'Pending', required: true },
    { documentId: 'DOC-2', documentType: 'Address Proof', documentName: null, documentStatus: null, required: true },
  ],
  services: [{ id: 'S1', name: 'Tap Repair', category: 'Plumbing', subcategory: 'Tap Repair', price: 1250, location: 'Chennai', status: 'Active' }, { id: 'S2', name: 'Pipe Fitting', category: 'Plumbing', subcategory: 'Pipe Fitting', price: null, location: null, status: 'Pending' }],
  bookings: [{ id: 'BOOK-1', customer: 'Ravi', service: 'Tap Repair', date: '2026-10-20', time: '09:00-12:00', status: 'Accepted', paymentStatus: 'Paid' }, { id: 'BOOK-2', customer: null, service: 'Tap Repair', date: '2026-10-01', time: null, status: 'Completed', paymentStatus: null }],
  availability: { monday: ['09:00-12:00', '13:00-17:00'], tuesday: [] },
  tickets: [{ ticketId: 'TKT-1', relatedBookingId: 'BOOK-1', subject: 'Payout', ticketType: 'Payment Not Received', status: 'Open', createdAt: '2026-10-15T08:00:00.000Z' }],
  history: [{ dateTime: '2026-10-15T08:00:00.000Z', action: 'Verification approved', previousStatus: 'Under Verification', newStatus: 'Active', reason: null, remarks: 'ok', performedBy: 'Provider Operations' }],
}

test('dates, prices and experience render the way the original page formats them', () => {
  assert.equal(formatDate('2026-10-14T09:00:00.000Z'), '14-10-2026')
  assert.equal(formatDate('4/3/2026'), '04-03-2026')
  assert.equal(formatDate('12 March 2026'), '12-03-2026')
  assert.equal(formatDate('25-08-2026 01:14 AM'), '25-08-2026')
  assert.equal(formatDate(null), 'N/A')
  assert.equal(formatPrice(1250), 'Rs. 1,250')
  assert.equal(formatPrice(null), 'N/A')
  assert.equal(formatExperience(4), '4 yrs')
  assert.equal(formatExperience(null), 'N/A')
})

test('list stats, status options, filters and pending queue use the server statuses', () => {
  assert.deepEqual(providerStats(overview), { providers: 5, active: 1, pending: 1, suspended: 1, services: 4 })
  assert.deepEqual(statusOptions(overview.providers), ['all', 'Active', 'Suspended', 'Under Verification', 'Verification Rejected'])
  assert.deepEqual(filterProviders(overview.providers, { status: 'Under Verification' }).map((p) => p.id), ['PRO1', 'PRO2'])
  assert.deepEqual(filterProviders(overview.providers, { query: 'electrical' }).map((p) => p.id), ['PRO2'])
  assert.deepEqual(filterProviders(overview.providers, { query: 'pune' }).map((p) => p.fullName), ['Fix Team Two'])
  assert.deepEqual(filterProviders(overview.providers, { status: 'Active', query: 'chennai' }), [])
  assert.equal(isPendingVerification(overview.providers[0]), true)
  assert.equal(isPendingVerification(overview.providers[1]), false, 'no documents recorded, so not in the review queue')
  assert.equal(isPendingVerification(overview.providers[4]), false)
})

test('provider links are stable and only shared ids carry the catalog listing', () => {
  assert.equal(providerPath(overview.providers[0]), '/employee/provider-operations/PRO1')
  assert.equal(providerPath(overview.providers[0], 'verification-review'), '/employee/provider-operations/PRO1/verification-review')
  assert.equal(providerPath(overview.providers[3]), '/employee/provider-operations/PRO-CAT-1?listing=fixit%20two')
})

test('the list page renders the original cards, tables, disabled suspend actions and review links', () => {
  const html = render(ProviderOperationsList, { data: overview, status: 'all', query: '', onStatus: noop, onQuery: noop, onStatusAction: noop })
  for (const label of ['Total Providers', 'Active Providers', 'Pending Verification', 'Suspended Providers', 'Total Services']) assert.match(html, new RegExp(`<span>${label}</span></div><strong>`))
  assert.match(html, /Provider Management \(5\)/)
  assert.match(html, /Pending Verification Requests \(1\)/)
  assert.match(html, /<option value="all" selected="">All Status<\/option><option value="Active">Active<\/option>/)
  assert.match(html, /placeholder="Name, email, phone, location, or service"/)
  assert.match(html, /<button aria-label="Suspend FixIt" class="provider-operations-inline-action danger" type="button">Suspend<\/button>/)
  assert.match(html, /<button aria-label="Activate FixIt Two" class="provider-operations-inline-action success" type="button">Activate<\/button>/)
  assert.doesNotMatch(html, /not supported by the ServeEase backend/)
  assert.match(html, /href="\/employee\/provider-operations\/PRO-CAT-1\?listing=fixit%20two"[^>]*>View<\/a>/)
  assert.match(html, /<span>2 documents<\/span><a class="provider-operations-inline-action" href="\/employee\/provider-operations\/PRO1\/verification-review"[^>]*>Preview Documents<\/a>/)
  assert.match(html, /class="provider-operations-inline-action warning" href="\/employee\/provider-operations\/PRO1\/verification-review"[^>]*>Review<\/a>/)
  assert.match(html, /<td>14-10-2026<\/td>/)
  assert.match(html, /provider-operations-chip under-verification">Under Verification</)

  const empty = render(ProviderOperationsList, { data: { providers: [], totals: { providers: 0, services: 0 } }, status: 'all', query: '', onStatus: noop, onQuery: noop })
  assert.match(empty, /No providers match the current search or filter\./)
  assert.match(empty, /No pending verification requests\./)
})

test('the detail page shows every original section in order with real data and empty states', () => {
  const html = render(ProviderDetailSections, { data: detail, onPreview: noop })
  const headings = [...html.matchAll(/<h2 id="[^"]+">([^<]+)<\/h2>/g)].map((match) => match[1])
  assert.deepEqual(headings, ['Provider Information', 'Provider Verification', 'Provider Services', 'Provider Booking Activity', 'Availability Overview', 'Provider Support Context', 'Account Status History'])
  assert.match(html, /<span>Provider ID :<\/span><strong>PRO1<\/strong>/)
  assert.match(html, /<span>Registration Date :<\/span><strong>14-10-2026<\/strong>/)
  assert.match(html, /<span>Experience :<\/span><strong>4 yrs<\/strong>/)
  assert.match(html, /<span>Total Bookings<\/span><\/div><strong>2<\/strong>/)
  assert.match(html, /<span>Active \/ Upcoming Bookings<\/span><\/div><strong>1<\/strong>/)
  assert.match(html, /<span>Active Services<\/span><\/div><strong>1<\/strong>/)
  assert.match(html, /<strong>ID Proof - Aadhaar<\/strong>/)
  assert.match(html, /title="Not submitted">Not submitted</)
  assert.match(html, /<td>Rs. 1,250<\/td>/)
  assert.match(html, /<span>2 services<\/span>/)
  assert.match(html, /<span>Monday<\/span><strong>09:00-12:00, 13:00-17:00<\/strong>/)
  assert.match(html, /<span>Tuesday<\/span><strong>Unavailable<\/strong>/)
  assert.match(html, /<td>Verification approved<\/td>/)
  assert.doesNotMatch(html, /documentUrl|local-document/)

  const bare = render(ProviderDetailSections, { data: { provider: detail.provider, documents: [], services: [], bookings: [], tickets: [], history: [], availability: null }, onPreview: noop })
  for (const message of ['No verification documents are recorded for this provider.', 'No services are linked to this provider.', 'No bookings are linked to this provider.', 'No availability data is recorded for this provider.', 'No support tickets are linked to this provider.', 'No account status history is recorded for this provider.']) assert.ok(bare.includes(message), message)
})

test('the Provider Verification section appears only when there is something to verify', () => {
  const headings = (html) => [...html.matchAll(/<h2 id="([^"]+)">/g)].map((match) => match[1])
  const sections = (provider, documents) => render(ProviderDetailSections, { data: { provider, documents, services: [], bookings: [], tickets: [], history: [], availability: null }, onPreview: noop })
  const base = { ...detail.provider, verificationStatus: null, verificationRecorded: false, rejectionReason: null, adminRemarks: null }

  // No documents and nothing recorded: the whole section goes, but every other section stays.
  const hidden = sections(base, [])
  assert.ok(!headings(hidden).includes('provider-verification-title'))
  assert.doesNotMatch(hidden, /Provider Verification|No verification documents|Registered provider account/)
  assert.ok(headings(hidden).includes('provider-information-title') && headings(hidden).includes('provider-services-title'))
  // A status the server only defaulted (record has none) is not verification information either.
  assert.ok(!headings(sections({ ...base, verificationStatus: 'Verified' }, [])).includes('provider-verification-title'))

  // Documents keep the full section and their Preview actions.
  const withDocuments = sections(base, detail.documents)
  assert.ok(headings(withDocuments).includes('provider-verification-title'))
  assert.equal([...withDocuments.matchAll(/>Preview<\/button>/g)].length, 2)

  // A recorded status, rejection reason or remarks keep the section even without documents.
  for (const recorded of [{ verificationStatus: 'Pending', verificationRecorded: true }, { rejectionReason: 'Blurred ID' }, { adminRemarks: 'Call back' }]) {
    const html = sections({ ...base, ...recorded }, [])
    assert.ok(headings(html).includes('provider-verification-title'), JSON.stringify(recorded))
    assert.match(html, /No verification documents are recorded for this provider\./)
  }
  assert.match(sections({ ...base, rejectionReason: 'Blurred ID' }, []), /Rejection Reason/)
  // Responses from before the flag existed fall back to the status they carry.
  assert.equal(hasVerificationDetails({ verificationStatus: 'Pending' }, []), true)
  assert.equal(hasVerificationDetails({ verificationStatus: null }, []), false)
})

test('detail helpers count bookings and services the original way', () => {
  assert.deepEqual(providerDetailStats(detail.services, detail.bookings), { total: 2, active: 1, completed: 1, activeServices: 1 })
  assert.deepEqual(availabilityRows({ sunday: [], monday: ['09:00-12:00'] }), [{ label: 'Monday', value: '09:00-12:00', available: true }, { label: 'Sunday', value: 'Unavailable', available: false }])
  assert.deepEqual(availabilityRows(null), [])
})

test('the review page enables a decision only for pending requests that can be decided', () => {
  const pending = render(VerificationReview, { data: detail, busy: false, onDecide: noop, onPreview: noop })
  assert.match(pending, /<button class="btn btn-primary" type="button">Approve<\/button>/)
  assert.match(pending, /<button class="btn btn-outline provider-verification-review-reject" type="button">Reject<\/button>/)
  assert.match(pending, /<span>Submitted<\/span><strong>14-10-2026<\/strong>/)
  assert.match(pending, /<span>Pending<\/span><button class="btn btn-outline" type="button">Preview<\/button>/)

  const noDocuments = render(VerificationReview, { data: { ...detail, documents: [] }, busy: false, onDecide: noop, onPreview: noop })
  assert.match(noDocuments, /<button[^>]*class="btn btn-primary" disabled=""[^>]*>Approve<\/button>/)
  assert.match(noDocuments, /class="btn btn-outline provider-verification-review-reject" type="button">Reject</)
  assert.match(noDocuments, /No verification documents are recorded for this provider, so it cannot be approved/)

  const processed = { ...detail, provider: { ...detail.provider, accountStatus: 'Verification Rejected', verificationStatus: 'Rejected', rejectionReason: 'Blurred ID proof' } }
  const done = render(VerificationReview, { data: processed, busy: false, onDecide: noop, onPreview: noop })
  assert.equal(done.match(/disabled=""/g).length, 2)
  assert.match(done, /This verification request has already been rejected: Blurred ID proof/)
  assert.equal(decisionBlocker({ accountStatus: 'Active', verificationStatus: 'Verified' }, []), 'This verification request has already been processed (account status: Active).')

  const busy = render(VerificationReview, { data: detail, busy: true, onDecide: noop, onPreview: noop })
  assert.equal(busy.match(/disabled=""/g).length, 2)
})

test('the decision dialog follows the original copy, requires a rejection reason and locks while submitting', () => {
  const base = { onCancel: noop, onConfirm: noop, onInvalid: noop, onSignIn: noop, validate: validateDecision }
  const approve = render(DecisionDialog, { ...base, copy: verificationDecisions.approve, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'approve' } })
  assert.match(approve, /<h2 id="provider-verification-modal-title">Approve Verification<\/h2><p>Confirm approval\. The provider will become active and dashboard-eligible\.<\/p>/)
  assert.doesNotMatch(approve, /provider-verification-reason/, 'approval has no reason field')
  assert.match(approve, /placeholder="Optional internal remarks"/)
  assert.match(approve, /class="btn btn-primary" type="submit">Confirm<\/button><button class="btn btn-outline" type="button">Cancel<\/button>/)

  const reject = render(DecisionDialog, { ...base, copy: verificationDecisions.reject, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'reject', error: 'A rejection reason of at least 5 characters is required.' } })
  assert.match(reject, /Reject Verification/)
  assert.match(reject, /<textarea aria-invalid="true" id="provider-verification-reason"[^>]*placeholder="Required rejection reason"/)
  assert.match(reject, /role="alert">A rejection reason of at least 5 characters is required\.</)

  const submitting = render(DecisionDialog, { ...base, copy: verificationDecisions.reject, change: { ...initialStatusChange, phase: 'submitting', nextStatus: 'reject' } })
  assert.equal(submitting.match(/disabled=""/g).length, 4)
  assert.match(submitting, /aria-busy="true"[^>]*>Rejecting…<\/button>/)

  const expired = render(DecisionDialog, { ...base, copy: verificationDecisions.approve, change: { ...initialStatusChange, phase: 'confirming', nextStatus: 'approve', error: decisionError(httpError(403, 'Authentication is required.')) } })
  assert.match(expired, /session has expired or was signed out\. <button class="provider-operations-link-button" type="button">Sign in again<\/button>/)

  assert.equal(validateDecision('reject', '  no  '), 'A rejection reason of at least 5 characters is required.')
  assert.equal(validateDecision('reject', 'Blurred ID'), '')
  assert.equal(validateDecision('approve', ''), '')
})

test('a decision reaches the page only after the server confirms it', () => {
  let state = statusChangeReducer(initialStatusChange, { type: 'open', nextStatus: 'approve' })
  state = statusChangeReducer(state, { type: 'submit' })
  assert.equal(statusChangeReducer(state, { type: 'cancel' }), state, 'cannot be dismissed mid-request')
  const failed = statusChangeReducer(state, { type: 'failed', message: decisionError(httpError(409, "This provider's verification has already been processed (account status: Active).")) })
  assert.equal(failed.phase, 'confirming')
  assert.match(failed.error, /already been processed/)
  assert.equal(decisionNotice({ organisationName: 'Asha Fixers' }, 'approve'), 'Asha Fixers has been verified and is now active.')
  assert.match(decisionNotice({ fullName: 'Ravi' }, 'reject'), /^Ravi's verification has been rejected/)
  assert.equal(decisionError(httpError(403, 'Your department does not have access to this resource.')), 'Your department does not have access to this resource.')
  assert.match(decisionError(httpError(404, 'Provider with id "X" was not found.')), /no longer exists/)
  assert.match(decisionError(httpError(500, 'boom')), /could not record the verification decision/)
  assert.match(decisionError(new Error('Request to x could not be completed: Failed to fetch')), /could not be sent: .*Failed to fetch/)
})

test('loading, error, not-found and preview states are explicit and never show invented content', () => {
  assert.match(render(LoadState, { state: 'loading', loadingText: 'Loading provider records…', onRetry: noop }), /role="status">Loading provider records…</)
  assert.match(render(LoadState, { state: 'error', error: 'Server down', onRetry: noop }), /role="alert"><p>Server down<\/p><button class="btn btn-outline" type="button">Retry<\/button>/)
  assert.match(render(ProviderNotFound, { message: 'The selected provider ID does not match an existing ServeEase provider record.' }), /<h2>Provider not found\.<\/h2>.*href="\/employee\/provider-operations"/)
  const preview = render(DocumentPreviewDialog, { document: { ...detail.documents[0], hasFile: false }, load: () => { throw new Error('a metadata-only document must not be fetched') }, onClose: noop })
  assert.match(preview, /<h3 id="provider-document-preview-title">ID Proof - Aadhaar<\/h3><p>aadhaar\.jpg<\/p>/)
  assert.match(preview, /Preview unavailable\. ServeEase keeps only this document&#x27;s details on the server/)
  assert.doesNotMatch(preview, /<img|<iframe/)
})

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

test('provider detail and review routes open only for Provider Operations (and superusers)', () => {
  const employee = (department) => ({ role: 'support', department, userId: 'EMP-1' })
  const pages = [['/employee/provider-operations/PRO1', 'Loading provider profile…'], ['/employee/provider-operations/PRO1/verification-review', 'Loading verification request…']]
  for (const [path, mark] of pages) {
    assert.ok(renderAt(path, employee('Provider Operations')).includes(mark), path)
    assert.ok(renderAt(path, { role: 'superuser', userId: 'SU1' }).includes(mark), `${path} superuser`)
    for (const user of [employee('Customer Operations'), employee('Support'), employee('Finance'), { role: 'customer', userId: 'C1' }, { role: 'provider', userId: 'P1' }]) {
      assert.ok(!renderAt(path, user).includes(mark), `${user.role}/${user.department} reached ${path}`)
    }
  }
})

test('provider operations call only their endpoints with the session token', async () => {
  const calls = []
  globalThis.sessionStorage = { getItem: () => JSON.stringify({ role: 'support', userId: 'EMP-PO-001', token: 'tok' }) }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined, auth: options.headers.get('Authorization') })
    return new Response(JSON.stringify({ success: true, data: { provider: { id: 'PRO1', accountStatus: 'Active' } } }), { status: 200 })
  }
  const { employeeOperationsApi } = await import('../src/services/api.js')
  await employeeOperationsApi.provider('PRO1')
  await employeeOperationsApi.provider('PRO-CAT-1', 'fixit two')
  const result = await employeeOperationsApi.decideProviderVerification('PRO1', undefined, { decision: 'reject', reason: 'Blurred ID proof' })
  assert.deepEqual(result, { provider: { id: 'PRO1', accountStatus: 'Active' } })
  assert.deepEqual(calls, [
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO1', method: 'GET', body: undefined, auth: 'Bearer tok' },
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO-CAT-1?listing=fixit%20two', method: 'GET', body: undefined, auth: 'Bearer tok' },
    { url: 'http://localhost:3000/api/employee/provider-operations/providers/PRO1/verification', method: 'PATCH', body: { decision: 'reject', reason: 'Blurred ID proof' }, auth: 'Bearer tok' },
  ])
  globalThis.fetch = async () => new Response(JSON.stringify({ statusCode: 409, message: "This provider's verification has already been processed (account status: Active)." }), { status: 409 })
  await assert.rejects(employeeOperationsApi.decideProviderVerification('PRO1', undefined, { decision: 'approve' }), (error) => error.status === 409 && /already been processed/.test(error.message))
})
