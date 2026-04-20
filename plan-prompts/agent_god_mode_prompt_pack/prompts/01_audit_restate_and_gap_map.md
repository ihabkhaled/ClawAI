# 01 — Audit Restatement and Gap Map Prompt

Use the uploaded ClawAI Desktop Agent audit as your factual baseline.

First, restate the current system in a structured way:
- CLI current commands
- auth flow today
- token storage today
- agent-service models/endpoints today
- frontend surfaces today
- infra/nginx limitations today
- dead code / duplication today
- product dead ends today

Then build a **gap map** with these columns:
- capability area
- current state
- why it hurts users
- why it hurts the business
- security/ops risk
- target state
- urgency (P0 / P1 / P2)
- dependency blockers

Make sure you explicitly include:
- copy-paste JWT auth pain
- plain-text local token storage
- 120-second stale-session expiry behavior
- no refresh endpoint
- lack of webapp connect UX
- no device model
- no revocation safety
- no streaming, timeout, cancel
- no daemon/service mode
- no command templates / scheduling
- no file transfer / git-native / browser-native powers
- no strong team/admin/device management
- no real testing depth

The output must be a **decision-grade diagnostic**, not recommendations only.
