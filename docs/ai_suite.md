# EPTEC — AI Suite (Optional)

This build prepares **multiple AI features** that can be enabled/disabled independently (Admin toggles).

## Configure
Edit `eptec_config.json`:

- `ai.enabled`: global on/off
- `ai.endpoint`: default endpoint for all services
- `ai.services.<service>.enabled`: default enabled flags
- `ai.services.<service>.endpoint`: optional per-service endpoint override
- `ai.apiKey`: optional Bearer token (prefer server-side auth)

### Services
- `contractboy` — FAQ / site questions (Start screen widget)
- `room1_assist` — co-create help for Framework making (Room 1 widget)
- `room2_reminder` — reminder bot (Room 2 widget)
- `room2_chat` — room chat helper (Room 2 widget)

## Admin toggles
Press **Ctrl+Alt+A** (or call `window.EPTEC_AI_ADMIN.open()`) to toggle services.
Toggles are stored in `localStorage["EPTEC_AI_TOGGLES"]`.

## Privacy / Safety
The frontend sends **only stub payloads** by default. Decide server-side what you accept.
No content is automatically sent.
