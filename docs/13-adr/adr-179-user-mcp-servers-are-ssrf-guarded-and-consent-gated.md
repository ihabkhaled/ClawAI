# ADR-179: User MCP servers are SSRF-guarded and consent-gated

**Status:** Accepted

**Date:** 2026-10-14

Builds on [ADR-171](adr-171-plugins-are-a-separate-service-with-a-curated-catalog.md) and [ADR-172](adr-172-plugin-installs-consent-and-credentials.md). Design: [plugins-and-mcp-design](../implementation/plugins-and-mcp-design.md) (sections 4, 5, 7 and Batch 3). Service guide: [service-guide-plugin](../04-backend/service-guide-plugin.md). Runbook: [register-an-mcp-server-safely](../../skills/register-an-mcp-server-safely.md).

## Context

Batch 3 lets a user point ClawAI at an MCP server they chose, and lets the model call tools on it. The URL is typed by a user, the tool list and every answer come from a stranger's server, and the plugin service runs inside our network next to the databases and the other services. Four things can go wrong, and each one is a way to turn a chat box into a foothold:

1. The URL is not a public server (a private address, the cloud metadata service, another container), or it becomes one after we checked it (DNS rebinding, a redirect).
2. The server's tool list is poisoned: invisible characters, an oversized schema, a schema that pulls a remote `$ref`, or a description that changes after the user approved it.
3. A result tells the model what to do next, and the model does it.
4. A call costs something (a daily allowance, a model round, a server's patience) and nothing stops it being repeated.

## Decision

**All outbound traffic to a host a user or a manifest named goes through one class, `SafeEgressManager`.** Nothing else in the service opens a socket to such a host.

- **Syntax first, before any DNS.** https only, no userinfo, no fragment, a port from an allow list (443, 8443; the web reader allows 443 only), at most 2048 characters, no control characters. The host is judged after the WHATWG URL parser has folded decimal, octal, hex, short and full-width forms, and a host that is any IP literal (v4, v6, mapped, NAT64, 6to4), a single label, `localhost`, `*.local`, `*.internal`, `*.localhost`, `*.svc` and the like is refused. A host whose last label starts with a digit is an IP in some number base and is refused.
- **Then DNS, here, once per request.** Every answer (A and AAAA) must be a public global-unicast address: the private, loopback, link-local, carrier-grade NAT, benchmarking, documentation, multicast and reserved IPv4 blocks, and every IPv6 form outside `2000::/3` (unique-local, link-local, mapped, NAT64, 6to4, Teredo, documentation) are refused, and a mapped, NAT64 or 6to4 address is judged by the IPv4 address it carries. One bad answer among good ones refuses the name.
- **The connection is pinned.** The socket `lookup` hook answers every name with the one address that was validated, SNI and the certificate check keep using the real host name, TLS verification is never turned off, and no agent is used, so no connection outlives the call. A DNS answer that changes between check and connect cannot reach the socket. Because the name is resolved again for every request, a name that turns private after registration is refused at the next call.
- **No redirects** for MCP traffic (a 3xx is refused). The web reader may follow at most three hops, and each hop restarts at the syntax check, so a redirect to a private host dies at the next hop.
- **Response and time caps.** The body is read with a hard byte cap and one deadline per call, and the caller can end a stream early. A request cannot set `Host`, `Cookie`, `Content-Length`, `Transfer-Encoding`, `Connection`, `Upgrade`, `Proxy-*`, `Sec-*` or forwarding headers, and nothing from the user's browser is forwarded.
- **Errors are uniform.** A user sees `MCP_URL_BLOCKED` (422, syntax) or `MCP_SERVER_UNREACHABLE` / `MCP_SERVER_REJECTED` (502). A private address, a closed port, a failed lookup, a refused certificate and a timeout read the same, so the feature is not a port scanner or a DNS oracle for our network. The reason goes to the log, never to the response.

**The guard lives in the plugin service, not in `shared-utilities`.** The design placed it there. It stays local for now because a new `@claw/shared-*` symbol breaks every dev container that bakes the packages, and the plugin service is the only caller. Moving it later is a mechanical change; the spec suite moves with it.

**A user's server is untrusted all the way down.**

- **Discovery is a handshake we speak ourselves** (`initialize`, `notifications/initialized`, `tools/list` over the streamable HTTP transport, JSON or event-stream answers, pagination capped at four pages and 64 tools). A session lives for one discovery or one call; nothing is cached between them.
- **Each tool is vetted and then pinned.** The name must be plain, the description is cleaned of control, zero-width and bidi characters and cut to 1024, and the input schema must pass the same safe-subset check manifests do (no remote `$ref`, no identity keywords, no prototype keys, bounded size and depth). A tool that fails is skipped and reported, not repaired. The tool gets a model-facing local name (`[a-z0-9_]{1,40}`) and the native name `plugin_<slug>_<tool>`, where the slug is `mcp` plus 12 hex characters of the server id. The whole list is hashed.
- **Every tool starts as WRITE with no consent.** Risk hints the server attaches (`readOnlyHint` and friends) are ignored. Only the owner may lower a tool to READ, switch it off, or store a standing consent for a WRITE tool; changing the risk clears the consent.
- **A changed list is a stop (rug-pull defence).** A refresh whose hash differs stores the new list, sets the server to `NEEDS_REVIEW`, blocks every call, and shows the owner a diff (added, removed, changed). Only `approve-changes` with the exact hash the owner saw puts it back to work. A tool whose definition did not change keeps the owner's settings; a new or changed one starts as WRITE.
- **A disabled or withdrawn server cannot be revived to skip a review.** The owner can switch off only an approved server and switch on only a server they switched off.
- **Credentials are write-only and live in their own table** (`mcp_server_credentials`), sealed with AES-256-GCM under `PLUGIN_ENCRYPTION_KEY` with the additional authenticated data `userId:serverId`. They are opened in memory for one outbound request and attached only to that server's own URL. The header must be on the same allow list as install credentials, may not be one the client sets itself, and a bearer token always uses `Authorization`.

**The invoke path asks before it acts and meters before it runs.** `POST /api/v1/plugins/invoke` (JWT, `PLUGINS_USE`):

1. A duplicate call id for the same user is `409` (in flight, or already audited).
2. The target must be the caller's install or server and have the tool, else `404`, the same answer for "not yours" and "not there".
3. `allowPlugins` must be on (`403`), and an unreadable plan fails closed (`503`).
4. Arguments are validated against the tool's input schema, with a 32 KB cap, before anything is held (`400`, paths only, never values).
5. A switched-off, withdrawn or awaiting-review target is `BLOCKED`.
6. **Consent:** READ never asks. WRITE asks until the owner stored a grant. DESTRUCTIVE asks every call. A **tainted** turn (the caller says an untrusted tool result is already in the model context) asks for every non-READ call and ignores a standing grant. The answer is `CONSENT_REQUIRED` with a redacted preview and the arguments hash, nothing is held and nothing is audited, so the same call id can be sent again with `userApproved: true` once the user said yes to that call.
7. Per-user rate (from the audit table) and concurrency, then the per-server **circuit breaker with a half-open probe**: five failures in a row open it, after 30 seconds exactly one call is let through, success closes it, failure reopens it.
8. One `PLUGIN_CALLS` run is held with auth-service, keyed by the call id so a retry reuses its hold, and settled after: consumed when the tool delivered, released otherwise. No answer from auth-service means no call.
9. The tool runs under a deadline (the tool's own, capped at 60 s, plus a hard cut-off for an adapter that ignores it) and a result cap, and aborts when the caller disconnects.
10. **The result is untrusted data.** It is normalised, stripped of invisible characters, cut to the cap and wrapped in `<tool_result plugin tool trust="untrusted">`, with any occurrence of the fence tag inside it escaped so a result cannot close its own fence. The response always says `untrusted: true`.
11. One audit row per call, with the ids, status, risk, consent decision, tainted flag, a hash of the arguments, byte counts and timing. No arguments, no result, no secret.

## Consequences

- The SSRF suite (`modules/egress/__tests__/ssrf-pentest.spec.ts` and `ip-address.utilities.spec.ts`) is a release gate: 71 hostile URL cases that must be refused before DNS, 28 hostile DNS answers, rebinding, redirect and header cases. A change to the guard that makes one pass is a regression.
- The guard has also been run against the live network (a real public page and a real public MCP server succeed; names that resolve to loopback and the metadata name are refused), and a real third-party MCP server was discovered and called through the full client.
- Two replicas of the plugin service each keep their own in-flight call set and concurrency count, so the effective concurrency ceiling is the limit times the replica count. The per-minute rate, the breaker and the duplicate-call check read the database and are exact.
- The audit row records only a hash of the arguments, so a user cannot be shown "what exactly did the plugin send" from history. That is deliberate: arguments can hold anything the user typed.
- Admin approval of servers (the `PENDING_APPROVAL` queue behind the `requireApproval` setting), host allow and deny rules, OAuth2 PKCE and the interactive consent channel for chat are not in this batch. With `requireApproval` on, a new server waits in `PENDING_APPROVAL` and cannot run until the admin routes land.
- `userServers.allowHttp` exists as a setting but nothing reads it: plain http is never allowed.
- Deleting an account deletes the user's servers, their tools and their sealed credential in the same transaction as the installs and the audit rows.
