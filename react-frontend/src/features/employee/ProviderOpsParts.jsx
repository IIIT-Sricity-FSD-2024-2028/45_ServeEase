import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { chipClass, display, startPreview, unavailableMessage } from './providerOperations'

// statusChip()
export function Chip({ value }) {
  const label = display(value)
  return <span className={`provider-operations-chip ${chipClass(label)}`}>{label}</span>
}

export function LoadState({ state, error, loadingText, onRetry }) {
  if (state === 'loading') return <div className="provider-operations-state" role="status">{loadingText}</div>
  if (state === 'error') return <div className="provider-operations-state provider-operations-state--error" role="alert">
    <p>{error}</p>
    <button className="btn btn-outline" onClick={onRetry} type="button">Retry</button>
  </div>
  return null
}

// provider-operations-detail.html / provider-verification-review.html "Provider not found." card.
export function ProviderNotFound({ message }) {
  return <section className="provider-operations-not-found" role="alert">
    <h2>Provider not found.</h2>
    <p>{message}</p>
    <Link className="btn btn-outline" to="/employee/provider-operations">← Back to Provider Operations</Link>
  </section>
}

// Escape closes an overlay unless it is busy; focus moves into the panel when it opens.
function useOverlay(onClose, busy) {
  const panelRef = useRef(null)
  useEffect(() => {
    panelRef.current?.focus()
  }, [])
  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !busy) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [busy, onClose])
  return panelRef
}

// The original document preview (front-end/JavaScript/attachments.js previewProviderDocument): document type
// heading, file name, then Filename / File Type / Status / Preview. Files are fetched with the session token
// and shown from a temporary object URL that is revoked on close. `load` returns a Promise<Blob>.
export function DocumentPreviewDialog({ document, load, onClose }) {
  const panelRef = useOverlay(onClose, false)
  const [preview, setPreview] = useState(() => (document.hasFile ? { state: 'loading' } : { state: 'unavailable' }))
  useEffect(() => (document.hasFile ? startPreview(load, setPreview) : undefined), [document.hasFile, load])

  const filename = display(document.documentName)
  const fileType = preview.state === 'ready' ? preview.type : document.fileType
  return <div className="attachment-preview-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div aria-labelledby="provider-document-preview-title" aria-modal="true" className="attachment-preview-modal" ref={panelRef} role="dialog" tabIndex={-1}>
      <div className="attachment-preview-header">
        <div>
          <h3 id="provider-document-preview-title">{document.documentType || 'Provider document'}</h3>
          <p>{filename}</p>
        </div>
        <button aria-label="Close" className="attachment-preview-close" onClick={onClose} type="button">×</button>
      </div>
      <div aria-live="polite" className="attachment-preview-body">
        <div className="attachment-preview-content">
          <strong>Filename</strong><span>{filename}</span>
          <strong>File Type</strong><span>{fileType || 'Unknown'}</span>
          <strong>Status</strong><span>{document.documentStatus || 'Pending'}</span>
          <strong>Preview</strong><span />
          {preview.state === 'loading' && <div className="attachment-preview-placeholder" role="status">Loading document…</div>}
          {preview.state === 'ready' && preview.kind === 'image' && <img alt={filename} className="attachment-preview-media" src={preview.url} />}
          {preview.state === 'ready' && preview.kind === 'pdf' && <>
            <iframe className="attachment-preview-frame" src={preview.url} title={filename} />
            <a className="btn btn-outline attachment-preview-open" href={preview.url} rel="noopener" target="_blank">Open PDF in new tab</a>
          </>}
          {preview.state === 'unavailable' && <div className="attachment-preview-placeholder"><p>{document.message || unavailableMessage(document.unavailableReason)}</p></div>}
          {preview.state === 'unsupported' && <div className="attachment-preview-placeholder"><strong>📎 {filename}</strong><p>This file type ({preview.type}) does not support inline preview.</p></div>}
          {preview.state === 'error' && <div className="attachment-preview-placeholder attachment-preview-placeholder--error" role="alert"><p>{preview.message}</p></div>}
        </div>
      </div>
      <div className="attachment-preview-footer">
        <button className="btn btn-outline btn-full" onClick={onClose} type="button">Close</button>
      </div>
    </div>
  </div>
}

// #providerOperationsActionModal: suspend/activate confirmation with a required reason and optional admin
// remarks. It stays open and locked while the request runs, and shows server errors in place.
export function ProviderStatusModal({ action, providerName, change, onCancel, onConfirm, onInvalid, onSignIn }) {
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const submitting = change.phase === 'submitting'
  const panelRef = useOverlay(onCancel, submitting)
  const sessionExpired = /session has expired/i.test(change.error)
  const confirm = (event) => {
    event.preventDefault()
    if (!reason.trim()) { onInvalid(action.required); return }
    onConfirm({ status: action.nextStatus, reason: reason.trim(), ...(remarks.trim() ? { remarks: remarks.trim() } : {}) })
  }
  return <div className="provider-operations-modal">
    <form aria-labelledby="provider-operations-modal-title" aria-modal="true" className="provider-operations-modal-panel" noValidate onSubmit={confirm} ref={panelRef} role="dialog" tabIndex={-1}>
      <h2 id="provider-operations-modal-title">{action.title}</h2>
      <p>{action.prompt} <strong>{providerName}</strong></p>
      <label htmlFor="provider-status-reason">Reason <span className="provider-operations-required">*</span>
        <textarea aria-invalid={change.error === action.required} disabled={submitting} id="provider-status-reason" maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder={action.placeholder} rows="3" value={reason} />
      </label>
      <label htmlFor="provider-status-remarks">Admin Remarks <span>(optional)</span>
        <textarea disabled={submitting} id="provider-status-remarks" maxLength={1000} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional internal remarks" rows="3" value={remarks} />
      </label>
      <p aria-live="polite" className="provider-operations-modal-error" role="alert">{change.error}{sessionExpired && <> <button className="provider-operations-link-button" onClick={onSignIn} type="button">Sign in again</button></>}</p>
      <div className="provider-operations-modal-actions">
        <button className="btn btn-outline" disabled={submitting} onClick={onCancel} type="button">Cancel</button>
        <button aria-busy={submitting} className="btn btn-primary" disabled={submitting} type="submit">{submitting ? action.pending : action.confirm}</button>
      </div>
    </form>
  </div>
}

// #providerVerificationDecisionModal: approval takes optional remarks; rejection needs a reason. The dialog
// stays open and locked while the request runs, and shows server errors in place.
export function DecisionDialog({ copy, change, onCancel, onConfirm, onInvalid, onSignIn, validate }) {
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const submitting = change.phase === 'submitting'
  const reject = copy.decision === 'reject'
  const panelRef = useOverlay(onCancel, submitting)
  const sessionExpired = /session has expired/i.test(change.error)

  const confirm = (event) => {
    event.preventDefault()
    const problem = validate(copy.decision, reason)
    if (problem) { onInvalid(problem); return }
    onConfirm({ decision: copy.decision, ...(reject ? { reason: reason.trim() } : {}), ...(remarks.trim() ? { remarks: remarks.trim() } : {}) })
  }

  return <div className="provider-verification-review-modal">
    <form aria-labelledby="provider-verification-modal-title" aria-modal="true" className="provider-verification-review-modal-panel" noValidate onSubmit={confirm} ref={panelRef} role="dialog" tabIndex={-1}>
      <h2 id="provider-verification-modal-title">{copy.title}</h2>
      <p>{copy.prompt}</p>
      {reject && <label htmlFor="provider-verification-reason">Reason
        <textarea aria-invalid={/rejection reason/i.test(change.error)} disabled={submitting} id="provider-verification-reason" maxLength={300} onChange={(event) => setReason(event.target.value)} placeholder="Required rejection reason" rows="3" value={reason} />
      </label>}
      <label htmlFor="provider-verification-remarks">Remarks
        <textarea disabled={submitting} id="provider-verification-remarks" maxLength={500} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional internal remarks" rows="3" value={remarks} />
      </label>
      <p aria-live="polite" className="provider-verification-review-error" role="alert">{change.error}{sessionExpired && <> <button className="provider-operations-link-button" onClick={onSignIn} type="button">Sign in again</button></>}</p>
      <div className="provider-verification-review-modal-actions">
        <button aria-busy={submitting} className="btn btn-primary" disabled={submitting} type="submit">{submitting ? copy.pending : copy.confirm}</button>
        <button className="btn btn-outline" disabled={submitting} onClick={onCancel} type="button">Cancel</button>
      </div>
    </form>
  </div>
}
