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

  function ensureModal() {
    let modal = document.getElementById("serveEaseAttachmentPreviewModal");
    if (modal) return modal;
    document.body.insertAdjacentHTML("beforeend", '<div class="attachment-preview-backdrop hidden" id="serveEaseAttachmentPreviewModal"><div class="attachment-preview-modal"><div class="attachment-preview-header"><div><h3 id="attachmentPreviewTitle">Attachment Name</h3><p id="attachmentPreviewSubtitle"></p></div><button class="attachment-preview-close" type="button" id="attachmentPreviewClose" aria-label="Close">×</button></div><div class="attachment-preview-body" id="attachmentPreviewBody"></div><div class="attachment-preview-footer"><button class="btn btn-outline btn-full" type="button" id="attachmentPreviewFooterClose">Close</button></div></div></div>');
    modal = document.getElementById("serveEaseAttachmentPreviewModal");
    const close = function () { modal.classList.add("hidden"); };
    document.getElementById("attachmentPreviewClose").addEventListener("click", close);
    document.getElementById("attachmentPreviewFooterClose").addEventListener("click", close);
    modal.addEventListener("click", function (event) { if (event.target === modal) close(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });
    return modal;
  }

  function previewTicketAttachment(ticket) {
    const attachment = getTicketAttachment(ticket);
    if (!attachment || !attachment.dataUrl) return false;
    const modal = ensureModal();
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

  function previewProviderDocument(providerId, providerDocument) {
    if (!providerId || !providerDocument) return false;
    const storedDocument = getProviderPreview(providerId, providerDocument.documentId);
    const previewUrl = storedDocument && storedDocument.dataUrl ? storedDocument.dataUrl : providerDocument.documentUrl;
    if (!previewUrl || String(previewUrl).indexOf("local-document://") === 0) return false;
    if (String(previewUrl).indexOf("data:") !== 0) {
      window.open(previewUrl, "_blank", "noopener");
      return true;
    }

    const modal = ensureModal();
    const filename = storedDocument && storedDocument.name ? storedDocument.name : (providerDocument.documentName || "Provider document");
    const mimeType = storedDocument && storedDocument.type ? storedDocument.type : String(previewUrl).slice(5, String(previewUrl).indexOf(";"));
    const type = String(mimeType || "").toLowerCase();
    const isImage = type.indexOf("image/") === 0;
    const isPdf = type === "application/pdf";
    let preview = "";
    if (isImage) {
      preview = '<img class="attachment-preview-media" src="' + previewUrl + '" alt="' + escapeHtml(filename) + '" />';
    } else if (isPdf) {
      preview = '<iframe class="attachment-preview-frame" src="' + previewUrl + '" title="' + escapeHtml(filename) + '"></iframe><a class="btn btn-outline" target="_blank" rel="noopener" href="' + previewUrl + '">Open PDF in new tab</a>';
    } else {
      preview = '<div class="attachment-preview-placeholder"><strong>📎 ' + escapeHtml(filename) + '</strong><p>This file type does not support inline preview.</p><a class="btn btn-primary" download="' + escapeHtml(filename) + '" href="' + previewUrl + '">Download file</a></div>';
    }

    document.getElementById("attachmentPreviewTitle").textContent = providerDocument.documentType || "Provider document";
    document.getElementById("attachmentPreviewSubtitle").textContent = filename;
    document.getElementById("attachmentPreviewBody").innerHTML = '<div class="attachment-preview-content"><strong>Filename</strong><span>' + escapeHtml(filename) + '</span><strong>File Type</strong><span>' + escapeHtml(mimeType || "Unknown") + '</span><strong>Status</strong><span>' + escapeHtml(providerDocument.documentStatus || "Pending") + '</span><strong>Preview</strong>' + preview + '</div>';
    modal.classList.remove("hidden");
    return true;
  }

  function actionMarkup(ticket, label) {
    return getTicketAttachment(ticket) ? '<button type="button" class="btn btn-outline serveease-attachment-preview-btn" data-attachment-ticket="' + escapeHtml(ticket.ticketId || ticket.id) + '">' + (label || "Preview attachment") + '</button>' : "";
  }

  window.ServeEaseAttachments = {
    readFileAsDataUrl: readFileAsDataUrl,
    getProviderPreview: getProviderPreview,
    saveTicketAttachment: saveTicketAttachment,
    getTicketAttachment: getTicketAttachment,
    linkTicketAttachment: linkTicketAttachment,
    previewTicketAttachment: previewTicketAttachment,
    previewProviderDocument: previewProviderDocument,
    actionMarkup: actionMarkup,
    formatFileSize: formatFileSize
  };
})();
