(function () {
  const providerKey = function (providerId) { return "serveEaseProviderDocuments:" + providerId; };
  const ticketKey = "serveEaseTicketAttachments";

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error); };
      reader.readAsDataURL(file);
    });
  }

  function readJson(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || "null") || fallback; } catch (error) { return fallback; }
  }

  function getProviderPreview(providerId, documentId) {
    const previews = readJson(providerKey(providerId), {});
    return previews[documentId] || null;
  }

  // A copy of a document that the original signup kept only in this browser (localStorage data URL). It is
  // never shown directly: it can only be imported into the canonical registry, which then serves it.
  function browserCopy(providerId, documentId) {
    const stored = getProviderPreview(providerId, documentId);
    const dataUrl = stored && (stored.dataUrl || stored.previewUrl || stored.url);
    return dataUrl && String(dataUrl).indexOf("data:") === 0
      ? { dataUrl: dataUrl, name: stored.name || stored.filename || "", type: stored.type || stored.mimeType || "" }
      : null;
  }

  function removeTicketAliases(attachments) {
    Object.keys(attachments).forEach(function (key) {
      const record = attachments[key];
      if (record && record.attachmentId && key !== record.attachmentId) delete attachments[key];
    });
  }

  function saveTicketAttachment(ticketId, file) {
    if (!ticketId || !file) return Promise.resolve(null);
    return readFileAsDataUrl(file).then(function (dataUrl) {
      const attachments = readJson(ticketKey, {});
      removeTicketAliases(attachments);
      const attachmentId = "ATT-" + ticketId + "-" + Date.now();
      const record = {
        attachmentId: attachmentId,
        ticketId: ticketId,
        filename: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size || 0,
        uploadedAt: new Date().toISOString(),
        dataUrl: dataUrl
      };
      attachments[attachmentId] = record;
      localStorage.setItem(ticketKey, JSON.stringify(attachments));
      return record;
    });
  }

  function getTicketAttachment(ticket) {
    if (!ticket) return null;
    const attachments = readJson(ticketKey, {});
    const direct = ticket.attachmentId ? attachments[ticket.attachmentId] : null;
    if (direct) return direct;

    const ticketIds = [ticket.ticketId, ticket.id].filter(Boolean);
    const byTicketId = Object.keys(attachments).map(function (key) { return attachments[key]; }).find(function (record) {
      return record && record.dataUrl && ticketIds.includes(record.ticketId);
    });
    if (byTicketId) return byTicketId;

    const expectedName = String(ticket.attachmentName || "").trim();
    const normalizedExpectedName = expectedName.toLowerCase();
    const expectedType = String(ticket.attachmentType || "").trim().toLowerCase();
    const expectedSize = Number(ticket.attachmentSize || 0);
    if (!expectedName || expectedName === "No attachment") return null;

    const records = Object.keys(attachments).map(function (key) { return attachments[key]; }).filter(function (record) {
      if (!record || !record.dataUrl || String(record.filename || "").trim().toLowerCase() !== normalizedExpectedName) return false;
      const typeMatches = !expectedType || String(record.mimeType || "").toLowerCase() === expectedType;
      const sizeMatches = !expectedSize || Number(record.fileSize || 0) === expectedSize;
      return typeMatches && sizeMatches;
    });
    const stored = records[0] || Object.keys(attachments).map(function (key) { return attachments[key]; }).find(function (record) {
      return record && record.dataUrl && String(record.filename || "").trim().toLowerCase() === normalizedExpectedName;
    });
    if (stored) return stored;
    if (ticket.attachmentUrl) {
      return {
        attachmentId: ticket.attachmentId || "",
        ticketId: ticket.ticketId || ticket.id || "",
        filename: ticket.attachmentName || String(ticket.attachmentUrl).split("/").pop(),
        mimeType: ticket.attachmentType || "",
        fileSize: ticket.attachmentSize || 0,
        uploadedAt: ticket.createdAt || "",
        dataUrl: ticket.attachmentUrl
      };
    }
    return null;
  }

  function linkTicketAttachment(fromTicketId, toTicketId) {
    const attachments = readJson(ticketKey, {});
    const record = attachments[fromTicketId] || Object.keys(attachments).map(function (key) { return attachments[key]; }).find(function (item) {
      return item && (item.attachmentId === fromTicketId || item.ticketId === fromTicketId);
    });
    if (!record || !toTicketId) return record || null;
    removeTicketAliases(attachments);
    record.ticketId = toTicketId;
    localStorage.setItem(ticketKey, JSON.stringify(attachments));
    return record;
  }

  function formatFileSize(size) {
    const value = Number(size);
    if (!Number.isFinite(value) || value <= 0) return "Unknown size";
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    return (value / (1024 * 1024)).toFixed(1) + " MB";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }

  let activeObjectUrl = "";
  let previewSequence = 0;
  function releaseObjectUrl() {
    if (activeObjectUrl) URL.revokeObjectURL(activeObjectUrl);
    activeObjectUrl = "";
    previewSequence += 1;
  }

  function ensureModal() {
    let modal = document.getElementById("serveEaseAttachmentPreviewModal");
    if (modal) return modal;
    document.body.insertAdjacentHTML("beforeend", '<div class="attachment-preview-backdrop hidden" id="serveEaseAttachmentPreviewModal"><div class="attachment-preview-modal"><div class="attachment-preview-header"><div><h3 id="attachmentPreviewTitle">Attachment Name</h3><p id="attachmentPreviewSubtitle"></p></div><button class="attachment-preview-close" type="button" id="attachmentPreviewClose" aria-label="Close">×</button></div><div class="attachment-preview-body" id="attachmentPreviewBody"></div><div class="attachment-preview-footer"><button class="btn btn-outline btn-full" type="button" id="attachmentPreviewFooterClose">Close</button></div></div></div>');
    modal = document.getElementById("serveEaseAttachmentPreviewModal");
    const close = function () { modal.classList.add("hidden"); releaseObjectUrl(); };
    document.getElementById("attachmentPreviewClose").addEventListener("click", close);
    document.getElementById("attachmentPreviewFooterClose").addEventListener("click", close);
    modal.addEventListener("click", function (event) { if (event.target === modal) close(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
    return modal;
  }

  function previewTicketAttachment(ticket) {
    const attachment = getTicketAttachment(ticket);
    const modal = ensureModal();
    if (!attachment || !attachment.dataUrl) {
      document.getElementById("attachmentPreviewTitle").textContent = (ticket && ticket.attachmentName) || "Attachment";
      document.getElementById("attachmentPreviewSubtitle").textContent = "Attachment preview";
      document.getElementById("attachmentPreviewBody").innerHTML = '<div class="attachment-preview-placeholder">Preview unavailable because the stored attachment could not be resolved.</div>';
      modal.classList.remove("hidden");
      return true;
    }
    const type = String(attachment.mimeType || "").toLowerCase();
    const isImage = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(type);
    const isPdf = type === "application/pdf";
    let preview = "";
    if (isImage) {
      preview = '<img class="attachment-preview-media" src="' + attachment.dataUrl + '" alt="' + escapeHtml(attachment.filename) + '" />';
    } else if (isPdf) {
      preview = '<iframe class="attachment-preview-frame" src="' + attachment.dataUrl + '" title="' + escapeHtml(attachment.filename) + '"></iframe><a class="btn btn-outline" target="_blank" rel="noopener" href="' + attachment.dataUrl + '">Open PDF in new tab</a>';
    } else {
      preview = '<div class="attachment-preview-placeholder"><strong>📎 ' + escapeHtml(attachment.filename) + '</strong><p>This file type does not support inline preview.</p><a class="btn btn-primary" download="' + escapeHtml(attachment.filename) + '" href="' + attachment.dataUrl + '">Download file</a></div>';
    }
    document.getElementById("attachmentPreviewTitle").textContent = attachment.filename || "Attachment Name";
    document.getElementById("attachmentPreviewSubtitle").textContent = (attachment.mimeType || "Unknown type") + " · " + formatFileSize(attachment.fileSize);
    document.getElementById("attachmentPreviewBody").innerHTML = '<div class="attachment-preview-content"><strong>Filename</strong><span>' + escapeHtml(attachment.filename) + '</span><strong>File Type</strong><span>' + escapeHtml(attachment.mimeType || "Unknown") + '</span><strong>File Size</strong><span>' + formatFileSize(attachment.fileSize) + '</span><strong>Preview</strong>' + preview + '</div>';
    modal.classList.remove("hidden");
    return true;
  }

  function showProviderDocument(heading, filename, fileType, status, previewHtml) {
    document.getElementById("attachmentPreviewTitle").textContent = heading || "Provider document";
    document.getElementById("attachmentPreviewSubtitle").textContent = filename || "";
    document.getElementById("attachmentPreviewBody").innerHTML = '<div class="attachment-preview-content"><strong>Filename</strong><span>' + escapeHtml(filename || "Not recorded") + '</span><strong>File Type</strong><span>' + escapeHtml(fileType || "Unknown") + '</span><strong>Status</strong><span>' + escapeHtml(status || "Pending") + '</span><strong>Preview</strong>' + previewHtml + '</div>';
  }

  function placeholder(message, isError) {
    return '<div class="attachment-preview-placeholder"' + (isError ? ' role="alert"' : "") + '><p>' + escapeHtml(message) + '</p></div>';
  }

  function previewFailure(error) {
    if (!error || error.status === 0) return "The ServeEase server could not be reached. Please try again.";
    if (error.status === 401 || /authentication is required|session/i.test(error.message || "")) return "Your session has expired. Sign in again to view this document.";
    if (error.status === 403) return "You are not allowed to view this document.";
    return error.message || "The document could not be loaded.";
  }

  // Shows one provider document from the canonical registry: metadata first, then the stored bytes (fetched
  // with the session token and shown from a temporary object URL). Nothing is resolved in the browser.
  function previewProviderDocument(providerId, providerDocument) {
    const api = window.ServeEaseApi;
    if (!providerId || !providerDocument || !providerDocument.documentId || !api || typeof api.getProviderDocument !== "function") return false;
    const modal = ensureModal();
    releaseObjectUrl();
    const sequence = previewSequence;
    const current = function () { return sequence === previewSequence; };
    showProviderDocument(providerDocument.documentType, providerDocument.documentName, "", providerDocument.documentStatus, '<div class="attachment-preview-placeholder" role="status"><p>Loading document…</p></div>');
    modal.classList.remove("hidden");

    api.getProviderDocument(providerId, providerDocument.documentId).then(function (meta) {
      if (!current()) return null;
      if (!meta.hasFile) {
        showProviderDocument(meta.documentType, meta.documentName, meta.fileType, meta.documentStatus, placeholder(meta.message || "No file is stored for this document."));
        return null;
      }
      return api.getProviderDocumentFile(providerId, providerDocument.documentId).then(function (blob) {
        if (!current()) return;
        const type = String(blob.type || meta.fileType || "").toLowerCase();
        const filename = meta.documentName || "Provider document";
        let previewHtml;
        if (/^image\/(png|jpe?g|webp)$/.test(type)) {
          activeObjectUrl = URL.createObjectURL(blob);
          previewHtml = '<img class="attachment-preview-media" src="' + activeObjectUrl + '" alt="' + escapeHtml(filename) + '" />';
        } else if (type === "application/pdf") {
          activeObjectUrl = URL.createObjectURL(blob);
          previewHtml = '<iframe class="attachment-preview-frame" src="' + activeObjectUrl + '" title="' + escapeHtml(filename) + '"></iframe><a class="btn btn-outline" target="_blank" rel="noopener" href="' + activeObjectUrl + '">Open PDF in new tab</a>';
        } else {
          previewHtml = '<div class="attachment-preview-placeholder"><strong>📎 ' + escapeHtml(filename) + '</strong><p>This file type does not support inline preview.</p></div>';
        }
        showProviderDocument(meta.documentType, filename, type || meta.fileType, meta.documentStatus, previewHtml);
      });
    }).catch(function (error) {
      if (!current()) return;
      showProviderDocument(providerDocument.documentType, providerDocument.documentName, "", providerDocument.documentStatus, placeholder(previewFailure(error), true));
    });
    return true;
  }

  // The provider's documents as the canonical registry resolves them (account or approval request, with the
  // stored-file state). Pages render this list instead of deciding locally; null when it cannot be loaded.
  function loadCanonicalDocuments(providerId) {
    const api = window.ServeEaseApi;
    if (!providerId || !api || typeof api.listProviderDocuments !== "function") return Promise.resolve(null);
    return api.listProviderDocuments(providerId).then(function (documents) {
      return Array.isArray(documents) ? documents : null;
    }).catch(function () { return null; });
  }

  // Decodes a data URL in memory (the pages' CSP does not allow fetching data: URLs).
  function dataUrlToBlob(dataUrl) {
    const match = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(String(dataUrl));
    if (!match) throw new Error("Not a data URL.");
    const text = match[2] ? atob(match[3]) : decodeURIComponent(match[3]);
    const bytes = new Uint8Array(text.length);
    for (let index = 0; index < text.length; index += 1) bytes[index] = text.charCodeAt(index) & 0xff;
    return new Blob([bytes], { type: match[1] || "application/octet-stream" });
  }

  // Sends the bytes this browser kept for a `local-document://` record to the canonical registry. The server
  // checks that the record belongs to this provider and document, validates the file and records provenance.
  function importBrowserDocument(providerId, providerDocument) {
    const api = window.ServeEaseApi;
    const copy = providerDocument && browserCopy(providerId, providerDocument.documentId);
    if (!copy) return Promise.reject(new Error("This browser does not hold the file for this document."));
    if (!api || typeof api.importBrowserProviderDocument !== "function") return Promise.reject(new Error("Document import is unavailable."));
    let blob;
    try { blob = dataUrlToBlob(copy.dataUrl); } catch (error) { return Promise.reject(new Error("The file stored in this browser could not be read.")); }
    return api.importBrowserProviderDocument(providerId, providerDocument.documentId, blob, providerDocument.documentName || copy.name || "document");
  }

  function actionMarkup(ticket, label) {
    const hasReference = ticket && (ticket.attachmentId || ticket.attachmentUrl || (ticket.attachmentName && ticket.attachmentName !== "No attachment"));
    return hasReference ? '<button type="button" class="btn btn-outline serveease-attachment-preview-btn" data-attachment-ticket="' + escapeHtml(ticket.ticketId || ticket.id) + '">' + (label || "Preview attachment") + '</button>' : "";
  }

  window.ServeEaseAttachments = {
    readFileAsDataUrl: readFileAsDataUrl,
    getProviderPreview: getProviderPreview,
    hasBrowserCopy: function (providerId, documentId) { return Boolean(browserCopy(providerId, documentId)); },
    importBrowserDocument: importBrowserDocument,
    loadCanonicalDocuments: loadCanonicalDocuments,
    saveTicketAttachment: saveTicketAttachment,
    getTicketAttachment: getTicketAttachment,
    linkTicketAttachment: linkTicketAttachment,
    previewTicketAttachment: previewTicketAttachment,
    previewProviderDocument: previewProviderDocument,
    actionMarkup: actionMarkup,
    formatFileSize: formatFileSize
  };
})();
