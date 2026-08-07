# Mentor Lab Ledger

Lab: ClawAI Coding Agent — Mentor-Driven Feature Qualification.
Pack: `ClawAI_Coding_Agent_Mentor_Driven_Feature_Qualification_Lab_Prompt_Pack_2026-08-07`.

Two actors, one proving ground. Claude is mentor, product engineer, reviewer and
release engineer. The ClawAI Coding Agent inside VS Code is the worker under
test. Password Reset is the benchmark it must implement itself. A feature that
works because the mentor wrote it is a failed qualification, so every
feature-scope line has to trace to an agent run in
[`PASSWORD_RESET_AGENT_PROVENANCE.md`](PASSWORD_RESET_AGENT_PROVENANCE.md).

## Baseline — 2026-08-07

Recorded before any code changed, per pack §3.

| Fact                   | Value                                                                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| source extension       | `0.52.0` (`apps/claw-coding-agent/package.json`)                                                                                         |
| newest changelog entry | `0.52.0`                                                                                                                                 |
| newest built VSIX      | `builds/clawai-coding-agent-0.52.0.vsix`, 2026-08-07 00:08                                                                               |
| installed extension    | `clawai.clawai-coding-agent-0.52.0`, 2026-08-07 09:45                                                                                    |
| active Extension Host  | not independently observed — see the limitation below                                                                                    |
| submodule HEAD         | `7a571312` (`v0.18.0-26-g7a57131`), branch `main`, clean                                                                                 |
| parent pointer         | `7a571312`, parent `main` at `1c352455`, tree clean apart from the pointer                                                               |
| backend/runtime        | 39 containers up, all healthy; `/api/v1/health` reports `degraded` because `ollama-service` resolves to `ENOTFOUND` from the public host |
| public deployment      | `https://claw-ai.co` — `/` 200, `ssl_verify_result=0`, `/api/v1/health` 200                                                              |
| feature branch         | none — Password Reset has not started                                                                                                    |

The pack names `0.52.0` as reference evidence, not as an assumption. Inspection
agreed with it: source, changelog, newest VSIX and installed extension were all
`0.52.0`, so there was no stale-build ambiguity to resolve at baseline.

## Standing limitation — the mentor cannot drive the real VS Code UI

Pack §15 makes real-UI execution the certification bar: an HTTP harness may
diagnose, but only the installed extension in a real VS Code window certifies.
This mentor session runs as a terminal agent. It can install a VSIX, run the
extension's own harnesses, read logs and journals, query the backend and review
diffs. It cannot type into the extension's composer, press Send, watch the
activity stream, answer an approval modal, or reload the window.

That is not a product defect and it is not a lab defect. It is a boundary of
this session, and it means the Password Reset ladder (pack §10) cannot start
here. Everything the mentor owns on the product side can proceed; every rung of
the agent ladder needs an operator at the window. `CURRENT_BENCHMARK_STATE.md`
carries the exact handoff.

Rejected alternatives, so they are not re-litigated:

- **Drive the runtime over HTTP** (`POST /api/v1/chat-messages/runtime`). Works
  as a diagnostic, and pack §15 explicitly refuses it as certification. It
  would also produce feature commits with no agent-run provenance in the UI
  sense the pack means.
- **Use `agent-cli/`.** That is the ClawAI desktop agent — screen, clipboard,
  terminal and browser capability providers. It is a different product and does
  not drive the VS Code extension.
- **Have the mentor implement Password Reset.** Prohibited by the pack's one
  rule.

## Iterations

### ITERATION-001 — baseline capture

- Extension version: `0.52.0`
- Prompt: none (mentor-side)
- Agent run: none
- Goal: establish the versions, stack health and tree state the pack requires
  before anything is edited.
- Observed actions: read the pack end to end; ran
  `npm run knowledge:context -- --task=...` and read `.ai/local/current-context.md`
  (classification `authentication-security`, 8 governing rules, reviewers
  `security-reviewer` / `authentication-reviewer` / `authorization-idor-reviewer`);
  read the root and extension `CLAUDE.md`; enumerated containers; probed the
  public deployment.
- Feature files changed: none
- Mentor findings: baseline coherent; no stale-VSIX condition; no existing lab
  ledger anywhere in the tree, so this lab starts from zero rather than
  resuming.
- Primary classification: n/a
- Result: baseline recorded.

### ITERATION-002 — Cloud connection lane, `0.52.0` → `0.53.0`

- Extension version: `0.52.0` → `0.53.0`
- Prompt: operator instruction, mid-session — enable the production (Cloud)
  option in the coding agent's connection screen and point it at
  `https://claw-ai.co`.
- Agent run: none. This is mentor-owned product scope under pack §2 ("extension
  UI used to interact with the coding agent", "coding-agent-specific backend
  endpoints/contracts"), not benchmark feature scope.
- Goal: turn a dimmed placeholder into a working connection lane.
- Qualification gap: the product could not reach its own production deployment
  at all. Backend and Frontend each rendered a Cloud radio as `disabled` with
  the label "Coming soon", and `resolveConnectionEndpoint` threw
  `ClawAI <kind> cloud is not available yet.` The deployment has existed since
  parent commit `b78f9352`.
- Observed actions before editing: verified the target rather than trusting it —
  `https://claw-ai.co/` returns 200 with `ssl_verify_result=0`,
  `/api/v1/health` returns 200, and `/api/v1/auth/vscode/authorize/init` and
  `/exchange` return 400 on an empty body rather than 404, so the routes the
  extension's PKCE flow depends on are present and validating.
- Product changes:
  - `src/core/configuration.ts` — `BACKEND_CLOUD_URL` added,
    `FRONTEND_CLOUD_URL` repointed from a Vercel preview host to
    `https://claw-ai.co`, and the `CLOUD` branch of `resolveConnectionEndpoint`
    returns instead of throwing.
  - `src/webview/chat-inbound-message.ts` — a second gate found by reading
    rather than by failing: the webview→extension schema accepted only
    `['LOCAL','CUSTOM']`, so a Cloud selection would have been rejected at the
    extension boundary even with the radio enabled.
  - `src/webview/chat-markup.ts` — four Cloud radios un-disabled across the
    connection gate and the App connections dialog; six hard-coded
    `https://claw.local` literals replaced with the exported constants so the
    label cannot advertise an origin the resolver will not use.
  - `media/chat.js` — dropped `|| control.value === 'CLOUD'` from the
    disable-all loop.
  - `media/chat.css` — `.environment-disabled` had no remaining author, so the
    dim rule keys off `input:disabled`, which is what the authorizing state
    actually produces. The origin label wraps instead of clipping to
    `https://claw.lo…`.
  - `package.json` — `CLOUD` added to both `clawAI.*Environment` enums.
- Lab-harness repair (LAB_FIX, recorded separately from product scope):
  `scripts/serve-webview-fixture.mjs` transpiled `chat-markup.ts` in isolation
  and imported it as a `data:` module, so the new import of the shared
  constants was unresolvable and the whole Playwright suite failed to boot. It
  bundles now, which also means the UI suite exercises the real module graph.
- Regression tests added:
  - `configuration.test.ts` — cloud resolves for both kinds; a stale custom URL
    is ignored when the cloud lane is selected; the published cloud origins
    survive `normalizeBackendUrl` / `normalizeFrontendUrl` and are HTTPS.
  - `chat-markup.test.ts` — all four cloud radios are `value="CLOUD"` and carry
    no `disabled`; no `environment-disabled`; no "Coming soon"; the rendered
    labels are the exported constants.
  - `chat-inbound-message.test.ts` — all three lanes accepted, `STAGING`
    refused.
  - `connection.e2e.ts` — Cloud selected in the gate posts
    `backendEnvironment: 'CLOUD'` with an empty custom URL; the same round trip
    through the App connections dialog; the connect-gateway snapshot
    regenerated.
- Gates: `npm run check` green — format:check, lint, typecheck, scan:paths,
  **835/835** unit and integration tests, build, `package:audit OK — 23
commands, 13 locales, strict CSP, no secret settings`. Playwright **41/41**.
  Extension host activation test exit 0.
  - One flake worth recording rather than hiding: on the first `npm run check`,
    two tests in `tests/integration/backend-session-lifecycle.test.ts` timed out
    at 5 s while Playwright's browsers were still winding down. Three isolated
    reruns and a clean full rerun all passed 6/6 and 835/835. Timing-sensitive
    under CPU contention, not a regression from this change — but it is a real
    flake in that file and it is now on the record.
- Release: `builds/clawai-coding-agent-0.53.0.vsix`, installed with `--force`.
  `code --list-extensions --show-versions` reports
  `clawai.clawai-coding-agent@0.53.0`. Proof the installed bundle is the new
  one, not a stale copy: the installed `dist/extension.js` contains `claw-ai.co`
  twice and "Coming soon" zero times; the `0.52.0` bundle still on disk has the
  reverse.
- Not done here: **the VS Code window has not been reloaded**, so the running
  Extension Host is still `0.52.0`. Pack §7 forbids treating an installed VSIX
  as active without a reload. Operator action.
- Commits: submodule `e158a6e` on `main`, pushed; parent pointer `90c767f6` on
  `main`, pushed. `git log origin/main..HEAD` empty in both.
- Primary classification: n/a — directed product enhancement, not a failure
  response.
- Result: shipped, installed, unverified in a live window.

### ITERATION-003 — effort modes audit and release, `0.53.0` → `0.54.0`

- Extension version: `0.53.0` → `0.54.0`
- Prompt: none. Mentor-side product qualification against pack §13 and §14,
  which the standing limitation does not block — auditing whether a mode exists
  and whether it changes behaviour is a source and test question, not a
  clicking question.
- Agent run: none. Product scope.

**Audit result — two findings, both concrete.**

`grep -ri effort src/` returned three files. Every hit was the English phrase
"best effort" in a comment. There was no effort-mode feature of any kind.
`grep -ri 'speed\|1\.5X\|2X\|turbo' src/` returned nothing at all. Pack §13
requires Low, Medium, High, Max, xHigh and Ultra with measurable behavioural
differences; §14 requires 1X, 1.5X and 2X. Neither existed.

The pack anticipates this: "If modes are absent or fake, that is a product
enhancement opportunity."

**The seam.** `RunBudget` already carried exactly the dimensions §13 asks a mode
to vary — model turns, tool calls, tool rounds, repair attempts, wall clock,
output bytes, tool-result bytes — and `runtime-studio-execution.ts` held a
single module-level constant handed to every run. One hardcoded budget for a
one-line rename and for a cross-service feature alike.

**Fixed in `0.54.0`.** `src/core/effort-mode.ts` defines the six modes, a
documented orchestration contract for each, and six distinct budget profiles.
`clawAI.effortMode` (resource scope) selects one; the composer gained an
**Effort** control; the runtime starts the run with the selected budget.

Design decisions worth recording:

- **Ultra is byte-identical to the old constant and is the default.** An
  upgraded install behaves exactly as before. Spending less is opt-in — the safe
  direction, because a default that quietly lowered a limit would fail long runs
  that never had to respect one. A test writes the historical literal out
  longhand so the two cannot silently diverge.
- **Two limits belong to the schema, not the ladder.** `maxRepairAttempts` is
  bounded `0..1`, so it cannot form a six-step ladder; LOW spends it and the
  rest keep their single repair. Wall clock, output bytes and tool-result bytes
  were already at the schema ceiling before this change, so the ladder reaches
  that ceiling at Ultra rather than exceeding what the product already did.
- **A second gate found by reading, not by failing.** The webview→extension
  message schema is an allow-list; `selectEffortMode` had to be added or an
  enabled control would have posted a message the extension refused. Same class
  of quiet second gate as the CLOUD enum in ITERATION-002.
- **`effortMode` was deliberately kept out of `SessionConfiguration`.** That
  interface feeds `SessionPolicySnapshot` and `decidePermission`. How much a run
  may spend has nothing to do with whether it may write a file. Adding it there
  compiled, and was reverted.

**Measurability (pack §13: "the mentor must measure actual behavioural
differences").** The run's observability trace and durable journal now record
the mode, and two runs at different efforts produce different policy snapshot
hashes. Without that, comparing modes is guesswork.

**The tests are the anti-fake clause.** The suite fails if any two modes share a
budget, if a stronger mode buys less of any dimension than a weaker one, if a
scaling dimension takes fewer than four distinct values across six modes, if
Ultra stops matching the historical constant, or if the runtime stops sending
the selected budget to the transport.

- Gates: `npm run check` green — format:check, lint, typecheck, scan:paths,
  **852/852** tests, build, `package:audit OK`. Playwright **42/42** including a
  new six-option round trip that also proves a pending selection survives a
  state frame still reporting the old mode. Extension host activation exit 0.
- Release: `builds/clawai-coding-agent-0.54.0.vsix`, installed with `--force`.
  `code --list-extensions --show-versions` reports `0.54.0`. Installed
  `dist/extension.js` contains `effortMode` ×16 and `XHIGH` ×4; the `0.53.0`
  bundle has zero of each.
- Not done: **the VS Code window has still not been reloaded**, so the running
  Extension Host predates both releases. No confirmation rounds, no 100-round
  conformance for the new option family.
- Commits: submodule `53985b5` (a prettier-only fix to a page a concurrent
  session had committed unformatted, kept separate so the feature diff would not
  carry it) and `324eb4c`, both on `main`, pushed.
- Primary classification: n/a — qualification gap closed, not a failure
  response.
- Result: shipped, installed, unverified in a live window.

**Still open against §14.** Speed modes 1X / 1.5X / 2X do not exist. They are a
different kind of change from effort: §14 asks for orchestration strategies —
parallel independent reads, batched metadata collection, concurrent
non-mutating searches — with writes still serialized, plus median and p95
measurement over a stable corpus. That is a scheduler change, not a budget
change, and it needs the real-UI measurement loop to demonstrate. Recorded as
the next product gap rather than half-built.

### ITERATION-004 — Password Reset Phase 0

Not started. Blocked on the standing limitation above. The prompt is staged at
`prompts/agent/00_DISCOVER_PASSWORD_RESET_ARCHITECTURE.txt` in the pack and the
exact operator handoff is in `CURRENT_BENCHMARK_STATE.md`.
