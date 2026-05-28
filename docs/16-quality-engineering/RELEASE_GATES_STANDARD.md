# Release Gates Standard

> Nothing ships until every gate is green.
> There are no exceptions, no "we'll fix it post-launch," no "it only affects edge cases."
> A red gate blocks release until it is resolved and re-verified.

---

## Release Gate Philosophy

A release gate is a binary check: it passes or it blocks. There is no "mostly passes." There is no "passes with caveats." There is no "we'll create a ticket to track the issue." A gate that is red blocks the release entirely until it turns green.

This philosophy exists because:

1. **Shipping known defects accelerates technical debt.** Every "we'll fix it later" that ships becomes a "we can't change that now because clients depend on the broken behavior."

2. **Partial quality is not quality.** A feature that works for the happy path but crashes on the error path is not a feature — it is a trap.

3. **User trust is lost in one incident and earned over months.** An operator whose LOCAL_ONLY routing sends data to the cloud once will never trust the privacy guarantees again.

4. **The cost of fixing a bug in production is 10x the cost of fixing it pre-ship.** Every gate that exists is there because a specific class of defect escaped without it.

### What "All Gates Green" Means

- **Code quality gates:** automated commands exit 0.
- **Test gates:** every test type passed against the feature's acceptance criteria.
- **Review gates:** every changed file was reviewed by a qualified reviewer.
- **Validation gates:** the feature was tested as a human user, not just as a machine.
- **Documentation gates:** every doc that needed updating was updated.
- **Infrastructure gates:** all 18 items from `DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md` verified.

---

## Gate Categories

### Category A: Code Quality Gates

These four gates are automated. They run in pre-commit hooks and in CI. They must all exit 0.

#### A1: TypeScript Compilation

```bash
npm run typecheck
```

**Pass criteria:** Zero TypeScript errors across all workspaces:

- `apps/claw-frontend`
- All 13 `apps/claw-*-service` workspaces
- All 4 `packages/*` workspaces

**What a failure here means:** Type contracts between layers are broken. A frontend type does not match a backend DTO. A shared package change broke a downstream service. A new enum value was added without updating all switch statements.

**Blocked by this gate:** Merge. No PR with TypeScript errors is merged.

#### A2: ESLint

```bash
npm run lint
```

**Pass criteria:** Zero ESLint errors. Pre-existing warnings are acceptable if they are not new (count must not increase).

**What a failure here means:** Code violates an architectural rule. `any` type was used. An inline type or enum was defined in a service file. A console.log was left in. A non-null assertion was used. An ESLint disable comment was added.

**Blocked by this gate:** Merge. No PR with ESLint errors is merged.

#### A3: Production Build

```bash
npm run build
```

**Pass criteria:** All workspaces build to production output without errors or warnings that indicate functional problems.

**What a failure here means:** The application cannot run in production. An import is broken. A dependency is missing. A Next.js page has a static generation error. A NestJS module is misconfigured.

**Blocked by this gate:** Merge and deployment.

#### A4: All Tests Pass

```bash
npm run test
```

**Pass criteria:** Every test in every workspace passes. Zero failures. Zero unexpected skips.

**What a failure here means:** A behavior contract is broken. Either the code regressed an existing behavior, or new code was shipped without adequate tests.

**Blocked by this gate:** Merge.

---

### Category B: Test Gates

These gates verify that testing was actually done — not just that automated commands passed.

#### B1: Unit Tests

**Pass criteria:**

- All new functions and methods have unit tests.
- All Zod DTO schemas have tests for happy path, bad input, and boundary values.
- All business logic branches are tested.
- `npm run test` exits 0.

**Evidence required:**

```bash
# Show test output for the affected service
npm run test --workspace=apps/claw-routing-service -- --verbose 2>&1 | tail -50
# All test suites: passed
# All tests: passed
```

#### B2: API Tests

**Pass criteria:**

- Every new or modified endpoint was tested with curl or Postman.
- Happy path: correct status code and response shape.
- Error path: at least 2 invalid inputs produce the correct error codes.
- Auth: unauthenticated request returns 401; wrong role returns 403.
- Test was performed through Nginx (port 4000), not directly to the service.

**Evidence required:** Curl output showing correct responses for at least 3 scenarios per new endpoint (see `API_TESTING_STANDARD.md`).

#### B3: UI Tests

**Pass criteria:**

- All expected user-visible states verified: loading, empty, success, error.
- Dark mode verified: no hard-coded colors, no invisible text.
- At least one non-English locale verified (Arabic for RTL check).
- All new interactive elements work with keyboard navigation.

**Evidence required:** Written description of states tested and what was observed. Screenshots for any complex UI interactions.

#### B4: Integration Tests

**Pass criteria (when applicable):**

- Cross-service flows verified: event published → event received → DB written.
- RabbitMQ event delivery confirmed via service logs.
- SSE events reach the frontend if applicable.

**Evidence required:** Log snippets showing event publish and consume.

#### B5: Regression Tests

**Pass criteria:**

- All flows identified in the regression scope (from the Planning Standard) were re-tested.
- No previously passing tests are now failing.
- Existing API endpoints that were not intentionally changed still return the same shape.

**Evidence required:** Statement of which regression tests were run and that they passed. If automated: `npm run test` output. If manual: written test log.

---

### Category C: Review Gates

#### C1: Code Review

**Pass criteria:**

- Every changed file was reviewed by at least one other engineer (or verified by the AI agent via structured self-review against `CODE_REVIEW_AND_PR_REVIEW_STANDARD.md`).
- All `[MUST FIX]` comments were addressed.
- No architecture violations remain (inline types, god-file growth, business logic in controllers, Prisma calls outside repositories).

#### C2: Architecture Review (When Required)

Required when:

- A new service is added.
- A new cross-service event flow is added.
- Shared packages are modified.
- The routing pipeline gains a new stage.
- An existing architectural pattern is changed.

**Pass criteria:** Architecture review explicitly confirms the change is consistent with the documented architecture in `CLAUDE.md` and `docs/03-architecture/`.

#### C3: Security Review (When Required)

Required when:

- A new authentication or authorization mechanism is added.
- A new API endpoint is added (verify AuthGuard and Roles).
- Encryption, token handling, or secret management is changed.
- File upload security is changed.

**Pass criteria:** Security checklist from `PLANNING_STANDARD.md` Section 12 was completed and all items confirmed.

---

### Category D: Validation Gates

#### D1: Feature Works as Specified

**Pass criteria:**

- Every technical acceptance criterion from the Planning Standard was verified.
- Every business acceptance criterion from the Product Framing Standard was verified.
- UAT checklist was completed (see `UAT_STANDARD.md`).

#### D2: Error States Are Correct

**Pass criteria:**

- Every API-backed component shows a meaningful error message when the API fails.
- No component shows a blank panel, `undefined`, or `[object Object]` on error.
- Loading states terminate (no infinite spinners) — max duration enforced.

#### D3: Client-Facing Features Pass Client Simulation

Required for all client-facing features (see Product Framing Standard Section 6.3).

**Pass criteria:** Non-technical user simulation completed per `CLIENT_ACCEPTANCE_TESTING_STANDARD.md`. Feature is intuitive, recoverable, and does not require engineering knowledge to use.

---

### Category E: Documentation Gates

#### E1: CLAUDE.md Updated

**Pass criteria:** If any new service, env var, pattern, endpoint, event, or rule was added, root `CLAUDE.md` reflects it. Verified by diff inspection.

#### E2: Service CLAUDE.md Updated

**Pass criteria:** If the feature changed a service's architecture, patterns, or constraints, the service-specific `CLAUDE.md` at `apps/<service>/CLAUDE.md` is updated.

#### E3: CHANGELOG.md Updated

**Pass criteria:** A changelog entry was added describing what was added, changed, or fixed. Format: `[version/date] - [type]: [description]`.

#### E4: Architecture Docs Updated (When Required)

**Pass criteria:** If architecture changed, the relevant file in `docs/` was updated. Stale docs are as harmful as missing docs.

---

### Category F: Infrastructure Gates

**Pass criteria:** All 18 items from `DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md` were checked. Each item was either confirmed done or confirmed N/A with a reason.

**This is a single gate. If any of the 18 items is not checked, the infrastructure gate is red.**

---

## Blocker Severity Levels

| Severity             | Definition                                                       | Action Required                             |
| -------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **CRITICAL BLOCKER** | Production data loss, auth bypass, service outage, security vuln | No merge. No deploy. Fix immediately.       |
| **HIGH BLOCKER**     | Core feature broken, privacy guarantee violated, CI failing      | No merge until fixed.                       |
| **MEDIUM**           | Feature degraded, workaround exists, no data loss                | Fix before production release.              |
| **LOW**              | Minor UX issue, cosmetic defect, no functional impact            | Track in tech debt. Non-blocking for merge. |

### CRITICAL BLOCKER Examples

- Privacy-flagged query is routed to a cloud provider (LOCAL_ONLY enforcement broken).
- JWT token appears in server logs or URL query parameters.
- `AuthGuard` is missing from a new endpoint that accesses user data.
- Database migration deletes data that should be preserved.
- A Prisma query lacks a `where: { userId }` ownership check.
- Service crashes on startup due to misconfigured AppConfig.

### HIGH BLOCKER Examples

- TypeScript errors in any workspace.
- ESLint errors in any workspace.
- Any test failure in `npm run test`.
- New endpoint returns 404 when called through Nginx (missing location block).
- Frontend page shows white screen on error instead of error state.
- Replay batch crashes and returns no results.
- Missing i18n translation key causes `undefined` to render in any locale.

### MEDIUM Examples

- Pagination control visible when there is only 1 page of results.
- Loading skeleton flickers for < 200ms before data appears.
- Error message is technically correct but not user-friendly.
- API response includes more fields than necessary (no security impact).

### LOW Examples

- Spacing inconsistency in a non-critical UI component.
- Log message phrasing is inconsistent with other log messages.
- Test description is ambiguous but the test itself is correct.

---

## Release Readiness Checklist (Final Sign-Off)

This checklist is completed immediately before merge/deploy. Every item is checked. No item is skipped.

### Automated Quality

- [ ] `npm run typecheck` — exits 0, zero errors in ALL workspaces
- [ ] `npm run lint` — exits 0, zero errors in ALL workspaces
- [ ] `npm run build` — exits 0, all workspaces build successfully
- [ ] `npm run test` — exits 0, all tests pass, zero failures

### Docker and Infrastructure

- [ ] All affected service containers are healthy: `docker compose ps` shows `(healthy)` for all
- [ ] New service (if any) starts cleanly with no error logs
- [ ] Prisma migrations applied: service logs show "All migrations have been successfully applied"
- [ ] Nginx routes correct: new endpoints return non-404 responses through port 4000
- [ ] All 18 items from `DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md` checked and verified

### Database

- [ ] New tables/columns exist in the correct database (verified with psql)
- [ ] Seed data is present (if applicable)
- [ ] No orphaned columns or tables from previous migration attempts

### API Correctness

- [ ] Happy path verified for every new or modified endpoint
- [ ] Error paths verified: invalid input returns 400, missing auth returns 401, wrong role returns 403
- [ ] Response shapes match the frontend types in `src/types/`
- [ ] All API tests run through port 4000 (Nginx), not directly to the service

### Frontend Correctness

- [ ] Loading state renders (not blank screen while data loads)
- [ ] Empty state renders (not blank screen when no data exists)
- [ ] Error state renders (not blank screen when API fails)
- [ ] Dark mode: no hard-coded colors, no invisible text
- [ ] Arabic locale (RTL) renders correctly for any new UI elements
- [ ] Keyboard navigation works for all new interactive elements

### Authorization and Security

- [ ] All new endpoints have `AuthGuard` active (or `@Public()` with explicit justification)
- [ ] All new endpoints have correct `@Roles()` decorator
- [ ] Ownership validation present for all data access by ID
- [ ] No secrets, tokens, or passwords appear in logs
- [ ] No `any` type anywhere in the changed code
- [ ] No `!` non-null assertion anywhere in the changed code

### Events and Observability

- [ ] RabbitMQ events publish correctly (verified in service logs)
- [ ] RabbitMQ events are consumed correctly by subscriber services
- [ ] Audit events fire for user-visible actions
- [ ] Service logs emit at the correct levels (no missing log entries, no excess debug noise)
- [ ] No `console.log` in any production code

### Code Quality

- [ ] No inline types, interfaces, or enums in service/manager/controller/repository files
- [ ] No inline types, constants, or enums in `.tsx` or hook files
- [ ] No raw string literals where enums should be used
- [ ] No `process.env` accessed directly (use AppConfig)
- [ ] All third-party library calls go through utility wrappers
- [ ] No business logic in controllers (3-line rule enforced)
- [ ] No Prisma calls outside repository files

### i18n and Localization

- [ ] All new user-facing text has translation keys (not hardcoded strings)
- [ ] All 9 locale files updated: en, ar, de, es, fr, hi, it, pt, ru
- [ ] `i18n.types.ts` updated with new translation keys
- [ ] `npm run typecheck` passes on frontend workspace (confirms type-safe keys)

### Documentation

- [ ] Root `CLAUDE.md` updated if new services, env vars, patterns, or routes were added
- [ ] Service-specific `CLAUDE.md` updated if service architecture changed
- [ ] `CHANGELOG.md` updated with a description of the change
- [ ] Architecture docs in `docs/` updated if architecture changed

### Regression

- [ ] All regression scenarios identified in the Planning Standard were re-tested
- [ ] `npm run test` still passes (no newly broken tests)
- [ ] Existing API endpoints that were not intentionally changed still return correct responses

### UAT and Product Acceptance

- [ ] Every technical acceptance criterion from the Planning Standard verified
- [ ] Every business acceptance criterion from the Product Framing Standard verified
- [ ] UAT checklist completed (see `UAT_STANDARD.md`)
- [ ] Client simulation completed for client-facing features (see `CLIENT_ACCEPTANCE_TESTING_STANDARD.md`)

---

## Required Evidence Before Merge

The following evidence must be produced and attached to the PR or work item before merge is approved.

| Evidence Type                    | What to Provide                                                       |
| -------------------------------- | --------------------------------------------------------------------- |
| **Test run output**              | `npm run test` terminal output showing all tests pass                 |
| **Lint/typecheck clean output**  | `npm run lint && npm run typecheck` terminal output showing 0 errors  |
| **Build success output**         | `npm run build` terminal output showing all workspaces built          |
| **API test evidence**            | Curl outputs for new endpoints (happy path + at least 2 error cases)  |
| **Browser test evidence**        | Description of states verified (loading/empty/error/success) per page |
| **DB persistence evidence**      | `SELECT` output from psql confirming the new data was written         |
| **Log evidence**                 | Service log lines showing expected events and no unexpected errors    |
| **Infra checklist confirmation** | Statement confirming all 18 items checked with N/A or done status     |

---

## Rollback Criteria

### What Triggers a Rollback

A rollback is initiated when any of these conditions occur in production after deployment:

- Any CRITICAL BLOCKER is discovered post-deploy.
- Service health drops below 100% (any service enters unhealthy state due to the deploy).
- Privacy routing enforcement is violated (cloud provider receives data flagged as local-only).
- Authentication or authorization is broken for any user role.
- Database migration caused data loss or corruption.
- More than 5% of API requests return 500 errors within the first 30 minutes.
- The deployment itself fails (container does not start, migration fails to apply).

### Rollback Procedure

```bash
# Step 1: Revert to the previous Docker image
docker compose -f docker/docker-compose.yml stop <service-name>
docker compose -f docker/docker-compose.yml rm -f <service-name>

# Step 2: Pull the previous image (tag the previous build before deploying)
docker pull <image-name>:<previous-tag>

# Step 3: Update docker-compose.yml to reference the previous image tag
# (this is why images must be tagged with version before deploy)

# Step 4: Start the previous image
docker compose -f docker/docker-compose.yml up -d <service-name>

# Step 5: Verify service is healthy
docker compose -f docker/docker-compose.yml ps <service-name>
# Must show (healthy)

# Step 6: If a DB migration was applied — a rollback migration is required
# NEVER run prisma migrate reset in production — it deletes data
# Write a manual migration that reverses the schema change:
cd apps/<service>
npx prisma migrate dev --name rollback_<feature-name>
# This creates a forward migration that reverses the previous migration's changes
```

### Rollback Verification

After rollback:

1. Confirm the service is healthy: `docker compose ps <service-name>` shows `(healthy)`.
2. Confirm the reverted API endpoint works: test the affected endpoint with curl.
3. Confirm no data was lost: query the affected database tables.
4. Confirm the frontend works for the affected feature area.
5. Document the rollback: what was reverted, when, why, and what the post-mortem plan is.

### DB Rollback Rule

**NEVER use `prisma migrate reset` in production.** It drops and recreates the entire database. Data is lost permanently.

For schema rollback: write a forward migration that reverses the changes. For example, if the failed migration added a column `suspiciousCount`, the rollback migration drops that column.

---

## Emergency Hotfix Path

A hotfix is a change deployed directly to production to resolve a CRITICAL BLOCKER without going through the full feature development cycle.

### When the Hotfix Path Applies

- A CRITICAL BLOCKER is confirmed in production.
- The fix can be isolated to a small, low-risk code change.
- Waiting for a full development cycle would cause continued harm to operators or users.

### Minimum Gates That Still Apply for Hotfixes

Even in emergency situations, these gates are non-negotiable:

1. **Root cause confirmed** — the fix addresses the cause, not just the symptom.
2. **TypeScript: 0 errors** — `npm run typecheck` exits 0.
3. **ESLint: 0 errors** — `npm run lint` exits 0.
4. **Affected unit tests pass** — the specific test(s) covering the fixed code pass.
5. **API test confirms fix** — a curl test shows the broken behavior is resolved.
6. **One reviewer** — at least one other person reviewed the fix (or AI agent self-reviewed).

### Gates That May Be Temporarily Deferred for Hotfixes

These gates are deferred and must be completed as follow-up work within 24 hours of the hotfix deploy:

- Full regression test suite.
- UI testing beyond the directly affected component.
- Documentation updates (CLAUDE.md, changelog).
- Comprehensive test coverage for edge cases beyond the fix.

### Required Post-Hotfix Cleanup (Within 24 Hours)

- [ ] Full regression tests run and passed.
- [ ] CHANGELOG.md updated with hotfix entry.
- [ ] CLAUDE.md updated if the hotfix revealed a missing pattern or rule.
- [ ] Root cause documented in a post-mortem note.
- [ ] Additional tests added to prevent regression of the same issue.
- [ ] Any deferred tests and documentation completed.

---

## No-Release Criteria

The following conditions prevent release regardless of business pressure, deadlines, or stakeholder requests:

| Condition                                                            | Reason                                               |
| -------------------------------------------------------------------- | ---------------------------------------------------- |
| TypeScript errors in any workspace                                   | Type contracts are broken; runtime errors guaranteed |
| Any failing test in `npm run test`                                   | Known behavioral regression exists                   |
| Privacy routing enforcement is broken                                | Data governance violation; regulatory risk           |
| AuthGuard missing from any new data-access endpoint                  | Security vulnerability                               |
| Database migration that drops columns with data in production        | Irreversible data loss                               |
| Missing i18n translations for a client-facing feature                | Client-visible defect in multiple locales            |
| Frontend page crashes to blank screen on any path the user can reach | Feature is non-functional                            |
| CI pipeline is failing                                               | Build is unverified; cannot deploy with confidence   |
| Nginx route is missing for a new endpoint (would return 404 in prod) | Feature entirely non-functional in production        |

These are absolute. Not relative to timeline. Not negotiable.

---

## Post-Release Validation

### 5-Minute Smoke Test (Immediately After Deploy)

Run within 5 minutes of deploying:

```bash
# 1. Check all services are healthy
docker compose -f docker/docker-compose.yml ps | grep -v "healthy"
# Output must be empty (all services healthy)

# 2. Check aggregated health endpoint
curl -s http://localhost:4009/api/v1/health | jq '.status'
# Must return "healthy"

# 3. Test the new endpoint through Nginx
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer $JWT" \
  http://localhost:4000/api/v1/<new-endpoint>
# Must return 200 (or expected status), NOT 404 or 500

# 4. Check service logs for errors
docker compose -f docker/docker-compose.yml logs <service-name> --since 5m | grep -i "error\|exception\|failed"
# Must return nothing (no errors)

# 5. Check Nginx logs for unexpected 5xx
docker compose -f docker/docker-compose.yml logs nginx --since 5m | grep " 5[0-9][0-9] "
# Must return nothing
```

### 24-Hour Stability Check

Within 24 hours of deploy, confirm:

- [ ] No service has restarted unexpectedly (`docker ps --format "{{.Names}} {{.Status}}"` shows uptime > 1h).
- [ ] No increase in error rate in server logs.
- [ ] No operator-reported issues related to the deployed feature.
- [ ] Routing decisions are being made correctly (spot-check 5 recent decisions in the routing history).
- [ ] Audit log is capturing expected events for the new feature.

### Rollback Trigger Window

The rollback trigger window is **30 minutes** after deploy for CRITICAL issues. After 30 minutes, assess whether a rollback is safer than a forward fix, considering:

- Volume of data written since deploy (rollback may require migration).
- Whether operators are actively using the new feature.
- Whether the rollback itself could cause disruption.
