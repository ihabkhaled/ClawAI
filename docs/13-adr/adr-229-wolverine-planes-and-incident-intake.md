# ADR-229: Wolverine runs on four planes that share no credentials, and incident intake is its own fail-closed service

Status: Accepted in part (2026-11-28): placement, identity, fail-closed limiters and the nginx limit were decided by the owner on 2026-11-28 (section "Owner decisions"); the invariants still wait for the owner's confirmation. Batch B1 of the
[self-healing plan](../implementation/self-healing-coding-agent-plan.md).

Threat model: [agent-incident-threat-model.md](../03-architecture/agent-incident-threat-model.md).
Tests: [adversarial-suite-catalog.md](../16-quality-engineering/wolverine-adversarial-suite-catalog.md).

## Context

The owner wants ClawAI to repair itself: every failure in the VS Code extension is reported (opt-in, redacted), turned
into a ticket, a reproduction, a tested fix and a release by an always-on agent. Security comes before the feature.
The plan (section 5 to 8) names four planes and recommended an `agent-incidents` module in agent-service. This ADR records the owner's
decision (a separate service) after reading the code, and records where the code disagrees with the plan.

What the code showed (all read on 2026-11-28):

- The extension signs in as a **user** through auth-service (`/auth/vscode/authorize/*`); its tokens are an access and
  a refresh token held in `src/core/session-vault.ts`. A `Device` row in agent-service exists only when the user also
  pairs the desktop agent. `DeviceTokenClass` has `DEVICE` and `MOBILE` only (ADR-144).
- agent-service has global `AuthGuard`, `SessionRevocationGuard` and `RolesGuard`, a Zod validation pipe (`src/app/pipes/zod-validation.pipe.ts`), Prisma
  (Postgres), a Redis service with `setNxEx` and a one-call fixed-window counter, a RabbitMQ client wired in
  `app.module.ts`, `rawBody: true` in `main.ts`, and a working example of the right check order in
  `routine-webhook.service.ts`.
- Every limiter and counter near this problem **fails open**: `auth-rate-limit/repositories/agent-auth-rate-limit.repository.ts`,
  `claw-audit-service` `feedback-rate-limit.repository.ts`, and auth-service `anti-abuse-counter.repository.ts`. Each
  comment gives a reason that does not apply to a cost and integrity control. `RedisService.incrWithTtl` also reports a
  malformed reply as the first hit, which is an allow.
- The signature helpers (`channel-signature.utility.ts`, `routine-webhook-secret.utility.ts`) are symmetric HMAC with a
  secret the server derives. The server could forge any signature, so they cannot prove possession by an installation.
- agent-service has no configuration table. auth-service has `SystemSetting` with an admin controller; research-service has
  `runtime_crawl_configs` with an admin PATCH. Nothing like it exists in agent-service.
- nginx has `limit_req` zones for auth, feedback and client logs, keyed by address. `location /api/v1/agent` has none.
  The 2026-11-27 sign-up farm rotated addresses, so address-keyed zones only brake.

## Decision

### 1. Four planes, no shared credentials

| Plane           | Holds                                                               | Credential it uses                                                                          | Never                                                       |
| --------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Interactive     | the extension and the chat and coding APIs                          | user session                                                                                | waits on diagnostics                                        |
| Diagnostics     | intake, queue, DLQ, sanitizer, incident store, operator view        | service identity of claw-incident-service; healer gets a separate read-only pull credential | starts a model, shell, git job or deploy                    |
| Remediation     | scheduler, leases, patch worker, reviewer                           | per-job scoped tokens; branch and PR identity through a broker                              | holds production secrets, merge rights, release credentials |
| Release control | GitHub protections, CODEOWNERS, CI, release controller, Marketplace | a release identity in an isolated environment                                               | takes input from the incident store                         |

A plane talks to the next only through a stored record or an independently issued, scoped capability. A request handler
never starts work: it validates, stores and enqueues. This is enforced by a static import check, not by habit.

### 2. Intake is its own small service (`claw-incident-service`, NEW)

Owner decision, 2026-11-28: a new service with its own database, not a module in agent-service. The review found that
agent-service holds `ENCRYPTION_KEY` (routine secrets, ADR-143), runner tokens and the code that dispatches commands to
paired devices, so a parser bug in the same process could reach them (threat A14). A separate service removes that path at
the cost of the full delivery checklist (every compose file, nginx, health, CI, installers, production `.env`, i18n;
rules/05, `skills/add-a-new-service.md`).

Rules for the new service:

1. It imports no `child_process`, git, model client or deploy code and makes no outbound HTTP call except to auth-service
   for token checks (ADV-234).
2. It adds no dependency without owner review (ADV-232). Parsing uses Zod and `node:crypto` only.
3. It owns its database; nothing else writes its tables.
4. It does not reuse the fail-open budget repositories; it has its own fail-closed one.
5. It verifies user tokens with the audience-checked `verifyUserAccessToken` (a desktop device token is never accepted).

Rejected homes, with reasons, are in "Alternatives".

### 3. Identity: user token plus a per-installation key with proof of possession

- Every intake route authenticates with `verifyUserAccessToken` (algorithm, audience, issuer all checked [V]). Device and
  mobile tokens are refused (ADR-144 finding).
- At first opt-in the extension makes an Ed25519 key pair, stores the private key in VS Code SecretStorage and registers
  the public key: bearer plus a signature over a server challenge. The server stores `agent_installation_keys` (user,
  installation id, public key, status, created, revoked). One key belongs to one account. Active keys per account are
  capped. Sign-out and password reset revoke keys. Rotation: a new key is registered with a signature by the old one.
  The extension's key is **not** a device token class: that class belongs to desktop pairing.
- Every batch carries a signature over: version tag, method, path, SHA-256 of the received body bytes (computed by the
  server, never read from a header), timestamp, nonce, key id. Headers carry key id, timestamp, nonce, signature.
- Freshness: integer seconds only, skew window shorter than the 300 s used by channels (B4 pins the value, proposed 120 s,
  and a unit test). Nonce claim with `RedisService.setNxEx`, TTL at least twice the skew, namespaced by key id. Check order
  follows `routine-webhook.service.ts`: size, presence, freshness, then signature, then claim; one 401 for every refusal.
  A claim happens only after the signature verifies, so a stranger cannot burn nonces.
- Reuse of existing code is limited to: the freshness-check idea, the constant-time compare pattern, the check order, the
  version-bump idea for rotation. The functions themselves are not reused because they are symmetric.
- A valid signature proves a key, not truth. Events are corroborated against server evidence and the release manifest
  before they matter (threat A10; plan section 6.2 point 1).

### 4. Abuse and cost: budgets that fail closed

- Order is cheap first: nginx zone `incident_ingest` (NEW, keyed by address, with its own `client_max_body_size`,
  `limit_conn`, read timeouts) then bearer then budgets then signature then schema then sanitise then store.
- Redis budgets per address, account, tenant, installation, key and global, in the NEW `IncidentBudgetRepository`.
  A Redis error, a timeout or a malformed script reply is a **refusal** (503 with a bounded, jittered Retry-After), never
  an allow. The throttler of the platform is not relied on (it is skipped for the inter-service token [V]).
- Caps: request bytes, events per batch, depth, array length, string length, decompression ceiling. A new-account tier
  has lower budgets. Fingerprint cardinality is capped with an overflow bucket. Daily model cost has a hard ceiling in config.
- Load shedding drops repetitive low-priority events first and never touches the interactive plane. The extension queue
  is bounded and drops first.
- No model classifier guards ingress.

### 5. Storage, queue and DLQ

- The Postgres row is the source of truth: unique on `event_id`, content hash stored, sanitized fields only, tenant
  derived from the token. The queue message is a pointer. Delivery is at-least-once and ingest is idempotent.
- RabbitMQ queue with a retry cap, a DLQ, a TTL and lag metrics. The exact conventions of rules/17 and the DLQ wiring in
  agent-service were not read (unverified); B4 reads them first.
- Server-side redaction and hidden-content stripping (NEW sanitizer) run before the row is written. Anything that fails
  or is flagged is quarantined, never stored raw. Quarantined events are visible to operators only.

### 6. The healer

- A separate VM, not the production host. No production database, no SSH keys to production. Pulls sanitized incidents over
  HTTPS with a read-only credential; the pull API is NEW (`HealerPullController`) and returns allowlisted sanitized fields only (ADV-242).
  Whether it is a second listener or a restricted nginx path is decided in B7.
- Each job: disposable sandbox and worktree, read-only base snapshot, synthetic data, minimal egress, no host mounts, no
  Docker socket, no production secrets. Policy, admission rules and the watchdog live outside the workspace and change
  only through a human-reviewed privileged workflow.
- Identity is branch and PR only, through a broker that checks repository, branch (`wolverine/*`), diff scope, policy and
  quota. Patch worker, reviewer and release authority are separate identities.

### 7. Kill switches are database config

A NEW `incident_config` row in claw-incident-service, with an admin controller, an audit row for every flip (actor, old, new,
time) and a short read cache with a documented bound. Switches: uploads, ingest, triage, repair jobs, PR creation, release
automation, model team. New capabilities default OFF. An unreadable config means refuse. Every switch has an ON and an OFF
test, and the module as a whole has an OFF test (the default state is the one that goes untested). agent-service registers global `AuthGuard`, `SessionRevocationGuard` and `RolesGuard` [V app.module.ts]; whether an admin
route pattern exists there was not read, and the admin settings precedent is auth-service's `SystemSetting`. B4 settles it.

## Owner decisions (2026-11-28)

- **Intake home:** a new small service (section 2), not agent-service.
- **Report identity:** a per-installation key pair made at sign-in, kept in VS Code SecretStorage, its public key
  registered to the user; every batch is signed. Device pairing is not required (section 3).
- **Fail-closed limiters:** the security routes fail closed on a Redis error: sign-in, sign-up, password, device and the
  new intake. Plain feedback stays lenient so a Redis blip does not lock users out of everything.
- **nginx:** add a per-IP `limit_req` zone for `/api/v1/agent` and the new intake now, plus per-account limits in the
  services; production gets it only after the owner's deploy go.

## Invariants

These do not change without the owner. They are tested, and a change to one is a separate, owner-reviewed PR.

1. **Protected change classes** always need the owner: auth, billing, permissions, tool policy, redaction, sandbox,
   telemetry intake, updater, CI workflows, hooks, release scripts, secrets, `package.json` and lockfiles, new
   dependencies, network allowlists, migrations, deletions, and diffs over the size cap. The list lives in a file
   the healer cannot edit and CODEOWNERS covers it.
2. **The healer never merges or approves its own PR**, and the patch worker, reviewer and release authority are separate identities.
3. **Telemetry never invokes execution.** No incident, log line or report starts a model with tools, a shell, a git job, a
   deploy or a release. Only the scheduler, from a validated record, starts a job.
4. **Reports are data.** Text that the platform did not write reaches a model only inside the untrusted fence, after hidden
   content is stripped. A report that asks for an action is quarantined for the owner.
5. **Authorization is deterministic and outside every model.** Model agreement is not approval.
6. **Controls fail closed** for privileged actions and for the intake budgets, nonces and config. Diagnostics may degrade;
   the interactive plane may not.
7. **Stage E (automatic release) stays off** until the owner names the change classes and confirms again.
8. **The healer's own telemetry** goes to a separately labelled channel that never starts a job.

## Alternatives rejected

| Alternative                                                 | Why not                                                                                                                                                                                                           |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Intake in audit-service (it already has `POST /feedback`)   | Its limiter fails open on purpose and its public route is a spam courtesy. The service owns an append-only audit store; a mutable incident state machine does not belong beside it. No device or key model there. |
| Intake in client-logs-service                               | The route is public and unauthenticated by design, Mongo-backed, tuned for browser logs.                                                                                                                          |
| A module in agent-service (the plan's first recommendation) | Faster, reuses its guards and limits, but it shares a process with `ENCRYPTION_KEY`, runner tokens and device command dispatch (threat A14). The owner chose a separate service on 2026-11-28.                    |
| Reuse the existing HMAC webhook signing as the signature    | The server derives the secret, so the server can forge it. It is not proof of possession and gives no per-installation revocation.                                                                                |
| Reuse the existing limiter repositories                     | They fail open. A Redis outage would remove the cost control.                                                                                                                                                     |
| Bind the key to the `Device` model and `DeviceTokenClass`   | The extension is a user session, not a paired device. Pairing is optional. Adding an INSTALLATION class would widen a credential family whose route allow-list test is built for two classes.                     |
| A model classifier at the edge to spot bad reports          | Costs money per request, can be injected, and violates the plan (no model guards ingress).                                                                                                                        |
| One shared credential for all planes                        | A single theft would reach the repositories and the release channel.                                                                                                                                              |
| Telemetry that triggers the healer directly                 | Violates invariant 3. A flood or a forged report would become a job.                                                                                                                                              |

## Consequences

- New: `apps/claw-agent-service/src/modules/agent-incidents/` (NEW) with controller, guards, key service, budget
  repository, nonce store, sanitizer, grouping, queue publisher, config service, admin controller, pull controller; Prisma
  models for installation keys, incident events, incidents, DLQ records and config; migration; admin audit rows.
- nginx: a `incident_ingest` zone, a `location` for the intake with a body cap, timeouts and `limit_conn`, in `nginx.conf`,
  `nginx.distributed.conf.template` and every compose file that mounts nginx config (ADV-238).
- The extension (B5): consent, capture points, bounded local queue, key in SecretStorage, signing, user view and delete.
- Tests: the adversarial catalog (243 cases, 232 templates) runs on every change to intake, healer or release code. An
  unauthorised side effect is a blocking failure.
- Cost: one module of real size, a fail-closed repository that duplicates a small amount of Redis logic on purpose, and
  a loss of telemetry during a Redis outage (accepted, the interactive path is separate).
- Docs to move with the code (rule 63): service guide for agent-service, the env and config docs, the runbooks for kill
  switch, incident handling and rollback, the ADR index, the workspace `CLAUDE.md`.

## Conflicts found while reading the code

Where the plan and the code disagree. Each is reflected in the decisions above.

1. **Device class.** Plan 6.2 point 1 binds the installation key to "the user and device class (ADR-144)". The extension signs in
   as a user via auth-service; a `Device` exists only with optional pairing; `DeviceTokenClass` has no installation class.
   Resolution: key bound to user and installation, not to a device class.
2. **"Already has rate limits and webhook signing."** The limiter fails open, `incrWithTtl` treats a malformed reply as an
   allow, and the signing is symmetric and server-derived. Resolution: new fail-closed repository and an asymmetric signature.
3. **Kill switches as DB config.** agent-service has no config table or admin settings controller; the precedent lives in
   auth-service and research-service. Resolution: a NEW table in agent-service.
4. **nginx limit zone.** The plan assumes a `limit_req` zone is easy to add; `location /api/v1/agent` has none, the zones are
   keyed by address only, and the distributed template and compose files must all carry it.
5. **Decompression limits.** The plan asks for them; the agent-service body parser limit and gzip behaviour were not read
   (unverified, B4).
6. **Tenant.** The plan says tenant is derived server-side. There are users and an `Organization` model in agent-service but the
   product has no team accounts to claim (per the project notes); B4 defines tenant as the user account unless an
   organisation is present.
7. **Existing ADR text.** ADR-143's file name and the routine-secrets threat model refer to it as ADR-142 in their headings.
   Cosmetic; noted so links are not trusted by number alone.
8. **Throttler bypass.** The shared throttler skips any request carrying the inter-service token. The plan does not mention it.
   The intake must not depend on that throttler.

## What would make this stale

- A second consumer of the incident store outside claw-incident-service, or a need to merge it back into another service.
- The service rules in decision 2 (no outbound calls, no new dependencies, own database) can no longer be kept.
- A change of the extension's sign-in model (for example the extension becoming a paired device): revisit decision 3.
- Redis replaced or sharded in a way that changes the nonce and budget semantics.
- The Marketplace gains recall or signed channels: revisit the release invariants.
- Any change to the owner's stage E policy or the protected change classes.
- Evidence that the fail-closed budgets cost telemetry the owner values more than the cost control (measure in stage A).
