// nurse_dashboard.js (rewritten)
// Backend-first consolidated version - checkbox medication scheduling
// Boss: uses backend notifications (Option B)

const API_BASE = "http://localhost:4000/api";
const token = localStorage.getItem("nurseToken") || "";

// PDF.js worker
if (typeof pdfjsLib !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
}

// Global managers
let notificationManager;
let darkModeManager;
let toggleManager;
let lastAIData = {};

async function loadNurseProfile() {
    try {
        const res = await fetch(`${API_BASE}/nurse/profile`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn("Failed to load nurse profile");
            return;
        }

        const nurse = await res.json();

        // Update UI
        const nameEl = document.getElementById("nurseName");
        const idEl = document.getElementById("nurseId");

        if (nameEl) nameEl.textContent = nurse.fullName || "Nurse";
        if (idEl) idEl.textContent = nurse.nurseId || "N/A";

    } catch (err) {
        console.error("loadNurseProfile error:", err);
    }
}


async function loadDashboardStats() {
    try {
        const res = await fetch(`${API_BASE}/nurse/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn("Failed to load /nurse/stats");
            return;
        }

        const stats = await res.json();

        // === Update Stat Cards ===
        document.getElementById("statTotalPatients").textContent = stats.totalPatients ?? 0;
        document.getElementById("statGood").textContent = stats.goodCount ?? 0;
        document.getElementById("statModerate").textContent = stats.moderateCount ?? 0;
        document.getElementById("statAlert").textContent = stats.alertCount ?? 0;
        document.getElementById("statCompleted").textContent = stats.completedFollowups ?? 0;

        // === Optional Trend Numbers (Dummy for now; can upgrade later) ===
        document.getElementById("statTotalChange").textContent = "↑ 12% from last month";
        document.getElementById("statGoodChange").textContent = "↑ 8% from last month";
        document.getElementById("statModerateChange").textContent = "↓ 5% from last month";
        document.getElementById("statAlertChange").textContent = "↑ 2% from last month";
        document.getElementById("statCompletedChange").textContent = "↑ 15% from last month";


    } catch (err) {
        console.error("loadDashboardStats error:", err);
    }
}


// Convert incoming extracted dates to yyyy-mm-dd for <input type="date">
function convertToISO(dateString) {
    if (!dateString) return "";
    
    // already ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;

    const months = {
        Jan: "01", January: "01",
        Feb: "02", February: "02",
        Mar: "03", March: "03",
        Apr: "04", April: "04",
        May: "05",
        Jun: "06", June: "06",
        Jul: "07", July: "07",
        Aug: "08", August: "08",
        Sep: "09", September: "09",
        Oct: "10", October: "10",
        Nov: "11", November: "11",
        Dec: "12", December: "12"
    };

    // Matches: 12 Jan 2025, 7 December 2024, etc.
    let m = dateString.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
    if (m) {
        const day = m[1].padStart(2, "0");
        const month = months[m[2]] || months[m[2].substring(0,3)];
        if (month) return `${m[3]}-${month}-${day}`;
    }

    // fallback
    const d = new Date(dateString);
    if (!isNaN(d)) return d.toISOString().split("T")[0];

    return "";
}

function monthName(num) {
    return ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][num-1];
}


// ---------- DOMContentLoaded (single initializer) ----------
document.addEventListener("DOMContentLoaded", async function () {
    try {
        /* ------------------------------------------------------
           🔥 Load logged-in nurse profile from backend
        ------------------------------------------------------ */
        await loadNurseProfile();   // ⭐ NEW — adds dynamic nurse name + ID


        /* ------------------------------------------------------
           Attach UI handlers
        ------------------------------------------------------ */
        const mobileMenuBtn = document.getElementById("mobileMenuBtn");
        if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", toggleMobileSidebar);

        const sidebarClose = document.getElementById("sidebarClose");
        if (sidebarClose) sidebarClose.addEventListener("click", closeMobileSidebar);


        /* ------------------------------------------------------
           Initialize managers
        ------------------------------------------------------ */
        notificationManager = new NotificationManager();
        darkModeManager = new DarkModeManager();
        toggleManager = new ToggleManager();


        /* ------------------------------------------------------
           Load dashboard lists (good / moderate / alert patients)
        ------------------------------------------------------ */
        await loadDashboardLists();


        /* ------------------------------------------------------
           File upload handler
        ------------------------------------------------------ */
        const fileInput = document.getElementById("fileInput");
        if (fileInput) fileInput.addEventListener("change", handleFileUpload);


        /* ------------------------------------------------------
           Patient form submission handler
        ------------------------------------------------------ */
        const patientForm = document.getElementById("patientForm");
        if (patientForm) {
            const form = patientForm.querySelector("form");
            if (form) form.addEventListener("submit", handleSubmit);
        }


        /* ------------------------------------------------------
           Always create one blank medication entry
        ------------------------------------------------------ */
        addMedicationField();


        console.log("nurse_dashboard initialized");

    } catch (err) {
        console.error("Initialization error:", err);
    }
});


// ---------- Mobile Sidebar ----------
function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("mobile-open");

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (!mobileMenuBtn) return;
    mobileMenuBtn.style.display = sidebar.classList.contains("mobile-open") ? "none" : "flex";
}

function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;
    sidebar.classList.remove("mobile-open");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (mobileMenuBtn) mobileMenuBtn.style.display = "flex";
}

// Close sidebar when clicking outside on mobile
document.addEventListener("click", function (event) {
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (!sidebar || !mobileMenuBtn) return;

    if (
        window.innerWidth <= 768 &&
        sidebar.classList.contains("mobile-open") &&
        !sidebar.contains(event.target) &&
        !mobileMenuBtn.contains(event.target)
    ) {
        closeMobileSidebar();
    }
});

// Close mobile menu when clicking on menu items
document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function () {
        if (window.innerWidth <= 768) closeMobileSidebar();
    });
});

// Close mobile menu when pressing Escape key
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar && sidebar.classList.contains("mobile-open")) closeMobileSidebar();
    }
});

// Resize handler
window.addEventListener("resize", function () {
    const sidebar = document.querySelector(".sidebar");
    const menuBtn = document.getElementById("mobileMenuBtn");
    if (!sidebar || !menuBtn) return;

    if (window.innerWidth > 768) {
        sidebar.classList.remove("mobile-open");
        document.body.style.overflow = "";
        menuBtn.style.display = "none";
    } else {
        menuBtn.style.display = "flex";
    }
});

// ---------- showPage ----------
function showPage(pageId, event) {
    if (event) event.preventDefault();

    // Remove active state from all pages + menu items
    document.querySelectorAll(".page-content").forEach((p) => p.classList.remove("active"));
    document.querySelectorAll(".menu-item").forEach((i) => i.classList.remove("active"));

    // Activate selected page
    const target = document.getElementById(pageId);
    if (target) target.classList.add("active");

    // Highlight menu item
    if (event && event.currentTarget) event.currentTarget.classList.add("active");

    // --- 🔥 NEW: Load Statistics from Backend ---
    if (pageId === "statistics") {
        loadDashboardStats();                  // Fetch backend numbers
        setTimeout(() => initializeCharts(), 200); // Re-draw charts with real data
    }

    // Load notifications when entering notification page
    if (pageId === "notifications" && notificationManager) {
        setTimeout(() => notificationManager.renderPageNotifications(), 100);
    }

    // Auto-close sidebar on mobile
    if (window.innerWidth <= 768) closeMobileSidebar();
}


// ---------- Charts (keeps UI intact) ----------
let performanceChart, completionChart, trendsChart, statusChart;

function updatePerformanceChart(good = 0, moderate = 0, alert = 0) {
    const ctx = document.getElementById("performanceChart");
    if (!ctx) return;

    if (performanceChart) performanceChart.destroy();

    performanceChart = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: ["Good", "Moderate", "Alert"],
            datasets: [{
                data: [good, moderate, alert],
                backgroundColor: [
                    "rgba(52,168,83,0.8)",
                    "rgba(251,188,5,0.8)",
                    "rgba(234,67,53,0.8)"
                ],
                borderColor: [
                    "rgba(52,168,83,1)",
                    "rgba(251,188,5,1)",
                    "rgba(234,67,53,1)"
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: "bottom" }
            },
            cutout: "65%"
        }
    });
}


async function initializeCharts() {
    try {
        /* ---- UNIVERSAL CHART DESTROYER ---- */
        const chartIds = ["performanceChart", "completionChart", "trendsChart", "statusChart"];

        chartIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (!canvas) return;

            const existing = Chart.getChart(canvas);
            if (existing) existing.destroy();   // Proper destruction
        });

        performanceChart = null;
        completionChart = null;
        trendsChart = null;
        statusChart = null;

        /* ---- FETCH BACKEND STATS ---- */
        const statsRes = await fetch(`${API_BASE}/nurse/stats`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const stats = statsRes.ok ? await statsRes.json() : {
            total: 0,
            good: 0,
            moderate: 0,
            alert: 0,
            last30Days: 0,
            monthly: []
        };

        const monthly = Array.isArray(stats.monthly) ? stats.monthly : [];
        const trendLabels = monthly.map(m => monthName(m._id?.month || 1));
        const trendValues = monthly.map(m => m.count || 0);


        /* ---------------- PERFORMANCE DISTRIBUTION ---------------- */
        const perfCtx = document.getElementById("performanceChart");
        if (perfCtx) {
            performanceChart = new Chart(perfCtx, {
                type: "doughnut",
                data: {
                    labels: ["Good", "Moderate", "Alert"],
                    datasets: [{
                        data: [stats.good, stats.moderate, stats.alert],
                        backgroundColor: [
                            "rgba(52,168,83,0.85)",
                            "rgba(251,188,5,0.85)",
                            "rgba(234,67,53,0.85)"
                        ],
                        borderWidth: 2,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "60%",
                    plugins: { legend: { position: "bottom" } }
                }
            });
        }


        /* ---------------- FOLLOW-UP COMPLETION ---------------- */
        const completionCtx = document.getElementById("completionChart");
        if (completionCtx) {
            completionChart = new Chart(completionCtx, {
                type: "bar",
                data: {
                    labels: ["Last 30 Days"],
                    datasets: [{
                        label: "Completed Follow-ups",
                        data: [stats.last30Days],
                        backgroundColor: "rgba(52,168,83,0.8)"
                    }]
                },
                options: { responsive: true, scales: { y: { beginAtZero: true } } }
            });
        }


        /* ---------------- MONTHLY TRENDS ---------------- */
        const trendsCtx = document.getElementById("trendsChart");
        if (trendsCtx) {
            trendsChart = new Chart(trendsCtx, {
                type: "line",
                data: {
                    labels: trendLabels,
                    datasets: [{
                        label: "New Patients",
                        data: trendValues,
                        borderColor: "#4b7bec",
                        backgroundColor: "rgba(75,123,236,0.2)",
                        tension: 0.35,
                        fill: true
                    }]
                },
                options: { responsive: true }
            });
        }


        /* ---------------- FOLLOW-UP STATUS PIE ---------------- */
        const statusCtx = document.getElementById("statusChart");
        if (statusCtx) {
            statusChart = new Chart(statusCtx, {
                type: "pie",
                data: {
                    labels: ["Good", "Moderate", "Alert"],
                    datasets: [{
                        data: [stats.good, stats.moderate, stats.alert],
                        backgroundColor: ["#2ecc71", "#f1c40f", "#e74c3c"]
                    }]
                },
                options: { responsive: true }
            });
        }

    } catch (err) {
        console.error("Error initializing charts:", err);
    }
}



// ---------- File upload & PDF extraction ----------
async function handleFileUpload(event) {
    try {
        const files = event.target.files || event.files || (event.dataTransfer && event.dataTransfer.files);
        if (!files || files.length === 0) return;

        const file = files[0];
        if (!file) return;

        const uploadedFile = document.getElementById("uploadedFile");
        const processingIndicator = document.getElementById("processingIndicator");
        const fileName = document.getElementById("fileName");
        const fileSize = document.getElementById("fileSize");

        if (fileName) fileName.textContent = file.name;
        if (fileSize) fileSize.textContent = formatFileSize(file.size);
        if (uploadedFile) uploadedFile.style.display = "flex";
        if (processingIndicator) processingIndicator.style.display = "flex";

        if (file.type === "application/pdf") {
            await processPDFFile(file);
        } else if (file.type.startsWith("image/")) {
            // For images: ideally call OCR service. For now, show form and run AI if available.
            setTimeout(() => {
                if (processingIndicator) processingIndicator.style.display = "none";
                showPatientForm();
                autoFillFormFromDocument();
            }, 1200);
        } else {
            throw new Error("Unsupported file type");
        }
    } catch (err) {
        console.error("handleFileUpload error:", err);
        const processingIndicator = document.getElementById("processingIndicator");
        if (processingIndicator) processingIndicator.style.display = "none";
        alert("Error processing file. Please try again.");
    }
}

async function processPDFFile(file) {
    try {
        const arrayBuffer = await file.arrayBuffer();
        if (typeof pdfjsLib === "undefined") throw new Error("pdfjsLib not available");

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let extractedText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item) => item.str).join(" ");
            extractedText += pageText + "\n";
        }

        // Process locally first (for speed) and call AI backend
        await processExtractedText(extractedText);

        const processingIndicator = document.getElementById("processingIndicator");
        if (processingIndicator) processingIndicator.style.display = "none";
        showPatientForm();
    } catch (err) {
        console.error("processPDFFile error:", err);
        const processingIndicator = document.getElementById("processingIndicator");
        if (processingIndicator) processingIndicator.style.display = "none";
        alert("Unable to process PDF. The document might be scanned (image-based). Try an OCR-capable file or upload an image.");
    }
}

// ---------- Extraction helpers ----------
async function processExtractedText(text) {
    console.log("Raw extracted PDF text:", text);

    // Local regex quick pass (non-exhaustive)
    const local = {
        patientName: extractPatientName(text),
        age: extractAge(text),
        gender: extractGender(text),
        patientId: extractPatientId(text),
        hospitalCode: extractHospitalCode(text),
        primaryPhysician: extractPrimaryPhysician(text),
        admissionDate: extractAdmissionDate(text),
        dischargeDate: extractDischargeDate(text),
        primaryDiagnosis: extractPrimaryDiagnosis(text),
        secondaryNotes: extractSecondaryNotes(text),
        procedure: extractProcedure(text),
        surgeryDate: extractSurgeryDate(text),
        complications: extractComplications(text),
        treatmentSummary: extractTreatmentSummary(text),
        temperature: extractTemperature(text),
        heartRate: extractHeartRate(text),
        bloodPressure: extractBloodPressure(text),
        oxygenSaturation: extractOxygenSaturation(text),
        respiratoryRate: extractRespiratoryRate(text),
        dischargeMeds: extractDischargeMeds(text),
        followUpPlan: extractFollowUpPlan(text),
        homeCare: extractHomeCare(text),
        emergencyContacts: extractEmergencyContacts(text)
    };

    // Merge local into lastAIData so we don't overwrite later
    lastAIData = { ...lastAIData, ...local };

    // Try call to AI backend for improved extraction (non-blocking but awaited here so UI consistent)
    try {
        const res = await sendTextToAIBackend(text);
        const aiData = (res && (res.data || res)) || {};
        // merge AI results over local
        lastAIData = { ...lastAIData, ...aiData };
    } catch (err) {
        console.warn("AI backend failed — continuing with local extraction", err);
    }


    // Fill fields
    fillFormFieldsFromAI(lastAIData);

    // Fill medication blocks if present
    if (Array.isArray(lastAIData.medications)) {
        fillMedicationsFromAI(lastAIData.medications);
    } else if (lastAIData.dischargeMeds && typeof lastAIData.dischargeMeds === "string") {
        // fallback: put string into dischargeMeds textarea and optionally parse into rows later
        const dm = document.getElementById("dischargeMeds");
        if (dm) dm.value = lastAIData.dischargeMeds;
    }

    showNotification("Extraction completed (local + AI). Review fields before submit.", "success");
}

function prettyValue(value) {
    // If null or empty
    if (value === null || value === undefined || value === "") return "";

    // If value is already a simple string or number
    if (typeof value === "string" || typeof value === "number") return String(value);

    // If value is an array → convert each item
    if (Array.isArray(value)) {
        return value
            .map(v => prettyValue(v))   // recursive
            .join("\n");                // each on new line
    }

    // If it’s an object → convert to readable bullet-like text
    if (typeof value === "object") {
        let lines = [];
        for (const [key, val] of Object.entries(value)) {
            lines.push(`${key}: ${prettyValue(val)}`);
        }
        return lines.join(", ");
    }

    return String(value);
}


function fillFormFieldsFromAI(data) {
    Object.keys(data || {}).forEach(key => {
        if (key === "medications") return;

        const el = document.getElementById(key);
        if (!el) return;

        let raw = data[key];

        // Convert objects/arrays into readable text
        raw = prettyValue(raw);

        if (!raw) return;

        // Handle date inputs
        if (el.type === "date") {
            el.value = convertToISO(raw) || "";
            return;
        }

        el.value = raw;
    });
}






// ---------- Medication UI helpers ----------
function addMedicationField(name = "", dose = "", schedule = {}, notes = "") {
    // schedule: { morning: bool, afternoon: bool, night: bool }
    const container = document.getElementById("medicationList");
    if (!container) return;

    const id = `med-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const html = `
        <div class="medication-block" id="${id}">
            <h4>Medication</h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Medicine Name</label>
                    <input type="text" class="med-name" placeholder="e.g., Amoxicillin" value="${escapeHtml(name)}">
                </div>

                <div class="form-group">
                    <label>Dose</label>
                    <input type="text" class="med-dose" placeholder="e.g., 625 mg" value="${escapeHtml(dose)}">
                </div>

                <div class="form-group">
                    <label>Timing</label>
                    <div class="timing-options">
                        <label><input type="checkbox" class="med-morning" ${schedule.morning ? "checked" : ""}> Morning</label><br>
                        <label><input type="checkbox" class="med-afternoon" ${schedule.afternoon ? "checked" : ""}> Afternoon</label><br>
                        <label><input type="checkbox" class="med-night" ${schedule.night ? "checked" : ""}> Night</label>
                    </div>
                </div>

                <div class="form-group full-width">
                    <label>Notes</label>
                    <input type="text" class="med-notes" placeholder="e.g., After food" value="${escapeHtml(notes)}">
                </div>
            </div>

            <div style="margin-top:8px;">
                <button type="button" class="btn btn-secondary med-remove-btn">Remove</button>
            </div>
            <hr>
        </div>
    `;

    container.insertAdjacentHTML("beforeend", html);

    // attach remove handler on the newly added block
    const block = document.getElementById(id);
    if (!block) return;
    const removeBtn = block.querySelector(".med-remove-btn");
    removeBtn && removeBtn.addEventListener("click", () => block.remove());
}

function fillMedicationsFromAI(meds) {
    // Clear existing med rows to avoid duplicates
    const container = document.getElementById("medicationList");
    if (!container) return;
    container.innerHTML = "";

    meds.forEach(m => {
        // AI may return different key names — be forgiving
        const name = m.name || m.medicine || m.medication || "";
        const dose = m.dose || m.strength || "";
        const notes = m.notes || m.note || "";
        const schedule = {
            morning: !!m.morning,
            afternoon: !!m.afternoon,
            night: !!m.night
        };

        // If AI returns frequency strings, do a best-effort inference
        if (!schedule.morning && !schedule.afternoon && !schedule.night && typeof m.frequency === "string") {
            const freq = m.frequency.toLowerCase();
            if (freq.includes("bd") || freq.includes("twice") || freq.includes("2/day") || freq.includes("bid")) {
                schedule.morning = true; schedule.night = true;
            } else if (freq.includes("tid") || freq.includes("three") || freq.includes("3/day")) {
                schedule.morning = schedule.afternoon = schedule.night = true;
            } else if (freq.includes("once") && freq.includes("night")) {
                schedule.night = true;
            } else if (freq.includes("morning")) schedule.morning = true;
        }

        addMedicationField(name, dose, schedule, notes);
    });

    // If no items added by AI, leave a single blank row
    if (meds.length === 0) addMedicationField();
}

// very small HTML escape for values inserted into attribute contexts
function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/[&<>"']/g, function (m) {
        return { "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[m];
    });
}

// ---------- Auto-fill utilities ----------
function autoFillFormFromDocument() {
    if (!lastAIData || Object.keys(lastAIData).length === 0) return;
    fillFormFieldsFromAI(lastAIData);
    if (Array.isArray(lastAIData.medications)) fillMedicationsFromAI(lastAIData.medications);
}

// ---------- Extraction regex helpers (unchanged but used) ----------
function extractPatientName(text) {
    const nameMatch = text.match(/([A-Z][a-z]+(?: [A-Z][a-z]+)+)(?=.*Age:)/);
    return nameMatch ? nameMatch[1].trim() : "";
}
function extractAge(text) {
    const ageMatch = text.match(/Age:\s*(\d{1,3})/);
    return ageMatch ? ageMatch[1].trim() : "";
}
function extractGender(text) {
    const genderMatch = text.match(/Gender:\s*(Male|Female|Other|male|female|other)/i);
    return genderMatch ? genderMatch[1].toLowerCase().trim() : "";
}
function extractPatientId(text) {
    const idMatch = text.match(/Patient ID:\s*([A-Za-z0-9-]+)/i);
    return idMatch ? idMatch[1].trim() : "";
}
function extractHospitalCode(text) {
    const m = text.match(/Hospital Code:\s*([A-Za-z0-9-]+)/i);
    return m ? m[1].trim() : "";
}
function extractPrimaryPhysician(text) {
    const physicianMatch = text.match(/Primary Physician:\s*(Dr\.?\s*[A-Za-z .]+)/i);
    return physicianMatch ? physicianMatch[1].trim() : "";
}
function extractAdmissionDate(text) {
    const m = text.match(/Date of Admission:\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    return m ? m[1].trim() : "";
}
function extractDischargeDate(text) {
    const m = text.match(/Date of Discharge:\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    return m ? m[1].trim() : "";
}
function extractPrimaryDiagnosis(text) {
    const m = text.match(/Primary Diagnosis:\s*([^\n\.]+?)(?=\s*(?:Secondary Notes|Procedure|Complications|$))/i);
    return m ? m[1].trim() : "";
}
function extractSecondaryNotes(text) {
    const m = text.match(/Secondary Notes:\s*([^\n\.]+)/i);
    return m ? m[1].trim() : "";
}
function extractProcedure(text) {
    const m = text.match(/Procedure Performed:\s*([^\n\.]+?)(?=\s*(?:Surgery Date|Complications|Treatment Summary|$))/i);
    return m ? m[1].trim() : "";
}
function extractSurgeryDate(text) {
    const m = text.match(/Surgery Date:\s*([0-9]{1,2}\s+[A-Za-z]{3,9}\s+[0-9]{4})/i);
    return m ? m[1].trim() : "";
}
function extractComplications(text) {
    const m = text.match(/Complications:\s*([^\n\.]+)/i);
    return m ? m[1].trim() : "";
}
function extractTreatmentSummary(text) {
    const start = text.indexOf("Treatment Summary");
    if (start === -1) return "";
    const end = text.indexOf("4. Discharge Vitals", start);
    if (end === -1) return text.substring(start).replace(/\n/g, " ").trim();
    return text.substring(start + "Treatment Summary".length, end).replace(/\n/g, " ").trim();
}
function extractTemperature(text) {
    const m = text.match(/Temperature:\s*([0-9.]+\s*°?F|[0-9.]+\s*°?C)/i);
    return m ? m[1].trim() : "";
}
function extractHeartRate(text) {
    const m = text.match(/(Pulse|Heart Rate):\s*([0-9]+(?:\s*bpm)?)/i);
    return m ? (m[2] || "").trim() : "";
}
function extractBloodPressure(text) {
    const m = text.match(/BP:\s*([0-9]+\/[0-9]+\s*mmHg)/i);
    return m ? m[1].trim() : "";
}
function extractOxygenSaturation(text) {
    const m = text.match(/SpO2:\s*([0-9]{1,3}%)/i);
    return m ? m[1].trim() : "";
}
function extractRespiratoryRate(text) {
    const m = text.match(/Respiratory Rate:\s*([0-9]+(?:\/min)?)/i);
    return m ? m[1].trim() : "";
}
function extractDischargeMeds(text) {
    const startIndex = text.indexOf("5. Medications on Discharge");
    if (startIndex === -1) return "";
    const endIndex = text.indexOf("6. Follow-Up Plan", startIndex);
    const slice = text.substring(startIndex + "5. Medications on Discharge".length, endIndex > -1 ? endIndex : text.length);
    return slice.trim().split("\n").filter(Boolean).join("\n");
}
function extractFollowUpPlan(text) {
    const startIndex = text.indexOf("6. Follow-Up Plan");
    if (startIndex === -1) return "";
    const endIndex = text.indexOf("7. Restrictions & Home Care", startIndex);
    const slice = text.substring(startIndex + "6. Follow-Up Plan".length, endIndex > -1 ? endIndex : text.length);
    return slice.trim().split("\n").filter(Boolean).join("\n");
}
function extractHomeCare(text) {
    const startIndex = text.indexOf("7. Restrictions & Home Care");
    if (startIndex === -1) return "";
    const endIndex = text.indexOf("8. Emergency Contacts", startIndex);
    const slice = text.substring(startIndex + "7. Restrictions & Home Care".length, endIndex > -1 ? endIndex : text.length);
    return slice.trim().split("\n").filter(Boolean).join("\n");
}
function extractEmergencyContacts(text) {
    const startIndex = text.indexOf("8. Emergency Contacts");
    if (startIndex === -1) return "";
    let endIndex = text.indexOf("9.", startIndex);
    if (endIndex === -1) endIndex = text.length;
    const slice = text.substring(startIndex + "8. Emergency Contacts".length, endIndex);
    return slice.trim().split("\n").filter(Boolean).join("\n");
}

// ---------- AI backend call ----------
async function sendTextToAIBackend(extractedText) {
    if (!token) throw new Error("No token available for AI backend");

    const res = await fetch(`${API_BASE}/patient/extract-ai`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: extractedText })
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`AI backend failed: ${res.status} ${body}`);
    }

    return await res.json();
}

// ---------- Date parsing utility ----------
function parseDate(dateStr) {
    if (!dateStr) return "";
    const months = {
        Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
        Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
        January: "01", February: "02", March: "03", April: "04", May: "05", June: "06",
        July: "07", August: "08", September: "09", October: "10", November: "11", December: "12"
    };

    // "12 Jan 2023" or "12 January 2023"
    const parts = dateStr.trim().split(/\s+/);
    if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = months[parts[1]] || months[parts[1].substring(0,3)];
        const year = parts[2];
        if (month) return `${year}-${month}-${day}`;
    }

    // slashed formats: 01/12/2023 or 1/12/2023 => assume MM/DD/YYYY or M/D/YYYY - preserve original if ambiguous
    const slashParts = dateStr.split("/");
    if (slashParts.length === 3) {
        const [a, b, c] = slashParts;
        // If year in last
        if (c.length === 4) return `${c}-${a.padStart(2,"0")}-${b.padStart(2,"0")}`;
    }

    return dateStr;
}

// ---------- File utils ----------
function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function removeFile() {
    const fileInput = document.getElementById("fileInput");
    if (fileInput) fileInput.value = "";
    const uploadedFile = document.getElementById("uploadedFile");
    if (uploadedFile) uploadedFile.style.display = "none";
    const processingIndicator = document.getElementById("processingIndicator");
    if (processingIndicator) processingIndicator.style.display = "none";
    const patientForm = document.getElementById("patientForm");
    if (patientForm) patientForm.style.display = "none";
}

// Drag-n-drop
const uploadArea = document.getElementById("uploadArea");
if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });
    uploadArea.addEventListener("dragleave", () => uploadArea.classList.remove("dragover"));
    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            const fileInput = document.getElementById("fileInput");
            if (fileInput) fileInput.files = files;
            handleFileUpload({ target: { files } });
        }
    });
}

// ---------- Form handling ----------
function showPatientForm() {
    const pf = document.getElementById("patientForm");
    if (pf) pf.style.display = "block";
}

function resetForm() {
    const pf = document.getElementById("patientForm");
    if (!pf) return;
    const form = pf.querySelector("form");
    if (form) form.reset();
    // reset meds container
    const meds = document.getElementById("medicationList");
    if (meds) meds.innerHTML = "";
    addMedicationField();
    const gen = document.getElementById("generatedPatientId");
    if (gen) gen.style.display = "none";
}

function collectMedicationFields() {
    const blocks = document.querySelectorAll(".medication-block");
    const meds = [];

    blocks.forEach(block => {
        const name = block.querySelector(".med-name")?.value?.trim() || "";
        const dose = block.querySelector(".med-dose")?.value?.trim() || "";
        const notes = block.querySelector(".med-notes")?.value?.trim() || "";

        const morning = block.querySelector(".med-morning")?.checked || false;
        const afternoon = block.querySelector(".med-afternoon")?.checked || false;
        const night = block.querySelector(".med-night")?.checked || false;

        if (name) {
            meds.push({
                name,
                dose,
                schedule: {
                    morning,
                    afternoon,
                    night
                },
                notes
            });
        }
    });

    return meds;
}


let submitting = false;

async function handleSubmit(event) {
    event.preventDefault();
    if (submitting) return;
    submitting = true;

    try {
        const getVal = (id) => {
            const el = document.getElementById(id);
            return el ? (el.value || "") : "";
        };

        // Convert extracted dates into ISO yyyy-mm-dd
        const iso = (val) => val ? convertToISO(val) : null;

        // Build payload correctly
        const formData = {
            patientName: getVal("patientName"),
            age: Number(getVal("age")) || null,
            gender: getVal("gender"),
            hospitalCode: getVal("hospitalCode"),
            primaryPhysician: getVal("primaryPhysician"),

            admissionDate: iso(getVal("admissionDate")),
            dischargeDate: iso(getVal("dischargeDate")),
            surgeryDate: iso(getVal("surgeryDate")),

            primaryDiagnosis: getVal("primaryDiagnosis"),
            secondaryNotes: getVal("secondaryNotes"),
            procedure: getVal("procedure"),
            complications: getVal("complications"),

            treatmentSummary: getVal("treatmentSummary"),
            temperature: getVal("temperature"),
            heartRate: getVal("heartRate"),
            bloodPressure: getVal("bloodPressure"),
            oxygenSaturation: getVal("oxygenSaturation"),
            respiratoryRate: getVal("respiratoryRate"),

            dischargeMeds: getVal("dischargeMeds"),
            followUpPlan: getVal("followUpPlan"),
            homeCare: getVal("homeCare"),
            emergencyContacts: getVal("emergencyContacts"),

            medications: collectMedicationFields()
        };

        // Auto-derive DOB from age
        const age = Number(getVal("age"));
        if (age > 0) {
            const year = new Date().getFullYear() - age;
            formData.dob = `${year}-01-01`;
        }

        if (!formData.patientName) {
            alert("Patient name is required.");
            submitting = false;
            return;
        }

        const res = await fetch(`${API_BASE}/patient/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.message || "Error creating patient");
            submitting = false;
            return;
        }

        // UI updates
        notificationManager?.addNotification(
            "success",
            "Patient created successfully",
            data.patient?.patientId || null
        );

        document.getElementById("generatedPatientId").style.display = "block";
        document.getElementById("patientIdDisplay").textContent =
            data.patient?.patientId || "N/A";

        document.getElementById("patientId").value =
            data.patient?.patientId || "";

    } catch (err) {
        console.error("handleSubmit error:", err);
        alert("Failed to create patient. Check console for details.");
    } finally {
        submitting = false;
    }
}


// ---------- Notification UI helpers ----------
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        background: ${type === "success" ? "var(--success)" : type === "warning" ? "var(--warning)" : "var(--primary-blue)"};
        color: white;
        border-radius: 8px;
        box-shadow: 0 6px 20px rgba(0,0,0,0.12);
        z-index: 3000;
        font-weight: 600;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { if (notification.parentElement) notification.remove(); }, 4000);
}

// ---------- Calling / patient actions ----------
function viewPatientProfile(patientId) {
    alert(`Opening profile for patient: ${patientId}\n\nThis would navigate to a detailed patient profile page in a real application.`);
}
function callPatient(phoneNumber) {
    alert(`Calling patient at: ${phoneNumber}\n\nThis would initiate a phone call in a real application.`);
}
function callAllAlertPatients() {
    alert("Initiating calls to all alert patients...\n\nThis would call all patients in the alert list in a real application.");
}

// ---------- Settings toggle (kept) ----------
function toggleSwitch(element) {
    if (!element) return;
    if (element.closest(".setting-item")) {
        const settingLabel = element.closest(".setting-item").querySelector(".setting-label")?.textContent;
        if (settingLabel === "Dark Mode") {
            if (darkModeManager) darkModeManager.toggle();
            return;
        }
    }
    element.classList.toggle("active");
    if (notificationManager) {
        const settingLabel = element.closest(".setting-item").querySelector(".setting-label")?.textContent || "Setting";
        const status = element.classList.contains("active") ? "enabled" : "disabled";
        notificationManager.addNotification("info", `${settingLabel} ${status}`);
    }
}

// ---------- Dashboard lists ----------
async function loadDashboardLists() {
    try {
        const res = await fetch(`${API_BASE}/nurse/patients-lists`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) {
            console.warn("loadDashboardLists returned non-ok");
            return;
        }

        const data = await res.json();

        window.goodPatients = data.good || [];
        window.moderatePatients = data.moderate || [];
        window.alertPatients = data.alert || [];

    } catch (err) {
        console.error("loadDashboardLists error:", err);
    }
}


// ---------- NotificationManager (backend-based) ----------
class NotificationManager {
    constructor() {
        this.notifications = [];
        this.initNotificationEvents();
        this.loadNotifications().catch(err => console.error("loadNotifications init error:", err));
    }

    async loadNotifications() {
        try {
            const res = await fetch(`${API_BASE}/notifications/all`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) {
                console.warn("notifications/all non-ok");
                return;
            }
            const data = await res.json();
            this.notifications = Array.isArray(data) ? data : (data.notifications || []);
            this.updateNotificationBadges();
            this.renderPageNotifications();
        } catch (err) {
            console.error("Error loading notifications:", err);
        }
    }

    initNotificationEvents() {
        // optional: implement dropdown toggle if you have button nodes
    }

    renderPageNotifications(filter = "all") {
        const list = document.getElementById("notificationsPageList");
        const empty = document.getElementById("notificationsEmpty");
        if (!list) return;

        let filtered = (this.notifications || []).slice();

        if (filter === "unread") filtered = filtered.filter(n => !n.read);
        else if (filter !== "all") filtered = filtered.filter(n => n.type === filter);

        if (filtered.length === 0) {
            list.style.display = "none";
            if (empty) empty.style.display = "block";
            return;
        }

        list.style.display = "block";
        if (empty) empty.style.display = "none";

        list.innerHTML = filtered.map(n => `
            <div class="notification-page-item ${n.read ? "" : "unread"}">
                <div class="notification-page-content">
                    <div class="notification-page-icon ${n.type}"></div>
                    <div class="notification-page-details">
                        <div class="notification-page-message">${n.message}</div>
                        <div class="notification-page-time">${this.formatTime(n.createdAt)}</div>
                    </div>
                </div>
            </div>
        `).join("");
    }

    formatTime(date) {
        const now = new Date();
        const d = new Date(date);
        const diff = now - d;
        const mins = Math.floor(diff / 60000);
        const hrs = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (mins < 1) return "Just now";
        if (mins < 60) return `${mins} minutes ago`;
        if (hrs < 24) return `${hrs} hours ago`;
        if (days < 7) return `${days} days ago`;
        return d.toLocaleString();
    }

    addNotification(type, message, patientId = null) {
        // show simple toast
        this.showToastNotification({ type, message });
    }

    showToastNotification(n) {
        const toast = document.createElement("div");
        toast.className = `notification-toast notification-${n.type}`;
        toast.style.cssText = "position:fixed;top:20px;right:20px;padding:12px;border-radius:8px;z-index:4000;background:#333;color:#fff;";
        toast.textContent = n.message;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentElement) toast.remove(); }, 3500);
    }
}

// ---------- Dark Mode Manager ---------- (kept)
class DarkModeManager {
    constructor() {
        this.isDarkMode = localStorage.getItem("darkMode") === "true";
        this.init();
    }
    init() {
        this.applyTheme();
        this.initDarkModeToggle();
    }
    initDarkModeToggle() {
        const darkModeToggle = document.querySelector(".dark-mode-toggle");
        if (!darkModeToggle) return;
        const newToggle = darkModeToggle.cloneNode(true);
        darkModeToggle.parentNode.replaceChild(newToggle, darkModeToggle);
        this.updateDarkModeToggle(newToggle);
        newToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            this.toggle();
        });
    }
    applyTheme() {
        if (this.isDarkMode) document.documentElement.setAttribute("data-theme", "dark");
        else document.documentElement.removeAttribute("data-theme");
        this.updateDarkModeToggle();
        setTimeout(() => {
            if (window.performanceChart || window.completionChart || window.trendsChart || window.statusChart) initializeCharts();
        }, 100);
    }
    updateDarkModeToggle(node) {
        const darkModeToggle = node || document.querySelector(".dark-mode-toggle");
        if (!darkModeToggle) return;
        if (this.isDarkMode) darkModeToggle.classList.add("active");
        else darkModeToggle.classList.remove("active");
    }
    toggle() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem("darkMode", this.isDarkMode);
        this.applyTheme();
        if (notificationManager) notificationManager.addNotification("info", this.isDarkMode ? "Dark mode enabled" : "Light mode enabled");
    }
}

// ---------- ToggleManager ----------
class ToggleManager {
    constructor() { this.init(); }
    init() { this.initAllToggles(); this.loadToggleStates(); }
    initAllToggles() {
        const toggles = document.querySelectorAll(".toggle-switch:not(.dark-mode-toggle)");
        toggles.forEach((toggle) => {
            toggle.removeAttribute("onclick");
            toggle.addEventListener("click", (e) => { e.stopPropagation(); this.handleToggleClick(toggle); });
        });
    }
    handleToggleClick(toggle) {
        const newState = !toggle.classList.contains("active");
        this.updateToggleState(toggle, newState);
        this.handleToggleAction(toggle, newState);
    }
    handleToggleAction(toggle, state) {
        const toggleType = Array.from(toggle.classList).find((cls) => cls.includes("-toggle") && cls !== "toggle-switch" && cls !== "toggle-slider") || "default";
        const messages = {
            "email-toggle": state ? "Email notifications enabled" : "Email notifications disabled",
            "sms-toggle": state ? "SMS alerts enabled" : "SMS alerts disabled",
            "logout-toggle": state ? "Auto-logout enabled" : "Auto-logout disabled",
            "twofactor-toggle": state ? "Two-factor authentication enabled" : "Two-factor authentication disabled",
            "encryption-toggle": state ? "Data encryption enabled" : "Data encryption disabled",
            "autosave-toggle": state ? "Auto-save forms enabled" : "Auto-save forms disabled",
            default: state ? "Setting enabled" : "Setting disabled"
        };
        const message = messages[toggleType] || messages.default;
        if (notificationManager) notificationManager.addNotification("info", message);
        this.saveToggleState(toggleType, state);
    }
    updateToggleState(toggle, isActive) {
        if (isActive) toggle.classList.add("active");
        else toggle.classList.remove("active");
    }
    saveToggleState(toggleType, state) {
        try {
            const toggleStates = JSON.parse(localStorage.getItem("toggleStates") || "{}");
            toggleStates[toggleType] = state;
            localStorage.setItem("toggleStates", JSON.stringify(toggleStates));
        } catch (err) { console.error("Error saving toggle state:", err); }
    }
    loadToggleStates() {
        try {
            const toggleStates = JSON.parse(localStorage.getItem("toggleStates") || "{}");
            Object.keys(toggleStates).forEach((toggleType) => {
                const toggle = document.querySelector(`.${toggleType}`);
                if (toggle && !toggle.classList.contains("dark-mode-toggle")) this.updateToggleState(toggle, toggleStates[toggleType]);
            });
        } catch (err) { console.error("Error loading toggle states:", err); }
    }
}

// ---------- Utilities ----------
function generatePatientId() {
    const prefix = "P";
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}-${year}-${randomNum}`;
}

// Prevent conflicts
if (window.toggleSwitch) delete window.toggleSwitch;
