# ADR-125 — Provider refusals recover at the chokepoint, for every provider

## Status

Accepted — 2026-09-25. Extends [ADR-124](adr-124-provider-key-credit-preflight-and-one-retry.md).

## Context

Production chat DB, last 14 days — assistant replies that were provider errors:

| Provider     | Count | Body (verbatim start)                                                                                      |
| ------------ | ----- | ---------------------------------------------------------------------------------------------------------- |
| GROQ         | 7     | `` `max_tokens` must be less than or equal to `16384`, the maximum value for `max_tokens` is less than… `` |
| OLLAMA Cloud | 4     | `max_tokens (N) exceeds model's maximum output tokens (M) for model kimi-k3 / glm-5.3`                     |
| OPENROUTER   | 7     | `Provider returned error … <model>:free is temporarily rate-limited upstream. Please retry shortly`        |
| OPENAI       | 2     | `You have no credits remaining` (`insufficient_quota`)                                                     |
| ANTHROPIC    | 3     | `Your credit balance is too low`                                                                           |
| GEMINI       | 1     | `You exceeded your current quota`                                                                          |

Several reached the user as raw JSON. Two writers produced them: the streaming
hop (`⚠️ {…}`, fixed by ADR-124) and the compare / consensus lanes, which stored
`Error: ${error.message}` verbatim (`Error: {"error":…}`).

## Decision

1. **One classifier, four outcomes** (`toProviderHttpFailure`, in this order):
   account-wide credit exhaustion → `ProviderCreditExhaustedException(accountExhausted: true)`;
   per-request credit (402, "can only afford N") → the ADR-124 exception;
   an output-limit refusal → `ProviderOutputLimitException(maxOutputTokens)`
   (Groq "≤ `N`", Ollama "maximum output tokens (M)", OpenAI "supports at most M
   completion tokens", Anthropic "max_tokens: N > M", Gemini "to M (exclusive)"
   → M−1, generic "maximum output tokens is M"; only when the text names the
   output cap, never "maximum context length"); a 429 / "rate limit" →
   `ProviderRateLimitedException`. Rate/output limits keep the caller's code
   (so Runtime V2's transient retry still sees `CLOUD_PROVIDER_UNAVAILABLE`)
   and carry a translated `messageKey` (13 locales).
2. **One retry, three plans** (`withProviderRecovery` + `providerRetryPlan`):
   credit → 90% of N; output limit → the stated ceiling, and remember it;
   rate limit → wait 1.5 s. Always exactly one retry, its own PAYG hold
   (`<requestId>:provider-retry`), no loop.
3. **Remember output ceilings at the data owner.** `connector_models` gains
   `max_output_tokens` (catalog, overwritten by sync: OpenRouter
   `top_provider.max_completion_tokens`, Groq `max_completion_tokens`,
   Gemini native `Model.outputTokenLimit` — addendum below) and
   `learned_max_output_tokens` (+`_at`), written by
   `POST internal/connectors/models/output-limit` (service token) and only
   ever lowered. The models-snapshot publishes the smaller as `maxOutputTokens`;
   chat's `ModelOutputLimitClient` reads it (60 s cache) plus its own
   per-replica learned map, and `applyModelOutputLimit` pre-clamps before the
   PAYG hold — the next request never fails first. routing-service's registry
   sync already ingests the same field.
   Not a routing table: `router_model_registry` has no GROQ/OPENROUTER rows in
   production; `connector_models` has every provider.
4. **Circuit breaker for account exhaustion.** `ProviderCircuitBreakerManager`
   (in-process, per replica at first; shared in Redis since the addendum): an account-wide exhaustion opens the provider for
   10 minutes; the chokepoint then refuses it with `PROVIDER_CREDIT_EXHAUSTED`
   (503) — no hold, no call — so AUTO moves on instantly. Half-open: one probe
   after the window; success closes, another exhaustion re-opens; an abandoned
   probe is retried after another window. Per-request credit (OpenRouter N)
   never trips it — a `:free` model on the same key still works.
5. **Lane errors are sanitized.** Compare and consensus store
   `userFacingErrorText(error)`: our sentence, or a fixed fallback when the
   text is JSON or carries a URL.

## Consequences

- The reported Groq / Ollama output-limit failures recover in-turn and do not
  recur for that model; OpenAI/Anthropic/Gemini credit outages cost one failed
  call per replica per 10 minutes instead of one per turn.
- Breaker state was per replica and lost on restart, visible only in logs.
  Superseded by the breaker addendum below: shared in Redis, admin page on
  `/connectors`, in-memory only as the Redis-down fallback.
- Ollama (local and Cloud) publishes no output ceiling, so its ceiling is
  learned from the first refusal (addendum below). Gemini's is now read at sync.
- The Ollama Cloud crawl-retrieval tool loop bypasses the chokepoint and so
  gets neither the pre-clamp nor the retry.

## Addendum (2026-09-25): the breaker is shared, and admins can see it

**Why.** Prod runs 4 chat-service replicas. With a per-replica Map an
exhausted account was still dialled (and failed) once per replica per window,
probed up to 4 times per half-open, forgotten on every restart, and invisible
to operators.

**Decision.**

- State moves to Redis, the same instance the stream bus and Stop already use.
  `claw:chat:provider-breaker:state:<provider>` holds
  `{openUntil, reason, trippedAt}` with a PX TTL of 3 windows (it fails open:
  a breaker nobody touches expires, it never skips forever);
  `…:probe:<provider>` is the half-open probe, taken with `SET NX PX` inside
  the admission Lua script, so exactly one call probes across the fleet (live
  check against the dev Redis: 4 concurrent admissions → `[2,1,1,1]`);
  `…:index` lists providers for the admin view.
- Every script runs on the fail-fast Redis connection (no offline queue) with
  a 250 ms deadline. On any Redis error the replica answers from its own
  in-memory copy — the pre-addendum behaviour. The breaker never hangs a
  model call.
- An ordinary answered call costs no Redis write; only a probe's (or a
  locally known breaker's) success closes the shared breaker.
- Admin endpoints on chat-service (ADMIN role only):
  `GET /chat-messages/admin/provider-breakers` and
  `DELETE /chat-messages/admin/provider-breakers/:provider`. The `/connectors`
  page renders them for admins ("Skipped providers", 13 locales), joining each
  provider to the admin's connectors of that provider.

**Deviation from the request.** The breaker stays keyed by PROVIDER, not by
connector id: the chokepoint only knows the provider, and account exhaustion
is per provider key. Connector names are resolved in the frontend.

**Consequences.** A `source: MEMORY` listing means Redis was unavailable and
the answering replica reported only itself; the page says so. Restarting
chat-service no longer clears a breaker — use Clear.

## Related

[rule 51](../../rules/51-router-candidates-and-model-window-fit.md) §16 ·
[rule 37](../../rules/37-payg-credit-integrity.md) §19 ·
[runbook-provider-call-rejected](../11-runbooks/runbook-provider-call-rejected.md)

## Addendum (2026-09-25): output ceilings at sync

- **Gemini**: the sync already read Google's native `GET /v1beta/models` for
  `inputTokenLimit`; the same response carries `outputTokenLimit` ("Maximum
  number of output tokens available for this model", ai.google.dev/api/models).
  `GeminiAdapter.fetchNativeLimits` now stores it as `max_output_tokens`. Only a
  positive integer is trusted (`isPositiveInteger`); anything else leaves the
  ceiling unknown.
- **Ollama / Ollama Cloud**: nothing trustworthy to read. `/api/tags` has no
  limits; `/api/show` `model_info` has only `<arch>.context_length` (input);
  a Modelfile `num_predict` is a generation default, not a maximum. Sync leaves
  `max_output_tokens` NULL and the learned-from-refusal path stays the source.
- **Precedence is unchanged**: sync writes only `max_output_tokens` and never the
  learned column; the snapshot publishes `min(catalog, learned)`, so a lower
  learned value is never raised by a resync. A repository spec pins that the
  upsert carries no `learned*` field.
- Providers with an output ceiling at sync: OpenRouter, Groq, Gemini (plus any
  OpenAI-compatible preset whose list reports `max_completion_tokens`).
