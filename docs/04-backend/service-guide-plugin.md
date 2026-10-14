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
consumer ([ADR-172](../13-adr/adr-172-plugin-installs-consent-and-credentials.md)).
Batch 3 added user MCP servers, the MCP client, the invoke route with its built-in adapters (`web-fetch`, `weather`,
`datetime-and-math`), the metering, and the SSRF guard that all outbound traffic goes through
([ADR-179](../13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md)). The chat integration (the resolve
route, the tool loop and the composer) is batch 4.

## Boundaries

- The plugin database belongs to this service alone. No other service reads it.
- Chat-service is the only caller of the internal routes
  (`/api/v1/internal/plugins/*`). nginx answers 404 for the whole `/api/v1/internal/`
  prefix, so they are never reachable from the browser.
- The module is on for every plan, Free included. Free users install from the curated
  catalog and may register no custom MCP server. These limits are database numbers, not code.
- MCP credentials are encrypted with `PLUGIN_ENCRYPTION_KEY`. A leak of `ENCRYPTION_KEY`
  or of this key does not expose the other.
- Everything a tool returns is untrusted input (design section 0).
- The plugin service never connects to a host a user or a manifest named except through `SafeEgressManager`. A user MCP
  server is public https only, re-resolved and pinned on every call, and its tools start as WRITE.

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

## The internal routes chat-service calls (`/api/v1/internal/plugins/*`)

chat-service calls these two routes through `PluginInvokePort` (`apps/claw-chat-service/.../clients/plugin-invoke.client.ts`, schema-checked, fails soft). They are built (`PluginInternalController`). Both carry the service credential (`Authorization: Service <token>`, checked by `ServiceTokenGuard` in constant time; the routes are `@Public()` to the user guards) and the owner's `userId` in the body; every lookup is scoped by it. The plan gate (`allowPlugins`) applies exactly as on the user route; the `PLUGINS_USE` role permission does not, because there is no JWT here.

- `POST /api/v1/internal/plugins/resolve {userId, surface, refs: [{installId, toolName?, label?}]}` (at most 5 refs) answers `{tools: [{nativeName, installId, pluginSlug, toolName, title, description, inputSchema, riskLevel}], systemBlock, limits: {maxRounds, maxCallsPerTurn}, notices: [{code}]}`. It returns only tools of installs the caller owns that are ENABLED and available, not admin-disabled, and only the picked tool when a chip names one. `nativeName` is `plugin_<slug>_<tool>` (<= 64). `limits` come from `loop.maxRounds` and `loop.maxCallsPerTurn` (chat-service clamps them again). A plan without plugins, or nothing usable, answers `tools: []` with the notice `PLUGIN_NO_TOOLS`; a plan that cannot be read answers 503 and chat-service answers without tools. Own MCP servers are not offered by resolve yet (the chat `@` picker lists installs only); they are callable through invoke by `serverId`.
- `POST /api/v1/internal/plugins/invoke` takes the user route's body (see above) plus `userId`. chat-service sends `{userId, installId, toolName, args, callId, surface, tainted, conversationId?, messageId?}`: `callId` is minted per attempt as `chat-<uuid>`, `surface` goes out lower case (`best_of_n`), and empty ids are omitted. The answer is the user route's 200 body; chat-service reads `status` (`OK|ERROR|TIMEOUT|CONSENT_REQUIRED|BLOCKED|RATE_LIMITED|QUOTA_EXCEEDED`), `content`, `truncated`, `durationMs` and `errorCode` (nulls are accepted) and, for an HTTP refusal (403 plan, 409 duplicate, 503 quota unavailable), the `errorCode` of the error body. A WRITE or DESTRUCTIVE tool, or any non-READ tool when `tainted`, answers `CONSENT_REQUIRED` with an open consent request (see [The in-chat consent card](#the-in-chat-consent-card-adr-185)); chat-service parks the turn on it and resumes the same call after a yes, or tells the model the user declined. `content` is untrusted text: chat-service fences, sanitises and caps it again.

### Own MCP servers in chat (ADR-184)

A ref's `installId` that is not one of the caller's installs is tried as the id of one of the caller's own MCP servers (`where { id, ownerUserId }`; another user's id reads as unknown). The tools offered are the owner-approved snapshot stored with the server, so `resolve` never contacts the server: only `APPROVED` servers with a closed breaker, only enabled tools, local name `[a-z0-9_]{1,40}`, native name `plugin_<slug>_<tool>` (<= 64), an object input schema, at most 100 tools per message. Description and server name are cleaned again before the model sees them (invisible and bidi characters out, line breaks folded, description cut to 300). Risk is the stored risk (WRITE by default). The read is cached in memory per `userId:serverId` for 30 s (500 entries, no negative caching) and the whole lookup has a 2 s deadline.

Notices added to `notices[]` (shown by the frontend as `chat.pluginOwnServerUnavailable` / `chat.pluginOwnServerNeedsReview`, 13 locales): `PLUGIN_SERVER_NEEDS_REVIEW` (tools changed, owner must approve), `PLUGIN_SERVER_UNAVAILABLE` (unreachable, breaker open, lookup failed or slow; carries `pluginSlug` when a server is known). A `DISABLED`, pending or rejected server is skipped silently. `POST /internal/plugins/invoke` accepts the same id in `installId` (install first, then the caller's server, else 404 `TARGET_NOT_FOUND`); everything after target resolution is the ordinary server path (consent, limits, quota hold, breaker, fence, audit).

| Route                                          | Body | Answer                                                                                                                                                                                                                                                                  |
| ---------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/plugins/mentions` (`PLUGINS_USE`) |      | `[{installId, slug, name, iconKey, enabled}]`: installed plugins, then the caller's own servers (`iconKey: mcp-server`; `enabled` false when disabled, in review, rejected or breaker open). A failure reading servers returns the installs alone. `private, no-store`. |

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

## Admin curation (ADR-187)

`PLUGINS_ADMIN` only, under `/api/v1/plugins/admin`; the acting admin always comes from the JWT. Module `modules/admin-curation`
(controllers, services, managers, repositories) plus the leaf module `modules/host-rules` that the user-server code imports.
Outbound calls (`preview`, `health-check`, publishing) are rate limited to 20 per minute per caller. Responses are `private, no-store`.

| Method and path                                                    | Body                                                                                                                                                | Response                                                                                                              |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `GET /plugins/admin/curated`                                       | `?includeDeleted=true`                                                                                                                              | curated entries with URL, transport, auth, health, tools, texts                                                       |
| `GET /plugins/admin/curated/:slug`                                 |                                                                                                                                                     | one entry                                                                                                             |
| `POST /plugins/admin/curated/preview`                              | `{url, transport, auth, credential?}`                                                                                                               | `{serverName, latencyMs, tools[{name, description, inputSchema, defaultRisk: WRITE, curatable}], skipped[], ignored}` |
| `POST /plugins/admin/curated`                                      | `{slug, publisher, category, iconKey, homepageUrl?, translations, server, auth, tools[], allowedPlanSlugs, adminNotes?, publish, probeCredential?}` | `201` the entry; `publish` probes the server first                                                                    |
| `PUT /plugins/admin/curated/:slug`                                 | the same without `slug`                                                                                                                             | the entry; a changed manifest adds a patch version                                                                    |
| `PATCH /plugins/admin/curated/:slug/state`                         | `{enabled}`                                                                                                                                         | the entry; switching a draft or unverified entry on is `409`                                                          |
| `POST /plugins/admin/curated/:slug/health-check`                   |                                                                                                                                                     | the entry with `health {status, latencyMs, checkedAt, errorCode}`                                                     |
| `DELETE /plugins/admin/curated/:slug`                              |                                                                                                                                                     | `204`; soft delete                                                                                                    |
| `GET /plugins/admin/servers`                                       | `?status=PENDING_APPROVAL` (default)                                                                                                                | users' servers: submitter id, host, path, tools with risk, highest risk                                               |
| `GET /plugins/admin/servers/:id`                                   |                                                                                                                                                     | one server                                                                                                            |
| `POST /plugins/admin/servers/:id/approve`                          |                                                                                                                                                     | the server; only from `PENDING_APPROVAL`                                                                              |
| `POST /plugins/admin/servers/:id/reject`                           | `{reason}` (1-200 characters, one line)                                                                                                             | the server; from `PENDING_APPROVAL`, `NEEDS_REVIEW` or `APPROVED`                                                     |
| `GET/POST /plugins/admin/rules`, `DELETE /plugins/admin/rules/:id` | `{kind: ALLOW\|DENY, match: HOST\|PUBLISHER\|SLUG, pattern, note?}`                                                                                 | rules; a duplicate is `409`                                                                                           |
| `GET /plugins/admin/audit`                                         | `?limit=1..100&targetType=`                                                                                                                         | newest first: `{actorId, action, targetType, targetId, summary}`                                                      |

Errors carry `errorCode`: `PLUGIN_CURATION_SLUG_TAKEN` (409), `_NOT_CURATED` (409, a first-party entry), `_NOT_FOUND` (404), `_MANIFEST_INVALID`
(422, with `errors[]`), `_URL_BLOCKED` (422), `_HOST_DENIED` (403, a rule; also on user registration), `_PROBE_FAILED` (502, with `reason`),
`_TOOLS_UNVERIFIED` (422, with `missing[]`), `_OAUTH_UNSUPPORTED` (422), `_NEEDS_VERIFICATION` (409), `_SERVER_NOT_PENDING` (409), `_RULE_EXISTS` (409),
`_RULE_INVALID`.

- A curated tool is called by its manifest name, so a publishable tool name matches `[a-z0-9_]{1,40}`; the preview marks others `curatable: false`.
- Publishing replaces each tool's description and input schema with the server's own and keeps the admin's risk. An edit keeps the tool disables of the
  previous version. Soft delete sets `deleted_at`, status `HIDDEN`, off and not featured.
- Per-plan gating: `allowedPlanSlugs` on the entry (empty = every plan) is checked at install in `InstallPlanGateManager.resolveInstallCap`.
- Rules: DENY wins; any ALLOW rule of a type makes it an allow-list; HOST covers the host and its subdomains. Enforced by `HostRulePolicyManager` on user registration,
  approval, and every curated preview, save and health check. They do not stop calls to an already approved server.
- Approve and reject send `MCP_SERVER_APPROVED` / `MCP_SERVER_REJECTED` through `user.notification_requested` (params `title`, `excerpt`); the dedupe key includes the decision time.
- Tables (migration `20261015120000_plugins_admin_catalog`, additive and idempotent): `plugin_host_rules`, `plugin_admin_audit`, and columns on `plugin_catalog_entries`
  (`deleted_at`, `admin_notes`, `needs_verification`, `allowed_plan_slugs`, `health_*`) and `mcp_servers` (`decided_by`, `decided_at`, `decision_reason`).
- The curated seed (`CuratedSeederService`, 13 entries from `INTEGRATION-CATALOG.md`) creates disabled drafts that need verification, once per slug, and never rewrites one. Only the Context7
  and DeepWiki URLs are in the repo docs (marked "verify"); the others use the placeholder host `verify-url.example.com`.

Runbook: [runbook-plugin-admin](../11-runbooks/runbook-plugin-admin.md).

## MCP servers API (batch 3)

A user's own remote MCP servers ([ADR-179](../13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md)).
Every route needs a valid JWT and `PLUGINS_MANAGE_OWN_SERVERS` (ADMIN passes without a lookup). The owner is always the
JWT user; a server that belongs to someone else answers `404 MCP_SERVER_NOT_FOUND`, the same as a missing one. Server ids
are UUIDs. Responses are `Cache-Control: private, no-store`. `POST /servers` and `POST /servers/:id/refresh` open a
connection to a host the user named, so they are rate limited to 10 per minute per caller.

| Method and path                                    | Body                                                                  | Response                                                                                         |
| -------------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `POST /api/v1/plugins/servers`                     | `{name, url, authKind: NONE\|API_KEY\|BEARER_TOKEN, credential?}`     | `201 {server, skippedTools[], ignoredTools}`                                                     |
| `GET /api/v1/plugins/servers`                      |                                                                       | server views, newest first                                                                       |
| `GET /api/v1/plugins/servers/:id`                  |                                                                       | server view with `tools[]`                                                                       |
| `PATCH /api/v1/plugins/servers/:id`                | `{name?, enabled?, tools?: [{name, enabled?, riskLevel?, consent?}]}` | server view with `tools[]`                                                                       |
| `DELETE /api/v1/plugins/servers/:id`               |                                                                       | `204`; tools and the credential go with it                                                       |
| `PUT /api/v1/plugins/servers/:id/credential`       | `{value, headerName?}`                                                | `{hasCredential: true, kind, updatedAt}` (write-only)                                            |
| `DELETE /api/v1/plugins/servers/:id/credential`    |                                                                       | `204` (also when there was none)                                                                 |
| `POST /api/v1/plugins/servers/:id/refresh`         |                                                                       | `{changed, diff: {added[], removed[], changed[]} \| null, server, skippedTools[], ignoredTools}` |
| `POST /api/v1/plugins/servers/:id/approve-changes` | `{toolsHash}`                                                         | server view with `tools[]`                                                                       |

`credential` is `{value, headerName?}`: required with `API_KEY` and `BEARER_TOKEN`, refused with `NONE`. The value is
printable ASCII without spaces, at most 4096 characters. A bearer token always travels as `Authorization: Bearer <value>`;
an API key uses `X-API-Key` unless `headerName` is another allow-listed header (`Authorization`, `X-API-Key`, `Api-Key`, `X-*`).

Server view: `{id, slug, name, url, urlHost, authKind, status, hasCredential, credentialUpdatedAt, toolCount, toolsHash, serverInfo {name, version} | null, lastCheckedAt, lastErrorCode, createdAt, updatedAt}`.
Tool view (in `tools[]`): `{name, nativeName, remoteName, description, inputSchema, riskLevel, enabled, consentGranted}`.
`name` is the local name (`[a-z0-9_]{1,40}`) used by the API; `nativeName` is `plugin_<slug>_<name>` (the slug is `mcp` plus 12 hex
characters of the id), what the model is offered; `remoteName` is the server's own name for it.
`status` is `APPROVED` (usable), `PENDING_APPROVAL` (the admin setting `userServers.requireApproval` is on), `NEEDS_REVIEW`
(the tool list changed), `DISABLED` (the owner switched it off), `REJECTED` (an admin rejected it, with a reason) or `UNREACHABLE`. Admins decide `PENDING_APPROVAL` servers in the queue ([Admin curation](#admin-curation-adr-187)).
`lastErrorCode` is `MCP_SERVER_UNREACHABLE` or `MCP_SERVER_REJECTED`, never a detail.

- Registering resolves and checks the URL, performs `initialize` and the tool-list call (tools/list), vets the tools and stores everything in one
  transaction behind a per-user advisory lock (cap and duplicate URL are decided inside it). A cheap count runs first, so a
  user at the cap never makes us open a connection. Every tool starts as `WRITE` with no consent.
- `PATCH` tools: `riskLevel` may be any of READ, WRITE, DESTRUCTIVE (only the owner can lower it, and changing it clears the
  stored consent); `consent: true` stores a standing grant and is allowed only on a WRITE tool; `enabled` switches the tool
  off. The batch is validated whole before anything is written. `enabled` on the server switches an `APPROVED` server off and a
  `DISABLED` one on; any other state answers `409 MCP_STATE_NOT_ALLOWED`, so nobody skips a review by toggling.
- `refresh` re-reads the tool-list call (tools/list). Same hash: `changed: false`, the server keeps working. A different hash: the new list is
  stored, the status becomes `NEEDS_REVIEW` (or stays `PENDING_APPROVAL`), calls are blocked, and the response carries the diff.
  Tools whose definition did not change keep the owner's settings; new or changed ones start as WRITE. `approve-changes` needs
  the exact `toolsHash` of the list the owner saw (`409 MCP_REVIEW_HASH_MISMATCH` otherwise, `409 MCP_NOT_AWAITING_REVIEW`
  when nothing is waiting).

Error codes: `MCP_URL_BLOCKED` 422 (the URL itself: scheme, userinfo, port, local or IP-literal host; one message for all of
them), `MCP_SERVER_UNREACHABLE` 502 and `MCP_SERVER_REJECTED` 502 (everything that happens after the syntax check: a private
address, a failed lookup, a closed port, a refused certificate, a redirect, a bad answer; the user cannot tell which),
`MCP_NO_USABLE_TOOLS` 422, `MCP_SERVERS_DISABLED` 403 (`userServers.enabled` is off), `MCP_SERVER_LIMIT` 403 (`limit`,
`current`; `maxUserMcpServers` of `0` is disabled, `null` is unlimited), `PLUGIN_PLAN_DISABLED` 403,
`PLUGIN_ENTITLEMENTS_UNAVAILABLE` 503 (fails closed), `MCP_SERVER_ALREADY_REGISTERED` 409, `MCP_SERVER_NOT_FOUND` 404,
`MCP_TOOL_NOT_FOUND` 404, `MCP_CONSENT_NOT_ALLOWED` 400, `MCP_CREDENTIAL_NOT_SUPPORTED` 400,
`MCP_CREDENTIAL_HEADER_DENIED` 400, `MCP_CREDENTIAL_REQUIRED` 400 (refresh of a server whose credential is gone),
`MCP_STATE_NOT_ALLOWED` 409, `MCP_NOT_AWAITING_REVIEW` 409, `MCP_REVIEW_HASH_MISMATCH` 409.

## Invoke API (batch 3)

The contract for the chat integration. One route runs one tool for the signed-in user:

`POST /api/v1/plugins/invoke`, `Authorization: Bearer <the user's JWT>`, `PLUGINS_USE`. `Cache-Control: no-store`.
chat-service calls it service to service (`PLUGIN_SERVICE_URL`, not through nginx) with the user's own bearer token
forwarded, so the caller is the JWT user and nothing in the body can name another one.

Request body (strict; unknown fields are `400`):

| Field                         | Type                                      | Notes                                                                                                                                                                                                                   |
| ----------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installId`                   | UUID                                      | A catalog plugin the user installed. Exactly one of `installId` and `serverId`.                                                                                                                                         |
| `serverId`                    | UUID                                      | One of the user's own MCP servers.                                                                                                                                                                                      |
| `toolName`                    | `[a-z0-9_]{1,40}`                         | The tool's local name (the part after `plugin_<slug>_`).                                                                                                                                                                |
| `args`                        | object (default `{}`)                     | Model-written arguments. Validated against the tool's `inputSchema`; at most 32 KB; defaults are filled.                                                                                                                |
| `callId`                      | `[A-Za-z0-9][A-Za-z0-9_.:-]{7,99}`        | Unique per user. Idempotency key for the quota hold and the audit row (`409 PLUGIN_CALL_DUPLICATE` on reuse). Every answer except `CONSENT_REQUIRED` is audited and so uses the id up; send a new id for a new attempt. |
| `surface`                     | `[a-z][a-z0-9:_-]{0,39}` (default `chat`) | `chat`, `compare`, `consensus`, `lab:<name>` ...                                                                                                                                                                        |
| `conversationId`, `messageId` | string <= 100                             | Optional, stored on the audit row.                                                                                                                                                                                      |
| `tainted`                     | boolean (default false)                   | True when an untrusted tool result is already in the model context this turn.                                                                                                                                           |
| `userApproved`                | boolean (default false)                   | True only when the user said yes to THIS call (same `callId`, same arguments).                                                                                                                                          |

Response `200` (every runtime outcome is a 200; client mistakes are 4xx):

```
{ callId, status, content, truncated, untrusted: true, durationMs, riskLevel, nativeName, errorCode, consent, quota }
```

`status` is one of `OK`, `ERROR`, `TIMEOUT`, `CONSENT_REQUIRED`, `BLOCKED`, `RATE_LIMITED`, `QUOTA_EXCEEDED`.
`content` is the tool's text wrapped as `<tool_result plugin="<slug>" tool="<tool>" trust="untrusted">...</tool_result>`
(control, zero-width and bidi characters removed, the fence tag inside it escaped, cut at the result cap with a
`[result truncated]` note) for `OK`, `ERROR` and `TIMEOUT`; `null` for every status where nothing ran. It is data, never
instructions: chat-service must keep it inside the fence and must not let it add a tool call. `errorCode` carries the
reason for anything but `OK`.

| `status`           | When                                                                                                                                     | `errorCode` / extra                                                                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OK`               | The tool ran and delivered a result. One `PLUGIN_CALLS` run was consumed.                                                                |                                                                                                                                                                                                   |
| `ERROR`            | The tool ran and failed (or reported an error). The run was given back.                                                                  | `PLUGIN_TOOL_FAILED`, `PLUGIN_CALL_ABORTED`, `PLUGIN_RESULT_TOO_LARGE`, `PLUGIN_ADAPTER_FAILED`, `PLUGIN_ADAPTER_MISSING`                                                                         |
| `TIMEOUT`          | The deadline passed (the tool's own, at most 60 s). The run was given back.                                                              | `PLUGIN_TOOL_TIMED_OUT`                                                                                                                                                                           |
| `CONSENT_REQUIRED` | The user must say yes first. Nothing was held and nothing was audited, so the same `callId` can be sent again with `userApproved: true`. | `consent: {reason, argsHash, argsPreview}`; `reason` is `REQUIRED_FIRST_USE`, `REQUIRED_EVERY_CALL` or `REQUIRED_TAINTED`. `argsPreview` is redacted and <= 512 characters, for the consent card. |
| `BLOCKED`          | The target exists but cannot run now.                                                                                                    | `PLUGIN_TOOL_UNAVAILABLE` (switched off, withdrawn, admin-disabled tool), `PLUGIN_SERVER_NEEDS_REVIEW`, `PLUGIN_SERVER_BREAKER_OPEN`, `PLUGIN_CREDENTIAL_UNREADABLE`                              |
| `RATE_LIMITED`     | Over the per-minute rate or the concurrent-call limit.                                                                                   | `PLUGIN_RATE_LIMITED`, `PLUGIN_CONCURRENCY_LIMITED`                                                                                                                                               |
| `QUOTA_EXCEEDED`   | The daily `PLUGIN_CALLS` allowance is used up or the plan has none.                                                                      | `PLUGIN_CALLS_EXHAUSTED` or `PLUGIN_CALLS_DISABLED`; `quota: {used, limit, window}`                                                                                                               |

HTTP errors: `400 PLUGIN_ARGUMENTS_INVALID` (`errors[{field, message}]`, paths only), `403 PLUGIN_PLAN_DISABLED`,
`404 PLUGIN_TARGET_NOT_FOUND` (not the caller's, or missing; the same answer), `404 PLUGIN_INVOKE_TOOL_NOT_FOUND`,
`409 PLUGIN_CALL_DUPLICATE`, `503 PLUGIN_QUOTA_UNAVAILABLE` (auth-service cannot answer; fail closed, the tool did not run).
Closing the connection aborts a running tool (the Stop button).

Consent rules, in order: READ never asks. `userApproved` lets the call through. A `tainted` turn asks for every non-READ
call and ignores a standing grant. DESTRUCTIVE asks every call. WRITE asks until a grant is stored (catalog install:
`POST /installs/:id/consent`; own server: `PATCH /servers/:id` with `consent: true`). `nativeName` is
`plugin_<slug>_<toolName>` (<= 64 characters), for the model-facing tool catalog.

Limits the chat loop respects come from the `PluginSetting` rows (`loop.maxRounds`, `loop.maxCallsPerTurn`), published to chat-service by the internal
`resolve` route above; `call.timeoutMs`, `call.maxResultBytes`, `rate.perUserPerMinute` and `rate.perUserConcurrent` are enforced here on every call.
chat-service reaches the runtime through `POST /api/v1/internal/plugins/invoke` (service token, `userId` in the body), not through this JWT route.

## The in-chat consent card (ADR-185)

[ADR-185](../13-adr/adr-185-the-in-chat-consent-card-parks-the-turn-on-a-stored-argument-bound-request.md). A non-READ call that needs a yes stores a consent request and answers `CONSENT_REQUIRED` with `consent: {reason, argsHash, argsPreview, requestId, expiresAt, options: {allowChat, always, alwaysNeedsConfirmation}}`. Requests live 120 s. All user routes need `PLUGINS_USE`, answer `private, no-store`, and look rows up by `(id, JWT user)`: another user's id is `404 PLUGIN_CONSENT_REQUEST_NOT_FOUND`.

| Route                                                     | Body                                                                        | Answer                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GET /api/v1/plugins/consent-requests?conversationId=`    |                                                                             | open (pending, not lapsed) requests of the caller, oldest first, <= 20; how the card returns after a reload                                                                                                                                                                                                                                                                                                                    |
| `GET /api/v1/plugins/consent-requests/:id`                |                                                                             | the request view (never the call id or the hash)                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /api/v1/plugins/consent-requests/:id/decision`      | `{choice: ALLOW_ONCE\|ALLOW_CHAT\|ALWAYS_ALLOW\|DENY, confirmDestructive?}` | the request view. Same choice again `200`; a different choice on a decided request `409 PLUGIN_CONSENT_REQUEST_ALREADY_DECIDED`; lapsed `410 PLUGIN_CONSENT_REQUEST_EXPIRED`; `400 PLUGIN_CONSENT_SCOPE_NOT_ALLOWED` (chat grant for a DESTRUCTIVE tool or without a conversation, always for an own-server DESTRUCTIVE tool); `400 PLUGIN_CONSENT_CONFIRMATION_REQUIRED` (always on DESTRUCTIVE without `confirmDestructive`) |
| `GET /api/v1/plugins/chat-grants`                         |                                                                             | active "Allow for this chat" grants `{id, conversationId, pluginSlug, toolName, riskLevel, grantedAt, expiresAt}`                                                                                                                                                                                                                                                                                                              |
| `DELETE /api/v1/plugins/chat-grants/:id`                  |                                                                             | `204`; `404 PLUGIN_CHAT_GRANT_NOT_FOUND` for another user's id                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /api/v1/internal/plugins/consent-requests/:id/wait` | `{userId, waitMs <= 20000}`                                                 | the request view when it is no longer pending or `waitMs` passed (status `PENDING` then); service token only                                                                                                                                                                                                                                                                                                                   |

One open card per identical question (migration `20261015200000_plugins_consent_idempotent`): `plugin_consent_requests.pending_key` is a unique SHA-256 of user + tool + target + argument hash + conversation, set only while the row is `PENDING` and cleared on any answer or lapse. A model that repeats a call under a new call id therefore gets the card already open instead of a duplicate, and the invoke answer carries THAT row's `callId` so chat-service resumes the right call (the duplicates are then refused once: one approval is spent once). The migration first deletes duplicate pending rows (oldest kept). chat-service now sends `conversationId` and `messageId` on every plugin call (`AssembledContext.pluginTurn`), so cards, "allow for this chat" and a reload find them.

Resuming: `POST /plugins/invoke` and `/internal/plugins/invoke` accept `consentRequestId` (uuid). The approval is spent by one conditional update bound to user, `callId`, tool, target, argument hash, `APPROVED`, unspent and not lapsed. A request that was denied or lapsed (same call id and arguments) refuses the call as `BLOCKED` with `PLUGIN_CONSENT_DENIED` / `PLUGIN_CONSENT_EXPIRED`; any other mismatch (not found, other user, changed arguments, already spent) simply does not count, so the gate asks again. `ALLOW_CHAT` grants (WRITE only, 24 h) count in the gate unless the turn is tainted; a confirmed DESTRUCTIVE `ALWAYS_ALLOW` (`plugin_tool_consents.confirmed_destructive`) lets a DESTRUCTIVE catalog tool skip the ask, again unless tainted.

chat-service side: `PluginConsentPort` (`PluginConsentClient`) waits; `PluginToolLoopManager` emits the `plugin_consent_requested` / `plugin_consent_resolved` stream frames (`pluginConsent` payload), waits in 20 s slices to the request deadline (ceiling 150 s, at most 10 waits), resumes with the same call id on `APPROVED`, and otherwise gives the model a clear "declined" or "no answer" result. Frontend: `PluginConsentPrompts` in the chat footer, `pluginConsent.*` strings, grants list on the Installed page.

## The egress guard

Everything that reaches a host a user or a manifest named goes through `SafeEgressManager`
(`src/modules/egress`): syntax first, then DNS here with every answer checked, then a connection pinned to the checked addresses (every validated A and AAAA answer, tried in turn so one dead address no longer times the call out)
([ADR-179](../13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md)). The release gate is
`src/modules/egress/__tests__/ssrf-pentest.spec.ts`; the runbook is
[register-an-mcp-server-safely](../../skills/register-an-mcp-server-safely.md).

- Refused before DNS: any scheme but https, userinfo, a fragment, a port other than 443/8443 (the page reader: 443), more than 2048
  characters, control characters, IP literals in any notation (decimal, octal, hex, short, full-width, IPv6, mapped, NAT64, 6to4),
  single-label names, `localhost`, `*.local`, `*.internal`, `*.localhost`, `*.svc`, the cloud metadata names.
- Refused after DNS: a name with even one answer in a private, loopback, link-local, carrier-grade NAT, benchmarking,
  documentation, multicast or reserved range, or an IPv6 address outside `2000::/3` or carrying such an IPv4 address.
- No redirects for MCP traffic. The web reader follows at most 3 hops, each re-checked from the top.
- `web-fetch` reads any public https page (1 MB cap); `weather` reaches only the two Open-Meteo hosts of its manifest;
  `datetime-and-math` has no network at all.
- Per-call defaults come from `PluginSetting` (`call.timeoutMs` 30 s, `call.maxResultBytes` 256 KB); a tool's own manifest
  limits apply when lower. A server's tool list is capped at 512 KB, 64 tools, 16 KB per schema and 1024 characters per description.

## Plugin import (ADR-186)

Routes under `/api/v1/plugins/imports` (module `plugin-import`). Writes need `PLUGINS_INSTALL`, reads `PLUGINS_USE`; the plan gate (`allowPlugins`) applies to previews and confirm; every row is scoped by the JWT user. Responses are `private, no-store`.

| Route                    | Body                                                                                                 | Answer                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `POST /preview/github`   | `{ source, subdir? }` (`owner/repo[/folder][@ref]` or a github.com / raw.githubusercontent.com link) | `{ kind: 'PLUGIN', draft }` or `{ kind: 'MARKETPLACE', name, candidates[] }` |
| `POST /preview/upload`   | multipart `file` (`.zip` / `.tgz`, 5 MB) + optional `subdir`                                         | same                                                                         |
| `POST /:draftId/confirm` | `{ checksum, acknowledged: true }`                                                                   | `201` the imported plugin                                                    |
| `GET /`, `GET /:id`      |                                                                                                      | the user's imported plugins                                                  |
| `DELETE /:id`            |                                                                                                      | `204`                                                                        |

A `draft` carries `draftId`, `checksum`, `source { kind, ref, commitSha }`, `expiresAt` (30 minutes) and the `preview`: format (`CLAUDE` / `CLAWAI` / `BARE`), name, version, description, author, license, `components[]` (`kind`, `name`, `support` = `USABLE` / `STORED_INERT` / `NOT_SUPPORTED`, `reasonKey`, `url`), `risk`, `warnings[]` (stable keys), file counts. Previews are throttled to 10 a minute.

Limits (`constants/plugin-import.constants.ts`): upload 5 MB; 500 entries; 1 MB an entry; 10 MB unpacked; ratio 100; path depth 12; manifest 256 KB and 16 levels; 100 components a kind; GitHub: 150 files, 5 MB, 10 s a request, 45 s overall, 170 requests; per user 20 plugins, 20 MB, 5 drafts.

Error codes (`PLUGIN_IMPORT_*`, in `errorCode`): `SOURCE_INVALID`, `SOURCE_UNREACHABLE` (502), `SOURCE_NOT_FOUND` (404), `SOURCE_RATE_LIMITED` (**429** with a `Retry-After` header and `retryAfterSeconds` / `retryAt` in the body), `UPLOAD_MISSING`, `UPLOAD_TOO_LARGE` and `FILE_TOO_LARGE` (413; `FILE_TOO_LARGE` is the multer limit, translated by `UploadLimitInterceptor`), `CONTENT_INVALID` (a NUL byte in a stored document) and `PARSE_FAILED` (any other reader or parser crash, so a bad file is a 422 and never a bare 500), `ARCHIVE_UNSUPPORTED`, `ARCHIVE_CORRUPT`, `ARCHIVE_TOO_MANY_ENTRIES`, `ARCHIVE_TOO_LARGE_UNPACKED`, `ARCHIVE_BOMB`, `ARCHIVE_ENCRYPTED`, `PATH_UNSAFE`, `PATH_TOO_DEEP`, `SYMLINK_REJECTED`, `DUPLICATE_ENTRY`, `NON_UTF8`, `MANIFEST_INVALID`, `MANIFEST_TOO_LARGE`, `MANIFEST_TOO_DEEP`, `MANIFEST_FORBIDDEN_KEY`, `NO_PLUGIN_FOUND` (all 422), `DRAFT_NOT_FOUND` / `NOT_FOUND` (404), `CHECKSUM_MISMATCH` / `DUPLICATE_PLUGIN` (409), `QUOTA_PLUGINS` / `QUOTA_BYTES` (403).

Import fixes (QA round on v1.215.2): a zip entry that carries a unix symlink mode is refused whatever host the zip names (and a DOS reparse point too), matching tgz; a `SKILL.md` at the root of a folder or repository is lifted to `skills/<name>/SKILL.md` and imported as a one-skill plugin; `stripControlAndInvisible` keeps ZWNJ/ZWJ after an Arabic-, Indic-script or emoji character; GitHub trees (commit SHA + recursive tree) are cached 60 s per `owner/repo@ref` (max 50 entries, in memory); the rate-limit time comes from `Retry-After`, else `x-ratelimit-reset`, else 15 minutes (capped at 1 hour). No GitHub token: plugin settings hold booleans and numbers only (`PluginSettingKey` rules), and a token is a secret, so it waits for a secret store. `PluginImportFilter` adds the `Retry-After` header.

Tables (migration `20261015130000_plugins_import`): `plugin_import_drafts`, `imported_plugins` (unique per `user_id` + `name_key`), `imported_plugin_files` (cascade), `plugin_import_audit`. `user.deleted` removes all four. Supported formats for users: [plugin-import-supported-formats](../02-business-product/plugin-import-supported-formats.md).

## Account deletion

The service subscribes to `user.deleted` (queue prefix `claw.plugins`) and deletes the user's credentials, consents,
installs, invocation audit rows and own MCP servers (their tools and credential go with them) in one transaction, lowering each plugin's `installCount`. It is idempotent and logs
only the event id and counts. If processing throws, the broker retries the durable event.

## Data and seeding

Tables (migrations `20261013180000_plugins_init` and `20261014090000_plugin_installs`, both additive):
`plugin_catalog_entries`, `plugin_versions`, `plugin_tools`, `plugin_settings`, `plugin_installs` (unique
`(user_id, plugin_id)`), `plugin_tool_consents`, `plugin_credentials` (one per install, ciphertext only) and
`plugin_invocations` (the audit: ids, status, risk, consent decision, a hash of the arguments, sizes and timing, never
the arguments or the result). Batch 3 adds (migration `20261014180000_mcp_servers_and_invoke`, additive and idempotent)
`mcp_servers` (unique `(owner_user_id, url)`, the circuit-breaker columns), `mcp_server_tools` (the approved snapshot, with
`risk_level` default WRITE and `consent_granted`), `mcp_server_credentials` (one per server, ciphertext only), and on
`plugin_invocations` the columns `server_id` and `call_id` (unique with `user_id`) and nullable `install_id` / `plugin_id`.
The in-chat consent card adds (migration `20261015110000_plugins_consent_card`, additive and idempotent) `plugin_consent_requests` (unique `(user_id, call_id)`; redacted preview, argument hash, status, choice, deadline), `plugin_chat_consents` (unique `(user_id, conversation_id, target_key, tool_name)`) and `plugin_tool_consents.confirmed_destructive`. OAuth state and host rules arrive later.

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

## Production

The live server reads `/srv/clawai/.env`, written before this service existed, and the deploy never
starts databases or invents secrets. The service's needs are declared in `scripts/prod-required-env.manifest`
(`PG_PLUGIN_PASSWORD`, `PLUGIN_DATABASE_URL` derived from it, `PLUGIN_ENCRYPTION_KEY` as 64 hex characters,
and the running `claw-pg-plugin` container). Run `scripts/ensure-prod-env.sh --env /srv/clawai/.env --check` first;
without `--check` it appends what is missing and never rewrites a value. Steps and traps:
[add-a-service-to-production](../11-runbooks/add-a-service-to-production.md). The full list of places a service
is wired is [skills/add-a-new-service.md](../../skills/add-a-new-service.md).

## References

- Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md)
- Decisions: [ADR-171](../13-adr/adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md), [ADR-172](../13-adr/adr-172-plugin-installs-consent-and-credentials.md), [ADR-179](../13-adr/adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md), [ADR-185](../13-adr/adr-185-the-in-chat-consent-card-parks-the-turn-on-a-stored-argument-bound-request.md)
- Runbook: [runbook-plugin-admin](../11-runbooks/runbook-plugin-admin.md) (ADR-187)
- Runbooks: [add-a-catalog-plugin](../../skills/add-a-catalog-plugin.md), [register-an-mcp-server-safely](../../skills/register-an-mcp-server-safely.md)
- Service rules: [apps/claw-plugin-service/CLAUDE.md](../../apps/claw-plugin-service/CLAUDE.md)
