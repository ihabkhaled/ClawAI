# ADR-050: Critic as a Sibling Plan Feature of Judge

**Status**: Accepted
**Date**: 2026-05-30
**Deciders**: ClawAI core team

## Context

The Judge & Referee pipeline (v1, ADR-spec'd in
`docs/02-business-product/judge-referee-spec.md`) shipped with a Critic step
that was internally hard-wired:

- The critic model was **auto-picked** by
  `JudgeRefereeManager.selectCriticModel()` from a fixed
  `CRITIC_CLOUD_MODELS` constant (e.g. always Anthropic Sonnet when the
  generator was OpenAI).
- There was **no user-facing control** to pick the critic model or even to
  turn the critic on/off independently of the judge.
- Because the critic was implicitly always-on under `judgeEnabled`, admins
  who wanted to ship Pro-tier *judging* without paying for a second cloud
  LLM call per message couldn't separate the two costs.
- The critic's output was discarded silently when the LLM didn't return
  valid JSON, leaving the UI to guess from an empty `feedback[]` whether
  the critic found nothing or had failed.

User feedback during the 2026-05 compare-mode rollout was direct:
"Why is my critic always Anthropic? I want to use the same model I'm
generating with on a different lane." Plus a Pro plan request:
"Let me sell Judge without Critic."

## Decision

Promote Critic to a **first-class, user-selectable, separately plan-gated**
feature alongside Judge:

1. **New plan feature flag `allowCriticReview`** added to `Plan` (alongside
   `allowJudgeMode`, `allowCompareMode`, `allowResearchMode`, etc.). Each
   plan toggles them independently. The DTO refine enforces
   `criticEnabled ⇒ judgeEnabled` so Critic always feeds Judge.

2. **DTO fields `criticEnabled` + `criticModel`** added to
   `parallelMessageSchema`. `criticEnabled` defaults to `false`;
   `criticModel` MUST be a non-empty string when `criticEnabled=true` (Zod
   superRefine, 400 otherwise).

3. **`resolveCriticTarget(generatorProvider, config)`** replaces the
   hardcoded auto-pick at the head of the critic call. When the user
   supplied a `criticModel`, it is parsed via the same `parseJudgeModel()`
   the Judge step uses (`PROVIDER:model` → connector call;
   plain model name → Ollama local call). The legacy auto-pick stays
   reachable as the fallback when `criticEnabled=false` (a thread-level
   auto-trigger still wants *some* critic).

4. **`parseCriticOutput()` tolerates non-JSON output** by persisting a
   `parseFailed: true` marker into `JudgeRefereeMetadata.criticParseFailed`,
   so the FE renders a distinct "critic output unparseable" state instead
   of inferring it from an empty `feedback[]`. A fixed
   `CRITIC_PARSE_FAILURE_SUMMARY` string is stored as the summary.

5. **`AccessControlService.assertCanSendMessage()`** asserts
   `allowCriticReview` (plus `allowJudgeMode` and `allowCompareMode`)
   BEFORE the manager runs, so a locked plan returns
   `403 MODEL_NOT_ALLOWED_FOR_PLAN` without burning tokens.

6. **FE controls**: `CompareCriticControls` (toggle + model picker, only
   enabled when `allowCriticReview` is true AND the lane has
   `judgeEnabled`), `JudgeReviewCriticSection` (four-way render based on
   `criticRequested × criticParseFailed × criticFeedback.length`).

7. **New permission code `JUDGE_USE`** already covers Judge access in the
   permission catalog; Critic does NOT get its own permission code — plan
   gating + Judge permission is enough, and adding a permission per
   feature flag inflates the catalog without operational benefit.

## Alternatives considered

**Roll Critic into `allowJudgeMode`** (the v1 status quo). Rejected
because admins explicitly asked for Pro-without-Critic packaging — a Pro
plan that pays for one extra LLM call (Judge) but skips a second
(Critic) is a real cost ladder rung. Single-flag gating made that
impossible.

**Add a new `CRITIC_USE` permission** instead of a plan flag. Rejected
because permissions describe **what a role can do**, plan flags describe
**what a plan unlocks for any role on that plan**. Critic is a paid
feature, not an RBAC concept — making it a permission would force every
admin to flip per-role grants when a plan changes, which doesn't compose
with the existing entitlements adapter.

**Hard-pin the critic to a free local Ollama model.** Rejected because
the user feedback was specifically "let me pick the critic model" — a
local-only fallback misses the point. The local-only path is still
preserved when `criticEnabled=false` in `LOCAL_ONLY` routing mode (the
legacy auto-pick returns the local default).

**Throw on critic-parse failure** instead of persisting a `parseFailed`
marker. Rejected because a critic parse failure is not user-facing fatal
— the Judge can still run on the generator output with no critic
feedback. Persisting a marker lets the Judge proceed AND the UI
transparently disclose the failure.

## Consequences

**Positive**
- Admins can ship Judge-only or Judge+Critic plans independently.
- Users pick the critic model that matches their workflow (e.g. fast cheap
  critic on a slow expensive generator).
- The parse-failure marker makes the critic loop observable end-to-end —
  no silent loss of feedback.
- The DTO refinement catches misuse (Critic without Judge, Critic with
  empty model) BEFORE any LLM call, so the failure mode is a fast 400
  instead of a slow 500 with wasted tokens.

**Negative**
- One more plan flag to seed, document, and translate — 9 locales × 1 key
  for `allowCriticReview`.
- Critic model selection is a new control surface, which adds
  test surface area (CompareCriticControls, JudgeReviewCriticSection,
  `resolveCriticTarget` paths).
- The plan-feature catalog and the permission catalog now diverge in
  scope — plans gate features, permissions gate actions. Documented in
  `docs/03-architecture/authorization-rbac.md` and root `CLAUDE.md`.

**Doesn't fix**
- The Critic still runs serially after the generator. Parallelising
  Critic + Judge across lanes would cut p95 by ~30% but is out of scope
  here (deferred to a future "speculative critic" ADR).
- The Critic prompt catalog (`CRITIC_SYSTEM_PROMPTS`) is still a
  hardcoded `Record<string, string>` — admin-editable critic prompts are
  a separate feature.

## Verification

- DTO unit tests cover (a) `criticEnabled=true, judgeEnabled=false` → 400,
  (b) `criticEnabled=true, criticModel=''` → 400, (c) happy path → 200.
- `JudgeRefereeManager` unit tests cover `resolveCriticTarget` user-pick,
  auto-pick fallback, parse-failure marker persistence.
- `AccessControlService` unit test covers the 403 path when
  `allowCriticReview` is locked.
- Compare-mode QA script exercises Critic on/off × model variants against
  a real DB write to `ChatMessage.metadata.judgeReview`.
