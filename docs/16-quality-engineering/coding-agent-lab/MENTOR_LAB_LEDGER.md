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

## Resolved limitation - the mentor CAN drive the real VS Code UI

Earlier rounds recorded that a terminal session could not drive the extension's
webview, and treated the whole agent ladder as operator-only. That was wrong, and
the way through was available all along: `code serve-web` runs the real VS Code in
a browser, and a browser is drivable.

Verified 2026-08-07:

```
code serve-web --without-connection-token --accept-server-license-terms \
  --port 9888 --host 127.0.0.1 \
  --server-data-dir <dir> --default-folder d:/Freelance/Claw
```

The VSIX installs into the server's own extension directory using the
`code-server` CLI shipped under `~/.vscode/cli/serve-web/<commit>/bin/`, and
`--list-extensions --show-versions` confirms which build is live. The webview sits
behind two nested iframes - `iframe.webview` then `iframe#active-frame` - so
Playwright can click `#connectButton`, fill `#prompt` and press `#sendButton`
against the real markup, in the real extension host, against the real backend.

The browser authorization round trip works the same way: Connect -> VS Code's
trusted-domain dialog -> the ClawAI login page on `https://claw.local` (the mkcert
leaf is trusted by the browser) -> sign in -> Authorize VS Code -> loopback
callback -> connected, status bar reading `ClawAI - AUTO`, real models attached.

One honest caveat that bears on every finding below: in `serve-web` the extension
host runs on the server rather than in an Electron renderer. A failure seen here
must be re-checked on the desktop before it is called a product defect in
general. It is still the real extension, the real webview, the real tool loop and
the real backend - far more than the HTTP harness the pack refuses.

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

### ITERATION-005 - popover clipping and speed modes, 0.54.0 -> 0.55.0

- Prompt: operator report that the UI was "not appearing and shifted in
  background or trimmed", with a screenshot.
- Confirmed and root-caused rather than guessed. `.secondary-controls` is
  absolutely positioned above its summary inside `.composer-card`, which clips
  its own overflow. Four controls fitted; the Effort control added in 0.54.0
  pushed the panel to three rows, and a browser measurement put the panel top at
  505px against a card top of 537px - 32px clipped, exactly the row of labels -
  with `getComputedStyle(card).overflow` reading `hidden`. AGENT / EFFORT /
  APPROVAL therefore rendered as unlabelled selects. This was a regression I
  introduced in 0.54.0.
- Fix: the clip is released only while the popover is open, via
  `:has(.more-settings[open])`, so every other state keeps its rounded corners.
  Columns became auto-fit with a height cap, because they had also squeezed "Ask
  for Approval" down to "Ask for Appro".
- Speed modes (pack section 14) now exist. Assembling workspace context did a
  containment check, a stat, then a read - strictly one file at a time for up to
  forty candidates. `clawAI.speedMode` issues the containment checks and stats
  four at a time at 1.5X and eight at 2X.
- What speed does not do, and why. The first implementation prefetched file
  contents in parallel. The existing suite caught it: a test asserting that only
  one file is loaded when only one fits went from 1 read to 20. Byte reads stay
  serial and conditional on the running total, and the contracts say "metadata
  lookups" rather than "reads" so the wording cannot overclaim.
- Correctness proof: the produced context is asserted identical at 1X, 1.5X and
  2X under a truncating byte limit, plus an assertion that something was actually
  excluded so the comparison cannot pass vacuously.
- Gates: 869/869 tests, Playwright 44/44, host exit 0, `npm run check` green.
  Commit 1a04b5d, pushed.

### ITERATION-006 - Password Reset Phase 0, first real agent runs

Two rounds, same prompt, different model lane, both observed in the real UI with
the backend logs open beside them.

Round A - AUTO routing. FAILED.

- Run `run_d816d077577fa660b69a9bc962eb7659`, protocol v2, 17 tools advertised,
  effortMode ULTRA.
- The UI sat on "Reading workspace" for over three minutes with no tool
  activity - the exact signature the pack's own evidence screenshots are named
  after (`01_activity_workspace_list_completed_but_answer_stuck.png`).
- Root cause from `claw-chat-service`: `[message_routed_received] ... via
local-ollama/AUTO`, then `LocalModelSelectionService resolveDefaultModel:
selected gemma3:27b`, then `callOllama: calling model=gemma3:27b`, then
  `callOllama: building prompt string from context`, `prompt built -
length=24147 chars`, then `POST /api/v1/ollama/generate (timeout=300000ms)`
  with no completion line. Still in flight five minutes later. The run span
  closed `status: error` at 3m16s.
- Two distinct problems in that one trace. AUTO sent a coding-agent run to a
  general local model on an 8 GB GPU with a 24k-character prompt. And it went
  through `callOllama` building a flat prompt string - the plain chat path - not
  the tool-calling runtime loop, so the 17 advertised tools were never usable.
- Classification: MODEL_PROVIDER_DEFECT with a router-capability cause, pack
  sections 24 and 25 ("router capability awareness", "no silent provider
  substitution"). The router lives in the backend, not the extension, so this is
  parent-repo work and is OPEN.
- Also seen, low severity: `WARN [ContextAssemblyManager] fetchWorkspaceContext:
failed with status 400` from `POST /internal/workspace/search`. That is
  connector-workspace enrichment, it is caught, and it is not the stall - but it
  is noise in every run.

Round B - manual kimi-k2.7-code:cloud. The loop works; one tool fails.

- Run `run_8a42cf8fe61bb08bff204165dabdd4b9`.
- The real agentic loop ran: repeated `POST https://ollama.com/api/chat` 200s
  (1394 ms, 1595 ms) and, decisively,
  `POST /api/v1/chat-messages/runtime/runs/<id>/results` 201 - the extension
  executing a tool and posting the result back to the platform.
- The activity stream showed genuine tool phases: `workspace.files list`
  Requested, Running, then failed - 166 bytes in 23 ms - followed by
  `workspace.files read` Requested.
- So the agent's very first attempt to enumerate the workspace fails, in 23 ms,
  with a 166-byte error body. Invocation
  `invocation_e0cf8155fd21f844550cf18ea5dbebc7`, receipt
  `receipt:a9ec9f33-b516-438a-888c-8f36165e4837`.
- The run then terminalized `cancelled`, which was my own cancel click from Round
  A landing late rather than a product decision. The tool failure is independent
  of it.
- The error body is not recoverable from the logs. The ClawAI Output channel
  records the run span opening and closing and nothing about the failed
  invocation, so a mentor cannot diagnose a failed tool from logs. That is its
  own observability gap and it blocks the next step of this diagnosis.
- Classification: candidate WORKSPACE_LIST_WRONG, scope NOT yet established. This
  was observed under `serve-web`, where the extension host runs on the server, so
  it may or may not reproduce on the desktop. Calling it a general product defect
  before checking the desktop would be exactly the unverified claim this ledger
  exists to prevent.

Confirmed working, incidentally: the live span carries
`"attributes":{"threadId":"...","toolCount":17,"effortMode":"ULTRA"}`. The 0.54.0
effort instrumentation is real in the shipped product, observed in production
logs rather than in a test.

Next mentor actions, in order.

1. Surface the failed invocation's error body in the Output channel. Everything
   else is blocked on knowing why `workspace.files list` fails.
2. Re-run Round B on desktop VS Code to establish whether the failure is web-only.
3. Fix `workspace.files list`, release, resume Phase 0.
4. Separately, in the parent repo: make AUTO routing refuse to send a
   tool-calling agent run to a model that cannot serve the tool protocol.

### 2026-08-09 repository audit update

The four actions above are no longer an implementation queue:

- `d1a1b78` surfaces the bounded, subsequently redacted executor reason;
  `901a811` keeps a continuing Runtime V2 run active after a failed tool step.
- The apparent universal `workspace.files list` failure was traced to the
  served-web folder URL. `?folder=/d:/Freelance/Claw` plus trust for the real
  folder produced `workspace.files list succeeded` in the recorded retest.
- Parent `27e20082` routes agent work on tool-calling capability, and
  `66772c3f` preserves AUTO routing through Runtime V2 instead of treating
  `AUTO` as a literal provider/model.

These are repository and harness facts, not desktop certification. No claim is
made that a human installed `0.57.3`, reloaded VS Code, exercised the repaired
AUTO lane, approved an edit, or completed the password-reset ladder. Those
remain operator-only qualification steps.
