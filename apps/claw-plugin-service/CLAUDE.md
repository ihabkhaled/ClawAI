# Plugin Service

Owns the plugin and MCP module: the catalog of first-party and curated plugins, their versions and tool rows, the
users' installs with their tool consents and write-only credentials, the invocation audit table (shape only), and the
admin `PluginSetting` table. Port 4021, database `claw_plugin`, route `/api/v1/plugins`. It does not own chat,
auth or billing data; use service APIs and never cross a database boundary. Chat-service will be the only caller of
`/internal/*` (not routed by nginx).

Design: [plugins-and-mcp-design](../../docs/implementation/plugins-and-mcp-design.md) - decision:
[ADR-171](../../docs/13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md) - guide:
[service-guide-plugin](../../docs/04-backend/service-guide-plugin.md) - runbook:
[skills/add-a-catalog-plugin.md](../../skills/add-a-catalog-plugin.md).

## What exists (Batch 1: foundation and read-only catalog)

- `GET /api/v1/plugins/catalog` (`q`, `category`, `cursor`, `limit`, `locale`) and `GET /api/v1/plugins/catalog/:slug`.
  Both need a valid JWT and `Permission.PLUGINS_USE`. Text is localized by `?locale=` or `Accept-Language`, with a
  per-field English fallback. Cards and the detail carry `installed` for the caller.
- Seeded first-party manifests: `web-fetch`, `datetime-and-math`, `weather` (manifests only; adapters come with the
  invoke path). Default `PluginSetting` rows. Both seeders run at boot, are idempotent, and soft-fail (log, do not crash).
- `GET /api/v1/health`.

## What exists (Batch 2: installs, consent, credentials, admin controls)

All install routes need a valid JWT. Reads (`GET`) need `PLUGINS_USE`; writes need `PLUGINS_INSTALL`. The user id
always comes from the JWT; another user's install id answers `404 PLUGIN_INSTALL_NOT_FOUND`.

- `POST /plugins/installs {slug, version?, settings?}` pins a version (the current one by default), fills setting
  defaults, validates settings against the manifest `settingsSchema`, and enforces `allowPlugins` plus
  `maxInstalledPlugins` (`null` unlimited, `0` disabled; `403 PLUGIN_INSTALL_LIMIT {limit, current}`). Duplicate is
  `409 PLUGIN_ALREADY_INSTALLED`; unknown slug `404 PLUGIN_NOT_FOUND`; unpublished or globally disabled
  `409 PLUGIN_UNAVAILABLE`.
- `GET /plugins/installs`, `GET /plugins/installs/mentions` (declared before `:id`), `GET /plugins/installs/:id`,
  `PATCH /plugins/installs/:id {enabled?, settings?}`, `DELETE /plugins/installs/:id` (consents and the credential cascade).
- `PUT|DELETE /plugins/installs/:id/credential`: write-only API key (AES-256-GCM under `PLUGIN_ENCRYPTION_KEY`, AAD
  `userId:installId`, `keyVersion` column). Responses carry `hasCredential`, kind and time only.
- `POST /plugins/installs/:id/consent {toolName, level}`: stores the grant. READ needs none; the level must equal the
  tool's risk; DESTRUCTIVE is stored but the runtime still asks every time. `DELETE /plugins/installs/:id/consent/:toolName`
  revokes it (204, idempotent, owner-scoped). Catalog answers are per user: `private, no-store`, `Vary: Accept-Language, Authorization`.
- Admin (`PLUGINS_ADMIN`): `GET /plugins/admin/catalog`, `GET|PATCH /plugins/admin/catalog/:slug`
  (`globallyEnabled`, `featured`, per-tool `disabledByAdmin`), `GET|PATCH /plugins/admin/settings` (known keys, range
  checked, all-or-nothing). A globally disabled plugin leaves the catalog and its installs read `UNAVAILABLE`.
- `user.deleted` consumer (`modules/account-deletion`) deletes the user's credentials, consents, installs and
  invocations, idempotently. `plugin_invocations` exists but nothing writes it until the invoke path.

Not built yet: MCP client and servers, invoke and resolve, OAuth, events, chat integration (batches 3 and 4).

## Layout

| Path                                                                              | What                                                                                   |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `modules/catalog/schemas/plugin-manifest.schema.ts`                               | the strict zod manifest schema; every stored manifest is re-parsed on read             |
| `modules/catalog/{controllers,services,managers,repositories}`                    | Controller -> Service (pagination, 404) -> Manager (presenter) -> Repository           |
| `modules/catalog/utilities`                                                       | hostile-text check, JSON-Schema subset check, locale resolution, manifest hash, semver |
| `modules/seeding`                                                                 | manifests as typed constants, catalog seeder, settings seeder, their repositories      |
| `modules/installs`                                                                | install flow, plan gate manager, settings validator, credential crypto, consents       |
| `modules/admin`                                                                   | catalog kill switch and per-tool disables, `PluginSetting` editor                      |
| `modules/account-deletion`                                                        | `user.deleted` consumer and its idempotent purge                                       |
| `modules/runtime`                                                                 | adapter contract and the registry of BUILTIN adapter keys (skeleton)                   |
| `prisma/migrations/20261013180000_plugins_init`, `20261014090000_plugin_installs` | additive migrations; a fresh database must always get its tables                       |

## Constraints that bite

- **The seeder never writes `status`, `globallyEnabled`, `featured` or a tool's `disabledByAdmin`.** Those are the
  admin's. Descriptive fields and the manifest are the repository's.
- **A manifest is hostile input.** Parse it with `parsePluginManifest` (size guard, then the schema). Never read
  `manifest` JSON from the database as if it were typed.
- **`network.hosts` is the only egress a BUILTIN adapter gets**; `publicWeb` is for the page reader behind the
  resolver guard only, and the schema refuses it for MCP manifests.
- **Native tool names are `plugin_<slug>_<tool>` and must fit 64 characters**; the schema checks it.
- **Zod enums use the local enums in `common/enums`** (the same strings as the Prisma enums) so nothing needs
  `z.nativeEnum(undefined)` in a dev container whose `dist/generated/prisma` is stale.
- **Config lives in `PluginSetting`**, not env. Only port, database URL, auth URL, service token and JWT secret are env.
- **Persian text needs the zero-width non-joiner (U+200C)**: it is allowed in manifest text; every other zero-width,
  bidi and control character is rejected.
- **Credentials never leave.** No response, log line or error carries a secret or its ciphertext; the install query
  selects the credential's kind and time only. `PLUGIN_ENCRYPTION_KEY` is checked at boot (64 hex characters, not all
  zeros); a wrong key orphans stored credentials. Request bodies named `value` or `credential` are redacted in logs.
- **Every install query is `where { id, userId }`.** Never read the owner from anything but the JWT.
- **The cap is enforced inside the insert transaction** (per-user advisory lock); do not move it back to a
  count-then-create in the service.
- **No decrypt path exists yet.** Add `open` to `CredentialCryptoManager` only together with the invoke path and its tests.
- Tests run under Vitest with the `unplugin-swc` plugin. If Windows Smart App Control blocks the swc binary, run the
  specs with a swc-free config (esbuild with `experimentalDecorators`); the specs build their providers with `new`.
