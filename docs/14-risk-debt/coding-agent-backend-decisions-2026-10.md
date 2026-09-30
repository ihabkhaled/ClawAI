# Coding agent parity: backend items that need a decision (2026-10-01)

Source: `apps/claw-coding-agent/docs/parity/PARTIAL_REMAINDERS.md`. Each item below was
checked against the ClawAI backend and is NOT safe to implement without a product, money,
security or release decision. Each brief has four lines: options, recommended default, risk,
and what ships the moment it is decided.

Done without a decision (additive, narrowing, tested): F081 `allowedPluginMarketplaces` in
the effective organization policy; F099 cron (UTC, at most every 5 minutes) for runner-hosted
prompt routines. The "memory off still reads memories" finding was fixed by `b467fb257`.

## F093 Automatic prompt caching (billing)

- Options: (a) native Anthropic `/v1/messages` transport with `cache_control` plus a cache-write usage field end to end; (b) keep the OpenAI-compatible path and skip caching.
- Default: (a), behind a per-model flag in the model catalog (DB-level), cache writes billed from `cacheWritePerMillionMicroUsd` only when the rate row is present.
- Risk: new provider transport in the money path; cache-write tokens cost 1.25x input, so an unbilled or mis-billed write is a direct margin loss. Needs a billing review of `credit-reservation.manager` and a new usage field in the auth-service finalize contract.
- Ships on decision: transport, `cacheCreationPromptTokens` on `USAGE`, finalize DTO field (additive, optional), tests with recorded Anthropic usage payloads.

## F095 Resume cloud sessions (public contract)

- Options: (a) `repositoryRef` on `createThread` (name, optional normalised remote URL and branch) plus a resume route returning the runner's capability manifest; (b) keep workspace fit client-side.
- Default: (a) with a stored remote URL stripped of credentials and query, nullable columns on `chat_threads`, and the manifest served by agent-service (it owns runners), not chat-service.
- Risk: invents a public request shape and a new persisted identifier for a user's repository; a URL can carry a token, and the manifest must not leak another user's runner.
- Ships on decision: migration, DTO, resume route with owner check, contract fixture for the client.

## F097 Mobile app integration (permissions)

- Options: (a) a narrower `mobile` device token class in auth-service (read runs, approve, cancel; no shell, no policy edit); (b) reuse the device token.
- Default: (a), scopes listed explicitly, short TTL, revocable per device.
- Risk: new permission semantics and a new credential class; also needs a native mobile client before anything consumes it.
- Ships on decision: token class, guard, scope tests, pairing flow.

## F098 Cloud coding sessions (infrastructure and cost)

- Options: (a) hosted runner provisioning with repository clone and teardown in agent-service; (b) stay on user-hosted runners only.
- Default: (b) until an isolation design (container per session, egress policy, secret handling) and a cost model exist.
- Risk: runs customer code on our hosts; unbounded compute spend; repository credentials at rest. Not safe to scaffold.
- Ships on decision: a repository-backed session entity, provisioner, TTL teardown, quota tied to plan tier.

## F099 (remainder) Repository-event triggers and per-routine secrets

- Options: (a) signed webhook (GitHub/GitLab) to routine, per-routine secrets in an encrypted store; (b) cron and interval only.
- Default: (a) in two steps: webhook trigger first (HMAC like the existing channels webhook), secrets second.
- Risk: secret isolation is a security boundary (a routine must not read another routine's or user's secrets); webhook replay and fan-out can spam runners.
- Ships on decision: trigger table, HMAC verification with timestamp window, per-routine rate limit.

## F100 Self-hosted runners (attestation, updates, org policy)

- Options: (a) signed version and platform report at heartbeat, update channel, organization policy table for allowed runner versions; (b) token-only identity as today.
- Default: (a) in order: report-at-heartbeat (record only), then org policy, then enforcement.
- Risk: attestation without a trust anchor is theatre; enforcement can lock a fleet out. Needs a signing-key decision first.
- Ships on decision: heartbeat DTO fields (additive), policy table, admin route.

## F101 Desktop, JetBrains, Slack, GitHub, GitLab

- Options: (a) publish the runtime-v2 run contract as a versioned public API; (b) keep it VS Code only.
- Default: (b) until the contract is versioned and an API-key class for third-party clients exists.
- Risk: freezes an internal protocol as a public contract; JetBrains and Desktop are separate products.
- Ships on decision: contract doc, key class, per-client rate limits.

## F108 Cost in runtime events (money disclosure)

- Options: (a) return the settled cost (`actualCostMicroUsd`) from auth-service finalize and put `costMicros` on runtime events; (b) never expose per-call cost.
- Default: (a) for PAYG users only (they are charged that number), omitted for subscription users.
- Risk: finalize is fire-and-forget and returns nothing today, so this changes an internal contract; for subscription plans the number reveals provider cost and margin.
- Ships on decision: finalize response field, chat-service event field, client already reads `costMicros`.

## F030 Computer use (desktop input) and F067 Panel placement (release)

- F030 options: (a) approve an OS-level input tool with its own approval class and a platform sandbox; (b) browser only. Default: (b). Risk: arbitrary desktop control by a model.
- F067 options: (a) raise `engines.vscode` to `^1.106` for `secondarySidebar`; (b) stay on `^1.98`. Default: (b) until older-VS Code share is measured. Risk: drops users.
- Both are extension-side and release-owner decisions, not backend work; listed so the parity program has one place to find them.
