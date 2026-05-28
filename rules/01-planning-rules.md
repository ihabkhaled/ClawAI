# ClawAI — Planning Rules (Phase 0 + 0g)

> MANDATORY before writing a single line of code. No exceptions. Not for bug fixes, not for "quick" changes, not for refactors. Every change.

## Phase 0a — Feature Brief (2 sentences max)

Write a plain-language summary answering:

- What is being built or fixed?
- What user or business problem does it solve?

If you cannot answer both questions in 2 sentences, you do not understand the task. Stop and re-read the requirements.

## Phase 0b — Impacted-Area Map

Before touching any file, enumerate every dimension:

**Backend:**

- Which services (by service name, e.g., `claw-chat-service`)?
- Which DB schemas (Prisma models, MongoDB collections)?
- Which RabbitMQ events (new/changed patterns)?
- Which API endpoints (new/modified/deleted)?
- Which shared packages (`shared-types`, `shared-constants`, `shared-rabbitmq`, `shared-auth`)?

**Frontend:**

- Which pages (`src/app/(portal)/...`)?
- Which components (`src/components/...`)?
- Which hooks (`src/hooks/...`)?
- Which types (`src/types/...`)?
- Which i18n keys (all 9 locales)?

**Infrastructure:**

- Which `.env` variables (added/changed/removed)?
- Which Docker compose files (all 7 if new service)?
- Nginx changes?
- CI changes?
- Which docs in `docs/`?

## Phase 0c — Risk Assessment

For each identified risk, write:

```
Risk: <description>
Likelihood: LOW | MED | HIGH
Impact: LOW | MED | HIGH
Mitigation: <what you will do to prevent or handle it>
```

Common risk categories:

- Data migration (existing records affected by schema change)
- Provider API breakage (external API change or down)
- SSE streaming conflicts (pino-http, nginx buffering)
- Docker networking (container DNS, localhost vs service name)
- RabbitMQ consumer ordering (which service must consume first)
- Frontend polling infinite loop (missing stop condition)

## Phase 0d — Acceptance Criteria

Write numbered, explicit, testable statements. No vague language. Every criterion must be verifiable with a concrete test action.

**Good:**

```
1. POST /api/v1/connectors returns 201 with { id, name, provider, status: "PENDING" }
2. GET /api/v1/connectors/:id returns 404 when connector does not exist for current user
3. Ollama sync returns ≥50 models when ollama.com is reachable
```

**Bad:**

```
1. The connector creation works correctly
2. Error handling is implemented
```

## Phase 0e — Failure Criteria

What must NOT happen. These are tested explicitly in QA scripts.

Examples:

- Original thread messages must NOT be deleted when thread settings are updated
- Connector API keys must NOT appear in API responses or server logs
- Routing decisions must NOT be cached across users
- SSE stream must NOT buffer (nginx must proxy immediately)

## Phase 0f — Test Strategy Seed

Before coding, write a skeleton of test cases:

```
Unit tests:    <which functions/methods>
API tests:     <which endpoints, how many variations>
UI tests:      <which user flows, which states>
Integration:   <which cross-service flows>
Regression:    <which existing features could break>
```

## Phase 0g — Business and Product Framing

1. **Business driver**: Why does this exist? What outcome does it unlock?
2. **User problem**: Who is affected, what pain, what outcome improves?
3. **Success metrics**: How is success measured? (quantifiable)
4. **User-visible states**: List every state the user can see:
   - Loading
   - Empty
   - Success
   - Error
   - Partial (e.g., some models loaded, some failed)
5. **Failure state matrix**: Which failures are graceful degradation vs. blockers?
6. **UAT checklist seed**: At least 3 testable user scenarios
7. **"Done" definition**: Product perspective, not engineering

## Planning Gate Output

All 7 items (0a–0g) must be documented before coding starts. Save to:
`.claude/Integrations/<feature>__PLAN.md`

Format:

```markdown
# Plan: <feature name>

## 0a. Brief

...

## 0b. Impacted Areas

...

## 0c. Risk Assessment

...

## 0d. Acceptance Criteria

...

## 0e. Failure Criteria

...

## 0f. Test Strategy

...

## 0g. Business Framing

...
```

## Anti-Patterns (Never Do These)

- Starting a task with "I'll figure it out as I go"
- Skipping Phase 0 for "small" changes (small changes break large systems)
- Writing acceptance criteria after implementation
- Defining risks after encountering them
- Treating Phase 0g as optional for "technical" changes
