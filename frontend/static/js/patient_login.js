/* ---------------------------------------------------------
   CareConnect – Patient Login (Backend Connected)
   Login Rule: Patient enters SAME Patient ID in BOTH fields.
--------------------------------------------------------- */

const API_BASE = "http://localhost:4000/api";

/* ---------------------- PASSWORD TOGGLE ---------------------- */
function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  const toggle = input.parentElement.querySelector(".password-toggle");
  const eyeOpen = toggle.querySelector(".eye-open");
  const eyeClosed = toggle.querySelector(".eye-closed");

  if (input.type === "password") {
    input.type = "text";
    eyeOpen.style.display = "none";
    eyeClosed.style.display = "block";
  } else {
    input.type = "password";
    eyeOpen.style.display = "block";
    eyeClosed.style.display = "none";
  }
}

/* ---------------------- ERROR HELPERS ---------------------- */
function showError(input, message) {
  const group = input.parentElement;
  const errorMsg = group.querySelector(".error-message");
  const successIcon = group.querySelector(".success-icon");

  input.classList.add("error");
  group.classList.add("error");

  errorMsg.textContent = message;
  errorMsg.classList.add("show");

  successIcon?.classList.remove("show");
}

function showSuccess(input) {
  const group = input.parentElement;

  input.classList.add("success");
  group.classList.add("success");

  const errorMsg = group.querySelector(".error-message");
  const successIcon = group.querySelector(".success-icon");

  errorMsg?.classList.remove("show");
  successIcon?.classList.add("show");
}

function clearError(input) {
  input.classList.remove("error");
  input.parentElement.classList.remove("error");

  const msg = input.parentElement.querySelector(".error-message");
  msg?.classList.remove("show");
}

/* ---------------------- VALIDATE FIELDS ---------------------- */
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("blur", function (e) {
    if (e.target.value.trim()) validateField(e.target);
  });

  input.addEventListener("input", function (e) {
    if (e.target.classList.contains("error")) clearError(e.target);
  });
});

function validateField(input) {
  const value = input.value.trim();

  if (value.length < 2) {
    showError(input, "This field is required");
    return false;
  }

  showSuccess(input);
  return true;
}

/* ============================================================
   ⭐ PATIENT LOGIN (PatientID = Password)
   POST → /api/patient/login
============================================================ */
async function handleSignIn(event) {
  event.preventDefault();

  const patientIdInput = document.getElementById("signInPatientId");
  const passwordInput = document.getElementById("signInPassword");

  const patientId = patientIdInput.value.trim();
  const password = passwordInput.value.trim();

  let valid = true;

  if (!patientId) {
    showError(patientIdInput, "Patient ID is required");
    valid = false;
  }
  if (!password) {
    showError(passwordInput, "Please re-enter Patient ID");
    valid = false;
  }

  if (!valid) return;

  // Rule: BOTH must match
  if (patientId !== password) {
    showError(passwordInput, "Both fields must match exactly");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/patient/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientId: patientId,
        password: password  // backend checks equality
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Invalid Patient ID");
      return;
    }

    /* ---------------------- SAVE SESSION ---------------------- */
    localStorage.setItem("patientToken", data.token);
    localStorage.setItem("patientData", JSON.stringify(data.patient));

    /* ------------------ REDIRECT TO DASHBOARD ------------------ */
    window.location.href = "/frontend/templates/patient_dashboard.html";

  } catch (err) {
    console.error("Login Error:", err);
    alert("Server error. Please try again.");
  }
}
