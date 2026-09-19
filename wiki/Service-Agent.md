# Agent Service

**Workspace:** [`apps/claw-agent-service`](https://github.com/ihabkhaled/ClawAI/tree/main/apps/claw-agent-service)  
**Port:** 4015  
**Database:** postgresql  
**Test runner:** vitest · **13 test files**  
**API endpoints:** 87

## Responsibilities and boundaries

This page is generated from the current machine-readable service, API, event, and test manifests. The service owns its process and persistence boundary; cross-service work must use explicit HTTP contracts or RabbitMQ events rather than reaching into another service's database.

## Internal dependencies

- `@claw/shared-auth`
- `@claw/shared-constants`
- `@claw/shared-rabbitmq`
- `@claw/shared-types`
- `@claw/shared-utilities`

## Data models

- `AccessPolicy`
- `ActivityMemoryEntry`
- `AgentSession`
- `AgentSuggestion`
- `CapabilityInvocation`
- `Device`
- `DeviceCodeRequest`
- `FileWatchEvent`
- `LocalRepo`
- `MarketplaceInstall`
- `MarketplaceListing`
- `Organization`
- `OrganizationMember`
- `OrganizationPolicy`
- `PairingRequest`
- `Recipe`
- `RecipeRun`
- `RecipeRunStep`
- `RefreshToken`
- `ScheduledCommand`
- `TerminalCommand`

## HTTP API

| Method | Route | Source |
|---|---|---|
| `GET` | `/agent/activity-memory` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts) |
| `POST` | `/agent/activity-memory` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts) |
| `POST` | `/agent/auth/device-code/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/device-code/create` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/device-code/deny` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/device-code/token` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/pair/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/pair/deny` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/pair/init` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/pair/poll` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `POST` | `/agent/auth/refresh` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| `GET` | `/agent/capabilities` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `GET` | `/agent/capabilities/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/:id/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/:id/rollback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/capabilities/bulk-approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `GET` | `/agent/capabilities/dual-write-status` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| `POST` | `/agent/cli-capabilities/:id/complete` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts) |
| `GET` | `/agent/cli-capabilities/pending` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts) |
| `GET` | `/agent/commands` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `POST` | `/agent/commands` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `GET` | `/agent/commands/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `POST` | `/agent/commands/:id/approve` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `POST` | `/agent/commands/:id/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| `POST` | `/agent/commands/:id/chunks` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| `POST` | `/agent/commands/:id/complete` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `POST` | `/agent/commands/:id/reject` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `POST` | `/agent/commands/:id/stream` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| `GET` | `/agent/commands/pending` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| `GET` | `/agent/devices` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| `GET` | `/agent/devices/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| `PATCH` | `/agent/devices/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| `POST` | `/agent/devices/:id/revoke` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| `GET` | `/agent/events` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts) |
| `POST` | `/agent/events` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts) |
| `GET` | `/agent/marketplace/listings` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `POST` | `/agent/marketplace/listings` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `GET` | `/agent/marketplace/listings/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `GET` | `/agent/marketplace/listings/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `GET` | `/agent/marketplace/listings/:id/analyse` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `POST` | `/agent/marketplace/listings/:id/install` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `POST` | `/agent/marketplace/listings/:id/republish` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `POST` | `/agent/marketplace/listings/:id/unpublish` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `GET` | `/agent/marketplace/listings/mine` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| `GET` | `/agent/organizations` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `POST` | `/agent/organizations` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `GET` | `/agent/organizations/:id/devices` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `GET` | `/agent/organizations/:id/members` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `POST` | `/agent/organizations/:id/members` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `GET` | `/agent/organizations/:id/policy` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `PUT` | `/agent/organizations/:id/policy` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `POST` | `/agent/organizations/:slug/sso/callback` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts) |
| `POST` | `/agent/organizations/:slug/sso/metadata` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts) |
| `GET` | `/agent/organizations/policy/effective` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| `GET` | `/agent/recipes` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| `POST` | `/agent/recipes` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| `DELETE` | `/agent/recipes/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| `GET` | `/agent/recipes/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| `GET` | `/agent/recipes/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| `PATCH` | `/agent/recipes/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| `POST` | `/agent/recipes/:id/cancel` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| `GET` | `/agent/recipes/:id/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| `POST` | `/agent/recipes/:id/runs` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| `GET` | `/agent/repos` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| `POST` | `/agent/repos` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| `DELETE` | `/agent/repos/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| `GET` | `/agent/repos/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| `PATCH` | `/agent/repos/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| `GET` | `/agent/runtime/protocol` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/runtime-protocol.controller.ts) |
| `GET` | `/agent/scheduled-commands` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| `POST` | `/agent/scheduled-commands` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| `DELETE` | `/agent/scheduled-commands/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| `PATCH` | `/agent/scheduled-commands/:id/status` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| `GET` | `/agent/sessions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `POST` | `/agent/sessions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `DELETE` | `/agent/sessions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `GET` | `/agent/sessions/:id` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `POST` | `/agent/sessions/:id/heartbeat` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `POST` | `/agent/sessions/attach` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| `GET` | `/agent/suggestions` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts) |
| `POST` | `/agent/suggestions/:id/review` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts) |
| `GET` | `/health` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/health/health.controller.ts) |
| `POST` | `/internal/agent/terminal/seed-command` | [source](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-terminal-internal.controller.ts) |

## Events produced

| Pattern | Consumers |
|---|---|
| `agent.capability.approved` | `claw-audit-service` |
| `agent.capability.auto_approved` | `claw-audit-service` |
| `agent.capability.cancelled` | `claw-audit-service` |
| `agent.capability.denied` | `claw-audit-service` |
| `agent.capability.executed` | `claw-audit-service` |
| `agent.capability.expired` | `claw-audit-service` |
| `agent.capability.failed` | `claw-audit-service` |
| `agent.capability.policy_matched` | `claw-audit-service` |
| `agent.capability.proposed` | `claw-audit-service` |
| `agent.capability.rejected` | `claw-audit-service` |
| `agent.capability.rolled_back` | `claw-audit-service` |
| `agent.command_approved` | — |
| `agent.command_cancelled` | — |
| `agent.command_completed` | — |
| `agent.command_rejected` | — |
| `agent.command_requested` | — |
| `agent.device_paired` | `claw-audit-service` |
| `agent.device_revoked` | `claw-audit-service` |
| `agent.policy_violated` | `claw-audit-service` |
| `agent.session_connected` | `claw-audit-service` |
| `agent.session_disconnected` | `claw-audit-service` |
| `agent.token_reuse_detected` | `claw-audit-service` |
| `agent.token_rotated` | `claw-audit-service` |
| `log.server` | — |

## Events consumed

| Pattern | Producers |
|---|---|
| `agent.capability.executing` | — |

## Where to go next

- [[Backend-Services]] for the platform-wide service catalog.
- [[API-Reference]] for cross-service API documentation.
- [[Event-Bus]] for messaging conventions and reliability.
- [[Database-Reference]] for storage ownership.
- [Workspace AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/AGENTS.md) for generated, service-local agent context.
