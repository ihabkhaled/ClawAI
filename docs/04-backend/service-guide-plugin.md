# Service Guide: claw-plugin-service

## Overview

| Property   | Value                                                               |
| ---------- | ------------------------------------------------------------------- |
| Port       | 4021                                                                |
| Database   | PostgreSQL (`claw_plugin`)                                          |
| Public API | `/api/v1/plugins` (read-only catalog in Batch 1)                    |
| Secrets    | `PLUGIN_ENCRYPTION_KEY` (bootstrap, separate from `ENCRYPTION_KEY`) |

This service owns the plugin and MCP module: the catalog of first-party and curated
plugins, admin settings, and (in later batches) installs, user MCP servers, consent
decisions and invocation history. Chat-service only consumes it, over HTTP.

Batch 1 ships the foundation: the service scaffold, the seeded first-party catalog
(`web-fetch`, `datetime-and-math`, `weather`, as manifests only), the `PluginSetting`
seeder, and the catalog read API behind the portal `/plugins` browse and detail pages.
There is no install flow and no chat integration yet.

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
  `PG_PLUGIN_*`, `PLUGIN_ENCRYPTION_KEY` (see `docs/06-data/environment-variables.md`).
- Gateway: `location /api/v1/plugins` in `infra/nginx/locations.conf` and the distributed
  template (`CLAW_PLUGIN_ORIGIN`).
- Health: registered in `claw-health-service` and shown under the platform status group.

## Catalog API (Batch 1)

Both routes need a valid JWT and the `PLUGINS_USE` permission (ADMIN passes without a lookup; an entitlements
outage answers 503, never an open door). They answer `Cache-Control: private, max-age=60` and `Vary: Accept-Language`.

| Method and path                     | Query                                               | Response                                                                                                                                                                                                                       |
| ----------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/plugins/catalog`       | `q`, `category`, `cursor`, `limit` (1-50), `locale` | `{ items: Card[], nextCursor: string \| null }`, featured first then by slug                                                                                                                                                   |
| `GET /api/v1/plugins/catalog/:slug` | `locale`                                            | `Card` plus `description`, `homepageUrl`, `auth {kind, scopes[{id,description}]}`, `tools[{name,title,description,riskLevel,scopes,inputSchema}]`, `settingsSchema`, `network {hosts, publicWeb}`, `versions[]` (newest first) |

`Card` is `{ slug, name, summary, publisher, category, iconKey, source, version, toolCount, maxRisk, installCount, featured, installed }`.
`installed` is always `false` until installs ship (Batch 2). `toolCount` and `maxRisk` ignore tools an admin disabled.

- Locale: `?locale=` wins, then the best supported `Accept-Language` tag by q-value (`pt-BR` gives `pt`), then `en`.
  Each field falls back to English on its own.
- An unknown, unpublished or globally disabled slug answers `404 PLUGIN_NOT_FOUND`. A malformed slug answers 400.
- `cursor` is the last slug of the previous page; an unknown cursor returns an empty page. Search (`q`) matches
  name, summary, slug and publisher, case-insensitively, after the category filter. The catalog is small and
  curated, so filtering and paging happen in memory after one indexed query.
- A stored row whose translations or manifest no longer parse is left out (and logged) rather than failing the page.

## Data and seeding

Tables (init migration `20261013180000_plugins_init`, additive): `plugin_catalog_entries`, `plugin_versions`,
`plugin_tools`, `plugin_settings`. Installs, credentials, consents and invocations arrive with later batches.

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
   `PG_PLUGIN_DB`, `PG_PLUGIN_PORT` and `PLUGIN_ENCRYPTION_KEY`. Keep the password in `PLUGIN_DATABASE_URL` equal to
   `PG_PLUGIN_PASSWORD`.
2. **Generate `PLUGIN_ENCRYPTION_KEY` yourself.** It must be a random 64-character hex value (32 bytes):
   `openssl rand -hex 32`. Do not keep the all-zero placeholder from `.env.example`, and do not reuse `ENCRYPTION_KEY`.
   Changing it later orphans stored MCP credentials.
3. **Re-run `scripts/install-tls.sh` (or `install-tls.ps1`)** so the plugin-service certificate gets its SAN
   (`plugin-service`). Without it, HTTPS calls to `https://plugin-service:4021` fail certificate verification.
4. Bring the stack up with `./scripts/claw.sh up`. Runtime `.env` changes need `service:recreate`, not a restart.

## References

- Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md)
- Decision: [ADR-171](../13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md)
- Runbook: [add-a-catalog-plugin](../../skills/add-a-catalog-plugin.md)
- Service rules: [apps/claw-plugin-service/CLAUDE.md](../../apps/claw-plugin-service/CLAUDE.md)
