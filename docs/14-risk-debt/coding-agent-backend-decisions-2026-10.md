# Coding agent parity: backend items that need a decision (2026-10-01)

Source: `apps/claw-coding-agent/docs/parity/PARTIAL_REMAINDERS.md`. Each item below was
checked against the ClawAI backend and is NOT safe to implement without a product, money,
security or release decision. Each brief has four lines: options, recommended default, risk,
and what ships the moment it is decided.

Done without a decision (additive, narrowing, tested): F081 `allowedPluginMarketplaces` in
the effective organization policy; F099 cron (UTC, at most every 5 minutes) for runner-hosted
prompt routines. The "memory off still reads memories" finding was fixed by `b467fb257`.

## Status (2026-10-01, owner authorised the recommended defaults where additive)

Rule applied: implement the recommended default only when it is additive, backward-compatible
and does not decide money, permission semantics, deletion or a breaking public contract.

| Feature                 | Status                                                                                                                                                                           |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F093 prompt caching     | OWNER DECISION REQUIRED: decides billing (cache-write is 1.25x input; finalize contract)                                                                                         |
| F095 resume (backend)   | IMPLEMENTED `cdae9c05d`: `repositoryRef` on `createThread`, `GET agent/runners/:id/resume`                                                                                       |
| F097 mobile token class | OWNER DECISION REQUIRED: new credential class and permission semantics                                                                                                           |
| F098 cloud sessions     | NOT IMPLEMENTED by design: the recommended default is (b), user-hosted runners only                                                                                              |
| F099 webhook trigger    | IMPLEMENTED `69372fc1a` (step 1). Step 2, per-routine secrets: DECIDED 2026-10-01, server side built (ADR-143); runner must export `secrets`                                                    |
| F100 runner report      | IMPLEMENTED `fdc631228` (step 1, record only) and step 2 (ADR-142): org policy + off/report/enforce, staged, fail-open, unsigned. Attestation WAITS for the signing-key decision |
| F101 other clients      | NOT IMPLEMENTED by design: the recommended default is (b), VS Code only                                                                                                          |
| F108 cost in events     | DECIDED 2026-10-01 (recommended default): IMPLEMENTED, PAYG only, fail closed; see ADR-078 addendum                                                                              |
| F030 / F067             | Extension-side release-owner decisions, no backend work                                                                                                                          |

Left open inside the implemented items: F095 does not serve the runner's tool list (the server never
sees it; serving it needs the runner to report its manifest, a new persisted public shape) and the
extension does not call either new route yet. The frontend `ChatThread` type has not gained
`repositoryRef` (the frontend cannot be built from a junctioned worktree, so the push gate could not
prove it); add `repositoryRef?: { name; remoteUrl?; branch? } | null` to
`apps/claw-frontend/src/types/chat.types.ts` from a normal checkout. Nothing here was exercised against the
running dev stack.

## F093 Automatic prompt caching (billing)

**Status: owner decision required.** It would change what a user is charged and how finalize reports usage; not implemented.

- Options: (a) native Anthropic `/v1/messages` transport with `cache_control` plus a cache-write usage field end to end; (b) keep the OpenAI-compatible path and skip caching.
- Default: (a), behind a per-model flag in the model catalog (DB-level), cache writes billed from `cacheWritePerMillionMicroUsd` only when the rate row is present.
- Risk: new provider transport in the money path; cache-write tokens cost 1.25x input, so an unbilled or mis-billed write is a direct margin loss. Needs a billing review of `credit-reservation.manager` and a new usage field in the auth-service finalize contract.
- Ships on decision: transport, `cacheCreationPromptTokens` on `USAGE`, finalize DTO field (additive, optional), tests with recorded Anthropic usage payloads.

## F095 Resume cloud sessions (public contract)

**Status: implemented (backend), `cdae9c05d`.** Done as the default, narrowed to what the server can honestly serve:
`POST /chat-threads` takes an optional `repositoryRef { name, remoteUrl?, branch? }` (nullable JSONB
`chat_threads.repository_ref`, migration `20261001120000_thread_repository_ref`; remote reduced to one
credential-free https identifier; a branch copies it; create-only). `GET agent/runners/:id/resume`
returns `{ runner, online, protocol }`, owner-scoped (a stranger gets the same 404). Differences from the
brief: the manifest is served by agent-service as proposed, but it carries what the server knows (name,
labels, platform, version, approval class, online, protocol), not a tool list; there is no
`repositoryRef` update route. Guides: `docs/04-backend/service-guide-chat.md`, `service-guide-agent.md`.

- Options: (a) `repositoryRef` on `createThread` (name, optional normalised remote URL and branch) plus a resume route returning the runner's capability manifest; (b) keep workspace fit client-side.
- Default: (a) with a stored remote URL stripped of credentials and query, nullable columns on `chat_threads`, and the manifest served by agent-service (it owns runners), not chat-service.
- Risk: invents a public request shape and a new persisted identifier for a user's repository; a URL can carry a token, and the manifest must not leak another user's runner.
- Ships on decision: migration, DTO, resume route with owner check, contract fixture for the client.

## F097 Mobile app integration (permissions)

**Status: decided 2026-10-01 (option a), backend built — [ADR-144](../13-adr/adr-144-mobile-device-token-class.md).** Built in agent-service, where device tokens already live, not auth-service. No native mobile client exists, so nothing consumes it yet.

- Options: (a) a narrower `mobile` device token class in auth-service (read runs, approve, cancel; no shell, no policy edit); (b) reuse the device token.
- Default: (a), scopes listed explicitly, short TTL, revocable per device.
- Risk: new permission semantics and a new credential class; also needs a native mobile client before anything consumes it.
- Ships on decision: token class, guard, scope tests, pairing flow. Shipped: class + scopes in `@claw/shared-types`/`@claw/shared-constants`, `DeviceAccessGuard` allow-list, `agent/mobile/*`, owner-approved pairing, per-device revoke, audit, route-inventory default-deny test. Still open: native client, web approve screen class selector, a risk cap on phone approvals (ADR-144 "Open").

## F098 Cloud coding sessions (infrastructure and cost)

**Status: not implemented, by design.** The recommended default is (b); nothing to build until an isolation design and a cost model exist.

- Options: (a) hosted runner provisioning with repository clone and teardown in agent-service; (b) stay on user-hosted runners only.
- Default: (b) until an isolation design (container per session, egress policy, secret handling) and a cost model exist.
- Risk: runs customer code on our hosts; unbounded compute spend; repository credentials at rest. Not safe to scaffold.
- Ships on decision: a repository-backed session entity, provisioner, TTL teardown, quota tied to plan tier.

## F099 (remainder) Repository-event triggers and per-routine secrets

**Status: step 1 implemented (`69372fc1a`). Step 2 decided by the owner 2026-10-01 and built server side ([ADR-143](../13-adr/adr-143-per-routine-secrets-isolated-and-write-only.md)); the runner (extension repo) must still export the `secrets` it receives at claim.** Step 1 is the signed webhook:
`POST agent/routines/webhook/:routineId` (public, HMAC over the raw bytes plus a 5-minute window, in the
channels webhook's format), owner routes `GET|PUT agent/scheduled-commands/:id/webhook` and `POST .../webhook/rotate`.
Off by default (`scheduled_commands.webhookEnabled`, migration `20261001110000_add_routine_webhook_trigger`).
The secret is derived per routine from the encryption key and `webhookSecretVersion`, never stored. The body
is never read into the prompt; unusable routines answer the same 401 as a bad signature; one accepted
delivery per routine per 60 s, claimed only after the signature verifies; replays return the first run.
GitHub/GitLab native deliveries cannot call it directly (different signing, GitHub has no timestamp): use an
Action or relay. Step 2 (secrets a routine can read, encrypted store) is built: write-only, AES-GCM bound to routine+owner+name, injected only at runner claim.

- Options: (a) signed webhook (GitHub/GitLab) to routine, per-routine secrets in an encrypted store; (b) cron and interval only.
- Default: (a) in two steps: webhook trigger first (HMAC like the existing channels webhook), secrets second.
- Risk: secret isolation is a security boundary (a routine must not read another routine's or user's secrets); webhook replay and fan-out can spam runners.
- Ships on decision: trigger table, HMAC verification with timestamp window, per-routine rate limit.

## F100 Self-hosted runners (attestation, updates, org policy)

**Status: steps 1 and 2 implemented (`fdc631228`, ADR-142), attestation waits for the signing key.**
`POST agent/runners/heartbeat` takes an optional `{ agentVersion?, platform? }` and records it on the
session. Owner decision 2026-10-01: yes to an organization policy for allowed runner versions, but only
staged. Built: `minRunnerVersion`, `allowedRunnerPlatforms`, `runnerPolicyMode` (`off` default | `report` |
`enforce`) and `requireVersionReport` on `organization_policies`; `report` flags and audits and never
rejects, `enforce` rejects only a definite violation of a set constraint (a silent runner is `unknown` and
passes unless `requireVersionReport`), and any policy read error fails open. It is self-reported and
unsigned, so it detects stale runners and proves no identity. NOT built, waiting on the signing-key
decision: a signed version/platform claim, a trust anchor, an update channel, and any enforcement that
depends on them. A durable audit table is also open (the audit entry is a structured log line today).

- Options: (a) signed version and platform report at heartbeat, update channel, organization policy table for allowed runner versions; (b) token-only identity as today.
- Default: (a) in order: report-at-heartbeat (record only), then org policy, then enforcement.
- Risk: attestation without a trust anchor is theatre; enforcement can lock a fleet out. Needs a signing-key decision first.
- Ships on decision: heartbeat DTO fields (additive), policy table, admin route.

## F101 Desktop, JetBrains, Slack, GitHub, GitLab

**Status: not implemented, by design.** The recommended default is (b), VS Code only.

- Options: (a) publish the runtime-v2 run contract as a versioned public API; (b) keep it VS Code only.
- Default: (b) until the contract is versioned and an API-key class for third-party clients exists.
- Risk: freezes an internal protocol as a public contract; JetBrains and Desktop are separate products.
- Ships on decision: contract doc, key class, per-client rate limits.

## F108 Cost in runtime events (money disclosure)

**Status: decided 2026-10-01 (option a, PAYG only) and implemented.** Finalize now answers 200 `{ settled, billingMode, settledCostMicroUsd? }` (cost for PAYG only, the charged amount); chat-service emits `run.usage` `{ costMicros }` for PAYG only. Contract, classifier and disclosure analysis: [ADR-078 addendum](../13-adr/adr-078-payg-connector-credit.md), [billing-threat-model.md](../03-architecture/billing-threat-model.md), rule 37 item 23.

- Options: (a) return the settled cost (`actualCostMicroUsd`) from auth-service finalize and put `costMicros` on runtime events; (b) never expose per-call cost.
- Default: (a) for PAYG users only (they are charged that number), omitted for subscription users.
- Risk: finalize is fire-and-forget and returns nothing today, so this changes an internal contract; for subscription plans the number reveals provider cost and margin.
- Ships on decision: finalize response field, chat-service event field, client already reads `costMicros`.

## F030 Computer use (desktop input) and F067 Panel placement (release)

- F030 options: (a) approve an OS-level input tool with its own approval class and a platform sandbox; (b) browser only. Default: (b). Risk: arbitrary desktop control by a model.
- F067 options: (a) raise `engines.vscode` to `^1.106` for `secondarySidebar`; (b) stay on `^1.98`. Default: (b) until older-VS Code share is measured. Risk: drops users.
- Both are extension-side and release-owner decisions, not backend work; listed so the parity program has one place to find them.
