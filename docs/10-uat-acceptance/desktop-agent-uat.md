# Desktop Agent — UAT & Acceptance Criteria

> Source feature IDs in `docs/02-business-product/desktop-agent-feature-catalog.md`. Stream 50 (QA master) re-executes every Gherkin scenario. Stories grouped by stream.

## How To Use This Doc

- Each story has: feature-ID link, persona, story sentence, Gherkin (happy + error + per-OS variant where OS-specific), 30-second demo script, fixtures, DB-change expectations.
- During UAT: walk every demo with a non-technical client.
- During regression: re-execute every Gherkin.

## Test Fixtures (shared)

- `fixtures/sample-files/text/qa-sample.txt` — short text
- `fixtures/sample-files/csv/qa-data.csv` — 100 rows
- `fixtures/sample-files/pdf/qa-doc.pdf` — multi-page
- `fixtures/sample-files/image/qa-screen.png` — known content
- `fixtures/sample-files/audio/qa-30s.wav` — 30s English speech
- `fixtures/sample-files/large/qa-large.bin` — 10MB
- `fixtures/sample-screens/dashboard-en.png` — known dashboard text
- `fixtures/sample-screens/dashboard-ar.png` — RTL Arabic content
- `fixtures/sample-policies.json` — 20 default desktop AccessPolicy seeds
- `fixtures/sample-recipes/file-organise.yaml`
- `fixtures/sample-recipes/screenshot-summarise.yaml`
- `fixtures/sample-recipes/transcribe-meeting.yaml`
- `fixtures/sample-marketplace/benign-001.json`
- `fixtures/sample-marketplace/evil-001-rm-rf.json`
- `fixtures/sample-marketplace/evil-002-kill-pid-1.json`
- `fixtures/sample-marketplace/evil-003-banking-fill.json`
- `fixtures/sample-marketplace/evil-004-screen-1password.json`
- `fixtures/sample-marketplace/evil-005-clipboard-exfil.json`
- `fixtures/sample-marketplace/evil-006-time-bomb.json`
- `fixtures/sample-marketplace/evil-007-tampered-sig.json`

Lives in `agent-cli/test/fixtures/` (CLI) and `apps/claw-agent-service/src/__tests__/fixtures/` (backend).

---

## Stories

### Stream 10 — Capability Framework + Approval Engine

#### Story 10.1 — Default-strict capability requires approval (F-CAP-01)
**As an** IC engineer with a freshly paired device
**I want** every new capability invocation to require explicit approval by default
**So that** I trust the system before I relax controls

**Gherkin happy:**
Given a fresh install seeded with the default AccessPolicies
When the agent CLI proposes a CapabilityInvocation `class=FILESYSTEM op=DELETE target=~/Documents/test.txt blastRadius=SINGLE_RESOURCE reversibility=COMPENSATABLE`
Then the row is persisted with `status=PENDING_APPROVAL` matched policy `catch-all-fs-pending`
And no execution event fires until the user clicks Approve

**Gherkin error:**
Given a CapabilityInvocation with `targetDescriptor.path="/etc/passwd"`
When the agent CLI proposes it
Then status is `DENIED` matched policy `deny-fs-system-paths`
And no execution event fires
And an audit row records `entityType=capability_invocation action=DENIED`

**Demo (≤30s):**
1. (5s) Open `/agent` dashboard
2. (5s) Trigger fs.delete on a test file
3. (10s) See PENDING card with risk badge + reversibility chip
4. (5s) Click Approve → executed badge appears
5. (5s) Open lineage view → see policy match + audit row

**Fixtures:** sample-policies.json, sample-files/text/qa-sample.txt
**DB changes:** insert into CapabilityInvocation (status=PENDING_APPROVAL → APPROVED → EXECUTING → EXECUTED), parallel TerminalCommand row if dual-write enabled

#### Story 10.2 — LOW + AUTO_APPROVE policy auto-executes (F-CAP-02)
Given a CapabilityInvocation `class=FILESYSTEM op=LIST target=~/Documents`
When proposed
Then `status=AUTO_APPROVED` immediately, EXECUTING within 2s, EXECUTED with directory contents in result
And no human action required

#### Story 10.3 — DENY policy rejects at draft time (F-CAP-03)
Given a CapabilityInvocation `class=PROCESS op=KILL target.pid=1`
When proposed
Then `status=DENIED` matched policy `deny-process-kill-pid-1`

#### Story 10.4 — Capability lineage view (F-CAP-04)
Given an executed capability invocation
When the user opens `/agent/activity/<id>`
Then they see the chain: recipe (if any) → capability descriptor → policy match → approver → execution result → audit log row → rollback status

#### Story 10.5 — Cancel during EXECUTING (F-CAP-05)
Given a long-running capability `status=EXECUTING`
When the user clicks Cancel
Then `status=CANCELLED`, `agent.capability.cancelled` event published
And CLI runtime aborts execution

#### Story 10.6 — Rollback REVERSIBLE invocation (F-CAP-06)
Given an EXECUTED invocation with `reversibility=COMPENSATABLE` and a recorded `undoPlan`
When the user clicks Rollback
Then the undoPlan steps execute in reverse
And `status=ROLLED_BACK`
Or `status=ROLLBACK_FAILED` with an `executionError` if any step's undo fails

### Stream 11 — Filesystem (8 stories — F-FS-01 through F-FS-12)

Story 11.1 — read user-doc file auto-approves; system path DENIED (F-FS-01)
Story 11.2 — write produces undo plan; rollback restores byte-for-byte (F-FS-02)
Story 11.3 — delete defaults to OS trash; permanent delete always pending (F-FS-05, F-FS-06)
Story 11.4 — symlink escape blocked after canonical resolve (F-FS-01)
Story 11.5 — large list capped at 10000 entries (F-FS-08)
Story 11.6 — search-content cap at 1000 matches (F-FS-11)
Story 11.7 — diff returns unified diff trimmed to 5000 lines (F-FS-12)
Story 11.8 — watch streams events via SSE (F-FS-10)

### Stream 12 — Process (5 stories)

Story 12.1 — list-running auto-approved (F-PROC-02)
Story 12.2 — kill PID 1 always DENIED (F-PROC-03)
Story 12.3 — kill of agent-spawned PID succeeds with grace period (F-PROC-03, F-PROC-01)
Story 12.4 — PID race: PID owner changes between propose and execute → FAILED with PID_MISMATCH (F-PROC-03)
Story 12.5 — tail-output streams via SSE (F-PROC-06)

### Stream 13 — Recipes (8 stories)

Story 13.1 — Save valid recipe via library UI (F-REC-02)
Story 13.2 — Bad DSL rejected with line/path of error (F-REC-01)
Story 13.3 — Dry-run returns per-step expected policy match (F-REC-12)
Story 13.4 — Run executes steps via capability framework (F-REC-09)
Story 13.5 — Expression-injection rejected at parse time (F-REC-01)
Story 13.6 — Rollback chain reverses completed steps (F-REC-10)
Story 13.7 — ScheduledCommand pointing at recipe fires on cron (F-REC-04)
Story 13.8 — Parameters dialog prompts and substitutes (F-REC-03)

### Stream 20 — Browser (7 stories)

Story 20.1 — open allowed domain succeeds; banking domain DENIED (F-BR-01)
Story 20.2 — fill requires action-preview screenshot (F-BR-04)
Story 20.3 — session-save + restore round trip (F-BR-14)
Story 20.4 — cookie-read redacts session token by default (F-BR-12)
Story 20.5 — intercept without BROWSER_INTERCEPT scope → 403 (F-BR-11)
Story 20.6 — download to allow-globbed dir succeeds; outside → DENIED (F-BR-09)
Story 20.7 — extract-text auto-approves on http(s) URLs (F-BR-07)

### Stream 21 — Screen + OCR (6 stories)

Story 21.1 — capture-full + 60s blob retention then 404 (F-SCR-01)
Story 21.2 — capture-window of 1Password DENIED (F-SCR-03)
Story 21.3 — OCR returns text via local Ollama vision (F-SCR-04)
Story 21.4 — Tesseract fallback when vision model absent (F-SCR-04)
Story 21.5 — macOS missing permission → 412 PERMISSION_REQUIRED (F-SCR-01, mac-only)
Story 21.6 — record-video respects 60s cap (F-SCR-07)

### Stream 22 — Clipboard + Notifications (4 stories)

Story 22.1 — write + read round trip (F-CB-01, F-CB-02)
Story 22.2 — secret pattern in clipboard → redacted on read (F-CB-01)
Story 22.3 — history capped at 50 entries (F-CB-05)
Story 22.4 — toast fires OS-native (F-NOTIF-01, cross-OS)

### Stream 23 — Application (5 stories)

Story 23.1 — list-running auto-approved (F-APP-04)
Story 23.2 — send-keystroke without windowTitleRegex DENIED (F-APP-06)
Story 23.3 — keystroke to Terminal title DENIED (F-APP-06)
Story 23.4 — focus-lost during stability check → FAILED FOCUS_LOST (F-APP-06)
Story 23.5 — macOS Accessibility permission flow → 412 (F-APP-06, mac-only)

### Stream 24 — Audio (4 stories)

Story 24.1 — transcribe-file returns text within 5s (F-AUD-01)
Story 24.2 — transcribe-mic always pending (never AUTO) (F-AUD-02)
Story 24.3 — synthesise returns playable WAV ≤2s (F-AUD-03)
Story 24.4 — record cap auto-stops at AUDIO_RECORD_MAX_SECONDS (F-AUD-05)

### Stream 30 — Tray + Hotkeys + Palette (5 stories)

Story 30.1 — installer adds tray icon + autostart (F-TRAY-01)
Story 30.2 — tray status reflects pending count (F-TRAY-01)
Story 30.3 — global hotkey opens centered palette (F-PAL-01, F-PAL-02)
Story 30.4 — palette fuzzy search across recipes + capabilities (F-PAL-02)
Story 30.5 — hotkey conflict → settings link surfaces (F-PAL-01)

### Stream 31 — Activity Dashboard (3 stories)

Story 31.1 — timeline returns last 50 events (F-ACT-01)
Story 31.2 — filters apply purely (F-ACT-02)
Story 31.3 — JSONL export caps at 10000 with refine-filter hint (F-AUDIT-01)

### Stream 32 — Approval Queue Extensions (3 stories)

Story 32.1 — fs.write card shows diff preview (F-PREV-01)
Story 32.2 — browser.fill card shows action preview screenshot with arrow overlay (F-PREV-02)
Story 32.3 — Approve button disabled until preview loads (F-PREV-01..07)

### Stream 40 — Multi-Device Fleet Admin (5 stories)

Story 40.1 — admin sees all org devices (F-FLEET-01)
Story 40.2 — fleet policy push propagates to 95% online devices ≤60s (F-FLEET-02)
Story 40.3 — min-version enforcement degrades out-of-date device (F-FLEET-03)
Story 40.4 — M-of-N approval chain — single signature insufficient (F-FLEET-05)
Story 40.5 — SAML mock IdP round-trip + auto-provision (F-FLEET-08)

### Stream 41 — Activity Memory + Suggestions (4 stories)

Story 41.1 — local SQLite created encrypted (F-MEM-01)
Story 41.2 — capability invocation triggers activity row (F-MEM-01)
Story 41.3 — pattern detection generates suggestion after N≥3 occurrences (F-SUGG-01, F-SUGG-02)
Story 41.4 — cloud sync OFF by default (verifiable via tcpdump) (F-SUGG-03)

### Stream 42 — Marketplace (6 stories — incl. 3 adversarial)

Story 42.1 — publish + install benign recipe round trip (F-MARKET-01..03)
Story 42.2 — flag + auto-ban after 5 valid flags (F-MARKET-06)
Story 42.3 — monthly rescan flags newly-banned pattern (F-MARKET-08)

**Adversarial:**
Story 42.A1 — rm-rf root recipe blocked at static analysis (publish + install both reject) (F-MARKET-02)
Story 42.A2 — kill PID<100 recipe blocked
Story 42.A3 — tampered signature blocked at install
Story 42.A4 — clipboard→network exfil chain blocked
Story 42.A5 — time-bombed payload caught by monthly rescan
Story 42.A6 — typosquatting publisher name flagged + admin notified

**Demo (adversarial 42.A1):**
1. Open marketplace
2. Try install evil-001-rm-rf
3. See red block dialog with deny-pattern reason
4. Open audit log → confirm `MARKETPLACE_INSTALL_BLOCKED` row with publisher key

---

## Cross-cutting acceptance

- AC-X-01: Every story works in dark mode (no invisible text)
- AC-X-02: Every story works in Arabic locale (RTL mirrored)
- AC-X-03: Every story works at 375×812 viewport
- AC-X-04: Every story has its capability lineage row in audit
- AC-X-05: Every irreversible capability has a confirmation modal AND records `metadata.undoPlan` (or `metadata.noUndoReason="reason"` if irreversible)

---

## Story count

- Stream 10: 6
- Stream 11: 8
- Stream 12: 5
- Stream 13: 8
- Stream 20: 7
- Stream 21: 6
- Stream 22: 4
- Stream 23: 5
- Stream 24: 4
- Stream 30: 5
- Stream 31: 3
- Stream 32: 3
- Stream 40: 5
- Stream 41: 4
- Stream 42: 6 (incl. 3-6 adversarial)

**Total ~79 user stories** — over the 60-story target.
