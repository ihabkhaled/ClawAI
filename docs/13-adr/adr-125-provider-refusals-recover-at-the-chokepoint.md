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
   `top_provider.max_completion_tokens`, Groq `max_completion_tokens`) and
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
   (in-process, per replica): an account-wide exhaustion opens the provider for
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
- Breaker state is per replica and lost on restart — bounded, and nothing
  fails when Redis is slow. It is visible only in logs
  (`recordOutcome: … skipping it`); no admin page yet.
- Gemini's native `outputTokenLimit` and Ollama `show` are not read at sync yet;
  their ceilings are learned from the first refusal.
- The Ollama Cloud crawl-retrieval tool loop bypasses the chokepoint and so
  gets neither the pre-clamp nor the retry.

## Related

[rule 51](../../rules/51-router-candidates-and-model-window-fit.md) §16 ·
[rule 37](../../rules/37-payg-credit-integrity.md) §19 ·
[runbook-provider-call-rejected](../11-runbooks/runbook-provider-call-rejected.md)
