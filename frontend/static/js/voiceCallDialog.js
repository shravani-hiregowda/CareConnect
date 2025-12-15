// frontend/static/js/voiceCallDialog.js
// Voice call dialog + N8N webhook integration (split from videoCall.js)
// Responsibilities: modal UI, autofill patient, validation, webhook payload and POST, then call startCall()

(function () {
  if (window.__careconnect_voiceCallDialog_loaded) return;
  window.__careconnect_voiceCallDialog_loaded = true;

  // Configuration
  const WEBHOOK_URL = window.N8N_WEBHOOK_URL || "https://teja18.app.n8n.cloud/webhook-test/2c16e040-2a99-4da6-ba56-cc2ef1e9e9d4";
  const API_PROFILE = "/api/patient/profile"; // adjust if your backend uses another route

  // create modal if missing
  function ensureModalDOM() {
    if (document.getElementById("cc-voice-call-modal")) return;
    const tpl = document.createElement("div");
    tpl.innerHTML = `
      <div id="cc-voice-call-modal" class="cc-modal" aria-hidden="true" style="display:none;position:fixed;inset:0;align-items:center;justify-content:center;z-index:9999;">
        <div class="cc-modal-overlay" style="position:absolute;inset:0;background:rgba(0,0,0,0.4)"></div>
        <div class="cc-modal-card" role="dialog" aria-modal="true" style="position:relative;width:420px;max-width:92%;background:#fff;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,0.25);overflow:hidden">
          <header style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #eee;">
            <div><h3 style="margin:0;font-size:16px">Start Voice Call</h3><div style="font-size:12px;color:#666">Confirm patient details before starting</div></div>
            <button id="cc-voice-call-close" aria-label="Close" style="background:none;border:0;font-size:18px;cursor:pointer;padding:6px 8px">✕</button>
          </header>
          <main style="padding:14px 18px">
            <label style="display:block;margin-bottom:10px"><div style="font-size:13px;color:#333;margin-bottom:6px">Patient name</div><input id="cc-patient-name" type="text" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px" placeholder="Patient name"></label>
            <label style="display:block;margin-bottom:10px"><div style="font-size:13px;color:#333;margin-bottom:6px">Phone number</div><input id="cc-patient-phone" type="tel" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px" placeholder="+91 98765 43210"></label>
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;color:#444"><input id="cc-allow-webhook" type="checkbox" checked> Send details to automation webhook (n8n)</label>
            <div id="cc-voice-call-feedback" style="margin-top:10px;font-size:13px;color:#666"></div>
          </main>
          <footer style="display:flex;justify-content:flex-end;gap:8px;padding:12px 18px;border-top:1px solid #eee">
            <button id="cc-voice-call-cancel" style="padding:8px 12px;border-radius:6px;background:#f3f4f6;border:0;cursor:pointer">Cancel</button>
            <button id="cc-voice-call-make" style="padding:8px 12px;border-radius:6px;background:#0f62fe;color:#fff;border:0;cursor:pointer">Make Call</button>
          </footer>
        </div>
      </div>
    `;
    document.body.appendChild(tpl.firstElementChild);
  }

  ensureModalDOM();

  const modal = document.getElementById("cc-voice-call-modal");
  const closeBtn = document.getElementById("cc-voice-call-close");
  const cancelBtn = document.getElementById("cc-voice-call-cancel");
  const makeBtn = document.getElementById("cc-voice-call-make");
  const inputName = document.getElementById("cc-patient-name");
  const inputPhone = document.getElementById("cc-patient-phone");
  const allowWebhook = document.getElementById("cc-allow-webhook");
  const feedback = document.getElementById("cc-voice-call-feedback");

  function openModal() { modal.style.display = "flex"; modal.setAttribute("aria-hidden", "false"); }
  function closeModal() { modal.style.display = "none"; modal.setAttribute("aria-hidden", "true"); }

  closeBtn?.addEventListener("click", closeModal);
  cancelBtn?.addEventListener("click", closeModal);
  modal.querySelector(".cc-modal-overlay")?.addEventListener("click", closeModal);

  function setFeedback(msg, severity = "info") {
    feedback.textContent = msg || "";
    feedback.style.color = severity === "error" ? "#b91c1c" : (severity === "success" ? "#166534" : "#666");
  }

  // loose phone validator
  function validPhone(v) {
    if (!v) return false;
    return /^[+\d][\d\-\s]{6,20}$/.test(v.trim());
  }

  // try backend -> localStorage for autofill
  async function autoFillPatientDetails() {
    inputName.value = "";
    inputPhone.value = "";
    modal.dataset.patientId = "";

    // try backend
    try {
      const res = await fetch(API_PROFILE, { credentials: "same-origin" });
      if (res.ok) {
        const data = await res.json().catch(() => null) || {};
        const p = data.patient || data || {};
        inputName.value = p.patientName || p.fullName || p.name || "";
        inputPhone.value = p.phone || p.contact || p.emergencyContacts || "";
        modal.dataset.patientId = p._id || p.patientId || p.id || "";
        return;
      }
    } catch (err) {
      // ignore
    }

    // fallback localStorage
    try {
      const cached = JSON.parse(localStorage.getItem("patientData") || "null");
      if (cached) {
        inputName.value = cached.patientName || cached.fullName || "";
        inputPhone.value = cached.phone || cached.patientPhone || cached.contact || "";
        modal.dataset.patientId = cached._id || cached.patientId || "";
      }
    } catch (e) { /* ignore */ }
  }

  function buildWebhookPayload() {
    return {
      event: "start_voice_call",
      patientId: modal.dataset.patientId || (localStorage.getItem("patientData") ? JSON.parse(localStorage.getItem("patientData")).patientId : null) || `guest-${Date.now()}`,
      patientName: inputName.value.trim(),
      phone: inputPhone.value.trim(),
      timestamp: new Date().toISOString(),
      source: "careconnect_frontend"
    };
  }

  async function sendWebhook(payload) {
    if (!WEBHOOK_URL) {
      setFeedback("Webhook not configured — skipping automation.", "error");
      return { ok: false, message: "webhook_missing" };
    }
    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const text = await res.text().catch(() => null);
      if (!res.ok) return { ok: false, status: res.status, body: text };
      return { ok: true, status: res.status, body: text };
    } catch (err) {
      return { ok: false, error: err };
    }
  }

async function onMakeCallClicked() {
  setFeedback("");
  const name = inputName.value.trim();
  const phone = inputPhone.value.trim();

  if (!name) {
    setFeedback("Please enter patient name.", "error");
    inputName.focus();
    return;
  }
  if (!validPhone(phone)) {
    setFeedback("Please enter a valid phone number.", "error");
    inputPhone.focus();
    return;
  }

  const payload = buildWebhookPayload();

  // Send webhook only — do not start any call
  if (allowWebhook.checked) {
    setFeedback("Triggering automation...", "info");
    try {
      const wres = await sendWebhook(payload);
      if (wres.ok) {
        setFeedback("Automation triggered.", "success");
      } else {
        setFeedback("Automation failed.", "error");
      }
    } catch (err) {
      setFeedback("Automation error.", "error");
      console.warn("Webhook error:", err);
    }
  }

  // Persist patientData for next time
  try {
    const saved = JSON.parse(localStorage.getItem("patientData") || "null") || {};
    saved.patientName = payload.patientName;
    saved.phone = payload.phone;
    if (payload.patientId) saved.patientId = payload.patientId;
    localStorage.setItem("patientData", JSON.stringify(saved));
  } catch (e) {}

  // Close modal and DO NOTHING ELSE
  closeModal();
}

  makeBtn.addEventListener("click", onMakeCallClicked);

  // public openDialog
  async function openVoiceCallDialog() {
    try { await autoFillPatientDetails(); } catch (e) { console.warn("autofill failed", e); }
    setFeedback("");
    openModal();
  }

  // Auto-wire any existing voiceCallBtn
  const voiceBtn = document.getElementById("voiceCallBtn");
  if (voiceBtn) voiceBtn.addEventListener("click", (e) => { e.preventDefault(); openVoiceCallDialog(); });

  // expose utility functions
  window.CareConnectVoiceCall = window.CareConnectVoiceCall || {};
  window.CareConnectVoiceCall.openDialog = openVoiceCallDialog;
  window.CareConnectVoiceCall.buildPayload = buildWebhookPayload;
  window.CareConnectVoiceCall.sendWebhook = sendWebhook;

})();
