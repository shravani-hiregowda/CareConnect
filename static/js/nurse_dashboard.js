// Set PDF.js worker path
pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";

// Initialize managers
let notificationManager;

// Mobile Sidebar
function toggleMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.toggle("mobile-open");

    // Toggle mobile menu button visibility
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    if (sidebar.classList.contains("mobile-open")) {
        mobileMenuBtn.style.display = "none";
    } else {
        mobileMenuBtn.style.display = "flex";
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById("sidebar");
    sidebar.classList.remove("mobile-open");

    // Show mobile menu button
    document.getElementById("mobileMenuBtn").style.display = "flex";
}

// Initialize mobile menu button
document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("mobileMenuBtn").addEventListener("click", toggleMobileSidebar);
    document.getElementById("sidebarClose").addEventListener("click", closeMobileSidebar);

    // Initialize managers
    notificationManager = new NotificationManager();
    darkModeManager = new DarkModeManager();
});

// Close sidebar when clicking outside on mobile
document.addEventListener("click", function(event) {
    const sidebar = document.getElementById("sidebar");
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");

    if (window.innerWidth <= 768 && sidebar.classList.contains("mobile-open") && !sidebar.contains(event.target) && !mobileMenuBtn.contains(event.target)) {
        closeMobileSidebar();
    }
});

// Close mobile menu when clicking on menu items
document.querySelectorAll(".menu-item").forEach((item) => {
    item.addEventListener("click", function() {
        if (window.innerWidth <= 768) {
            closeMobileSidebar();
        }
    });
});

// Close mobile menu when pressing Escape key
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape" && window.innerWidth <= 768) {
        const sidebar = document.querySelector(".sidebar");
        if (sidebar.classList.contains("mobile-open")) {
            closeMobileSidebar();
        }
    }
});

// Handle window resize
window.addEventListener("resize", function() {
    const sidebar = document.querySelector(".sidebar");
    const menuBtn = document.getElementById("mobileMenuBtn");

    if (window.innerWidth > 768) {
        // Reset on larger screens
        sidebar.classList.remove("mobile-open");
        document.body.style.overflow = "";
        menuBtn.style.display = "none";
    } else {
        menuBtn.style.display = "flex";
    }
});

function showPage(pageId, event) {
    if (event) event.preventDefault();

    // Hide all pages
    document.querySelectorAll(".page-content").forEach((page) => {
        page.classList.remove("active");
    });

    // Remove active class from all menu items
    document.querySelectorAll(".menu-item").forEach((item) => {
        item.classList.remove("active");
    });

    // Show selected page
    document.getElementById(pageId).classList.add("active");

    // Add active class to clicked menu item
    if (event) {
        event.currentTarget.classList.add("active");
    }

    // Initialize charts when statistics page is shown
    if (pageId === "statistics") {
        setTimeout(() => {
            initializeCharts();
        }, 100);
    }

    // If notifications page is shown, refresh the list
    if (pageId === "notifications") {
        setTimeout(() => {
            notificationManager.renderPageNotifications();
        }, 100);
    }

    // Close mobile sidebar if open
    if (window.innerWidth <= 768) {
        closeMobileSidebar();
    }
}

// Chart Initialization
let performanceChart, completionChart, trendsChart, statusChart;

function initializeCharts() {
    console.log("Initializing charts...");

    // Destroy existing charts if they exist
    if (performanceChart) performanceChart.destroy();
    if (completionChart) completionChart.destroy();
    if (trendsChart) trendsChart.destroy();
    if (statusChart) statusChart.destroy();

    // Performance Distribution Chart (Doughnut)
    const performanceCtx = document.getElementById("performanceChart");
    if (performanceCtx) {
        performanceChart = new Chart(performanceCtx, {
            type: "doughnut",
            data: {
                labels: ["Good Performance", "Moderate Performance", "Alert Patients"],
                datasets: [{
                    data: [12, 8, 5],
                    backgroundColor: [
                        "rgba(52, 168, 83, 0.8)",
                        "rgba(251, 188, 5, 0.8)",
                        "rgba(234, 67, 53, 0.8)"
                    ],
                    borderColor: [
                        "rgba(52, 168, 83, 1)",
                        "rgba(251, 188, 5, 1)",
                        "rgba(234, 67, 53, 1)"
                    ],
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: "circle",
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-primary")
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || "";
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} patients (${percentage}%)`;
                            }
                        }
                    }
                },
                cutout: "65%"
            }
        });
    }

    // Completion Rate Chart (Line)
    const completionCtx = document.getElementById("completionChart");
    if (completionCtx) {
        completionChart = new Chart(completionCtx, {
            type: "line",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                    label: "Completion Rate",
                    data: [65, 72, 78, 75, 82, 85],
                    borderColor: "rgba(26, 115, 232, 1)",
                    backgroundColor: "rgba(26, 115, 232, 0.1)",
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: "rgba(26, 115, 232, 1)",
                    pointBorderColor: "#ffffff",
                    pointBorderWidth: 2,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Completion: ${context.raw}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + "%";
                            },
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")
                        },
                        grid: {
                            color: "rgba(0, 0, 0, 0.1)"
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")
                        }
                    }
                }
            }
        });
    }

    // Monthly Trends Chart (Bar)
    const trendsCtx = document.getElementById("trendsChart");
    if (trendsCtx) {
        trendsChart = new Chart(trendsCtx, {
            type: "bar",
            data: {
                labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
                datasets: [{
                        label: "New Patients",
                        data: [18, 22, 25, 20, 28, 25],
                        backgroundColor: "rgba(26, 115, 232, 0.8)",
                        borderColor: "rgba(26, 115, 232, 1)",
                        borderWidth: 1
                    },
                    {
                        label: "Completed",
                        data: [12, 15, 18, 16, 22, 18],
                        backgroundColor: "rgba(52, 168, 83, 0.8)",
                        borderColor: "rgba(52, 168, 83, 1)",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-primary")
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(0, 0, 0, 0.1)"
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-secondary")
                        }
                    }
                }
            }
        });
    }

    // Follow-up Status Chart (Pie)
    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
        statusChart = new Chart(statusCtx, {
            type: "pie",
            data: {
                labels: ["Completed", "Scheduled", "Pending", "Overdue"],
                datasets: [{
                    data: [18, 12, 8, 3],
                    backgroundColor: [
                        "rgba(52, 168, 83, 0.8)",
                        "rgba(26, 115, 232, 0.8)",
                        "rgba(251, 188, 5, 0.8)",
                        "rgba(234, 67, 53, 0.8)"
                    ],
                    borderColor: [
                        "rgba(52, 168, 83, 1)",
                        "rgba(26, 115, 232, 1)",
                        "rgba(251, 188, 5, 1)",
                        "rgba(234, 67, 53, 1)"
                    ],
                    borderWidth: 2,
                    hoverOffset: 15
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: "bottom",
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            pointStyle: "circle",
                            color: getComputedStyle(document.documentElement).getPropertyValue("--text-primary")
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || "";
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// File Upload Handling with PDF Text Extraction
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const uploadArea = document.getElementById("uploadArea");
        const uploadedFile = document.getElementById("uploadedFile");
        const processingIndicator = document.getElementById("processingIndicator");
        const fileName = document.getElementById("fileName");
        const fileSize = document.getElementById("fileSize");

        // Show uploaded file info
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
        uploadedFile.classList.add("show");

        // Show processing indicator
        processingIndicator.classList.add("show");

        try {
            if (file.type === "application/pdf") {
                // Process PDF file
                await processPDFFile(file);
            } else if (file.type.startsWith("image/")) {
                // Process image file (simulate processing)
                setTimeout(() => {
                    processingIndicator.classList.remove("show");
                    showPatientForm();
                    autoFillFormFromDocument();
                }, 2000);
            } else {
                throw new Error("Unsupported file type");
            }
        } catch (error) {
            console.error("Error processing file:", error);
            processingIndicator.classList.remove("show");
            alert("Error processing file. Please try again with a different file.");
        }
    }
}

// Process PDF file and extract text
async function processPDFFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let extractedText = "";

    // Extract text from all pages
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(" ");
        extractedText += pageText + "\n";
    }

    // Process extracted text and fill form
    processExtractedText(extractedText);

    // Hide processing indicator and show form
    document.getElementById("processingIndicator").classList.remove("show");
    showPatientForm();
}

// Process extracted text and auto-fill form based on the actual PDF structure
function processExtractedText(text) {
    console.log("Extracted Text:", text); // For debugging

    // Improved extraction logic for your specific document format
    const extractedData = {
        patientName: extractPatientName(text),
        age: extractAge(text),
        gender: extractGender(text),
        patientId: extractPatientId(text),
        hospitalCode: extractHospitalCode(text),
        primaryPhysician: extractPrimaryPhysician(text),
        admissionDate: parseDate(extractAdmissionDate(text)),
        dischargeDate: parseDate(extractDischargeDate(text)),
        primaryDiagnosis: extractPrimaryDiagnosis(text),
        secondaryNotes: extractSecondaryNotes(text),
        procedure: extractProcedure(text),
        surgeryDate: parseDate(extractSurgeryDate(text)),
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

    // Fill the form with extracted data
    Object.keys(extractedData).forEach((key) => {
        const element = document.getElementById(key);
        if (element && extractedData[key]) {
            element.value = extractedData[key];
        }
    });

    // Show success message
    const filledFields = Object.values(extractedData).filter((value) => value).length;
    if (filledFields > 5) {
        showNotification(`Successfully extracted data from ${filledFields} fields!`, "success");
    } else {
        showNotification("Limited data found in document. Please review and complete manually.", "warning");
    }
}

// Specific extraction functions for your document format
function extractPatientName(text) {
    const nameMatch = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)(?=.*Age:)/);
    return nameMatch ? nameMatch[1].trim() : "";
}

function extractAge(text) {
    const ageMatch = text.match(/Age:\s*(\d+)/);
    return ageMatch ? ageMatch[1].trim() : "";
}

function extractGender(text) {
    const genderMatch = text.match(/Gender:\s*([A-Z][a-z]+)/i);
    return genderMatch ? genderMatch[1].toLowerCase().trim() : "";
}

function extractPatientId(text) {
    const idMatch = text.match(/Patient ID:\s*([A-Za-z0-9-]+)/);
    return idMatch ? idMatch[1].trim() : "";
}

function extractHospitalCode(text) {
    const codeMatch = text.match(/Hospital Code:\s*([A-Za-z0-9-]+)/);
    return codeMatch ? codeMatch[1].trim() : "";
}

function extractPrimaryPhysician(text) {
    const physicianMatch = text.match(/Primary Physician:\s*(Dr\.? [A-Za-z ]+?)(?=\s*(?:Date of Admission|Patient ID|$))/);
    return physicianMatch ? physicianMatch[1].trim() : "";
}

function extractAdmissionDate(text) {
    const admissionMatch = text.match(/Date of Admission:\s*([0-9]{1,2} [A-Za-z]{3} [0-9]{4})/);
    return admissionMatch ? admissionMatch[1].trim() : "";
}

function extractDischargeDate(text) {
    const dischargeMatch = text.match(/Date of Discharge:\s*([0-9]{1,2} [A-Za-z]{3} [0-9]{4})/);
    return dischargeMatch ? dischargeMatch[1].trim() : "";
}

function extractPrimaryDiagnosis(text) {
    const diagnosisMatch = text.match(/Primary Diagnosis:\s*([^\n\.]+?)(?=\s*(?:Secondary Notes|Procedure|Complications|$))/);
    return diagnosisMatch ? diagnosisMatch[1].trim() : "";
}

function extractSecondaryNotes(text) {
    const notesMatch = text.match(/Secondary Notes:\s*([^\n\.]+)/);
    return notesMatch ? notesMatch[1].trim() : "";
}

function extractProcedure(text) {
    const procedureMatch = text.match(/Procedure Performed:\s*([^\n\.]+?)(?=\s*(?:Surgery Date|Complications|Treatment Summary|$))/);
    return procedureMatch ? procedureMatch[1].trim() : "";
}

function extractSurgeryDate(text) {
    const surgeryMatch = text.match(/Surgery Date:\s*([0-9]{1,2} [A-Za-z]{3} [0-9]{4})/);
    return surgeryMatch ? surgeryMatch[1].trim() : "";
}

function extractComplications(text) {
    const complicationsMatch = text.match(/Complications:\s*([^\n\.]+)/);
    return complicationsMatch ? complicationsMatch[1].trim() : "";
}

function extractTreatmentSummary(text) {
    const treatmentStart = text.indexOf("Treatment Summary");
    if (treatmentStart === -1) return "";

    const nextSection = text.indexOf("4. Discharge Vitals");
    if (nextSection === -1) return "";

    return text.substring(treatmentStart + "Treatment Summary".length, nextSection).replace(/\n/g, " ").replace(/\s+/g, " ").trim();
}

function extractTemperature(text) {
    const tempMatch = text.match(/Temperature:\s*([0-9.]+°F)/);
    return tempMatch ? tempMatch[1].trim() : "";
}

function extractHeartRate(text) {
    const pulseMatch = text.match(/Pulse:\s*([0-9]+ bpm)/);
    return pulseMatch ? pulseMatch[1].trim() : "";
}

function extractBloodPressure(text) {
    const bpMatch = text.match(/BP:\s*([0-9]+\/[0-9]+ mmHg)/);
    return bpMatch ? bpMatch[1].trim() : "";
}

function extractOxygenSaturation(text) {
    const spo2Match = text.match(/SpO2:\s*([0-9]+%)/);
    return spo2Match ? spo2Match[1].trim() : "";
}

function extractRespiratoryRate(text) {
    const respMatch = text.match(/Respiratory Rate:\s*([0-9]+\/min)/);
    return respMatch ? respMatch[1].trim() : "";
}

function extractDischargeMeds(text) {
    const startIndex = text.indexOf("5. Medications on Discharge");
    if (startIndex === -1) return "";

    const endIndex = text.indexOf("6. Follow-Up Plan");
    if (endIndex === -1) return "";

    const medsText = text.substring(startIndex + "5. Medications on Discharge".length, endIndex).trim().split("\n").filter((line) => line.trim()).join("\n");

    return medsText;
}

function extractFollowUpPlan(text) {
    const startIndex = text.indexOf("6. Follow-Up Plan");
    if (startIndex === -1) return "";

    const endIndex = text.indexOf("7. Restrictions & Home Care");
    if (endIndex === -1) return "";

    const followUpText = text.substring(startIndex + "6. Follow-Up Plan".length, endIndex).trim().split("\n").filter((line) => line.trim()).join("\n");

    return followUpText;
}

function extractHomeCare(text) {
    const startIndex = text.indexOf("7. Restrictions & Home Care");
    if (startIndex === -1) return "";

    const endIndex = text.indexOf("8. Emergency Contacts");
    if (endIndex === -1) return "";

    const homeCareText = text.substring(startIndex + "7. Restrictions & Home Care".length, endIndex).trim().split("\n").filter((line) => line.trim()).join("\n");

    return homeCareText;
}

function extractEmergencyContacts(text) {
    const startIndex = text.indexOf("8. Emergency Contacts");
    if (startIndex === -1) return "";

    let endIndex = text.indexOf("9.", startIndex);
    if (endIndex === -1) {
        endIndex = text.length;
    }

    const contactsText = text.substring(startIndex + "8. Emergency Contacts".length, endIndex).trim().split("\n").filter((line) => line.trim()).join("\n");

    return contactsText;
}

function parseDate(dateStr) {
    if (!dateStr) return "";

    const months = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
        January: "01",
        February: "02",
        March: "03",
        April: "04",
        May: "05",
        June: "06",
        July: "07",
        August: "08",
        September: "09",
        October: "10",
        November: "11",
        December: "12"
    };

    const parts = dateStr.split(" ");
    if (parts.length === 3) {
        const day = parts[0].padStart(2, "0");
        const month = months[parts[1]];
        const year = parts[2];
        if (month) {
            return `${year}-${month}-${day}`;
        }
    }

    const slashParts = dateStr.split("/");
    if (slashParts.length === 3) {
        const month = slashParts[0].padStart(2, "0");
        const day = slashParts[1].padStart(2, "0");
        const year = slashParts[2];
        return `${year}-${month}-${day}`;
    }

    return dateStr;
}

function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function removeFile() {
    document.getElementById("fileInput").value = "";
    document.getElementById("uploadedFile").classList.remove("show");
    document.getElementById("processingIndicator").classList.remove("show");
    document.getElementById("patientForm").classList.remove("show");
}

// Drag and Drop Functionality
const uploadArea = document.getElementById("uploadArea");
if (uploadArea) {
    uploadArea.addEventListener("dragover", (e) => {
        e.preventDefault();
        uploadArea.classList.add("dragover");
    });

    uploadArea.addEventListener("dragleave", () => {
        uploadArea.classList.remove("dragover");
    });

    uploadArea.addEventListener("drop", (e) => {
        e.preventDefault();
        uploadArea.classList.remove("dragover");
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            document.getElementById("fileInput").files = files;
            handleFileUpload({ target: { files: files } });
        }
    });
}

// Form Handling
function showPatientForm() {
    document.getElementById("patientForm").classList.add("show");
}

function autoFillFormFromDocument() {
    const sampleData = {
        patientName: "John Smith",
        age: "45",
        gender: "male",
        patientId: "P-" + new Date().getFullYear() + "-" + Math.floor(1000 + Math.random() * 9000),
        primaryDiagnosis: "Routine Check-up",
        temperature: "98.6°F",
        heartRate: "72 bpm",
        bloodPressure: "120/80 mmHg"
    };

    Object.keys(sampleData).forEach((key) => {
        const element = document.getElementById(key);
        if (element && !element.value) {
            element.value = sampleData[key];
        }
    });
}

function resetForm() {
    document.getElementById("patientForm").querySelector("form").reset();
}

function handleSubmit(event) {
    event.preventDefault();

    // Add success notification
    if (notificationManager) {
        notificationManager.addNotification("success", "Patient record created successfully and added to follow-up system.", document.getElementById("patientId").value);
    }

    alert("Patient record created successfully!");
    resetForm();
    removeFile();
    return false;
}

// Notification system
function showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background: ${type === "success" ? "var(--success)" : type === "warning" ? "var(--warning)" : "var(--primary-blue)"};
        color: white;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        font-weight: 600;
        animation: slideInRight 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Patient Profile Viewing
function viewPatientProfile(patientId) {
    alert(`Opening profile for patient: ${patientId}\n\nThis would navigate to a detailed patient profile page in a real application.`);
}

// Calling Functionality
function callPatient(phoneNumber) {
    alert(`Calling patient at: ${phoneNumber}\n\nThis would initiate a phone call in a real application.`);
}

function callAllAlertPatients() {
    alert("Initiating calls to all alert patients...\n\nThis would call all patients in the alert list in a real application.");
}

// Settings Toggle
function toggleSwitch(element) {
    if (element.closest(".setting-item")) {
        const settingLabel = element.closest(".setting-item").querySelector(".setting-label").textContent;
        if (settingLabel === "Dark Mode") {
            // Use DarkModeManager for dark mode toggle
            if (darkModeManager) {
                darkModeManager.toggle();
            }
            return;
        }
    }

    // Original toggle functionality for other switches
    element.classList.toggle("active");

    // Show notification for other toggles
    if (notificationManager) {
        const settingLabel = element.closest(".setting-item").querySelector(".setting-label").textContent;
        const isActive = element.classList.contains("active");
        const status = isActive ? "enabled" : "disabled";
        notificationManager.addNotification("info", `${settingLabel} ${status}`);
    }
}

// Nurse Profile Modal
function showNurseProfile() {
    document.getElementById("nurseProfileModal").classList.add("active");
}

function closeNurseProfile() {
    document.getElementById("nurseProfileModal").classList.remove("active");
}

// Close modal when clicking outside
document.addEventListener("click", function(e) {
    const modal = document.getElementById("nurseProfileModal");
    if (e.target === modal) {
        closeNurseProfile();
    }
});

// Notification System
class NotificationManager {
    constructor() {
        this.notifications = JSON.parse(localStorage.getItem("nurseNotifications")) || this.getDefaultNotifications();
        this.updateNotificationBadges();
        this.initNotificationEvents();
        this.renderPageNotifications();
    }

    getDefaultNotifications() {
        return [{
                id: 1,
                type: "alert",
                message: "Thomas Miller requires immediate follow-up. Recovery rate dropped to 25%.",
                time: new Date(Date.now() - 30 * 60 * 1000),
                read: false,
                patientId: "P-2024-0078"
            },
            {
                id: 2,
                type: "warning",
                message: "Robert Davis missed his scheduled follow-up call yesterday.",
                time: new Date(Date.now() - 2 * 60 * 60 * 1000),
                read: false,
                patientId: "P-2024-0056"
            },
            {
                id: 3,
                type: "success",
                message: "Michael Johnson completed his recovery assessment with excellent results.",
                time: new Date(Date.now() - 4 * 60 * 60 * 1000),
                read: true,
                patientId: "P-2024-0012"
            },
            {
                id: 4,
                type: "info",
                message: "New patient record uploaded successfully. Ready for review.",
                time: new Date(Date.now() - 6 * 60 * 60 * 1000),
                read: true
            },
            {
                id: 5,
                type: "alert",
                message: "System maintenance scheduled for tonight at 2:00 AM. Save your work.",
                time: new Date(Date.now() - 24 * 60 * 60 * 1000),
                read: true
            }
        ];
    }

    initNotificationEvents() {
        const notificationBtn = document.getElementById("notificationBtn");
        const notificationDropdown = document.getElementById("notificationDropdown");

        if (notificationBtn && notificationDropdown) {
            notificationBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                notificationDropdown.classList.toggle("active");
            });

            document.addEventListener("click", (e) => {
                if (!notificationDropdown.contains(e.target) && !notificationBtn.contains(e.target)) {
                    notificationDropdown.classList.remove("active");
                }
            });

            notificationDropdown.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }
    }

    renderPageNotifications(filter = "all") {
        const notificationsList = document.getElementById("notificationsPageList");
        const emptyState = document.getElementById("notificationsEmpty");

        if (!notificationsList) return;

        let filteredNotifications = this.notifications;

        if (filter === "unread") {
            filteredNotifications = this.notifications.filter((n) => !n.read);
        } else if (filter !== "all") {
            filteredNotifications = this.notifications.filter((n) => n.type === filter);
        }

        if (filteredNotifications.length === 0) {
            notificationsList.style.display = "none";
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        notificationsList.style.display = "block";
        if (emptyState) emptyState.style.display = "none";

        notificationsList.innerHTML = filteredNotifications.map((notification) => `
            <div class="notification-page-item ${notification.read ? "" : "unread"}" 
                 onclick="notificationManager.handleNotificationClick(${notification.id})">
                <div class="notification-page-content">
                    <div class="notification-page-icon ${notification.type}">
                        ${this.getNotificationIcon(notification.type)}
                    </div>
                    <div class="notification-page-details">
                        <div class="notification-page-message">
                            ${notification.message}
                            <span class="notification-status ${notification.read ? "status-read" : "status-unread"}">
                                ${notification.read ? "Read" : "Unread"}
                            </span>
                        </div>
                        <div class="notification-page-time">${this.formatTime(notification.time)}</div>
                        ${notification.patientId ? `
                            <div class="notification-page-actions">
                                <button class="notification-action-btn view" onclick="event.stopPropagation(); notificationManager.viewPatient('${notification.patientId}')">
                                    View Patient
                                </button>
                                <button class="notification-action-btn dismiss" onclick="event.stopPropagation(); notificationManager.dismissNotification(${notification.id})">
                                    Dismiss
                                </button>
                            </div>
                        ` : `
                            <div class="notification-page-actions">
                                <button class="notification-action-btn dismiss" onclick="event.stopPropagation(); notificationManager.dismissNotification(${notification.id})">
                                    Dismiss
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `).join("");
    }

    filterNotifications(filter) {
        this.renderPageNotifications(filter);
    }

    getNotificationIcon(type) {
        const icons = {
            alert: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                </svg>`,
            warning: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`,
            success: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`,
            info: `<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" style="width: 20px; height: 20px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>`
        };
        return icons[type] || icons.info;
    }

    formatTime(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;

        return new Date(date).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    handleNotificationClick(notificationId) {
        const notification = this.notifications.find((n) => n.id === notificationId);
        if (notification && !notification.read) {
            notification.read = true;
            this.saveNotifications();
            this.updateNotificationBadges();
            this.renderPageNotifications(document.getElementById("notificationFilter")?.value || "all");
        }
    }

    viewPatient(patientId) {
        const alertPatients = ["P-2024-0078"];
        const moderatePatients = ["P-2024-0056"];
        const goodPatients = ["P-2024-0012"];

        if (alertPatients.includes(patientId)) {
            showPage("alert-patients");
        } else if (moderatePatients.includes(patientId)) {
            showPage("moderate-performance");
        } else if (goodPatients.includes(patientId)) {
            showPage("good-performance");
        }
    }

    dismissNotification(notificationId) {
        this.notifications = this.notifications.filter((n) => n.id !== notificationId);
        this.saveNotifications();
        this.updateNotificationBadges();
        this.renderPageNotifications(document.getElementById("notificationFilter")?.value || "all");

        this.showToastNotification({
            type: "success",
            message: "Notification dismissed"
        });
    }

    addNotification(type, message, patientId = null) {
        const newNotification = {
            id: Date.now(),
            type,
            message,
            time: new Date(),
            read: false,
            patientId
        };

        this.notifications.unshift(newNotification);
        this.saveNotifications();
        this.updateNotificationBadges();

        if (document.getElementById("notifications")?.classList.contains("active")) {
            this.renderPageNotifications(document.getElementById("notificationFilter")?.value || "all");
        }

        this.showToastNotification(newNotification);
    }

    showToastNotification(notification) {
        const toast = document.createElement("div");
        toast.className = `notification-toast notification-${notification.type}`;
        toast.innerHTML = `
            <div class="notification-toast-content">
                <div class="notification-toast-icon">${this.getNotificationIcon(notification.type)}</div>
                <div class="notification-toast-message">${notification.message}</div>
                <button class="notification-toast-close" onclick="this.parentElement.parentElement.remove()">
                    &times;
                </button>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 5000);
    }

    markAllAsRead() {
        this.notifications.forEach((notification) => {
            notification.read = true;
        });
        this.saveNotifications();
        this.updateNotificationBadges();
        this.renderPageNotifications(document.getElementById("notificationFilter")?.value || "all");

        this.showToastNotification({
            type: "success",
            message: "All notifications marked as read"
        });
    }

    clearAllNotifications() {
        this.notifications = [];
        this.saveNotifications();
        this.updateNotificationBadges();
        this.renderPageNotifications();

        this.showToastNotification({
            type: "success",
            message: "All notifications cleared"
        });
    }

    updateNotificationBadges() {
        const sidebarBadge = document.getElementById("sidebarNotificationBadge");
        const unreadCount = this.notifications.filter((n) => !n.read).length;

        if (sidebarBadge) {
            if (unreadCount > 0) {
                sidebarBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
                sidebarBadge.style.display = "flex";
            } else {
                sidebarBadge.style.display = "none";
            }
        }
    }

    saveNotifications() {
        localStorage.setItem("nurseNotifications", JSON.stringify(this.notifications));
    }
}

// Dark Mode System
// Dark Mode Manager (Standalone - handles only dark mode)
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
        if (darkModeToggle) {
            // Remove any existing event listeners
            const newToggle = darkModeToggle.cloneNode(true);
            darkModeToggle.parentNode.replaceChild(newToggle, darkModeToggle);

            // Set initial state
            this.updateDarkModeToggle();

            // Add click event listener
            newToggle.addEventListener("click", (e) => {
                e.stopPropagation();
                this.toggle();
            });
        }
    }

    applyTheme() {
        if (this.isDarkMode) {
            document.documentElement.setAttribute("data-theme", "dark");
        } else {
            document.documentElement.removeAttribute("data-theme");
        }

        this.updateDarkModeToggle();

        // Update charts if they exist
        setTimeout(() => {
            if (window.performanceChart || window.completionChart || window.trendsChart || window.statusChart) {
                window.initializeCharts();
            }
        }, 100);
    }

    updateDarkModeToggle() {
        const darkModeToggle = document.querySelector(".dark-mode-toggle");
        if (darkModeToggle) {
            if (this.isDarkMode) {
                darkModeToggle.classList.add("active");
            } else {
                darkModeToggle.classList.remove("active");
            }
        }
    }

    toggle() {
        this.isDarkMode = !this.isDarkMode;
        localStorage.setItem("darkMode", this.isDarkMode);
        this.applyTheme();

        // Show notification
        if (window.notificationManager) {
            window.notificationManager.addNotification("info", this.isDarkMode ? "Dark mode enabled" : "Light mode enabled");
        }

        console.log("Dark mode toggled:", this.isDarkMode);
    }

    enable() {
        this.isDarkMode = true;
        localStorage.setItem("darkMode", "true");
        this.applyTheme();
    }

    disable() {
        this.isDarkMode = false;
        localStorage.setItem("darkMode", "false");
        this.applyTheme();
    }
}

// Simple Toggle Manager for other toggles (excluding dark mode)
class ToggleManager {
    constructor() {
        this.init();
    }

    init() {
        this.initAllToggles();
        this.loadToggleStates();
    }

    initAllToggles() {
        // Initialize all toggle switches EXCEPT dark mode
        const toggles = document.querySelectorAll(".toggle-switch:not(.dark-mode-toggle)");
        toggles.forEach((toggle) => {
            // Remove any existing onclick handlers
            toggle.removeAttribute("onclick");

            // Add event listener
            toggle.addEventListener("click", (e) => {
                e.stopPropagation();
                this.handleToggleClick(toggle);
            });
        });
    }

    handleToggleClick(toggle) {
        const isActive = toggle.classList.contains("active");
        const newState = !isActive;

        // Update visual state
        this.updateToggleState(toggle, newState);

        // Handle the toggle action
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

        // Show notification
        if (window.notificationManager) {
            window.notificationManager.addNotification("info", message);
        }

        // Save toggle state
        this.saveToggleState(toggleType, state);
    }

    updateToggleState(toggle, isActive) {
        if (isActive) {
            toggle.classList.add("active");
        } else {
            toggle.classList.remove("active");
        }
    }

    saveToggleState(toggleType, state) {
        try {
            const toggleStates = JSON.parse(localStorage.getItem("toggleStates") || "{}");
            toggleStates[toggleType] = state;
            localStorage.setItem("toggleStates", JSON.stringify(toggleStates));
        } catch (error) {
            console.error("Error saving toggle state:", error);
        }
    }

    loadToggleStates() {
        try {
            const toggleStates = JSON.parse(localStorage.getItem("toggleStates") || "{}");
            Object.keys(toggleStates).forEach((toggleType) => {
                const toggle = document.querySelector(`.${toggleType}`);
                if (toggle && !toggle.classList.contains("dark-mode-toggle")) {
                    this.updateToggleState(toggle, toggleStates[toggleType]);
                }
            });
        } catch (error) {
            console.error("Error loading toggle states:", error);
        }
    }
}

// Initialize managers
let darkModeManager;
let toggleManager;

document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM loaded - initializing managers");

    // Initialize mobile menu
    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const sidebarClose = document.getElementById("sidebarClose");

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener("click", toggleMobileSidebar);
    }
    if (sidebarClose) {
        sidebarClose.addEventListener("click", closeMobileSidebar);
    }

    // Initialize managers
    notificationManager = new NotificationManager();
    darkModeManager = new DarkModeManager(); // Dark mode first
    toggleManager = new ToggleManager(); // Other toggles second

    console.log("Managers initialized");
});

// Remove any old global functions that might conflict
if (window.toggleSwitch) {
    delete window.toggleSwitch;
}

// Temporary debug - add this after DOMContentLoaded
setTimeout(() => {
    const darkToggle = document.querySelector(".dark-mode-toggle");
    if (darkToggle) {
        console.log("Dark mode toggle found:", darkToggle);
        console.log("Has click listeners?", darkToggle.onclick);
        darkToggle.addEventListener("click", () => {
            console.log("Dark mode toggle clicked!");
        });
    }
}, 1000);

function handleSubmit(event) {
    event.preventDefault();

    // Generate a patient ID (in a real app, this would come from the server)
    const patientId = generatePatientId();

    // Display the generated patient ID
    document.getElementById('patientIdDisplay').textContent = patientId;

    // Show the success section
    document.getElementById('generatedPatientId').classList.add('show');

    // Scroll to the generated ID section
    document.getElementById('generatedPatientId').scrollIntoView({ behavior: 'smooth' });

    // In a real application, you would submit the form data to the server here
    console.log('Form submitted successfully');
}

// Generate a patient ID (sample implementation)
function generatePatientId() {
    const prefix = 'P';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}-${year}-${randomNum}`;
}

// Copy patient ID to clipboard
function copyPatientId() {
    const patientId = document.getElementById('patientIdDisplay').textContent;
    navigator.clipboard.writeText(patientId).then(() => {
        alert('Patient ID copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy patient ID: ', err);
    });
}

// Show page function (already in your code, but including for completeness)
function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page-content').forEach(page => {
        page.classList.remove('active');
    });

    // Show the selected page
    document.getElementById(pageId).classList.add('active');

    // Update active menu item
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });

    // Find and activate the corresponding menu item
    const menuItems = document.querySelectorAll('.menu-item');
    for (let item of menuItems) {
        if (item.getAttribute('onclick') && item.getAttribute('onclick').includes(pageId)) {
            item.classList.add('active');
            break;
        }
    }
}