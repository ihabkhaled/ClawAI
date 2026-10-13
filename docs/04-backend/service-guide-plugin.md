# Service Guide: claw-plugin-service

## Overview

| Property   | Value                                                               |
| ---------- | ------------------------------------------------------------------- |
| Port       | 4021                                                                |
| Database   | PostgreSQL (`claw_plugin`)                                          |
| Public API | `/api/v1/plugins` (catalog, installs and admin controls)            |
| Secrets    | `PLUGIN_ENCRYPTION_KEY` (bootstrap, separate from `ENCRYPTION_KEY`) |

This service owns the plugin and MCP module: the catalog of first-party and curated
plugins, admin settings, and (in later batches) installs, user MCP servers, consent
decisions and invocation history. Chat-service only consumes it, over HTTP.

Batch 1 shipped the foundation: the service scaffold, the seeded first-party catalog
(`web-fetch`, `datetime-and-math`, `weather`, as manifests only), the `PluginSetting`
seeder, and the catalog read API behind the portal `/plugins` browse and detail pages.
Batch 2 added installs, per-tool consent, write-only credentials, the admin controls and the account-deletion
consumer ([ADR-172](../13-adr/adr-172-plugin-installs-consent-and-credentials.md)). There is no MCP client, invoke
path or chat integration yet.

## Boundaries

- The plugin database belongs to this service alone. No other service reads it.
- Chat-service is the only future caller of the internal routes
  (`/api/v1/internal/plugins/*`). nginx answers 404 for the whole `/api/v1/internal/`
  prefix, so they are never reachable from the browser.
- The module is on for every plan, Free included. Free users install from the curated
  catalog and may register no custom MCP server. These limits are database numbers, not code.
- MCP credentials are encrypted with `PLUGIN_ENCRYPTION_KEY`. A leak of `ENCRYPTION_KEY`
  or of this key does not expose the other.
- Everything a tool returns is untrusted input (design section 0).

## Infrastructure

- Compose: `plugin-service` in `docker/docker-compose.{dev,prod}.services.yml`, `pg-plugin`
  in `docker/docker-compose.{dev,prod}.databases.yml` (host port 5459).
- Environment: `PLUGIN_SERVICE_PORT`, `PLUGIN_SERVICE_URL`, `PLUGIN_DATABASE_URL`,
  `PG_PLUGIN_*`, `PLUGIN_ENCRYPTION_KEY`, `RABBITMQ_URL` for the `user.deleted` consumer (see
  `docs/06-data/environment-variables.md`). The service refuses to start when `PLUGIN_ENCRYPTION_KEY` is missing,
  short, not hex or all zeros.
- Gateway: `location /api/v1/plugins` in `infra/nginx/locations.conf` and the distributed
  template (`CLAW_PLUGIN_ORIGIN`).
- Health: registered in `claw-health-service` and shown under the platform status group.

## Catalog API

Both routes need a valid JWT and the `PLUGINS_USE` permission (ADMIN passes without a lookup; an entitlements
outage answers 503, never an open door). The answers depend on the caller (plan, install state), so they carry `Cache-Control: private, no-store` and
`Vary: Accept-Language, Authorization`.

| Method and path                     | Query                                               | Response                                                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/plugins/catalog`       | `q`, `category`, `cursor`, `limit` (1-50), `locale` | `{ items: Card[], nextCursor: string \| null }`, featured first then by slug                                                                                                                                                   |
| `GET /api/v1/plugins/catalog/:slug` | `locale`                                            | `Card` plus `description`, `homepageUrl`, `auth {kind, scopes[{id,description}]}`, `tools[{name,title,description,riskLevel,scopes,inputSchema}]`, `settingsSchema`, `network {hosts, publicWeb}`, `versions[]` (newest first) |

`Card` is `{ slug, name, summary, publisher, category, iconKey, source, version, toolCount, maxRisk, installCount, featured, installed }`.
`installed` is true when the caller has installed the plugin. `toolCount` and `maxRisk` ignore tools an admin disabled.

- Locale: `?locale=` wins, then the best supported `Accept-Language` tag by q-value (`pt-BR` gives `pt`), then `en`.
  Each field falls back to English on its own.
- An unknown, unpublished or globally disabled slug answers `404 PLUGIN_NOT_FOUND`. A malformed slug answers 400.
- `cursor` is the last slug of the previous page; an unknown cursor returns an empty page. Search (`q`) matches
  name, summary, slug and publisher, case-insensitively, after the category filter. The catalog is small and
  curated, so filtering and paging happen in memory after one indexed query.
- A stored row whose translations or manifest no longer parse is left out (and logged) rather than failing the page.

## Installs API

Contract types: `packages/shared-types/src/types/plugin-installs.type.ts`. Every route needs a valid JWT. Reads need
`PLUGINS_USE`, writes `PLUGINS_INSTALL` (ADMIN passes without a lookup). The caller is always the JWT user; an install
that belongs to someone else answers `404 PLUGIN_INSTALL_NOT_FOUND`, the same as a missing one. Install ids are UUIDs.
Responses are `Cache-Control: private, no-store`.

| Method and path                                         | Body                                    | Response                                                           |
| ------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------ |
| `POST /api/v1/plugins/installs`                         | `{slug, version?, settings?}`           | `201` install view                                                 |
| `GET /api/v1/plugins/installs`                          |                                         | install views, newest first                                        |
| `GET /api/v1/plugins/installs/mentions`                 |                                         | `[{installId, slug, name, iconKey, enabled}]` for the `@` picker   |
| `GET /api/v1/plugins/installs/:id`                      |                                         | install view                                                       |
| `PATCH /api/v1/plugins/installs/:id`                    | `{enabled?, settings?}`                 | install view (settings are validated and replaced)                 |
| `DELETE /api/v1/plugins/installs/:id`                   |                                         | `204`; consents and the credential go with it                      |
| `PUT /api/v1/plugins/installs/:id/credential`           | `{kind: 'API_KEY', value, headerName?}` | `{hasCredential: true, kind, updatedAt}`                           |
| `DELETE /api/v1/plugins/installs/:id/credential`        |                                         | `204` (also when there was none)                                   |
| `POST /api/v1/plugins/installs/:id/consent`             | `{toolName, level}`                     | `{toolName, level, grantedAt}`                                     |
| `DELETE /api/v1/plugins/installs/:id/consent/:toolName` |                                         | `204` (also when there was no grant); revokes the remembered grant |

Install view: `{id, slug, name, iconKey, version, latestVersion, state, authKind, settings, credential {hasCredential, kind, updatedAt}, consents[], installedAt, updatedAt}`.
`state` is `ENABLED`, `DISABLED` or `UNAVAILABLE` (the plugin was switched off for everyone or unpublished; enabling it
answers `409`, disabling and uninstalling still work). `name` is localized by `Accept-Language`.

Error codes: `PLUGIN_NOT_FOUND` 404, `PLUGIN_VERSION_NOT_FOUND` 404, `PLUGIN_UNAVAILABLE` 409, `PLUGIN_ALREADY_INSTALLED` 409,
`PLUGIN_INSTALL_LIMIT` 403 (`limit`, `current`; a cap of `0` is disabled, `null` is unlimited), `PLUGIN_PLAN_DISABLED` 403
(the `allowPlugins` gate is off), `PLUGIN_ENTITLEMENTS_UNAVAILABLE` 503 (fails closed), `PLUGIN_SETTINGS_INVALID` 400
(`errors[{field, message}]`, never the value), `PLUGIN_INSTALL_NOT_FOUND` 404, `PLUGIN_TOOL_NOT_FOUND` 404,
`PLUGIN_CONSENT_NOT_REQUIRED` 400 (READ tool), `PLUGIN_CONSENT_LEVEL_MISMATCH` 400, `PLUGIN_CREDENTIAL_NOT_SUPPORTED` 400
(the manifest has no API-key auth), `PLUGIN_CREDENTIAL_HEADER_DENIED` 400.

- Settings are validated against the manifest `settingsSchema` (type, enum, const, required, min/max, length, array
  limits; unknown keys refused) after defaults are filled in.
- Consent: `level` must equal the tool's declared risk. WRITE is remembered. DESTRUCTIVE is stored but the runtime
  (batch 3) asks on every call. Any non-READ call after untrusted content asks regardless.
- A credential or consent write that loses a race with an uninstall (the install row is gone, Prisma `P2003`)
  answers `404 PLUGIN_INSTALL_NOT_FOUND`, not a 500.
- The contract's `PluginInstallState`, `PluginToolRiskLevel` and `PluginAuthKindName` stay string-literal unions in
  `shared-types` (the frontend builds them from literals); the service maps its enums onto the same strings.
- Credentials are write-only. The value is sealed (AES-256-GCM, AAD `userId:installId`, `keyVersion`), never returned
  and never logged. The header comes from the manifest (default `Authorization`); an override must be allow-listed.

## Admin API

`PLUGINS_ADMIN` only (a user holding every other plugin permission gets `403`). Writes log the acting admin.

| Method and path                             | Body                                                               | Response                                                              |
| ------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------- |
| `GET /api/v1/plugins/admin/catalog`         |                                                                    | every entry, any status, with current tools                           |
| `GET /api/v1/plugins/admin/catalog/:slug`   |                                                                    | one entry                                                             |
| `PATCH /api/v1/plugins/admin/catalog/:slug` | `{globallyEnabled?, featured?, tools?: [{name, disabledByAdmin}]}` | the updated entry (`404 PLUGIN_TOOL_NOT_FOUND` for an unknown tool)   |
| `GET /api/v1/plugins/admin/settings`        |                                                                    | every `PluginSetting` key with value and time                         |
| `PATCH /api/v1/plugins/admin/settings`      | `{values: {key: boolean or number}}`                               | the fresh list; `400 PLUGIN_SETTING_INVALID` rejects the whole change |

Setting ranges: `loop.maxRounds` 1-10, `loop.maxCallsPerTurn` 1-20, `call.timeoutMs` 1000-60000,
`call.maxResultBytes` 1024-262144, `invocations.retentionDays` 1-365, `rate.perUserPerMinute` 1-600,
`rate.perUserConcurrent` 1-20; the three `userServers.*` keys are booleans. A globally disabled plugin disappears
from the catalog for everyone and its installs read `UNAVAILABLE`.

## Account deletion

The service subscribes to `user.deleted` (queue prefix `claw.plugins`) and deletes the user's credentials, consents,
installs and invocation audit rows in one transaction, lowering each plugin's `installCount`. It is idempotent and logs
only the event id and counts. If processing throws, the broker retries the durable event.

## Data and seeding

Tables (migrations `20261013180000_plugins_init` and `20261014090000_plugin_installs`, both additive):
`plugin_catalog_entries`, `plugin_versions`, `plugin_tools`, `plugin_settings`, `plugin_installs` (unique
`(user_id, plugin_id)`), `plugin_tool_consents`, `plugin_credentials` (one per install, ciphertext only) and
`plugin_invocations` (audit shape; written by the invoke path in batch 3). MCP servers and OAuth state arrive later.

- The three first-party manifests live in `src/modules/seeding/constants/manifests/` (typed TypeScript, validated
  by the schema at seed time) and are upserted on every boot by slug and version. A new entry is created
  `PUBLISHED`; afterwards the seeder adds new versions and updates descriptive fields, and never `status`,
  `globallyEnabled`, `featured` or a tool's `disabledByAdmin`. A published version is immutable: if its manifest
  hash changes without a version bump, the seeder logs it, skips the slug and reports it under
  `versionBumpRequired` (`VERSION_BUMP_REQUIRED`).
- `PluginSetting` defaults are inserted only when the key is missing, so admin edits survive. Keys:
  `userServers.enabled` (true), `userServers.requireApproval` (false), `userServers.allowHttp` (false),
  `loop.maxRounds` (5), `loop.maxCallsPerTurn` (6), `call.timeoutMs` (30000), `call.maxResultBytes` (262144),
  `invocations.retentionDays` (90), `rate.perUserPerMinute` (20), `rate.perUserConcurrent` (3).
- The manifest schema is strict and treats the manifest as hostile input; see the service `CLAUDE.md` and
  [skills/add-a-catalog-plugin.md](../../skills/add-a-catalog-plugin.md).
- Deviation from the design: manifests are TypeScript constants rather than `prisma/seeders/catalog/*.json`, so the
  compiled service never depends on a path outside `dist`. The manifest gained `iconKey`, `homepageUrl` and
  `network.publicWeb` (the page reader may reach any public host behind the resolver guard; no other plugin may).

## Upgrading an existing install

A stack installed before the plugin service existed needs these manual steps; nothing creates them for you.

1. **Add the new variables to `.env` by hand.** The installer does not rewrite an existing `.env`. Copy these from `.env.example`:
   `PLUGIN_SERVICE_URL`, `PLUGIN_SERVICE_PORT`, `PLUGIN_DATABASE_URL`, `PG_PLUGIN_USER`, `PG_PLUGIN_PASSWORD`,
   `PG_PLUGIN_DB`, `PG_PLUGIN_PORT`, `PLUGIN_ENCRYPTION_KEY` and (if your `.env` predates it) `RABBITMQ_URL`. Keep the password in `PLUGIN_DATABASE_URL` equal to
   `PG_PLUGIN_PASSWORD`.
2. **Generate `PLUGIN_ENCRYPTION_KEY` yourself.** It must be a random 64-character hex value (32 bytes):
   `openssl rand -hex 32`. Do not keep the all-zero placeholder from `.env.example`: the service refuses to start with it (ADR-172). Do not reuse `ENCRYPTION_KEY`.
   Changing it later orphans stored MCP credentials.
3. **Re-run `scripts/install-tls.sh` (or `install-tls.ps1`)** so the plugin-service certificate gets its SAN
   (`plugin-service`). Without it, HTTPS calls to `https://plugin-service:4021` fail certificate verification.
4. Bring the stack up with `./scripts/claw.sh up`. Runtime `.env` changes need `service:recreate`, not a restart.

## References

- Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md)
- Decisions: [ADR-171](../13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md), [ADR-172](../13-adr/adr-172-plugin-installs-consent-and-credentials.md)
- Runbook: [add-a-catalog-plugin](../../skills/add-a-catalog-plugin.md)
- Service rules: [apps/claw-plugin-service/CLAUDE.md](../../apps/claw-plugin-service/CLAUDE.md)
