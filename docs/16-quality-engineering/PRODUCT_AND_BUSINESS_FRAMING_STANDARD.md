# Product and Business Framing Standard

> Every feature must solve a real user problem before implementation begins.
> Technically correct code that solves the wrong problem is waste.
> This phase ensures the right thing is built before ensuring it is built right.

---

## Purpose and Philosophy

ClawAI is a local-first, privacy-first AI orchestration platform for operators who need production-grade AI routing without sending sensitive data to the cloud. Every feature delivered must serve that mission concretely. This document defines the framing phase: the work that establishes _why_ a feature exists, _who_ it serves, _what success looks like from a product perspective_, and _what is acceptable to ship_.

### Why This Phase Cannot Be Skipped

Engineering teams that skip business framing build features that:

- Technically fulfill a ticket description but miss the underlying user need.
- Solve a problem the user does not actually have.
- Ship without a clear "done" definition, causing repeated rework cycles.
- Produce a technically correct result that fails UAT because no one defined what passing looked like.
- Optimize for the wrong metric (e.g., routing accuracy when the user actually cares about latency).

In ClawAI specifically: operators using the Routing Replay Lab do not care about confidence scores in the abstract — they care about whether regressions are identified before they affect live traffic. A feature that shows confidence deltas without flagging which changes are actionable is technically complete but productively useless.

---

## When This Phase Is Required

| Work Type                               | Business Framing Required?            |
| --------------------------------------- | ------------------------------------- |
| New user-facing feature                 | Yes — full framing                    |
| New API endpoint used by the frontend   | Yes — full framing                    |
| Bug fix affecting user-visible behavior | Yes — Section 3 + 6 + 7               |
| Internal refactor (no UX change)        | Yes — Section 2 only                  |
| Infrastructure change (Docker, Nginx)   | Yes — Section 7 only                  |
| i18n addition for existing feature      | Yes — Section 5 only (UX quality bar) |
| New backend-only API (no frontend yet)  | Yes — Section 2 + 4 + 6               |

---

## Section 1: Business Driver

State in one paragraph why this feature is being built now. What business event, user complaint, operator request, or product vision milestone is driving it?

**Format:**

```
Business Driver: [One paragraph. Avoid technical language. Write as if explaining to a non-engineer.]
```

**Examples:**

```
Business Driver: Operators running overnight routing experiments need to know whether routing
quality improved or degraded between configuration changes. Currently they must manually inspect
individual routing decisions, which takes hours and produces no summary. The Replay Lab run
history and comparison features eliminate this manual review cycle and make routing quality
observable at scale.
```

```
Business Driver: Operators processing sensitive legal, medical, or financial documents cannot
use cloud AI providers under their data governance policies. The LOCAL_ONLY and PRIVACY_FIRST
routing modes exist to guarantee that data never leaves the operator's infrastructure. Without
reliable local routing, these operators cannot use ClawAI at all.
```

```
Business Driver: Operators want to review downloaded models, configure which model handles
which task type, and manage storage usage — all from a single UI. The Model Catalog page
serves this need and reduces the friction of setting up a new ClawAI deployment.
```

---

## Section 2: User Problem Statement

Describe the user's problem from their perspective. This is not a technical description. It is the human experience of the pain this feature addresses.

**Format:**

```
User: [Who is the user? Role + context.]
Pain: [What problem are they experiencing? What is the friction, failure, or gap?]
Outcome: [What would success feel like for them after this feature ships?]
```

**Examples:**

```
User:    An operator deploying ClawAI for a healthcare client with HIPAA constraints.
Pain:    They cannot verify at a glance whether their routing configuration is keeping
         patient-related queries local. They must manually inspect individual decisions
         in the routing history table, one by one.
Outcome: After the feature ships, they can run a 100-decision replay in one click,
         see a summary showing how many decisions changed, and immediately identify
         any decisions that moved from local to cloud — a critical regression indicator.
```

```
User:    An operator who has downloaded qwen2.5-coder:32b for code tasks and wants it
         automatically selected when a user asks a coding question.
Pain:    The AUTO routing mode does not know the operator's preferred model for coding.
         Every coding query goes to Anthropic/claude-sonnet-4 by default, generating
         cloud costs when a perfectly capable local model is installed.
Outcome: After the feature ships, the operator assigns LOCAL_CODING role to qwen2.5-coder:32b
         in the Model Catalog UI. Coding queries immediately start routing locally.
```

---

## Section 3: Business Problem Statement

State the business impact of NOT shipping this feature. This is the business case in one paragraph.

**Examples:**

```
Without the Replay Lab run comparison feature, operators have no systematic way to measure
routing quality changes between configuration iterations. They either run experiments blindly
(accepting unknown regressions) or halt experimentation entirely (losing the benefit of
iterative improvement). Either outcome reduces the platform's value to operator deployments
that rely on routing accuracy as a core business requirement.
```

```
Without reliable LOCAL_ONLY routing enforcement, operators in regulated industries (healthcare,
legal, finance, government) cannot deploy ClawAI in compliance with their data governance
policies. This is not a nice-to-have — it is a deployment blocker for a significant segment
of target operators.
```

---

## Section 4: Success Metrics

Define how success is measured. Metrics must be quantifiable and observable after ship.

| Metric             | Measurement Method    | Target                  |
| ------------------ | --------------------- | ----------------------- |
| [What is measured] | [How is it measured?] | [What value = success?] |

**Completed example (Replay Lab pagination):**

| Metric                             | Measurement Method                              | Target                       |
| ---------------------------------- | ----------------------------------------------- | ---------------------------- |
| Operator can navigate >20 runs     | UI test: navigate to page 2 and confirm results | Pass                         |
| Page load time for runs list       | Browser DevTools Network tab: TTFB for runs API | < 500ms for page 1           |
| No API over-fetching               | Browser DevTools: count API calls on page load  | Exactly 1 call for runs list |
| Zero pagination-related 500 errors | Service logs during 1 week of usage             | 0 errors                     |

**Completed example (LOCAL_ONLY routing mode):**

| Metric                                      | Measurement Method                               | Target                         |
| ------------------------------------------- | ------------------------------------------------ | ------------------------------ |
| Privacy-flagged queries never reach cloud   | Replay 50 privacy queries; count cloud decisions | 0 cloud decisions              |
| Routing decision latency in LOCAL_ONLY mode | Timing in routing service logs                   | < 200ms for heuristic routing  |
| Operator can confirm LOCAL_ONLY is active   | UI: routing transparency badge shows "Local"     | Badge visible on all decisions |

---

## Section 5: Product-Perspective "Done" Definition

Engineering "done" (tests pass, code merged) is not product "done." Define what done means from the user's perspective.

**Format:**

```
Done means:
1. [User can do X]
2. [User can see Y]
3. [User is informed about Z]
4. [User is protected from W]
```

**Completed example (Replay Lab run comparison):**

```
Done means:
1. An operator can select any two saved replay runs from the history tab and click "Compare."
2. A comparison panel shows side-by-side: run summaries, confidence delta, suspicious count
   delta, improvement score delta, and label breakdown delta.
3. The comparison clearly indicates whether the newer run is better or worse than the older run
   ("Improved" / "Regressed" indicator).
4. The operator is not shown raw JSON — all delta values are formatted as human-readable labels
   with change arrows (+/-).
5. The comparison loads within 2 seconds for runs of up to 500 decisions each.
```

---

## Section 6: Product Behavior Specification

### 6.1 Expected User-Visible States

Every user-facing feature must handle all of these states. Missing any of them is a defect, not a "future enhancement."

| State            | What the User Sees                                             | ClawAI Implementation Guidance                                             |
| ---------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **Loading**      | Skeleton loader or spinner                                     | Use shadcn/ui `Skeleton` component; never show raw empty space             |
| **Empty**        | Informative empty state with next-action guidance              | Never show an empty table with no message; explain why it's empty          |
| **Success**      | Data rendered, interactions available                          | Confirm via TanStack Query `isSuccess` state, not lack of error            |
| **Error**        | Human-readable error message with recovery action              | Show error boundary or inline error; never show raw API error JSON to user |
| **Partial data** | Degraded state with indicator (e.g., one provider unavailable) | Show what's available; indicate what's missing                             |
| **Stale**        | Refetch indicator if data is more than N seconds old           | TanStack Query `staleTime` must be configured deliberately                 |

**Completed example (Replay Lab runs tab states):**

| State   | User Sees                                                                               |
| ------- | --------------------------------------------------------------------------------------- |
| Loading | Skeleton rows in the runs table (3 placeholder rows)                                    |
| Empty   | "No saved runs yet. Run a replay and enable 'Save Run' to create history." + Run button |
| Success | Table of runs with name, date, decision count, changed count, suspicious count          |
| Error   | "Failed to load runs. Check that the routing service is running." + Retry button        |

### 6.2 UX Quality Bar

"Production-grade" for ClawAI means meeting all of these bars:

- **Responsive:** Works on desktop (1440px), laptop (1280px), and tablet (768px). The Replay Lab is operator-only, so mobile is not required.
- **Dark mode:** All new components use CSS variable-based colors (`text-foreground`, `bg-card`, `border-border`). Zero hard-coded colors.
- **RTL support:** Arabic locale (`ar`) must render correctly in RTL layout. Use Tailwind's `rtl:` prefix only when directional layout is needed.
- **Keyboard accessible:** All interactive elements reachable by Tab; activated by Enter or Space.
- **Error recovery:** Every error state offers a concrete next action (retry, navigate back, contact admin).
- **No flash of unstyled content:** Loading states must render immediately, not after a JavaScript paint.
- **No infinite loading:** All loading states have a maximum duration. If the API does not respond within 30 seconds, show an error state.

### 6.3 Client Expectation Level

Classify the feature by its audience:

| Audience            | Expectation                                                        | Impact If Broken                                           |
| ------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- |
| **Internal only**   | Operators and admins using ClawAI for their own infra management   | Operations disrupted; no client impact                     |
| **Operator-facing** | Feature visible and used directly by the operator deploying ClawAI | Operator loses trust; may halt deployment                  |
| **Client-facing**   | Feature visible to end users of the operator's ClawAI deployment   | End-user experience degraded; client complaint to operator |

All routing lab features (Replay Lab, Policy Editor, Decision History) are **operator-facing**. The chat interface, model selector, and file attachment are **client-facing**. The admin panel, audit logs, and observability dashboards are **internal/operator-facing**.

**Impact of this classification:** Client-facing features must pass a full UAT including non-technical user simulation (see `CLIENT_ACCEPTANCE_TESTING_STANDARD.md`). Operator-facing features pass operator-level UAT. Internal features pass engineer-level UAT.

---

## Section 7: UAT Checklist Seed

Produce the initial list of user scenarios that UAT must cover. These are written from the user's perspective, not the engineer's.

**Format:**

```
UAT-N: [As an operator/user, I can/cannot do X, and the result is Y.]
```

**Completed example (Replay Lab run comparison):**

```
UAT-1: As an operator, I can select two saved runs from the history tab and see a comparison
       without navigating away from the page.

UAT-2: As an operator, I can immediately tell from the comparison whether the newer run
       produced better or worse routing outcomes.

UAT-3: As an operator, if I select a run that had 0 decisions replayed, the comparison
       handles it gracefully without crashing or showing NaN/undefined.

UAT-4: As an operator, the comparison page is readable in dark mode without any contrast issues.

UAT-5: As an operator using the Arabic locale, the comparison panel renders correctly in RTL.

UAT-6: As an operator, if the comparison API fails, I see an error message — not a blank panel.
```

---

## Section 8: Failure State Matrix

Define which failure states are acceptable (graceful degradation) and which are unacceptable (blockers).

### Acceptable Failures (Graceful Degradation)

These failures are acceptable if the user is informed and a recovery path exists:

| Failure Scenario                           | Acceptable Response                                               |
| ------------------------------------------ | ----------------------------------------------------------------- |
| Replay run list API is slow (> 2s)         | Show loading skeleton; do not block the rest of the page          |
| One routing provider is down during replay | Skip that decision's re-routing; report as "provider_unavailable" |
| Ollama is offline during replay re-routing | Fall back to heuristic routing; flag affected decisions           |
| Export bundle generation takes > 5s        | Show progress indicator; do not time out the request              |
| i18n translation missing for a new key     | Fallback to English key; do not crash the page                    |

### Unacceptable Failures (Blockers)

These failures block ship and require immediate fixes:

| Failure Scenario                                                  | Why It Is Unacceptable                                      |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| Privacy-flagged query is routed to a cloud provider               | Data governance violation; potential regulatory consequence |
| Replay batch crashes with 500 and returns no results              | Operator loses all work; core feature is non-functional     |
| Saved run data is lost or corrupted after save                    | Data loss; operator cannot reproduce past experiments       |
| New UI component breaks dark mode (white flash or invisible text) | Production quality bar not met; operator visible            |
| Frontend page crashes with React uncaught error (white screen)    | User loses access to the entire portal section              |
| JWT token leak in URL query param or logs                         | Security vulnerability; immediate hotfix required           |

---

## Section 9: Business Acceptance Criteria Format

Business acceptance criteria are written from the product perspective. They are distinct from technical acceptance criteria (which belong in the Planning Standard).

**Format:**

```
BAC-N: [Given a user/operator in situation X, when they do Y, then the outcome is Z
        — observable from the user's perspective without inspecting code or database.]
```

**Completed example (Replay Lab):**

```
BAC-1: Given an operator who has saved 3 replay runs, when they open the History tab,
       they see all 3 runs listed with name, date, and summary statistics — no loading errors.

BAC-2: Given an operator looking at a replay result, when a decision has changed routing,
       they see both the old and new provider/model in the result row — not just a flag.

BAC-3: Given an operator who clicks "Export", when the export completes, they receive a
       downloadable bundle with a ready-to-paste Claude analysis prompt — not raw JSON.

BAC-4: Given an operator using the Arabic locale, when they view the Replay Lab page,
       all labels, table headers, and button text appear in Arabic.
```

---

## Section 10: Tradeoff Allowances

### What Can Be Deferred

The following quality aspects may be deferred to a follow-up work item if explicitly documented:

- Advanced pagination features (cursor-based, sortable columns) when offset-based pagination ships first.
- Mobile responsiveness for operator-only tools (not client-facing).
- Performance optimization beyond the stated targets, if the feature is functional and within 2x the target.
- Additional language support beyond 9 locales already required.
- Analytics or usage tracking instrumentation (does not affect feature correctness).

### What Cannot Be Deferred

The following quality bars cannot be reduced under any circumstances:

- All 9 i18n locales complete before ship. A feature with missing translations is not shipped.
- Privacy routing enforcement. LOCAL_ONLY and PRIVACY_FIRST must never route to cloud. No exceptions.
- Error states for every API-backed component. No page ships with "white screen on error."
- Auth protection on all new endpoints. No endpoint ships without `AuthGuard` and appropriate `@Roles()`.
- Zod validation on all DTOs. No endpoint accepts unvalidated input.
- TypeScript 0 errors. No feature ships with type errors suppressed.
- Unit tests for all new business logic. No function ships without a test.
- Dark mode compliance. No component ships with hard-coded colors.

---

## Section 11: Product Framing Review

Before implementation begins, the product framing must be confirmed by the person responsible for the feature. In an AI-agent workflow, the agent must self-review the framing for internal consistency.

**Review questions:**

1. Does the business driver clearly explain why this is being built now?
2. Is the user problem specific enough to verify a solution against?
3. Are the success metrics measurable — not "users will be happy" but "X metric reaches Y value"?
4. Does the product-perspective "done" definition avoid technical jargon?
5. Are all expected user-visible states defined (loading, empty, error, success, edge cases)?
6. Are the UAT scenarios written from the user's perspective, not the engineer's?
7. Is the audience classification correct (internal / operator / client-facing)?
8. Are the unacceptable failures specific enough to test against?
9. Does anything in the tradeoff allowances contradict a non-negotiable quality bar?

If any question cannot be answered confidently, the framing is incomplete. Do not begin implementation.
