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

That WARN line carries the verbatim provider error. Everything below is read off
it. If it says nothing useful, widen with `grep -B 2 -A 10 "returned 4"` to see
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

### 2. Billing, not code

```
{"error":{"code":"credit_balance_exhausted",
          "message":"You have no credits remaining. Add credits to continue..."}}
```

HTTP **429** with `insufficient_quota` / `credit_balance_exhausted` means the
provider account is out of credit. Nothing in this repo can fix it — top up the
account. Note 429 here does **not** mean rate limiting, so backing off and
retrying will never clear it.

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
