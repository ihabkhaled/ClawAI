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
- `modules/egress`: `SafeEgressManager` is the only code that opens a socket to a host a user or manifest named. Syntax check, DNS here with every answer public, a connection pinned to the checked addresses (all of them, IPv4 and IPv6 interleaved; the socket falls back across them Happy-Eyeballs style inside the connect deadline, never to an unchecked address), no redirects (the page reader follows 3, each re-checked), size and time caps, no caller-set framing headers.
- `modules/mcp-servers`: the MCP client (streamable HTTP, JSON or event-stream answers, a session per call), the snapshot manager that vets and hashes a server's tools, the tool policy (WRITE by default), the review flow (`NEEDS_REVIEW` on a changed hash), the database circuit breaker with a half-open probe, and the credential endpoint builder.
- `modules/runtime`: the target resolver, consent gate, argument validator, per-user limiter, auth-service quota client, the two executors, the result fence, the audit manager and the three adapters.
- `POST /api/v1/internal/plugins/resolve` and `.../invoke` (`PluginInternalController`, `@Public()` + `ServiceTokenGuard`, `Authorization: Service <token>`): the routes chat-service calls for an `@`-mentioned message. The owner is `userId` in the body; every lookup is scoped by it. `invoke` is the same flow as the JWT route (no `PLUGINS_USE` role check, the plan gate still applies); `resolve` returns the mentioned installs' tools as `plugin_<slug>_<tool>` plus `loop.maxRounds` / `loop.maxCallsPerTurn`. chat-service mints `callId` (`chat-<uuid>`) and sends the surface in lower case.
- `modules/own-servers-chat` ([ADR-184](../../docs/13-adr/adr-184-own-mcp-servers-reach-chat-through-the-pinned-snapshot.md)): the user's own servers inside chat. `resolve` tries a ref id that is not an install as one of the caller's own servers and offers the stored, approved snapshot (no network; `APPROVED`, breaker closed, enabled tools, max 100, text cleaned again; 30 s bounded in-memory cache; 2 s deadline). A server in review or failing, or a failed lookup, becomes the notice `PLUGIN_SERVER_NEEDS_REVIEW` / `PLUGIN_SERVER_UNAVAILABLE`, never an error. `invoke` accepts the same id in `installId` (install first, then the caller's server, else the same 404). `GET /plugins/mentions` merges installs and own servers for the `@` picker.
- `modules/runtime-settings`: reads the admin `PluginSetting` rows the runtime needs; a missing or out-of-range value reads as the seeded default.

- `modules/consent-requests` ([ADR-185](../../docs/13-adr/adr-185-the-in-chat-consent-card-parks-the-turn-on-a-stored-argument-bound-request.md)): the in-chat consent card. A non-READ call that needs a yes stores a `plugin_consent_requests` row (user, call id, **argument hash**, redacted preview, 120 s deadline) and answers `CONSENT_REQUIRED` with its id. `POST /plugins/consent-requests/:id/decision` (JWT user only, `404` for anyone else) is `ALLOW_ONCE`, `ALLOW_CHAT` (WRITE only, 24 h, `plugin_chat_consents`), `ALWAYS_ALLOW` (DESTRUCTIVE needs `confirmDestructive`, stored as `confirmed_destructive`) or `DENY`; one conditional update decides, so two answers produce one winner. chat-service waits on `POST /internal/plugins/consent-requests/:id/wait` (bounded DB poll) and resumes the **same `callId`** with `consentRequestId`; `ConsentFlowManager.review` spends the approval in one conditional update bound to user + call + tool + target + hash (no replay, no other user, changed arguments ask again). `PluginInvokeService` takes the flow as an `@Optional()` last constructor argument.

Not built yet: OAuth2 PKCE, a retention job for old consent requests, events (`plugin.invoked` and friends), the retention job for old invocation rows.

## What exists (admin curation, ADR-187)

ADR: [ADR-187](../../docs/13-adr/adr-187-admin-curates-the-catalog-and-decides-user-servers-from-the-database.md). Runbook: [runbook-plugin-admin](../../docs/11-runbooks/runbook-plugin-admin.md). Contract: the service guide, "Admin curation".

- `modules/admin-curation` (`PLUGINS_ADMIN`, routes under `/plugins/admin/{curated,servers,rules,audit}`): create, edit (new patch version), switch, soft-delete, preview and health-check curated `MCP_REMOTE` entries; the approval queue for users' servers (`approve`, `reject` with a reason, one conditional UPDATE each); allow/deny rules; the audit log; the curated seeder (13 disabled drafts, written once, never rewritten).
- `modules/host-rules` is a leaf module (database only): `HostRulePolicyManager` is imported by `McpServersService` (user registration) and by the admin module. DENY wins; any ALLOW rule of a type makes it an allow-list.
- Publishing probes the server through `McpClientManager` (so through `SafeEgressManager`) and keeps only tools the server lists under `[a-z0-9_]{1,40}` names, with the server's own schema. A draft is never probed; a draft or `needsVerification` entry cannot be switched on. The probe credential is never stored, logged or audited.
- Approve and reject notify the submitter with `MCP_SERVER_APPROVED` / `MCP_SERVER_REJECTED` over `user.notification_requested` (best effort). A new `UserNotificationKind` needs the auth email kind, the map and 13 copies, plus the frontend text and icon.
- Per-plan gate: `allowedPlanSlugs` on the entry, checked by `InstallPlanGateManager.resolveInstallCap(userId, slugs)`.
- Every admin write calls `AdminAuditService.record` (names, counts, codes only). Specs: `modules/admin-curation/__tests__`, `modules/host-rules/__tests__`.

## What exists (Import: GitHub and upload)

ADR: [ADR-186](../../docs/13-adr/adr-186-plugins-are-imported-from-github-or-an-upload-as-inert-reviewed-documents.md). Module `modules/plugin-import`; routes `/plugins/imports` (contract in the service guide). A source is read into memory, parsed (Claude Code, ClawAI or bare layouts, marketplaces), held as a 30-minute draft and installed only on confirm with the reviewed checksum. **Nothing imported is executed or written to disk.** Rules for anyone touching it: GitHub goes only through `SafeEgressManager` with the two-host allow-list and a pinned commit SHA; archive readers are our own (`node:zlib`), choose the format by magic bytes, and every protection has a spec with a hand-built hostile archive (`__tests__/archive-builders.ts`); manifest JSON goes through `parseHostileJson`; hooks and stdio MCP servers are never run and `.mcp.json` / `hooks.json` are never stored; repositories return outcomes (`ImportInstallOutcome`), services throw `PluginImportError`.

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
| `modules/own-servers-chat`                                                                                                 | own MCP servers in chat: resolve offers, `@` picker rows, bounded cache                |
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
- **One open consent card per identical question.** `pending_key` (unique, set only while PENDING, cleared on decide/expire) is how `ConsentRequestsRepository.open` dedupes across call ids; any new path that closes a request must clear it, and the caller must resume with the returned row's `callId`.
- **Import errors are always coded.** A reader/parser crash becomes `PARSE_FAILED` (422), a NUL byte `CONTENT_INVALID`, multer's 413 `FILE_TOO_LARGE`, GitHub's limit 429 + `Retry-After`. A zip symlink is refused whatever host the zip names; a root `SKILL.md` is a one-skill plugin.
- **`CONSENT_REQUIRED` holds nothing and writes no audit row**, so the same call id can come back with `userApproved`. A tainted turn asks for every non-READ call, whatever was granted.
- **Vitest runs without decorator metadata here**, so a missing provider is invisible to the specs. After touching a module, compile and boot the module graph once (the recipe is in the runbook).
- **The `PLUGIN_CALLS` hold is keyed by the call id** (`plugin-call:<callId>`) and settled on every path: consume on `OK`, release on anything else. No answer from auth-service means the tool does not run.
- **Regexes over hostile input must be linear** (HTML, SSE, tool results). `html-to-text.utility.spec` times pathological pages.
- Tests run under Vitest with the `unplugin-swc` plugin. If Windows Smart App Control blocks the swc binary, run the
  specs with a swc-free config (esbuild with `experimentalDecorators`); the specs build their providers with `new`.
