# Claw Agent Service — Development Rules

## Service Overview

Desktop agent runtime microservice for the ClawAI platform. Manages local agent sessions, terminal command approval flows, repository awareness, and filesystem events. Runs on port 4015 with its own PostgreSQL database (claw_agent).

## Tech Stack

- Runtime: NestJS 11 with TypeScript (strict mode)
- Database: PostgreSQL with Prisma ORM (claw_agent database)
- Cache: Redis (ioredis) — session state
- Messaging: RabbitMQ (amqplib)
- Scheduler: @nestjs/schedule — cleanup expired commands/sessions
- Validation: Zod
- Auth: JWT via @claw/shared-auth (user endpoints) + AgentKeyGuard (agent endpoints)
- Logging: nestjs-pino structured logging

## Architecture

Controller → Service → Repository (data access)
→ Manager (background cleanup, atomic transitions)

## Owned Tables

- AgentSession
- TerminalCommand
- LocalRepo
- FileWatchEvent
- Device (Phase A)
- RefreshToken (Phase A)
- PairingRequest (Phase A)
- DeviceCodeRequest (Phase A)
- AccessPolicy (Phase B)

## Key Environment Variables

- AGENT_DATABASE_URL
- AGENT_PORT (default: 4015)
- REDIS_URL, RABBITMQ_URL, JWT_SECRET, ENCRYPTION_KEY
- AGENT_ACCESS_TTL_SECONDS (default 900), AGENT_REFRESH_TTL_DAYS (default 30),
  AGENT_PAIRING_TTL_SECONDS (default 120), AGENT_DEVICE_CODE_TTL_SECONDS (default 900),
  AGENT_REFRESH_GRACE_SECONDS (default 15)

## Authentication Dual Mode

- User-facing endpoints: JWT via @claw/shared-auth AuthGuard
- CLI pairing & auth: public + body-bound Zod DTOs (see /auth/pair/_, /auth/device-code/_, /auth/refresh)
- Agent runtime endpoints (heartbeat / commands / events): @Public() + @UseGuards(CompatAgentGuard)
  — tries DeviceAccessGuard first (device JWT), then AgentKeyGuard (legacy sessionKey).
  Legacy responses carry Deprecation + Sunset headers.
- Scope enforcement (Phase B): @RequireScopes(DeviceScope.SHELL_EXEC) applied to
  /commands/pending and /commands/:id/complete; DeviceScope.SESSIONS_READ applied to
  /sessions/attach. ScopeGuard is permissive when deviceContext is absent (legacy path).
- CompatAgentGuard bridges device tokens to agentSession by reading sessionId from
  query / body / path (/sessions/:id) so existing session-scoped controllers keep working.

## Phase B — Policy Engine

- AccessPolicy table with PolicyKind (ALLOW, DENY, AUTO_APPROVE) + RiskLabel (LOW, MEDIUM,
  HIGH, CRITICAL). 13 default policies seeded at startup.
- CommandRiskService scores every createCommand: heuristic base score + highest-priority
  policy match. DENY → REJECTED + blockedByPolicy. AUTO_APPROVE → APPROVED + autoApproved.
- New event: agent.policy_violated (published on DENY).
- Default policies in src/common/constants/policy.constants.ts (admin-editable later).

## Commands

npm run dev # Start with hot reload
npm run build # Production build
npm run typecheck # TypeScript type check
npm run test # Run unit tests
npm run migrate:dev # Create and run migration

## Docker Rebuild Procedure

./scripts/claw.sh stop agent-service
./scripts/claw.sh rm -f agent-service
docker rmi claw-agent-service
./scripts/claw.sh up -d --build agent-service

## Capability Framework (Phase E flagship — added 2026-04-26)

In progress; backbone files landed in this session, full implementation tracked in `docs/15-ai-context/desktop-agent-flagship-implementation-progress.md`.

Files added so far:
- `prisma/schema.prisma` — `CapabilityInvocation` model + 5 new enums + `AccessPolicy` extensions (additive)
- `prisma/migrations/20260501053343_add_capability_invocation_unify_policy/migration.sql` — applied to `claw-pg-agent` on 2026-05-01
- `src/common/enums/capability-{class,operation,blast-radius,reversibility,invocation-status}.enum.ts`
- `src/common/constants/capability.constants.ts` — risk weights, thresholds, expiry/timeout defaults, dual-write env flag
- `src/common/constants/capability-policy.constants.ts` — 18 default `AccessPolicy` seeds for FILESYSTEM + PROCESS + catch-all (more added per stream)
- `src/common/types/recipe-parser.types.ts` — RecipeToken / RecipeParserCursor / RecipeExpressionContext extracted types
- `src/modules/agent/types/capability.types.ts` — CapabilityDescriptor, RiskAssessment, UndoPlan, Lineage, PaginatedCapabilities
- `src/modules/agent/services/capability-risk.service.ts` + `capability.service.ts` + `command-risk.service.ts` (dual-write)
- `src/modules/agent/managers/capability-approval.manager.ts` + `capability-expiry-sweeper.manager.ts`
- `src/modules/agent/repositories/capability-invocation.repository.ts`
- `src/modules/agent/controllers/capability.controller.ts` + `capability-cli.controller.ts`
- `src/modules/agent/dto/{propose,complete,list-capabilities-query,reject,cancel,rollback}-capability.dto.ts`
- `src/modules/agent/services/__tests__/capability-risk.service.spec.ts` — 16 unit tests, all green
- `src/modules/recipes/dto/recipe-dsl.dto.ts` — Zod schema for recipe DSL
- `src/modules/recipes/types/recipe.types.ts`
- `src/common/utilities/recipe-expression.utility.ts` — safe expression evaluator (NOT eval / vm)
- `src/common/constants/recipe.constants.ts`

Existing terminal-command flow unchanged. Dual-write to CapabilityInvocation gated by env `CAPABILITY_DEPRECATED_TERMINAL_COMMAND_DUAL_WRITE` (default true) — flip to false after 4-week soak.

Stream 10 status: **landed and validated end-to-end**. Migration applied, typecheck/lint/test green, Docker rebuilt and healthy, `qa/test-stream-10-capability-framework.sh` 28/28 passing.

Stream 11 status: **FILESYSTEM CLI provider landed** (`agent-cli/src/capability-providers/filesystem/index.js`). 8 operations + traversal protection + undoPlan capture. Smoke-tested locally; cross-OS smoke against real hardware deferred.

Stream 12 status: **PROCESS CLI provider landed** (`agent-cli/src/capability-providers/process/index.js`). 4 operations + cross-OS process listing via `tasklist`/`ps`. Smoke-tested locally.

Stream 13 status: **Recipe CRUD landed** — Recipe / RecipeRun / RecipeRunStep schema, `recipes/` NestJS module (controller + service + repo + 8 unit tests), `qa/test-stream-13-recipes-crud.sh` 16/16 passing. Recipe RUNNER orchestration deferred (event-driven design needs review).

Remaining for next sessions:

1. Cross-OS smoke of the agent-cli capability-runner + FS/PROCESS providers against paired real devices.
2. Stream 13 — recipe runner orchestration manager.
3. Streams 20–24 capability providers (browser/screen/clipboard/application/audio).
4. Stream 30 Tauri shell; 31–32 UX; 40–42 fleet/intelligence/marketplace; 50 QA harness; 60 runbooks.

