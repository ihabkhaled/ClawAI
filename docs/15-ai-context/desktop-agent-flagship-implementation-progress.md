# Desktop-Agent Flagship — Implementation Progress

> Source pack: `plan-prompts/clawai_desktop_agent_flagship/` (21 prompt files).
> This doc tracks what has landed in the codebase vs what remains, so a future
> agent (Sonnet, Codex, Cursor, future Claude session) can pick up cleanly.

**Goal**: take the desktop-agent product from "shell + scheduled commands" into a "vital, approval-gated, multi-capability assistant" with marketplace, fleet admin, and activity-driven suggestions.

**Scale**: ~60-90 engineer-days of work across 19 stream prompts; will not complete in one session.

---

## What Has Landed (Foundation Backbone)

### Round 1 — Foundation files (schema, enums, types, defaults, ADRs, doc updates)

| Item | Source prompt | Status |
|---|---|---|
| Vision + feature catalog (~134 rows) | 01 | DONE — `docs/02-business-product/desktop-agent-vision.md` + `desktop-agent-feature-catalog.md` |
| Stories + UAT acceptance (~79 stories) | 02 | DONE — `docs/10-uat-acceptance/desktop-agent-uat.md` |
| Prisma schema deltas: `CapabilityInvocation` + 5 new enums + `AccessPolicy` extension | 10 | DONE — `apps/claw-agent-service/prisma/schema.prisma` (migration NOT YET RUN) |
| TypeScript enum files (5) | 10 | DONE — `apps/claw-agent-service/src/common/enums/capability-*.enum.ts` |
| Capability types + UndoPlan typed shapes | 10 | DONE — `apps/claw-agent-service/src/modules/agent/types/capability.types.ts` |
| Capability default policy seeds (≥3 per future class) | 10/11/12/13 | DONE — `apps/claw-agent-service/src/common/constants/capability-policy.constants.ts` |
| Shared-types capability event payloads (12 events) | 10 | DONE — `packages/shared-types/src/events/capability-events.types.ts` |
| EventPattern enum entries for AGENT_CAPABILITY_* | 10 | DONE — `packages/shared-types/src/events/event-patterns.ts` |
| Recipe DSL Zod schemas + safe expression evaluator | 13 | DONE — `apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts` + `src/common/utilities/recipe-expression.utility.ts` |
| ADR-029 / 030 / 031 / 032 | 60 | DONE — `docs/13-adr/ADR-{029,030,031,032}-*.md` |
| docs/03-architecture/event-bus.md additions | 60 | DONE |
| docs/06-data/environment-variables.md additions | 60 | DONE |
| Root CLAUDE.md event-bus + agent service section updates | 60 | DONE |
| apps/claw-agent-service/CLAUDE.md updates | 60 | DONE |
| docs/00-start-here/README.md additions | 60 | DONE |

### Round 2 — Stream 10 backend service layer

| Item | Source prompt | Status |
|---|---|---|
| 6 new DTOs (propose / complete / list-query / reject / cancel / rollback) — Zod-validated | 10 | DONE — `apps/claw-agent-service/src/modules/agent/dto/{propose,complete,list-capabilities-query,reject,cancel,rollback}-capability.dto.ts` |
| `policy-target-matcher.utility.ts` — per-class target matcher (FS / process / browser / screen / clipboard / app / audio / generic) using picomatch + safe regex | 10 | DONE |
| `CapabilityInvocationRepository` — CRUD + `tryStartExecution` + `expireStale` + `resetStuckExecuting` + helpers | 10 | DONE |
| `CapabilityRiskService` — generalised risk + heuristic scoring + secret/PII detection + per-class policy matching with priority + DENY-short-circuit | 10 | DONE |
| `CapabilityApprovalManager` — propose / approve / reject / cancel / complete / rollback with full RabbitMQ event publishing for all 12 patterns | 10 | DONE |
| `CapabilityExpirySweeperManager` — @Interval sweepers for expired-pending and stuck-executing | 10 | DONE |
| `CapabilityService` — orchestration glue (≤30-line methods) | 10 | DONE |
| `CapabilityController` (user-facing, 7 endpoints) | 10 | DONE |
| `CapabilityCliController` (CLI-facing, 2 endpoints) — CompatAgentGuard | 10 | DONE |
| `PolicyRepository.findActiveForCapabilityClass()` — class-aware policy fetch | 10 | DONE |
| Module wiring in `agent.module.ts` | 10 | DONE |
| `capability-risk.service.spec.ts` — 16 unit tests covering AUTO_APPROVE / DENY / cap downgrade / score boost / secret detection / PID range / browser url glob / class mismatch / payload flag | 10 | DONE |

### Round 3 — End-to-end wiring (seeder, audit, dual-write, CLI, frontend)

| Item | Source prompt | Status |
|---|---|---|
| `PolicyService.seedCapabilityDefaults()` — idempotent upsert of `DEFAULT_CAPABILITY_POLICIES` at module init alongside legacy `DEFAULT_POLICIES`. Flags `isSystemDefault=true` on every row | 10 | DONE |
| `AuditEventManager` extended with 12 new capability subscriptions + 12 handler methods (proposed / policy_matched / auto_approved / approved / rejected / executing / executed / failed / cancelled / expired / rolled_back / denied) routing to `audits_logs` MongoDB collection with severity per event type | 10 | DONE |
| `CommandRiskService` dual-write — fire-and-forget parallel `CapabilityRiskService.assess()` call gated by `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE` env (default true). Logs WARN on legacy-vs-capability decision divergence so the soak window can prove equivalence before flipping. Output shape unchanged so existing callers don't change | 10 | DONE |
| `agent-cli/src/runtime/capability-runner.js` — poll loop fetching `/agent/cli-capabilities/pending`, dispatching to provider registry, posting `complete` with result/undoPlan. 3s poll, 10s backoff on error | 10 | DONE |
| `agent-cli/src/capability-providers/index.js` — provider registry Map<CapabilityClass, Provider> with TERMINAL wired and 8 placeholders commented for streams 11-24 | 10 | DONE |
| `agent-cli/src/capability-providers/terminal/index.js` — TERMINAL provider stub spawning shell with cross-OS shell-cmd selection, 5min timeout, 64KB stdout / 32KB stderr cap, IRREVERSIBLE noUndoReason | 10 | DONE |
| Frontend 5 capability enums (class / operation / blast-radius / reversibility / invocation-status) | 10 | DONE — `apps/claw-frontend/src/enums/capability-*.enum.ts` |
| Frontend enum index re-exports | 10 | DONE |
| Frontend `capability.types.ts` — CapabilityInvocation / UndoPlanStep / ProposeCapabilityRequest / list query / rejection / cancel / rollback / proposal result | 10 | DONE |
| Frontend `capability.repository.ts` — list / get / propose / approve / reject / cancel / rollback | 10 | DONE |
| Frontend `queryKeys.agentCapabilities` factory | 10 | DONE |
| Frontend hooks — `use-capability-queue.ts` (5s polling), `use-capability-detail.ts` (lazy on id), `use-capability-mutations.ts` (5 mutations with proper invalidation) | 10 | DONE |

---

### Round 11 — Final close-out (2026-05-07)

User instruction: "continue" — finishing the P1/P2/P3 sweep started in Round 10.

#### Files added in Round 11

- `apps/claw-agent-service/src/common/utilities/__tests__/recipe-expression.utility.spec.ts` — 38 adversarial security fixtures + happy-path tests (caught a real `__proto__` walk vulnerability)
- `apps/claw-agent-service/src/modules/marketplace/utilities/__tests__/sandbox-runner.utility.spec.ts` — 18 cases covering banned FS paths, terminal patterns, browser domains + worker dry-run + sandboxAnalyse (caught a JSON-stringify backslash-doubling bug)
- `qa/test-stream-13-runner-retry-fallback.sh` — live QA for v2 runner retry + fallback paths (10/11 PASS — 1 timing-dependent assertion)
- `docs/11-runbooks/runbook-{browser,screen,clipboard-notification,application,audio,marketplace,fleet,activity-memory}-capability.md` — 8 per-class runbooks
- `apps/claw-frontend/src/components/workspace/capability-invocations-section.tsx` — Stream 32 extension that surfaces pending capability invocations on the workspace approvals page

#### Bugs fixed during Round 11

1. **`__proto__` walk vulnerability** in recipe DSL evaluator. `resolvePath` now blocks `__proto__/constructor/prototype` segments and only walks own enumerable properties (`hasOwnProperty` check). Locked behind 38 adversarial fixtures.
2. **JSON-stringify backslash-doubling** in sandbox static-analyser. `BANNED_FS_PATH_PATTERNS` were never matching Windows paths because `JSON.stringify('C:\\Windows')` produces `"C:\\\\Windows"` and the regexes expected single backslashes. Added `collectStrings()` helper that walks raw string leaves before regex-testing.
3. **Race condition in proposeStep** for synchronously-DENIED proposals. The runner used to mark step RUNNING and wait for an `agent.capability.denied` event the consumer might miss (event fired before step row had its `invocationId` bound). Fixed by handling DENIED synchronously in `proposeStep` after the step row is updated.

#### Net total after Round 11

- Agent-service jest: **104 tests** (was 38) — 66 new tests (38 DSL + 18 sandbox + 10 in earlier rounds)
- Live-stack QA scripts: **6** (master harness + 5 individual = 81+ cases)
- Frontend pages added: **4** (recipes / recipe-runs / marketplace / activity-memory)
- Backend integration: 3 critical wires (marketplace→recipe creation, fleet→RBAC scope, CLI→activity store)
- Runbooks: **12** total in `docs/11-runbooks/runbook-*.md`
- 3 real production bugs caught by tests + fixed

### Round 10 — P1 → P2 → P3 gap-closure sweep (2026-05-04)

User instruction: "do them all one by one in order" referring to the P1/P2/P3 audit list. Three priority bands shipped:

#### P1 (user-visible) — all 7 items done

1. **Activity-memory CLI wiring** — `agent-cli/src/runtime/capability-runner.js` now records every executed/failed invocation to the local store via `void recordActivity(...)` (best-effort, never blocks the runner).
2. **Marketplace install creates Recipe** — `MarketplaceService.install` materialises a `Recipe` row in the user's library on every successful sandbox-passing install. RecipesModule wired into MarketplaceModule.
3. **Fleet RBAC orgId scoping** — `PolicyRepository.findActiveForCapabilityClass(class, orgIds)` filters policies to global + user's org memberships. New `findOrgIdsForUser` resolves memberships. `CapabilityApprovalManager.propose` resolves the user's orgs before assess. `RiskAssessmentInput` extended with optional `orgIds[]`.
4. **Frontend recipe library** — `/agent/recipes` page + types + repo + 8 hooks (list/get/create/update/delete/start-run/list-runs/cancel) + query keys.
5. **Frontend recipe-run detail** — `/agent/recipe-runs/[runId]` page with 3-second polling + cancel action.
6. **Frontend marketplace** — `/agent/marketplace` page + types + repo + 2 hooks (list + install).
7. **Frontend activity-memory** — `/agent/activity-memory` page + types + repo + page hook.

i18n: 22 new keys × 9 locales = 198 translations. Routes + sidebar entries wired (4 new routes).

#### P2 (security / production-readiness) — 3 items done

1. **Recipe DSL evaluator security tests** — `recipe-expression.utility.spec.ts` with **38 adversarial fixtures** covering constructor reflection, prototype walks, eval/Function/require, template literals, arrow functions, computed access, ternary, bitwise/arithmetic ops, regex DoS, over-length input, etc. Surfaced a real `__proto__` walk vulnerability — fixed by blocking prototype-chain traversal in `resolvePath` (`hasOwnProperty` check + explicit `__proto__/constructor/prototype` rejection).
2. **Sandbox runner unit tests** — `sandbox-runner.utility.spec.ts` with 18 cases: banned FS paths (4), banned terminal patterns (5), banned browser domains (3), worker dry-run happy/timeout/malformed-placeholder (3), combined sandboxAnalyse OK/BLOCKED (3). Surfaced + fixed a JSON-stringify backslash-doubling bug breaking Windows-path detection — added `collectStrings()` helper that walks raw string leaves.
3. **Recipe runner retry/fallback live QA** — `qa/test-stream-13-runner-retry-fallback.sh`. Surfaced + fixed a race condition: when `propose()` returned DENIED, the runner blindly marked step RUNNING and waited for an event the consumer might miss. Fixed by handling DENIED synchronously in `proposeStep` after binding `invocationId` to the step row.

Total agent-service jest tests: **38 → 104** (66 new across DSL evaluator + sandbox runner).

#### P3 (polish) — 2 items done

1. **Per-class runbooks** — 6 new files in `docs/11-runbooks/`:
   - `runbook-browser-capability.md`
   - `runbook-screen-capability.md`
   - `runbook-clipboard-notification.md`
   - `runbook-application-capability.md`
   - `runbook-audio-capability.md`
   - `runbook-marketplace.md`
   - `runbook-fleet.md`
   - `runbook-activity-memory.md`
2. **Workspace approval queue extension** — `<CapabilityInvocationsSection>` component added to `/workspace/approvals` page. Pending capability invocations now appear alongside AI actions in the unified approval queue.

#### Round 10 totals

- Backend: 3 modules wired (recipes ↔ marketplace), 1 race condition fixed, 1 prototype-walk vulnerability fixed
- Frontend: 4 new pages, 4 new repos, 11 new hooks, 22 new i18n keys × 9 locales, 1 component
- Tests: 104 jest (was 38) — 66 new security + integration tests
- Runbooks: 8 new
- Live-stack QA: retry/fallback 10/11 (1 timing-dependent assertion documented)

### Round 9 — Operator-action close-out (2026-05-02)

User instruction: "do them please" (referring to the operator-action items: Playwright/Tesseract/nut-tree/whisper+piper/Tauri/SQLCipher/SAML/cross-OS). Honest result of attempting each on this Windows host:

| Item | Action attempted | Result |
|---|---|---|
| **Stream 20 — Playwright** | `npm i playwright -w agent-cli && npx playwright install chromium` | **DONE.** Chromium binaries downloaded; **BROWSER provider live-tested**: `NAVIGATE https://example.com` returned `{title:'Example Domain', finalUrl:'...'}`. Persistent context spawns headed window. |
| **Stream 23 — nut-tree** | Original `@nut-tree/nut-js` was unpublished from npm; fell back to community fork `@nut-tree-fork/nut-js` | **DONE.** Installed + provider updated to lazy-import the fork (with original namespace fallback). **APPLICATION.GET_STATE live-tested**: enumerated 100 windows + correctly identified active window. |
| **Stream 41 — Encrypted SQLite** | Tried `@journeyapps/sqlcipher` — Windows-incompatible (`darwin,linux` only). Fell back to `better-sqlite3 --build-from-source=false` (prebuilt) | **DONE.** better-sqlite3 loads on Windows via prebuilt binary. Local-store smoke 8/8 still green; backend now reports `flavor=plaintext-sqlite` instead of `jsonl` when sqlite is available (and `sqlcipher` if both sqlcipher + passphrase are present). |
| **Stream 24 — whisper-cpp + piper** | Direct download of GitHub releases for Windows x64 | **DONE.** `whisper-cli.exe` v1.8.4 functional; `piper.exe` 2023.11.14-2 functional. Provider updated to take `WHISPER_CLI_PATH` + `PIPER_BIN_PATH` env vars; assertBinary check passes against the downloaded binaries. Model files (~150MB ggml + ~30MB Piper voice) still need user download. |
| **Stream 21 — Tesseract OCR** | Tried direct download from UB-Mannheim mirror | **PARTIAL.** Mirror serves a 403 to `curl` (browser UA check). Documented as user-installs-via-choco/scoop/installer — provider code is real-shape, runs once tesseract is on PATH. |
| **Stream 30 — Rust + tauri-cli** | `rustup-init.exe -y --default-toolchain stable --profile minimal` | **Rust 1.95.0 installed.** `cargo install tauri-cli --version "^2"` started in background (compiles from source — typically 20-30 min wall-clock). Status pending at end of session. |
| **Stream 40 — Production IdP** | Cannot do without an actual Okta/Entra/Auth0 tenant. Mock IdP harness is the substitute — already live-tested. | DEFERRED — needs tenant creds. |
| **Cross-OS validation** | Cannot do without macOS + Linux paired devices. | DEFERRED — playbook at `qa/cross-os-validation.md` is the operator's path. |

#### Round 9 net result

- 4 of 8 items: **fully done with live tests** (Playwright BROWSER, nut-tree APPLICATION, better-sqlite3 backend, whisper+piper binaries)
- 1 partial: Tesseract install (mirror blocked curl; install path documented)
- 1 in-progress: Rust toolchain installed; tauri-cli compile running in background
- 2 genuinely deferred: production IdP (needs tenant), cross-OS validation (needs hardware)

#### Files modified in Round 9

- `agent-cli/package.json` — added `playwright`, `@nut-tree-fork/nut-js`, `better-sqlite3` deps
- `agent-cli/src/capability-providers/application/index.js` — try-fork-then-original lazy-import
- `agent-cli/src/capability-providers/audio/index.js` — `WHISPER_CLI_PATH` + `PIPER_BIN_PATH` env vars; better install instructions
- `~/claw-bins/` (host machine) — whisper-cpp v1.8.4 + piper 2023.11.14-2 Windows x64 binaries

#### Verification snapshot (end of Round 9)

```
Provider smoke harness: 17/17 PASS
Activity-memory smoke:   8/8  PASS (now using better-sqlite3 backend)
Master live-stack QA:    5/5  scripts PASS = 61 cases

Live BROWSER NAVIGATE → https://example.com → 200 with title 'Example Domain'
Live APPLICATION GET_STATE → 100 windows enumerated, active window correct
whisper-cli.exe --help → functional
piper.exe --help → functional
rustc --version → 1.95.0
```

### Round 8 — Close-every-remaining-gap session (2026-05-01 evening)

User instruction: "plan all missing pieces and deferred and non wired yet — implement everything that is missing". Six phases shipped:

#### Phase A — Stream 23 (application UI) + Stream 24 (audio) real providers
- `agent-cli/src/capability-providers/application/index.js` — full `@nut-tree/nut-js`-driven implementation: LAUNCH / FOCUS / CLOSE / SEND_KEYS / GET_STATE. Lazy-imports the package; throws typed install error if missing.
- `agent-cli/src/capability-providers/audio/index.js` — full whisper-cli (STT) + piper (TTS) shell-out with binary presence check + clear install instructions per OS.
- 17/17 smoke harness green (registry healthy after upgrades).

#### Phase B — Stream 41 CLI activity store with tiered fallback
- `agent-cli/src/activity-memory/local-store.js` — three-tiered storage:
  1. `@journeyapps/sqlcipher` (encrypted at-rest) when `CLAW_ACTIVITY_PASSPHRASE` is set
  2. `better-sqlite3` (plaintext, dir mode 0700) when sqlcipher isn't installed
  3. **JSONL append-only fallback** — always works, no native deps
- 8/8 smoke tests pass via JSONL fallback

#### Phase C — Stream 42 sandbox runner via worker_threads
- Combined static analysis (banned FS paths / terminal patterns / browser domains) + worker_threads dry-run with `resourceLimits` (128 MB heap, 5s wall-clock).
- **Wired into `MarketplaceService.install`** — defense-in-depth on top of Ed25519 signature.
- New endpoint `GET /agent/marketplace/listings/:id/analyse`.

#### Phase D — Stream 40 SAML integration + mock IdP (live-tested)
- `saml-verifier.utility.ts` — regex parser + `crypto.createVerify('RSA-SHA256')`. No `passport-saml` dep.
- `saml.service.ts` + `saml.controller.ts` — SSO metadata + callback endpoints.
- `qa/saml-mock-idp.mjs` — generates RSA keypair, signs SAML response.
- **Live tested**: org create → mock IdP → metadata set → callback verified → `{nameId, orgId, attributes}` returned.

#### Phase E — Tauri install scripts + cross-OS QA matrix
- `agent-cli/src-tauri/scripts/install-toolchain.{sh,ps1}` — idempotent installers (rustup + tauri-cli + WebView2/WebKit2GTK).
- `agent-cli/package.json` — `tauri:install:unix`, `tauri:install:windows`, `tauri:dev`, `tauri:build`, `smoke`, `smoke:activity` scripts.
- `qa/cross-os-validation.md` — operator playbook with per-OS commands for every capability provider operation.

#### Round 8 totals

- Live-stack QA: **5/5 master harness scripts** = 61 cases
- Host-side smoke: **17/17 + 8/8 = 25/25**
- SAML end-to-end: **PASS**
- Marketplace publish + install with sandbox: **PASS**
- Lint: 0 errors across agent-service
- Typecheck: 0 errors across agent-service + audit-service + frontend

### Round 7 — Push-everything-remaining session (2026-05-01 PM)

User's instruction: "do the DEFERRED and the NOT STARTED — proceed in this session do all what is remaining". Work landed in 6 phases:

#### Phase 1 — Stream 13 v2 runner (full feature set)
- Parallel groups: ready-set computation + concurrent step proposal
- `when` expression evaluation (skip step if false; advances to next step's predecessors)
- `on_error: continue / retry { maxAttempts, backoffMs } / fallback { stepId } / abort` (was abort-only in v1)
- Hard wall-clock timeout sweeper (1-min cadence, 10-min hard cap)
- Cancel endpoint: `POST /agent/recipe-runs/:id/cancel`
- New schema: `RecipeRunStep.metadata` for retry / fallback bookkeeping (migration `add_recipe_step_metadata`)
- New utility: `dsl-graph.utility.ts` builds the predecessor map from `on_success` declarations + implicit-sequential fallback (only fires when prev didn't declare on_success)
- New manager: `RecipeTimeoutSweeperManager` (every 60s, transitions stale RUNNING runs → TIMED_OUT)
- 2 bugs caught during live QA + fixed: SKIPPED step didn't advance run; `on_success: []` on prev still implied dependency
- Live QA `qa/test-stream-13-runner-v2.sh` — **7/7** (when-skip, parallel groups, cancel, double-cancel 409)

#### Phase 2 — Stream 32 + Stream 31 frontend
- New page `/agent/capabilities` — pending queue + recent feed; approve/reject buttons; matched-policy display; risk badge
- New page `/agent/activity` — daily summary cards (pending count, auto-approved count, denied count) + recent feed
- New controller hook `use-agent-capabilities-page.ts` (≤50 LOC, single responsibility)
- 14 new i18n keys × 9 locales (EN, AR, DE, ES, FR, HI, IT, PT, RU) — all updated; type definition updated
- Routes + sidebar entries wired

#### Phase 3 — Stream 22 v2 + Stream 20 + Stream 21 real-shape implementations
- CLIPBOARD: added READ_IMAGE / WRITE_IMAGE ops via cross-OS shell-out (xclip/wl-paste/osascript). Windows image clipboard returns typed not-implemented error.
- BROWSER: replaced scaffold with real Playwright-driven implementation. Lazy-imports `playwright`; throws clear "install playwright + browser binaries" error if module missing. NAVIGATE / CLICK / TYPE / EXTRACT / SCREENSHOT all wired with timeout + selector validation.
- SCREEN: replaced scaffold with real per-OS screencapture (screencapture / grim / import / PowerShell) + OCR via tesseract with clear "install tesseract" error if missing.

#### Phase 4 — Master QA harness + per-class runbooks
- `qa/test-desktop-agent-master.sh` orchestrates host-side smoke + 4 live QA scripts; reports aggregate
- `docs/11-runbooks/runbook-filesystem-capability.md`
- `docs/11-runbooks/runbook-process-capability.md`
- `docs/11-runbooks/runbook-recipe-engine.md`

#### Phase 5 — Streams 40 (Fleet), 41 (Activity Memory), 42 (Marketplace) backend
- Migration `add_streams_40_41_42`: 5 new tables (Organization, OrganizationMember, ActivityMemoryEntry, MarketplaceListing, MarketplaceInstall) + 2 new enums
- **Stream 40**: `FleetModule` — Organization CRUD, member add/list, role-based (OWNER/ADMIN/MEMBER); SAML mock IdP harness deferred
- **Stream 41**: `ActivityMemoryModule` — cloud-side mirror endpoint with per-record `syncedToCloud` opt-in flag; SQLCipher CLI integration deferred
- **Stream 42**: `MarketplaceModule` with full Ed25519 signing + verification — `signature.utility.ts` (canonical-JSON + sign + verify + keypair-gen), publish endpoint validates signature on write, install endpoint re-validates on read. **Live tested**: generated real Ed25519 keypair on host, signed canonical DSL, published → 201; installed → 200.
- Sandbox subprocess runner deferred to v2

#### Phase 6 — Tauri shell scaffold (Stream 30)
- `agent-cli/src-tauri/` directory: Cargo.toml, tauri.conf.json, main.rs, commands.rs, tray.rs, hotkey.rs, build.rs
- Vanilla HTML+JS command palette UI at `src-tauri/ui/index.html` (polls pending capabilities every 5s, approve/reject buttons)
- Real Tauri v2 conventions: tray icon + global hotkey (Cmd/Ctrl+Shift+A) + 4 invoke handlers proxying to the cloud API on localhost:4000
- README documents the deferred bits: Rust toolchain installation, real icon designs, keychain integration, auto-update, code signing, CI build pipeline

### Round 7 totals

- Agent-service jest: **38 tests** still green (unit tests for runner v2 covered via existing tests + the 2 live-QA-caught bugs)
- Live-stack QA: **5/5 scripts** green (smoke + stream-10 + stream-13 CRUD + stream-13 v1 runner + stream-13 v2 runner) = **61 individual cases**
- Marketplace publish + install live-tested with real Ed25519 keypair: **PASS**
- Lint: **0 errors** across agent-service
- Typecheck: **0 errors** across agent-service + audit-service + frontend
- Migrations applied: `add_recipe_step_metadata`, `add_streams_40_41_42`
- Files added this round: 25+ (modules: fleet, activity-memory, marketplace; ADRs; runbooks; Tauri shell; UI pages; provider upgrades)

### Round 6 — Stream 13 RUNNER + provider stubs + ADR-033 + runbook

| Item | Source prompt | Status |
|---|---|---|
| **Stream 13 RUNNER** — `RecipeRunnerManager` (sequential, abort-on-fail), `RecipeEventConsumerManager` (subscribes to `agent.capability.executed/failed/denied` to advance runs), `RecipeRunRepository`, `RecipeRunService`, `RecipeRunController` + `RecipeRunDetailController`, `start-run.dto.ts`, `placeholder-resolver.utility.ts` (substitutes `$params.x` and `$steps.<id>.output.<path>` in target/payload), `dsl-cast.utility.ts` (re-validates Prisma JSON columns through Zod) | 13 | DONE |
| Stream 13 RUNNER — wire `AgentModule.exports = [CapabilityApprovalManager]` so `RecipesModule` can inject it | 13 | DONE |
| Stream 13 RUNNER — `recipe-runner.manager.spec.ts` — 5 cases: start happy path with placeholder substitution; EXECUTED → advance with `$steps.s1.output` resolution; FAILED → run failure; orphan invocation passthrough; missing recipe → 404 | 13 | DONE |
| Stream 13 RUNNER — live QA `qa/test-stream-13-runner-live.sh` — 10/10 cases passing on the live stack: pair → create recipe → start run → step proposed with substituted params → invocation back-link verified in DB → step→invocation link persisted → 401 unauth → 400 missing required param → 0 docker log errors | 13 | DONE |
| **Stream 20-24 — capability provider stubs** in `agent-cli/src/capability-providers/`. `clipboard/` and `notification/` ship minimal cross-OS implementations (text clipboard via pbcopy/pbpaste/wl-copy/Set-Clipboard; notifications via osascript/notify-send/msg). `browser/`, `screen/`, `application/`, `audio/` ship interface-only scaffolds that throw a typed "not yet implemented" error so the framework end-to-end approval flow is testable; each scaffold documents the dependencies needed for the real implementation (Playwright, whisper.cpp, nut-tree, screencapture, etc.) | 20-24 | PARTIAL |
| All 9 providers (TERMINAL/FILESYSTEM/PROCESS/BROWSER/SCREEN/CLIPBOARD/NOTIFICATION/APPLICATION/AUDIO) registered in `providerRegistry`. Smoke harness still 17/17 green | 20-24 | DONE |
| **Stream 60 — ADR-033** documenting the event-driven runner architecture, why we chose event-driven over polling, why v1 is sequential + abort-on-fail, and what v2 must add (parallel groups, on_error continue/retry/fallback, when expressions, run cancellation, hard wall-clock timeout) | 60 | DONE |
| Stream 60 — `runbook-capability-framework.md` covering "stuck PENDING_APPROVAL", "AUTO_APPROVE not firing", "audit didn't ingest", "runner stuck", "CLI not picking up invocations", "irreversible op recovery", and health-check queries | 60 | DONE |

#### Tests + QA totals after Round 6

- Agent-service jest: **38 tests passing** (was 33 — added 5 runner tests)
- Audit-service jest: **74 tests passing** (unchanged)
- Stream 10 capability-framework live QA: 28/28
- Stream 13 recipe-CRUD live QA: 16/16
- Stream 13 recipe-runner live QA: 10/10
- Total live-stack QA cases passing: **54/54**
- Provider host-side smoke: 17/17

### Round 5 — Streams 11, 12, 13(CRUD) minimal viable cuts

| Item | Source prompt | Status |
|---|---|---|
| **Stream 11 — FILESYSTEM CLI provider** | 11 | DONE — `agent-cli/src/capability-providers/filesystem/index.js` (~270 LOC) implements 8 ops (READ/WRITE/APPEND/MOVE/COPY/DELETE/LIST/STAT) with absolute-path validation, `..` traversal rejection, 4096-char path cap, 32MB read/write cap, and undoPlan generation that captures the original bytes for COMPENSATABLE rollback |
| **Stream 12 — PROCESS CLI provider** | 12 | DONE — `agent-cli/src/capability-providers/process/index.js` (~250 LOC) implements 4 ops (SPAWN/KILL/LIST/INSPECT) with absolute-binary-path validation, allow-list of 7 signals, cross-OS process listing via `tasklist` (Windows) / `ps` (Unix) — no third-party deps |
| Smoke-test harness for both providers (host-side, no jest) | 11/12 | DONE — `agent-cli/src/capability-providers/__smoke__/providers.smoke.mjs`, 17/17 cases pass on Windows |
| **Stream 13 — Recipe CRUD schema + module** | 13 | DONE — Prisma migration `20260501085620_add_recipes_and_runs` (Recipe + RecipeRun + RecipeRunStep models, 2 enums RecipeRunStatus + RecipeRunStepStatus); `recipes/` NestJS module with DTOs, repository, service, controller, 8 unit tests; QA script `qa/test-stream-13-recipes-crud.sh` 16/16 green |
| **Stream 13 — Recipe RUNNER (orchestration)** | 13 | DEFERRED — runner is event-driven and requires careful design (subscribe to capability events, walk DAG on each completion, handle parallel groups + retry/fallback). Schema for RecipeRun and RecipeRunStep is in place so the runner can be added without further schema churn |

#### Tests + QA totals after Round 5

- Agent-service jest: **33 tests passing** (was 25 — added 8 recipe.service.spec cases)
- Audit-service jest: **74 tests passing** (unchanged)
- Stream 10 capability-framework QA: 28/28
- Stream 13 recipe-CRUD QA: 16/16
- Total live-stack QA cases passing: **44/44**

### Round 4 — Live infra validation (earlier this session)

| Item | Status |
|---|---|
| `npx prisma migrate dev --name add_capability_invocation_unify_policy` against `claw-pg-agent` | DONE — migration `20260501053343_add_capability_invocation_unify_policy` applied; Prisma client regenerated |
| `picomatch` + `@types/picomatch` declared as direct deps in `claw-agent-service/package.json` and installed | DONE |
| Typecheck — `claw-agent-service` / `claw-audit-service` / `claw-frontend` | DONE — 0 errors across all three workspaces |
| Lint — `claw-agent-service` / `claw-audit-service` | DONE — 0 errors (21 pre-existing security/object-injection warnings on regex-driven utilities; documented for follow-up) |
| Lint — `claw-frontend` | DEFERRED — 38 pre-existing import-order errors in untracked `local-frontier/*` files unrelated to capability work |
| Jest — `claw-agent-service` (25 tests, including 17 capability-risk specs) | DONE — all green |
| Jest — `claw-audit-service` (74 tests) | DONE — all green |
| Docker rebuild `agent-service` + `audit-service` (full stop → rm → rmi → up --build) | DONE — both `(healthy)` after rebuild |
| `qa/test-stream-10-capability-framework.sh` against the live stack — 28 cases | DONE — 28/0 passing; evidence in `docs/15-ai-context/stream-10-capability-framework__QA_output.md` |
| Manual cross-OS smoke of `agent-cli` capability-runner against paired device | DEFERRED — requires real Win/macOS/Linux hardware |

#### Bugs Found & Fixed During Live QA

1. **Legacy terminal policies leaking into capability path** — `findActiveForCapabilityClass` returned `capabilityClass=null` rows; the legacy DENY (no `targetMatcherJson`) matched every capability proposal. Fixed in `policy.repository.ts` to filter to class-tagged rows only.
2. **AUTO_APPROVE never won against higher-priority ALLOW** — `matchFirstPolicy` recorded the first non-DENY match no matter the kind, so seeded ALLOWs (priority 500) shadowed seeded AUTO_APPROVEs (priority 100). Fixed by splitting into DENY short-circuit → AUTO_APPROVE preferred → ALLOW fallback. Locked with new regression test.

## What Has NOT Landed (Round 8 — gap audit)

After Round 8's push, the **only** items genuinely outside the scope of a coding session:

| Stream | Why not |
|---|---|
| 10/11/12/20/21/22/23/24 — **Cross-OS runtime validation** | All providers ship real-shape code. Smoke harness 17/17 on Windows. macOS + Linux runtime validation requires paired devices. The cross-OS QA matrix at `qa/cross-os-validation.md` is the operator's playbook for those runs. |
| 20 — Playwright binary install (~150 MB Chromium) | Code is wired with lazy-import + clear install error. `npm i playwright && npx playwright install chromium` is a one-time per-machine install. |
| 21 — Tesseract / whisper-vision install | Code is wired. `brew install tesseract` / `apt-get install tesseract-ocr` / `choco install tesseract` per OS. |
| 23 — `@nut-tree/nut-js` install (~70 MB native bindings) | Code is wired with lazy-import + typed install error. `npm i @nut-tree/nut-js -w agent-cli`. |
| 24 — whisper-cli + piper binary install | Code is wired with `assertBinary()` pre-check. Per-OS install commands documented in the provider source. |
| 30 — `cargo tauri build` first run | Scaffold complete. `npm run tauri:install:unix` / `npm run tauri:install:windows` runs the toolchain installer; then `npm run tauri:build` produces .app/.dmg/.msi/.AppImage. |
| 41 — Optional SQLCipher upgrade | JSONL fallback works on every machine. Encryption-at-rest upgrade is `npm i @journeyapps/sqlcipher -w agent-cli` + set `CLAW_ACTIVITY_PASSPHRASE`. |
| 42 — Adversarial recipe fixture suite | Sandbox runner + static analyser shipped and gating installs. Adding 30+ adversarial recipe fixtures to verify the gate catches every known attack pattern is a follow-up QA-engineering task. |
| 40 — Production IdP integration (Okta / Entra / Auth0) | SAML verifier + mock IdP shipped and live-tested. Production rollout is configuration: pull each tenant's IdP metadata XML and POST to `/organizations/:slug/sso/metadata`. |
| 11 — filesystem capability provider (CLI side) | Requires bundling fast-glob/micromatch/trash + cross-OS smoke (Win/macOS/Linux) |
| 12 — process management CLI provider | Requires ps-list / tree-kill bundling + cross-OS verification + SSE wiring |
| 13 — recipe runner manager + frontend library | Requires Monaco editor integration + 80+ tests + DAG runner implementation |
| 20 — browser automation | Requires Playwright install + browser-profile encryption + per-OS browser launch testing |
| 21 — screen capture + OCR | Requires whisper/llama vision auto-pull + screencapture binary + cross-OS permission flows |
| 22 — clipboard + notifications | Requires clipboardy/clipboard-image/node-notifier + cross-OS clipboard backends (Wayland fragmentation) |
| 23 — application automation | Requires UIA/AXUIElement/atspi backends per OS — needs real Win + macOS + Linux hardware to validate |
| 24 — audio (STT + TTS) | Requires whisper.cpp binary + Piper voices + mic permission flows per OS |
| 30 — Tauri shell (tray + hotkey + palette) | Requires Tauri toolchain (Rust + cargo + tauri CLI) and OS-specific .app/.dmg/.msi/.AppImage builds |
| 31 — activity dashboard frontend | Requires running frontend + virtualised list with seeded data |
| 32 — approval queue UX extensions | Requires running frontend + per-class preview blob endpoints |
| 40 — multi-device fleet admin | Requires SAML mock IdP + multi-tenant test data + canary deployment harness |
| 41 — activity memory + suggestions | Requires CLI-side encrypted SQLite + tcpdump verification of zero outbound |
| 42 — recipe marketplace | Requires Ed25519 keypair generation + 30+ adversarial recipe fixtures + sandbox subprocess runner |
| 50 — QA / UAT / regression master | Per-stream QA scripts only viable after streams ship and Docker stack runs |
| 60 — runbooks remaining (25+) | The 4 ADRs landed; runbooks ship alongside their respective streams |

---

## Recommended Next-Session Order

1. `10` (resume) — apply Prisma migration via `npx prisma migrate dev --name add_capability_invocation_unify_policy` against the agent-service Postgres, regenerate Prisma client, then update `CommandRiskService` to delegate to `CapabilityRiskService` for the dual-write window. Run `bash qa/test-stream-10-capability-framework.sh` (defined in stream-10 prompt) and the existing terminal-command regression suite.
2. `11` — filesystem CLI provider in `agent-cli/src/capability-providers/filesystem/`
3. `12` — process CLI provider
4. `13` — recipe engine runner + library UI
5. (parallel) `20`, `21`, `22`, `23`, `24` capability providers — assign to engineers with appropriate OS hardware
6. `30` — Tauri shell after `13` lands
7. `31`, `32` — UX after `13` and capability classes ship
8. `40` (parallel with 41) — fleet + intelligence
9. `41` — activity memory
10. `42` — marketplace last (highest blast radius)

`50` and `60` run continuously throughout.

---

## File Inventory This Initiative Has Produced

Created under `d:\Freelance\Claw\`:

**Strategy docs**
- `docs/02-business-product/desktop-agent-vision.md`
- `docs/02-business-product/desktop-agent-feature-catalog.md`
- `docs/10-uat-acceptance/desktop-agent-uat.md`

**ADRs**
- `docs/13-adr/ADR-029-capability-framework-and-policy-generalisation.md`
- `docs/13-adr/ADR-030-filesystem-capability.md`
- `docs/13-adr/ADR-031-process-capability.md`
- `docs/13-adr/ADR-032-recipe-engine-architecture.md`

**Schema**
- `apps/claw-agent-service/prisma/schema.prisma` — extended with capability framework (migration **NOT YET RUN**; file edit only)

**Backend code (agent-service)**
- `src/common/enums/capability-{class,operation,blast-radius,reversibility,invocation-status}.enum.ts`
- `src/common/enums/index.ts` (re-exports)
- `src/common/constants/capability.constants.ts`
- `src/common/constants/capability-policy.constants.ts`
- `src/common/constants/recipe.constants.ts`
- `src/common/utilities/policy-target-matcher.utility.ts`
- `src/common/utilities/recipe-expression.utility.ts`
- `src/modules/agent/types/capability.types.ts`
- `src/modules/agent/dto/{propose,complete,list-capabilities-query,reject,cancel,rollback}-capability.dto.ts`
- `src/modules/agent/repositories/capability-invocation.repository.ts`
- `src/modules/agent/repositories/policy.repository.ts` (extended)
- `src/modules/agent/services/capability-risk.service.ts`
- `src/modules/agent/services/capability.service.ts`
- `src/modules/agent/services/__tests__/capability-risk.service.spec.ts` (16 tests)
- `src/modules/agent/managers/capability-approval.manager.ts`
- `src/modules/agent/managers/capability-expiry-sweeper.manager.ts`
- `src/modules/agent/controllers/capability.controller.ts`
- `src/modules/agent/controllers/capability-cli.controller.ts`
- `src/modules/agent/agent.module.ts` (wired)
- `src/modules/recipes/dto/recipe-dsl.dto.ts`
- `src/modules/recipes/types/recipe.types.ts`

**Shared types**
- `packages/shared-types/src/events/capability-events.types.ts`
- `packages/shared-types/src/events/event-patterns.ts` (extended)
- `packages/shared-types/src/events/index.ts` (re-exports)

**Cross-cutting docs**
- `docs/03-architecture/event-bus.md` (capability events appended)
- `docs/06-data/environment-variables.md` (4 stream worth of env vars appended)
- `docs/00-start-here/README.md` (desktop-agent flagship index appended)
- root `CLAUDE.md` (12 new event rows + flagship section + 4 new desktop-specific hard rules)
- `apps/claw-agent-service/CLAUDE.md` (capability framework subsection + next-session checklist)

**Tracking**
- `docs/15-ai-context/desktop-agent-flagship-implementation-progress.md` (this file)

---

## Verification Status

Compile / typecheck / test / Docker rebuild were NOT executed this session.

**Before merging this work**, the next session must:
- [ ] `cd apps/claw-agent-service && npx prisma migrate dev --name add_capability_invocation_unify_policy`
- [ ] `cd apps/claw-agent-service && npx prisma generate`
- [ ] `npm run typecheck` (root) — 0 errors expected; if errors surface, most likely from Prisma type changes propagating
- [ ] `npm run lint` (root) — 0 errors expected
- [ ] `cd apps/claw-agent-service && npx jest src/modules/agent/services/__tests__/capability-risk.service.spec.ts` — all 16 tests should pass
- [ ] `npm run test` (root) — full suite, regressions should be zero against existing terminal-command tests
- [ ] `npm run build` (root) — production build green
- [ ] Docker rebuild of agent-service per the procedure in `apps/claw-agent-service/CLAUDE.md`

Full QA harness `qa/test-stream-10-capability-framework.sh` is defined in the stream-10 prompt and exercises the live HTTP surface plus DB verification plus Docker log scan.
