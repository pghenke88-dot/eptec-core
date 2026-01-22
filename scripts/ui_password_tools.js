/**
 * scripts/ui_password_tools.js
 * EPTEC UI Password Tools — Placeholders + Eye Toggles (hard, visual)
 * - sets WORD placeholders (Password/Masterpasswort)
 * - adds 👁 toggles for master + login passwords
 * - does NOT affect validation or business logic
 */

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function lang() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || safe(() => window.EPTEC_UI_STATE?.state) || {};
    const l = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "de").toLowerCase();
    return l === "en" ? "en" : "de";
  }

  function words() {
    return lang() === "en"
      ? { pw: "Password", master: "Master password" }
      : { pw: "Passwort", master: "Masterpasswort" };
  }

  function ensurePlaceholder(id, text) {
    const el = $(id);
    if (!el) return;
    if (!el.getAttribute("placeholder")) el.setAttribute("placeholder", text);
  }

  function ensureEye(inputId, eyeId) {
    const inp = $(inputId);
    if (!inp) return;

    // ensure wrapper (guaranteed positioning)
    let wrap = inp.closest(".pw-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "pw-wrap";
      wrap.style.position = "relative";
      wrap.style.display = "block";
      inp.parentNode.insertBefore(wrap, inp);
      wrap.appendChild(inp);
    }

    let eye = $(eyeId);
    if (!eye) {
      eye = document.createElement("button");
      eye.type = "button";
      eye.id = eyeId;
      eye.textContent = "👁️";
      eye.style.position = "absolute";
      eye.style.right = "10px";
      eye.style.top = "50%";
      eye.style.transform = "translateY(-50%)";
      eye.style.background = "transparent";
      eye.style.border = "0";
      eye.style.cursor = "pointer";
      eye.style.opacity = "0.75";
      eye.style.fontSize = "16px";
      eye.style.lineHeight = "1";
      wrap.appendChild(eye);

      inp.style.paddingRight = inp.style.paddingRight || "44px";
    }

    if (eye.__bound) return;
    eye.__bound = true;

    eye.addEventListener("click", () => {
      safe(() => window.SoundEngine?.uiConfirm?.());
      inp.type = (inp.type === "password") ? "text" : "password";
      eye.style.opacity = (inp.type === "password") ? "0.75" : "1";
    });
  }

  function apply() {
    const w = words();

    // login
    ensurePlaceholder("login-password", w.pw);
    ensureEye("login-password", "eye-login-password");

    // master start
    ensurePlaceholder("admin-code", w.master);
    ensureEye("admin-code", "eye-admin-code");

    // doors master (if present)
    ensurePlaceholder("door1-master", w.master);
    ensureEye("door1-master", "eye-door1-master");

    ensurePlaceholder("door2-master", w.master);
    ensureEye("door2-master", "eye-door2-master");
  }

  function boot() {
    apply();

    // keep it stable even if something re-renders
    safe(() => {
      const mo = new MutationObserver(apply);
      mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["placeholder", "type"] });
    });

    // re-apply on language changes
    const S = window.EPTEC_UI_STATE;
    if (S?.subscribe) S.subscribe(() => apply());
    else if (S?.onChange) S.onChange(() => apply());
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
