import { useState } from 'react'

const extensionOf = (name) => (String(name || '').match(/\.([a-z0-9]+)(?:[?#].*)?$/i)?.[1] || '').toLowerCase()
const typeLabel = (ticket, extension) => ticket.attachmentType || (extension ? extension.toUpperCase() : 'File')

// The evidence a customer or provider attached to the ticket, with an in-page preview for images and PDFs
// (the original support page's "Preview attachment") plus Open and Download links.
export function AttachmentPreview({ ticket, apiBaseUrl }) {
  const [open, setOpen] = useState(false)
  const url = String(ticket.attachmentUrl || '')
  if (!url) return <div className="support-original-attachment support-attachment-empty"><strong>Attachment</strong><small>No document was attached to this ticket.</small></div>

  const href = /^https?:\/\//i.test(url) ? url : `${new URL(apiBaseUrl).origin}${url.startsWith('/') ? '' : '/'}${url}`
  const name = ticket.attachmentName || decodeURIComponent(url.split('/').pop().split('?')[0])
  const extension = extensionOf(name)
  const isImage = ['png', 'jpg', 'jpeg', 'webp'].includes(extension)
  const isPdf = extension === 'pdf'

  return <div className="support-original-attachment">
    <div className="support-original-attachment-row">
      <span aria-hidden="true">📎</span><strong>{name}</strong><span>·</span><span>{typeLabel(ticket, extension)}</span>
      {(isImage || isPdf) && <button aria-expanded={open} className="support-attachment-toggle" onClick={() => setOpen((value) => !value)} type="button">{open ? 'Hide preview' : 'Preview attachment'}</button>}
      <a href={href} rel="noreferrer" target="_blank">Open</a>
      <a download href={href}>Download</a>
    </div>
    {open && isImage && <img alt={`Attachment ${name}`} className="support-attachment-media" src={href} />}
    {open && isPdf && <iframe className="support-attachment-frame" src={href} title={`Attachment ${name}`} />}
    {!isImage && !isPdf && <small>Preview is available for images and PDFs only; use Open or Download.</small>}
  </div>
}
