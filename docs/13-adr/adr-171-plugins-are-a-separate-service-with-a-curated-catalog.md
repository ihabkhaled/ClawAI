# ADR-171: Plugins are a separate service with a curated catalog

**Status:** Accepted

**Date:** 2026-10-13

Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Runbook: [skills/add-a-catalog-plugin.md](../../skills/add-a-catalog-plugin.md).

## Context

ClawAI chat needs tools: a model reads a page, does exact arithmetic, looks up the weather, and later calls a third-party MCP server. Three things about that are different from everything else we run:

1. A plugin tool is code or a remote server we did not write the answer of. Whatever it returns is untrusted input that is about to be put in front of a model.
2. Calling a user-registered MCP server means opening outbound connections to hosts a user chose, which is an SSRF surface, and holding that user's credentials.
3. The module has its own catalog, settings, consent and audit data, and a plan gate that is on for every plan including Free.

The design considered chat-service (already 6,000+ lines in one manager, and the token-deduction chokepoint), connector-service (the AI-provider registry, driven by provider fields), agent-service (tied to the desktop coding agent and recipes) and workspace-service (third-party app OAuth and sync). None of them is a tool-call runtime, and putting an egress client and credentials into the chat process would put them next to the quota chokepoint.

## Decision

- **`claw-plugin-service` is its own service** (`apps/claw-plugin-service`, port 4021, database `claw_plugin`, route `/api/v1/plugins`, portal page `/plugins`), following the two-service precedent of [ADR-159](adr-159-clawai-threads-two-service-architecture.md). It is the only holder of plugin data and, in later batches, of MCP credentials and outbound sockets. Chat-service consumes it over HTTP only and never reads its database. `/internal/*` is for chat-service alone and nginx does not route it.
- **The catalog is admin-curated.** Entries are `FIRST_PARTY` (an in-process adapter) or `CURATED_MCP` (a vendor's hosted MCP server whose tool list we pin). There is no community publish flow. A plugin is a validated JSON manifest (`PluginManifestSchema`, zod, strict): identity, translations in 13 locales, runtime, network hosts, auth, scopes, tools with an input schema and a risk level, limits. The manifest is the unit of review.
- **A manifest is untrusted input to its own schema.** The schema rejects unknown keys, prototype keys, remote `$ref`, `$id` and dynamic refs, control and bidi characters in text, schemas deeper than six subschemas or larger than 16 KB, non-https or non-public server URLs, credential headers such as `Host`, `Cookie` and `Proxy-*`, undeclared scopes, duplicate tools and native tool names over 64 characters. Validation runs on seed, on publish and again when a stored manifest is read, so a corrupt row is hidden rather than served.
- **First-party plugins are seeded from the repository** (`src/modules/seeding/constants/manifests/*.manifest.ts`), idempotently, on every boot. The seeder creates an entry as `PUBLISHED`, updates only descriptive fields, and never writes `status`, `globallyEnabled` or `featured`, nor a tool's `disabledByAdmin`: those belong to the admin. A version whose manifest hash changed is rewritten in place and tool rows are synced by name. Default `PluginSetting` rows are inserted only when the key is missing.
- **Everything is database configuration.** Loop limits, call timeouts, result caps, retention and rate limits are `PluginSetting` rows, not environment variables. Only bootstrap items stay in env (port, database URL, service URL, and `PLUGIN_ENCRYPTION_KEY`, kept separate from `ENCRYPTION_KEY` so one leak does not expose the other).
- **Permissions and plan.** `PLUGINS_USE` gates the catalog read API on top of the service's JWT guard. The `allowPlugins` plan gate defaults to ON for every plan including Free; Free users install from the curated catalog and register no custom MCP server, and those numbers are plan columns, not code.
- **Batch 1 is read-only.** It ships the scaffold, the catalog read API (`GET /catalog`, `GET /catalog/:slug`, localized by `?locale=` or `Accept-Language` with a per-field English fallback), the three seeded first-party manifests and the browse and detail pages. Installs, credentials, the MCP client, the invoke path and the chat integration are later batches. A BUILTIN manifest must name an adapter key listed in the runtime registry; the implementations arrive with the invoke path.

## Consequences

- A new service means the full delivery checklist (compose, env, nginx, health, CI, installers, root tests) and a new dev-stack boot dependency. A new `@claw/shared-*` symbol imported here needs the baked-package refresh described in the project memory.
- Chat-service stays small, and the SSRF guard and credential custody land in a process that can later be egress-restricted and scaled alone.
- The catalog is small and curated, so the list endpoint filters and paginates in memory after one indexed query. If the catalog ever grows to thousands of entries, search moves into the database.
- Adding a first-party plugin is a manifest plus an adapter plus a registry key, not a migration. Removing one is an admin action (`status`), so a repository change cannot silently re-publish what an admin hid.
- Rule 59 applies from the chat integration batch onward: a plugin reaches normal chat, Compare, Consensus, Escalation, the labs and the judge through shared code.
- Closed by [ADR-172](adr-172-plugin-installs-consent-and-credentials.md): `AppConfig` now refuses to boot with a missing, short, non-hex or all-zero `PLUGIN_ENCRYPTION_KEY`, so the all-zero `.env.example` placeholder can no longer encrypt credentials. The key must be 64 hex characters of random data.
