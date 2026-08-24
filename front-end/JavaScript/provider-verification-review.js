(function () {
  const ops = window.ServeEaseProviderOperations;
  if (!ops) {
    window.location.href = "provider-operations.html";
    return;
  }

  const state = { provider: null, decision: "" };

  function byId(id) { return document.getElementById(id); }
  function escapeHtml(value) { return ops.escapeHtml(value); }
  function display(value) { return ops.display(value); }
  function field(label, value) {
    return '<div class="provider-verification-review-field"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(display(value)) + '</strong></div>';
  }

  function requestedId() {
    return new URLSearchParams(window.location.search).get("id") || "";
  }

  function showNotFound() {
    const notFound = byId("providerVerificationReviewNotFound");
    const content = byId("providerVerificationReviewContent");
    if (notFound) notFound.hidden = false;
    if (content) content.hidden = true;
  }

  function renderInfo(provider) {
    const hero = byId("providerVerificationReviewHero");
    const info = byId("providerVerificationReviewInfo");
    if (hero) hero.textContent = display(provider.organisationName || provider.name) + " is awaiting verification review.";
    if (!info) return;
    info.innerHTML = [
      field("Provider ID", provider.id),
      field("Provider Name", provider.name),
      field("Organisation", provider.organisationName),
      field("Email", provider.email),
      field("Phone", provider.phone),
      field("Service Category", provider.category),
      field("Experience", provider.experience),
      field("Location", provider.location),
      field("Submitted", ops.formatDate(provider.registrationDate)),
      field("Account Status", provider.accountStatus)
    ].join("");
  }

  function renderDocuments(provider) {
    const target = byId("providerVerificationReviewDocuments");
    if (!target) return;
    if (!provider.documents || !provider.documents.length) {
      target.innerHTML = '<p class="provider-verification-review-empty">No verification documents are recorded for this provider.</p>';
      return;
    }
    target.innerHTML = provider.documents.map(function (document) {
      return [
        '<div class="provider-verification-review-document">',
        '  <div><span>' + escapeHtml(document.documentType || "Document") + '</span><strong>' + escapeHtml(document.documentName || "Not submitted") + '</strong></div>',
        '  <div class="provider-verification-review-document-meta"><span>' + escapeHtml(document.documentStatus || "Pending") + '</span><button class="btn btn-outline" type="button" data-preview-document="' + escapeHtml(document.documentId) + '">Preview</button></div>',
        '</div>'
      ].join("");
    }).join("");

    target.querySelectorAll("[data-preview-document]").forEach(function (button) {
      button.addEventListener("click", function () {
        previewDocument(button.dataset.previewDocument);
      });
    });
  }

  function previewDocument(documentId) {
    const document = (state.provider.documents || []).find(function (item) { return item.documentId === documentId; });
    if (!document) return;
    if (window.ServeEaseAttachments && typeof window.ServeEaseAttachments.previewProviderDocument === "function") {
      if (window.ServeEaseAttachments.previewProviderDocument(state.provider.id, document)) return;
    }
    const body = byId("providerVerificationPreviewBody");
    const modal = byId("providerVerificationPreviewModal");
    const subtitle = byId("providerVerificationPreviewSubtitle");
    if (subtitle) subtitle.textContent = document.documentName || "Provider document";
    if (body) body.innerHTML = '<p class="provider-verification-review-preview-placeholder">Preview unavailable because the stored file content is missing or corrupted.</p>';
    if (modal) modal.hidden = false;
  }

  function closePreview() {
    const modal = byId("providerVerificationPreviewModal");
    if (modal) modal.hidden = true;
  }

  function openModal(decision) {
    const modal = byId("providerVerificationDecisionModal");
    const title = byId("providerVerificationModalTitle");
    const prompt = byId("providerVerificationModalPrompt");
    const reason = byId("providerVerificationReason");
    const reasonLabel = byId("providerVerificationReasonLabel");
    const remarks = byId("providerVerificationRemarks");
    const error = byId("providerVerificationModalError");
    state.decision = decision;
    if (title) title.textContent = decision === "approve" ? "Approve Verification" : "Reject Verification";
    if (prompt) prompt.textContent = decision === "approve"
      ? "Confirm approval. The provider will become active and dashboard-eligible."
      : "Enter the rejection reason. The provider can still sign in to view the reason and resubmit.";
    if (reasonLabel) reasonLabel.hidden = decision === "approve";
    if (reason) {
      reason.value = "";
      reason.placeholder = decision === "approve" ? "Optional" : "Required rejection reason";
    }
    if (remarks) remarks.value = "";
    if (error) error.textContent = "";
    if (modal) modal.hidden = false;
  }

  function closeModal() {
    const modal = byId("providerVerificationDecisionModal");
    if (modal) modal.hidden = true;
    state.decision = "";
  }

  function submitDecision() {
    if (!state.provider || !state.decision) return;
    const reason = byId("providerVerificationReason") ? byId("providerVerificationReason").value : "";
    const remarks = byId("providerVerificationRemarks") ? byId("providerVerificationRemarks").value : "";
    const result = state.decision === "approve"
      ? ops.approveProvider(state.provider.id, remarks)
      : ops.rejectProvider(state.provider.id, reason, remarks);
    if (!result.ok) {
      const error = byId("providerVerificationModalError");
      if (error) error.textContent = result.message || "Unable to update provider verification.";
      return;
    }
    window.location.href = "provider-operations.html";
  }

  ops.setupLogout("providerVerificationReviewLogoutBtn");

  const data = ops.getData();
  state.provider = ops.findProvider(data, requestedId());
  if (!state.provider) {
    showNotFound();
    return;
  }

  renderInfo(state.provider);
  renderDocuments(state.provider);

  const approveBtn = byId("providerVerificationApproveBtn");
  const rejectBtn = byId("providerVerificationRejectBtn");
  const cancelBtn = byId("providerVerificationDecisionCancel");
  const submitBtn = byId("providerVerificationDecisionSubmit");
  if (approveBtn) approveBtn.addEventListener("click", function () { openModal("approve"); });
  if (rejectBtn) rejectBtn.addEventListener("click", function () { openModal("reject"); });
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);
  if (submitBtn) submitBtn.addEventListener("click", submitDecision);
  const previewClose = byId("providerVerificationPreviewClose");
  const previewFooterClose = byId("providerVerificationPreviewFooterClose");
  if (previewClose) previewClose.addEventListener("click", closePreview);
  if (previewFooterClose) previewFooterClose.addEventListener("click", closePreview);
})();
