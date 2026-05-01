# Claw Workspace Service — Development Rules

## Service Overview

Workspace connector microservice for the ClawAI platform. Manages connections to Slack, Jira, GitHub, Figma, ClickUp, Google Drive, Gmail, Microsoft SharePoint/OneDrive, and other workspace tools. Handles OAuth2 PKCE flows, token lifecycle, delta sync, and health monitoring. Runs on port 4014 with its own PostgreSQL database (claw_workspace).

## Tech Stack

- **Runtime**: NestJS 10 with TypeScript (strict mode)
- **Database**: PostgreSQL with Prisma ORM (claw_workspace database)
- **Cache**: Redis (ioredis) — OAuth state, refresh locks
- **Messaging**: RabbitMQ (amqplib)
- **Validation**: Zod
- **Auth**: JWT via @claw/shared-auth
- **Logging**: nestjs-pino structured logging
- **Encryption**: AES-256-GCM for all OAuth tokens and API keys

## Architecture

```
Controller → Service → Repository (data access)
                     → Manager (OAuth token lifecycle, sync, health)
                     → Adapter (provider-specific API calls)
```

## Owned Tables

- WorkspaceConnector
- WorkspaceSyncRun
- WorkspaceHealthEvent

## Key Environment Variables

- `WORKSPACE_DATABASE_URL`
- `WORKSPACE_PORT` (default: 4014)
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `JIRA_CLIENT_ID`, `JIRA_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `ENCRYPTION_KEY` (shared 64-char hex)
- `REDIS_URL`, `RABBITMQ_URL`, `JWT_SECRET`

## Commands

```bash
npm run dev          # Start with hot reload
npm run build        # Production build
npm run typecheck    # TypeScript type check
npm run test         # Run unit tests
npm run migrate:dev  # Create and run migration
```

## Docker Rebuild Procedure

```bash
./scripts/claw.sh stop workspace-service
./scripts/claw.sh rm -f workspace-service
docker rmi claw-workspace-service
./scripts/claw.sh up -d --build workspace-service
```

## AI Action Approval Engine (Stream 10)

The approval queue + risk-policy engine lives under `src/modules/ai-actions/`. Architecture: [`docs/03-architecture/ai-action-approval-flow.md`](../../docs/03-architecture/ai-action-approval-flow.md).

### Key components

| Layer | File | Responsibility |
|---|---|---|
| Manager | `managers/ai-action-risk-scorer.manager.ts` | PII regex + heuristic score (0–100) → risk label |
| Manager | `managers/ai-action-policy-matcher.manager.ts` | DENY > AUTO_APPROVE > ALLOW resolution |
| Manager | `managers/ai-action-approval.manager.ts` | `enqueueSuggestion()` orchestrator — single entry point for all callers |
| Manager | `managers/ai-action-default-policy-seeder.manager.ts` | Boots 13 system policies (idempotent) |
| Manager | `managers/ai-action-queue-expiry-sweeper.manager.ts` | Cron `0 */15 * * * *` + advisory lock; expires PENDING after 24h |
| Service | `services/ai-action-policy.service.ts` | Admin CRUD on `AiActionPolicy` |
| Service | `services/ai-action-approval-queue.service.ts` | approve/reject/edit/bulk |
| Repository | `repositories/ai-action-policy.repository.ts` | data access; `findActive()` returns priority DESC |
| Repository | `repositories/ai-action-approval-queue.repository.ts` | data access; `findExpired()` powers the sweeper |

### Hard rules — never violate

1. **IMPL_PROMPT never auto-approves.** `deny-impl-prompt-auto-approve` system policy enforces this at priority 999. Stream 41 depends on it.
2. **DENY beats AUTO_APPROVE regardless of priority.** The matcher short-circuits on the first DENY hit.
3. **Admin policy regexes pass through `compilePolicyPattern`** for ReDoS defence — never use `new RegExp(userInput)` directly.
4. **System-default policies cannot be deleted via REST** (HTTP 409). Only DB direct manipulation can change them, and then they re-seed on next boot.
5. **Bulk approve excludes CRITICAL rows.** `CRITICAL_RISK_REQUIRES_INDIVIDUAL_REVIEW` is the standard reason code.
6. **Reason is required for HIGH/CRITICAL rejection** (≥10 chars) — Zod-validated at controller layer + guarded again in service.

### Calling the engine from a new caller (future streams 12, 13)

```typescript
const result = await aiActionApprovalManager.enqueueSuggestion({
  userId: user.id,
  connectorId: connector.id,
  actionKind: 'SUMMARIZE',
  provider: WorkspaceProvider.JIRA,
  draftPayload: { body: 'AI-drafted summary…' },
  generatedBy: { provider: 'OPENAI', model: 'gpt-4o' },
  sourceObjectId: ticketId,
});
// result.status ∈ { PENDING_APPROVAL, AUTO_APPROVED, DENIED }
```

### QA harness

`qa/test-stream-10-approval-engine.sh` runs 18 live API + DB checks. Master harness `qa/test-workspace-automation-full.sh` chains it.
