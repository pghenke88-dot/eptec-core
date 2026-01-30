# EPTEC Owner Map (Phase 0)

This map documents **clear ownership** for state, intent capture, logic, rendering, and side effects. It is scoped to the current repo layout and **does not rename IDs, classes, or i18n keys**.

| File | Zuständigkeit (Owner) | Schreibt State-Felder | Liest State-Felder | Erlaubte Side-Effects |
| --- | --- | --- | --- | --- |
| `scripts/ui_state.js` | **State-Owner** (Source-of-Truth Store). Normalisiert `view/scene/transition/modal/i18n` und stellt `get/set/subscribe` bereit. | `view`, `scene`, `modal`, `legalKey`, `i18n.lang`, `i18n.dir`, `lang` (legacy mirror), `transition`, `modes` | liest `localStorage` für `EPTEC_LANG` | `localStorage` read/write für Sprache; sonst **keine** DOM/Audio-Effects. |
| `scripts/logic.js` | **Logic/Rules Owner** (Dramaturgie, Guards, Language, Permissions). Orchestriert Flows über Kernel-APIs. | setzt `EPTEC_UI_STATE` z.B. `view/scene/transition/modal/i18n/lang` via `set` | liest `EPTEC_UI_STATE`, `document.lang` | darf `document.lang/dir` setzen, `localStorage` persistieren, Locale-JSON laden (mit warn+fallback). Keine DOM-UI bauen. |
| `scripts/ui_controller.js` | **Intent Dispatcher** (UI → Logic). Keine Business-Logik. | **keine** direkte State-Write (nur Delegation). | liest DOM, DVO Trigger, optional `EPTEC_UI_STATE` indirekt | UI-Feedback Audio (`SoundEngine.uiConfirm`), Event-Dispatch (capture). |
| `scripts/ui_capture_intent.js` | **Intent Capture (Camera/Screen)**. Schreibt nur Intent in State. | `camera.mode`, `camera.requested`, `camera.updatedAt` | liest `EPTEC_UI_STATE` | Optional UI confirm sound; **keine** Media-Start-Aufrufe. |
| `scripts/main.js` | **Renderer/DOM Safety** (Modals/Labels/Placeholders). State-first DOM-Sync. | `modal`, `legalKey` (fallback safety) | `EPTEC_UI_STATE` (`view`, `modal`, `i18n.lang`) | DOM show/hide von Modals, placeholder updates. Keine Audio/Logic. |
| `scripts/registration_engine.js` | **Register/Forgot Modal Owner** (Form-Validation & Modal Open/Close). | `modal` (register/forgot/null) | `EPTEC_UI_STATE` (`i18n.lang`) | DOM show/hide modals; form validation feedback; warn on backend errors. |
| `scripts/room1_framework_builder.js` | **Room1 Modal Owner** (Framework/Workbench/Archive/Compare/Mirror). | `modal` (Room1 modals) | `EPTEC_UI_STATE` (`i18n.lang`) | DOM show/hide modals, fetch locale JSON for Room1. |
| `scripts/room2_controlling.js` | **Room2 Modal Owner** (Slot/Evidence/Plant/Traffic/Preview). | `modal` (Room2 modals) | `EPTEC_UI_STATE` (`i18n.lang`) | DOM show/hide modals, fetch locale JSON for Room2. |
| `scripts/media_executor.js` | **Media Side-Effects Owner** (Audio/Media reacting to State). | none | `EPTEC_UI_STATE` (`scene/view/transition`) | Play/stop audio/media based on state; audio unlock allowed on user gesture. |
| `scripts/transparency_ui.js` | **Legal/Transparency UI Owner** (Modal show/hide + badge). | `modal` (legal) | `EPTEC_UI_STATE` (`modal`) | DOM show/hide legal modal only (no other UI). |
| `scripts/language_engine.js` | **Legacy Translation Loader** (asset/lang/*.json). | internal cache only | `TranslationEngine.currentLang` | fetch translations with error logging; no state write. |
| `scripts/state_manager.js` | **Logic ↔ UI bridge** (sync helper). | can call `EPTEC_UI_STATE.set` | reads `EPTEC_UI_STATE` | logging + state sync only. |

## Notes
- **EPTEC_UI_STATE** is the canonical store for `scene/view/transition/modal/i18n`. All writers must go through `.set`.
- UI should only capture **intent** (click/input) and hand off to Logic/State. Renderers react to state changes.
- Side effects (audio/media, network fetch) should occur in **dedicated owners** that respond to state changes.
