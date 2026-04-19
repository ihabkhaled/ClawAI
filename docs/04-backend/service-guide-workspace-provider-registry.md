# Workspace Provider Registry

## Overview

The workspace service now has a **DB-backed provider registry** replacing environment-variable-driven provider credentials. Provider definitions, auth modes, field schemas, supported objects, and supported actions are the single source of truth in `workspace_provider_definitions`. Per-provider app credentials (OAuth client IDs/secrets, PATs, tenant IDs) live in `workspace_provider_app_configs` with AES-256-GCM-encrypted secrets.

## Problem

The previous architecture:

- Expected workspace provider app credentials in `.env`
- Had an adapter factory that aliased multiple providers to the same adapter (GITLAB/BITBUCKET → GitHub; CONFLUENCE → Jira; GMAIL → GoogleDrive) which produced wrong behavior for users
- Had no way to add a provider without a code release
- Had no admin UI for managing provider OAuth apps

## Solution

### 1. Two new tables

```
workspace_provider_definitions      # One row per provider (12 seeded on startup)
  id, provider (enum, unique), displayName, description,
  authModes[], defaultAuthMode, configSchema (Json),
  capabilities (Json), supportedObjects[], supportedActions[],
  iconUrl, docsUrl, adapterKey, status, version

workspace_provider_app_configs      # Multiple per provider — "GitHub prod", "GitHub staging", etc.
  id, provider, definitionId, name (unique per provider),
  authMode, publicConfig (Json), encryptedSecret (String),
  secretVersion, scopes[], status, createdBy, lastValidatedAt
```

### 2. Three new enums

- `WorkspaceProviderAuthMode` — OAUTH2, PAT, BASIC, SERVICE_ACCOUNT, NONE
- `WorkspaceProviderDefinitionStatus` — ACTIVE, BETA, DEPRECATED, DISABLED
- `WorkspaceProviderAppConfigStatus` — DRAFT, READY, DISABLED, INVALID

### 3. Provider definition seed

On module init, `ProviderRegistryService.onModuleInit()` upserts 12 provider definitions from `constants/provider-registry.constants.ts`. Each definition specifies:

- auth modes supported (e.g. GitHub supports OAUTH2 + PAT)
- config schema (field list with type, required, secret, helpText, appliesToAuthModes)
- supported object types (repositories, issues, messages, etc.)
- supported write actions

### 4. Adapter factory fix

`WorkspaceAdapterFactory` no longer aliases providers. It:

- Returns the correct adapter for GITHUB, SLACK, JIRA, GOOGLE_DRIVE
- Throws `ADAPTER_NOT_IMPLEMENTED` (HTTP 501) for GITLAB, BITBUCKET, CONFLUENCE, GMAIL, FIGMA, CLICKUP, SHAREPOINT, ONEDRIVE — these are registered in the registry (so the UI can show them) but their adapter code is pending

### 5. Secret encryption

Secrets go through `crypto.utility.ts` (AES-256-GCM, IV random per encrypt, auth tag stored). The plaintext never touches the DB or any log. The API response exposes only a `hasSecret: boolean` flag — never the encrypted blob, never the plaintext.

### 6. Validation

Configs are validated against the provider's config schema:

- Required fields must be present (public or secret depending on `field.secret`)
- Auth-mode-specific fields only required when that auth mode is selected
- Updates skip secret-field validation when `secretConfig` is not in the payload (secrets are already stored)

### 7. Auth

- `GET /workspace/providers` — ADMIN, OPERATOR, VIEWER
- `GET /workspace/providers/:provider` — same
- `GET /workspace/provider-app-configs` — ADMIN, OPERATOR
- `POST /workspace/provider-app-configs` — ADMIN
- `PUT /workspace/provider-app-configs/:id` — ADMIN
- `DELETE /workspace/provider-app-configs/:id` — ADMIN

## API

| Method | Path                                                | Purpose                          |
| ------ | --------------------------------------------------- | -------------------------------- |
| GET    | `/api/v1/workspace/providers`                       | List all 12 provider definitions |
| GET    | `/api/v1/workspace/providers/:provider`             | One provider + its config schema |
| GET    | `/api/v1/workspace/provider-app-configs?provider=X` | List app configs (filtered)      |
| POST   | `/api/v1/workspace/provider-app-configs`            | Create an app config (admin)     |
| GET    | `/api/v1/workspace/provider-app-configs/:id`        | One config (no secret)           |
| PUT    | `/api/v1/workspace/provider-app-configs/:id`        | Update (secret optional)         |
| DELETE | `/api/v1/workspace/provider-app-configs/:id`        | Remove (admin)                   |

## Design decisions

### Why additive schema

Existing `WorkspaceConnector` rows keep working. The two new tables don't replace anything — they complement. Connectors will later reference `providerAppConfigId` to pick which app credentials to use, but the current foreign key isn't there yet (future work).

### Why seed, not runtime-discover

Provider definitions are stable code — they change with a release. Seeding on module init means no admin action is required to bootstrap the registry; adding a new provider means (a) adding a seed entry, (b) implementing the adapter.

### Why separate public from secret configs

Two reasons:

1. Read endpoints can return the public config safely — no extra redaction logic needed.
2. Updates can change public-only fields without providing secrets again.

### Why throw "not implemented" instead of aliasing

Aliasing silently produces wrong behavior (GITLAB requests hit GitHub's API). A hard 501 makes the missing adapter visible — admins see it in logs, the UI can show "coming soon", and no user ever gets mystery failures.

## Env vars

None new. Existing `ENCRYPTION_KEY` (64-char hex) is reused for secret encryption via `crypto.utility.ts`.

## Migration

`20260419200912_workspace_provider_registry` — additive: 2 new tables, 3 new enums. No existing data modified.

## Future work (not in this PR)

- Connector → app-config linkage (`connector.providerAppConfigId`)
- OAuth flows read client ID/secret from the app config instead of env
- Frontend admin UI (`/workspace/providers/admin`)
- Implementations for the 8 pending adapters (GITLAB, BITBUCKET, CONFLUENCE, GMAIL, FIGMA, CLICKUP, SHAREPOINT, ONEDRIVE)
