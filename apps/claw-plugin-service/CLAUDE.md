# Plugin Service

Owns the plugin and MCP module: the catalog of first-party and curated plugins, their versions and tool rows, the
users' installs with their tool consents and write-only credentials, the users' own MCP servers, the invoke path that
runs a tool, the invocation audit table, and the admin `PluginSetting` table. Port 4021, database `claw_plugin`, route `/api/v1/plugins`. It does not own chat,
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

## What exists (Batch 3: user MCP servers, the egress guard and the invoke path)

ADR: [ADR-179](../../docs/13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md). Runbook: [skills/register-an-mcp-server-safely.md](../../skills/register-an-mcp-server-safely.md). Endpoint contract: the service guide.

- `/plugins/servers` (`PLUGINS_MANAGE_OWN_SERVERS`): register (discovery over `initialize` + the MCP tool-list call (tools/list) before anything is stored), list, get, patch (name, switch off or on, per-tool risk, enabled, standing consent), delete, write-only credential, `refresh` and `approve-changes`. Every query is `where { id, ownerUserId }`. Plan caps: `allowPlugins` and `maxUserMcpServers` (`null` unlimited, `0` disabled), the admin setting `userServers.enabled`, and `requireApproval` (a new server then waits in `PENDING_APPROVAL`; the admin routes are not built).
- `POST /plugins/invoke` (`PLUGINS_USE`): one tool call for the JWT user, for a BUILTIN adapter (`web-fetch`, `weather`, `datetime-and-math`), a curated `MCP_REMOTE` entry or one of the user's own servers. Order: duplicate call id, target ownership, plan gate, argument validation, blocked state, consent, rate and concurrency, circuit breaker, `PLUGIN_CALLS` hold with auth-service, run, settle, fence, audit. The answer always says `untrusted: true`. Body and answer are in the service guide.
- `modules/egress`: `SafeEgressManager` is the only code that opens a socket to a host a user or manifest named. Syntax check, DNS here with every answer public, a connection pinned to the checked address, no redirects (the page reader follows 3, each re-checked), size and time caps, no caller-set framing headers.
- `modules/mcp-servers`: the MCP client (streamable HTTP, JSON or event-stream answers, a session per call), the snapshot manager that vets and hashes a server's tools, the tool policy (WRITE by default), the review flow (`NEEDS_REVIEW` on a changed hash), the database circuit breaker with a half-open probe, and the credential endpoint builder.
- `modules/runtime`: the target resolver, consent gate, argument validator, per-user limiter, auth-service quota client, the two executors, the result fence, the audit manager and the three adapters.
- `POST /api/v1/internal/plugins/resolve` and `.../invoke` (`PluginInternalController`, `@Public()` + `ServiceTokenGuard`, `Authorization: Service <token>`): the routes chat-service calls for an `@`-mentioned message. The owner is `userId` in the body; every lookup is scoped by it. `invoke` is the same flow as the JWT route (no `PLUGINS_USE` role check, the plan gate still applies); `resolve` returns the mentioned installs' tools as `plugin_<slug>_<tool>` plus `loop.maxRounds` / `loop.maxCallsPerTurn`. chat-service mints `callId` (`chat-<uuid>`) and sends the surface in lower case.
- `modules/runtime-settings`: reads the admin `PluginSetting` rows the runtime needs; a missing or out-of-range value reads as the seeded default.

Not built yet: the admin approval queue and host rules, OAuth2 PKCE, the consent channel for chat, own MCP servers in `resolve`, events (`plugin.invoked` and friends), the retention job for old invocation rows.

## Layout

| Path                                                                                                                       | What                                                                                   |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `modules/catalog/schemas/plugin-manifest.schema.ts`                                                                        | the strict zod manifest schema; every stored manifest is re-parsed on read             |
| `modules/catalog/{controllers,services,managers,repositories}`                                                             | Controller -> Service (pagination, 404) -> Manager (presenter) -> Repository           |
| `modules/catalog/utilities`                                                                                                | hostile-text check, JSON-Schema subset check, locale resolution, manifest hash, semver |
| `modules/seeding`                                                                                                          | manifests as typed constants, catalog seeder, settings seeder, their repositories      |
| `modules/installs`                                                                                                         | install flow, plan gate manager, settings validator, credential crypto, consents       |
| `modules/admin`                                                                                                            | catalog kill switch and per-tool disables, `PluginSetting` editor                      |
| `modules/account-deletion`                                                                                                 | `user.deleted` consumer and its idempotent purge                                       |
| `modules/runtime`                                                                                                          | invoke path: target, consent, limits, quota, executors, fence, audit, the 3 adapters   |
| `prisma/migrations/20261013180000_plugins_init`, `20261014090000_plugin_installs`, `20261014180000_mcp_servers_and_invoke` | additive migrations; a fresh database must always get its tables                       |

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
- **The only decrypt path is `CredentialCryptoManager.open`**, called by the code about to attach the secret to one outbound request to that server's own URL. It returns `null` for a moved or tampered row. Never put the headers object in a log line or an error.
- **All outbound traffic to a user- or manifest-named host goes through `SafeEgressManager`.** Not `fetch`, not `axios`, not the shared `httpRequest` (its allow-list is for our own services and it does not resolve DNS). A refusal reaches a user only as `MCP_URL_BLOCKED`, `MCP_SERVER_UNREACHABLE` or `MCP_SERVER_REJECTED`; the reason stays in the log. `modules/egress/__tests__/ssrf-pentest.spec.ts` is a release gate: never weaken a case to make a change pass.
- **A server's tools are hostile until the owner says otherwise.** Names, descriptions and schemas are vetted and hashed; every tool starts as WRITE; server hints never lower a risk; a changed hash blocks calls until the exact hash is approved.
- **`CONSENT_REQUIRED` holds nothing and writes no audit row**, so the same call id can come back with `userApproved`. A tainted turn asks for every non-READ call, whatever was granted.
- **Vitest runs without decorator metadata here**, so a missing provider is invisible to the specs. After touching a module, compile and boot the module graph once (the recipe is in the runbook).
- **The `PLUGIN_CALLS` hold is keyed by the call id** (`plugin-call:<callId>`) and settled on every path: consume on `OK`, release on anything else. No answer from auth-service means the tool does not run.
- **Regexes over hostile input must be linear** (HTML, SSE, tool results). `html-to-text.utility.spec` times pathological pages.
- Tests run under Vitest with the `unplugin-swc` plugin. If Windows Smart App Control blocks the swc binary, run the
  specs with a swc-free config (esbuild with `experimentalDecorators`); the specs build their providers with `new`.
