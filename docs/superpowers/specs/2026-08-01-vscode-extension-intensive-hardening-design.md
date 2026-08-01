# ClawAI Coding Agent intensive hardening design

## Outcome

This release program turns the extension from a visually dense backend console
into a reliable, localized coding workbench. It fixes session restoration and
browser authorization first, then exposes honest model and research
consumption, and finally proves the coding-agent workflow against real local
models through repeated regression rounds.

The work ships as three coherent extension releases:

- `0.13.0`: authentication reliability and the workbench shell;
- `0.14.0`: runtime localization and multidimensional consumption telemetry;
- `0.15.0`: planning intent, memory, permission, research, and local-model
  hardening.

At least ten internal regression rounds run across the program. Version numbers
represent user-visible checkpoints rather than test iterations.

## Existing-state audit

| Deliverable                   | Verdict                                   | Evidence                                                                                                                                                              |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First-open connection gateway | Partial                                   | A never-configured install stays disconnected, but a restored session surfaces raw network exception text when its backend is unavailable.                            |
| Secure browser authentication | Partial                                   | PKCE, state validation, loopback binding, timeout, and origin-scoped secret storage exist; the callback claims success before exchange and profile validation finish. |
| Authorization completion UX   | Missing                                   | The loopback server returns a minimal static page and does not attempt a safe close after verified connection.                                                        |
| Current-model header          | Partial                                   | The route summary renders the selected model and status, but the hierarchy is cramped and does not label it as the current model.                                     |
| Context visibility            | Partial                                   | Context collection and receipts work; the header shows `0` until a completed request supplies a receipt, even when context is ready.                                  |
| Plan visibility               | Incorrect                                 | The rail label `Plan` displays the account subscription plan name, not agent Plan mode.                                                                               |
| Parallel conversations        | Done                                      | The scheduler has two execution slots, permits different conversations concurrently, and serializes follow-ups within one conversation.                               |
| Token telemetry               | Done, visually partial                    | Reported and estimated model tokens reconcile correctly and render in vivid chips.                                                                                    |
| Research control              | Done                                      | `NONE`, `SEARCH`, `SEARCH_FETCH`, and `SEARCH_EXTRACT` cross chat, compare, judge, and agent boundaries.                                                              |
| Research accounting           | Partial in extension                      | Backend transcripts persist search and fetch request counts and the web app renders them; the extension neither consumes nor displays them.                           |
| Local-model research          | Done architecturally                      | Research evidence is collected by the research service and inserted into context, so offline models do not require direct network access.                             |
| Memory                        | Done architecturally, unproven end-to-end | `.clawai/memory.md` is read with project rules for coding runs, but lacks a real local-model regression scenario.                                                     |
| Plan intent                   | Partial                                   | Explicit Plan mode is read-only; AUTO mode does not visibly recognize an explicit planning-only request.                                                              |
| Development commands          | Partial                                   | Bounded workspace commands and read-only Docker diagnostics exist; Docker mutation is deliberately rejected.                                                          |
| Localization                  | Partial                                   | Thirteen locale bundles and RTL support exist; the webview follows VS Code's locale and has no in-extension switcher.                                                 |
| Visual regression             | Done, incomplete matrix                   | Playwright baselines cover major dark/light/narrow states but not the new auth, localization, consumption, research, and permission surfaces.                         |

## Product principles

- Connection state must be truthful. `Connected` means token exchange and
  profile validation completed against the active backend origin.
- A temporary backend outage must not erase a valid stored session or force a
  browser login.
- Model tokens and web operations contribute to overall consumption but remain
  separate units. ClawAI never fabricates a token conversion for a search,
  fetch, extract, or provider fallback.
- Backend services remain authoritative for identity, entitlements, routing,
  usage, research, and provider operations. The extension stays a validated
  client.
- Planning inference may only move a request toward the safer read-only Plan
  path. It may never infer permission to edit or execute commands.
- Every modifying command remains bounded, visible, and explicitly approved.
- Visual vibrancy comes from operational color, hierarchy, spacing, and
  telemetry—not decorative gradients or hard-coded theme assumptions.

## Release 0.13.0: authentication and workbench shell

### Connection state machine

The public connection state expands from a generic loading/error distinction to
the following user-facing phases:

- disconnected;
- authorizing;
- verifying;
- connected;
- temporarily offline.

On a never-configured installation, activation performs no authenticated
backend request and shows the connection gateway without an error.

When an origin-scoped session exists, activation validates it silently. A
retryable transport failure uses a short bounded backoff. If the backend remains
unavailable, the extension preserves the session, publishes the temporarily
offline state, and offers Retry. Raw Node, Fetch, TLS, socket, and abort messages
never enter user-visible copy.

An authenticated `401` keeps the existing single-flight refresh behavior. A
valid refresh returns to connected. An invalid or revoked refresh clears the
origin-scoped session and returns to disconnected. Logout continues to clear
local state before its best-effort remote call.

### Verified loopback completion

The loopback callback separates receipt of the state-bound code from browser
completion:

1. validate method, host, path, state, duplication, and bounds;
2. hold a bounded completion response while the extension exchanges the code;
3. validate the returned profile against the candidate backend;
4. commit the origin and token pair;
5. send a polished success page only after the connection is active;
6. attempt `window.close()` after a short delay and retain an accessible Close
   tab fallback when browsers refuse script-initiated closure.

Exchange, profile, cancellation, timeout, or ownership failure sends a polished
failure page that says the account was not connected. No page contains an
authorization code, token, backend response, or secret-bearing diagnostic.
Restrictive CSP, no-store, loopback-only binding, one-shot settlement, and
deadline behavior remain mandatory.

### Visual direction: Vital Workbench

The redesign uses a compact two-level command bar:

```text
┌ ClawAI · conversation/workspace ─ history ─ language ─ new ─ account ┐
├ Current model · provider/status ─ route ─ context readiness ─ usage ┤
├ active runs / research / approvals when present                     ┤
├ conversation                                                       ┤
└ context · model · run intent · more settings · send                ┘
```

The first row owns navigation and account actions. The second row owns
execution provenance. “Current model” replaces the ambiguous standalone model
name. Route values are humanized (`Automatic routing`, `Manual model`) instead
of rendering internal enum names.

`Context` displays readiness before a run (`Workspace ready`, `Active file`,
`Selection`, or `Off`) and the actual receipt after collection (`12 files ·
84 KB`). The receipt has a tooltip or disclosure for exclusions and
truncation. It never implies that ready files were already sent.

`Account plan` replaces `Plan` for subscription data. Agent intent appears
separately as `Run intent: Agent` or `Run intent: Plan`.

Spacing follows a 4/8/12/16-pixel rhythm. Operational controls have at least a
28-pixel compact target and a 32-pixel preferred target. All enabled buttons,
selects, summaries, tabs, and clickable chips use a pointer cursor. Text never
falls below 11 CSS pixels. Normal prose and controls use the VS Code UI font;
code, prompts, model identifiers, and numeric telemetry use the editor font.

Theme variables remain authoritative. Coral marks primary actions, blue marks
model tokens, violet marks research operations, mint marks verified connection,
and amber marks degraded or approval-required states. Each state also has text
and icon semantics, never color alone.

The CSS is consolidated by component responsibility so late-release overrides
do not continue accumulating contradictory header and composer rules.

## Release 0.14.0: localization and consumption

### Runtime language switching

The existing thirteen locales remain the source set:

`en`, `ar`, `de`, `es`, `fa`, `fr`, `hi`, `it`, `ja`, `pt`, `ru`, `th`, and
`zh`.

A compact language control sits beside New conversation and Account. `System`
follows `vscode.env.language`; an explicit locale is stored as an extension
preference. Changing the locale rebuilds the webview markup from the generated
runtime bundle, restores its retained conversation/session state, updates
`lang` and `dir`, and focuses the language control after reload.

Package commands and VS Code-native notifications continue to use
`vscode.l10n`. The override applies to the extension webview only because VS
Code does not support changing host localization per extension at runtime.
Arabic and Persian use RTL layout while model identifiers, token values, file
paths, and code keep appropriate bidirectional isolation.

### Consumption model

The top-bar token chip becomes a Consumption control with a compact summary and
an expanded, validated breakdown:

- model input tokens;
- cached input tokens when reported;
- output and reasoning tokens;
- search requests;
- fetch/extract requests;
- provider fallback attempts when reported;
- provider and model attribution;
- reported versus estimated labels;
- current account day/week/month usage and feature limits.

Conversation receipts remain request-local. Account windows come from
`GET /auth/me/usage`. Research operation counts come from backend-owned
research transcripts and live research completion events.

The chat stream contract adds bounded non-negative request counts to research
completion details. Persisted assistant metadata remains the recovery source
when a live event is missed. The extension validates both shapes before
rendering them.

Ollama session/weekly percentage and reset time remain `Unavailable from
provider` because Ollama exposes no supported API for those values. Qualitative
model usage tiers may be displayed when the connector catalog provides them;
they are not converted into money or tokens without authoritative rates.

Research off must render and initiate zero ClawAI research operations. Research
failure shows the attempts actually consumed and an explicit degraded result.

## Release 0.15.0: coding-agent hardening

### Planning intent

AUTO mode recognizes bounded, explicit planning-only intent such as “write a
plan,” “analyze and do not edit,” or the localized Plan suggestion. The request
is visibly marked `Plan · read-only` before execution and the model receives the
existing Plan-mode constraints.

The classifier is deliberately one-way: ambiguous prompts remain Agent, and no
text classifier can enable edits, commands, broader context, or permissions.
The explicit mode control always overrides automatic suggestion. Retry preserves
the resolved intent captured by the original request.

### Memory and project instructions

Coding runs preserve the current precedence:

1. profile-wide global context;
2. `.clawai/rules.md`;
3. `.clawai/architecture.md`;
4. `.clawai/memory.md`;
5. bounded request context.

Receipts show which instruction files were loaded without exposing their
contents as telemetry. Tests prove memory is included for agent and read-only
workflows, excluded when absent, bounded, workspace-contained, and cancelled on
workspace/account transitions.

### Permission playground

The default command policy continues to allow bounded development commands and
read-only Docker diagnostics. A new narrow Docker service-control path may
restart one explicitly named running ClawAI container only when all conditions
hold:

- trusted file workspace;
- Agent mode, never Plan mode;
- the container is selected from a freshly enumerated ClawAI allowlist;
- no shell, compose expression, environment expansion, wildcard, or arbitrary
  argument is accepted;
- the exact container and action are shown in a one-time approval;
- Full Access does not bypass this approval;
- output, timeout, cancellation, and redaction bounds remain active.

No stop/remove/image/volume/network mutation, `docker exec`, arbitrary
container name, or compose-stack mutation is added. This is explicit service
recovery, not a general autonomous terminal.

### Local-model regression matrix

Real-model playground rounds use the locally available catalog, prioritizing:

- `qwen3:1.7b` for small-model instruction adherence;
- `qwen2.5-coder:0.5b`, `1.5b`, and `3b` for coding-plan quality;
- `llama3.2:1b` and `smollm` for constrained fallback behavior;
- `qwen3:14b`, `gemma3:27b`, and `gemma4:e4b` for stronger comparison runs.

Each model is asked to complete tiny isolated fixture changes rather than
modify production code. Scenarios cover read-only explanation, explicit plan,
one-file edit, multi-file edit, unit-test repair, memory adherence, context
selection, research with citations, malformed edit-plan repair, rejected unsafe
command, approved safe command, cancellation, retry, undo, and parallel chats.

Model quality findings may improve prompts, validation, recovery, or UX, but
tests must remain deterministic. Live-model outcomes are QA evidence, not unit
test assertions.

## Failure handling

- One run, model, research provider, or conversation failure cannot relabel or
  cancel another run.
- Account, backend-origin, workspace-root, trust, and locale transitions reject
  stale state publication.
- Temporary connection failure preserves account-scoped secrets but does not
  display authenticated workbench data until the profile is verified.
- Missing research counters render as unavailable, not zero, unless the backend
  explicitly reports zero.
- Locale bundle failure falls back to English and records a redacted extension
  diagnostic.
- Context readiness and receipts never claim that excluded or unread files were
  sent.
- Unsafe model-proposed edits or commands remain discarded before approval.

## Testing program

Every behavior change begins with a failing focused test. The release program
adds or extends:

- connection-service and backend-client unit/integration tests for startup
  retry, safe network copy, preserved sessions, refresh, invalid sessions, and
  stale attempts;
- loopback authorization tests for pending, verified success, verified failure,
  CSP, auto-close fallback, duplication, cancellation, and timeout;
- markup, state, and Playwright tests for the two-level header, readable route,
  context readiness/receipt, account plan, agent intent, settings, language,
  usage, research, and approval states;
- backend stream and extension contract tests for research request counts;
- planning classifier and retry snapshot tests;
- memory precedence, absence, boundary, and cancellation tests;
- Docker allowlist, explicit approval, injection, cancellation, timeout, and
  redaction tests;
- scheduler regression tests proving two separate conversations run together
  while same-conversation follow-ups remain FIFO;
- screenshots for dark, light, narrow, RTL, disconnected, authorizing,
  verifying, connected, offline, empty, active run, two runs, waiting, research,
  consumption, approval, compare, error, and success states.

At least ten regression rounds exercise each core workflow multiple times. A
round records findings, adds deterministic regression coverage for real defects,
runs the scoped gates, and only then advances. Findings are not invented to meet
a quota.

Each extension checkpoint runs:

```text
npm run l10n:build
npm run format
npm run check
npm run test:host
npm run test:playwright
npm run package
npm audit --omit=dev --audit-level=high
```

Touched backend/frontend workspaces run their own typecheck, lint, test,
coverage, and build lanes. Root knowledge and inventory artifacts regenerate
after formatting. Each exact VSIX is inspected, installed with `--force`, and
verified by installed version. Every commit is pushed before the next checkpoint
begins, and remote gates must be terminal green.

## Acceptance criteria

- A never-configured first open shows no network error.
- A configured session survives a temporary backend outage and reconnects
  without browser authorization.
- The browser says Connected only after the extension has committed a verified
  session and attempts a safe automatic close.
- The top bar clearly identifies Current model, human-readable route, context
  readiness or receipt, account plan, run intent, and consumption.
- Context no longer displays a misleading unconditional zero.
- Search, fetch/extract, and fallback consumption is visible beside—not
  converted into—model tokens in both live and persisted responses.
- All thirteen languages are selectable in the webview and RTL snapshots pass.
- Explicit planning-only prompts execute read-only and cannot apply edits or run
  commands.
- Memory precedence is covered by deterministic tests and demonstrated in a
  local-model QA fixture.
- Two different conversations using different models run concurrently; one
  conversation remains ordered.
- Bounded edits, tests, retry, undo, research, permissions, and explicit
  ClawAI-container restart are exercised repeatedly without weakening existing
  trust, path, approval, redaction, or cancellation boundaries.
- Every checkpoint's local gates, installed VSIX verification, push, GitHub
  workflows, release asset, and parent submodule pointer are complete.

## Deviations from the request

- Ten or more test iterations do not create ten meaningless public versions.
  Three coherent user-visible checkpoints satisfy repository release policy.
- Web research consumption appears in the unified Consumption surface but is
  not falsified as tokens. Search and fetch are provider requests with separate
  quota impact.
- Arbitrary Docker restart or terminal access remains prohibited. Only an exact,
  freshly enumerated ClawAI container can be restarted after one-time approval.
- The language override applies to the webview. VS Code owns localization for
  host-native command titles and notifications and cannot be switched per
  extension at runtime.
