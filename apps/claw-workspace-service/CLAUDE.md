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

Core connector/sync: `WorkspaceConnector`, `WorkspaceSyncRun`, `SyncCadenceDefault`,
`WorkspaceHealthEvent`, `WorkspaceObject`, `WorkspaceAction`, `WorkspaceProviderDefinition`,
`WorkspaceProviderAppConfig`, `WorkspaceObjectLink`.

AI Action Approval Engine: `AiActionPolicy`, `AiActionApprovalQueue`.

Webhooks & event fabric: `WebhookDelivery`, `WorkspaceEvent`.

Auto-suggest / digest / inbox: `AutoSuggestRun`, `SuggestionDeduplication`,
`SuggestionTriggerRule`, `ImplPromptHandoff`, `DigestSnapshot`, `UserDigestPreference`.

Learned preferences: `UserAutomationPreference`.

Email drafting: `UserEmailSignature`, `UserEmailTemplate`.

Peer connector-sharing: `WorkspaceConnectorGrant`.

Chains / automations: `WorkspaceChain`, `WorkspaceChainTemplate`, `WorkspaceChainRun`,
`WorkspaceChainRunStep`.

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

| Layer      | File                                                  | Responsibility                                                          |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------------------- |
| Manager    | `managers/ai-action-risk-scorer.manager.ts`           | PII regex + heuristic score (0–100) → risk label                        |
| Manager    | `managers/ai-action-policy-matcher.manager.ts`        | DENY > AUTO_APPROVE > ALLOW resolution                                  |
| Manager    | `managers/ai-action-approval.manager.ts`              | `enqueueSuggestion()` orchestrator — single entry point for all callers |
| Manager    | `managers/ai-action-default-policy-seeder.manager.ts` | Boots 13 system policies (idempotent)                                   |
| Manager    | `managers/ai-action-queue-expiry-sweeper.manager.ts`  | Cron `0 */15 * * * *` + advisory lock; expires PENDING after 24h        |
| Service    | `services/ai-action-policy.service.ts`                | Admin CRUD on `AiActionPolicy`                                          |
| Service    | `services/ai-action-approval-queue.service.ts`        | approve/reject/edit/bulk                                                |
| Repository | `repositories/ai-action-policy.repository.ts`         | data access; `findActive()` returns priority DESC                       |
| Repository | `repositories/ai-action-approval-queue.repository.ts` | data access; `findExpired()` powers the sweeper                         |

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

## Chains / Automations (Phases 07–09)

Mechanical, multi-step automation runs against connectors, driven by a step DSL. `src/modules/chains/`.

| Layer      | File                                            | Responsibility                                                                                                                   |
| ---------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Manager    | `managers/chain-executor.manager.ts`            | Runs a chain step-by-step, resolving placeholders, dispatching to the connector adapter, persisting `WorkspaceChainRunStep` rows |
| Manager    | `managers/chain-nl-draft.manager.ts`            | Natural-language → chain-definition draft (Phase 09); human reviews and saves, never auto-runs                                   |
| Manager    | `managers/chain-orphan-run-recovery.manager.ts` | Sweeps stuck `RUNNING` runs past a cutoff for crash recovery                                                                     |
| Controller | `controllers/chain.controller.ts`               | `workspace/chains` — CRUD, `POST :id/run`, `POST :id/runs/:runId/resume`, `GET :id/runs`                                         |
| Controller | `controllers/chain-template.controller.ts`      | `workspace/chain-templates` — `GET` list, `POST :key/instantiate`                                                                |

**Hard rules:**

1. A failed step's `error` is always classified into `WorkspaceChainStepErrorClass`
   (`TRANSIENT`, `AUTH`, `RATE_LIMIT`, `VALIDATION`, `PERMISSION`, `CONFLICT`, `PERMANENT`) so a
   human deciding whether to resume can tell a worth-retrying failure from one that won't fix
   itself on retry.
2. NL-drafted chains are never auto-triggered or auto-run — a human always reviews and explicitly
   saves before a draft becomes a real, runnable chain.
3. Frontend: `apps/claw-frontend/src/app/(portal)/workspace/automations/` — the Automations page
   (Phase 08) is the only UI surface for chains; there is no separate "workflow" concept to keep in
   sync with it.

## Webhooks & Event Fabric (Phases 03, 14)

Provider webhook ingestion → durable, deduped, signature-verified delivery record → best-effort
RabbitMQ event publish. `src/modules/webhooks/`.

| Layer      | File                                               | Responsibility                                                                                                                     |
| ---------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Manager    | `managers/webhook-receiver.manager.ts`             | `receive()`: preflight (size/rate-limit) → verify → dedup → persist → publish. `replay()`: manual re-publish for a stored delivery |
| Utility    | `utilities/webhook-signature-verifiers.utility.ts` | Per-provider HMAC/token verifiers (GitHub, GitLab, Bitbucket, Slack, Jira, Figma)                                                  |
| Controller | `controllers/webhook-receiver.controller.ts`       | `POST workspace/webhooks/:provider/:connectorId`, `GET deliveries`, `POST deliveries/:id/replay`                                   |

**Hard rules:**

1. **The webhook HTTP response never depends on RabbitMQ being reachable.** `publish()` always
   catches and warn-logs — the delivery row is the durable source of truth; the event is
   best-effort. Chaos-tested in `managers/__tests__/webhook-receiver.manager.spec.ts` (Phase 15).
2. **Slack requires the `X-Slack-Request-Timestamp` skew check** (`SLACK_MAX_TIMESTAMP_SKEW_MS`,
   5 minutes) before the HMAC comparison — without it a captured, validly-signed payload can be
   replayed indefinitely, since the signature itself never expires (Phase 14).
3. Bitbucket and Jira verifiers are **honest no-op stubs** (`signatureValid: true`
   unconditionally) — neither provider's webhook model in this app has a real HMAC secret to
   verify against. Do not "fix" this without first getting a verified external API contract.
4. `replay()` marks a delivery `processedAt` even if the republish it triggers fails — there is no
   durable "replay failed" signal today (documented gap, Phase 15).

## Knowledge Graph — Object Links (Phase 10)

`WorkspaceObjectLink` rows record detected relationships between synced objects (e.g. a GitHub PR
referencing a Jira ticket). Extraction and resolution live in `src/modules/workspace/` alongside
sync (`workspace-object-link-resolution.constants.ts` + the object manager's
`detectAndCreateLinks`/`resolveLinksForObjects`) and are wired into every sync path as of Phase 10
— previously the table existed but nothing populated it.

## Learned Preferences (Phase 11)

Every AI-action approval-queue decision (`APPROVED`, `REJECTED`, `AUTO_APPROVED`, `EDITED`) is
classified and rolled up into `UserAutomationPreference`. `src/modules/learning/`.

| Layer    | File                                        | Responsibility                                                     |
| -------- | ------------------------------------------- | ------------------------------------------------------------------ |
| Manager  | `managers/preference-classifier.manager.ts` | Heuristic-v1 classification of a decision into a preference signal |
| Service  | `services/preference-upsert.service.ts`     | Upserts the rolled-up preference row                               |
| Consumer | `consumers/*`                               | RabbitMQ consumer wiring decisions into the classifier             |

Preferences feed back into AI-action generation as of Phase 11 (previously the read endpoint
existed but nothing consumed it). An LLM-backed classifier beyond today's heuristic-v1, and a
memory-service write-path fix, are out of scope for workspace-service — they belong to
memory-service's own team.

## Peer Connector-Sharing (Phase 12)

A connector owner can grant another user scoped access without transferring ownership.
`src/modules/connector-access/`.

| Layer      | File                                              | Responsibility                                                                                                                                                                            |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Service    | `services/connector-access.service.ts`            | `actionAllowed()` — maps effective access (`ConnectorAccessSource`: `OWNER`/`GRANT`/`NONE`) onto a requested `ConnectorAction` (`VIEW`/`PROPOSE_AI_ACTION`/`EDIT_CONFIG`/`MANAGE_GRANTS`) |
| Controller | `controllers/connector-grant.controller.ts`       | `workspace/connectors/:connectorId/grants` — list/create/revoke                                                                                                                           |
| Controller | `controllers/connector-grant-inbox.controller.ts` | `workspace/connectors/shared-with-me` — a grantee's own inbox view                                                                                                                        |

**Note:** true org-level RBAC (roles, org-scoped installations) needs `auth-service` schema/claims
work that doesn't exist yet — out of scope for workspace-service alone. `ConnectorAccessService.revoke()`
hard-deletes the grant row with no durable audit trail (documented gap, Phase 14).
