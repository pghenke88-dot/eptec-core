(() => {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const safe = (fn) => { try { return fn(); } catch { return undefined; } };

  function setDisplay(id, on, mode = "block") {
    const el = $(id); if (!el) return;
    el.style.display = on ? mode : "none";
  }
  function showModal(id){ $(id)?.classList?.remove("modal-hidden"); }
  function hideModal(id){ $(id)?.classList?.add("modal-hidden"); }

  function renderFX(tr){
    const t = tr || {};
    const flash = $("eptec-white-flash");
    if (flash) flash.classList.toggle("white-flash-active", !!t.whiteout);

    const tunnel = $("eptec-tunnel");
    if (tunnel) {
      if (t.tunnelActive) {
        tunnel.classList.remove("tunnel-hidden");
        tunnel.classList.add("tunnel-active");
      } else {
        tunnel.classList.add("tunnel-hidden");
        tunnel.classList.remove("tunnel-active");
      }
    }
  }

  function renderPaywall(s){
    const pw = $("paywall-screen");
    if (!pw) return;
    const on = !!s?.paywall?.open;
    pw.classList.toggle("paywall-hidden", !on);
    pw.classList.toggle("modal-hidden", !on);
    pw.setAttribute("aria-hidden", on ? "false" : "true");
  }

  function legalPlaceholderText(){
    const stand = new Date().toLocaleDateString();
    return "Inhalt vorbereitet.\nWird später aus Docs geladen.\n\nBackend ist dafür NICHT erforderlich.\n\nStand: " + stand;
  }

  function renderModals(s){
    hideModal("register-screen");
    hideModal("forgot-screen");
    hideModal("legal-screen");

    if (s.modal === "register") showModal("register-screen");
    if (s.modal === "forgot") showModal("forgot-screen");
    if (s.modal === "legal") showModal("legal-screen");

    if (s.modal === "legal") {
      const body = $("legal-body");
      if (body) body.textContent = legalPlaceholderText();
    }
  }

  function renderView(s){
    const view = String(s.view || "meadow");
    setDisplay("meadow-view", view === "meadow", "flex");
    setDisplay("doors-view",  view === "doors",  "block");
    setDisplay("room-1-view", view === "room1",  "block");
    setDisplay("room-2-view", view === "room2",  "block");
    setDisplay("tunnel-view", view === "tunnel", "block"); // optional
  }

  function render(s){
    renderView(s || {});
    renderModals(s || {});
    renderFX((s || {}).transition);
    renderPaywall(s || {});
  }

  function bindModalClosers(){
    safe(() => $("reg-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
    safe(() => $("forgot-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
    safe(() => $("legal-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal: null })));
  }
  function bindFooterLegal(){
    safe(() => $("link-imprint")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"imprint" })));
    safe(() => $("link-terms")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"terms" })));
    safe(() => $("link-support")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"support" })));
    safe(() => $("link-privacy-footer")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ modal:"legal", legalKind:"privacy" })));
  }
  function bindPaywallClose(){
    safe(() => $("paywall-close")?.addEventListener("click", () => window.EPTEC_UI_STATE?.set({ paywall:{ open:false } })));
  }

  function init(){
    safe(() => window.EPTEC_UI_STATE?.onChange?.(render));
    safe(() => render(window.EPTEC_UI_STATE?.state || { view:"meadow", modal:null, transition:{ tunnelActive:false, whiteout:false }}));
    bindModalClosers();
    bindFooterLegal();
    bindPaywallClose();
  }

  window.EPTEC_UI = {
    init,
    showMsg: (id, text, type="warn") => {
      const el = $(id); if (!el) return;
      el.textContent = String(text||"");
      el.className = `system-msg show ${type}`;
    },
    hideMsg: (id) => {
      const el = $(id); if (!el) return;
      el.textContent = "";
      el.className = "system-msg";
    },
    toast: (msg, type="warn", ms=2200) => {
      let el = $("eptec-toast");
      if (!el) { el=document.createElement("div"); el.id="eptec-toast"; el.className="eptec-toast"; document.body.appendChild(el); }
      el.className = `eptec-toast ${type}`;
      el.textContent = String(msg||"");
      requestAnimationFrame(()=>el.classList.add("show"));
      setTimeout(()=>el.classList.remove("show"), ms);
    }
  };
})();
