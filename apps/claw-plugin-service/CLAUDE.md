# Plugin Service

Owns the plugin and MCP module: the catalog of first-party and curated plugins, their versions and tool rows, and
the admin `PluginSetting` table. Port 4021, database `claw_plugin`, route `/api/v1/plugins`. It does not own chat,
auth or billing data; use service APIs and never cross a database boundary. Chat-service will be the only caller of
`/internal/*` (not routed by nginx).

Design: [plugins-and-mcp-design](../../docs/implementation/plugins-and-mcp-design.md) - decision:
[ADR-171](../../docs/13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md) - guide:
[service-guide-plugin](../../docs/04-backend/service-guide-plugin.md) - runbook:
[skills/add-a-catalog-plugin.md](../../skills/add-a-catalog-plugin.md).

## What exists (Batch 1: foundation and read-only catalog)

- `GET /api/v1/plugins/catalog` (`q`, `category`, `cursor`, `limit`, `locale`) and `GET /api/v1/plugins/catalog/:slug`.
  Both need a valid JWT and `Permission.PLUGINS_USE`. Text is localized by `?locale=` or `Accept-Language`, with a
  per-field English fallback. Cards carry `installed: false` until installs ship.
- Seeded first-party manifests: `web-fetch`, `datetime-and-math`, `weather` (manifests only; adapters come with the
  invoke path). Default `PluginSetting` rows. Both seeders run at boot, are idempotent, and soft-fail (log, do not crash).
- `GET /api/v1/health`.

No installs, credentials, MCP client, invoke path, admin API or chat integration yet.

## Layout

| Path                                                           | What                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `modules/catalog/schemas/plugin-manifest.schema.ts`            | the strict zod manifest schema; every stored manifest is re-parsed on read             |
| `modules/catalog/{controllers,services,managers,repositories}` | Controller -> Service (pagination, 404) -> Manager (presenter) -> Repository           |
| `modules/catalog/utilities`                                    | hostile-text check, JSON-Schema subset check, locale resolution, manifest hash, semver |
| `modules/seeding`                                              | manifests as typed constants, catalog seeder, settings seeder, their repositories      |
| `modules/runtime`                                              | adapter contract and the registry of BUILTIN adapter keys (skeleton)                   |
| `prisma/migrations/20261013180000_plugins_init`                | additive init migration; a fresh database must always get its tables                   |

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
- Tests run under Vitest with the `unplugin-swc` plugin. If Windows Smart App Control blocks the swc binary, run the
  specs with a swc-free config (esbuild with `experimentalDecorators`); the specs build their providers with `new`.
