# VS Code intensive hardening and Docker watch implementation plan

> **Execution rule:** Follow this plan task by task with TDD. Every coherent
> checkpoint runs scoped gates, commits, and pushes before the next begins.

**Goal:** Establish reliable development hot reload, then ship ClawAI Coding
Agent 0.13.0, 0.14.0, and 0.15.0 with verified authentication, redesigned UX,
runtime localization, honest research consumption, and local-model coding-agent
regression evidence.

**Architecture:** Backend services remain authoritative for accounts, research,
usage, models, and execution. The extension presents validated state and owns
only editor context, permissions, review, and reversible workspace actions.
Development Compose uses TypeScript dynamic-priority polling to bridge Windows
Docker Desktop bind mounts into the existing incremental build/restart chain.

**Tech stack:** Docker Compose, Node 26, TypeScript native preview (`tsgo`),
NestJS 11, VS Code Extension API, Zod, Vitest, Playwright, npm, GitHub Actions.

---

## Task 1: Prove and fix development hot reload

**Files:**

- Create: `tools/__tests__/docker-dev-watch.test.mjs`
- Modify: `docker/docker-compose.dev.services.yml`
- Modify: `docs/08-runtime-devops/docker-guide.md`
- Modify: `rules/05-infra-rules.md` only if its existing source-change claim
  needs the Windows polling qualification

### Red

1. Add a Node test that parses the development and production Compose YAML.
2. Enumerate the 18 Node microservices from the development services file.
3. Assert every development service resolves:
   `TSC_WATCHFILE=DynamicPriorityPolling` and
   `TSC_WATCHDIRECTORY=RecursiveDirectoryUsingDynamicPriorityPolling`.
4. Assert service-specific environment keys for file-service survive merging.
5. Assert production services do not contain either variable.
6. Run:

   ```powershell
   node --test tools/__tests__/docker-dev-watch.test.mjs
   ```

   Expected: fail because backend services currently rely on filesystem events.

### Green

1. Add one YAML anchor for the two TypeScript polling values.
2. Merge it into every Node microservice environment, preserving existing
   environment entries and profiles.
3. Render Compose configuration using the same file set as `scripts/claw.sh` and
   confirm all services retain ports, mounts, commands, and healthchecks.
4. Run the focused test; expected pass.
5. Run `node --test "tools/__tests__/*.test.mjs"`.
6. Update the Docker guide with source, Prisma, dependencies, shared packages,
   environment, Compose, and nginx action rules.

### Live verification

1. Run `./scripts/claw.sh up`; Compose must recreate services whose environment
   changed.
2. Wait for healthy status.
3. For chat-service, audit-service, file-service, and ollama-service:
   capture Node PID and `dist/main.js` mtime, touch and restore a source mtime,
   verify new dist mtime/PID, then health.
4. Perform and restore one controlled source-byte fixture change in a safe
   constant under a representative service; verify emitted bytes update.
5. Scan recent service logs for
   `UnhandledPromiseRejection|FATAL|Cannot read properties of undefined`.
6. Run `npm run knowledge:build`, `npm run audit`, `npm run knowledge:verify`,
   and `npm run audit:check` after formatting.
7. Commit and push the infrastructure checkpoint. Verify GitHub gates before
   Task 2.

---

## Task 2: Make startup network failures safe for 0.13.0

**Files:**

- Modify: `apps/claw-coding-agent/src/backend/backend-client.ts`
- Modify: `apps/claw-coding-agent/src/core/extension-state.ts`
- Modify: `apps/claw-coding-agent/src/services/agent-connection-service.ts`
- Modify: `apps/claw-coding-agent/src/webview/chat-public-state.ts`
- Test: `apps/claw-coding-agent/tests/integration/backend-client.test.ts`
- Test: `apps/claw-coding-agent/tests/unit/agent-connection-service.test.ts`
- Test: `apps/claw-coding-agent/tests/playwright/connection.e2e.ts`

### Red

1. Add a backend-client test proving a rejected Fetch call becomes localized,
   bounded user copy and preserves retryable status without leaking the raw
   exception.
2. Add connection tests for no configured origin, restored-session retry,
   temporary offline state, preserved secrets, successful retry, invalid 401,
   cancellation, and stale lifecycle epochs.
3. Add Playwright states for authorizing, verifying, offline, Retry, and
   connected.
4. Run the focused tests and confirm the new expectations fail.

### Green

1. Add explicit connection phases without exposing internal network errors.
2. Implement bounded startup backoff only for retryable restored-session
   validation.
3. Preserve origin-scoped secrets while offline; clear only invalid/revoked
   sessions.
4. Add localized actionable error copy and Retry behavior.
5. Run focused tests, then `npm run check` in the extension.

---

## Task 3: Complete browser authorization only after verification

**Files:**

- Modify: `apps/claw-coding-agent/src/core/loopback-authorization.ts`
- Modify: `apps/claw-coding-agent/src/services/browser-authorization-service.ts`
- Modify: `apps/claw-coding-agent/src/services/agent-connection-service.ts`
- Test: `apps/claw-coding-agent/tests/unit/loopback-authorization.test.ts`
- Test: `apps/claw-coding-agent/tests/unit/browser-authorization-service.test.ts`
- Test: `apps/claw-coding-agent/tests/unit/agent-connection-service.test.ts`

### Red

1. Specify a callback lifecycle with pending code receipt, verified success,
   verified failure, and disposal.
2. Test that the success page is unavailable before exchange/profile/origin
   commit.
3. Test polished success/failure HTML, restrictive headers/CSP, no credentials,
   one close attempt, accessible fallback, duplicate callbacks, timeout, and
   cancellation.
4. Run focused tests; expected fail on the current immediate success page.

### Green

1. Hold the bounded loopback response until the authorization owner settles it.
2. Complete success only after tokens, profile, origin, and vault replacement
   are committed.
3. Complete failure on every exchange/profile/ownership failure.
4. Keep one-shot loopback/state/timeout guarantees.
5. Run focused and full extension checks.

---

## Task 4: Build the 0.13.0 Vital Workbench shell

**Files:**

- Modify: `apps/claw-coding-agent/src/webview/chat-markup.ts`
- Modify: `apps/claw-coding-agent/media/chat.css`
- Modify: `apps/claw-coding-agent/media/chat.js`
- Modify: `apps/claw-coding-agent/src/webview/chat-public-state.ts`
- Modify: `apps/claw-coding-agent/src/core/context-mode.ts`
- Test: extension markup/public-state/context tests
- Test: `tests/playwright/connection.e2e.ts`
- Test: `tests/playwright/webview.e2e.ts`
- Test: `tests/playwright/signal-desk.e2e.ts`

### Red

1. Add semantic tests for Current model, human route, Context readiness/receipt,
   Account plan, Run intent, Consumption, and accessible actions.
2. Add Playwright assertions and dark/light/narrow/RTL snapshots.
3. Assert no enabled interactive control has a non-pointer cursor and no
   operational text is below 11 CSS pixels.
4. Confirm failures against the current route rail and `Context 0`.

### Green

1. Refactor header markup into navigation and execution-provenance levels.
2. Derive context readiness from workspace readiness before collection and
   render the actual receipt after collection.
3. Rename subscription data to Account plan and expose agent intent separately.
4. Humanize internal route enums.
5. Consolidate CSS overrides by component; preserve VS Code tokens, focus,
   high contrast, reduced motion, narrow widths, and RTL.
6. Regenerate all locale bundles.

### Release 0.13.0

1. Update extension `package.json` and lockfile to `0.13.0`.
2. Add a user-focused changelog entry.
3. Run every extension gate from `AGENTS.md` plus Playwright.
4. Build and inspect `builds/clawai-coding-agent-0.13.0.vsix`.
5. Install with `code --install-extension ... --force` and verify installed
   version.
6. Commit and push extension main; wait for terminal-green CI/release.
7. Update, regenerate, commit, and push the parent submodule pointer; wait for
   terminal-green parent CI.

---

## Task 5: Stream authoritative research operation counts

**Files:**

- Modify: `apps/claw-chat-service/src/modules/chat-messages/types/stream.types.ts`
- Modify: `apps/claw-chat-service/src/modules/chat-messages/services/chat-stream.service.ts`
- Modify: research enricher completion emission call sites
- Test: chat-stream and research-enricher Jest specs

### Red/green

1. Add failing tests that `RESEARCH_COMPLETED` carries bounded non-negative
   search and fetch/extract request counts, including fallback attempts.
2. Extend the stream detail type and emitter without changing persisted
   transcript ownership.
3. Run focused tests, then chat-service typecheck, lint, test with coverage, and
   build.
4. Verify hot reload replaces chat-service Node PID and health recovers; if it
   does not, use the canonical full rebuild and treat watcher regression as a
   blocker.
5. Commit/push and verify parent gates.

---

## Task 6: Add runtime language switching for 0.14.0

**Files:**

- Modify: extension configuration and public state types
- Modify: `src/webview/chat-view-provider.ts`
- Modify: `src/webview/chat-markup.ts`
- Modify: `media/chat.js` and `media/chat.css`
- Modify: `scripts/generate-locales.mjs`
- Test: configuration, markup, package-audit, and Playwright locale tests

### Red/green

1. Add failing tests for `System` plus all 13 explicit locales, persisted
   preference, translator fallback, webview reload/state restoration, focus,
   `lang`, `dir`, and bidirectional isolation.
2. Load generated runtime bundles through an extension-owned translator.
3. Add the top-bar language control beside New conversation and Account.
4. Rebuild markup on locale change while retaining the owning session.
5. Regenerate bundles and snapshot English, Arabic, Persian, Japanese, and
   narrow layouts.

---

## Task 7: Render multidimensional consumption for 0.14.0

**Files:**

- Modify: `src/backend/contracts.ts`
- Modify: `src/services/chat-service.ts`
- Modify: `src/webview/chat-public-state.ts`
- Modify: `src/webview/chat-view-provider.ts`
- Modify: `media/chat.js`, `media/chat.css`, and markup
- Test: contract, chat, public-state, retry, and Playwright suites

### Red/green

1. Add failing validation tests for live research counts and persisted assistant
   research transcript recovery.
2. Add failing UI tests for model tokens, search requests, fetch/extract
   requests, fallback attempts, provider/model, reported/estimated, and
   day/week/month feature usage.
3. Parse bounded counts without converting them into tokens.
4. Add the Consumption disclosure and research-violet status chips.
5. Render unknown Ollama provider quota as unavailable.
6. Verify research Off initiates and displays zero explicit research operations.

### Release 0.14.0

Repeat the exact version, changelog, locale, gate, VSIX, install, extension push,
release verification, parent pointer, and parent CI sequence from 0.13.0.

---

## Task 8: Add safe planning intent and memory evidence for 0.15.0

**Files:**

- Create: focused plan-intent core utility and tests
- Modify: request admission/session snapshot types and services
- Modify: run intent presentation in markup/JS
- Modify: workspace project-rules receipt types and tests
- Test: agent mode, session control, prompt execution, agent run, retry, memory
  boundary, and Playwright intent suites

### Red/green

1. Add failing table tests for explicit planning-only phrases, localized Plan
   suggestion, ambiguous discussion, editing prompts, negation, retry, and
   explicit override.
2. Resolve only safe Agent-to-Plan inference and capture the resolved intent per
   request.
3. Display `Plan · read-only` before execution.
4. Add deterministic tests proving global/rules/architecture/memory precedence,
   absence, containment, bounds, and boundary cancellation.

---

## Task 9: Add exact approved ClawAI service restart

**Files:**

- Modify: extension edit-plan command validation/types
- Modify: session control/approval presentation
- Modify: VS Code workspace command adapter
- Test: edit-plan, permission, session-control, command adapter, cancellation,
  and Playwright approval tests

### Red/green

1. Add failing tests for exact `docker restart claw-<known-service>` intent and
   all prohibited variants: arbitrary names, wildcards, shell controls,
   expansion, compose, exec, stop/remove, images, volumes, and networks.
2. Enumerate running `claw-*` containers without accepting model-provided
   allowlist entries.
3. Require trusted workspace, Agent mode, and a one-time exact approval in every
   permission mode.
4. Execute without a shell through the bounded runner; preserve timeout,
   cancellation, output bounds, and redaction.
5. Verify the restarted service returns healthy and logs contain no fatal error.

---

## Task 10: Run ten-plus regression rounds and release 0.15.0

**Evidence:**

- Update: `.claude/Integrations/vscode-intensive-hardening-and-docker-watch__QA_output.md`
- Update deterministic tests and snapshots for every confirmed defect

### Rounds

1. Authentication startup, offline retry, refresh, logout, callback success,
   callback failure.
2. Header, context readiness/receipt, account plan, intent, settings dismissal,
   pointer/focus behavior.
3. English, Arabic, Persian, Japanese, narrow, dark, light, high contrast.
4. Tokens, research counts, usage windows, unknown quota, research failure.
5. `qwen3:1.7b` explain, plan, tiny edit, test repair, and memory adherence.
6. `qwen2.5-coder` variants for one-file/multi-file edits and malformed-plan
   repair.
7. `llama3.2:1b` and `smollm` fallback/rejection behavior.
8. `qwen3:14b`, `gemma3:27b`, and `gemma4:e4b` comparisons and parallel chats.
9. Permissions, safe command, rejected unsafe command, exact service restart,
   cancellation, retry, undo.
10. Full extension regression: unit, integration, host, Playwright, package,
    audit, VSIX install.
11. Full Docker/backend regression: watcher probes, health, SSE research, logs.
12. Release-candidate smoke round from the installed 0.15.0 VSIX.

For each round, record prompts, models, outcomes, confirmed findings, regression
tests added, commands run, and remaining gaps. Do not invent ten defects; repeat
critical workflows two or three times and convert only reproducible failures
into code changes.

### Final release

1. Bump extension to `0.15.0`, update changelog/docs/locales, and run all gates.
2. Package, inspect, install, and verify the exact VSIX.
3. Commit/push extension; verify release workflow and asset terminal green.
4. Update/regenerate/commit/push parent pointer; run release preflight and verify
   every GitHub gate terminal green.
5. Report installed version, release links, commit SHAs, test totals, snapshot
   matrix, live-model matrix, Docker health/log evidence, and any honest gaps.
