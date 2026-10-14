# ADR-184: Own MCP servers reach chat through the pinned snapshot

**Status:** Accepted

**Date:** 2026-10-15

Builds on [ADR-179](adr-179-user-mcp-servers-are-ssrf-guarded-and-consent-gated.md) and [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Plan: [plugins-roadmap](../02-business-product/plugins-roadmap/PRODUCT-PLAN.md) (S1, gap P0-1).

## Context

A user could register a remote MCP server (SSRF-guarded, consent-gated, ADR-179) and the invoke path could call it, but `resolve` and the composer `@` picker knew only catalog installs. The registered server was reachable by nothing a user could touch. Chat has to use it without weakening any ADR-179 guarantee, and a slow or dead server of the user's own must never cost a chat turn.

## Decision

**Offering a server's tools reads the owner-approved snapshot already stored with the server and never contacts the server.** Names, schemas and risks are pinned there (every tool starts WRITE, a changed hash waits for review), so `resolve` is a database read. A slow server cannot slow a message; it can only slow a call, and a call already has the timeout, the per-user limits, the quota hold and the database circuit breaker.

- **One id field.** chat-service and the picker already carry `installId`. An own server's id travels in that field, unchanged on the wire. `resolve` looks the id up as one of the caller's installs, and an id that is not one is tried as one of the caller's own servers (`where { id, ownerUserId }`). `invoke` does the same in `InvokeTargetManager`: install first, then the caller's own server, otherwise the same 404 as an unknown id. UUIDs are unique and both lookups are owner-scoped, so one user's id never reaches another user's row. No schema change and no chat-service contract change.
- **What is offered.** A server in state `APPROVED` whose breaker is closed, its tools that are enabled, have a local name matching `[a-z0-9_]{1,40}`, a native name of at most 64 characters and an object input schema. At most 100 tools per message across all mentioned servers. Text that reaches the model (tool description, server name in the system block) is cleaned again (invisible, bidi and control characters out, line breaks folded to one space, descriptions cut to 300 characters) because the model sees it even though it was cleaned at registration. Risk is the stored risk; a server hint never lowers it.
- **What is not offered, and what the user is told.** `DISABLED`, `PENDING_APPROVAL` and `REJECTED` servers offer nothing and say nothing (the user chose or the admin decided). `NEEDS_REVIEW` answers the notice `PLUGIN_SERVER_NEEDS_REVIEW`. `UNREACHABLE`, an open breaker, a failed or slow lookup answer `PLUGIN_SERVER_UNAVAILABLE`. Notices ride the existing `notices[]` / `metadata.pluginNotices` path and are localized in all 13 locales (`chat.pluginOwnServerUnavailable`, `chat.pluginOwnServerNeedsReview`). The breaker check on resolve is read-only: it never claims the half-open probe, only a real call does.
- **Bounded cache and deadline.** The snapshot read is cached in memory per `userId:serverId` for 30 seconds, at most 500 entries (oldest out first), never for a miss. A stale entry can offer a tool the owner just switched off; the call re-reads the database and is refused, so the staleness is a wasted model round, never a call. The whole own-server lookup has a 2 second deadline; past it, or on any error, the message goes on without the server and with the unavailable notice.
- **The picker.** `GET /api/v1/plugins/mentions` returns the installed plugins followed by the caller's own servers (`iconKey: mcp-server`, `enabled` false for a disabled, in-review, rejected or breaker-open server). A failure reading servers returns the installs alone. The old `/plugins/installs/mentions` route is unchanged.
- **Untouched on purpose.** The SSRF guard, per-call DNS and pinning, credential sealing and the single decrypt path, tool pinning and review, consent (WRITE asks, tainted turns ask, DESTRUCTIVE asks every time), the untrusted-result fence, rate and concurrency limits, the PLUGIN_CALLS quota and the audit row.

## Consequences

- **Positive**: a registered server is usable from chat, Compare, Consensus and Escalation through the same pipeline as a catalog plugin (rule 59), with no new trust path.
- **Positive**: a failing server costs one notice, not a turn.
- **Negative**: the offered tool list is as old as the last registration, refresh or approval; a server that added a tool shows it only after the owner refreshes and approves (the intended pinning).
- **Negative**: in-memory cache means up to 30 seconds of stale offers per replica after a change.
- **Not done**: a "mine" badge text in the picker (the row is recognisable by its `mcp-server` icon and slug), per-lane consent card (separate batch), the admin approval queue.
