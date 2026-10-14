# ADR-187: Admins curate the catalog and decide user servers from the database

**Status:** Accepted

**Date:** 2026-10-15

Builds on [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md) (a separate service with a curated catalog) and [ADR-179](adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md) (user servers are SSRF-guarded and consent-gated). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Runbook: [runbook-plugin-admin](../11-runbooks/runbook-plugin-admin.md). Roadmap items: P0-2, P0-5 and P1-5 in [plugins-roadmap/GAPS.md](../02-business-product/plugins-roadmap/GAPS.md).

## Context

Three things were missing for operating the plugin catalog:

1. A curated entry (`CURATED_MCP`) could only be added by a code change and a deploy. The admin screen could switch plugins on or off, feature them and tune settings, nothing more.
2. The admin setting `userServers.requireApproval` existed and the user-side code honoured it (a new server waits in `PENDING_APPROVAL`), but nothing could approve or reject a server. Turning the setting on left every new server stuck forever.
3. There was no allow or deny rule, no health view of a curated server and no record of who changed what.

## Decision

**Everything an admin decides is data, in the plugin database, behind `PLUGINS_ADMIN`.** No new permission, no new environment variable.

- **Curated entries are created, edited, switched, soft-deleted, previewed and health-checked through `/plugins/admin/curated`.** The service builds the manifest from a form, runs it through the same strict `parsePluginManifest` every stored manifest is re-parsed with, and stores it as a normal `PluginVersion`. An edit that changes the manifest adds a patch version and makes it current; an edit that does not change it adds nothing. Installs stay pinned to their version. Admin tool disables carry over to the new version.
- **Publishing needs a live probe.** `publish: true` makes one bounded `initialize` plus `tools/list` call through `SafeEgressManager` (ADR-179: public hosts only, pinned address, no redirects, size and time caps). Every tool the admin declares must be one the server listed under a usable name (a curated tool is called by its manifest name, so it must already be lower case, digits and underscore), and the server's own description and input schema replace what was typed. A draft is not probed and cannot be switched on. OAuth entries can only be drafts, because the runtime has no OAuth yet. The probe credential rides on that one request and is never stored, logged or audited.
- **Soft delete hides, it does not erase.** The entry becomes `HIDDEN`, off and not featured, with `deletedAt` set. Installs read `UNAVAILABLE`, the slug stays taken, and a first-party entry cannot be edited or deleted here.
- **Per-plan gating is a list of plan slugs on the entry.** Empty means every plan. The install flow checks it with the plan the caller already has (an admin always passes); a plan not on the list answers `403 PLUGIN_PLAN_DISABLED`. A user who downgrades after installing keeps the install; the gate is at install time.
- **The approval queue is two conditional updates.** `GET /plugins/admin/servers` lists by state with the submitter id, URL host and path (never the query string, which can carry a token), tools with their risk, the highest risk and whether a key exists. `approve` moves `PENDING_APPROVAL` to `APPROVED`; `reject` takes a reason of at most 200 characters and moves `PENDING_APPROVAL`, `NEEDS_REVIEW` or `APPROVED` (a revocation) to `REJECTED`. Each is one `UPDATE ... WHERE status IN (...)`, so two admins cannot both decide and a server that moved on answers `409`. The decision (`decidedBy`, `decidedAt`, `decisionReason`) is stored on the server row.
- **The submitter is told through the existing pipeline.** Two kinds, `MCP_SERVER_APPROVED` and `MCP_SERVER_REJECTED`, are added to `UserNotificationKind` and handled exactly like `THREAD_PUBLISHED`: an `AuthEmailKind`, an entry in `NOTIFICATION_EMAIL_KIND`, copy in all 13 email dictionaries, in-app text in `notifications-translations.ts` and an icon. The event carries the server name as `title` and the reason as `excerpt`; the dedupe key includes the decision time. A broker failure is logged and never undoes the decision.
- **Rules are allow and deny by host, publisher or slug** (`plugin_host_rules`). A deny always wins. Once any allow rule exists for a type, only values it covers are accepted for that type. Host rules match the host and its subdomains, never a look-alike suffix. They apply when a user registers a server, when an admin approves one, and when an admin previews, saves or health-checks a curated entry. A rule added later does not stop calls to a server that is already approved; reject or disable it.
- **Health is a recorded ping.** `POST /curated/:slug/health-check` runs the same bounded `tools/list` probe without a credential and stores `OK`, `DOWN` or `UNKNOWN`, the latency and an error code. A keyed server that answers "no" without a key is `UNKNOWN` with `AUTH_REQUIRED`, not `DOWN`.
- **Every admin write leaves a row in `plugin_admin_audit`** (actor, action, target, a summary of names and counts). A failed audit write is logged loudly and does not undo the change.
- **The curated seed is data, written once.** `CuratedSeederService` creates 13 curated remote entries as disabled drafts that need verification, only when the slug does not exist. It never touches an entry again, so an admin's edit, publish or delete survives every boot. Only two URLs appear in the repo docs (Context7 and DeepWiki, both marked "verify" there). The others carry a labelled placeholder host and a note; a seeded draft lists one placeholder tool until an admin previews the real tools. Nothing is invented.

## Consequences

- A catalog entry is now an operations task, not a deploy. The cost is that a wrong entry reaches users sooner, which is why publishing is gated on a live probe, an unverified seed cannot be switched on, and every change is audited.
- `requireApproval` can be turned on safely. The default stays off.
- The SSRF guard, the pinned connection and the manifest schema are reused unchanged; the admin probe adds no new way to open a socket.
- Rules are checked against the database on every use. The table is tiny and an edit takes effect in every replica at once; there is no cache to go stale.
- Not built: usage and cost per plugin, scheduled health checks, a deny rule that blocks calls to an already approved server at invoke time, a CSV export of the audit log, and OAuth for curated entries.
