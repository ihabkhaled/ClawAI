# Operating Rules — Enforcement Rulebook

## Purpose

These rules exist to prevent the most common failure modes in a complex microservices platform: features that look real but are not, UI that looks functional but is decorative, and systems that look tested but provide false confidence.

Every rule has a short version (for quick reference) and a long version (for understanding why).

---

## Short Version (Quick Reference Card)

```
ANTI-FAKE-FEATURE:     If the backend has it but the UI never calls it, it is fake.
ANTI-DECORATIVE-UI:    If the button exists but clicking it does nothing, it is decorative.
ANTI-HIDDEN-ROUTING:   If the AI picked a model but the user cannot see why, routing is hidden.
ANTI-FAKE-MEMORY:      If memories are stored but never injected into context, memory is fake.
ANTI-FAKE-GROUNDING:   If files are uploaded but never influence AI responses, grounding is fake.
ANTI-USELESS-LOGGING:  If logs exist but cannot trace a request end-to-end, logging is useless.
ANTI-SHALLOW-TESTING:  If tests only cover happy paths, testing is shallow.
```

---

## Rule 1: Anti-Fake-Feature

### Short Version
If a backend endpoint exists but no UI calls it, the feature is fake.

### Long Version
A feature is only real when it is accessible to the user AND produces a visible result. The following patterns indicate a fake feature:

**Detection checklist:**
- [ ] Backend endpoint exists in a controller
- [ ] No frontend service/API client calls that endpoint
- [ ] No UI component renders data from that endpoint
- [ ] The endpoint works when called via curl/Postman but is invisible to the user

**Examples found in Claw:**
- Internal file chunks endpoint (`/internal/files/:id/chunks`) — this is legitimately internal (service-to-service), NOT fake
- Usage ledger data — tracked in audit-service but no admin UI page displays usage charts

**Enforcement:**
- For every new backend endpoint, there MUST be a corresponding frontend call or a documented reason why it is internal-only
- Internal endpoints MUST be clearly labeled (`/internal/*` prefix) and documented
- "Coming soon" features MUST be tracked in a backlog, not left as dead code

---

## Rule 2: Anti-Decorative-UI

### Short Version
If a UI element exists but clicking it does nothing meaningful, it is decorative.

### Long Version
A UI element is decorative when it gives the user the impression of functionality without delivering it. This is worse than a missing feature because it erodes trust.

**Detection checklist:**
- [ ] Button/link exists in the UI
- [ ] Click handler is empty, logs to console, or shows "coming soon" toast
- [ ] No API call is made on interaction
- [ ] No state change occurs that the user can observe
- [ ] Feature appears in navigation but the page is a stub

**Enforcement:**
- Every clickable element MUST trigger a meaningful action or be visually disabled with a tooltip explaining why
- Placeholder pages MUST show "This feature is under development" with an estimated timeline, not an empty layout
- Navigation items for unbuilt features MUST be hidden, not shown as broken links
- If a feature requires multiple steps to work, all steps MUST be implemented or the feature MUST be hidden

---

## Rule 3: Anti-Hidden-Routing

### Short Version
Every AI routing decision must be visible to the user.

### Long Version
When the system chooses which AI model answers a question, the user MUST be able to see and understand that decision. Hidden routing destroys trust because the user cannot verify or correct the system's choice.

**Detection checklist:**
- [ ] The UI shows which model was selected for each message
- [ ] The UI shows WHY that model was selected (routing reason)
- [ ] The user can override the routing decision (manual model selection)
- [ ] The routing decision is logged in the audit trail
- [ ] Stale health data does not cause routing to dead models

**What MUST be visible:**
- Model name and provider in every AI response
- Routing mode (auto, manual, policy-based)
- Routing reason (if auto: why this model was chosen)
- Fallback indicator (if the first-choice model was unavailable)

**Enforcement:**
- Every AI response MUST include model attribution metadata
- The frontend MUST render model attribution for every response
- Routing decisions MUST be auditable via the routing.decision_made event
- Health cache TTL MUST be short enough to avoid routing to unavailable models

---

## Rule 4: Anti-Fake-Memory

### Short Version
If memories are stored but never injected into context, memory is fake.

### Long Version
Memory is only real when it demonstrably changes AI responses. Storing facts about a user in a database is necessary but not sufficient — those facts must be retrieved and injected into the AI prompt for every relevant conversation.

**Detection checklist:**
- [ ] Memory extraction runs after conversations (facts extracted from messages)
- [ ] Extracted memories are stored in the memory-service database
- [ ] During context assembly, relevant memories are fetched from memory-service
- [ ] Fetched memories are included in the system prompt or context window
- [ ] AI responses demonstrably reflect stored memories (testable)

**Signs memory is fake:**
- Memories are extracted and stored but the context assembly step skips memory injection
- Memories are injected but with no relevance filtering (all memories dumped in)
- Memory extraction runs but produces generic/useless facts
- No deduplication — the same fact stored 50 times wastes context window
- No contradiction detection — conflicting facts both injected

**Enforcement:**
- Memory injection MUST be verified by checking the actual prompt sent to the AI model
- Memory relevance MUST be tested: store a specific fact, then ask a question that requires it
- Memory deduplication MUST be active to prevent context window waste
- Memory count/status SHOULD be visible to the user somewhere in the UI

---

## Rule 5: Anti-Fake-File-Grounding

### Short Version
If files are uploaded but never influence AI responses, file grounding is fake.

### Long Version
File grounding is only real when uploaded document content demonstrably changes AI responses. The full pipeline must work: upload, store, chunk, retrieve, inject into context, and influence the response.

**Detection checklist:**
- [ ] File upload works and file is stored on disk
- [ ] File is chunked after upload (ingestion status = COMPLETED)
- [ ] Chat-service retrieves chunks for attached files during context assembly
- [ ] Chunks are included in the prompt sent to the AI model
- [ ] AI response references or uses information from the uploaded file

**Signs file grounding is fake:**
- Files upload successfully but chunks are never created
- Chunks are created but never retrieved during context assembly
- Chunks are retrieved but not included in the AI prompt
- All chunks are dumped into context regardless of relevance (brute force, not intelligent)
- No way for user to verify which file content influenced the response

**Enforcement:**
- File grounding MUST be tested end-to-end: upload a file with unique facts, ask about those facts
- Chunk retrieval MUST be selective (relevance-based, not dump-all)
- File attribution SHOULD be visible in AI responses (e.g., "Based on your uploaded file...")
- File processing status MUST be visible to the user (not just in the database)

---

## Rule 6: Anti-Useless-Logging

### Short Version
If logs exist but cannot be correlated to debug an issue, they are useless.

### Long Version
Logging is only useful when it enables three things: (1) understanding what happened, (2) finding why it happened, and (3) tracing the full request path across services. Logs that are voluminous but uncorrelatable create noise, not insight.

**Detection checklist:**
- [ ] Every log entry includes a correlation ID linking it to the originating request
- [ ] Logs from different services can be joined by correlation ID
- [ ] Error logs include sufficient context to reproduce the issue
- [ ] Audit logs answer "who did what, when, and to what"
- [ ] Logs are queryable without SSH access to the server

**Signs logging is useless:**
- Every service logs independently with no way to correlate across services
- Log messages are generic ("Error occurred", "Request failed") with no context
- Logs are write-only — stored but never queried or reviewed
- No alerting means logs only help AFTER someone notices a problem
- High-volume debug logs drown out important error logs

**Enforcement:**
- Every HTTP request MUST generate a correlation ID propagated to all downstream services
- Error logs MUST include: correlation ID, user ID, service name, error message, stack trace
- Audit logs MUST be queryable by user, action, entity, and time range
- Log retention policies MUST be defined and enforced (TTL indexes)
- At least one person MUST review logs regularly (or alerting MUST exist)

---

## Rule 7: Anti-Shallow-Testing

### Short Version
If tests only cover happy paths, testing is shallow.

### Long Version
Shallow testing creates false confidence. A test suite that only verifies "the function works when inputs are correct" provides no protection against the failures that actually happen in production: invalid inputs, network errors, race conditions, and edge cases.

**Detection checklist:**
- [ ] Tests cover error paths (invalid input, missing data, service unavailable)
- [ ] Tests cover edge cases (empty arrays, null values, maximum lengths)
- [ ] Tests cover authorization (wrong role, expired token, missing auth)
- [ ] Tests verify side effects (events published, audit logged, cache invalidated)
- [ ] Tests run with real dependencies in at least one CI stage

**Signs testing is shallow:**
- Every test follows the pattern: setup happy input -> call function -> assert success
- No test expects an error to be thrown
- No test verifies behavior when a dependency is unavailable
- No test covers authentication/authorization enforcement
- Tests mock everything, testing only the mock wiring, not actual behavior

**Enforcement:**
- Every service MUST have at least one test file (0-test services are unacceptable)
- Every public method MUST have at least one happy-path AND one error-path test
- Test failures MUST block CI (no `|| true`, no `--passWithNoTests` without justification)
- Integration tests MUST exist for critical cross-service flows
- Coverage thresholds MUST be defined and enforced (minimum 60% per service)

---

## Severity Levels

| Level | Meaning | Action Required |
|---|---|---|
| **CRITICAL** | Feature appears to work but silently fails | Fix immediately — user trust at risk |
| **HIGH** | Feature partially works but has significant gaps | Fix before any external deployment |
| **MEDIUM** | Feature works but is suboptimal | Fix in next sprint |
| **LOW** | Feature works but could be improved | Add to backlog |

### Classification by Rule

| Rule | CRITICAL | HIGH | MEDIUM |
|---|---|---|---|
| Anti-Fake-Feature | Endpoint exists, UI shows it, but data is wrong | Endpoint exists, no UI | Endpoint exists, documented as internal |
| Anti-Decorative-UI | Button does nothing silently | Button shows error | Button is disabled without explanation |
| Anti-Hidden-Routing | Wrong model used, no indication | Model shown but reason hidden | Model and reason shown but not prominent |
| Anti-Fake-Memory | Memories never injected | Memories injected but irrelevant | Memories injected, could be more relevant |
| Anti-Fake-Grounding | Files never influence responses | File content injected but all-or-nothing | File content injected, needs relevance filtering |
| Anti-Useless-Logging | No correlation across services | Correlation exists, no alerting | Full observability |
| Anti-Shallow-Testing | 0 tests in a service | Only happy paths tested | Good coverage, missing edge cases |

---

## Applying These Rules

### During Code Review
For every PR, check:
1. Does this change introduce a new endpoint? If yes, where is the UI? (Rule 1)
2. Does this change add a new UI element? If yes, what does it do? (Rule 2)
3. Does this change affect routing? If yes, is the decision visible? (Rule 3)
4. Does this change affect memory? If yes, is it injected into context? (Rule 4)
5. Does this change affect files? If yes, does it influence AI responses? (Rule 5)
6. Does this change add logging? If yes, is it correlatable? (Rule 6)
7. Does this change include tests? If yes, do they cover error paths? (Rule 7)

### During Audits
Run each rule's detection checklist against the current codebase. Any unchecked item is a finding that must be classified by severity and added to the fix backlog.

### During Release
All CRITICAL and HIGH items from all rules must be resolved. MEDIUM items must be documented as known limitations. LOW items are acceptable technical debt.
