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

docker compose -f docker-compose.dev.yml stop agent-service
docker compose -f docker-compose.dev.yml rm -f agent-service
docker rmi claw-agent-service
docker compose -f docker-compose.dev.yml up -d --build agent-service
