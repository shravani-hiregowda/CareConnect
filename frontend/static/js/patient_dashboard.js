/* patient_dashboard.js
   Full rewrite (backend-driven) — preserves existing UI markup & behavior.
   Replace the entire existing file with this.
*/
window.API_BASE = window.API_BASE || "http://localhost:4000/api";
const API_BASE = "http://localhost:4000/api"; // adjust if needed

async function initNurseAvatar() {
  const token = localStorage.getItem("patientToken");
  if (!token) return;

  try {
    const res = await fetch("http://localhost:4000/api/nurse/profile", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) throw new Error("Nurse profile fetch failed");

    const nurse = await res.json();

    window.CARECONNECT_DOCTOR.name = nurse.fullName || "Nurse";
    window.CARECONNECT_DOCTOR.role = nurse.role ? nurse.role.toUpperCase() : "NURSE";

    injectDoctorNameUI();     // update UI now
    console.log("[Avatar] Nurse loaded:", window.CARECONNECT_DOCTOR);

  } catch (err) {
    console.warn("initNurseAvatar failed:", err);
  }
}


function setPatientDataForOthers(profile) {
  try {
    if (!profile) return;
    // ensure _id is present (mongodb ObjectId or string)
    if (profile._id) {
      localStorage.setItem("patientData", JSON.stringify(profile));
    } else {
      // if login returned wrapper: try common fields
      const maybe = {
        _id: profile.id || profile._id || profile._id?.$oid || null,
        patientId: profile.patientId || profile.patientID || null,
        patientName: profile.patientName || profile.fullName || null
      };
      localStorage.setItem("patientData", JSON.stringify(maybe));
    }
  } catch (e) {
    console.warn("setPatientDataForOthers failed", e);
  }
}

/* ---------------------- Utilities ---------------------- */
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  if (!toast || !toastMessage) {
    // fallback console
    console.log(`[toast ${type}]`, message);
    return;
  }
  toastMessage.textContent = message;
  toast.dataset.type = type;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function safeText(node, text) {
  if (!node) return;
  node.textContent = text ?? "";
}

function formatDateISOToPretty(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d)) return isoStr;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function timeSince(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ---------------------- Auth/session ---------------------- */
function getToken() {
  return localStorage.getItem("patientToken");
}

function redirectToLogin(msg) {
  alert(msg || "Session expired. Please login again.");
  window.location.href = "/frontend/templates/patient_login.html";
}

async function apiGet(path) {
  const token = getToken();
  if (!token) {
    const err = new Error("No auth token");
    err.status = 401;
    throw err;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `API GET ${path} failed (${res.status})`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return await res.json();
}

/* ---------------------- DOM builders ---------------------- */
function createAppointmentCard(appt = {}) {
  const container = document.createElement("div");
  container.className = "appointment-item";
  container.addEventListener("click", () => viewAppointmentDetails(appt));

  const date = appt.date ? new Date(appt.date) : null;
  const day = date ? date.getDate().toString().padStart(2, "0") : "--";
  const month = date ? date.toLocaleString(undefined, { month: "short" }).toUpperCase() : "---";
  const doctor = appt.primaryPhysician || appt.doctorName || "Doctor";
  const timeText = appt.time || (date ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

  container.innerHTML = `
    <div class="appointment-date">
      <div class="appointment-day">${day}</div>
      <div class="appointment-month">${month}</div>
    </div>
    <div class="appointment-details">
      <h4>${escapeHtml(doctor)}</h4>
      <p>${escapeHtml(appt.primaryDiagnosis || appt.specialty || "General Checkup")} • ${escapeHtml(timeText)}</p>
    </div>
    <div class="appointment-status ${appt.status ? 'status-' + appt.status.toLowerCase().replace(/\s/g,'-') : 'status-pending'}">
      ${escapeHtml(appt.status || "Pending")}
    </div>
  `;
  return container;
}

function createMedicationItem(med = {}) {
  const name = typeof med === "string" ? med : (med.name || med.title || "Medication");
  const dose = typeof med === "string" ? "" : (med.dose || "");
  const schedule = typeof med === "string" ? "" : (med.schedule || "");
  const container = document.createElement("div");
  container.className = "medication-item";
  container.addEventListener("click", () => viewMedicationDetails(med));
  container.innerHTML = `
    <div class="medication-icon"></div>
    <div class="medication-details">
      <h4>${escapeHtml(name)}</h4>
      <p>${escapeHtml(dose)}${dose && schedule ? " • " : ""}${escapeHtml(schedule)}</p>
    </div>
    <div class="medication-time">${escapeHtml(schedule || "")}</div>
  `;
  return container;
}

function createReportItem(report = {}) {
  const dateText = report?.date ? formatDateISOToPretty(report.date) : "";
  const container = document.createElement("div");
  container.className = "appointment-item";
  container.innerHTML = `
    <div class="appointment-date">
      <div class="appointment-day">${dateText ? new Date(report.date).getDate().toString().padStart(2,"0") : "--"}</div>
      <div class="appointment-month">${dateText ? new Date(report.date).toLocaleString(undefined,{month:"short"}).toUpperCase() : "---"}</div>
    </div>
    <div class="appointment-details">
      <h4>${escapeHtml(report.title || "Report")}</h4>
      <p>${escapeHtml(report.provider || "")}</p>
    </div>
    <button class="btn btn-primary" style="padding:8px 16px">View Report</button>
  `;
  container.querySelector("button")?.addEventListener("click", () => viewReport(report));
  return container;
}

function escapeHtml(s) {
  if (s === undefined || s === null) return "";
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* ---------------------- Populate UI ---------------------- */
function populateSidebarPatient(profile = {}) {
  const avatar = document.querySelector(".patient-avatar");
  const nameNode = document.querySelector(".patient-details h4");
  const idNode = document.querySelector(".patient-details p");
  if (avatar) {
    const initials = (profile.patientName || profile.fullName || "Patient").split(" ").map(n => n[0]).slice(0,2).join("").toUpperCase();
    avatar.textContent = initials;
  }
  safeText(nameNode, profile.patientName || profile.fullName || "Patient");
  safeText(idNode, `Patient ID: ${profile.patientId || profile.patientID || profile.id || ""}`);
}

function populateProfileCard(profile = {}) {
  safeText(document.querySelector(".profile-name"), profile.patientName || profile.fullName || "Patient");
  safeText(document.querySelector(".profile-id"), `Patient ID: ${profile.patientId || ""}`);

  // map detail-values by label text
  document.querySelectorAll(".profile-card .detail-item").forEach(node => {
    const label = node.querySelector(".detail-label")?.textContent.trim().toLowerCase();
    const valueNode = node.querySelector(".detail-value");
    if (!valueNode) return;

    switch (label) {
      case "primary physician":
        safeText(valueNode, profile.primaryPhysician || "");
        break;

      case "insurance provider":
        safeText(valueNode, profile.insuranceProvider || "");
        break;

      case "policy number":
        safeText(valueNode, profile.policyNumber || "");
        break;

      case "allergies":
        safeText(valueNode, Array.isArray(profile.allergies) ? profile.allergies.join(", ") : profile.allergies || "");
        break;

      case "chronic conditions":
        safeText(valueNode, Array.isArray(profile.chronicConditions) ? profile.chronicConditions.join(", ") : profile.chronicConditions || "");
        break;

      case "emergency contact":
        safeText(valueNode, profile.emergencyContacts || profile.emergencyContact || "");
        break;

      default:
        break;
    }
  });
}

function populateAppointments(list = []) {
  const container = document.querySelector(".appointments-list");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No upcoming appointments</p></div>`;
    return;
  }
  list.slice(0, 10).forEach(appt => container.appendChild(createAppointmentCard(appt)));
}

function populateMedications(list = []) {
  const container = document.querySelector(".medications-list");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No medications found</p></div>`;
    return;
  }
  list.slice(0, 20).forEach(med => container.appendChild(createMedicationItem(med)));
}

function populateReports(list = []) {
  const container = document.querySelector("#reports-page .appointments-list");
  if (!container) return;
  container.innerHTML = "";
  if (!Array.isArray(list) || list.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No reports available</p></div>`;
    return;
  }
  list.slice(0, 20).forEach(r => container.appendChild(createReportItem(r)));
}

function populateNotifications(dashboardData = {}) {
  const notificationsCount = dashboardData.notificationsCount ?? 0;
  document.querySelectorAll(".notification-badge").forEach(b => {
    b.style.display = notificationsCount ? "inline-block" : "none";
    b.textContent = notificationsCount;
  });

  const recent = dashboardData.recentCheckins || dashboardData.recentActivity || [];
  const activityList = document.querySelector(".activity-list");
  if (!activityList) return;
  activityList.innerHTML = "";
  if (!recent.length) {
    activityList.innerHTML = `<div class="empty-state"><p>No recent activity</p></div>`;
    return;
  }
  recent.slice().reverse().slice(0, 8).forEach(item => {
    const div = document.createElement("div");
    div.className = "activity-item";
    const initials = (item.name || item.patientName || "PT").split(" ").map(n=>n[0]).slice(0,2).join("").toUpperCase();
    const time = item.date ? timeSince(new Date(item.date)) : (item.timeAgo || "Just now");
    const statusClass = item.status ? `status-${item.status.toLowerCase().replace(/\s/g,'-')}` : "status-good";
    div.innerHTML = `
      <div class="activity-avatar">${initials}</div>
      <div class="activity-details">
        <div class="activity-text">${escapeHtml(item.summary || item.notes || (item.patientName || item.name) + " - activity")}</div>
        <div class="activity-time">${time}</div>
      </div>
      <div class="activity-status ${statusClass}">${escapeHtml(item.status || "Info")}</div>
    `;
    activityList.appendChild(div);
  });
}

/* ---------------------- View & action handlers (kept from UI) ---------------------- */
function viewAppointmentDetails(appt) {
  showToast("Appointment details opened");
  // could show modal with appt
}
function viewMedicationDetails(med) {
  showToast("Medication details opened");
}
function viewReport(report) {
  showToast("Report opened");
}

/* ---------------------- Load profile & dashboard ---------------------- */
async function loadProfileAndDashboard() {
  const token = getToken();
  if (!token) return redirectToLogin("Session missing. Please login.");

  let profile = null;
  let dashboard = null;

  try {
    const [profileRes, dashboardRes] = await Promise.all([
      apiGet("/patient/profile"),
      apiGet("/patient/dashboard")
    ]);

    // normalize - some endpoints return wrapper objects
    profile = profileRes.patient || profileRes || null;
    dashboard = dashboardRes || {};

    setPatientDataForOthers(profile); 
    
    // cache
    localStorage.setItem("cachedPatientProfile", JSON.stringify(profile));
    localStorage.setItem("cachedPatientDashboard", JSON.stringify(dashboard));
  } catch (err) {
    if (err.status === 401 || err.status === 403) {
      return redirectToLogin("Authentication failed. Please login again.");
    }

    console.warn("Live fetch failed, falling back to cache:", err);
    profile = JSON.parse(localStorage.getItem("cachedPatientProfile") || "null");
    dashboard = JSON.parse(localStorage.getItem("cachedPatientDashboard") || "null") || {};
    if (!profile) {
      return redirectToLogin("Unable to load data and no cached session. Please login again.");
    } else {
      showToast("Offline mode — showing cached data", "info");
    }
  }

  // populate UI
  populateSidebarPatient(profile);
  populateProfileCard(profile);

  const appointments = dashboard.appointments || profile.appointments || [];
  const medications = dashboard.medications || profile.medications || [];
  const reports = dashboard.reports || profile.reports || [];

  populateAppointments(appointments);
  populateMedications(medications);
  populateReports(reports);
  populateNotifications(dashboard);

  const greetingName = (profile.patientName || profile.fullName || "Patient").split(" ")[0];
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageSubtitle) pageSubtitle.textContent = `Welcome back, ${greetingName}! Here's your health overview.`;

  // persist profile for other pages (patientData)
  localStorage.setItem("patientData", JSON.stringify(profile));
}

/* ---------------------- Existing UI behavior (preserve) ---------------------- */
/* The following code wires up the UI elements (mobile menu, chat, call timers, toggles, dark mode)
   and preserves the logic you had. It intentionally keeps the same IDs/classes so the markup is unchanged.
*/

/* Mobile sidebar wiring */
function toggleMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.add("mobile-open");
  overlay.classList.add("active");
  document.getElementById("mobileMenuBtn")?.classList.add("hide-btn");
}
function closeMobileSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (!sidebar || !overlay) return;
  sidebar.classList.remove("mobile-open");
  overlay.classList.remove("active");
  document.getElementById("mobileMenuBtn")?.classList.remove("hide-btn");
}

/* Call modals + timers (preserve behavior) */
let videoCallTimerInterval;
let videoCallSeconds = 0;
async function startVideoCall() {
  document.getElementById("videoCallModal").style.display = "flex";

  // Wait for ensureControlElements to create startCallBtn if missing
  const ensureBtn = () => {
    return new Promise((resolve) => {
      const tryResolve = () => {
        const b = document.getElementById("startCallBtn");
        if (b) return resolve(b);
        setTimeout(tryResolve, 50);
      };
      tryResolve();
    });
  };

  const btn = await ensureBtn();
  // trigger the videoCall module's start handler
  btn.click();
}


function endVideoCall() {
    document.getElementById("videoCallModal").style.display = "none";
    const btn = document.getElementById("leaveCallBtn");
    if (btn) btn.click();
}

function updateVideoCallTimer() {
  videoCallSeconds++;
  const minutes = Math.floor(videoCallSeconds / 60);
  const seconds = videoCallSeconds % 60;
  const el = document.getElementById("videoCallTimer");
  if (el) el.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

let voiceCallTimerInterval;
let voiceCallSeconds = 0;
// REPLACE OLD FUNCTION
function startVoiceCall() {
  // Only open the dialog box — do NOT show old voice call modal
  CareConnectVoiceCall.openDialog();
}

function endVideoCall() {
    console.log("[videoCall] FORCE END");

    // 1. Close modal
    const modal = document.getElementById("videoCallModal");
    if (modal) modal.style.display = "none";

    // 2. Stop TTS immediately
    try { speechSynthesis.cancel(); } catch {}

    // 3. Stop STT completely
    if (window.cc?.videoCall?.ns?.recognition) {
        try { window.cc.videoCall.ns.recognition.abort(); } catch {}
        window.cc.videoCall.ns.sttRunning = false;
    }

    // 4. Stop avatar animation + mouth movement
    try { stopDoctorAvatar(); } catch {}

    // 5. Disconnect from LiveKit cleanly
    const btn = document.getElementById("leaveCallBtn");
    if (btn) btn.click();

    // 6. Optional: stop camera preview
    try { stopLocalCamera(); } catch {}

    console.log("[videoCall] FULL CALL TERMINATED");
}


function updateVoiceCallTimer() {
  voiceCallSeconds++;
  const minutes = Math.floor(voiceCallSeconds / 60);
  const seconds = voiceCallSeconds % 60;
  const el = document.getElementById("voiceCallTimer");
  if (el) el.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

/* Call modal open/close */
function openCallSelectionModal() {
  document.getElementById("callSelectionModal")?.classList.add("active");
}
function closeCallSelectionModal() {
  document.getElementById("callSelectionModal")?.classList.remove("active");
}

/* Chat: preserve handlers and local simulated AI (unchanged) */
function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function addMessage(sender, text, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${sender}`;
  const avatar = sender === "user" ? "You" : sender === "bot" ? "AI" : "DR";
  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-bubble">${escapeHtml(text)}</div>
      <div class="message-time">${getCurrentTime()}</div>
    </div>
  `;
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;
  const message = input.value.trim();
  if (message === "") return;

  addMessage("user", message, "chatMessages");
  input.value = "";

  const typingIndicator = document.getElementById("typingIndicator");
  typingIndicator?.classList.add("active");

  try {
    const response = await getAIResponse(message);
    typingIndicator?.classList.remove("active");
    addMessage("bot", response, "chatMessages");
  } catch (error) {
    typingIndicator?.classList.remove("active");
    addMessage("bot", "Error connecting to AI", "chatMessages");
  }
}

async function getAIResponse(message) {
  const token = localStorage.getItem("patientToken");
  
  const res = await axios.post(
    "http://localhost:4000/api/patient/chat",
    { message },
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  return res.data.response;
}
/* Toggle managers (preserve logic) */
class PatientToggleManager {
  constructor() { this.init(); }
  init() { this.initAllToggles(); this.loadToggleStates(); }
  initAllToggles() {
    const toggles = document.querySelectorAll('.toggle-switch:not(.dark-mode-toggle)');
    toggles.forEach(toggle => {
      toggle.removeAttribute('onclick');
      toggle.addEventListener('click', (e) => { e.stopPropagation(); this.handleToggleClick(toggle); });
    });
    this.initDarkModeToggle();
  }
  initDarkModeToggle() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (!darkModeToggle) return;
    const newToggle = darkModeToggle.cloneNode(true);
    darkModeToggle.parentNode.replaceChild(newToggle, darkModeToggle);
    this.updateDarkModeToggle();
    newToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.patientDarkModeManager) {
        window.patientDarkModeManager.toggle();
        setTimeout(() => {
          const isDark = localStorage.getItem('patientDarkMode') === 'true';
          this.updateToggleState(newToggle, isDark);
        }, 100);
      }
    });
  }
  handleToggleClick(toggle) {
    if (toggle.classList.contains('dark-mode-toggle')) return;
    const isActive = toggle.classList.contains('active');
    const newState = !isActive;
    this.updateToggleState(toggle, newState);
    this.handleToggleAction(toggle, newState);
  }
  handleToggleAction(toggle, state) {
    const toggleType = Array.from(toggle.classList).find(cls => cls.includes('-toggle') && cls !== 'toggle-switch' && cls !== 'toggle-slider') || 'default';
    const messages = {
      'appointment-toggle': state ? 'Appointment reminders enabled' : 'Appointment reminders disabled',
      'medication-toggle': state ? 'Medication alerts enabled' : 'Medication alerts disabled',
      'healthtips-toggle': state ? 'Health tips enabled' : 'Health tips disabled',
      'twofactor-toggle': state ? 'Two-factor authentication enabled' : 'Two-factor authentication disabled',
      'datasharing-toggle': state ? 'Data sharing enabled' : 'Data sharing disabled',
      'largetext-toggle': state ? 'Large text enabled' : 'Large text disabled',
      'default': state ? 'Setting enabled' : 'Setting disabled'
    };
    const message = messages[toggleType] || messages.default;
    this.showNotification(message);
    this.saveToggleState(toggleType, state);
  }
  updateToggleState(toggle, isActive) { if (isActive) toggle.classList.add('active'); else toggle.classList.remove('active'); }
  updateDarkModeToggle() { const darkModeToggle = document.querySelector('.dark-mode-toggle'); if (darkModeToggle) { const isDarkMode = localStorage.getItem('patientDarkMode') === 'true'; this.updateToggleState(darkModeToggle, isDarkMode); } }
  saveToggleState(toggleType, state) {
    try {
      const toggleStates = JSON.parse(localStorage.getItem('patientToggleStates') || '{}');
      toggleStates[toggleType] = state;
      localStorage.setItem('patientToggleStates', JSON.stringify(toggleStates));
    } catch (error) { console.error('Error saving toggle state:', error); }
  }
  loadToggleStates() {
    try {
      const toggleStates = JSON.parse(localStorage.getItem('patientToggleStates') || '{}');
      Object.keys(toggleStates).forEach(toggleType => {
        const toggle = document.querySelector(`.${toggleType}`);
        if (toggle && !toggle.classList.contains('dark-mode-toggle')) this.updateToggleState(toggle, toggleStates[toggleType]);
      });
    } catch (error) { console.error('Error loading toggle states:', error); }
  }
  showNotification(message) { showToast(message, 'success'); }
}

/* Dark mode manager (preserve) */
class PatientDarkModeManager {
  constructor() { this.isDarkMode = localStorage.getItem('patientDarkMode') === 'true'; this.init(); }
  init() { this.applyTheme(); this.initDarkModeToggle(); }
  initDarkModeToggle() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (!darkModeToggle) return;
    this.updateDarkModeToggle();
    darkModeToggle.addEventListener('click', (e) => { e.stopPropagation(); this.toggle(); });
  }
  applyTheme() {
    if (this.isDarkMode) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    this.updateDarkModeToggle();
  }
  updateDarkModeToggle() {
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    if (!darkModeToggle) return;
    if (this.isDarkMode) darkModeToggle.classList.add('active'); else darkModeToggle.classList.remove('active');
  }
  toggle() {
    this.isDarkMode = !this.isDarkMode;
    localStorage.setItem('patientDarkMode', this.isDarkMode);
    this.applyTheme();
    showToast(this.isDarkMode ? 'Dark mode enabled' : 'Light mode enabled', 'info');
  }
}

/* ---------------------- Page navigation helpers (preserve) ---------------------- */
function getPageTitle(pageId) {
  const titles = {
    dashboard: "Dashboard",
    chatbot: "AI Health Assistant",
    appointments: "My Appointments",
    medications: "Medications",
    reports: "Medical Reports",
    notifications: "Notifications",
    profile: "My Profile",
  };
  return titles[pageId] || "CareConnect";
}
function getPageSubtitle(pageId) {
  const subtitles = {
    dashboard: "Welcome back! Here's your health overview.",
    chatbot: "Get instant answers to your health questions",
    appointments: "Manage your upcoming medical appointments",
    medications: "View and manage your medications",
    reports: "Access your medical test results and reports",
    notifications: "Stay updated with important health alerts",
    profile: "View and manage your personal information",
  };
  return subtitles[pageId] || "";
}
function showPage(pageId) {
  document.querySelectorAll(".page-content").forEach((page) => page.classList.remove("active"));
  const pageEl = document.getElementById(`${pageId}-page`);
  if (pageEl) pageEl.classList.add("active");
  document.querySelectorAll(".menu-item").forEach((item) => item.classList.remove("active"));
  const menuItems = document.querySelectorAll(".menu-item");
  for (let item of menuItems) {
    if (item.textContent.includes(getPageTitle(pageId))) { item.classList.add("active"); break; }
  }
  const pageTitle = document.getElementById("pageTitle");
  const pageSubtitle = document.getElementById("pageSubtitle");
  if (pageTitle) pageTitle.textContent = getPageTitle(pageId);
  if (pageSubtitle) pageSubtitle.textContent = getPageSubtitle(pageId);
  closeMobileSidebar();
}

/* ---------------------- Local camera handling (patient preview) ---------------------- */
let localStream = null;
let localVideoEl = null;
async function startLocalCamera() {
  const patientVideoContainer = document.querySelector(".patient-video");
  if (!patientVideoContainer) return;

  // If already exists, do nothing
  if (localVideoEl) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
    localStream = stream;

    const video = document.createElement("video");
    video.autoplay = true;
    video.muted = true; // mute local preview
    video.playsInline = true;
    video.srcObject = stream;
    video.className = "local-preview-video";
    // clear placeholder patient-avatar-meeting if present
    const placeholder = patientVideoContainer.querySelector(".patient-avatar-meeting");
    if (placeholder) placeholder.style.display = "none";
    patientVideoContainer.appendChild(video);
    localVideoEl = video;
    try { await video.play(); } catch(e){ /* ignore autoplay issues */ }

  } catch (err) {
    console.error("getUserMedia failed", err);
    throw err;
  }
}

function stopLocalCamera() {
  if (localVideoEl && localVideoEl.parentNode) {
    localVideoEl.parentNode.removeChild(localVideoEl);
    localVideoEl = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  // restore placeholder if available
  const patientVideoContainer = document.querySelector(".patient-video");
  const placeholder = patientVideoContainer?.querySelector(".patient-avatar-meeting");
  if (placeholder) placeholder.style.display = "";
}

/* ---------------------- Animated Doctor Avatar (Minimal AI Doctor) ---------------------- */
/*
  Implementation notes:
  - This is a minimal, self-contained talking avatar implementation that uses
    the Web Speech API (speechSynthesis) for TTS and approximates lip movement
    using utterance boundary events and timers.
  - The avatar is drawn into a canvas added inside .doctor-video element.
  - The system is built so it can later be connected to ElevenLabs / Sora audio streams
    by replacing doctorSpeak() to play remote audio and drive animateMouth(amplitude).
*/

let doctorAvatar = {
  canvas: null,
  ctx: null,
  animRequest: null,
  mouthOpen: 0, // 0..1
  speaking: false,
  synthUtterance: null,
  lastBoundaryAt: 0,
  boundaryTimer: null
};

function initDoctorAvatar() {
  // If already initialized, do nothing
  if (doctorAvatar.canvas) return;

  // Prefer an existing canvas in markup (id="doctorAvatarCanvas")
  let canvas = document.getElementById("doctorAvatarCanvas");

  // If not present, create and insert into .video-container
  const videoContainer = document.querySelector(".patient-video");
  if (!canvas) {
    if (!videoContainer) {
      console.warn("initDoctorAvatar: no .video-container or .doctor-video element found.");
      return;
    }
    canvas = document.createElement("canvas");
    canvas.id = "doctorAvatarCanvas";
    // Full-cover absolutely positioned canvas so it sits above background but under local preview
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    // ensure it sits above background but below localVideo (localVideo z-index:30)
    canvas.style.zIndex = "20";
    // insert as first child so it is visible under patient camera (which is z-index:30)
    videoContainer.insertBefore(canvas, videoContainer.firstChild);
  } else {
    // If canvas exists in DOM, enforce correct positioning to be visible
    canvas.style.position = canvas.style.position || "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = canvas.style.width || "100%";
    canvas.style.height = canvas.style.height || "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = canvas.style.zIndex || "20";
  }

  // store ref
  doctorAvatar.canvas = canvas;

  // produce a high-dpi sized canvas and create context
  function resizeCanvas() {
    if (!doctorAvatar.canvas) return;
    const c = doctorAvatar.canvas;
    const rect = c.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    // avoid zero sizes
    const cssW = Math.max(200, rect.width || 300);
    const cssH = Math.max(200, rect.height || 200);
    c.width = Math.max(200, Math.floor(cssW * dpr));
    c.height = Math.max(200, Math.floor(cssH * dpr));
    c.style.width = `${cssW}px`;
    c.style.height = `${cssH}px`;
    const ctx = c.getContext("2d");
    // reset transform and scale for DPR
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    doctorAvatar.ctx = ctx;
    // initial draw
    drawDoctorFace(doctorAvatar.mouthOpen);
  }

  // observe size changes
  if ("ResizeObserver" in window && videoContainer) {
    const ro = new ResizeObserver(resizeCanvas);
    ro.observe(videoContainer);
    // keep a reference to unobserve later if needed
    doctorAvatar._resizeObserver = ro;
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  // initial size
  resizeCanvas();

  // start animation loop (if not started)
  function loop() {
    drawDoctorFace(doctorAvatar.mouthOpen);
    doctorAvatar.animRequest = requestAnimationFrame(loop);
  }
  if (!doctorAvatar.animRequest) doctorAvatar.animRequest = requestAnimationFrame(loop);
}
// ---------- END REPLACEMENT ----------


function stopDoctorAvatar() {
  if (doctorAvatar.synthUtterance) {
    try { window.speechSynthesis.cancel(); } catch(e) { /* ignore */ }
    doctorAvatar.synthUtterance = null;
  }
  doctorAvatar.speaking = false;
  if (doctorAvatar.animRequest) {
    cancelAnimationFrame(doctorAvatar.animRequest);
    doctorAvatar.animRequest = null;
  }
  // clear boundary timer
  if (doctorAvatar.boundaryTimer) {
    clearTimeout(doctorAvatar.boundaryTimer);
    doctorAvatar.boundaryTimer = null;
  }
}

function resetDoctorAvatarCanvas() {
  if (!doctorAvatar.canvas || !doctorAvatar.ctx) return;
  const ctx = doctorAvatar.ctx;
  const canvas = doctorAvatar.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // remove element
  if (doctorAvatar.canvas.parentNode) doctorAvatar.canvas.parentNode.removeChild(doctorAvatar.canvas);
  doctorAvatar.canvas = null;
  doctorAvatar.ctx = null;
  doctorAvatar.mouthOpen = 0;
}

/* drawDoctorFace: simple stylized face with mouth scaled by mouthOpen (0..1) */
function drawDoctorFace(mouthOpen) {
  const canvas = doctorAvatar.canvas;
  const ctx = doctorAvatar.ctx;
  if (!canvas || !ctx) return;
  // work in CSS pixels (canvas is scaled already)
  const W = canvas.clientWidth;
  const H = canvas.clientHeight;
  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // Translate to center area
  const cx = W / 2;
  const cy = H / 2.2;
  const faceR = Math.min(W, H) * 0.28;

  // face circle
  ctx.beginPath();
  ctx.fillStyle = "#f7e9d9";
  ctx.strokeStyle = "#e0cdb7";
  ctx.lineWidth = 2;
  ctx.arc(cx, cy, faceR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // eyes
  const eyeY = cy - faceR * 0.2;
  const eyeDx = faceR * 0.5;
  ctx.beginPath();
  ctx.fillStyle = "#222";
  ctx.ellipse(cx - eyeDx, eyeY, faceR * 0.12, faceR * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + eyeDx, eyeY, faceR * 0.12, faceR * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();

  // subtle smile / chin line
  ctx.beginPath();
  ctx.strokeStyle = "#d6bca0";
  ctx.lineWidth = 1.5;
  ctx.arc(cx, cy + faceR * 0.07, faceR * 0.5, 0, Math.PI);
  ctx.stroke();

  // mouth - use mouthOpen to animate
  const mouthW = faceR * 0.9;
  const mouthH = Math.max(4, faceR * 0.25 * Math.min(1, mouthOpen * 1.3));
  const mouthX = cx - mouthW / 2;
  const mouthY = cy + faceR * 0.35;
  // mouth background
  ctx.beginPath();
  ctx.fillStyle = "#7a2b2b";
  roundRect(ctx, mouthX, mouthY, mouthW, mouthH, mouthH * 0.4);
  ctx.fill();

  // teeth highlight when mouth more closed
  if (mouthOpen < 0.4) {
    ctx.beginPath();
    ctx.fillStyle = "#fff";
    const teethH = mouthH * 0.5;
    roundRect(ctx, mouthX + mouthW * 0.06, mouthY + mouthH * 0.06, mouthW * 0.88, teethH, teethH * 0.3);
    ctx.fill();
  }

  // doctor initials or subtle badge
  ctx.beginPath();
  ctx.fillStyle = "#2b6cb0";
  ctx.arc(cx - faceR * 0.65, cy - faceR * 0.8, faceR * 0.16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `${Math.max(12, faceR * 0.15)}px Inter, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("DR", cx - faceR * 0.65, cy - faceR * 0.8);

  ctx.restore();
}

/* Helper: rounded rect */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* animateMouthTo: smoothly update mouthOpen target */
function animateMouthTo(value, duration = 120) {
  value = Math.max(0, Math.min(1, value));
  const start = doctorAvatar.mouthOpen;
  const diff = value - start;
  const startTime = performance.now();
  function step(now) {
    const t = Math.min(1, (now - startTime) / duration);
    // ease out
    const ease = 1 - Math.pow(1 - t, 3);
    doctorAvatar.mouthOpen = start + diff * ease;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/* doctorSpeak(text): speak via Web Speech API and animate mouth using onboundary events */
function doctorSpeak(text, opts = {}) {
  if (!("speechSynthesis" in window)) {
    console.warn("SpeechSynthesis not available");
    // fallback: show toast only
    showToast("Doctor: " + text, "info");
    // still animate some mouth movement based on rough timing
    const approximateDuration = Math.max(1000, text.split(/\s+/).length * 220);
    animateMouthTo(0.9, 100);
    setTimeout(() => animateMouthTo(0, 300), approximateDuration);
    return;
  }

  // ensure avatar canvas exists
  initDoctorAvatar();

  try {
    window.speechSynthesis.cancel(); // stop any prior speech
  } catch (e) { /* ignore */ }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = opts.lang || "en-US";
  utterance.pitch = opts.pitch ?? 1;
  utterance.rate = opts.rate ?? 1;
  utterance.volume = opts.volume ?? 1;

  doctorAvatar.speaking = true;
  doctorAvatar.synthUtterance = utterance;

  // onstart: open mouth
  utterance.onstart = () => {
    animateMouthTo(0.9, 80);
  };

  // onboundary gives word boundaries in many browsers; use to create mouth pulses
  utterance.onboundary = (evt) => {
    // evt.charIndex, evt.name, evt.elapsedTime, evt.charLength
    // open mouth briefly on each boundary
    animateMouthTo(0.95, 60);
    // schedule closing shortly after
    if (doctorAvatar.boundaryTimer) clearTimeout(doctorAvatar.boundaryTimer);
    doctorAvatar.boundaryTimer = setTimeout(() => {
      animateMouthTo(0.05, 220);
    }, 80 + Math.random() * 120);
  };

  utterance.onend = () => {
    doctorAvatar.speaking = false;
    animateMouthTo(0, 200);
    doctorAvatar.synthUtterance = null;
  };

  utterance.onerror = (err) => {
    console.error("TTS error", err);
    doctorAvatar.speaking = false;
    animateMouthTo(0, 200);
    doctorAvatar.synthUtterance = null;
  };

  window.speechSynthesis.speak(utterance);
}

/* stopDoctorAvatar: cancel speech and animation - implemented above */

/* ---------------------- Initialization ---------------------- */
let patientToggleManager;
let patientDarkModeManager;

document.addEventListener("DOMContentLoaded", async () => {
  // quick session check; token must exist — full redirect handled in loader
  const token = getToken();
  if (!token) return redirectToLogin("Please login to access patient dashboard.");

  // wire basic UI elements (non-destructive)
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", toggleMobileSidebar);
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeMobileSidebar);
  const closeSidebarBtn = document.getElementById("closeSidebar");
  if (closeSidebarBtn) closeSidebarBtn.addEventListener("click", closeMobileSidebar);

  // chat wiring
  const sendBtn = document.getElementById("sendBtn");
  const chatInput = document.getElementById("chatInput");
  if (sendBtn) sendBtn.addEventListener("click", sendMessage);
  if (chatInput) chatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendMessage(); });

  // call selection modal close on overlay click (nice UX)
  document.getElementById("callSelectionModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeCallSelectionModal();
  });
  // video/voice modal overlay close
  document.getElementById("videoCallModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) endVideoCall();
  });
  document.getElementById("voiceCallModal")?.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) endVoiceCall();
  });

  // meeting control buttons behavior (mute/video toggle) - basic local UI toggles
  document.querySelectorAll(".meeting-controls .control-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const title = btn.getAttribute("title") || "";
      if (title.toLowerCase().includes("mute")) {
        toggleLocalAudioMute(btn);
      } else if (title.toLowerCase().includes("video off")) {
        toggleLocalVideoOff(btn);
      } else if (title.toLowerCase().includes("share screen")) {
        showToast("Screen share is not implemented in demo", "info");
      }
    });
  });

  // toggle managers
  try { patientToggleManager = new PatientToggleManager(); } catch(e){ console.warn("ToggleManager init failed", e); }
  try { patientDarkModeManager = new PatientDarkModeManager(); } catch(e){ console.warn("DarkMode init failed", e); }

  // Load profile & dashboard
  try {
    await loadProfileAndDashboard();
  } catch (err) {
    console.error("Initialization error:", err);
    showToast("Error initializing dashboard. See console.", "error");
  }

  // default page
  showPage("dashboard");

  // if patientData exists in localStorage, keep it available
  const cached = localStorage.getItem("patientData");
  if (!cached) {
    // If profile was loaded, it was saved already by loader
  }
});

/* ---------------------- Preserve older global functions used by markup ---------------------- */
/* Many handlers referenced by markup (e.g., bookAppointment, editProfile) are intentionally preserved */
function bookAppointment() { showToast("Appointment booking page opened"); }
function editProfile() { showToast("Profile edit mode activated"); }
function markAllAsRead() {
  document.querySelectorAll(".notification-badge").forEach((badge) => badge.style.display = "none");
  showToast("All notifications marked as read");
}
function addSymptom() { showToast("Symptom added to your medical record"); }

/* ---------------------- Simple meeting control toggles ---------------------- */
let localAudioMuted = false;
let localVideoOff = false;
function toggleLocalAudioMute(buttonEl) {
  localAudioMuted = !localAudioMuted;
  if (localStream) {
    localStream.getAudioTracks().forEach(t => t.enabled = !localAudioMuted);
  }
  buttonEl.classList.toggle("active", localAudioMuted);
  showToast(localAudioMuted ? "Microphone muted" : "Microphone unmuted");
}
function toggleLocalVideoOff(buttonEl) {
  localVideoOff = !localVideoOff;
  if (localStream) {
    localStream.getVideoTracks().forEach(t => t.enabled = !localVideoOff);
  }
  // reflect on local preview
  if (localVideoEl) {
    localVideoEl.style.opacity = localVideoOff ? "0.25" : "1";
  }
  buttonEl.classList.toggle("active", localVideoOff);
  showToast(localVideoOff ? "Camera turned off" : "Camera turned on");
}

/* ---------------------- Cleanup on page unload ---------------------- */
window.addEventListener("beforeunload", () => {
  try { stopLocalCamera(); } catch(e) {}
  try { stopDoctorAvatar(); } catch(e) {}
});

/* End of file */
