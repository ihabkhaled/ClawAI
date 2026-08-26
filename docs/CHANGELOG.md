# Changelog

All notable changes to the Claw project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added

- **Workspace automations.** A new Automations page turns multi-step work across
  your connected tools into saved, repeatable chains — create a Jira ticket, post
  the result to Slack, update a document — with a starter template library and a
  run history showing exactly which step succeeded, failed, or was skipped. A
  failed run can be resumed from the step that broke rather than restarted.
- **Describe an automation in plain language** and get a draft chain back. Drafts
  are always reviewed and saved by a person; nothing runs automatically.
- **Calendar events can now be created** from automations on both Google Calendar
  and Outlook Calendar. Both were previously read-only.
- **Connector sharing.** A connector owner can grant another person scoped access
  (view, propose AI actions, edit config, manage grants) without handing over
  ownership, and recipients get a "shared with me" view. Revoking a grant now
  leaves a durable audit record instead of vanishing silently.
- **Cross-tool knowledge graph.** Relationships between synced items — a pull
  request that references a ticket, for example — are now detected and resolved
  during every sync and surfaced on item detail views.
- **Learned preferences.** Approving, editing, or rejecting an AI suggestion now
  teaches the system your preferences, which feed back into how future suggestions
  are drafted. A "what we've learned" panel shows what was inferred, and anything
  there can be dismissed.

### Fixed

- **Slack webhook replay vulnerability.** Slack request signatures never expire, so
  a captured, validly-signed webhook could previously be replayed indefinitely.
  Deliveries outside a five-minute window are now rejected.
- **A single malformed item no longer aborts an entire sync.** One bad ClickUp task
  could previously discard everything already collected from every other list; a
  failure is now contained to the one fetch that hit it.
- **Nineteen automation actions showed users raw internal names** (such as
  `CREATE_GITLAB_ISSUE`) instead of readable labels in the approval queue.
- **Removed a phantom action** that appeared and was clickable in the interface but
  had no implementation behind it and always failed.
- **Three connectors advertised webhook support they did not have**, so deliveries
  were silently rejected; the capability flags now match real behavior.
- **Lost automation events are now visible.** When the message broker is
  unreachable, the delivery record is kept and flagged rather than the failure only
  appearing in server logs, and a successful retry clears the flag.

---

## [1.1.0] - 2026-08-01

This release turns the VS Code integration and the local development stack into
first-class parts of ClawAI, while making billing lifecycle changes durable and
observable across service boundaries.

### Added

- **Safe plan retirement** with an admin delete action, deterministic replacement
  selection, durable per-subscription migration records, retryable auth/payment
  reconciliation, and an upgrade-at-renewal path that does not charge users during
  the current period. Historical plans remain as tombstones for invoices and audit.
- **Complete 13-locale frontend dictionaries.** Japanese, Thai, Persian, and
  Simplified Chinese now contain every English key without fallback spreads;
  completeness, placeholder, RTL, and untranslated-copy regressions are tested.
- **Research usage accounting** for search, extraction, and crawl operations so
  every real external dispatch contributes to user quota alongside model tokens,
  including Ollama primary and fallback searches plus failed fetch/extract attempts.
- **Resilient public pricing** with the canonical seven seeded plans as a frontend
  fallback, a localized temporary-data disclaimer, and retry controls when the
  authoritative catalog is unavailable.
- **Newest-model discovery** on the landing page for eight models verified against
  the connector catalog, including Kimi K3 and DeepSeek V4 variants.
- **VS Code coding-agent integration through 0.17.0**, including parallel model
  runs, integrated research for local models, refreshed visual hierarchy, visible
  usage, authentication renewal, external-output grants, and localized controls.

### Changed

- **Developer containers now watch bind-mounted source reliably** on Docker Desktop,
  including every NestJS service and the Next.js frontend. Development edits rebuild
  and restart the affected process without recreating the whole stack.
- **Routine successful health probes are silent** in service and centralized logs;
  failed probes retain warning/error visibility and diagnostic context.
- **VS Code authorization stays inside the branded ClawAI flow.** The extension
  refreshes expired access tokens automatically, and the browser completion page no
  longer exposes a raw loopback callback as the final experience.
- **VS Code frontend and backend environments are configured independently.** Local
  and custom URLs persist separately, while both unfinished Cloud choices remain
  visibly disabled until their production endpoints are finalized.
- **Plan, billing, and usage views now use authoritative subscription state** and
  finite daily/monthly quotas instead of stale or incorrectly unlimited values.
- **Admin accounts now receive explicit unlimited entitlements** for every feature,
  every model/provider, chats, and daily, weekly, and monthly usage, independent of
  an assigned customer plan.
- **Usage views now read finalized durable token ledgers**, while web search, fetch,
  and extraction remain visible as operation counters instead of invented token
  conversions.
- **Pricing cards now keep equal heights and CTA dimensions**, contain oversized
  copy in a bounded accessible scroll region, and synchronize language changes
  immediately across open tabs while preserving path, query, and hash.
- **Frontend security policy accepts valid local development origins only**, removing
  an invalid IPv6 wildcard source that lowered Lighthouse best-practices scores.

### Fixed

- Cancelled subscriptions remaining visible as active until cache expiry.
- Deactivated plans lingering in public catalog and billing responses.
- Immediate user upgrades being vulnerable to a previously scheduled retirement
  migration; explicit user choices now supersede the automated migration.
- Retryable billing/catalog failures being recorded as terminal plan-migration
  failures, and frozen scheduled prices being invalidated by later price rotation.
- Missing or incorrect language abbreviations, including Arabic now displaying `ع`.
- Initial extension authentication surfacing an unhelpful `fetch failed` state and
  authenticated sessions later failing with an unrecovered HTTP 401.

### Verification

- Auth, payment, frontend, localization, migration, Docker watcher, and health-log
  regression suites cover the new behavior.
- Release validation includes generated-knowledge integrity, inventory freshness,
  the complete workspace matrix, Lighthouse, Docker Compose configuration, and
  installed VSIX smoke testing.

---

## [1.0.0] - 2026-07-26

First stable release. The platform reaches feature completeness across
orchestration, billing, public sharing and the AI-native engineering layer, and
every workspace now ships a single, consistent version.

### Added

- **Public read-only shared chats** — an owner can publish an immutable snapshot of
  a conversation at a stable public URL, choose whether search engines may index it,
  refresh the published version, regenerate the URL, or revoke access. The public
  page is server-rendered so crawlers and screen readers receive the real transcript,
  and message bodies render through a hardened markdown pipeline that treats every
  message as hostile input: no raw HTML, scheme-checked links marked `nofollow ugc`,
  no remote images, and a hard size cap.
- **Subscriptions, billing and payments** — seven database-backed plans with
  versioned immutable prices, PayPal and Paymob gateways, proration, invoices,
  payment transactions, refunds and chargebacks, weighted-token quotas, and a
  transactional outbox that makes an entitlement change exactly as durable as the
  payment behind it.
- **`chat.share.*` domain events** consumed by the audit service, carrying ids and
  state transitions only — never conversation text, never the public identifier.
- **AdSense monetisation** for eligible public pages, with per-share eligibility
  derived on the server rather than from the URL, and five independently
  configurable slots that default to off.
- **Prompt-pack intake protocol** (rule 26) and **push-per-commit** (rules 07/23):
  what must happen before code when work arrives as a document, and why a local
  stack of unpushed commits is a stack of unverified ones.
- **Engineering mindsets** promoted to their own rule (27) with a canonical home.

### Changed

- **Every workspace now reports 1.0.0.** 24 of 26 still declared 0.1.0, internal
  `@claw/*` pins still referenced 0.1.0, and three code sites hardcoded a version of
  their own — including the llamacpp `/health` endpoint and the sidebar badge. All
  now derive from `package.json`, guarded by a test so they cannot drift again.
- **`CLAUDE.md` reduced from 167 kB to 14 kB and `CODEX.md` from 127 kB to 5 kB.**
  Both had grown into mirrors of `rules/`, which meant two copies of every rule with
  no guarantee they agreed. They are now indexes over the canonical sources.

### Fixed

- **Dev containers served a stale Prisma client.** The entrypoint copy used a form
  that copies INTO the destination once it exists, so the compiled client froze at
  first-run state and a schema enum added later was missing at runtime. Fixed across
  all 14 dev entrypoints.
- **A blank environment variable was not treated as unset.** A `.env` file writes an
  unset key as the empty string, which failed `min(1)` and made payment-service
  unbootable in the documented gateways-disabled configuration.
- **`npm install` failed inside every service container** because the root
  `prepare` script required a `.husky` file the images do not copy.
- **`UsageViewService` was exported without being provided**, so auth-service could
  not start and the billing usage meters had never been reachable.
- **Refunds and chargebacks had no effect on entitlement.** The revocation path
  existed with zero callers, payment transactions and invoices were never written at
  all, and the PayPal webhook acted on exactly one event type.
- **Four marketing pages failed the Lighthouse accessibility gate.** Three distinct
  contrast defects, all light-mode: muted text on a muted surface at 4.34:1, an
  opacity modifier compositing text to 3.24:1, and an accent pill at 4.48:1. Verified
  at zero failing nodes across all asserted URLs in both colour schemes, with a
  regression test that computes the ratios from the tokens.
- **Generated manifests depended on checkout line endings.** File sizes came from
  `statSync`, so a CRLF working tree and Linux CI could never agree on the freshness
  hash no matter how often either regenerated.

### Added

- **Grew from 9 to 17 backend services** — added Client Logs (:4010), Server
  Logs (:4011), Image (:4012), File Generation (:4013), Workspace (:4014),
  Agent (:4015), Research (:4016), and Llamacpp (:4017) services.
- **5th shared package** `@claw/shared-utilities` (jwt, http-client, crypto,
  retry, safe-stringify, …). All 5 shared packages now have their own
  lint/test/build/typecheck and are first-class CI matrix entries.
- **13 PostgreSQL instances** (up from 6) for database-per-service isolation;
  pgvector on the memory DB. MongoDB now backs 3 log/audit databases.
- New navigation docs: build-system (tsgo), port-service-map, end-to-end
  data flow, and a runbooks index.

### Changed

- **TypeScript toolchain migrated to tsgo** (`@typescript/native-preview`) +
  `tsc-alias`, replacing `tsc` / `nest build` across all 17 services and 5
  shared packages (build, dev watch, typecheck).
- **Docker base image `node:26-alpine` → `node:26-bookworm-slim`** (glibc is
  required for the tsgo and llama.cpp release binaries).
- **CI** is now 4 jobs (lint / typecheck / test / build), each a ~23-entry
  matrix (17 services + frontend + 5 shared packages).
- **i18n expanded to 9 locales** (added Hindi `hi`).
- Repo root slimmed: docs relocated to `docs/`, community-health files to
  `.github/`; only `README.md`, `LICENSE`, and the AI-agent guides remain.

### Fixed

- Frontend vitest OOM eliminated at its root (an unstable `useTranslation`
  mock caused an infinite render loop); the `run-vitest.cjs` wrapper was
  removed and `test` is now plain `vitest run`.

---

## [0.2.0] - 2026-04-04

### Phase 2: Microservices Restructure

#### Added

- **9 independent microservices** replacing the monolith backend:
  - Auth service (:4001) -- users, sessions, JWT, roles
  - Chat service (:4002) -- threads, messages, streaming
  - Connector service (:4003) -- provider configs, model catalogs
  - Routing service (:4004) -- routing decisions, policies
  - Memory service (:4005) -- memory, context packs, embeddings
  - File service (:4006) -- file upload, chunking
  - Audit service (:4007) -- audit logs, usage ledger
  - Ollama service (:4008) -- local model proxy
  - Health service (:4009) -- aggregates health from all services
- **6 separate PostgreSQL instances** (ports 5441-5446) for database-per-service isolation
- **MongoDB** for audit log storage (replacing PostgreSQL for audit data)
- **RabbitMQ** for async inter-service communication via topic exchange (`claw.events`)
- **Nginx reverse proxy** as the API gateway routing frontend requests to appropriate services
- **4 shared packages** under `packages/`:
  - `@claw/shared-types` -- enums, types, event contracts
  - `@claw/shared-constants` -- ports, names, exchange config
  - `@claw/shared-rabbitmq` -- NestJS RabbitMQ module
  - `@claw/shared-auth` -- JWT guard and decorators
- **Memory service** for persistent memory, context packs, and vector embeddings
- **File service** for file upload, chunking, and indexing
- **ADR-004** documenting the microservices architecture decision

#### Changed

- Monolith backend split into 9 independent NestJS microservices
- Database architecture changed from single PostgreSQL to 6 PostgreSQL instances + 1 MongoDB
- Inter-service communication uses RabbitMQ (async) and HTTP (sync) instead of in-process calls
- Frontend API calls route through Nginx reverse proxy instead of directly to a single backend
- Docker Compose now manages 20 containers (up from 3)
- Redis role changed from BullMQ job broker to caching and Ollama service state

#### Removed

- Monolith `claw-backend` application (replaced by 9 microservices)
- BullMQ job queue (replaced by RabbitMQ for inter-service messaging)
- Single shared PostgreSQL database

---

## [0.1.0] - 2026-04-04

### Phase 1: Foundation

#### Added

- **Monorepo structure** using npm workspaces with `claw-frontend` and `claw-backend` apps
- **Docker Compose** infrastructure with PostgreSQL 16 (pgvector), Redis 7, and Ollama
- **Authentication system** with JWT access/refresh tokens, argon2 password hashing, and refresh token rotation
- **User management** with role-based access control (ADMIN and USER roles)
- **Connector system** for managing AI provider connections with AES-256-GCM encrypted secret storage
- **Routing engine** with local judge model for intelligent provider/model selection
- **Chat system** with threaded conversations and message history
- **Audit logging** for tracking routing decisions and system events
- **Health check** endpoints for liveness and readiness monitoring
- **Frontend application** built with Next.js 14, React 18, TanStack Query, Zustand, and Tailwind CSS
- **Backend application** built with NestJS 10, Prisma ORM, BullMQ, and pino structured logging
- **Zod-based validation** for all API request DTOs on both frontend and backend
- **Database migrations** and admin seed script
- **Development tooling**: ESLint, Prettier, TypeScript strict mode
- **Testing setup**: Jest (backend), Vitest (frontend), Playwright (E2E)
- **Architecture documentation**: README, INSTALL, ARCHITECTURE, SECURITY, TESTING, CONTRIBUTING guides
- **ADRs**: Monorepo decision, PostgreSQL selection, local model routing strategy
