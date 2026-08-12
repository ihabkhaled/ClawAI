# Admin Identity, Entitlements, and Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver secure user/admin lifecycle management, authoritative plan enforcement, and exhaustive localized public discovery.

**Architecture:** Auth owns identity, plans, verification, and the immutable super-admin invariant. Resource-owning services enforce resolved limits atomically at their mutation boundaries. Frontend discovery uses the existing public-content registry and indexed-share APIs as the only sitemap/feed inputs.

**Tech Stack:** NestJS 11, Prisma 7/PostgreSQL, RabbitMQ, Next.js 16, React 19, TanStack Query, Vitest/Jest, Playwright.

## Global Constraints

- The seeded `ADMIN_EMAIL` account is the unique immutable `SUPER_ADMIN` after an idempotent production migration.
- Tokens and passwords are never logged or stored in plaintext.
- Unverified registrations cannot log in.
- Temporary admin-generated passwords force a password change.
- `null` limits are unlimited, `0` prohibits creation, and positive limits are strict maxima.
- Entitlement mutation gates fail closed and withstand concurrent final-slot requests.
- Sitemap URLs use the configured canonical origin and cover all 13 locales.
- Feeds contain only indexed publishable records with real dates.

---

### Task 1: Super-admin and verification persistence

**Files:**

- Modify: `apps/claw-auth-service/prisma/schema.prisma`
- Create: `apps/claw-auth-service/prisma/migrations/20260812_super_admin_email_verification/migration.sql`
- Modify: `apps/claw-auth-service/prisma/seed.ts`
- Test: `apps/claw-auth-service/src/modules/users/__tests__/users.service.spec.ts`

**Interfaces:**

- Produces immutable `isSuperAdmin`, `emailVerifiedAt`, and single-use verification-token persistence.

- [ ] Write failing schema/service tests for protecting the configured seeded account.
- [ ] Run the focused tests and confirm the expected failure.
- [ ] Add the idempotent migration/backfill and Prisma fields/models.
- [ ] Regenerate Prisma and make seed validation idempotent.
- [ ] Run focused tests and commit.

### Task 2: Verification email and forced temporary password flow

**Files:**

- Modify: `apps/claw-auth-service/src/app/config/app.config.ts`
- Create: focused email adapter, verification manager/repository/service/DTO files under `apps/claw-auth-service/src/modules/auth/`
- Modify: auth controller/module/manager and user service/controller/repository
- Test: auth and users unit/controller/repository tests

**Interfaces:**

- Produces registration verification, neutral resend, verification confirmation, admin temporary-password reset, and forced-change login state.

- [ ] Write failing tests for pending registration, blocked login, single-use verification, origin-safe links, resend neutrality, temporary passwords, session revocation, and delivery failure.
- [ ] Run focused tests and confirm failures.
- [ ] Implement the SMTP adapter using validated server-only configuration and canonical public origin.
- [ ] Implement token hashing, expiry, consumption, and rate limits.
- [ ] Implement admin reset and super-admin authorization invariants.
- [ ] Run auth workspace gates and commit.

### Task 3: Admin user query contract and UI

**Files:**

- Modify auth list-users DTO/repository/types.
- Modify frontend admin repository/query keys/controller hooks/types/components.
- Modify all 13 locale dictionaries and `i18n.types.ts`.
- Test auth user-query tests and frontend admin tests.

**Interfaces:**

- Consumes super-admin/verification fields and plan identifiers.
- Produces paginated search and role/plan/verification/status filtering plus admin creation/reset actions.

- [ ] Write failing backend query tests and frontend interaction tests.
- [ ] Run them and confirm failures.
- [ ] Implement plan/verification filters and stable pagination metadata.
- [ ] Implement filter/search/pagination controls and protected admin actions.
- [ ] Add native translations and run the untranslated audit.
- [ ] Run auth/frontend gates and commit.

### Task 4: Atomic chat/thread daily limits

**Files:**

- Modify shared entitlement contracts/adapters as required.
- Modify chat thread/message access services and repositories.
- Create focused daily-limit tests.

**Interfaces:**

- Consumes `maxChatsPerDay` and `maxMessagesPerDay`.
- Produces atomic UTC-day reservations with explicit 429 errors.

- [ ] Write failing zero/exact/+1/unlimited/outage/concurrency tests.
- [ ] Run tests and confirm failures.
- [ ] Implement fail-closed entitlement resolution and transactional reservations.
- [ ] Cover every chat/orchestration entry path.
- [ ] Run shared/chat gates and commit.

### Task 5: Workspace, context, memory, and feature gates

**Files:**

- Modify owning services' mutation boundaries and repositories.
- Modify shared-entitlements feature helpers only when a shared contract is needed.
- Add focused service tests for each configured limit and gate.

**Interfaces:**

- Consumes `maxWorkspaceConnections`, `maxContextPacks`, `maxMemoryItems`, and all boolean feature gates.
- Produces atomic resource enforcement and consistent localized error codes.

- [ ] Inventory all creation and alternate mutation paths.
- [ ] Write failing direct-API, zero, exact/+1, unlimited, outage, and concurrency tests.
- [ ] Implement owning-service transactional enforcement.
- [ ] Verify admin bypass and non-admin fail-closed behavior.
- [ ] Run every touched workspace gate and commit.

### Task 6: Exhaustive sitemap and feed classification

**Files:**

- Modify public content registry/constants and sitemap/feed services/routes.
- Add route-manifest coverage and XML behavior tests.

**Interfaces:**

- Produces complete locale page maps, indexed public-chat maps, and dated publication feeds.

- [ ] Write failing tests that compare every frontend route with an explicit public/private classification and assert 13-locale sitemap coverage.
- [ ] Write failing feed tests for indexed chats, real dates, exclusions, deduplication, and origin safety.
- [ ] Implement registry completeness and deterministic XML generation.
- [ ] Validate live sitemap/feed endpoints and public-chat inclusion in a browser.
- [ ] Run frontend gates and commit.

### Task 7: Cross-slice security and release validation

**Files:**

- Create/update gitignored QA evidence and repository-required documentation.
- Regenerate `.ai/**`, workspace `AGENTS.md`, and inventory snapshot.

**Interfaces:**

- Produces reproducible evidence for production migration, auth flows, limits, admin UI, and discovery.

- [ ] Run API matrices including authz, IDOR, enumeration, direct calls, and concurrency.
- [ ] Test signup verification, forced password change, and admin filters in a real browser.
- [ ] Test every configured free-plan limit at and beyond its boundary.
- [ ] Validate all sitemap/feed locale and public-chat outputs.
- [ ] Run per-workspace typecheck, lint, test, and build.
- [ ] Regenerate knowledge/audit artifacts after formatting, verify hooks, commit, and push the branch.
