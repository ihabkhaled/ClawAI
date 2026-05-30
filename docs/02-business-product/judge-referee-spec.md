# Judge-and-Referee Layer — Feature Specification

## Overview

A generator-critic-judge pipeline that adds AI-powered quality verification to responses. One model generates an answer, a different model critiques it, and a fast local judge decides to accept, revise, or escalate. Applied automatically for high-stakes categories (coding, security, medical, legal, finance) or enabled per-thread.

## Business Value

- **Code quality**: Catches syntax errors, missing edge cases, security vulnerabilities before delivery
- **Compliance assurance**: Verifies medical/legal/financial responses for accuracy and appropriate disclaimers
- **Transparent verification**: Users see "Verified" badge, building trust in AI outputs
- **Cost-efficient**: Judge uses free local model (gemma3:4b), only critic adds cost

## How It Works

1. User sends message in a thread (with `judgeEnabled=true` OR auto-triggered by category)
2. Routing selects the primary model (Generator)
3. Generator produces a response
4. Quality check runs (existing: length, repetition, error patterns)
5. If quality passes AND judge-referee is active:
   a. **Critic** (different model than generator) evaluates the response with category-specific prompt
   b. Critic returns structured feedback + score (0-1)
   c. **Judge** (local gemma3:4b) receives response + critic feedback, outputs JSON verdict
   d. Judge decides: `ACCEPT`, `REVISE`, or `ESCALATE`
6. Based on verdict:
   - **ACCEPT**: Deliver response as-is with "Verified" badge
   - **REVISE**: Re-generate with critic feedback incorporated, deliver revised version
   - **ESCALATE**: Skip to next candidate in fallback chain (better model)
7. Metadata stored: critic model, feedback, score, judge decision, reasoning, confidence

The critic and judge prompts are kept intentionally small and category-specific. Compliance-oriented cases use rewrite examples, and operator-facing responses can include executive-summary examples so the judge stays stable on long-tail content.

## Activation

| Trigger           | Mechanism                                                                        |
| ----------------- | -------------------------------------------------------------------------------- |
| Per-thread toggle | `judgeEnabled` boolean on ChatThread (thread settings UI)                        |
| Auto-activation   | Categories: `coding`, `security`, `medical`, `legal`, `finance`, `data-analysis` |
| Auto-detection    | `detectedCategory` from routing service propagated via MESSAGE_ROUTED event      |

## Model Roles

| Role      | Model Selection                                      | Privacy Mode     |
| --------- | ---------------------------------------------------- | ---------------- |
| Generator | Whatever routing selected                            | Unchanged        |
| Critic    | Different provider than generator (avoids self-bias) | Local model only |
| Judge     | Fast local: gemma3:4b (near-zero cost)               | Local model only |

## Critic Evaluation Categories

| Category                           | Focus Areas                                                      |
| ---------------------------------- | ---------------------------------------------------------------- |
| Coding                             | Correctness, completeness, best practices, security, performance |
| Compliance (medical/legal/finance) | Accuracy, completeness, bias, regulation, disclaimers            |
| Generic                            | Relevance, coherence, accuracy, completeness, clarity            |

## Judge Decision Matrix

| Critic Score | Critical Feedback? | Decision |
| ------------ | ------------------ | -------- |
| >= 0.8       | No                 | ACCEPT   |
| >= 0.5       | Fixable issues     | REVISE   |
| < 0.5        | Yes                | ESCALATE |

## Constraints

- Max 1 revision attempt per message (caps at 4 total LLM calls: generator + critic + judge + revision)
- Image and file generation responses skip judge-referee (exempt via `isGenerationResponse()`)
- Privacy modes (LOCAL_ONLY, PRIVACY_FIRST): critic and judge both use local models
- Judge outputs JSON, parsed with fallback to ACCEPT on parse failure

## Frontend

- **Thread Settings**: Switch toggle for "Judge & Referee"
- **Message Bubble Badges**: Green "Verified" (ShieldCheck), Amber "Revised" (RefreshCw), Blue "Escalated" (ArrowUpCircle)
- **Judge Details Panel**: Expandable collapsible showing critic feedback, critic score, judge decision, reasoning, confidence
- **SSE Event**: `judge_evaluating` emitted when pipeline starts

## Architecture

All within `claw-chat-service`:

- `JudgeRefereeManager` (new manager)
- `JudgeDecision` enum in `common/enums/`
- Types in `types/judge-referee.types.ts`
- Constants in `constants/judge-referee.constants.ts`
- Integrated into `ChatExecutionManager.execute()` after quality check

## Tests

24 unit tests covering: `shouldActivate`, `selectCriticModel`, `parseJudgeOutput`, `buildMetadata`

---

## Critic Review (user-selectable critic, 2026-05-30)

The Critic step was promoted from an internal auto-pick to a first-class,
user-selectable feature with its own plan gate.

### Plan-feature gate

`allowCriticReview` is a sibling of `allowJudgeMode`. Both plans toggle
independently:

| Plan flag         | Effect                                          |
| ----------------- | ----------------------------------------------- |
| `allowJudgeMode`  | Unlocks the Judge step (verdict + revise/escalate). |
| `allowCriticReview` | Unlocks the user-supplied Critic model on top of Judge. Pro can ship without Critic if desired. |

DTO refinement enforces `criticEnabled ⇒ judgeEnabled` — the Critic
always feeds the Judge; you cannot run Critic standalone.

### When it fires

On `POST /chat-messages/parallel` (compare mode). Per-lane payload:

```json
{
  "judgeEnabled": true,
  "judgeModel": "anthropic:claude-sonnet-4",
  "criticEnabled": true,
  "criticModel": "openai:gpt-4o-mini"
}
```

If `criticEnabled=true` but `criticModel` is empty/whitespace, the DTO returns
`400 VALIDATION_ERROR` (Zod superRefine).

### Critic prompt + parse contract

The category-specific prompt comes from `CRITIC_SYSTEM_PROMPTS` in
`apps/claw-chat-service/src/modules/chat-messages/constants/judge-referee.constants.ts`.
The expected critic output is:

```json
{ "score": 0.0-1.0, "summary": "<one-line>", "feedback": ["<note>", "..."] }
```

`parseCriticOutput()` tolerates fenced code blocks (` ```json ... ``` `), prose
preamble around a JSON object, and string-only output. When parsing fails it
persists `criticParseFailed: true` and a fixed `CRITIC_PARSE_FAILURE_SUMMARY`
into `JudgeRefereeMetadata` so the UI can render a distinct "critic output
unparseable" state instead of inferring it from an empty `feedback[]`.

### Persistence target

All critic state lives in `ChatMessage.metadata` under the `JudgeRefereeMetadata`
shape (`apps/claw-chat-service/src/modules/chat-messages/types/judge-referee.types.ts`):

| Field               | Source                                                            |
| ------------------- | ----------------------------------------------------------------- |
| `criticModel`       | Resolved by `resolveCriticTarget()` (user pick wins).             |
| `criticFeedback`    | `parseCriticOutput().feedback` (string[]).                        |
| `criticScore`       | `parseCriticOutput().score` (clamped 0-1).                        |
| `criticSummary`     | `parseCriticOutput().summary` or fallback.                        |
| `criticRequested`   | `true` if `criticEnabled` was set in the DTO; `false` otherwise.  |
| `criticParseFailed` | `true` when the model output couldn't be parsed.                  |
| `criticLatencyMs`   | Wall-clock ms of the critic LLM call.                             |

### FE control surface

The compare panel exposes two grouped controls per lane:

- `CompareCriticControls` — toggle + model picker (only enabled when
  `allowCriticReview` is true on the user's plan AND the lane has `judgeEnabled`).
- `JudgeReviewCriticSection` — 4-way render of the critic block in the message:
  not requested / requested-no-feedback / requested-parsed-feedback / requested-parse-failed.
  The render branch is chosen from `criticRequested` × `criticParseFailed` × `criticFeedback.length`.
