# Runbook — "Every available AI provider failed to respond"

## When this applies

A chat turn ends with:

```
⚠️ Every available AI provider failed to respond (tried <PROVIDER>/<model>).
Please try again shortly.
```

The message is deliberately vague to the user and says nothing about cause. It
covers several quite different situations, and the first step is always to find
out which one you have — never to retry or to swap models on a hunch. Two of
them are per-_model_, not per-provider, so "OpenAI is down" is usually wrong.

## Diagnose in one step

`ChatExecutionManager` logs the provider's own response body before it gives up:

```bash
docker logs claw-chat-service --since 30m 2>&1 | grep -A 6 "failed (attempt"
```

That WARN line carries the provider error (every URL replaced by `<url>` since
ADR-124; the full body is in the `returned status=... body=...` line logged by
the hop just before it). Everything below is read off it. If it says nothing useful, widen with `grep -B 2 -A 10 "returned 4"` to see
the status the HTTP client logged.

## The three causes

### 1. A parameter the model no longer accepts

```
{"error":{"message":"`temperature` is deprecated for this model."}}
```

The newer Claude models — Fable 5, Mythos 5, Opus 5, Opus 4.8, Opus 4.7 and
Sonnet 5 — **removed sampling controls**. `temperature`, `top_p` and `top_k` are
not ignored on them; the request is rejected with HTTP 400. A thread that has
any temperature set therefore fails _every_ turn on those models while the same
thread answers normally on Opus 4.6, Sonnet 4.6 or anything in the 4.5
generation — which is what makes it look like "the provider is down".

The request builders now omit sampling for those models. The list lives in
[`anthropic-sampling.constants.ts`](../../apps/claw-chat-service/src/modules/chat-messages/constants/anthropic-sampling.constants.ts);
**add a model there when Anthropic ships one that drops sampling**, or that
model breaks the moment someone sets a temperature on a thread.

A dated snapshot (`-YYYYMMDD`) is normalised before the check, so only the
undated id needs listing.

### 1b. A parameter the model renamed

```
Unsupported parameter: 'max_tokens' is not supported with this model.
Use 'max_completion_tokens' instead.
```

```
Unsupported value: 'temperature' does not support 0.7 with this model.
Only the default (1) value is supported.
```

OpenAI's **reasoning families** — `gpt-5*`, `o1*`, `o3*`, `o4*` — renamed the
output cap to `max_completion_tokens` and froze `temperature` at its default.
Both are 400s. Every request carries an output cap, so these models failed on
_every_ turn, while `gpt-4o` on the same thread answered normally.

The builder now picks the field per model and drops a non-default temperature,
driven by
[`openai-request-shape.constants.ts`](../../apps/claw-chat-service/src/modules/chat-messages/constants/openai-request-shape.constants.ts).
That rule is a **prefix match**, deliberately narrow: the same builder serves
DeepSeek, Grok and Anthropic's OpenAI-compatible route, and those providers
still take `max_tokens`. Widening it would break them.

Note `gpt-4o` accepts `max_completion_tokens` too — so a green test against one
model proves nothing about the other direction. Both halves are asserted.

**The trap that made this survive a correct fix.** Choosing the field in the
request builder is not enough. The _streaming_ body — the path production
actually uses — then applied a computed default with `body.max_tokens ??= …`,
saw `max_tokens` unset (the cap had gone to `max_completion_tokens`), and put
the rejected field straight back. The deployed build genuinely contained the
fix and the model still 400'd.

Every write of an output cap now goes through `setOutputCap` / `outputCapField`.
**Never assign `max_tokens` directly** — that is exactly how the field came
back. If you are chasing this again, check the streaming path before concluding
the fix is not deployed:

```bash
docker exec <chat-replica> sh -lc "grep -c max_completion_tokens   dist/modules/chat-messages/managers/chat-execution.manager.js"
```

Under a multi-replica deployment, check the replica that served the request —
container names are `claw-chat-service-<n>`, and `claw-chat-service` no longer
exists as a single container.

### 2. Billing, not code

```
{"error":{"code":"credit_balance_exhausted",
          "message":"You have no credits remaining. Add credits to continue..."}}
```

HTTP **429** with `insufficient_quota` / `credit_balance_exhausted` means the
provider account is out of credit. Nothing in this repo can fix it — top up the
account. Note 429 here does **not** mean rate limiting, so backing off and
retrying will never clear it.

Since ADR-125 (OpenAI "no credits remaining", Anthropic "credit balance is too
low", Gemini "exceeded your current quota", DeepSeek "Insufficient Balance",
xAI "spending limit"): the user reads the translated
`PROVIDER_CREDIT_EXHAUSTED` sentence, AUTO moves to the next provider, and the
provider is **skipped for 10 minutes** per replica (then one probe):

```bash
docker logs claw-chat-service-1 --since 30m 2>&1 | grep -E "recordOutcome|breaker open|half-open"
```

After topping up, the breaker closes on the first successful probe (≤10 min);
restarting chat-service clears it at once.

### 2c. Output-length refusals (ADR-125)

```
`max_tokens` must be less than or equal to `16384` ...            (Groq)
max_tokens (32768) exceeds model's maximum output tokens (16384)  (Ollama Cloud)
This model supports at most 16384 completion tokens               (OpenAI)
max_tokens: 32768 > 8192, which is the maximum allowed ...        (Anthropic)
```

Retried once at the stated ceiling (`withProviderRecovery: ... refused the
requested output length — retrying once with an output cap of N`) and written
to `connector_models.learned_max_output_tokens`; later turns pre-clamp
(`applyModelOutputLimit: ... (model ceiling)`). Check what a model has learned:

```sql
-- claw-pg-connector
SELECT provider, model_key, max_output_tokens, learned_max_output_tokens, learned_max_output_at
FROM connector_models WHERE learned_max_output_tokens IS NOT NULL ORDER BY learned_max_output_at DESC;
```

A wrongly learned value only ever lowers a cap; clear it with
`UPDATE connector_models SET learned_max_output_tokens = NULL WHERE ...`.

### 2d. Upstream rate limits (ADR-125)

OpenRouter `:free` models: "temporarily rate-limited upstream". Any 429 that is
not a credit message gets one retry after 1.5 s, then the translated
`chat.errors.providerRateLimited` sentence; AUTO moves on.

### 2b. OpenRouter: "can only afford N" (the KEY's credit, ADR-124)

```
{"error":{"message":"This request requires more credits, or fewer max_tokens.
You requested up to 31776 tokens, but can only afford 9063. To increase, visit
https://openrouter.ai/.../keys/<hash> ...","code":402}}
```

OpenRouter pre-authorizes `max_tokens × output price` against the key's
remaining credit (its own limit, or the account balance). Since 2026-09-25:

- The user reads only the translated `chat.errors.providerCreditExhausted`
  sentence (code `PROVIDER_CREDIT_EXHAUSTED`, HTTP 503). If they ever see raw
  JSON or a URL, the classifier was bypassed — find the hop that throws without
  `toProviderHttpFailure`.
- Hosted turns ask for at most 16,384 output tokens by default, not ~31.7k.
- Before the call, chat caps `max_tokens` to what the key can afford (logged
  `applyProviderCreditCap: ... output cap A -> B`). A 402 that still happens is
  retried once at 90% of N (`withProviderRecovery: ... retrying once`).
- `applyProviderCreditCap: ... refused before the call` = the key cannot pay
  for 256 tokens. Top the key up or raise its limit — nothing in the repo fixes it.

Check what the key can spend (connector-service caches 60 s):

```bash
docker exec claw-chat-service-1 sh -lc 'wget -qO- --header "Authorization: Service $INTER_SERVICE_AUTH_TOKEN" \
  "$CONNECTOR_SERVICE_URL/api/v1/internal/connectors/credit-headroom?provider=OPENROUTER"'
# {"known":true,"remainingMicroUsd":21300}   known=false → no pre-flight cap (fail open)
```

No pre-flight cap is applied when the model has no real price on routing's
rate card (unpriced or fallback rate) — only the retry protects those turns.
Logs carry the provider body with every URL replaced by `<url>`.

### 3. A rejected credential or a malformed request

Anything else 4xx: read the message. For Anthropic specifically, a 400 naming
`anthropic-workspace-id` is an identity-linked key that has to name its
workspace — see
[runbook-connector-model-sync-failure.md](runbook-connector-model-sync-failure.md).

## Why one model works and another does not

Routing picks a model per turn, so two consecutive messages in one thread can
take different models and only one of them fail. Before concluding "the provider
is down", check whether the _failing_ turns share a model rather than a provider:

```bash
docker logs claw-chat-service --since 30m 2>&1 | grep "failed (attempt" \
  | sed -E 's/.*Provider ([^ ]+) failed.*/\1/' | sort | uniq -c
```

A clean split by model — not by provider — points at cause 1.

## Related

- [service-guide-chat.md](../04-backend/service-guide-chat.md)
- [runbook-connector-model-sync-failure.md](runbook-connector-model-sync-failure.md)
