/**
 * scripts/room1_framework_builder.js
 * EPTEC ROOM 1 — Framework Builder + Workbench + Compare (Launch-ready)
 *
 * - Uses ONLY framework terms: Preamble, Part, Appendix, Annex (from framework JSON)
 * - Build mode: selects clauses, enforces limits (basic 5 / premium 8 per module)
 * - Workbench: shows selections and standard-contract mapping table stub
 * - Download: generates a plain-text framework file and auto-archives it
 * - Compare (Premium): upload framework + contract, compute deviation%, show traffic light + mirror list (affected elements only)
 * - Mirror shows paraphrase + public-source hint (orientation only; no legal advice)
 */
(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
 const safe = (fn) => {
    try { return fn(); }
    catch (e) {
      console.warn("[R1 BUILDER] safe fallback", e);
      return undefined;
    }
  };
  const STORAGE = {
    plan: "EPTEC_PLAN", // "basic" | "premium"
    selections: "EPTEC_R1_SELECTIONS",
    archive: "EPTEC_R1_ARCHIVE_LAST" // {filename, text, ts}
  };

    let LAST_AFFECTED = [];

function getPlan() {
    const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || {};
    const p = String(st?.plan || localStorage.getItem(STORAGE.plan) || "basic").toLowerCase();
    return p === "premium" ? "premium" : "basic";
  }

  function limits() {
    return getPlan() === "premium" ? { perModule: 8 } : { perModule: 5 };
  }

  function loadSelections() {
     try { return JSON.parse(localStorage.getItem(STORAGE.selections) || "{}"); }
    catch (e) {
      console.warn("[R1 BUILDER] loadSelections failed", e);
      return {};
    }
  }
  function saveSelections(sel) {
    localStorage.setItem(STORAGE.selections, JSON.stringify(sel || {}));
  }

  function setModal(id, open) {
    const el = $(id);
    if (!el) return;
    el.classList.toggle("modal-hidden", !open);
  }

  function resolveFrameworkLang() {
    try {
      const st = (window.EPTEC_UI_STATE && (window.EPTEC_UI_STATE.get?.() || window.EPTEC_UI_STATE.state)) || {};
      const l = String(st?.i18n?.lang || st?.lang || localStorage.getItem("EPTEC_LANG") || document.documentElement.lang || "en").toLowerCase();
      if (l === "es") return "es";
      if (l === "de") return "de";
      if (l === "en") return "en";
      // Phase 1: EN/DE/ES supported for framework content; all other languages fall back to EN
      return "en";
    } catch (e) {
      console.warn("[R1 BUILDER] resolveFrameworkLang failed", e);
      return "en";
    }
  }

  async function loadFramework() {
    const lang = resolveFrameworkLang();
    const url = `./locales/framework_room1_${lang}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`${url} missing`);
    return await res.json();
  }

  async function loadRoom1Table() {
    // Two-left-columns table source (module label + standard contract unit)
    const lang = resolveFrameworkLang();
    const tryUrls = [
      `./locales/framework_room1_table_${lang}.json`,
      `./locales/framework_room1_table_en.json`
    ];
    for (const url of tryUrls) {
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) continue;
        const data = await res.json();
        if (data && Array.isArray(data.items)) return data;
      } catch (e) {
        console.warn("[R1] loadRoom1Table failed", e);
      }
    }
    return { items: [] };
  }

  // Room-1 table map: moduleId -> {label, unit}
  let ROOM1_TABLE = Object.create(null);

  // Only this subset is used in Room 1 (up to Annex I)
  const ROOM1_ALLOWED_MODULES = new Set([
    "PREAMBLE",
    "PART_0","PART_0_A","PART_0_B",
    "PART_I","PART_I_A","PART_I_B","PART_I_C","PART_I_D","PART_I_E","PART_I_F","PART_I_G","PART_I_H",
    "ANNEX_A","ANNEX_B","ANNEX_C","ANNEX_D","ANNEX_E","ANNEX_F","ANNEX_G","ANNEX_H","ANNEX_I"
  ]);

  function legalBasisFor(moduleTitle) {
    // Orientation-only public anchors (no legal advice).
    // Keep wording aligned with the selected framework language.
    const fwLang = resolveFrameworkLang();
    const t = String(moduleTitle || "").toLowerCase();

    // Core anchors (publicly accessible): UNIDROIT (good faith), Berne (moral rights), fiduciary duty / duty to account, audit/verification standards.
    if (t.includes("preamble") || t.includes("intent") || t.includes("purpose")) {
      if (fwLang === "es") return [
        "Principios UNIDROIT sobre los Contratos Comerciales Internacionales — Art. 1.7 (Buena fe y lealtad)",
        "Principios generales del derecho contractual: consentimiento informado y transparencia en relaciones contractuales"
      ];
      return [
        "UNIDROIT Principles of International Commercial Contracts — Art. 1.7 (Good faith and fair dealing)",
        "General contract-law principles: informed consent & transparency in contractual relations"
      ];
    }
    if (t.includes("creative") || t.includes("moral") || t.includes("authority") || t.includes("integrity") || t.includes("titles") || t.includes("naming")) {
      if (fwLang === "es") return [
        "Convenio de Berna para la Protección de las Obras Literarias y Artísticas — Art. 6bis (Derechos morales: atribución e integridad)",
        "Doctrina de derecho de autor: atribución, integridad y estándares de control autorial"
      ];
      return [
        "Berne Convention for the Protection of Literary and Artistic Works — Art. 6bis (Moral Rights: attribution & integrity)",
        "Copyright doctrine: attribution, integrity, and authorial control standards"
      ];
    }
    if (t.includes("fiduciary") || t.includes("transparency") || t.includes("communication") || t.includes("report") || t.includes("register")) {
      if (fwLang === "es") return [
        "Principios de deber fiduciario: lealtad, revelación de información y deber de rendición de cuentas (agencia/regalías)",
        "Principios UNIDROIT — Art. 1.7 (Buena fe y lealtad)"
      ];
      return [
        "Fiduciary duty principles: loyalty, disclosure, and duty to account (agency/royalty contexts)",
        "UNIDROIT Principles — Art. 1.7 (Good faith and fair dealing)"
      ];
    }
    if (t.includes("financial") || t.includes("royalty") || t.includes("commission") || t.includes("payments") || t.includes("trust") || t.includes("accounting")) {
      if (fwLang === "es") return [
        "Estándares de transparencia contable en relaciones de comisión/regalías (deber de rendición de cuentas; estados verificables)",
        "Principios fiduciarios: segregación de fondos e informes exactos"
      ];
      return [
        "Accounting transparency standards in commission/royalty relationships (duty to account; verifiable statements)",
        "Fiduciary duty principles: segregation of funds & accurate reporting"
      ];
    }
    if (t.includes("audit") || t.includes("inspection") || t.includes("verification")) {
      if (fwLang === "es") return [
        "Derechos de auditoría y verificación en relaciones de regalías/agencia (deber de rendición de cuentas; verificación de estados)",
        "Doctrinas de cumplimiento de buena fe que respaldan el acceso a registros verificables"
      ];
      return [
        "Audit and verification rights in royalty/agency relationships (duty to account; verification of statements)",
        "Good-faith performance doctrines supporting access to verifiable records"
      ];
    }
    if (t.includes("termination") || t.includes("reversion") || t.includes("breach") || t.includes("remedies") || t.includes("enforcement")) {
      if (fwLang === "es") return [
        "Principios de derecho contractual: terminación por incumplimiento material y falta de desempeño",
        "Estándares de reversión de derechos en licencias/edición (concesiones vinculadas al desempeño)"
      ];
      return [
        "Contract-law principles: termination for material breach & non-performance",
        "Rights reversion standards in licensing/publishing relationships (performance-linked grants)"
      ];
    }
    if (t.includes("privacy") || t.includes("confidential") || t.includes("publicity") || t.includes("image")) {
      if (fwLang === "es") return [
        "Principios de protección de datos y confidencialidad (estándares públicos de privacidad/confidencialidad)",
        "Tratamiento de buena fe de información confidencial en relaciones contractuales"
      ];
      return [
        "Data protection & confidentiality principles (publicly accessible privacy/confidentiality standards)",
        "Good-faith handling of confidential information in contractual relations"
      ];
    }
    // Default baseline
    if (fwLang === "es") return [
      "Principios UNIDROIT — Art. 1.7 (Buena fe y lealtad)",
      "Principios generales del derecho contractual: transparencia, proporcionalidad y desempeño verificable"
    ];
    return [
      "UNIDROIT Principles — Art. 1.7 (Good faith and fair dealing)",
      "General contract-law principles: transparency, proportionality, and verifiable performance"
    ];
  }

  function paraphraseFor(moduleTitle, elementLabel) {
    // More concrete, still non-advisory: states what the clause is meant to ensure, not what the law decides.
    const fwLang = resolveFrameworkLang();
    const t = String(moduleTitle || "");
    const e = String(elementLabel || "");
    const basis = legalBasisFor(t);

    if (fwLang === "es") {
      return [
        `Paráfrasis: Este elemento pretende operacionalizar los estándares referenciados por "${t}" de forma verificable y auditable.`,
        `Apoya una contratación informada y transparente, haciendo comprobables el desempeño, la divulgación y los límites de derechos, en lugar de presuponerlos.`,
        `Base jurídica (anclajes públicos): ${basis.join(" · ")}`
      ].join(" ");
    }

    return [
      `Paraphrase: This element is intended to operationalize the standards referenced by "${t}" in a verifiable and auditable way.`,
      `It supports informed, transparent contracting by making performance, disclosure, and rights-boundaries checkable rather than assumed.`,
      `Legal basis (public anchors): ${basis.join(" · ")}`
    ].join(" ");
  }

  // =========================================================
// LEGAL REFERENCES (UNDERPOINT-LEVEL) — SHOW ONLY IN COMPARE/MIRROR
// - References are tied to element codes (e.g., PREAMBLE_1 ...)
// - They must NOT appear in the pure Framework build view.
// - They appear ONLY when an element is flagged as affected in the Mirror.
// =========================================================

function refsForCode(code) {
  const c = String(code || "").trim();

  // Public anchors (safe): international instruments + general statutory anchors.
  // NOTE: This is an orientation layer (no legal advice). Exact applicability depends on jurisdiction and contract.
  const MAP = {
    en: {
      PREAMBLE_1: ["UNIDROIT Principles (good faith & fair dealing)", "International publishing standards (auditability & transparency)", "Fiduciary duty concepts (EU/UK/US)"],
      PREAMBLE_LA: ["Berne Convention (moral rights / integrity)", "WIPO treaties & standards (literary property)"],
      PREAMBLE_LB: ["General contract-law principles (good faith / transparency)", "International fiduciary standards (EU/UK/US)"],
      PREAMBLE_2: ["UNIDROIT Principles (interpretation; good faith)", "International contract practice (auditability)"],
      PREAMBLE_3: ["International fiduciary standards (loyalty, diligence, transparency)", "General anti-corruption / compliance principles"],
      PREAMBLE_LE: ["New York Convention (1958) — arbitral enforcement (where applicable)", "International commercial practice (evidence & audit trails)"],
      PREAMBLE_LF: ["International contract transparency norms (documentation; disclosure)"],
      PREAMBLE_4: ["Berne Convention & WIPO (authorial ownership; attribution)", "General IP / copyright principles"],
      PREAMBLE_5: ["Good-faith performance (general contract law)", "Transparency & reporting duties (industry standard)"],
      PREAMBLE_6: ["Auditability standards (records; timestamping)", "Disclosure duties (publishing/agency practice)"],
      PREAMBLE_7: ["Non-waiver principles (contract law)", "Documentation requirements (evidence integrity)"],
      PREAMBLE_8: ["Due process in negotiation (written notice; cure periods)", "Good-faith & proportionality principles"],
      PREAMBLE_LD: ["EU/UK/US fiduciary standards (most-protective interpretation rule)"],
      PREAMBLE_9: ["UNIDROIT Principles (conflict-of-laws orientation)", "Most-protective interpretation approach (fiduciary parity)"],
      PREAMBLE_10: ["Author’s national law as governing law (Germany — as stated in the Framework)", "Berne Convention baseline protection"],
      PREAMBLE_4_1: ["Written-approval requirement (contract practice)", "Evidence integrity (audit trails)"],
      PREAMBLE_4_2: ["No implied consent (contract interpretation standards)", "Documentation duties"],
      PREAMBLE_4_3: ["Attribution & integrity (moral-rights doctrine)", "Berne Convention baseline"],
      PREAMBLE_4_4: ["Corporate-group responsibility concepts (affiliate compliance)"],
      PREAMBLE_4_5: ["Transparency obligations (disclosure; reporting)", "Auditability norms"],
      PREAMBLE_5_1: ["Contract-law definitions (clarity & interpretability)", "Audit-ready definitions"],
      PREAMBLE_5_2: ["Net receipts / accounting transparency norms (publishing practice)"],
      PREAMBLE_5_3: ["Written approval & secure communication (evidence integrity)"],
      PREAMBLE_5_4: ["Commercial interest / late payment principles (contract & commercial law)"],
      PREAMBLE_0: ["No unilateral monetary advantage clause (equity framing)", "Good-faith & parity principles"],
      PREAMBLE_11: ["Independent counsel & audit rights (compliance practice)", "Transparency duties"],
      PREAMBLE_12: ["Non-circumvention / anti-collusion principles (fiduciary standards)"],
      PREAMBLE_13: ["Global application framing (Berne/WIPO baseline)", "International distribution norms"],
      PREAMBLE_14: ["Successorship / continuity principles (estate / succession frameworks)"],
      PREAMBLE_15: ["Confidentiality & professional-use framing (industry standard)"]
    },
    es: {
      PREAMBLE_1: ["Principios UNIDROIT (buena fe y trato justo)", "Estándares internacionales de transparencia y auditabilidad", "Deberes fiduciarios (UE/Reino Unido/EE. UU.)"],
      PREAMBLE_LA: ["Convenio de Berna (derechos morales / integridad)", "Tratados y estándares de la OMPI (propiedad literaria)"],
      PREAMBLE_LB: ["Principios generales de derecho contractual (buena fe / transparencia)", "Estándares fiduciarios internacionales (UE/UK/US)"],
      PREAMBLE_2: ["Principios UNIDROIT (interpretación; buena fe)", "Práctica contractual internacional (auditabilidad)"],
      PREAMBLE_3: ["Estándares fiduciarios (lealtad, diligencia, transparencia)", "Principios generales de cumplimiento / anticorrupción"],
      PREAMBLE_LE: ["Convención de Nueva York (1958) — ejecución arbitral (si aplica)", "Práctica comercial internacional (evidencia y auditoría)"],
      PREAMBLE_LF: ["Normas de transparencia contractual (documentación; divulgación)"],
      PREAMBLE_4: ["Convenio de Berna y OMPI (autoría; atribución)", "Principios generales de propiedad intelectual"],
      PREAMBLE_5: ["Buena fe contractual (derecho contractual general)", "Deberes de transparencia e información"],
      PREAMBLE_6: ["Estándares de auditabilidad (registros; sellado temporal)", "Deberes de divulgación (práctica editorial/agencial)"],
      PREAMBLE_7: ["Principio de no renuncia (derecho contractual)", "Integridad probatoria (registros)"],
      PREAMBLE_8: ["Debida diligencia en negociación (aviso escrito; subsanación)", "Proporcionalidad y buena fe"],
      PREAMBLE_LD: ["Estándares fiduciarios UE/UK/US (interpretación más protectora)"],
      PREAMBLE_9: ["Principios UNIDROIT (orientación en conflictos de ley)", "Interpretación protectora (paridad fiduciaria)"],
      PREAMBLE_10: ["Ley nacional del Autor (Alemania) como ley rectora (según el Marco)", "Base mínima de Berna"],
      PREAMBLE_4_1: ["Requisito de aprobación escrita (práctica contractual)", "Integridad de evidencia (audit trails)"],
      PREAMBLE_4_2: ["No consentimiento implícito (estándares de interpretación)", "Deberes de documentación"],
      PREAMBLE_4_3: ["Atribución e integridad (derechos morales)", "Convenio de Berna (base)"],
      PREAMBLE_4_4: ["Responsabilidad de grupo corporativo / afiliadas (cumplimiento)"],
      PREAMBLE_4_5: ["Obligaciones de transparencia (divulgación; reporte)", "Normas de auditoría"],
      PREAMBLE_5_1: ["Definiciones contractuales (claridad)", "Definiciones auditables"],
      PREAMBLE_5_2: ["Normas de contabilidad transparente (net receipts)"],
      PREAMBLE_5_3: ["Aprobación escrita y comunicación segura (prueba)"],
      PREAMBLE_5_4: ["Interés comercial / mora (derecho mercantil)"],
      PREAMBLE_0: ["Cláusula de equidad (sin ventaja unilateral)", "Buena fe y paridad"],
      PREAMBLE_11: ["Derecho a asesores independientes / auditoría", "Obligaciones de transparencia"],
      PREAMBLE_12: ["Principios anti-elusión / anti-colusión (fiduciarios)"],
      PREAMBLE_13: ["Aplicación global (Berna/OMPI)", "Normas de distribución internacional"],
      PREAMBLE_14: ["Continuidad y sucesión (principios de herencia/continuidad)"],
      PREAMBLE_15: ["Confidencialidad y uso profesional (estándar del sector)"]
    },
    de: {
      PREAMBLE_1: ["Treu und Glauben (BGB § 242) — Grundsatz", "Transparenz- und Dokumentationspflichten (Branchenstandard)", "Treuhänderische Pflichten (Loyalität, Sorgfalt, Transparenz)"],
      PREAMBLE_LA: ["Berner Übereinkunft (Urheberpersönlichkeitsrechte als Basis)", "WIPO/OMPI-Standards (literarische Schutzrechte)"],
      PREAMBLE_LB: ["Grundsätze des Vertragsrechts (Treu und Glauben; Transparenz)", "Treuhand-/Fiduciary-Standards (EU/UK/US als Referenz)"],
      PREAMBLE_2: ["UNIDROIT-Grundsätze (Auslegung; good faith als Referenz)", "Dokumentations- und Prüfbarkeitspflichten"],
      PREAMBLE_3: ["Treuhänderische Pflichten (Loyalität; Sorgfalt; Transparenz)", "Compliance-/Integritätsgrundsätze (allgemein)"],
      PREAMBLE_LE: ["New-York-Übereinkommen 1958 (Schiedsvollstreckung, soweit einschlägig)", "Beweis- und Dokumentationsprinzipien (Audit Trail)"],
      PREAMBLE_LF: ["Transparenz- und Offenlegungspflichten (vertragliche Nebenpflichten)"],
      PREAMBLE_4: ["Urheberrechtliche Grundsätze (Urheberschaft; Zuordnung; Integrität)", "Berner Übereinkunft / WIPO als Mindestschutz"],
      PREAMBLE_5: ["Treu und Glauben (BGB § 242)", "Informations- und Rechenschaftspflichten (branchenüblich)"],
      PREAMBLE_6: ["Prüfbarkeit/Auditierbarkeit (Register; Zeitstempel)", "Offenlegungspflichten (Rechenschaft)"],
      PREAMBLE_7: ["Kein Verzicht durch Schweigen (Auslegungsgrundsatz)", "Nichtverzicht / no waiver (vertragliche Auslegung)"],
      PREAMBLE_8: ["Abhilfe-/Cure-Konzept (vertragliche Störung; Fristen)", "Verhältnismäßigkeit & Treu und Glauben"],
      PREAMBLE_LD: ["Autorenprotektive Auslegung (Schutzmaxime; Treu und Glauben)"],
      PREAMBLE_9: ["Konflikt-of-Laws-Orientierung (Framework-intern; UNIDROIT als Referenz)", "Schutzmaxime zugunsten des Autors"],
      PREAMBLE_10: ["Deutsches Recht als leitendes Recht (wie im Framework festgelegt)", "Berner Übereinkunft (internationaler Mindestschutz)"],
      PREAMBLE_4_1: ["Schriftformerfordernis / Schriftliche Zustimmung (Beweis- und Auslegungssicherheit)"],
      PREAMBLE_4_2: ["Kein konkludenter Verzicht (Auslegung; Treu und Glauben)"],
      PREAMBLE_4_3: ["Urheberpersönlichkeitsrecht (Anerkennung; Integrität)", "Berner Übereinkunft als Basis"],
      PREAMBLE_4_4: ["Konzernhaftung/Verantwortung verbundener Unternehmen (Compliance)"],
      PREAMBLE_4_5: ["Transparenzpflichten (Dokumentation; Register)"],
      PREAMBLE_5_1: ["Definitionen als Auslegungshilfe (Vertragsklarheit)"],
      PREAMBLE_5_2: ["Abrechnungs-/Nettoeinnahmen-Transparenz (branchenüblich)"],
      PREAMBLE_5_3: ["Digitale Schriftform/gesicherte Kommunikation (Beweis)"],
      PREAMBLE_5_4: ["Verzugs-/Zinsprinzipien (BGB-Verzug als Orientierung)", "Kommerzieller Zinssatz (Framework-Definition)"],
      PREAMBLE_0: ["Equity/Balance-Formel (kein einseitiger Vorteil)", "Treu und Glauben"],
      PREAMBLE_11: ["Recht auf unabhängige Berater/Audits (Compliance)", "Informationspflichten"],
      PREAMBLE_12: ["Anti-Umgehung/Anti-Kollusion (Treuhandstandard)"],
      PREAMBLE_13: ["Weltweite Wirkung (Berne/WIPO Mindestschutz)", "Internationale Durchsetzbarkeit (Framework-intern)"],
      PREAMBLE_14: ["Rechtsnachfolge/Bestandsschutz (Kontinuitätsprinzip)"],
      PREAMBLE_15: ["Vertraulichkeit (branchenüblich; Schutzinteresse)"]
    }
  };

  const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || {};
  const lg = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "en").toLowerCase();
  const key = (lg === "de") ? "de" : (lg === "es") ? "es" : "en";
  const bucket = MAP[key] || {};
  return bucket[c] || [];
}

function sourceHintFor(code, moduleTitle) {
  // Show explicit anchors ONLY in the Mirror (compare mode).
  const refs = refsForCode(code);
  const st = safe(() => window.EPTEC_UI_STATE?.get?.()) || {};
  const lg = String(st?.i18n?.lang || st?.lang || document.documentElement.lang || "en").toLowerCase();
  const head = (lg === "de") ? "Rechtsgrundlage:" : (lg === "es") ? "Fundamento jurídico:" : "Legal reference:";
  if (!refs.length) {
    return (lg === "de")
      ? "Rechtsgrundlage: Allgemeine Grundsätze von Treu und Glauben und Transparenz (öffentliche Quellen)."
      : (lg === "es")
        ? "Fundamento jurídico: principios generales de buena fe y transparencia contractual (fuentes públicas)."
        : "Legal reference: general good-faith & transparency principles in contract law (public sources).";
  }
  return head + " " + refs.join(" · ");
}
  function ensureRoom1Buttons() {
    // existing room1 view uses data-logic-id buttons; we bind our own IDs
    const map = {
      openFramework: "r1-btn-framework",
      openWorkbench: "r1-btn-workbench",
      openCompare: "r1-btn-compare",
      openArchive: "r1-btn-archive"
    };
    Object.values(map).forEach(id => {
      const b = $(id);
      if (b) b.disabled = false;
    });
  }

  function renderFrameworkList(data) {
    const wrap = $("r1-framework-list");
    if (!wrap) return;
    wrap.innerHTML = "";

    const sel = loadSelections();
    const { perModule } = limits();

    (data.modules || []).filter(m => ROOM1_ALLOWED_MODULES.has(String(m.id || "").trim())).forEach(mod => {
      // Module header row
      const h = document.createElement("div");
      h.className = "r1-mod-head";
      const tRow = ROOM1_TABLE[String(mod.id)] || null;
      h.textContent = (tRow && tRow.label) ? tRow.label : (mod.title || mod.id);
      wrap.appendChild(h);

      const row = document.createElement("div");
      row.className = "r1-mod-row";

      // Use abbreviations to keep compact
      const ab = document.createElement("button");
      ab.type = "button";
      ab.className = "r1-abbr";
      ab.textContent = (tRow && tRow.label) ? tRow.label : (mod.title || mod.id);
      ab.title = (tRow && tRow.label) ? tRow.label : (mod.title || mod.id);
      ab.addEventListener("click", () => {
        // toggle elements panel
        const p = row.querySelector(".r1-elements");
        if (p) p.classList.toggle("hidden");
      });
      row.appendChild(ab);

      const badge = document.createElement("div");
      badge.className = "r1-badge";
      const count = (sel[mod.id] || []).length;
      badge.textContent = `${count}/${perModule}`;
      row.appendChild(badge);

      const elPanel = document.createElement("div");
      elPanel.className = "r1-elements hidden";
      (mod.elements || []).forEach(el => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "r1-el";
        // Framework JSON stores sentence text under "text" (no separate label).
        btn.textContent = el.text || el.label || el.code;
        btn.dataset.code = el.code;

        const picked = (sel[mod.id] || []).some(x => x.code === el.code);
        if (picked) btn.classList.add("picked");

        btn.addEventListener("click", () => {
          const cur = sel[mod.id] || [];
          const exists = cur.some(x => x.code === el.code);
          if (exists) {
            sel[mod.id] = cur.filter(x => x.code !== el.code);
            btn.classList.remove("picked");
          } else {
            if (cur.length >= perModule) {
              // hard limit -> flash red
              btn.classList.add("limit");
              setTimeout(() => btn.classList.remove("limit"), 450);
              flashStatus(`Selection limit exceeded for "${(tRow && tRow.label) ? tRow.label : (mod.title || mod.id)}" (${perModule}).`, "bad");
              updateWorkbenchStatus();
              return;
            }
            sel[mod.id] = [...cur, { code: el.code, label: (el.text || el.label || el.code), moduleTitle: (tRow && tRow.label) ? tRow.label : (mod.title || mod.id), moduleId: mod.id }];
            btn.classList.add("picked");
            btn.classList.add("blink");
            setTimeout(() => btn.classList.remove("blink"), 220);
          }
          saveSelections(sel);
          // update badge
          badge.textContent = `${(sel[mod.id] || []).length}/${perModule}`;
          updateWorkbench();
          updateWorkbenchStatus();
        });
        elPanel.appendChild(btn);
      });

      row.appendChild(elPanel);
      wrap.appendChild(row);
    });

    updateWorkbench();
    updateWorkbenchStatus();
  }

  function flashStatus(msg, kind) {
    const el = $("r1-status");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("ok","warn","bad");
    el.classList.add(kind === "ok" ? "ok" : kind === "warn" ? "warn" : "bad");
  }

  function hasAnyRed() {
    // In this simple model, red only occurs when user tries to exceed; we also block if any module over limit (shouldn't happen).
    const sel = loadSelections();
    const { perModule } = limits();
    return Object.keys(sel).some(mid => (sel[mid] || []).length > perModule);
  }

  function updateWorkbenchStatus() {
    const sel = loadSelections();
    const { perModule } = limits();
    let ok = true;
    for (const mid of Object.keys(sel)) {
      if ((sel[mid] || []).length > perModule) ok = false;
    }
    const downloadBtn = $("r1-workbench-download");
    if (downloadBtn) downloadBtn.disabled = !ok || hasAnyRed();

    if (!ok) {
      flashStatus("Selection invalid: limit exceeded. Remove items to continue.", "bad");
      return;
    }
    flashStatus(`Build mode ready. Plan: ${getPlan().toUpperCase()} · Limit per module: ${perModule}`, "ok");
  }

  function standardContractAreaFor(moduleId, moduleTitle) {
    const row = ROOM1_TABLE[String(moduleId || "")] || null;
    if (row && row.unit) return row.unit;

    // Fallback heuristic (should be rare if table file exists)
    const t = String(moduleTitle || "").toLowerCase();
    if (t.includes("preamble")) return "Purpose / Interpretation";
    if (t.includes("marketing")) return "Marketing / Promotion";
    if (t.includes("privacy")) return "Privacy / Data Protection";
    if (t.includes("rights")) return "Rights / Ownership";
    if (t.includes("termination") || t.includes("remed")) return "Termination / Remedies";
    return "General";
  }

  function updateWorkbench() {
    const bodyA = $("r1-workbench-body");
    const bodyB = $("r1-workbench-body-inline");
    if (bodyA) bodyA.innerHTML = "";
    if (bodyB) bodyB.innerHTML = "";

    const sel = loadSelections();
    const rows = [];
    Object.keys(sel).forEach(mid => {
      (sel[mid] || []).forEach(x => rows.push(x));
    });

    const renderRow = (tbody) => rows.forEach(x => {
      const tr = document.createElement("tr");
      const tdL = document.createElement("td");
      tdL.textContent = x.moduleTitle; // strict framework naming
      const tdR = document.createElement("td");
      tdR.textContent = standardContractAreaFor(x.moduleId, x.moduleTitle);
      const tdE = document.createElement("td");
      tdE.textContent = x.label;

      const tdX = document.createElement("td");
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "r1-remove";
      rm.textContent = "✕";
      rm.addEventListener("click", () => {
        const cur = sel[x.moduleId] || [];
        sel[x.moduleId] = cur.filter(y => y.code !== x.code);
        saveSelections(sel);
        updateWorkbench();
        updateWorkbenchStatus();
        // also rerender framework list badges/picked without full rebuild: easiest is to reopen framework modal later.
      });
      tdX.appendChild(rm);

      tr.appendChild(tdL);
      tr.appendChild(tdR);
      tr.appendChild(tdE);
      tr.appendChild(tdX);
      tbody.appendChild(tr);
    });

    if (bodyA) renderRow(bodyA);
    if (bodyB) renderRow(bodyB);

    const countElA = $("r1-workbench-count");
    if (countElA) countElA.textContent = `${rows.length}`;
    const countElB = $("r1-workbench-count-inline");
    if (countElB) countElB.textContent = `${rows.length}`;
  }

  function buildFrameworkText() {
    const sel = loadSelections();
    const rows = [];
    Object.keys(sel).forEach(mid => {
      (sel[mid] || []).forEach(x => rows.push(x));
    });
    // Group by module title
    const by = {};
    rows.forEach(x => {
      by[x.moduleTitle] = by[x.moduleTitle] || [];
      by[x.moduleTitle].push(x);
    });

    const lines = [];
    lines.push("EPTEC — Framework Draft (Build Mode)");
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Plan: ${getPlan().toUpperCase()}`);
    lines.push("");
    Object.keys(by).forEach(modTitle => {
      lines.push(modTitle);
      lines.push("-".repeat(Math.min(60, modTitle.length)));
      const basis = legalBasisFor(modTitle) || [];
      if (basis.length) {
        const lg = resolveFrameworkLang();
        lines.push((lg === "es" ? "Referencia legal: " : "Legal reference: ") + basis.join(" · "));
      }
      by[modTitle].forEach(x => {
        // Include code marker for compare mode
        lines.push(`[${x.code}] ${x.label}`);
      });
      lines.push("");
    });
    return lines.join("\n");
  }

  function saveArchive(filename, text) {
    const payload = { filename, text, ts: Date.now() };
    localStorage.setItem(STORAGE.archive, JSON.stringify(payload));
  }
  function loadArchive() {
  try { return JSON.parse(localStorage.getItem(STORAGE.archive) || "null"); }
    catch (e) {
      console.warn("[R1 BUILDER] loadArchive failed", e);
      return null;
    }
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 800);
  }
function ensureTempDownloadFallback() {
    if (window.urlTempDownload) return;
    if (typeof downloadText !== "function") {
      console.warn("[EPTEC R1] urlTempDownload fallback unavailable: downloadText missing.");
      return;
    }
    window.urlTempDownload = (filename, text) => {
      downloadText(filename || "download.txt", text || "");
    };
  }
  function wireWorkbench() {
    const doDownload = () => {
      if (hasAnyRed()) return;
      const text = buildFrameworkText();
      const filename = `framework_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.txt`;
      saveArchive(filename, text);
      downloadText(filename, text);
      flashStatus("Downloaded and archived on the shelf.", "ok");
    };

    $("r1-workbench-download")?.addEventListener("click", doDownload);
    $("r1-workbench-download-inline")?.addEventListener("click", doDownload);

    const doClear = () => {
      saveSelections({});
      updateWorkbench();
      updateWorkbenchStatus();
      flashStatus("Cleared selections.", "warn");
    };
    $("r1-workbench-clear-inline")?.addEventListener("click", doClear);
  }

  function renderArchive() {
    const box = $("r1-archive-box");
    if (!box) return;
    const a = loadArchive();
    if (!a) {
      box.textContent = "No archived framework yet. Download one from the workbench.";
      return;
    }
    box.innerHTML = "";
    const p = document.createElement("div");
    p.className = "r1-archive-meta";
    p.textContent = `${a.filename} · ${new Date(a.ts).toLocaleString()}`;
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = "Download";
    b.addEventListener("click", () => downloadText(a.filename, a.text));
    box.appendChild(p);
    box.appendChild(b);
  }

  function parseCodesFromText(text) {
    const codes = [];
    const re = /\[([A-Z0-9_]+)\]/g;
    let m;
    while ((m = re.exec(text)) !== null) codes.push(m[1]);
    return Array.from(new Set(codes));
  }

  function computeDeviationPct(a, b) {
    // Simple token-based similarity
    const ta = a.split(/\s+/).filter(Boolean);
    const tb = b.split(/\s+/).filter(Boolean);
    const setA = new Set(ta.map(x=>x.toLowerCase()));
    const setB = new Set(tb.map(x=>x.toLowerCase()));
    let inter = 0;
    setA.forEach(x => { if (setB.has(x)) inter++; });
    const union = new Set([...setA, ...setB]).size || 1;
    const jacc = inter / union;
    const dev = (1 - jacc) * 100;
    return Math.max(0, Math.min(100, dev));
  }

  function trafficFor(pct) {
    // thresholds: <=45 green, 46-50 yellow, >50 red
    if (pct <= 45) return "green";
    if (pct <= 50) return "yellow";
    return "red";
  }

  function renderMirror(affected, data) {
    const wrap = $("r1-mirror-list");
    if (!wrap) return;
    wrap.innerHTML = "";
    if (!affected.length) {
      wrap.textContent = "No affected elements detected.";
      return;
    }
    // Build lookup code->(moduleTitle, label)
    const sel = loadSelections();
    const all = [];
    Object.keys(sel).forEach(mid => (sel[mid] || []).forEach(x => all.push(x)));
    const byCode = {};
    all.forEach(x => byCode[x.code] = x);

    affected.forEach(code => {
      const x = byCode[code];
      const modTitle = x?.moduleTitle || "Framework";
      const label = x?.label || code;

      const card = document.createElement("div");
      card.className = "r1-mirror-item";
      const h = document.createElement("div");
      h.className = "r1-mirror-head";
      h.textContent = `${modTitle} · ${label}`;
      const pp = document.createElement("div");
      pp.className = "r1-mirror-para";
      pp.textContent = paraphraseFor(modTitle, label);
      const codeLine = document.createElement("div");
      codeLine.className = "r1-mirror-code";
      codeLine.textContent = `Code: ${code}`;
      const sh = document.createElement("div");
      sh.className = "r1-mirror-src";
      sh.textContent = sourceHintFor(code, modTitle);
      card.appendChild(h);
      card.appendChild(pp);
      card.appendChild(codeLine);
      card.appendChild(sh);
      wrap.appendChild(card);
    });
    }

  function buildMirrorReport(affected) {
        const sel = loadSelections();
        const all = [];
        Object.keys(sel).forEach(mid => (sel[mid] || []).forEach(x => all.push(x)));
        const byCode = {};
        all.forEach(x => byCode[x.code] = x);

        const lg = resolveFrameworkLang();
        const now = new Date().toISOString();
        const head = (lg === "de")
          ? `EPTEC ROOM 1 — VERGLEICH (SPIEGEL)
Zeit: ${now}

Betroffene Unterpunkte (nur Abweichungen):
`
          : (lg === "es")
            ? `EPTEC ROOM 1 — COMPARACIÓN (ESPEJO)
Hora: ${now}

Subpuntos afectados (solo desviaciones):
`
            : `EPTEC ROOM 1 — COMPARE (MIRROR)
Time: ${now}

Affected subpoints (deviations only):
`;

        const lines = [head];
        affected.forEach(code => {
          const x = byCode[code];
          const modTitle = x?.moduleTitle || "Framework";
          const label = x?.label || code;
          lines.push(`- ${modTitle} · ${label}`);
          lines.push(`  Code: ${code}`);
          lines.push(`  ${sourceHintFor(code, modTitle)}`);
          lines.push("");
        });
        return lines.join("\n");
      }

      function wireMirrorDownload(getAffected) {
        const btn = $("r1-mirror-download");
        if (!btn) return;
        btn.addEventListener("click", () => {
          const affected = (typeof getAffected === "function") ? (getAffected() || []) : [];
          if (!affected.length) {
            flashStatus("Mirror: nothing to download.", "warn");
            return;
          }
          const text = buildMirrorReport(affected);
          const filename = `EPTEC_R1_COMPARE_MIRROR_${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.txt`;
          downloadText(filename, text);
          flashStatus("Mirror report downloaded.", "ok");
        });
      }

  function wireCompare() {
    const run = $("r1-compare-run");
    if (!run) return;
    run.addEventListener("click", async () => {
      const fwFile = $("r1-compare-fw")?.files?.[0];
      const ctFile = $("r1-compare-ct")?.files?.[0];
      const pctEl = $("r1-compare-pct");
      const lightEl = $("r1-compare-light");
      if (!fwFile || !ctFile) {
        flashStatus("Compare: please upload framework + contract.", "warn");
        return;
      }
      const fwText = await fwFile.text();
      const ctText = await ctFile.text();
      const pct = computeDeviationPct(fwText, ctText);
      const t = trafficFor(pct);
      if (pctEl) pctEl.textContent = `${pct.toFixed(1)}%`;
      if (lightEl) {
        lightEl.classList.remove("green","yellow","red");
        lightEl.classList.add(t);
        lightEl.textContent = t === "green" ? "GREEN" : t === "yellow" ? "YELLOW · ATTENTION" : "RED";
      }

      // affected elements: only those codes present in framework text but missing in contract text
      const codes = parseCodesFromText(fwText);
      const affected = codes.filter(c => !ctText.includes(c));
      LAST_AFFECTED = affected.slice();
      renderMirror(affected, null);

      // open mirror automatically for yellow/red
      setModal("r1-mirror-modal", t !== "green");
      flashStatus(`Compare complete: ${t.toUpperCase()} (${pct.toFixed(1)}%).`, t === "green" ? "ok" : t === "yellow" ? "warn" : "bad");
    });
  }

  function wireRoom1Nav() {
    wireMirrorDownload(() => LAST_AFFECTED);

    $("r1-btn-framework")?.addEventListener("click", () => (window.EPTEC_CONSENT_GATES?.room1MethodGate ? window.EPTEC_CONSENT_GATES.room1MethodGate(() => setModal("r1-framework-modal", true)) : setModal("r1-framework-modal", true)));
    $("r1-framework-close")?.addEventListener("click", () => setModal("r1-framework-modal", false));

    $("r1-btn-workbench")?.addEventListener("click", () => { setModal("r1-workbench-modal", true); updateWorkbench(); updateWorkbenchStatus(); });
    $("r1-workbench-close")?.addEventListener("click", () => setModal("r1-workbench-modal", false));

    $("r1-btn-archive")?.addEventListener("click", () => { renderArchive(); setModal("r1-archive-modal", true); });
    $("r1-archive-close")?.addEventListener("click", () => setModal("r1-archive-modal", false));

    $("r1-btn-compare")?.addEventListener("click", () => (window.EPTEC_CONSENT_GATES?.room1MethodGate ? window.EPTEC_CONSENT_GATES.room1MethodGate(() => setModal("r1-compare-modal", true)) : setModal("r1-compare-modal", true)));
    $("r1-compare-close")?.addEventListener("click", () => setModal("r1-compare-modal", false));

    $("r1-btn-mirror")?.addEventListener("click", () => {
    renderMirror(LAST_AFFECTED || [], null);
    setModal("r1-mirror-modal", true);
    });
    $("r1-mirror-close")?.addEventListener("click", () => setModal("r1-mirror-modal", false));
  }

  async function init() {
    // Only run when room1 exists
    if (!$("room-1-view")) return;
    
    ensureTempDownloadFallback();
    ensureRoom1Buttons();
    wireRoom1Nav();
    wireWorkbench();
    wireCompare();

    try {
      const tbl = await loadRoom1Table();
      ROOM1_TABLE = Object.create(null);
      (tbl.items || []).forEach(it => {
        const k = String(it.module || "").trim();
        if (!k) return;
        ROOM1_TABLE[k] = { label: it.module_label || it.label || k, unit: it.standard_unit || it.unit || "" };
      });

      const data = await loadFramework();
      renderFrameworkList(data);
    } catch (e) {
      console.error("[R1]", e);
      flashStatus("Framework data missing. Please ensure locales/framework_room1_en.json exists.", "bad");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

/*
Adding Roles & Access Content Below (archived notes)

Rollen & Zugriff (finale Fassung)

1. Admin (du)
- Alle Dienste
- Premium immer aktiv
- Demo global an/aus
- VIP-Codes generieren & deaktivieren
- Einzige Kamera-/Aufzeichnungsberechtigung
- Konkrete Ausführung:
  - Admin generiert und speichert VIP-Passwort.
  - Admin schaltet Demo an/aus.
  - Admin kann VIP-Codes aktivieren oder deaktivieren.

2. VIP
- Vollzugang (beide Räume, Orb, Premium)
- Keine Paywall
- Jederzeit widerrufbar
- Keine Kamera
- Konkrete Ausführung:
  - VIP hat Zugang zu allen Räumen, Orb, Premium-Inhalten.
  - VIP kann jederzeit widerrufen werden.

3. Demo
- Alles sehen
- Keine Funktionen
- Keine Frameworks öffnen/erstellen
- Keine Vergleiche, keine Evidence
- Orb/Raumwechsel nur als Navigation
- Konkrete Ausführung:
  - Demo-Nutzer kann alle Inhalte sehen, jedoch keine Funktionen ausführen.
  - Demo-Nutzer kann keine Frameworks oder Vergleichsfunktionen verwenden.

4. Normaler User
- Gemäß Paywall/Tarif
- Konkrete Ausführung:
  - Normaler User hat Zugang basierend auf dem gewählten Tarif und der Paywall.
*/
