---
name: add-workspace-connector
summary: Add a workspace-service connector (OAuth2/PKCE, webhook, idempotent sync) with secrets kept backend-side.
task_keywords:
  [
    workspace connector,
    oauth2,
    pkce,
    github gitlab jira slack drive gmail confluence figma bitbucket clickup,
    webhook,
    sync job,
    idempotent sync,
    rate limit,
    workspace-service,
    provider app config,
  ]
applies_to: [backend, apps/claw-workspace-service/src/modules]
required_rules: [08-security-rules, 02-backend-rules]
required_context: [ai-context-pack, service-guide-workspace, workspace-automation]
affected_workspaces: [apps/claw-workspace-service, packages/shared-types]
required_tests: [oauth flow spec, webhook handler spec, sync idempotency spec, qa matrix]
required_docs:
  [docs/03-architecture/workspace-automation.md, docs/04-backend/service-guide-workspace.md]
validation_lane: cd apps/claw-workspace-service && npm run typecheck && npm run lint && npm test && npm run build
---

# Skill: Add a Workspace Connector

workspace-service (port 4014) integrates external productivity tools (GitHub, GitLab, Jira, Slack, Drive, OneDrive, SharePoint, Confluence, Figma, Gmail, Bitbucket, ClickUp) via OAuth2/PKCE, webhooks, and scheduled sync. OAuth secrets never leave the backend; sync jobs are idempotent and rate-limited.

## When to use

- Onboarding a new SaaS/productivity provider that needs OAuth, webhook ingestion, and background sync.

## When NOT to use

- It is an upstream AI/LLM provider → use [`./add-provider-connector.md`](./add-provider-connector.md).
- The integration needs no user auth or sync → a simpler HTTP call may suffice.

## Read first

- [`./resolve-task-context.md`](./resolve-task-context.md).
- [`../rules/08-security-rules.md`](../rules/08-security-rules.md) — Secrets Management, Auth.
- [`../docs/04-backend/service-guide-workspace.md`](../docs/04-backend/service-guide-workspace.md), [`../docs/03-architecture/workspace-automation.md`](../docs/03-architecture/workspace-automation.md).

## Repository discovery steps

1. Read an existing connector implementation in workspace-service (e.g. GitHub or Jira) for the OAuth/PKCE, webhook, and sync-job shape.
2. Check the provider-app-config model (admin-created, sanitised without `encryptedSecret` on read) and the `WORKSPACE_*` permissions.
3. Review the rate-limit + suggestion-factory gates (`WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE`, `WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR`).

## Tests-first plan

- OAuth flow spec: authorize URL with PKCE challenge, code exchange stores encrypted tokens.
- Webhook spec: signature/verification, over-cap returns `RATE_LIMITED`.
- Sync idempotency spec: replaying the same sync produces no duplicate records.
- QA matrix: connect/read/sync/action endpoints; assert `encryptedSecret`/`encryptedTokens` never appear in responses.

## Implementation steps

1. Add the provider to the workspace connector enum (and `packages/shared-types` where cross-service).
2. Implement OAuth2 with PKCE: authorize + callback; store access/refresh tokens AES-256-GCM encrypted; rotate refresh tokens.
3. Implement the webhook handler: verify signatures, validate payload with a Zod DTO, enforce the per-connector rate limit.
4. Implement background sync as an idempotent, rate-limited job; emit `workspace.sync.*` events (run_started/completed/failed/rate_limited/…) from the service layer — see [`./add-rabbitmq-event.md`](./add-rabbitmq-event.md).
5. Gate endpoints with `WORKSPACE_*` permissions from `@claw/shared-auth`; USER gets read/connect-own, mutation stays admin-gated (see [`./add-permission.md`](./add-permission.md)).
6. Strip all encrypted secrets in the repository response mapping.

## Security considerations

- OAuth client secrets + tokens stay backend-side, AES-256-GCM encrypted, never returned to the FE.
- Verify webhook signatures before processing; validate every payload (never trust inbound data).
- Rate-limit webhooks and sync to prevent abuse/DoS; idempotency prevents replay side effects.

## Failure modes

- Leaking `encryptedSecret`/`encryptedTokens` in a response → critical exposure blocker.
- Non-idempotent sync → duplicate records on retry.
- Missing signature verification → forged webhook processing.

## Validation commands

```bash
cd apps/claw-workspace-service && npm run typecheck && npm run lint && npm test && npm run build
```

## Documentation updates

- Update `docs/03-architecture/workspace-automation.md`, `docs/04-backend/service-guide-workspace.md`, and the workspace connector list in root `CLAUDE.md`.

## Definition of done

- OAuth2/PKCE + webhook + idempotent rate-limited sync, secrets encrypted and never exposed, `workspace.sync.*` events emitted, tests + QA matrix green, docs updated.
