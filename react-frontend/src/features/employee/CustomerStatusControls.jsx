import { useEffect, useRef, useState } from 'react'

// customer-operations-detail.html Actions row: Suspend (danger) or Activate (success). `action` is null for a
// recorded status this workspace does not manage.
export function CustomerStatusAction({ action, change, onOpen, status }) {
  const submitting = change.phase === 'submitting'
  const note = !action
    ? `Account status "${status}" cannot be changed from Customer Operations.`
    : action.nextStatus === 'Blocked'
      ? 'Suspending blocks sign-in and ends the customer\'s active sessions.'
      : 'This customer cannot sign in or use customer services until reactivated.'
  return <section className="account-actions">
    <div>
      <h2>Actions</h2>
      <p className="ops-muted" id="customer-status-note">{note}</p>
      {change.notice && <p className="ops-notice" role="status">{change.notice}</p>}
    </div>
    {action && <button aria-describedby="customer-status-note" className={`btn ${action.tone}`} disabled={submitting} onClick={onOpen} type="button">
      {submitting ? action.pending : action.label}
    </button>}
  </section>
}

// customer-operations-detail.html #customerOperationsStatusDialog: modal confirmation with a required reason
// and optional admin remarks. It stays open, and cannot be dismissed, while the request is in flight.
export function CustomerStatusDialog({ action, change, customerName, onCancel, onConfirm, onInvalid, onSignIn }) {
  const dialogRef = useRef(null)
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const submitting = change.phase === 'submitting'
  const sessionExpired = /session has expired/i.test(change.error)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open && typeof dialog.showModal === 'function') dialog.showModal()
    return () => { if (dialog?.open) dialog.close() }
  }, [])

  const confirm = (event) => {
    event.preventDefault()
    if (!reason.trim()) { onInvalid('A reason is required.'); return }
    onConfirm({ reason: reason.trim(), ...(remarks.trim() ? { remarks: remarks.trim() } : {}) })
  }

  return <dialog aria-labelledby="customer-status-dialog-title" className="ops-status-dialog" onCancel={(event) => { event.preventDefault(); onCancel() }} ref={dialogRef}>
    <form className="ops-status-modal" noValidate onSubmit={confirm}>
      <header className="ops-status-modal-header"><h2 id="customer-status-dialog-title">{action.verb} Customer</h2></header>
      <div className="ops-status-modal-body">
        <p>{action.verb} {customerName}?</p>
        <label htmlFor="customer-status-reason">Reason <span aria-hidden="true">*</span></label>
        <textarea aria-invalid={change.error === 'A reason is required.'} disabled={submitting} id="customer-status-reason" maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder="Enter the reason for this account action" required rows="4" value={reason} />
        <label htmlFor="customer-status-remarks">Admin Remarks <span>(optional)</span></label>
        <textarea disabled={submitting} id="customer-status-remarks" maxLength={1000} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional operational remarks" rows="4" value={remarks} />
        <small aria-live="polite" className="error" role="alert">{change.error}{sessionExpired && <> <button className="ops-link-button" onClick={onSignIn} type="button">Sign in again</button></>}</small>
      </div>
      <footer className="ops-status-modal-actions">
        <button className="btn btn-outline" disabled={submitting} onClick={onCancel} type="button">Cancel</button>
        <button aria-busy={submitting} className={`btn ${action.tone}`} disabled={submitting} type="submit">{submitting ? action.pending : `Confirm ${action.verb}`}</button>
      </footer>
    </form>
  </dialog>
}
