/**
 * scripts/main.js
 * EPTEC MAIN – UI boot + i18n + basic UX wiring (no backend, no decisions)
 * Start language: EN (until user clicks a flag)
 */

let currentLang = "en";
let languageData = {};
let clockTimer = null;

// ---------- BOOT ----------
document.addEventListener("DOMContentLoaded", () => {
  // Start in English by default
  setLanguage("en");

  // Footer placeholder (optional)
  loadFooter();

  // Audio: start ambient on first user interaction (browser policy safe)
  window.addEventListener(
    "pointerdown",
    () => {
      if (window.SoundEngine) SoundEngine.startAmbient();
    },
    { once: true }
  );

  // Wire UI events
  bindUIEvents();

  // Start clock (no label, only date+time)
  startClock();
});

// ---------- I18N ----------
async function setLanguage(lang) {
  currentLang = String(lang || "en").toLowerCase();

  try {
    const response = await fetch(`locales/${currentLang}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Language file not found");

    const json = await response.json();
    languageData = (json && typeof json === "object") ? json : {};
  } catch (e) {
    console.warn("Language load failed, fallback to EN:", e);
    if (currentLang !== "en") return setLanguage("en");
    languageData = {};
  }

  // RTL handling (Arabic)
  if (currentLang === "ar") {
    document.documentElement.setAttribute("dir", "rtl");
  } else {
    document.documentElement.setAttribute("dir", "ltr");
  }

  applyTranslations();
  updateClockOnce(); // update formatting immediately for new locale
}

function t(key, fallback = "") {
  const v = languageData?.[key];
  if (typeof v === "string" && v.trim().length) return v;
  return fallback;
}

// Update placeholders + button labels + legal links + modal titles
function applyTranslations() {
  // LOGIN
  setPlaceholder("login-username", t("login_username", "Username"));
  setPlaceholder("login-password", t("login_password", "Password"));

  setText("btn-login", t("login_btn", "Login"));
  setText("btn-register", t("register_btn", "Register"));
  setText("btn-forgot", t("forgot_btn", "Forgot password"));

  // ADMIN
  setPlaceholder("admin-code", t("admin_code", "Admin code"));
  setText("admin-submit", t("admin_submit", "Enter (Admin)"));

  // LEGAL FOOTER
  setText("link-imprint", t("legal_imprint", "Imprint"));
  setText("link-terms", t("legal_terms", "Terms"));
  setText("link-support", t("legal_support", "Support"));

  // REGISTER MODAL
  setText("register-title", t("register_title", "Registration"));
  setPlaceholder("reg-first-name", t("register_first_name", "First name"));
  setPlaceholder("reg-last-name", t("register_last_name", "Last name"));
  setPlaceholder("reg-birthdate", t("register_birthdate", "Date of birth"));
  setPlaceholder("reg-email", t("register_email", "Email address"));
  setPlaceholder("reg-username", t("login_username", "Username")); // reuse
  setPlaceholder("reg-password", t("login_password", "Password")); // reuse

  setText("reg-rules-username", t("register_username_rules", ""));
  setText("reg-rules-password", t("register_password_rules", ""));

  setText("reg-suggestion-title", t("register_suggestion_title", "Suggestions"));
  setText("reg-suggestion-1", t("register_suggestion_1", ""));
  setText("reg-suggestion-2", t("register_suggestion_2", ""));

  // Button text: locked vs normal is handled by class on the element
  const regSubmit = byId("reg-submit");
  if (regSubmit) {
    const isLocked = regSubmit.classList.contains("locked");
    regSubmit.textContent = isLocked
      ? t("register_submit_locked", "Complete verification (locked)")
      : t("register_submit", "Complete verification");
  }
  setText("reg-close", t("system_close", "Close"));

  // FORGOT MODAL
  setText("forgot-title", t("forgot_title", "Reset password"));
  setPlaceholder("forgot-identity", t("forgot_hint", "Enter email or username"));
  setText("forgot-submit", t("forgot_submit", "Request link"));
  setText("forgot-close", t("system_close", "Close"));
}

// ---------- UI WIRING ----------
function bindUIEvents() {
  // Language flags
  document.querySelectorAll(".lang-flag").forEach((el) => {
    el.addEventListener("click", () => {
      if (window.SoundEngine) SoundEngine.flagClick();
      const lang = el.getAttribute("data-lang");
      if (lang) setLanguage(lang);
    });
  });

  // Input focus sound (synthetic or mp3)
  document.querySelectorAll("input").forEach((inp) => {
    inp.addEventListener("focus", () => {
      if (window.SoundEngine) SoundEngine.uiFocus();
    });
  });

  // UI confirm sound on buttons
  ["btn-login", "btn-register", "btn-forgot", "admin-submit", "reg-submit", "reg-close", "forgot-submit", "forgot-close"].forEach((id) => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener("click", () => {
      if (window.SoundEngine) SoundEngine.uiConfirm();
    });
  });

  // Open/close Register modal
  const btnRegister = byId("btn-register");
  if (btnRegister) btnRegister.addEventListener("click", () => showModal("register-screen"));

  const regClose = byId("reg-close");
  if (regClose) regClose.addEventListener("click", () => hideModal("register-screen"));

  // Open/close Forgot modal
  const btnForgot = byId("btn-forgot");
  if (btnForgot) btnForgot.addEventListener("click", () => showModal("forgot-screen"));

  const forgotClose = byId("forgot-close");
  if (forgotClose) forgotClose.addEventListener("click", () => hideModal("forgot-screen"));

  // Legal links: clickable placeholders (no destination yet)
  ["link-imprint", "link-terms", "link-support"].forEach((id) => {
    const el = byId(id);
    if (!el) return;
    el.addEventListener("click", () => {
      // Placeholder click: no routing yet. Sound already handled above by button list if you want.
      // Keep intentionally empty.
    });
  });
}

// ---------- MODAL HELPERS ----------
function showModal(id) {
  const el = byId(id);
  if (!el) return;
  el.classList.remove("modal-hidden");
}

function hideModal(id) {
  const el = byId(id);
  if (!el) return;
  el.classList.add("modal-hidden");
}

// ---------- CLOCK ----------
function startClock() {
  stopClock();
  updateClockOnce();
  clockTimer = setInterval(updateClockOnce, 60_000);
}

function stopClock() {
  if (clockTimer) clearInterval(clockTimer);
  clockTimer = null;
}

function updateClockOnce() {
  const el = byId("system-clock");
  if (!el) return;
  const now = new Date();
  // No label text, only localized formatting
  try {
    el.textContent = now.toLocaleString(currentLang, {
      dateStyle: "medium",
      timeStyle: "short"
    });
  } catch {
    el.textContent = now.toLocaleString("en", { dateStyle: "medium", timeStyle: "short" });
  }
}

// ---------- FOOTER ----------
async function loadFooter() {
  const target = byId("footer-placeholder");
  if (!target) return;

  try {
    const response = await fetch("assets/footer.html", { cache: "no-store" });
    if (!response.ok) return;
    target.innerHTML = await response.text();
  } catch {
    // optional footer, ignore silently
  }
}

// ---------- DOM HELPERS ----------
function byId(id) {
  return document.getElementById(id);
}

function setText(id, text) {
  const el = byId(id);
  if (!el) return;
  el.textContent = String(text ?? "");
}

function setPlaceholder(id, text) {
  const el = byId(id);
  if (!el) return;
  el.setAttribute("placeholder", String(text ?? ""));
}
