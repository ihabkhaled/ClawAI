# claw-agent-service

| Property | Value |
| --- | --- |
| Directory | [apps/claw-agent-service](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service) |
| Port | 4015 |
| Database | postgresql |
| Endpoints | 87 |
| Tests | 13 |
| Runner | vitest |
| Internal packages | @claw/shared-auth, @claw/shared-constants, @claw/shared-rabbitmq, @claw/shared-types, @claw/shared-utilities |

## Modules
- `activity-memory`
- `agent`
- `fleet`
- `health`
- `marketplace`
- `recipes`

## Persistence models
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

## API
| Method | Route | Source |
| --- | --- | --- |
| GET | `/agent/activity-memory` | [src/modules/activity-memory/controllers/activity-memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts) |
| POST | `/agent/activity-memory` | [src/modules/activity-memory/controllers/activity-memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts) |
| POST | `/agent/auth/device-code/approve` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/device-code/create` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/device-code/deny` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/device-code/token` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/pair/approve` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/pair/deny` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/pair/init` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/pair/poll` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| POST | `/agent/auth/refresh` | [src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts) |
| GET | `/agent/capabilities` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| GET | `/agent/capabilities/:id` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/:id/approve` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/:id/approve` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/:id/cancel` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/:id/reject` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/:id/rollback` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/capabilities/bulk-approve` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| GET | `/agent/capabilities/dual-write-status` | [src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts) |
| POST | `/agent/cli-capabilities/:id/complete` | [src/modules/agent/controllers/capability-cli.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts) |
| GET | `/agent/cli-capabilities/pending` | [src/modules/agent/controllers/capability-cli.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts) |
| GET | `/agent/commands` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| POST | `/agent/commands` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| GET | `/agent/commands/:id` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| POST | `/agent/commands/:id/approve` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| POST | `/agent/commands/:id/cancel` | [src/modules/agent/controllers/agent-command-stream.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| POST | `/agent/commands/:id/chunks` | [src/modules/agent/controllers/agent-command-stream.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| POST | `/agent/commands/:id/complete` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| POST | `/agent/commands/:id/reject` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| POST | `/agent/commands/:id/stream` | [src/modules/agent/controllers/agent-command-stream.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts) |
| GET | `/agent/commands/pending` | [src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts) |
| GET | `/agent/devices` | [src/modules/agent/controllers/agent-device.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| GET | `/agent/devices/:id` | [src/modules/agent/controllers/agent-device.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| PATCH | `/agent/devices/:id` | [src/modules/agent/controllers/agent-device.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| POST | `/agent/devices/:id/revoke` | [src/modules/agent/controllers/agent-device.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts) |
| GET | `/agent/events` | [src/modules/agent/controllers/agent-event.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts) |
| POST | `/agent/events` | [src/modules/agent/controllers/agent-event.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts) |
| GET | `/agent/marketplace/listings` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| POST | `/agent/marketplace/listings` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| GET | `/agent/marketplace/listings/:id` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| GET | `/agent/marketplace/listings/:id` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| GET | `/agent/marketplace/listings/:id/analyse` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| POST | `/agent/marketplace/listings/:id/install` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| POST | `/agent/marketplace/listings/:id/republish` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| POST | `/agent/marketplace/listings/:id/unpublish` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| GET | `/agent/marketplace/listings/mine` | [src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts) |
| GET | `/agent/organizations` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| POST | `/agent/organizations` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| GET | `/agent/organizations/:id/devices` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| GET | `/agent/organizations/:id/members` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| POST | `/agent/organizations/:id/members` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| GET | `/agent/organizations/:id/policy` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| PUT | `/agent/organizations/:id/policy` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| POST | `/agent/organizations/:slug/sso/callback` | [src/modules/fleet/controllers/saml.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts) |
| POST | `/agent/organizations/:slug/sso/metadata` | [src/modules/fleet/controllers/saml.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts) |
| GET | `/agent/organizations/policy/effective` | [src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts) |
| GET | `/agent/recipes` | [src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| POST | `/agent/recipes` | [src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| DELETE | `/agent/recipes/:id` | [src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| GET | `/agent/recipes/:id` | [src/modules/recipes/controllers/recipe-run.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| GET | `/agent/recipes/:id` | [src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| PATCH | `/agent/recipes/:id` | [src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts) |
| POST | `/agent/recipes/:id/cancel` | [src/modules/recipes/controllers/recipe-run.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| GET | `/agent/recipes/:id/runs` | [src/modules/recipes/controllers/recipe-run.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| POST | `/agent/recipes/:id/runs` | [src/modules/recipes/controllers/recipe-run.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts) |
| GET | `/agent/repos` | [src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| POST | `/agent/repos` | [src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| DELETE | `/agent/repos/:id` | [src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| GET | `/agent/repos/:id` | [src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| PATCH | `/agent/repos/:id` | [src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts) |
| GET | `/agent/runtime/protocol` | [src/modules/agent/controllers/runtime-protocol.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/runtime-protocol.controller.ts) |
| GET | `/agent/scheduled-commands` | [src/modules/agent/controllers/agent-scheduled-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| POST | `/agent/scheduled-commands` | [src/modules/agent/controllers/agent-scheduled-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| DELETE | `/agent/scheduled-commands/:id` | [src/modules/agent/controllers/agent-scheduled-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| PATCH | `/agent/scheduled-commands/:id/status` | [src/modules/agent/controllers/agent-scheduled-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts) |
| GET | `/agent/sessions` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| POST | `/agent/sessions` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| DELETE | `/agent/sessions/:id` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| GET | `/agent/sessions/:id` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| POST | `/agent/sessions/:id/heartbeat` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| POST | `/agent/sessions/attach` | [src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts) |
| GET | `/agent/suggestions` | [src/modules/activity-memory/controllers/agent-suggestion.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts) |
| POST | `/agent/suggestions/:id/review` | [src/modules/activity-memory/controllers/agent-suggestion.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts) |
| GET | `/health` | [src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/health/health.controller.ts) |
| POST | `/internal/agent/terminal/seed-command` | [src/modules/agent/controllers/agent-terminal-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-terminal-internal.controller.ts) |

## File inventory
<details>
<summary>258 tracked files</summary>

- [apps/claw-agent-service/AGENTS.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/AGENTS.md)
- [apps/claw-agent-service/CLAUDE.md](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/CLAUDE.md)
- [apps/claw-agent-service/Dockerfile](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/Dockerfile)
- [apps/claw-agent-service/Dockerfile.dev](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/Dockerfile.dev)
- [apps/claw-agent-service/docker-entrypoint.dev.sh](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/docker-entrypoint.dev.sh)
- [apps/claw-agent-service/eslint.config.mjs](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/eslint.config.mjs)
- [apps/claw-agent-service/nest-cli.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/nest-cli.json)
- [apps/claw-agent-service/package.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/package.json)
- [apps/claw-agent-service/prisma.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma.config.ts)
- [apps/claw-agent-service/prisma/migrations/20260414135123_init/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260414135123_init/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260421000000_phase_a_device_model_and_refresh/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260421000000_phase_a_device_model_and_refresh/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260421120000_phase_b_access_policy_and_risk/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260421120000_phase_b_access_policy_and_risk/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260421180000_phase_c_command_cancellation/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260421180000_phase_c_command_cancellation/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260421190000_phase_d_scheduled_commands_and_scopes/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260421190000_phase_d_scheduled_commands_and_scopes/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260501053343_add_capability_invocation_unify_policy/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260501053343_add_capability_invocation_unify_policy/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260501085620_add_recipes_and_runs/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260501085620_add_recipes_and_runs/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260501093817_add_recipe_step_metadata/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260501093817_add_recipe_step_metadata/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260501095637_add_streams_40_41_42/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260501095637_add_streams_40_41_42/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260524120000_add_recipe_run_dryrun/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260524120000_add_recipe_run_dryrun/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260524123000_add_agent_suggestions/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260524123000_add_agent_suggestions/migration.sql)
- [apps/claw-agent-service/prisma/migrations/20260909090000_add_organization_policy/migration.sql](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/20260909090000_add_organization_policy/migration.sql)
- [apps/claw-agent-service/prisma/migrations/migration_lock.toml](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/migrations/migration_lock.toml)
- [apps/claw-agent-service/prisma/schema.prisma](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/prisma/schema.prisma)
- [apps/claw-agent-service/src/app/app.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/app.module.ts)
- [apps/claw-agent-service/src/app/config/app.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/config/app.config.ts)
- [apps/claw-agent-service/src/app/filters/global-exception.filter.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/filters/global-exception.filter.ts)
- [apps/claw-agent-service/src/app/filters/types/error-response-body.type.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/filters/types/error-response-body.type.ts)
- [apps/claw-agent-service/src/app/interceptors/logging.interceptor.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/interceptors/logging.interceptor.ts)
- [apps/claw-agent-service/src/app/pipes/zod-validation.pipe.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/app/pipes/zod-validation.pipe.ts)
- [apps/claw-agent-service/src/common/constants/agent.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/agent.constants.ts)
- [apps/claw-agent-service/src/common/constants/auth.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/auth.constants.ts)
- [apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/capability-denylist.constants.ts)
- [apps/claw-agent-service/src/common/constants/capability-policy.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/capability-policy.constants.ts)
- [apps/claw-agent-service/src/common/constants/capability.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/capability.constants.ts)
- [apps/claw-agent-service/src/common/constants/policy-regex.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/policy-regex.constants.ts)
- [apps/claw-agent-service/src/common/constants/policy.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/policy.constants.ts)
- [apps/claw-agent-service/src/common/constants/recipe.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/recipe.constants.ts)
- [apps/claw-agent-service/src/common/constants/stream.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/constants/stream.constants.ts)
- [apps/claw-agent-service/src/common/decorators/agent-session.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/decorators/agent-session.decorator.ts)
- [apps/claw-agent-service/src/common/decorators/current-device.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/decorators/current-device.decorator.ts)
- [apps/claw-agent-service/src/common/decorators/require-scopes.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/decorators/require-scopes.decorator.ts)
- [apps/claw-agent-service/src/common/decorators/skip-logging.decorator.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/decorators/skip-logging.decorator.ts)
- [apps/claw-agent-service/src/common/enums/agent-session-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/agent-session-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/capability-blast-radius.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/capability-blast-radius.enum.ts)
- [apps/claw-agent-service/src/common/enums/capability-class.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/capability-class.enum.ts)
- [apps/claw-agent-service/src/common/enums/capability-invocation-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/capability-invocation-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/capability-operation.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/capability-operation.enum.ts)
- [apps/claw-agent-service/src/common/enums/capability-reversibility.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/capability-reversibility.enum.ts)
- [apps/claw-agent-service/src/common/enums/device-code-error.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/device-code-error.enum.ts)
- [apps/claw-agent-service/src/common/enums/device-code-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/device-code-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/device-scope.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/device-scope.enum.ts)
- [apps/claw-agent-service/src/common/enums/device-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/device-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/file-event-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/file-event-type.enum.ts)
- [apps/claw-agent-service/src/common/enums/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/index.ts)
- [apps/claw-agent-service/src/common/enums/pairing-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/pairing-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/policy-kind.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/policy-kind.enum.ts)
- [apps/claw-agent-service/src/common/enums/refresh-token-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/refresh-token-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/risk-label.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/risk-label.enum.ts)
- [apps/claw-agent-service/src/common/enums/scheduled-command-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/scheduled-command-status.enum.ts)
- [apps/claw-agent-service/src/common/enums/stream-chunk-type.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/stream-chunk-type.enum.ts)
- [apps/claw-agent-service/src/common/enums/terminal-command-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/enums/terminal-command-status.enum.ts)
- [apps/claw-agent-service/src/common/errors/business.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/errors/business.exception.ts)
- [apps/claw-agent-service/src/common/errors/entity-not-found.exception.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/errors/entity-not-found.exception.ts)
- [apps/claw-agent-service/src/common/guards/agent-key.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/guards/agent-key.guard.ts)
- [apps/claw-agent-service/src/common/guards/compat-agent.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/guards/compat-agent.guard.ts)
- [apps/claw-agent-service/src/common/guards/device-access.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/guards/device-access.guard.ts)
- [apps/claw-agent-service/src/common/guards/scope.guard.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/guards/scope.guard.ts)
- [apps/claw-agent-service/src/common/types/auth.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/types/auth.types.ts)
- [apps/claw-agent-service/src/common/types/index.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/types/index.ts)
- [apps/claw-agent-service/src/common/types/jwt.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/types/jwt.types.ts)
- [apps/claw-agent-service/src/common/types/recipe-parser.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/types/recipe-parser.types.ts)
- [apps/claw-agent-service/src/common/utilities/__tests__/policy-regex.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/__tests__/policy-regex.utility.spec.ts)
- [apps/claw-agent-service/src/common/utilities/__tests__/recipe-expression.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/__tests__/recipe-expression.utility.spec.ts)
- [apps/claw-agent-service/src/common/utilities/device.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/device.utility.ts)
- [apps/claw-agent-service/src/common/utilities/jwt.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/jwt.utility.ts)
- [apps/claw-agent-service/src/common/utilities/policy-regex.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/policy-regex.utility.ts)
- [apps/claw-agent-service/src/common/utilities/policy-target-matcher.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/policy-target-matcher.utility.ts)
- [apps/claw-agent-service/src/common/utilities/recipe-expression.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/recipe-expression.utility.ts)
- [apps/claw-agent-service/src/common/utilities/risk-status.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/risk-status.utility.ts)
- [apps/claw-agent-service/src/common/utilities/token.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/token.utility.ts)
- [apps/claw-agent-service/src/common/utilities/user-code.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/common/utilities/user-code.utility.ts)
- [apps/claw-agent-service/src/infrastructure/database/prisma/prisma.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/infrastructure/database/prisma/prisma.module.ts)
- [apps/claw-agent-service/src/infrastructure/database/prisma/prisma.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/infrastructure/database/prisma/prisma.service.ts)
- [apps/claw-agent-service/src/infrastructure/redis/constants/redis.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/infrastructure/redis/constants/redis.constants.ts)
- [apps/claw-agent-service/src/infrastructure/redis/redis.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/infrastructure/redis/redis.module.ts)
- [apps/claw-agent-service/src/infrastructure/redis/redis.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/infrastructure/redis/redis.service.ts)
- [apps/claw-agent-service/src/main.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/main.ts)
- [apps/claw-agent-service/src/modules/activity-memory/activity-memory.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/activity-memory.module.ts)
- [apps/claw-agent-service/src/modules/activity-memory/constants/suggestion.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/constants/suggestion.constants.ts)
- [apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/activity-memory.controller.ts)
- [apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/controllers/agent-suggestion.controller.ts)
- [apps/claw-agent-service/src/modules/activity-memory/dto/record-activity.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/dto/record-activity.dto.ts)
- [apps/claw-agent-service/src/modules/activity-memory/dto/suggestion.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/dto/suggestion.dto.ts)
- [apps/claw-agent-service/src/modules/activity-memory/enums/agent-suggestion-status.enum.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/enums/agent-suggestion-status.enum.ts)
- [apps/claw-agent-service/src/modules/activity-memory/managers/agent-suggestion.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/managers/agent-suggestion.manager.ts)
- [apps/claw-agent-service/src/modules/activity-memory/repositories/activity-memory.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/repositories/activity-memory.repository.ts)
- [apps/claw-agent-service/src/modules/activity-memory/repositories/agent-suggestion.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/repositories/agent-suggestion.repository.ts)
- [apps/claw-agent-service/src/modules/activity-memory/types/suggestion.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/activity-memory/types/suggestion.types.ts)
- [apps/claw-agent-service/src/modules/agent/agent.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/agent.module.ts)
- [apps/claw-agent-service/src/modules/agent/constants/runtime-protocol.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/constants/runtime-protocol.constants.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/__tests__/runtime-protocol.controller.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/__tests__/runtime-protocol.controller.spec.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-auth.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command-stream.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-command.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-device.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-event.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-repo.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-scheduled-command.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-session.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/agent-terminal-internal.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/agent-terminal-internal.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-cli.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/capability-stream.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability-stream.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/capability.controller.ts)
- [apps/claw-agent-service/src/modules/agent/controllers/runtime-protocol.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/controllers/runtime-protocol.controller.ts)
- [apps/claw-agent-service/src/modules/agent/dto/__tests__/create-agent-session.dto.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/__tests__/create-agent-session.dto.spec.ts)
- [apps/claw-agent-service/src/modules/agent/dto/attach-session.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/attach-session.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/bulk-approve-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/bulk-approve-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/cancel-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/cancel-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/cancel-command.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/cancel-command.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/complete-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/complete-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/complete-command.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/complete-command.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/create-agent-session.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/create-agent-session.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/create-command.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/create-command.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/create-file-events.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/create-file-events.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/create-scheduled-command.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/create-scheduled-command.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/device-code-approve.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/device-code-approve.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/device-code-create.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/device-code-create.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/device-code-token.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/device-code-token.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/device-hint.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/device-hint.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-capabilities-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-capabilities-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-commands-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-commands-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-devices-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-devices-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-events-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-events-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-repos-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-repos-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/list-sessions-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/list-sessions-query.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/pair-approve.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/pair-approve.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/pair-deny.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/pair-deny.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/pair-init.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/pair-init.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/pair-poll.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/pair-poll.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/propose-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/propose-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/push-chunks.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/push-chunks.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/refresh.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/refresh.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/register-repo.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/register-repo.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/reject-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/reject-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/reject-command.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/reject-command.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/revoke-device.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/revoke-device.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/rollback-capability.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/rollback-capability.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/update-device.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/update-device.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/update-repo.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/update-repo.dto.ts)
- [apps/claw-agent-service/src/modules/agent/dto/update-scheduled-command-status.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/dto/update-scheduled-command-status.dto.ts)
- [apps/claw-agent-service/src/modules/agent/managers/agent-command.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/agent-command.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/agent-session.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/agent-session.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/capability-approval.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/capability-approval.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/capability-expiry-sweeper.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/capability-expiry-sweeper.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/pairing-cleanup.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/pairing-cleanup.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/refresh-cleanup.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/refresh-cleanup.manager.ts)
- [apps/claw-agent-service/src/modules/agent/managers/scheduler.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/managers/scheduler.manager.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/agent-command.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/agent-command.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/agent-event.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/agent-event.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/agent-repo.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/agent-repo.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/agent-session.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/agent-session.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/capability-invocation.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/capability-invocation.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/device-code-request.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/device-code-request.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/device.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/device.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/pairing-request.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/pairing-request.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/policy.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/policy.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/refresh-token.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/refresh-token.repository.ts)
- [apps/claw-agent-service/src/modules/agent/repositories/scheduled-command.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/repositories/scheduled-command.repository.ts)
- [apps/claw-agent-service/src/modules/agent/services/__tests__/capability-dual-write-metrics.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/__tests__/capability-dual-write-metrics.service.spec.ts)
- [apps/claw-agent-service/src/modules/agent/services/__tests__/capability-risk.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/__tests__/capability-risk.service.spec.ts)
- [apps/claw-agent-service/src/modules/agent/services/__tests__/command-risk.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/__tests__/command-risk.service.spec.ts)
- [apps/claw-agent-service/src/modules/agent/services/__tests__/runtime-protocol.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/__tests__/runtime-protocol.service.spec.ts)
- [apps/claw-agent-service/src/modules/agent/services/agent-command.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/agent-command.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/agent-event.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/agent-event.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/agent-repo.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/agent-repo.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/agent-session.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/agent-session.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/agent-terminal-seed.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/agent-terminal-seed.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/capability-dual-write-metrics.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/capability-dual-write-metrics.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/capability-event-bus.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/capability-event-bus.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/capability-risk.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/capability.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/capability.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/command-risk.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/command-stream.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/command-stream.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/device-code.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/device-code.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/device.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/device.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/pairing.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/pairing.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/policy.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/policy.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/refresh.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/refresh.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/revocation-cache.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/revocation-cache.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/runtime-protocol.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/runtime-protocol.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/scheduled-command.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/scheduled-command.service.ts)
- [apps/claw-agent-service/src/modules/agent/services/token.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/services/token.service.ts)
- [apps/claw-agent-service/src/modules/agent/types/agent.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/agent.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/capability-dual-write.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/capability-dual-write.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/capability-stream.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/capability-stream.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/capability.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/capability.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/policy.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/policy.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/runtime-protocol.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/runtime-protocol.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/seed-command.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/seed-command.types.ts)
- [apps/claw-agent-service/src/modules/agent/types/stream.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/agent/types/stream.types.ts)
- [apps/claw-agent-service/src/modules/fleet/constants/organization-policy.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/constants/organization-policy.constants.ts)
- [apps/claw-agent-service/src/modules/fleet/constants/saml.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/constants/saml.constants.ts)
- [apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/fleet.controller.ts)
- [apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/controllers/saml.controller.ts)
- [apps/claw-agent-service/src/modules/fleet/dto/organization-policy.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/dto/organization-policy.dto.ts)
- [apps/claw-agent-service/src/modules/fleet/dto/organization.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/dto/organization.dto.ts)
- [apps/claw-agent-service/src/modules/fleet/dto/saml.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/dto/saml.dto.ts)
- [apps/claw-agent-service/src/modules/fleet/fleet.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/fleet.module.ts)
- [apps/claw-agent-service/src/modules/fleet/repositories/organization.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/repositories/organization.repository.ts)
- [apps/claw-agent-service/src/modules/fleet/services/__tests__/organization-policy.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/services/__tests__/organization-policy.service.spec.ts)
- [apps/claw-agent-service/src/modules/fleet/services/organization-policy.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/services/organization-policy.service.ts)
- [apps/claw-agent-service/src/modules/fleet/services/saml.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/services/saml.service.ts)
- [apps/claw-agent-service/src/modules/fleet/types/device-matrix.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/types/device-matrix.types.ts)
- [apps/claw-agent-service/src/modules/fleet/types/organization-policy.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/types/organization-policy.types.ts)
- [apps/claw-agent-service/src/modules/fleet/types/saml.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/types/saml.types.ts)
- [apps/claw-agent-service/src/modules/fleet/utilities/__tests__/policy-intersection.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/utilities/__tests__/policy-intersection.utility.spec.ts)
- [apps/claw-agent-service/src/modules/fleet/utilities/policy-intersection.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/utilities/policy-intersection.utility.ts)
- [apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/fleet/utilities/saml-verifier.utility.ts)
- [apps/claw-agent-service/src/modules/health/health.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/health/health.controller.ts)
- [apps/claw-agent-service/src/modules/health/health.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/health/health.module.ts)
- [apps/claw-agent-service/src/modules/marketplace/constants/sandbox.constants.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/constants/sandbox.constants.ts)
- [apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/controllers/marketplace.controller.ts)
- [apps/claw-agent-service/src/modules/marketplace/dto/publish-listing.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/dto/publish-listing.dto.ts)
- [apps/claw-agent-service/src/modules/marketplace/marketplace.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/marketplace.module.ts)
- [apps/claw-agent-service/src/modules/marketplace/repositories/marketplace.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/repositories/marketplace.repository.ts)
- [apps/claw-agent-service/src/modules/marketplace/services/marketplace.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/services/marketplace.service.ts)
- [apps/claw-agent-service/src/modules/marketplace/types/marketplace.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/types/marketplace.types.ts)
- [apps/claw-agent-service/src/modules/marketplace/types/sandbox.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/types/sandbox.types.ts)
- [apps/claw-agent-service/src/modules/marketplace/utilities/__tests__/sandbox-runner.utility.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/utilities/__tests__/sandbox-runner.utility.spec.ts)
- [apps/claw-agent-service/src/modules/marketplace/utilities/sandbox-runner.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/utilities/sandbox-runner.utility.ts)
- [apps/claw-agent-service/src/modules/marketplace/utilities/signature.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/marketplace/utilities/signature.utility.ts)
- [apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe-run.controller.ts)
- [apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/controllers/recipe.controller.ts)
- [apps/claw-agent-service/src/modules/recipes/dto/create-recipe.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/dto/create-recipe.dto.ts)
- [apps/claw-agent-service/src/modules/recipes/dto/list-recipes-query.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/dto/list-recipes-query.dto.ts)
- [apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/dto/recipe-dsl.dto.ts)
- [apps/claw-agent-service/src/modules/recipes/dto/start-run.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/dto/start-run.dto.ts)
- [apps/claw-agent-service/src/modules/recipes/dto/update-recipe.dto.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/dto/update-recipe.dto.ts)
- [apps/claw-agent-service/src/modules/recipes/managers/__tests__/recipe-runner.manager.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/managers/__tests__/recipe-runner.manager.spec.ts)
- [apps/claw-agent-service/src/modules/recipes/managers/recipe-event-consumer.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/managers/recipe-event-consumer.manager.ts)
- [apps/claw-agent-service/src/modules/recipes/managers/recipe-runner.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/managers/recipe-runner.manager.ts)
- [apps/claw-agent-service/src/modules/recipes/managers/recipe-timeout-sweeper.manager.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/managers/recipe-timeout-sweeper.manager.ts)
- [apps/claw-agent-service/src/modules/recipes/recipes.module.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/recipes.module.ts)
- [apps/claw-agent-service/src/modules/recipes/repositories/recipe-run.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/repositories/recipe-run.repository.ts)
- [apps/claw-agent-service/src/modules/recipes/repositories/recipe.repository.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/repositories/recipe.repository.ts)
- [apps/claw-agent-service/src/modules/recipes/services/__tests__/recipe.service.spec.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/services/__tests__/recipe.service.spec.ts)
- [apps/claw-agent-service/src/modules/recipes/services/recipe-run.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/services/recipe-run.service.ts)
- [apps/claw-agent-service/src/modules/recipes/services/recipe.service.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/services/recipe.service.ts)
- [apps/claw-agent-service/src/modules/recipes/types/paginated-recipes.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/types/paginated-recipes.types.ts)
- [apps/claw-agent-service/src/modules/recipes/types/recipe-event.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/types/recipe-event.types.ts)
- [apps/claw-agent-service/src/modules/recipes/types/recipe.types.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/types/recipe.types.ts)
- [apps/claw-agent-service/src/modules/recipes/utilities/dsl-cast.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/utilities/dsl-cast.utility.ts)
- [apps/claw-agent-service/src/modules/recipes/utilities/dsl-graph.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/utilities/dsl-graph.utility.ts)
- [apps/claw-agent-service/src/modules/recipes/utilities/placeholder-resolver.utility.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/modules/recipes/utilities/placeholder-resolver.utility.ts)
- [apps/claw-agent-service/src/vitest-globals.d.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/src/vitest-globals.d.ts)
- [apps/claw-agent-service/tsconfig.build.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/tsconfig.build.json)
- [apps/claw-agent-service/tsconfig.json](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/tsconfig.json)
- [apps/claw-agent-service/vitest.config.ts](https://github.com/ihabkhaled/ClawAI/blob/main/apps/claw-agent-service/vitest.config.ts)
</details>

## Related
- [[Service Catalog|Service-Catalog]]
- [[Complete API Reference|API-Reference]]
- [[Data Ownership|Data-Ownership]]
