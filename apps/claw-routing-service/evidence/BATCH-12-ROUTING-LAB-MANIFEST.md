# Batch 12 — Cloud Smart Router Lab Evidence (Synthetic Corpus)

Generated: 2026-08-30T08:28:01.063Z

Corpus size: 300 cases.

> **Scope note.** This is the routing lab's first pass: a synthetic corpus run in-process against a real `CloudRouterManager` and `RouterInferenceCoordinatorManager`, with every provider adapter fault-injected deterministically. It is NOT the plan's full evidence programme — 1,000 replay decisions against real history, 100 live provider-fault runs, 100 SSE-disruption runs, and 100 browser runs remain separate future work.

## 1. Category breakdown

| Category       | Cases |
| -------------- | ----- |
| BASELINE       | 252   |
| FAULT_SINGLE   | 15    |
| FAULT_COMPOUND | 15    |
| EDGE_CASE      | 18    |

## 2. Pass / decline breakdown

| Outcome                                     | Cases |
| ------------------------------------------- | ----- |
| Passed                                      | 220   |
| Declined — unavailable (config/eligibility) | 68    |
| Declined — chain exhausted                  | 12    |

**Unavailable declines by reason:**

| Reason                      | Cases |
| --------------------------- | ----- |
| NO_ELIGIBLE_EXECUTION_MODEL | 65    |
| NO_PUBLISHED_CONFIGURATION  | 1     |
| CONFIGURATION_DISABLED      | 1     |
| NO_RUNNABLE_CHAIN_ENTRY     | 1     |

**Chain-exhausted declines by final error code:**

| Code                        | Cases |
| --------------------------- | ----- |
| TIMEOUT                     | 0     |
| RATE_LIMITED                | 0     |
| PROVIDER_5XX                | 1     |
| NETWORK                     | 0     |
| AUTHENTICATION_FAILED       | 0     |
| AUTHORIZATION_FAILED        | 0     |
| MODEL_NOT_FOUND             | 3     |
| MODEL_RETIRED               | 0     |
| CAPABILITY_MISMATCH         | 0     |
| MALFORMED_STRUCTURED_OUTPUT | 0     |
| LOW_CONFIDENCE              | 1     |
| CANCELLED                   | 2     |
| BUDGET_EXCEEDED             | 2     |
| POLICY_BLOCKED              | 2     |
| UNKNOWN                     | 1     |

## 3. Fallback-depth distribution

| Fallback depth | Successes |
| -------------- | --------- |
| 0              | 204       |
| 1              | 2         |
| 2              | 14        |

Successful decisions: 220 · average depth: 0.14 · max depth: 2

## 4. Error-taxonomy distribution

| RouterErrorCode             | Attempts | Observed |
| --------------------------- | -------- | -------- |
| TIMEOUT                     | 3        | yes      |
| RATE_LIMITED                | 2        | yes      |
| PROVIDER_5XX                | 8        | yes      |
| NETWORK                     | 2        | yes      |
| AUTHENTICATION_FAILED       | 1        | yes      |
| AUTHORIZATION_FAILED        | 1        | yes      |
| MODEL_NOT_FOUND             | 13       | yes      |
| MODEL_RETIRED               | 2        | yes      |
| CAPABILITY_MISMATCH         | 2        | yes      |
| MALFORMED_STRUCTURED_OUTPUT | 11       | yes      |
| LOW_CONFIDENCE              | 9        | yes      |
| CANCELLED                   | 2        | yes      |
| BUDGET_EXCEEDED             | 2        | yes      |
| POLICY_BLOCKED              | 2        | yes      |
| UNKNOWN                     | 2        | yes      |

Total attempts: 282 · failed attempts: 62 · distinct codes observed: 15 / 15

## What this proves

- Every one of the 15 `RouterErrorCode` values is reachable and observed at least once.
- Retries, the single bounded structured-output repair, provider-wide skip, model-scope advance, request-scope hard stop, quarantine reporting, and trigger-gated fallback all behave the way `router-inference-coordinator.manager.ts` documents.
- The three config-level decline paths (`NO_PUBLISHED_CONFIGURATION`, `CONFIGURATION_DISABLED`, `NO_RUNNABLE_CHAIN_ENTRY`) and the eligibility decline (`NO_ELIGIBLE_EXECUTION_MODEL`) are each reached explicitly.
- The chain survives a 300-case corpus spanning every privacy class, every domain tag, three prompt-length buckets, and a set of structural content edges without an unhandled exception.

## What this does not prove

- No live provider call was made — every adapter response in this run is scripted.
- No real historical traffic was replayed; the corpus is synthetic and deterministic.
- No SSE, browser, or end-to-end user-facing path was exercised.
- Timing is nominal (10ms per scripted call), so latency-budget interactions near the real deadline are not evidenced by this run.
