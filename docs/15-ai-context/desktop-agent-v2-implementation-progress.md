# Desktop Agent V2 Flagship — Implementation Progress

> Source pack: `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/` (13 streams)
> Started: 2026-05-24
> Branch: `feature/desktop-agent-v2`
> Worktree: `D:/Freelance/Claw-desktop-agent-v2`
>
> Companion to `desktop-agent-flagship-implementation-progress.md`
> (which tracks V1 completion). V1 closed with Round 11 on 2026-05-07
> (104 jest tests, 6 live QA scripts, ~12 runbooks).

This document tracks what V2 shipped in a single sustained session on
2026-05-24 plus the deliberately deferred items that future sessions
should pick up.

## V2 stream landings

### Stream 01 — Foundation closeout

**Goal:** retire terminal dual-write, close audit-coverage gap, finish
recipe runner edge cases, raise backend test coverage.

| Item                                                                                          | Status                                                              |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Fix `RecipeRunStatus` type alias mismatch (used `COMPLETED`/`ROLLED_BACK`; Prisma is `SUCCEEDED`/`TIMED_OUT`)| DONE — deleted dead aliases in `apps/claw-agent-service/src/modules/recipes/types/recipe.types.ts`; runtime untouched |
| 7 missing agent.* event payload types in shared-types                                         | DONE — `packages/shared-types/src/events/agent-lifecycle-events.types.ts` (7 types + union) |
| 7 missing audit handlers (session_connected/disconnected, device_paired/revoked, token_rotated/reuse, policy_violated) | DONE — `apps/claw-audit-service/src/modules/audits/managers/audit-event.manager.ts` (`agentLifecycleEventSubscriptions` + 7 handler methods) |
| Dual-write metrics service + status endpoint + retirement runbook                             | DONE — `CapabilityDualWriteMetricsService` + `GET /agent/capabilities/dual-write-status` + `docs/15-ai-context/desktop-agent-dual-write-retirement.md` |
| Recipe runner dry-run mode (DTO + Prisma migration + runner branch + test)                    | DONE — `RecipeRun.dryRun` column (migration `20260524120000_add_recipe_run_dryrun`); runner short-circuits to `completeDryRunStep`; new test in `recipe-runner.manager.spec.ts` |
| Backfill tests — `capability-dual-write-metrics.service.spec.ts` (8 cases)                    | DONE                                                                |
| Backfill tests — `command-risk.service.spec.ts` (6 cases covering legacy + dual-write + flag toggle + capability path error) | DONE                                                                |
| Foundation-closeout QA script `qa/test-foundation-closeout.sh`                                | DONE — gitignored; lives in operator's `qa/` dir                    |
| `.env.example` updated with `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE`               | DONE                                                                |
| Deprecation log on every `CommandRiskService` boot                                            | DONE — `OnModuleInit` warns when flag is true, logs success when false |
| `DUAL_WRITE_RECENT_DIVERGENCE_RING_SIZE` / `DUAL_WRITE_MIN_DECISIONS_BEFORE_RETIREMENT` extracted to capability.constants.ts | DONE                                                                |

### Stream 02 — Cross-OS provider hardening

| Item                                                                                | Status                                                        |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `probe-helpers.js` shared module (`whichBinary`, `readBinaryVersion`, `canDynamicallyImport`, `osFamily`, `dep`, `probeHealthy`) | DONE — `agent-cli/src/capability-providers/probe-helpers.js` |
| `probe()` added to all 9 providers (TERMINAL, FILESYSTEM, PROCESS, BROWSER, SCREEN, CLIPBOARD, NOTIFICATION, APPLICATION, AUDIO) | DONE                                                          |
| Doctor command (`claw-agent doctor`) wires every provider probe, gates core (TERMINAL/FILESYSTEM/PROCESS) vs optional | DONE — `agent-cli/src/commands/doctor.command.js`             |
| Per-recipe browser profile isolation                                                | DONE — `browser/index.js` keys persistent context by `recipeRunId`; `capability-runner.js` passes `recipeRunId` through |
| Cross-OS evidence runbook                                                           | DONE — `docs/11-runbooks/runbook-cross-os-evidence.md`        |
| `qa/test-providers-cross-os.sh` — per-OS smoke + evidence template                  | DONE — gitignored                                             |

**Deferred (operator action required):** real per-OS smoke runs against
Windows + macOS + Linux hardware, evidence files filed under
`.claude/Integrations/cross-os-evidence/`.

### Stream 03 — Recipe runner UX

| Item                                                                              | Status |
| --------------------------------------------------------------------------------- | ------ |
| `claw-agent run-recipe <recipeId>` CLI command (`--device`, `--param`, `--dry-run`, `--watch`, `--json`) | DONE — `agent-cli/src/commands/run-recipe.command.js`         |
| `parseArgs` repeat-flag fix (`--param k=v --param j=w` collects to array)         | DONE — `agent-cli/src/bin/claw-agent.js`                      |
| Frontend `StartRunRequest.dryRun?: boolean` + `RecipeRun.dryRun: boolean`         | DONE — `apps/claw-frontend/src/types/recipe.types.ts`         |
| CLI version bumped 2.1.0-phase-b → 2.2.0-desktop-agent-v2                          | DONE                                                          |

**Deferred:** recipe visual builder UI at `/agent/recipes/[id]/edit` (~3 weeks UI work); frontend dry-run toggle widget on the recipe detail page (detail page itself doesn't exist yet — landed in V2.1 plan).

### Stream 04 — Tauri shell hardening + auto-update

| Item                                                                | Status                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------- |
| Tray menu expanded with V2 items (palette, dashboard/approvals/recipes/marketplace, runner pause/resume submenu, pair-device, check-update, settings, quit) | DONE — `agent-cli/src-tauri/src/tray.rs`              |
| Tray tooltip background refresher (`set_tooltip` every 30s with pending count) | DONE                                                  |
| `tauri-plugin-updater` v2 added to Cargo.toml                       | DONE                                                  |
| `updater.rs` module — boot-time check + tray-menu check             | DONE — `agent-cli/src-tauri/src/updater.rs`           |
| `tauri.conf.json` updater section (endpoint, dialog=false, installMode=passive, pubkey placeholder) | DONE                                                  |
| Tauri shell version bump 2.1.0 → 2.2.0                              | DONE                                                  |
| Release runbook covering toolchain install + signing + per-OS build + `latest.json` shape + rollback | DONE — `docs/11-runbooks/runbook-tauri-shell-release.md` |

**Deferred:** real Tauri build on a machine with the toolchain installed; signed bundles to a real CDN; user-supplied pubkey rotation.

### Stream 05 — Activity memory cloud sync + suggestions

| Item                                                                         | Status                                                                  |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI background `runCloudSyncLoop` (gated by `CLAW_ACTIVITY_CLOUD_SYNC=true`) | DONE — `agent-cli/src/runtime/cloud-sync.js`; wired into `start.command.js` |
| `AgentSuggestion` Prisma model + migration `20260524123000_add_agent_suggestions` | DONE                                                                    |
| `AgentSuggestionRepository` (upsert pending, list, set status, sweep expired, scanActivityGroups via raw SQL) | DONE                                                                    |
| `AgentSuggestionManager` (cron `0 7 * * * *`, groups by userId+kind, emits PENDING when count ≥ 5 in 7 days) | DONE                                                                    |
| `AgentSuggestionController` with `GET /agent/suggestions` + `POST /agent/suggestions/:id/review` | DONE                                                                    |
| `AgentSuggestionStatusEnum` (PENDING / ACCEPTED / DISMISSED / EXPIRED)       | DONE                                                                    |

**Deferred:** "accept → auto-generate a Recipe from the suggestion" wiring; frontend list/dismiss UI.

### Stream 06 — Marketplace publisher portal

| Item                                                                                  | Status                                          |
| ------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `GET /agent/marketplace/listings/mine` — listings owned by current user               | DONE                                            |
| `POST /agent/marketplace/listings/:id/unpublish` — set status=HIDDEN                  | DONE                                            |
| `POST /agent/marketplace/listings/:id/republish` — set status=PUBLISHED               | DONE                                            |
| Repository methods `listForPublisher`, `setListingStatus`                             | DONE                                            |
| Service methods `listForPublisher`, `setStatus`                                       | DONE                                            |

**Deferred:** publisher-portal frontend page (lists + manage + draft → publish flow); install audit log (extension to existing audit handlers).

### Stream 07 — Fleet enterprise SSO + device governance

| Item                                                                          | Status                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Production-IdP rollout runbook (Okta/Entra/Auth0)                             | DONE — `docs/11-runbooks/runbook-fleet-enterprise-sso.md`       |
| Device-matrix endpoint `GET /agent/organizations/:id/devices`                 | DONE — joins org → members → devices with pending-cap subquery  |
| `DeviceMatrixRow` type extracted to `types/device-matrix.types.ts`            | DONE                                                            |
| Repository method `listDevicesForOrganization` using raw query                | DONE                                                            |

**Deferred:** mass-revoke endpoint (`POST /agent/organizations/:id/devices/revoke-all` with reason string); production IdP integration testing against real tenant creds.

### Stream 08 — Live agent UX (SSE + bulk approval)

| Item                                                                                 | Status                                                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `SkipLogging` decorator (mirror of chat-service)                                     | DONE — `apps/claw-agent-service/src/common/decorators/skip-logging.decorator.ts` |
| `CapabilityEventBusService` — RxJS Subject fanout for all 11 CAPABILITY_* events     | DONE                                                                  |
| `CapabilityStreamController` — `@Sse('stream')` filtered by userId, with `@SkipLogging` + `@SkipThrottle` | DONE                                                                  |
| `BulkApproveCapabilityDto` (max 100 ids) + service method + controller endpoint      | DONE — `POST /agent/capabilities/bulk-approve`                        |
| `CapabilityStreamEvent` + `BulkApproveResult` types                                  | DONE                                                                  |

**Deferred:** frontend SSE consumer hook (`useCapabilityEventStream`) + bulk-approve UI on the capability queue page; capability detail page at `/agent/capabilities/[id]`.

### Stream 09 — OS control add-ons

| Item                                                                                   | Status                                                          |
| -------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| SYSTEM capability provider stub (LOCK, SUSPEND, NETWORK_INFO, DISK_USAGE, TIMEZONE)   | DONE — `agent-cli/src/capability-providers/system/index.js`     |
| Cross-OS shell-out per op (pmset on macOS, rundll32/powershell on Windows, loginctl/systemctl on Linux) | DONE                                                            |
| Probe with optional dependencies                                                       | DONE                                                            |
| Registered in `providerRegistry`                                                       | DONE                                                            |

**Deferred:** window-management extensions to APPLICATION provider (MINIMIZE/MAXIMIZE/MOVE/RESIZE); IDLE detection (separate IDLE class); per-OS default policy rows for SYSTEM (currently relies on heuristic risk score).

### Stream 10 — Release channels + auto-update

| Item                                                                              | Status                                                                  |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Release channel runbook (stable/beta/canary, CI workflow scaffold, latest.json schema, rollback) | DONE — `docs/11-runbooks/runbook-desktop-agent-release-channels.md`     |
| Tauri updater plumbing — covered by Stream 04                                     | DONE                                                                    |

**Deferred:** real CI workflow YAML committed under `.github/workflows/desktop-agent-release.yml`; CDN account + bucket + IAM setup; pubkey rotation procedure.

### Stream 11 — Security/privacy/sandboxing sweep

| Item                                                                                                 | Status                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Capability hard-denylist constants (rm -rf /, fork bombs, kill PID 1, file:// URLs, dangerous deletes) | DONE — `apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts` |
| Pino redact paths extended for capability framework (target/payload/dsl/result fields with creds, SAML, signatures) | DONE — `apps/claw-agent-service/src/app/app.module.ts`                  |
| Security runbook covering all 7 defense layers + incident-response procedure                         | DONE — `docs/11-runbooks/runbook-desktop-agent-security.md`             |

**Deferred:** runtime denylist enforcement in `CapabilityRiskService.assess` (today the constants are declared but the assess() method doesn't yet match against `targetRegex`); per-tier custom-denylist UI for enterprise tier.

### Stream 12 — QA / UAT release-gate matrix

| Item                                                                                   | Status                                                                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Per-channel quality bar table (canary/beta/stable × 15+ checks)                        | DONE — `docs/11-runbooks/runbook-desktop-agent-qa-release-gate.md`        |
| Regression matrix mapping stream change → required suite                               | DONE                                                                      |
| Release-engineer sign-off rules                                                        | DONE                                                                      |

**Deferred:** new master QA harness extension (`qa/test-desktop-agent-master.sh` already exists from V1; adding V2 streams to it is incremental).

### Stream 13 — Business roadmap + positioning

| Item                                                                              | Status                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Personas + tier-feature matrix + monetization (Free/Pro/Team/Enterprise)          | DONE — `docs/02-business-product/desktop-agent-v2-roadmap-and-positioning.md`   |
| Roadmap Q3 2026 / Q4 2026 / Q1 2027                                               | DONE                                                                            |
| Competitive positioning vs Zapier / OS-native AI / Open-Interpreter               | DONE                                                                            |
| Success metrics (8 KPIs) + risks + open questions                                 | DONE                                                                            |

## Total V2 surface

**Files added (38):**

- `packages/shared-types/src/events/agent-lifecycle-events.types.ts`
- `apps/claw-agent-service/src/modules/agent/services/capability-dual-write-metrics.service.ts`
- `apps/claw-agent-service/src/modules/agent/services/capability-event-bus.service.ts`
- `apps/claw-agent-service/src/modules/agent/types/capability-dual-write.types.ts`
- `apps/claw-agent-service/src/modules/agent/types/capability-stream.types.ts`
- `apps/claw-agent-service/src/modules/agent/controllers/capability-stream.controller.ts`
- `apps/claw-agent-service/src/modules/agent/dto/bulk-approve-capability.dto.ts`
- `apps/claw-agent-service/src/modules/agent/services/__tests__/capability-dual-write-metrics.service.spec.ts`
- `apps/claw-agent-service/src/modules/agent/services/__tests__/command-risk.service.spec.ts`
- `apps/claw-agent-service/src/modules/activity-memory/constants/suggestion.constants.ts`
- `apps/claw-agent-service/src/modules/activity-memory/types/suggestion.types.ts`
- `apps/claw-agent-service/src/modules/activity-memory/enums/agent-suggestion-status.enum.ts`
- `apps/claw-agent-service/src/modules/activity-memory/repositories/agent-suggestion.repository.ts`
- `apps/claw-agent-service/src/modules/activity-memory/managers/agent-suggestion.manager.ts`
- `apps/claw-agent-service/src/modules/activity-memory/dto/suggestion.dto.ts`
- `apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts`
- `apps/claw-agent-service/src/modules/fleet/types/device-matrix.types.ts`
- `apps/claw-agent-service/src/common/decorators/skip-logging.decorator.ts`
- `apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts`
- `apps/claw-agent-service/prisma/migrations/20260524120000_add_recipe_run_dryrun/migration.sql`
- `apps/claw-agent-service/prisma/migrations/20260524123000_add_agent_suggestions/migration.sql`
- `agent-cli/src/capability-providers/probe-helpers.js`
- `agent-cli/src/capability-providers/system/index.js`
- `agent-cli/src/commands/run-recipe.command.js`
- `agent-cli/src/runtime/cloud-sync.js`
- `agent-cli/src-tauri/src/updater.rs`
- `qa/test-foundation-closeout.sh` (gitignored)
- `qa/test-providers-cross-os.sh` (gitignored)
- `docs/15-ai-context/desktop-agent-dual-write-retirement.md`
- `docs/15-ai-context/desktop-agent-v2-implementation-progress.md` (this file)
- `docs/11-runbooks/runbook-cross-os-evidence.md`
- `docs/11-runbooks/runbook-tauri-shell-release.md`
- `docs/11-runbooks/runbook-fleet-enterprise-sso.md`
- `docs/11-runbooks/runbook-desktop-agent-release-channels.md`
- `docs/11-runbooks/runbook-desktop-agent-security.md`
- `docs/11-runbooks/runbook-desktop-agent-qa-release-gate.md`
- `docs/02-business-product/desktop-agent-v2-roadmap-and-positioning.md`

**Files modified (~20):**

- Schema + migrations: `prisma/schema.prisma` (recipe-run dryRun + AgentSuggestion + enum)
- Audit: `apps/claw-audit-service/src/modules/audits/managers/audit-event.manager.ts` (7 new handlers)
- Capability: `command-risk.service.ts`, `capability.service.ts`, `capability.controller.ts`, `agent.module.ts`, `capability.constants.ts`
- Recipes: `recipe-runner.manager.ts`, `recipe.types.ts`, `start-run.dto.ts`, `recipe-runner.manager.spec.ts`
- Activity memory: `activity-memory.module.ts`
- Marketplace: `marketplace.controller.ts`, `marketplace.service.ts`, `marketplace.repository.ts`
- Fleet: `fleet.controller.ts`, `organization.repository.ts`
- Tauri: `tray.rs`, `main.rs`, `Cargo.toml`, `tauri.conf.json`
- CLI: `bin/claw-agent.js`, `start.command.js`, `doctor.command.js`, `capability-runner.js`, every `capability-providers/*/index.js`
- Frontend: `types/recipe.types.ts`
- Config: `.env.example`
- Shared types: `events/index.ts`

## Known gaps after this session

Bundled here so the next session has a clean punch list:

1. **Frontend pages** — Stream 03 visual builder, Stream 06 publisher portal page, Stream 08 SSE consumer + bulk-approve UI, Stream 05 suggestion list/dismiss UI, Stream 09 window-management UI.
2. **Backend** — runtime enforcement of `CAPABILITY_HARD_DENYLIST` inside `CapabilityRiskService.assess` (the constants are declared but unused); mass-revoke endpoint for fleet; suggestion → recipe materialisation on accept.
3. **CI** — actual `.github/workflows/desktop-agent-release.yml` file (the runbook contains the YAML).
4. **Operations** — cross-OS evidence runs on real Win/macOS/Linux hardware; production IdP smoke against Okta/Entra/Auth0 tenants; updater pubkey generation + CDN bucket setup.
5. **Tests** — npm install + `npm run typecheck` + `npm run test` against this branch (the worktree has no node_modules; typecheck deferred to first build).
6. **Verification** — Docker rebuild + live QA scripts run against the new stack to confirm everything boots; pre-commit hook run before merge.

## Migrations to apply

Two new migrations need `npx prisma migrate deploy` against `claw-pg-agent`:
1. `20260524120000_add_recipe_run_dryrun`
2. `20260524123000_add_agent_suggestions`

## Branch + commit info

- Branch: `feature/desktop-agent-v2` (cut from `main` at 7bf1a508)
- Worktree: `D:/Freelance/Claw-desktop-agent-v2`
- Other concurrent worktrees (no overlap): `feature/hf-search`, `feat/tls-everywhere`, `feature/routing-flagship-implementation`, `feat/memory-context-v2`
- This document + the branch land together in one commit; the actual `git commit + push` is the final step of this session.

## See also

- V1 progress: `desktop-agent-flagship-implementation-progress.md`
- Plan pack: `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/`
- Master plan order: `plan-prompts/ClawAI_desktop_agent_v2_flagship_pack/INDEX.md`
