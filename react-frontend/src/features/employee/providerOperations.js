// Logic for the Provider Operations pages (front-end/JavaScript/provider-operations.js,
// provider-operations-detail.js, provider-verification-review.js) applied to the API responses of
// /employee/provider-operations/*. Account and verification statuses arrive already normalised by the server.
import { display, formatDate } from './employeeOperations.js'

export { display, formatDate }

export function formatPrice(value) {
  const amount = Number(value)
  if (value === null || value === undefined || value === '' || !Number.isFinite(amount)) return display(value)
  return `Rs. ${amount.toLocaleString('en-IN')}`
}

export function formatExperience(value) {
  if (value === null || value === undefined || value === '') return display(null)
  return /^\d+(\.\d+)?$/.test(String(value)) ? `${value} yrs` : String(value)
}

// statusChip(): the chip class is the slugged label.
export function chipClass(value) {
  return String(value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'pending'
}

// pendingProviders(): Under Verification with at least one recorded document.
// The Provider Verification section is shown only when there is something to verify: submitted documents, or
// verification information the record itself carries (a recorded status, a rejection reason or admin remarks).
// A status the server merely defaulted for an unrecorded account, the registration date and the source label
// are not verification details. Older responses without `verificationRecorded` fall back to the status field.
export function hasVerificationDetails(provider, documents = []) {
  if (documents.length > 0) return true
  const recorded = provider?.verificationRecorded ?? Boolean(provider?.verificationStatus)
  return Boolean((recorded && provider?.verificationStatus) || provider?.rejectionReason || provider?.adminRemarks)
}

export const isPendingVerification = (provider) => provider?.accountStatus === 'Under Verification' && (provider.documentCount ?? provider.documents?.length ?? 0) > 0

// renderStatusFilter(): "All Status" plus every recorded account status, sorted.
export function statusOptions(providers = []) {
  return ['all', ...[...new Set(providers.map((provider) => provider.accountStatus).filter(Boolean))].sort()]
}

// renderStats(): Total, Active, Pending Verification, Suspended, Total Services.
export function providerStats(overview) {
  const providers = overview?.providers || []
  return {
    providers: providers.length,
    active: providers.filter((provider) => provider.accountStatus === 'Active').length,
    pending: providers.filter(isPendingVerification).length,
    suspended: providers.filter((provider) => provider.accountStatus === 'Suspended').length,
    services: overview?.totals?.services ?? 0,
  }
}

// filteredProviders(): status filter plus free-text search over the visible columns.
export function filterProviders(providers = [], { status = 'all', query = '' } = {}) {
  const term = query.trim().toLowerCase()
  return providers.filter((provider) => {
    if (status !== 'all' && provider.accountStatus !== status) return false
    if (!term) return true
    return [provider.id, provider.fullName, provider.organisationName, provider.email, provider.phone, provider.location, provider.serviceType, provider.experience, provider.accountStatus]
      .filter((value) => value !== null && value !== undefined).join(' ').toLowerCase().includes(term)
  })
}

// Links keep the catalog listing only for the few legacy accounts that share an id.
export function providerPath(provider, page = '') {
  const base = `/employee/provider-operations/${encodeURIComponent(provider.id)}${page ? `/${page}` : ''}`
  return provider.sharedId && provider.providerCatalogId ? `${base}?listing=${encodeURIComponent(provider.providerCatalogId)}` : base
}

// The same three booking groups Customer Operations counts, over the statuses the backend stores.
const upcomingBookingStatuses = ['pending', 'accepted']
const closedBookingStatuses = ['cancelled', 'rejected']

// provider-operations-detail.js renderStats(): total = upcoming + completed + cancelled.
export function providerDetailStats(services = [], bookings = []) {
  const key = (value) => String(value ?? '').trim().toLowerCase()
  return {
    total: bookings.length,
    upcoming: bookings.filter((booking) => upcomingBookingStatuses.includes(key(booking.status))).length,
    completed: bookings.filter((booking) => key(booking.status) === 'completed').length,
    cancelled: bookings.filter((booking) => closedBookingStatuses.includes(key(booking.status))).length,
    activeServices: services.filter((service) => ['active', 'verified'].includes(key(service.status))).length,
  }
}

const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
const title = (day) => day.charAt(0).toUpperCase() + day.slice(1)

// renderAvailability(): one row per weekday from the provider's recorded weekly schedule.
export function availabilityRows(weeklySchedule) {
  if (!weeklySchedule) return []
  return WEEKDAYS.filter((day) => day in weeklySchedule).map((day) => {
    const slots = Array.isArray(weeklySchedule[day]) ? weeklySchedule[day] : []
    return { label: title(day), value: slots.length ? slots.join(', ') : 'Unavailable', available: slots.length > 0 }
  })
}

export const countLabel = (count, singular) => `${count} ${singular}${count === 1 ? '' : 's'}`

// provider-verification-review.js openModal() copy.
export const verificationDecisions = {
  approve: {
    decision: 'approve',
    title: 'Approve Verification',
    prompt: 'Confirm approval. The provider will become active and dashboard-eligible.',
    confirm: 'Confirm',
    pending: 'Approving…',
  },
  reject: {
    decision: 'reject',
    title: 'Reject Verification',
    prompt: 'Enter the rejection reason. The provider can still sign in to view the reason and resubmit.',
    confirm: 'Confirm',
    pending: 'Rejecting…',
  },
}

// Client-side check mirroring the server DTO, so the dialog explains the rule before sending.
export function validateDecision(decision, reason) {
  if (decision === 'reject' && String(reason || '').trim().length < 5) return 'A rejection reason of at least 5 characters is required.'
  return ''
}

// Why the decision buttons are unavailable, or '' when the request can be decided.
export function decisionBlocker(provider, documents) {
  if (provider.accountStatus !== 'Under Verification') {
    const outcome = provider.verificationStatus === 'Rejected' ? `rejected${provider.rejectionReason ? `: ${provider.rejectionReason}` : '.'}` : `processed (account status: ${provider.accountStatus}).`
    return `This verification request has already been ${outcome}`
  }
  if (!documents.length) return 'No verification documents are recorded for this provider, so it cannot be approved. It can still be rejected with a reason.'
  return ''
}

export function decisionNotice(provider, decision) {
  const name = provider?.organisationName || provider?.fullName || provider?.id || 'The provider'
  return decision === 'approve'
    ? `${name} has been verified and is now active.`
    : `${name}'s verification has been rejected. The provider can review the reason and resubmit.`
}

// Maps PATCH failures to what the employee should do next; specific server messages are kept.
export function decisionError(error) {
  const message = error?.message || ''
  if (error?.status === 401 || /authentication is required|session is invalid or expired/i.test(message)) return 'Your session has expired or was signed out.'
  if (error?.status === 403) return message || 'You do not have permission to decide provider verifications.'
  if (error?.status === 404) return 'This provider record no longer exists. Return to Provider Operations and refresh the list.'
  if (error?.status === 400 || error?.status === 409) return message || 'The verification decision was not accepted.'
  if (error?.status >= 500) return 'The server could not record the verification decision. Please try again.'
  return message ? `The verification decision could not be sent: ${message}` : 'The verification decision could not be sent. Please try again.'
}

// provider-operations.js actionButtons() / openActionModal(): Active providers can be suspended, Suspended
// ones activated; anyone else (under verification, rejected) has no status action.
export function providerStatusAction(provider) {
  if (provider?.accountStatus === 'Active') return {
    nextStatus: 'Suspended', label: 'Suspend', tone: 'danger', title: 'Suspend Provider',
    prompt: 'Enter the suspension reason before blocking this verified provider from operations.',
    placeholder: 'Required suspension reason', confirm: 'Confirm Suspend', pending: 'Suspending…', required: 'Suspension reason is required.',
  }
  if (provider?.accountStatus === 'Suspended') return {
    nextStatus: 'Active', label: 'Activate', tone: 'success', title: 'Activate Provider',
    prompt: 'Confirm reactivation for this previously suspended verified provider.',
    placeholder: 'Required activation reason', confirm: 'Confirm Activate', pending: 'Activating…', required: 'Activation reason is required.',
  }
  return null
}

export function providerStatusNotice({ provider, changed } = {}) {
  const name = provider?.organisationName || provider?.fullName || provider?.id || 'The provider'
  const suspended = provider?.accountStatus === 'Suspended'
  if (!changed) return suspended ? `${name} is already suspended.` : `${name} is already active.`
  return suspended ? `${name} has been suspended and signed out of ServeEase.` : `${name} has been activated and can sign in again.`
}

export function providerStatusError(error) {
  const message = error?.message || ''
  if (error?.status === 401 || /authentication is required|session is invalid or expired/i.test(message)) return 'Your session has expired or was signed out.'
  if (error?.status === 403) return message || 'You do not have permission to change this provider\'s status.'
  if (error?.status === 404) return 'This provider record no longer exists. Refresh the list and try again.'
  if (error?.status === 400 || error?.status === 409) return message || 'The status change was not accepted.'
  if (error?.status >= 500) return 'The server could not update the provider status. Please try again.'
  return message ? `The status change could not be sent: ${message}` : 'The status change could not be sent. Please try again.'
}

// What the document preview dialog can show for a fetched file type.
export function previewKind(type) {
  if (/^image\/(png|jpe?g|webp)$/i.test(type || '')) return 'image'
  if (/^application\/pdf$/i.test(type || '')) return 'pdf'
  return 'unsupported'
}

export function previewError(error) {
  if (error?.status === 401 || /authentication is required/i.test(error?.message || '')) return 'Your session has expired or was signed out. Sign in again to preview documents.'
  if (error?.status === 403) return error.message || 'You do not have permission to preview this document.'
  if (error?.status === 404) return error.message || 'This document file was not found.'
  return error?.message ? `The document could not be loaded: ${error.message}` : 'The document could not be loaded. Please try again.'
}

// Fetches one document for the preview dialog and reports each state through `update`. Returns a cleanup
// that ignores late results and revokes the temporary object URL, so no blob URL outlives the dialog.
export function startPreview(load, update, urls = URL) {
  let active = true
  let objectUrl = ''
  load().then((blob) => {
    if (!active) return
    const kind = previewKind(blob?.type)
    if (kind === 'unsupported') { update({ state: 'unsupported', type: blob?.type || 'unknown' }); return }
    objectUrl = urls.createObjectURL(blob)
    update({ state: 'ready', kind, url: objectUrl, type: blob.type })
  }).catch((error) => { if (active) update({ state: 'error', message: previewError(error) }) })
  return () => { active = false; if (objectUrl) urls.revokeObjectURL(objectUrl) }
}

// Why a document has no preview. The canonical registry sends its own `message`; these cover its states when
// a message is absent.
const UNAVAILABLE = {
  'awaiting-browser-import': 'Preview unavailable. This file was kept only in the web browser where the provider registered on the original ServeEase site; it can be shown here once it is imported from that browser.',
  'pending-migration': 'Preview unavailable. This file was uploaded with the original ServeEase site and has not been moved to secure storage yet.',
  'awaiting-upload': 'Preview unavailable. No file has been uploaded for this document yet.',
  'missing-source': 'Preview unavailable. The uploaded file for this document is missing from the server.',
  'storage-missing': 'Preview unavailable. The stored file for this document is missing from the server.',
  'unsupported-source': 'Preview unavailable. The stored file is not a PNG, JPEG, WebP or PDF document.',
}
export function unavailableMessage(reason) {
  return UNAVAILABLE[reason] || "Preview unavailable. ServeEase keeps only this document's details on the server; the file itself was not uploaded, so it cannot be displayed or reviewed here."
}
