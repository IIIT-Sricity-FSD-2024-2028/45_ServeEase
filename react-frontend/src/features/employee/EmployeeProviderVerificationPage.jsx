import { useMemo, useReducer, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../context/useAuth'
import { employeeOperationsApi } from '../../services/api'
import {
  clearEmployeeMutationState,
  decideEmployeeProviderVerification,
  fetchEmployeeProviderNotifications,
  fetchEmployeeProviderById,
  providerOperationEntityKey,
  selectEmployeeMutationError,
  selectEmployeeMutationStatus,
  selectEmployeeProviderDetail,
  selectEmployeeProviderDetailFetchError,
  selectEmployeeProviderDetailFetchStatus,
} from '../../store/slices/employeeOperationsSlice.js'
import { useAppDispatch, useAppSelector } from '../../store/hooks.js'
import { Breadcrumb } from './EmployeeOpsParts'
import { initialStatusChange, statusChangeReducer } from './employeeOperations'
import { DecisionDialog, DocumentPreviewDialog, LoadState, ProviderNotFound } from './ProviderOpsParts'
import { decisionBlocker, decisionError, decisionNotice, display, formatDate, formatExperience, validateDecision, verificationDecisions } from './providerOperations'
import { useOperationsData } from './useOperationsData'
import './providerOperations.css'

function Field({ label, value }) {
  return <div className="provider-verification-review-field"><span>{label}</span><strong>{display(value)}</strong></div>
}

// provider-verification-review.html content; `data` is GET .../providers/:id.
export function VerificationReview({ data, busy, onDecide, onPreview }) {
  const { provider, documents = [] } = data
  const pending = provider.accountStatus === 'Under Verification'
  const blocker = decisionBlocker(provider, documents)
  return <div className="provider-verification-review-grid">
    <section aria-labelledby="provider-review-info-title" className="provider-verification-review-card">
      <h2 id="provider-review-info-title">Provider Information</h2>
      <div className="provider-verification-review-info">
        <Field label="Provider ID" value={provider.id} />
        <Field label="Provider Name" value={provider.fullName} />
        <Field label="Organisation" value={provider.organisationName} />
        <Field label="Email" value={provider.email} />
        <Field label="Phone" value={provider.phone} />
        <Field label="Service Category" value={provider.serviceType} />
        <Field label="Experience" value={provider.experience === null || provider.experience === undefined ? null : formatExperience(provider.experience)} />
        <Field label="Location" value={provider.location} />
        <Field label="Submitted" value={provider.registrationDate && formatDate(provider.registrationDate)} />
        <Field label="Account Status" value={provider.accountStatus} />
      </div>
    </section>

    <section aria-labelledby="provider-review-documents-title" className="provider-verification-review-card">
      <h2 id="provider-review-documents-title">Verification Documents</h2>
      <div className="provider-verification-review-documents">
        {documents.length ? documents.map((document) => <div className="provider-verification-review-document" key={document.documentId}>
          <div><span>{document.documentType || 'Document'}</span><strong>{document.documentName || 'Not submitted'}</strong></div>
          <div className="provider-verification-review-document-meta"><span>{document.documentStatus || 'Pending'}</span><button className="btn btn-outline" onClick={() => onPreview(document)} type="button">Preview</button></div>
        </div>) : <p className="provider-verification-review-empty">No verification documents are recorded for this provider.</p>}
      </div>
    </section>

    <section aria-labelledby="provider-review-decision-title" className="provider-verification-review-card provider-verification-review-decision">
      <h2 id="provider-review-decision-title">Verification Decision</h2>
      <p>Approval activates the provider for normal dashboard operations. Rejection preserves the profile and records a reason for resubmission.</p>
      {blocker && <p id="provider-decision-note">{blocker}</p>}
      <div className="provider-verification-review-actions">
        <button aria-describedby={blocker ? 'provider-decision-note' : undefined} className="btn btn-primary" disabled={busy || Boolean(blocker)} onClick={() => onDecide('approve')} type="button">Approve</button>
        <button aria-describedby={blocker && !pending ? 'provider-decision-note' : undefined} className="btn btn-outline provider-verification-review-reject" disabled={busy || !pending} onClick={() => onDecide('reject')} type="button">Reject</button>
      </div>
    </section>
  </div>
}

// provider-verification-review.html?id= → /employee/provider-operations/:providerId/verification-review.
// The decision is applied only after the server confirms it, then the list reloads (as the original redirect did).
export default function EmployeeProviderVerificationPage() {
  const { providerId } = useParams()
  const [params] = useSearchParams()
  const listing = params.get('listing') || undefined
  const requestArg = useMemo(() => ({ providerId, listing }), [providerId, listing])
  const dataSelector = useMemo(() => selectEmployeeProviderDetail(providerId, listing), [providerId, listing])
  const statusSelector = useMemo(() => selectEmployeeProviderDetailFetchStatus(providerId, listing), [providerId, listing])
  const errorSelector = useMemo(() => selectEmployeeProviderDetailFetchError(providerId, listing), [providerId, listing])
  const { state, data, error, retry } = useOperationsData(fetchEmployeeProviderById, requestArg, dataSelector, statusSelector, errorSelector)
  const dispatchStore = useAppDispatch()
  const mutationKey = providerOperationEntityKey(providerId, listing)
  const mutationStatusSelector = useMemo(() => selectEmployeeMutationStatus('decideProviderVerificationByKey', mutationKey), [mutationKey])
  const mutationErrorSelector = useMemo(() => selectEmployeeMutationError('decideProviderVerificationByKey', mutationKey), [mutationKey])
  const mutationStatus = useAppSelector(mutationStatusSelector)
  const mutationError = useAppSelector(mutationErrorSelector)
  const [change, dispatch] = useReducer(statusChangeReducer, initialStatusChange)
  const [preview, setPreview] = useState(null)
  // The loader is created once per opened document so the dialog fetches the file exactly once.
  const openPreview = (document) => setPreview({ document, load: () => employeeOperationsApi.providerDocument(providerId, listing, document.documentId) })
  const { logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const notFound = state === 'error' && /not found|invalid provider id/i.test(error)
  const provider = data?.provider
  const copy = change.nextStatus ? verificationDecisions[change.nextStatus] : null

  const submit = async (decision) => {
    dispatch({ type: 'submit' })
    try {
      const result = await dispatchStore(decideEmployeeProviderVerification({ providerId: provider.id, listing, decision })).unwrap()
      dispatch({ type: 'succeeded', message: decisionNotice(result.provider, decision.decision) })
      dispatchStore(fetchEmployeeProviderNotifications())
      navigate('/employee/provider-operations', { state: { notice: decisionNotice(result.provider, decision.decision) } })
    } catch (requestError) {
      const message = typeof requestError === 'string' ? requestError : requestError?.message
      dispatch({ type: 'failed', message: decisionError({ message: mutationError || message }) })
    }
  }
  // The stored session is no longer accepted: clear it so the login page does not bounce back here.
  const signInAgain = async () => {
    await logout()
    navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}` } })
  }

  const hero = !provider ? 'Approve or reject a pending provider verification request.'
    : provider.accountStatus === 'Under Verification' ? `${display(provider.organisationName || provider.fullName)} is awaiting verification review.`
      : `${display(provider.organisationName || provider.fullName)} has no pending verification request.`

  return <div className="provider-ops provider-ops--review">
    <Breadcrumb items={[['Provider Operations', '/employee/provider-operations'], ['Verification Review']]} />
    <section aria-labelledby="provider-review-title" className="provider-operations-hero">
      <h1 id="provider-review-title">Provider Verification Review</h1>
      <p>{hero}</p>
    </section>
    {notFound ? <ProviderNotFound message="The selected provider does not match an existing pending verification request." />
      : <LoadState error={error} loadingText="Loading verification request…" onRetry={retry} state={state} />}
    {state === 'ready' && provider && <VerificationReview busy={mutationStatus === 'loading'} data={data} onDecide={(decision) => {
      dispatchStore(clearEmployeeMutationState({ operation: 'decideProviderVerificationByKey', key: mutationKey }))
      dispatch({ type: 'open', nextStatus: decision })
    }} onPreview={openPreview} />}
    {change.phase !== 'idle' && copy && <DecisionDialog
      change={{
        ...change,
        phase: mutationStatus === 'loading' ? 'submitting' : change.phase,
        error: mutationStatus === 'failed' ? mutationError || change.error : change.error,
      }}
      copy={copy}
      onCancel={() => {
        if (mutationStatus === 'loading') return
        dispatchStore(clearEmployeeMutationState({ operation: 'decideProviderVerificationByKey', key: mutationKey }))
        dispatch({ type: 'cancel' })
      }}
      onConfirm={submit}
      onInvalid={(message) => dispatch({ type: 'invalid', message })}
      onSignIn={signInAgain}
      validate={validateDecision}
    />}
    {preview && <DocumentPreviewDialog document={preview.document} load={preview.load} onClose={() => setPreview(null)} />}
  </div>
}
