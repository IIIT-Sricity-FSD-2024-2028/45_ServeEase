// Verification files chosen at provider signup. The server checks type, contents and size again; these
// checks only explain the rules before anything is sent.
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
const ALLOWED = { idProof: ['.pdf', '.jpg', '.jpeg', '.png'], addressProof: ['.pdf', '.jpg', '.jpeg', '.png'], skillCertificate: ['.pdf', '.jpg', '.jpeg', '.png'], experienceProof: ['.pdf', '.jpg', '.jpeg', '.png'], profilePhoto: ['.jpg', '.jpeg', '.png'] }

export function documentFileError(field, file) {
  if (!file) return ''
  const extension = (String(file.name || '').match(/\.[^.]+$/)?.[0] || '').toLowerCase()
  const allowed = ALLOWED[field] || ALLOWED.idProof
  if (!allowed.includes(extension)) return field === 'profilePhoto' ? 'Upload a JPG or PNG image.' : 'Upload a PDF, JPG or PNG file.'
  if (!file.size) return 'The selected file is empty.'
  if (file.size > MAX_DOCUMENT_BYTES) return 'The file must be 5 MB or smaller.'
  return ''
}

// Uploads each chosen file to the document the server recorded for it at registration (matched by the
// document type the form sent). Returns the documents that could not be uploaded, with the server's reason.
export async function uploadRegisteredDocuments({ user, token, files, upload }) {
  const failures = []
  for (const document of user?.documents || []) {
    const file = files[document.documentType]
    if (!file || !document.documentId) continue
    try {
      await upload(document.documentId, file, { token })
    } catch (error) {
      failures.push({ documentType: document.documentType, name: file.name, message: error.message || 'Upload failed.' })
    }
  }
  return failures
}
