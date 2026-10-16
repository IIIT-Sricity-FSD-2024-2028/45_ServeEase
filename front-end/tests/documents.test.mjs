// Legacy front end: provider document preview and browser import go through the canonical API.
// Runs the real JavaScript/api.js and JavaScript/attachments.js in a VM with a minimal DOM and stubbed fetch.
//   node --test front-end/tests/documents.test.mjs
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const source = (name) => readFileSync(fileURLToPath(new URL(`../JavaScript/${name}`, import.meta.url)), 'utf8')
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function element(id) {
  const listeners = {}
  return {
    id, textContent: '', innerHTML: '', classes: new Set(['hidden']),
    classList: { add(name) { this.owner.classes.add(name) }, remove(name) { this.owner.classes.delete(name) }, contains(name) { return this.owner.classes.has(name) } },
    addEventListener(type, handler) { (listeners[type] ||= []).push(handler) },
    fire(type, event = {}) { (listeners[type] || []).forEach((handler) => handler({ target: this, ...event })) },
  }
}

function environment({ responses, storage = {}, session = { role: 'support', token: 'tok' } }) {
  const elements = {}
  const calls = []
  const revoked = []
  let objectUrls = 0
  const document = {
    body: {
      insertAdjacentHTML(_where, html) {
        for (const [, id] of html.matchAll(/id="([^"]+)"/g)) { const node = element(id); node.classList.owner = node; elements[id] = node }
      },
    },
    getElementById: (id) => elements[id] || null,
    addEventListener() {},
  }
  const fetchStub = async (url, options = {}) => {
    calls.push({ url: String(url), method: options.method || 'GET', auth: options.headers?.Authorization || null, body: options.body })
    if (String(url).startsWith('data:')) throw new TypeError('Failed to fetch') // like the pages' CSP: data: URLs cannot be fetched
    const responder = responses.find(([pattern]) => pattern.test(String(url)))
    if (!responder) throw new TypeError('Failed to fetch')
    return responder[1](options)
  }
  const window = {
    addEventListener() {},
    dispatchEvent() {},
  }
  const context = {
    window, document, fetch: fetchStub, Response, Blob, FormData, CustomEvent: class {}, performance, atob,
    URL: { createObjectURL: () => `blob:test/${++objectUrls}`, revokeObjectURL: (url) => revoked.push(url) },
    sessionStorage: { getItem: (key) => (key === 'serveEaseSession' ? JSON.stringify(session) : null), setItem() {}, removeItem() {} },
    localStorage: { getItem: (key) => (key in storage ? storage[key] : null), setItem() {}, removeItem() {}, key: () => null, get length() { return Object.keys(storage).length } },
    console,
  }
  context.window = Object.assign(window, context)
  vm.createContext(context)
  vm.runInContext(source('api.js'), context)
  vm.runInContext(source('attachments.js'), context)
  return { attachments: context.window.ServeEaseAttachments, elements, calls, revoked }
}

const json = (data, status = 200) => () => new Response(JSON.stringify(status === 200 ? { success: true, data } : data), { status, headers: { 'Content-Type': 'application/json' } })
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(16, 1)])
const doc = { documentId: 'DOC-PRO144-4', documentType: 'Profile Photo', documentName: 'ele1.jpg.jpeg', documentStatus: 'Approved' }

test('the client-side source resolver is gone; previews and imports are the only document entry points', () => {
  const { attachments } = environment({ responses: [] })
  assert.equal(attachments.canonicalResolveProviderDocument, undefined)
  assert.equal(typeof attachments.previewProviderDocument, 'function')
  assert.equal(typeof attachments.importBrowserDocument, 'function')
})

test('preview shows the canonical file with canonical metadata and revokes the object URL on close', async () => {
  const meta = { ...doc, documentStatus: 'Approved', hasFile: true, fileType: 'image/jpeg', state: 'stored' }
  const env = environment({ responses: [
    [/\/documents\/DOC-PRO144-4\/preview$/, () => new Response(JPEG, { headers: { 'Content-Type': 'image/jpeg' } })],
    [/\/documents\/DOC-PRO144-4$/, json(meta)],
  ] })
  assert.equal(env.attachments.previewProviderDocument('PRO144', doc), true)
  assert.match(env.elements.attachmentPreviewBody.innerHTML, /Loading document…/)
  await flush(); await flush(); await flush()
  assert.deepEqual(env.calls.map((call) => [call.url, call.auth]), [
    ['http://localhost:3000/api/employee/provider-operations/providers/PRO144/documents/DOC-PRO144-4', 'Bearer tok'],
    ['http://localhost:3000/api/employee/provider-operations/providers/PRO144/documents/DOC-PRO144-4/preview', 'Bearer tok'],
  ])
  assert.equal(env.elements.attachmentPreviewTitle.textContent, 'Profile Photo')
  assert.equal(env.elements.attachmentPreviewSubtitle.textContent, 'ele1.jpg.jpeg')
  assert.match(env.elements.attachmentPreviewBody.innerHTML, /<strong>File Type<\/strong><span>image\/jpeg<\/span><strong>Status<\/strong><span>Approved<\/span>/)
  assert.match(env.elements.attachmentPreviewBody.innerHTML, /<img class="attachment-preview-media" src="blob:test\/1"/)
  assert.equal(env.elements.serveEaseAttachmentPreviewModal.classes.has('hidden'), false)
  env.elements.attachmentPreviewClose.fire('click')
  assert.deepEqual(env.revoked, ['blob:test/1'])
})

test('a document without a stored file shows the registry message and never fetches bytes', async () => {
  const env = environment({ responses: [[/\/documents\/DOC-PRO140-1$/, json({ documentId: 'DOC-PRO140-1', documentType: 'ID Proof - Aadhaar', documentName: 'homecleaning 4.jpg.jpeg', hasFile: false, state: 'awaiting-browser-import', message: "This document's file was kept only in the web browser where the provider registered." })]] })
  env.attachments.previewProviderDocument('PRO140', { documentId: 'DOC-PRO140-1', documentType: 'ID Proof - Aadhaar', documentName: 'homecleaning 4.jpg.jpeg' })
  await flush(); await flush()
  assert.equal(env.calls.length, 1)
  assert.match(env.elements.attachmentPreviewBody.innerHTML, /kept only in the web browser where the provider registered/)
  assert.doesNotMatch(env.elements.attachmentPreviewBody.innerHTML, /<img|<iframe/)
})

test('refusals and network failures are reported as such, not as missing files', async () => {
  const refused = environment({ responses: [[/\/documents\//, json({ statusCode: 403, message: 'Your department does not have access to this resource.' }, 403)]] })
  refused.attachments.previewProviderDocument('PRO144', doc)
  await flush(); await flush()
  assert.match(refused.elements.attachmentPreviewBody.innerHTML, /role="alert"><p>You are not allowed to view this document\.<\/p>/)
  const offline = environment({ responses: [] })
  offline.attachments.previewProviderDocument('PRO144', doc)
  await flush(); await flush()
  assert.match(offline.elements.attachmentPreviewBody.innerHTML, /The ServeEase server could not be reached/)
})

test('browser import sends this browser\'s bytes for the exact document, and refuses when the browser holds none', async () => {
  const storage = { 'serveEaseProviderDocuments:PRO140': JSON.stringify({ 'DOC-PRO140-1': { name: 'homecleaning 4.jpg.jpeg', type: 'image/jpeg', dataUrl: `data:image/jpeg;base64,${JPEG.toString('base64')}` } }) }
  const env = environment({ storage, responses: [[/\/browser-import$/, json({ imported: true, document: { state: 'stored' } })]] })
  const record = { documentId: 'DOC-PRO140-1', documentName: 'homecleaning 4.jpg.jpeg' }
  assert.equal(env.attachments.hasBrowserCopy('PRO140', 'DOC-PRO140-1'), true)
  assert.equal(env.attachments.hasBrowserCopy('PRO140', 'DOC-PRO140-2'), false)
  const result = await env.attachments.importBrowserDocument('PRO140', record)
  assert.deepEqual(result, { imported: true, document: { state: 'stored' } })
  const upload = env.calls.find((call) => call.method === 'POST')
  assert.equal(upload.url, 'http://localhost:3000/api/employee/provider-operations/providers/PRO140/documents/DOC-PRO140-1/browser-import')
  assert.equal(upload.auth, 'Bearer tok')
  const sent = upload.body.get('file')
  assert.equal(sent.name, 'homecleaning 4.jpg.jpeg')
  assert.deepEqual(Buffer.from(await sent.arrayBuffer()), JPEG)
  await assert.rejects(env.attachments.importBrowserDocument('PRO140', { documentId: 'DOC-PRO140-2', documentName: 'x.jpeg' }), /does not hold the file/)
})

test('pages list documents from the canonical registry, and fall back to their own record only when it is unavailable', async () => {
  const documents = [{ documentId: 'DOC-PRO144-1', documentType: 'ID Proof - Aadhaar', recordOrigin: 'approval-request', state: 'stored', hasFile: true }]
  const env = environment({ responses: [[/\/providers\/PRO144\/documents$/, json(documents)]] })
  assert.deepEqual(await env.attachments.loadCanonicalDocuments('PRO144'), documents)
  assert.equal(env.calls[0].auth, 'Bearer tok')
  const refused = environment({ responses: [[/\/documents$/, json({ statusCode: 403, message: 'Forbidden' }, 403)]] })
  assert.equal(await refused.attachments.loadCanonicalDocuments('PRO144'), null)
})
