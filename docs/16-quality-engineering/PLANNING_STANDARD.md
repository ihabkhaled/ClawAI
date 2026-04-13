# Planning Standard

> Define ALL work before writing a single line of code.
> Every feature, bug fix, and refactor requires a completed planning phase.
> Code written before planning is complete is not engineering — it is guessing.

---

## Purpose and Philosophy

Planning exists for one reason: to prevent wasted effort. In a system with 13 NestJS microservices, 9 PostgreSQL databases, RabbitMQ event flows, Nginx routing, shared packages used by every service, and a Next.js frontend with 8 language locales — a change that seems isolated rarely is. An unplanned change to `claw-routing-service` can break the frontend replay lab, invalidate shared types consumed by `claw-chat-service`, corrupt the CI pipeline, and ship with missing Nginx routes all at the same time.

Planning is not bureaucracy. It is the activity that turns a vague request into a precise, bounded, testable work item. It answers every question before the first function is written so that implementation is execution, not discovery.

### What Planning Is Not

- Planning is not writing code speculatively "to see what happens."
- Planning is not skimming the requirements and starting immediately.
- Planning is not "I'll figure out the edge cases as I go."
- Planning is not finishing implementation and then writing the plan retroactively.

---

## When Planning Is Required

Planning is required for **every work item without exception**:

| Work Type             | Planning Required? | Minimum Planning Depth           |
| --------------------- | ------------------ | -------------------------------- |
| New feature           | Yes                | Full (all sections)              |
| Bug fix               | Yes                | Sections 1–5 + risk              |
| Refactor              | Yes                | Sections 1–5 + regression scope  |
| Schema migration      | Yes                | Full (all sections)              |
| Shared package change | Yes                | Full (impact on all 13 services) |
| New env variable      | Yes                | Sections 1–4 + infra checklist   |
| i18n addition only    | Yes                | Sections 1–2 + locale checklist  |
| Documentation update  | Yes                | Section 1 only                   |
| Hotfix                | Yes                | Abridged (see Section 10)        |

A "quick fix" that skips planning is a liability until proven otherwise. If the fix truly is trivial (typo correction, comment change), the planning phase takes two minutes. If you cannot complete planning in two minutes, the fix is not trivial.

---

## Section 1: Feature or Bug Brief

Write a plain-language summary of what is being built or fixed. Maximum two sentences. If you cannot write it in two sentences, you do not yet understand the scope.

**Format:**

```
What: [One sentence describing the change.]
Why: [One sentence describing the user or business problem it solves.]
```

**Examples:**

```
What: Add pagination to the replay lab's "Runs" tab so that operators can browse historical
      replay run summaries beyond the first 20 entries.
Why:  Operators running nightly replay batches accumulate hundreds of saved runs; the current
      UI shows only the first page with no way to load more.
```

```
What: Fix the routing decision replay endpoint so that decisions with null messageContent
      are skipped rather than causing a 500 error.
Why:  Corrupt legacy routing records with null content are crashing the entire replay batch,
      returning no results for any decision.
```

```
What: Refactor ReplayManager's re-run logic into private helpers so that each method stays
      under 80 lines per the architecture standard.
Why:  The current runReplay() method is 140 lines, violates the complexity limit, and is
      difficult to unit test in isolation.
```

---

## Section 2: Impacted-Area Map

Before writing code, fill every row of this table. A row marked "N/A" is a positive assertion that this area is unaffected. Do not leave rows blank.

| Area                        | Impacted? | Specific Files / Items Affected                                           |
| --------------------------- | --------- | ------------------------------------------------------------------------- |
| **Backend services**        |           | Which of the 13 services? (claw-routing-service, claw-chat-service, etc.) |
| **Frontend pages**          |           | Which pages in `src/app/(portal)/`?                                       |
| **Frontend components**     |           | Which files in `src/components/<feature>/`?                               |
| **Frontend hooks**          |           | Which files in `src/hooks/<domain>/`?                                     |
| **Database schemas**        |           | Which Prisma model? Which DB (claw_routing, claw_chat, etc.)?             |
| **Prisma migrations**       |           | Migration name, affected columns/tables                                   |
| **Seed files**              |           | Which seed file? What default data?                                       |
| **RabbitMQ events**         |           | New event patterns? Changed payloads? New consumers?                      |
| **API endpoints**           |           | New or modified routes? HTTP method + path                                |
| **Shared packages**         |           | shared-types, shared-constants, shared-rabbitmq, shared-auth              |
| **Environment variables**   |           | New/renamed/removed vars? Which services consume them?                    |
| **Docker compose (dev)**    |           | `docker-compose.dev.yml` — new service, port, volume, depends_on?         |
| **Docker compose (prod)**   |           | `docker-compose.yml` — same                                               |
| **Docker compose (ollama)** |           | `docker-compose.dev.ollama.yml`, `docker-compose.prod.ollama.yml`         |
| **Nginx config**            |           | New upstream block? New location block? SSE route?                        |
| **Health service**          |           | `apps/claw-health-service` — new service URL registered?                  |
| **CI pipeline**             |           | `.github/workflows/ci.yml` — Prisma generate loop? Test env vars?         |
| **i18n locales**            |           | New translation keys? All 8 locales: en, ar, de, es, fr, it, pt, ru       |
| **Frontend types**          |           | `src/types/<domain>.types.ts` — synced with backend DTO changes?          |
| **Frontend enums**          |           | `src/enums/index.ts` — new enum exported?                                 |
| **Frontend constants**      |           | `src/constants/<name>.constants.ts` — new constants?                      |
| **Frontend repository**     |           | `src/repositories/<domain>/` — new API calls?                             |
| **Query keys**              |           | `src/repositories/shared/query-keys.ts` — new keys?                       |
| **Root CLAUDE.md**          |           | New services, env vars, patterns, or rules?                               |
| **Service CLAUDE.md**       |           | `apps/<service>/CLAUDE.md` — service-specific changes documented?         |
| **Architecture docs**       |           | `docs/` — does architecture change?                                       |

**Completed example (Replay Lab pagination):**

| Area                  | Impacted? | Specific Files                                                 |
| --------------------- | --------- | -------------------------------------------------------------- |
| Backend services      | Yes       | claw-routing-service                                           |
| Frontend pages        | Yes       | `src/app/(portal)/routing/replay/page.tsx`                     |
| Frontend components   | Yes       | `replay-runs-tab.tsx` (new pagination controls)                |
| Frontend hooks        | Yes       | `use-replay-runs.ts` (add `page` param to query)               |
| Database schemas      | No        | N/A                                                            |
| Prisma migrations     | No        | N/A                                                            |
| RabbitMQ events       | No        | N/A                                                            |
| API endpoints         | Yes       | `GET /routing/replay/runs` — add `page`, `limit` query params  |
| Shared packages       | No        | N/A                                                            |
| Environment variables | No        | N/A                                                            |
| Docker compose        | No        | N/A                                                            |
| Nginx config          | No        | N/A (existing route already covers `/routing/replay/*`)        |
| CI pipeline           | No        | N/A                                                            |
| i18n locales          | Yes       | Add `replayLab.pagination.*` keys to all 8 locale files        |
| Frontend types        | Yes       | `src/types/replay.types.ts` — add `PaginatedRunsResponse` type |
| Root CLAUDE.md        | No        | N/A                                                            |

---

## Section 3: Risk Matrix

Identify every risk introduced by this change. Do not skip this. Optimism about risk is how production incidents happen.

**Format:**

| Risk                               | Likelihood   | Severity                 | Mitigation               |
| ---------------------------------- | ------------ | ------------------------ | ------------------------ |
| Description of what could go wrong | LOW/MED/HIGH | LOW/MEDIUM/HIGH/CRITICAL | Concrete mitigation step |

**Severity definitions:**

- **CRITICAL**: Data loss, authentication bypass, service outage, or production crash.
- **HIGH**: Feature completely broken for users, blocking a primary workflow.
- **MEDIUM**: Feature degraded; workaround exists; no data loss.
- **LOW**: Minor UX issue or cosmetic defect; no functional impact.

**Completed example (Replay Lab pagination):**

| Risk                                                                      | Likelihood | Severity | Mitigation                                                     |
| ------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------- |
| `page=0` sent by client causes Prisma `skip` to go negative               | MEDIUM     | MEDIUM   | Validate `page >= 1` in Zod DTO with `.min(1)`                 |
| Offset-based pagination returns stale data when runs are added mid-browse | LOW        | LOW      | Acceptable; document in UI tooltip                             |
| New `page` param breaks existing callers passing no param                 | LOW        | HIGH     | Default `page` to `1` in Zod schema; existing calls unaffected |
| Large `limit` values trigger expensive DB full-table scans                | LOW        | MEDIUM   | Cap `limit` at 50 in Zod DTO with `.max(50)`                   |

**Completed example (Shared package change — adding new event pattern to shared-types):**

| Risk                                                                       | Likelihood | Severity | Mitigation                                                       |
| -------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------- |
| All 13 service containers need rebuild if shared-types changes             | HIGH       | HIGH     | Follow full stop → rm → rmi → build procedure for every consumer |
| CI fails for services that import shared-types but don't consume the event | MEDIUM     | MEDIUM   | Add new pattern as optional field with backward-compatible type  |
| Event name typo causes silent no-delivery in RabbitMQ                      | MEDIUM     | HIGH     | Use `RoutingEventPatterns` enum — never hardcode event strings   |

---

## Section 4: Technical Acceptance Criteria

Write explicit, testable numbered statements. Vague criteria ("the feature works") are not acceptance criteria. Each criterion must be independently verifiable by someone who did not write the code.

**Format:**

```
AC-N: [Testable statement including expected value, endpoint, condition, or behavior.]
```

**Completed example (Replay Lab pagination):**

```
AC-1: GET /api/v1/routing/replay/runs?page=1&limit=10 returns HTTP 200 with an array
      of at most 10 run summaries ordered by createdAt DESC.

AC-2: GET /api/v1/routing/replay/runs?page=2&limit=10 returns the next 10 runs,
      with no overlap with page 1.

AC-3: GET /api/v1/routing/replay/runs?page=1 (no limit) returns HTTP 200 with
      default limit of 20 applied.

AC-4: GET /api/v1/routing/replay/runs?page=0 returns HTTP 400 with a Zod validation
      error indicating page must be >= 1.

AC-5: GET /api/v1/routing/replay/runs?limit=100 returns HTTP 400 with a Zod validation
      error indicating limit must be <= 50.

AC-6: The frontend "Runs" tab renders a pagination control when total > limit.

AC-7: Clicking "Next Page" increments the page query param and fetches the next batch
      without a full page reload.

AC-8: Navigating to page 3 and refreshing the browser restores page 3 (URL state preserved).

AC-9: When total runs <= limit, no pagination control is rendered.
```

---

## Section 5: Failure Criteria

What must NOT happen. These are inversion checks — conditions that indicate a regression or defect.

**Completed example (Replay Lab pagination):**

```
FC-1: The runs table must NOT show duplicate entries when navigating between pages.
FC-2: Page navigation must NOT reset the selected filters (date range, status).
FC-3: A page load must NOT trigger more than 2 API calls (runs list + run count).
FC-4: The API must NOT return 500 when page or limit are valid but yield zero results.
FC-5: Changing the page must NOT clear the currently expanded run detail row.
```

---

## Section 6: Regression Scope

List the existing flows that this change could affect. For each flow, state explicitly whether it must be re-tested.

**Format:**

| Existing Flow                    | Could Be Affected? | Must Re-Test? | Re-Test Method     |
| -------------------------------- | ------------------ | ------------- | ------------------ |
| Description of existing behavior | Yes/No             | Yes/No        | Unit/API/UI/Manual |

**Completed example (Replay Lab pagination — modifying GET /routing/replay/runs):**

| Existing Flow                                     | Could Be Affected? | Must Re-Test? | Re-Test Method |
| ------------------------------------------------- | ------------------ | ------------- | -------------- |
| POST /routing/replay creates a run successfully   | No                 | No            | —              |
| GET /routing/replay/runs (no params) returns runs | Yes                | Yes           | API test       |
| Replay Results tab shows run list                 | Yes                | Yes           | UI test        |
| Needs Review tab — no dependency on runs list     | No                 | No            | —              |
| Run compare (two runIds) — independent endpoint   | No                 | No            | —              |
| Export bundle — independent endpoint              | No                 | No            | —              |

**Completed example (Modifying shared-types — ReplayOutcomeLabel enum):**

| Existing Flow                              | Could Be Affected? | Must Re-Test? | Re-Test Method   |
| ------------------------------------------ | ------------------ | ------------- | ---------------- |
| Replay POST returns outcome labels         | Yes                | Yes           | API + unit tests |
| Frontend filters by outcome label          | Yes                | Yes           | UI test          |
| claw-chat-service consuming routing events | Yes                | Yes           | Integration test |
| All 13 services CI build                   | Yes                | Yes           | CI pipeline      |

---

## Section 7: Test Strategy Seed

Identify which test types are needed for this work item and why. This becomes the test plan skeleton.

| Test Type         | Required? | Rationale                                                    |
| ----------------- | --------- | ------------------------------------------------------------ |
| Unit tests        | Yes/No    | Why (what logic, branches, or DTO constraints need coverage) |
| API tests         | Yes/No    | Why (what endpoints, error codes, payloads)                  |
| UI tests          | Yes/No    | Why (what user-visible states, interactions)                 |
| Integration tests | Yes/No    | Why (what cross-service flows, events, DB writes)            |
| E2E tests         | Yes/No    | Why (what user journey is tested end-to-end)                 |
| Regression tests  | Yes/No    | Why (what existing behavior could break)                     |

**Completed example (Replay Lab pagination):**

| Test Type         | Required? | Rationale                                                                                      |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------- |
| Unit tests        | Yes       | Zod DTO validation for page/limit constraints; repository `findRuns` with `skip`/`take` params |
| API tests         | Yes       | All 5 new AC endpoints; error cases for page=0 and limit=100                                   |
| UI tests          | Yes       | Pagination control visibility; page navigation; URL state preservation                         |
| Integration tests | No        | No cross-service flow involved                                                                 |
| E2E tests         | No        | Existing E2E for replay lab covers the runs tab path                                           |
| Regression tests  | Yes       | GET /routing/replay/runs with no params (existing callers)                                     |

---

## Section 8: Documentation Impact List

List every documentation file that must be updated. "None" is only acceptable if the change adds no new behavior, endpoints, env vars, events, or architecture decisions.

| Document                              | Update Required? | What Changes |
| ------------------------------------- | ---------------- | ------------ |
| Root `CLAUDE.md`                      |                  |              |
| `apps/<service>/CLAUDE.md`            |                  |              |
| `docs/03-architecture/`               |                  |              |
| `docs/04-backend/`                    |                  |              |
| `docs/05-frontend/`                   |                  |              |
| `docs/06-data/`                       |                  |              |
| `docs/08-runtime-devops/`             |                  |              |
| `CHANGELOG.md`                        |                  |              |
| API reference in `docs/12-reference/` |                  |              |

---

## Section 9: Planning Checklist (Gate Before Coding)

This checklist must be completed before any implementation file is opened. All items must be checked.

- [ ] Feature/bug brief written (2 sentences, clear What + Why)
- [ ] Impacted-area map completed (every row filled, no blanks)
- [ ] Risk matrix completed (at least 3 risks evaluated)
- [ ] Technical acceptance criteria written (numbered, testable)
- [ ] Failure criteria written (at least 3 items)
- [ ] Regression scope identified (every existing related flow assessed)
- [ ] Test strategy seeded (which test types, why)
- [ ] Documentation impact list completed
- [ ] Security implications reviewed (see Section 10)
- [ ] Performance implications reviewed (see Section 11)
- [ ] Observability implications reviewed (see Section 12)
- [ ] Infra checklist cross-referenced (see `DOCS_ENV_DOCKER_NGINX_CI_CHECKLIST.md`)
- [ ] Scope bounded (in-scope vs. out-of-scope explicitly stated)
- [ ] Dependencies identified (blocked by? blocks what?)
- [ ] Planning reviewed (see Section 13)

**This gate is non-skippable.** A work item that fails this checklist is not ready to implement.

---

## Section 10: Scope Bounding

Explicitly state what is in scope and what is out of scope for this work item.

**Format:**

```
IN SCOPE:
- [Item 1]
- [Item 2]

OUT OF SCOPE (deferred or separate ticket):
- [Item 1 — reason for exclusion]
- [Item 2 — reason for exclusion]
```

**Completed example (Replay Lab pagination):**

```
IN SCOPE:
- Offset-based pagination on GET /routing/replay/runs (page + limit params)
- Zod DTO validation for page/limit with sane defaults and caps
- Frontend pagination control component in replay runs tab
- URL state preservation for current page
- i18n keys for pagination labels (all 8 locales)

OUT OF SCOPE (separate work items):
- Cursor-based pagination — complexity not justified for this volume
- Sorting controls beyond createdAt DESC — no user requirement yet
- Filtering runs by status/date on the backend — separate ticket
- Export of filtered/paginated results — separate ticket
```

---

## Section 11: Dependency Identification

| Dependency                               | Type      | Status           | Impact if Blocked                 |
| ---------------------------------------- | --------- | ---------------- | --------------------------------- |
| Migration must run before service starts | Technical | Resolved at boot | Deploy fails if migration skipped |
| shared-types must be rebuilt first       | Technical | Manual step      | All 13 services fail typecheck    |
| Nginx config change needs nginx restart  | Infra     | Manual step      | New route returns 404             |
| Feature X must ship before this feature  | Product   | Note dependency  | End-to-end flow incomplete        |

---

## Section 12: Security Implications Checklist

Answer every question. "No" is a valid answer — state it explicitly.

- [ ] Does this change expose a new API endpoint? If yes: is it protected by `AuthGuard`? Is role (`@Roles()`) correct?
- [ ] Does this change handle user-supplied input? If yes: is it validated by Zod with length limits?
- [ ] Does this change store data in the database? If yes: is there ownership validation before write?
- [ ] Does this change return data from the database? If yes: is there ownership validation before return?
- [ ] Does this change involve file uploads? If yes: are all 4 security checks in `FileSecurityManager` applied?
- [ ] Does this change log anything? If yes: are secrets, tokens, API keys, and passwords excluded from logs?
- [ ] Does this change handle API keys or tokens? If yes: are they stored with AES-256-GCM encryption?
- [ ] Does this change affect authentication or session management? If yes: security review required.
- [ ] Does this change expose data to the frontend? If yes: is sensitive data (passwords, tokens, keys) excluded?
- [ ] Does this change introduce a new env variable with a secret value? If yes: is it in `.env.example` as a placeholder?

---

## Section 13: Performance Implications Checklist

- [ ] Does this add a new database query? If yes: is it indexed? What is the worst-case row count?
- [ ] Does this add a loop over database results? If yes: is the result set bounded (`.max()` on the Zod array)?
- [ ] Does this add a call to Ollama? If yes: is there a timeout configured (`OLLAMA_ROUTER_TIMEOUT_MS`)?
- [ ] Does this add a call to an external cloud provider (Anthropic, OpenAI, Gemini)? If yes: is there a circuit breaker?
- [ ] Does this add a new TanStack Query call? If yes: is the query key specific enough to avoid over-fetching?
- [ ] Does this change affect the context assembly pipeline? If yes: has token budget impact been assessed?
- [ ] Does this change affect replay batch processing? If yes: has N+1 query risk been checked?
- [ ] Does this change affect the routing pipeline? If yes: has latency budget been preserved (target < 500ms)?

---

## Section 14: Observability Implications Checklist

- [ ] Will failures in this code path be logged? At what level (warn vs. error)?
- [ ] Will the new endpoint emit an audit event? If yes: which `AuditLog` action?
- [ ] Will new database writes be observable via the audit log in `claw-audit-service`?
- [ ] Is there a way to tell from logs alone whether this feature is working or broken in production?
- [ ] If this fails silently, is there any monitoring signal that would catch it?
- [ ] Does this new flow produce metrics or structured log fields useful for debugging?

---

## Section 15: Planning Review

Before implementation begins, the plan must be reviewed.

**Reviewer:** Another engineer or the senior engineer on the team. In an AI-agent workflow, the AI agent must self-review by re-reading the complete plan and confirming all sections are complete.

**Review questions:**

1. Is the brief accurate and complete?
2. Is any impacted area missing from the map?
3. Are the risks realistic and mitigated?
4. Are the acceptance criteria independently testable?
5. Is the regression scope sufficient?
6. Is any dependency not captured?
7. Is the scope too large to implement and test in one work item? (If yes, split it.)

**Scope limit rule:** If the impacted-area map touches more than 5 backend services, more than 8 frontend files, or more than 2 database schemas in a single work item — consider splitting. Larger changes have exponentially higher regression risk and harder-to-review PRs.

---

## Abridged Planning for Hotfixes

Even hotfixes require planning. The abridged version takes 5–10 minutes and covers:

1. **Brief**: What is the bug? What is the immediate user impact?
2. **Root cause**: What line(s) of code caused this? Is the root cause confirmed, not assumed?
3. **Minimal impacted area**: What is the smallest change that fixes the root cause without introducing new risk?
4. **Regression risk**: What existing tests cover the affected code path? Will they catch a regression?
5. **Minimum gates**: TypeScript=0, lint=0, affected unit tests pass, targeted API test confirms fix.
6. **Post-hotfix cleanup**: What follow-up work is required after the hotfix? (additional tests, docs, refactor)

Hotfixes that fail the abridged plan are not ready to deploy. Production pressure does not override engineering discipline.
