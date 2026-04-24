# Router Education, Feedback Learning, and Bounded Calibration

## Purpose

This document describes the router education layer added on top of ClawAI's existing routing engine. The goal is to improve future routing decisions using bounded learning signals without ever allowing the router to answer the user directly or silently self-edit application code.

The router remains:

- route-only
- deterministic at safety boundaries
- auditable
- rollbackable
- replay-testable

## Learning Inputs

The education layer consumes five classes of signals:

1. Routing decisions
2. Execution outcomes
3. Message feedback (thumbs up / thumbs down)
4. Judge outcomes and confidence
5. Health and fallback behavior

These signals are combined into freshness-aware model and topic profiles instead of directly changing source code or mutating routing constants.

## New Data Flow

```text
message.created
  -> routing decision stored
  -> message.routed published

message.completed
  -> execution outcome ingestion
  -> routing outcome record upserted
  -> model/topic aggregates recomputed
  -> calibration snapshot versioned

message.feedback_set
  -> thumbs signal ingestion
  -> routing feedback record appended
  -> model/topic aggregates recomputed
  -> calibration snapshot versioned
```

## Storage Model

The router education layer extends `RoutingDecision` and adds four historical intelligence tables:

- `RoutingOutcomeRecord`
- `RoutingFeedbackRecord`
- `RouterModelProfile`
- `RouterTopicProfile`
- `RoutingCalibrationSnapshot`

The design is append-friendly for raw signals and replace-friendly for materialized profiles.

## Bounded Learning Rules

The system is intentionally conservative.

- Freshness matters: newer events count more than stale events.
- Sample size matters: profiles need repeated evidence before they can influence routing.
- Safety rules still dominate: privacy, router-only inventory, missing execution models, and deterministic image/file routing are never overridden by soft learning.
- Degraded infrastructure is discounted: historically strong models are not over-trusted when connector health is poor.
- Learning influences priors, not truth: thumbs down is treated as dissatisfaction evidence, not as proof that a model is universally bad.

## Calibration Strategy

Each model/task-family/topic bucket computes:

- weighted success score
- weighted dissatisfaction score
- judge verified / revised / escalated rates
- fallback success rate
- latency and cost stability
- hallucination-associated risk
- confidence in profile quality

The routing service blends those learned scores into the original decision with a bounded calibration factor. If a learned profile is clearly better and sufficiently reliable, the router may upgrade the suggested route. If evidence is weak, the original route stays in place.

## Prompt Education

`PromptBuilderManager` now appends a router education snapshot that summarizes:

- strongest model per task family
- caution models with repeated dissatisfaction
- ambiguous task families that should prefer stronger general reasoning or search-capable routes

This keeps the router aware of historical performance without replacing the hard safety logic already implemented in the routing pipeline.

## No-Model / Router-Only Safety

The education layer does not weaken the route-only contract.

- Router-tagged models are never treated as execution models.
- If no healthy execution models exist, the system must return a structured no-execution-model issue.
- Learned priors never fabricate providers, models, or execution paths.

## Observability

Operators can inspect the learned state through three endpoints:

- `GET /routing/education/snapshot`
- `GET /routing/education/model-profiles`
- `GET /routing/education/topic-profiles`

Together with replay runs and routing decisions, these endpoints provide an end-to-end trail from decision to outcome to recalibrated hint.

## Release Gates

Do not release router-education changes unless all of the following are true:

- feedback events are persisted and observable
- execution outcomes are ingested
- learned priors remain bounded and explainable
- replay results show no material regression
- router-only safety still holds
- file and image routing still prefer correct execution paths
- docs and QA evidence are updated
