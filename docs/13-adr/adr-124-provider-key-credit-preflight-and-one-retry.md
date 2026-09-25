# ADR-124 — Provider-key credit: pre-flight cap, one retry, no provider text

## Status

Accepted — 2026-09-25.

## Context

Production, 2026-09-25, `OPENROUTER/z-ai/glm-5.3` (manual pick, attempt 1/1).
The user saw this as the assistant's reply:

```
⚠️ {"error":{"message":"This request requires more credits, or fewer max_tokens.
You requested up to 31776 tokens, but can only afford 9063. To increase, visit
https://openrouter.ai/workspaces/default/keys/<key hash> and adjust the key's total li...
```

Two problems:

1. **We asked for the model's maximum.** With no thread cap, the streaming body
   applied `computeDefaultMaxTokens(32_768, prompt)` — about 31.7k output tokens
   on every hosted turn. OpenRouter pre-authorizes `max_tokens × output price`
   against the key's remaining credit and refuses the whole request when it does
   not fit. The PAYG hold reserved the same ~31k tokens of the USER's credit for
   a reply that used a few hundred.
2. **The provider's body reached the user.** `ProviderStreamExecutor` threw the
   raw body, truncated to 300 chars. Truncation broke its JSON, so
   `isProviderErrorResponse` (the chain's envelope guard) did not recognise it,
   `buildChainFailureError` passed it through, and `storeErrorResponse` saved it
   as the reply. The buffered path had the same hole one level down:
   `extractHttpErrorMessage` returned the nested `error.message`, URL included.
   The logs carried the key hash too.

Prices for this model are not on `connector_models` in production (0 of 447
OpenRouter rows are priced); the rate card that the PAYG meter uses lives in
routing-service (ADR-079).

## Decision

1. **One classifier for every provider failure.** `toProviderHttpFailure`
   (`chat-service/.../provider-http-failure.utility.ts`) is the only place a
   non-2xx provider response becomes an error — streaming, buffered, tool loop,
   `generateOnce`, ollama/llama.cpp hops. A 402, or a body matching a credit
   pattern (`can only afford`, `insufficient_quota`, `credit_balance`, ...),
   becomes `ProviderCreditExhaustedException`: code `PROVIDER_CREDIT_EXHAUSTED`,
   **HTTP 503**, `messageKey: chat.errors.providerCreditExhausted`, fixed
   English message, and the parsed `affordableOutputTokens`. Anything else keeps
   its code and the provider's sentence only when it has no URL and fits 300
   chars. Logs get `redactProviderText` (URLs → `<url>`, bounded).
2. **Belt and braces at the exits.** `buildChainFailureError` treats any message
   carrying a URL like a provider payload; the fallback-attempt SSE event and
   `ChatMessagesService.handleMessageRoutedFailure` (stored reply + emitted
   error) replace any URL-carrying text with a fixed sentence. The frontend
   renders a stored error reply by its allow-listed `errorMessageKey`/`errorCode`
   in the user's language (13 locales).
3. **503, not 402.** A 402 means the user's PAYG credit and ends the candidate
   chain (`isPaygRefusal`, rule 37 §18). An empty provider KEY says nothing about
   the next provider, so AUTO falls through to it.
4. **Hosted default output budget = 16,384.** `computeDefaultMaxTokensForProvider`
   caps the ctx-derived default for every hosted provider; local runtimes
   (`local-ollama`, `local-llamacpp`, `LLAMACPP`) keep the ctx-derived default.
   16k, not 4k/8k, because reasoning tokens count against the same cap. Explicit
   thread caps, tool-loop/Runtime V2 caps and file generation are unchanged
   (bounded by `HARD_MAX_OUTPUT_TOKENS` = 32,768).
5. **Pre-flight affordability, for presets that declare it.**
   `ConnectorPreset.creditHeadroom` (shared-types) names the key-credit
   endpoints; OpenRouter declares `/key` (`limit_remaining`, `null` = no limit)
   and `/credits` (`total_credits − total_usage`) — the smaller known balance
   binds. `OpenAICompatibleAdapter.getCreditHeadroom()` reads them in parallel
   (2.5 s each); connector-service caches per connector for 60 s (the promise, so
   a burst makes one call) and serves `GET internal/connectors/credit-headroom`
   behind `ServiceTokenGuard`. chat-service's `ProviderCreditHeadroomClient` asks
   only for such presets, prices from routing-service's
   `internal/router-models/costs`, and computes
   `floor((remaining − ceil(input cost)) / output price × 0.9)` in BigInt
   micro-USD. The chokepoint (`applyProviderCreditCap`, both buffered and
   streaming attempts) lowers the cap BEFORE the PAYG hold, so the hold is sized
   to what is sent; below 256 tokens it refuses with PROVIDER_CREDIT_EXHAUSTED —
   no hold, no call.
6. **Fail open for capping.** Unknown balance, unlimited key, unpriced model,
   fallback (pessimistic) rate, or any timeout/error → no cap. The provider still
   enforces its own limit; a guessed cap would refuse answers the key could pay
   for.
7. **One reactive retry.** On `ProviderCreditExhaustedException` with a stated
   N, `withProviderCreditRetry` retries exactly once with
   `min(existing cap, floor(N × 0.9))` (≥ 256). The retry is a distinct paid
   call: its own hold under `<requestId>:credit-retry` (a caller-supplied compare
   hold was already released by the failed attempt). Attachment delivery runs
   once, outside the retry, so a paid vision helper is not repeated. No loop.

## Consequences

- An ordinary hosted turn now pre-authorizes and PAYG-holds half what it did.
- A 402 "can only afford N" usually recovers transparently; when it cannot, the
  user reads one translated sentence and AUTO moves on.
- One extra connector-service hop per OpenRouter turn on a cold 60 s cache (plus
  a routing rate lookup cached 5 min). Other providers pay nothing.
- The cap is only as good as routing-service's price for the model. An
  unpriced/fallback-rated model gets no pre-flight cap — the retry covers it.
- A new provider that pre-authorizes output gets a `creditHeadroom` entry and a
  `ConnectorCreditHeadroomFormat` member plus a parser case — no chat change.

## Related

[rule 37](../../rules/37-payg-credit-integrity.md) §19 ·
[rule 51](../../rules/51-router-candidates-and-model-window-fit.md) §14–15 ·
[runbook-provider-call-rejected](../11-runbooks/runbook-provider-call-rejected.md) ·
[ADR-079](adr-079-auth-model-price-cache.md) · [ADR-117](adr-117-connector-presets-one-registry-generic-adapter.md)
