/* ---------------------------------------------------------
   CareConnect – Nurse Login & Signup (Backend Connected)
   UI untouched. Only logic changed to API-based auth.
--------------------------------------------------------- */

const API_BASE = "http://localhost:4000/api";

/* ---------------------- FORM TOGGLE ---------------------- */
function toggleForm() {
  const signInForm = document.getElementById("signInForm");
  const signUpForm = document.getElementById("signUpForm");

  signInForm.classList.toggle("active");
  signUpForm.classList.toggle("active");

  clearAllErrors();
}

/* ---------------------- PASSWORD VISIBILITY ---------------------- */
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

/* ---------------------- VALIDATION HELPERS ---------------------- */
function showError(input, message) {
  const group = input.parentElement;
  const errorMsg = group.querySelector(".error-message");
  const successIcon = group.querySelector(".success-icon");

  group.classList.add("error");
  group.classList.remove("success");

  errorMsg.textContent = message;
  errorMsg.classList.add("show");

  successIcon?.classList.remove("show");
}

function showSuccess(input) {
  const group = input.parentElement;
  group.classList.add("success");
  group.classList.remove("error");

  const errorMsg = group.querySelector(".error-message");
  const successIcon = group.querySelector(".success-icon");

  errorMsg?.classList.remove("show");
  successIcon?.classList.add("show");
}

function clearError(input) {
  input.classList.remove("error");
  const msg = input.parentElement.querySelector(".error-message");
  msg?.classList.remove("show");
}

function clearAllErrors() {
  document.querySelectorAll("input").forEach((input) => {
    input.classList.remove("error", "success");
    input.parentElement.querySelector(".error-message")?.classList.remove("show");
    input.parentElement.querySelector(".success-icon")?.classList.remove("show");
  });
}

/* ============================================================
   ⭐ REAL BACKEND LOGIN (POST /api/nurse/login)
============================================================ */
async function handleSignIn(event) {
  event.preventDefault();

  const nurseId = document.getElementById("signInNurseId");
  const hospitalCode = document.getElementById("signInHospitalCode");
  const password = document.getElementById("signInPassword");

  let valid = true;
  if (!nurseId.value.trim()) { showError(nurseId, "Nurse ID required"); valid = false; }
  if (!hospitalCode.value.trim()) { showError(hospitalCode, "Hospital Code required"); valid = false; }
  if (!password.value.trim()) { showError(password, "Password required"); valid = false; }

  if (!valid) return;

  try {
    const res = await fetch(`${API_BASE}/nurse/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nurseId: nurseId.value.trim(),
        hospitalCode: hospitalCode.value.trim(),
        password: password.value.trim()
      })
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.message || "Invalid credentials");
      return;
    }

    // Save JWT
    localStorage.setItem("nurseToken", data.token);

    alert("Login Successful!");
    window.location.href = "/frontend/templates/nurse_dashboard.html";

  } catch (err) {
    alert("Server error: " + err.message);
  }
}

/* ============================================================
   ⭐ REAL BACKEND SIGNUP (POST /api/nurse/signup)
============================================================ */
async function handleSignUp(event) {
  event.preventDefault();

  const fullName = document.getElementById("fullNameSignIn");
  const nurseId = document.getElementById("signUpNurseId");
  const hospitalCode = document.getElementById("signUpHospitalCode");
  const email = document.getElementById("signUpEmail");
  const phone = document.getElementById("phoneNumber");
  const password = document.getElementById("signUpPassword");
  const confirmPassword = document.getElementById("confirmPassword");

  let valid = true;

  if (!fullName.value.trim()) { showError(fullName, "Full Name required"); valid = false; }
  if (!nurseId.value.trim()) { showError(nurseId, "Nurse ID required"); valid = false; }
  if (!hospitalCode.value.trim()) { showError(hospitalCode, "Hospital Code required"); valid = false; }
  if (!email.value.trim()) { showError(email, "Email required"); valid = false; }
  if (!phone.value.trim()) { showError(phone, "Phone required"); valid = false; }

  if (password.value.length < 8) {
    showError(password, "Password must be at least 8 characters");
    valid = false;
  }

  if (password.value !== confirmPassword.value) {
    showError(confirmPassword, "Passwords do not match");
    valid = false;
  }

  if (!valid) return;

  try {
    const res = await fetch(`${API_BASE}/nurse/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName: fullName.value.trim(),
        nurseId: nurseId.value.trim(),
        hospitalCode: hospitalCode.value.trim(),
        email: email.value.trim(),
        phone: phone.value.trim(),
        password: password.value.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Error creating account");
      return;
    }

    alert("Account created successfully!");
    toggleForm(); // switch to sign-in

  } catch (err) {
    alert("Server error: " + err.message);
  }
}

/* ---------------------- INPUT VALIDATION LISTENERS ---------------------- */
document.querySelectorAll("input").forEach((input) => {
  input.addEventListener("blur", () => {
    if (input.value.trim() && input.id !== "confirmPassword") {
      showSuccess(input);
    }
  });

  input.addEventListener("input", () => {
    if (input.classList.contains("error")) clearError(input);
  });
});
