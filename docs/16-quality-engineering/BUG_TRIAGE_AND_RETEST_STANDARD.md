# Bug Triage and Retest Standard

## Purpose

This document defines how bugs are reported, classified, prioritized, fixed, retested, and closed in ClawAI. Every bug follows this lifecycle without exception. No bug is closed without a verified retest. No fix ships without a covering test.

---

## Bug Report Structure

Every bug report must contain all of the following fields. Incomplete bug reports are returned to the reporter for completion before triage.

```
Bug ID:           BUG-<sequential number> (e.g., BUG-0147)
Title:            <Short, specific description of the problem>
Severity:         S1 | S2 | S3 | S4
Priority:         P0 | P1 | P2 | P3
Feature Area:     <e.g., Chat, Model Catalog, Connectors, Routing, Memory, Files, Auth, Audit, Logs, Admin, Image Generation, File Generation>
Service(s):       <e.g., claw-chat-service, claw-frontend, claw-ollama-service>
Found In:         <Version/commit hash/branch>
Environment:      <Docker dev | Docker prod | Local dev | CI>

Steps to Reproduce:
  1. <Exact step>
  2. <Exact step>
  3. <Exact step>

Expected Behavior:
  <What should happen>

Actual Behavior:
  <What actually happens>

Screenshots/Logs:
  <Attach screenshots, browser console output, Docker logs>

Root Cause Analysis:
  <Filled by developer after investigation>

Assigned To:       <Name or unassigned>
Status:            Open | In Progress | Fixed | Verified | Closed | Reopened
```

### Title Guidelines

Good titles are specific and searchable:

| Bad Title            | Good Title                                                                           |
| -------------------- | ------------------------------------------------------------------------------------ |
| Chat is broken       | Chat: AI response not appearing after sending message with file attachment           |
| Model download fails | Model Catalog: download progress bar stuck at 0% for qwen2.5-coder:32b               |
| Login issue          | Auth: login form accepts empty password and returns 500                              |
| Dark mode bug        | Connectors: edit form labels invisible in dark mode (white text on white background) |

---

## Severity Model

Severity describes the impact of the bug on the system and its users. Severity is assigned by the tester and confirmed during triage.

### S1 -- Critical

The system is unusable, data is lost, or security is compromised.

**Indicators:**

- Application crashes or becomes unresponsive for all users.
- Data loss or data corruption (messages, files, configurations permanently lost).
- Security vulnerability (authentication bypass, secret exposure, unauthorized access).
- All users of a feature are affected with no workaround.

**ClawAI examples:**

- JWT token appears in server logs or frontend network response body in plaintext.
- Chat messages are sent to the wrong thread or wrong user.
- Connector API keys are decrypted and displayed in the UI.
- Database migration destroys existing data.
- ClamAV bypass allows malicious file upload.
- RabbitMQ DLQ fills up and events are permanently lost.

### S2 -- Major

A major feature is broken. A workaround may exist but is difficult or unreliable.

**Indicators:**

- A primary workflow is blocked (cannot send messages, cannot create connectors, cannot download models).
- The workaround requires technical knowledge or multiple manual steps.
- Many users are affected.

**ClawAI examples:**

- Chat messages send but AI response never arrives ("AI is thinking..." spins forever).
- Model catalog shows all models as "Not Installed" even though they are installed.
- Routing always falls back to default model regardless of the routing mode selected.
- File upload succeeds but file chunks are not generated (file is unusable in chat context).
- SSE streaming fails in Firefox but works in Chrome.
- i18n translations missing for an entire page in one or more languages.

### S3 -- Minor

A feature is partially broken. A straightforward workaround exists.

**Indicators:**

- A secondary workflow is affected.
- The workaround is simple (e.g., refresh the page, use a different browser).
- Some users are affected under specific conditions.

**ClawAI examples:**

- Routing transparency badge shows "Unknown" instead of the actual confidence score.
- Memory extraction creates duplicate memories (same content, different IDs).
- Audit log entries are missing the `entityId` field for connector events.
- Pagination shows wrong total count but correct page of results.
- Dark mode has a minor color issue on one component (readable but ugly).
- Thread settings modal does not close after saving (data saves correctly, modal stays open).

### S4 -- Cosmetic

Visual imperfections, typos, or minor UX annoyances that do not affect functionality.

**Indicators:**

- The feature works correctly.
- The issue is purely visual or cosmetic.
- No data is affected.

**ClawAI examples:**

- Misaligned icon in the sidebar.
- Typo in a tooltip ("Tempearture" instead of "Temperature").
- Inconsistent spacing between cards on the model catalog page.
- Loading spinner is slightly off-center in a modal.
- Hover state color does not match the design system.
- Unnecessary horizontal scrollbar at exactly 1280px viewport width.

---

## Priority Model

Priority describes the urgency of fixing the bug. Priority is assigned during triage based on severity, user impact, and release timeline.

### P0 -- Blocker

Must fix immediately. Blocks the current release. All other work stops until this is resolved.

**Criteria:**

- Any S1 bug.
- Any bug that blocks testing of other features.
- Any bug that causes data loss in production.
- Any security vulnerability.

**Response time:** Fix must begin within 1 hour of triage. Fix must be deployed within 24 hours.

### P1 -- Critical

Must fix in the current sprint. Cannot ship without this fix.

**Criteria:**

- Most S2 bugs.
- S3 bugs on critical-path features (chat, auth, connectors).
- Bugs that affect the demo or client presentation.

**Response time:** Fix must begin within 1 business day. Fix must be deployed before sprint end.

### P2 -- Major

Should fix in the current sprint if capacity allows. Can defer to next sprint with justification.

**Criteria:**

- Remaining S2 bugs with reliable workarounds.
- S3 bugs on secondary features.
- Bugs reported by multiple users.

**Response time:** Fix within 2 sprints.

### P3 -- Minor

Fix when convenient. Will not delay a release.

**Criteria:**

- All S4 bugs.
- S3 bugs with trivial workarounds on rarely-used features.

**Response time:** Fix within the current quarter or backlog.

---

## Severity-Priority Matrix

|                   | P0 (Blocker)            | P1 (Critical)            | P2 (Major)           | P3 (Minor)            |
| ----------------- | ----------------------- | ------------------------ | -------------------- | --------------------- |
| **S1 (Critical)** | Always                  | --                       | --                   | --                    |
| **S2 (Major)**    | If blocks release       | Default                  | If workaround exists | --                    |
| **S3 (Minor)**    | If blocks other testing | If critical-path feature | Default              | If trivial workaround |
| **S4 (Cosmetic)** | --                      | --                       | If demo-visible      | Default               |

---

## Reproduction Standards

### Rule: Every Bug Must Be Reproducible

Before any fix attempt, the developer must reproduce the bug using the exact steps from the bug report. If the bug cannot be reproduced:

1. Ask the reporter for additional context (browser, viewport, user role, data state).
2. Try in all environments (Docker dev, Docker prod, local dev).
3. Try with different user roles (ADMIN, OPERATOR, VIEWER).
4. Check for race conditions by repeating the steps rapidly.
5. Check for state-dependent issues by testing with fresh data vs. existing data.

If the bug is genuinely intermittent, document the reproduction rate (e.g., "reproduces 3 out of 10 attempts") and add logging to capture the conditions when it occurs.

### Reproduction Checklist

Before marking a bug as reproducible:

- [ ] Steps are exact (no "somehow" or "sometimes").
- [ ] Environment is specified (Docker dev, browser, viewport).
- [ ] User role is specified (ADMIN, OPERATOR, VIEWER).
- [ ] Starting state is specified (empty DB, seeded DB, specific data present).
- [ ] The bug occurs every time the steps are followed (or reproduction rate is documented).

---

## Root Cause Categories

When investigating a bug, classify the root cause into one of these categories. This data is used to identify systemic issues and prevent recurring classes of bugs.

| Category              | Description                                                 | ClawAI Example                                                                 |
| --------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Logic Error           | Incorrect business logic in service/manager                 | Routing confidence calculated as negative number                               |
| Missing Validation    | Input not validated by Zod DTO or frontend form             | Chat message accepts empty string content                                      |
| Race Condition        | Timing-dependent behavior between async operations          | Two concurrent model pulls corrupt the pull job state                          |
| Stale State           | UI shows outdated data after a mutation                     | Thread list shows deleted thread until page refresh                            |
| Missing Null Check    | Code assumes a value exists but it can be null/undefined    | Crash when accessing `connector.config.apiKey` on an unconfigured connector    |
| Wrong Enum            | Incorrect enum value used in comparison or routing          | Routing mode `LOCAL_ONLY` compared against string "local_only" instead of enum |
| Missing i18n          | User-facing text is hardcoded instead of using `t()`        | Button label "Download" is not translated in Arabic locale                     |
| Config Error          | Environment variable missing, wrong, or not loaded          | `OLLAMA_BASE_URL` not set in `.env`, service cannot connect to Ollama          |
| Docker/Env Error      | Container fails to start, port conflict, volume mount issue | Chat service fails health check because PostgreSQL container is not ready      |
| Nginx Error           | Route not proxied, wrong upstream, missing SSE headers      | Model download SSE events buffered because `proxy_buffering off` is missing    |
| Dependency Issue      | Third-party library bug or version incompatibility          | Prisma generates wrong SQL for pgvector similarity query                       |
| Missing Event Handler | RabbitMQ event published but no consumer processes it       | `image.generated` event published but audit service has no handler             |
| Schema Mismatch       | Database schema does not match Prisma model or DTO          | Frontend sends `routingMode` as string but backend expects enum                |

---

## Fix Requirements

Every bug fix must meet all of the following requirements before it can be submitted for retest.

### F1: Covering Test

The fix must include at least one new test that:

- Reproduces the original bug (the test would fail without the fix).
- Verifies the fix resolves the issue.
- Prevents regression (if the fix is reverted, the test fails).

**Test location by bug type:**

| Bug Found In           | Test Type                           | Location                                                 |
| ---------------------- | ----------------------------------- | -------------------------------------------------------- |
| Backend service logic  | Unit test (Jest)                    | `apps/<service>/src/modules/<domain>/__tests__/`         |
| Backend DTO validation | Unit test (Jest)                    | `apps/<service>/src/modules/<domain>/__tests__/`         |
| Backend controller     | Integration test (Jest + supertest) | `apps/<service>/src/modules/<domain>/__tests__/`         |
| Frontend component     | Component test (Vitest)             | `apps/claw-frontend/src/components/<feature>/__tests__/` |
| Frontend hook          | Hook test (Vitest)                  | `apps/claw-frontend/src/hooks/<domain>/__tests__/`       |
| Frontend utility       | Unit test (Vitest)                  | `apps/claw-frontend/src/utilities/__tests__/`            |
| End-to-end flow        | E2E test (Playwright)               | `apps/claw-frontend/e2e/`                                |

### F2: Layer-Matched Verification

The fix must be verified through the same layer where the bug was found:

| Bug Layer      | Verification Method                                            |
| -------------- | -------------------------------------------------------------- |
| API response   | Send the same API request, verify correct response             |
| UI rendering   | Perform the same UI interaction, verify correct display        |
| Database state | Query the database after the operation, verify correct records |
| Event handling | Publish the same event, verify consumer processes it correctly |
| Log output     | Trigger the same action, verify log format and content         |

### F3: No Side Effects

The fix must not introduce new issues:

- All existing tests still pass (`npm run test`).
- TypeScript compilation succeeds (`npm run typecheck`).
- ESLint passes (`npm run lint`).
- Production build succeeds (`npm run build`).
- Adjacent features still work (manual spot check).

---

## Retest Rules

### R1: Same Tester Retests

The person who originally found and reported the bug retests the fix. They know the exact conditions and can verify the fix addresses the original problem, not just a similar-looking symptom.

### R2: Exact Steps Retest

The tester follows the exact reproduction steps from the bug report. No shortcuts, no alternative paths. The original steps must now produce the expected behavior.

### R3: Adjacent Feature Check

After verifying the fix, the tester checks related features that might be affected:

| Bug Area      | Adjacent Features to Check                                      |
| ------------- | --------------------------------------------------------------- |
| Chat messages | Thread list, message attachments, routing transparency, polling |
| Connectors    | Connector health, model sync, connector list, connector detail  |
| Model catalog | Download progress, installed models list, model roles           |
| Routing       | Routing decisions, routing replay, routing policies             |
| Auth          | Session management, RBAC on all protected pages, token refresh  |
| Files         | File list, file chunks, file attachments in chat                |
| Memory        | Memory list, context packs, memory extraction                   |
| Audit         | Audit log entries, usage ledger                                 |

### R4: Full Regression for S1/S2

For S1 and S2 bugs, a full regression test is required after the fix:

1. Run the complete automated test suite (`npm run test`).
2. Execute the smoke test checklist (login, send message, create connector, download model, check audit log).
3. Verify all Docker containers are healthy.
4. Verify all health endpoints return healthy.
5. Verify no new console errors in the browser.

### R5: Cross-Browser Retest for UI Bugs

If the bug was found in the UI, retest in all four browsers (Chrome, Firefox, Safari, Edge).

---

## Bug Lifecycle

```
                    +--------+
                    |  Open  |
                    +---+----+
                        |
                   (Assigned)
                        |
                +-------v--------+
                |  In Progress   |
                +-------+--------+
                        |
                    (Fix ready)
                        |
                 +------v------+
                 |    Fixed    |
                 +------+------+
                        |
                   (Retest)
                        |
            +-----------+-----------+
            |                       |
     +------v------+        +------v------+
     |  Verified   |        |  Reopened   |
     +------+------+        +------+------+
            |                       |
     (Regression OK)          (Back to In Progress)
            |
     +------v------+
     |   Closed    |
     +-------------+
```

### Status Definitions

| Status      | Meaning                                     | Who Sets It |
| ----------- | ------------------------------------------- | ----------- |
| Open        | Bug reported, awaiting triage/assignment    | Reporter    |
| In Progress | Developer is actively working on the fix    | Developer   |
| Fixed       | Fix is committed and ready for retest       | Developer   |
| Verified    | Retest passed, fix confirmed working        | Tester      |
| Closed      | Regression passed, bug resolved permanently | Tester      |
| Reopened    | Bug recurred or fix was incomplete          | Tester      |

### Closure Rules

A bug can only be closed when ALL of the following are true:

1. Retest passes using the exact reproduction steps.
2. Adjacent features checked (no side effects).
3. Full regression passes (for S1/S2).
4. Covering test exists and passes.
5. No new bugs introduced by the fix.
6. The fix is merged to the target branch.

### Reopening Rules

A bug is reopened (not a new bug) when:

- The exact same symptoms recur in the same or subsequent release.
- The original reproduction steps produce the bug again.
- The covering test now fails (regression).

When reopening:

1. Add the new evidence (screenshots, logs, steps) to the existing bug report.
2. Note the version/commit where the regression was found.
3. Increase severity by one level if the bug was previously "fixed" (trust erosion).
4. The bug goes back to "In Progress" status.

---

## Triage Process

### When Triage Happens

- Immediately for S1 bugs (within 1 hour).
- Daily for S2-S4 bugs (during standup or dedicated triage session).

### Triage Checklist

For each new bug:

1. [ ] Bug report is complete (all fields filled).
2. [ ] Reproduction steps are verified (triager can reproduce).
3. [ ] Severity is confirmed or adjusted.
4. [ ] Priority is assigned based on severity-priority matrix.
5. [ ] Bug is assigned to the appropriate developer (based on service ownership).
6. [ ] Target fix date is set based on priority.

### Triage Disputes

If the reporter and triager disagree on severity:

- Escalate to the tech lead.
- Default to the higher severity until resolved.
- Document the rationale for the final severity decision.
