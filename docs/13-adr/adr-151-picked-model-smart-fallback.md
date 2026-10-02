# ADR-151: A picked model that fails gets a labelled substitute, then three suggestions

- Status: Accepted
- Date: 2026-10-02
- Deciders: Product owner, engineering
- Related: rule [51](../../rules/51-router-candidates-and-model-window-fit.md),
  rule [37](../../rules/37-payg-credit-integrity.md), ADR-100, ADR-132 (regenerate with a chosen model)

## Context

AUTO already walks a fallback chain. A model the user PICKED (`MANUAL_MODEL`) did not:
`buildCandidateChain` returned only the pick ("attempt 1/1"), so a provider outage, an
unavailable model or an out-of-credit provider account ended in the generic "All providers
failed to generate a response", with no way forward except guessing another model.

## Decision

1. **routing-service names substitutes.** For a chat pick it adds `pickedModelSubstitutes`
   (up to 5, best first) to `message.routed`, ranked by `rankPickedModelSubstitutes` from the
   same eligible set AUTO uses (exposed, healthy connector, allowed by the plan, never an
   image-output model; rule 51 item 1): another model of the SAME provider at the pick's
   cost class or below, then other providers' models at or below it, then pricier models
   marked `costlier`. A lookup failure means no substitutes (the old behaviour), never a
   failed routing decision.
2. **chat-service tries at most two.** The chain is the pick plus the first two substitutes
   (`PICKED_MODEL_MAX_FALLBACKS`). A substitute that answers is stamped on the reply as
   `metadata.pickedModelFallback` (`originalProvider`, `originalModel`, `costlier`); the
   bubble reads "X failed, so Y answered instead" and, when `costlier`, says Y can cost more.
   Each hop reserves its own credit, so the free cap and the wallet apply per hop.
3. **Only a provider failure moves on.** A credit (402), plan/exposure (403) or quota (429)
   refusal of the pick, and a user stop, end the turn and show as themselves (the upgrade
   notice): another model cannot fix them and a fallback would hide the reason. A substitute
   refused for credit is skipped; the next one may be a free or local model. A pick is never
   swapped for a weak-but-successful answer (the quality re-route is AUTO only).
4. **Everything failed.** `PickedModelFailedException` (`PICKED_MODEL_FAILED`, 502,
   `messageKey pickedModel.failedMessage`) carries up to three untried models
   (`suggestedModels`; cheaper-or-equal first). They go on the SSE error frame and into the
   stored error metadata. The bubble renders them as buttons that regenerate the question
   with that model (the ADR-132 call, `MANUAL_MODEL` + provider + model) plus a
   "Choose another model" model picker. With no backend suggestions the frontend offers the
   first three picker models other than the one that failed. If nothing was tried after the
   pick and nothing is on offer, the pick's own translated error stands (unchanged).
5. **Copy** is `pickedModel.*` (`picked-model-translations.ts`), all 13 locales.

## Consequences

- A pricier substitute can answer, but never silently. A cost-class cap was rejected: it would
  leave a Free user with nothing when the only healthy model is pricier.
- The substitute list is computed at routing time. A model that fails in the window between
  routing and execution is simply skipped (it counts toward the two).
- Code: `picked-model-fallback.utility.ts` (chat), `picked-model-substitute.*` (routing),
  `picked-model-fallback-chokepoint.spec.ts`, frontend `picked-model-recovery.tsx`.

- Ollama cloud answers 429 "you have reached your weekly usage limit ... add usage credits" for the whole account. `PROVIDER_ACCOUNT_EXHAUSTED_PATTERN` now matches it, so it is classified as provider credit exhaustion (breaker opens, other Ollama models are skipped as substitutes) instead of "model busy".

## Addendum: a model that cannot chat is not offered (2026-10-02)

The fallback is a safety net, not a catalog. `grok-4.20-multi-agent-0309` answers only on
xAI `/v1/responses` (HTTP 400 on chat completions), so pinning it always fell back. The
connector sync now classifies such ids as `kind = TOOL` (`nonChatKindForModelKey`), a
migration repairs existing rows, and the CHAT-only catalog/router filters hide it. Chat-service
has no responses-API path, so unexposing is the fix rather than adding one.

## Addendum: OpenAI responses-only models are not chat models

`gpt-*-pro`, `o1-pro`/`o3-pro`, `*-codex` and `deep-research` answer only `/v1/responses`
(404 "only supported in v1/responses" / "not a chat model" on chat/completions), and
chat-service has no `/responses` client. The OpenAI adapter now syncs them as `kind TOOL`
and a migration unexposes the existing rows, so they leave the picker and the router
instead of being pinned and silently substituted. A `/responses` adapter would let them
return; until then they stay hidden.

### Addendum: speech, realtime and embedding models are not chat models

OpenAI's `gpt-4o-*-transcribe`, `gpt-4o-*-tts` (and Gemini `native-audio`, `live`, `lyria`)
were synced as `kind CHAT` and EXPOSED, so the picker offered them and chat completions
answered 404 "not a chat model". `nonChatKind` (connector-service
`utilities/model-kind.utility.ts`, patterns in `constants/model-kind.constants.ts`) now
sets `kind` on every sync create AND update, for every provider: `AUDIO` (new enum value),
`EMBEDDING`, `RERANKER`, `TOOL`. `gpt-4o-audio-preview` stays chat. Migrations
`20261002130000` (enum value) and `20261002130100` (reclassify + unexpose existing rows)
carry the same patterns in SQL. The snapshot still lists these rows, so file-service keeps
the `supportsAudio` OpenAI row it needs for `whisper-1`; only the catalog, picker and router
(`kind = CHAT`) stop seeing them. The classifier stays in connector-service rather than
shared-constants: the picked-model and preset patterns are unchanged and a new shared export
would crash dev containers that bake packages.

## Addendum: Gemini embedding and aqa models are not chat models

Gemini lists `gemini-embedding-*` (`embedContent`) and `aqa` (`generateAnswer`) beside chat
models, and they 404 on chat ("not supported for generateContent"). The Gemini adapter now reads
`supportedGenerationMethods` from the native list and sets `NormalizedModel.kind`: no
`generateContent` plus an embed method is `EMBEDDING`, anything else is `TOOL`. The repository
writes that kind on create and update, and an update also sets `exposure = UNEXPOSED`, so a
resync repairs an exposed row. Migration `20261002130000_reclassify_gemini_non_chat_models`
repairs existing rows. An unreadable native list changes nothing, so an outage cannot hide chat models.

### Addendum: Gemini Live / realtime models (WebSocket only)

`native-audio-*`, `*-live-*`, `lyria-realtime-*` and `*-streaming-preview` list only
`bidiGenerateContent` / `bidiGenerateMusic`; chat gets HTTP 400 "only supports real-time
bidirectional streaming". The methods list (no `generateContent` is `TOOL`) and the id patterns
already classify the audio/live ones as `AUDIO`; the one id shape no pattern named,
`gemini-robotics-er-2-streaming-preview`, is now in `MODEL_KIND_TOOL_PATTERN`. Migration
`20261002130200_reclassify_gemini_streaming_preview_models` repairs existing rows. The 400 is
not auto-unexposed from chat-service: classification at sync is the source of truth, and until a
resync the picked-model fallback already substitutes on that 400.

## Addendum: Gemini TTS, Lyria, agents and nano-banana

Gemini TTS and Lyria ids are `AUDIO`; deep-research, computer-use and `antigravity-*` are `TOOL`
(`model-kind.constants.ts`; migration `20261002140000_reclassify_antigravity_agent_models` covers
antigravity, the speech migration the rest). `nano-banana-pro-preview` (Gemini 3 Pro Image under
another name) is an image-output model: it is added to the shared Gemini image-output pattern so a
pin is redirected to `IMAGE_GEMINI` like `gemini-*-image`, and routing-service cost seed v12 gives
it the `gemini-3-pro-image-preview` price (an unpriced model is blocked).

## Addendum: a small shared window clamps the default output cap (gpt-4, gpt-4-0613)

The hosted default `max_tokens` (16,384) is larger than the whole 8,192-token window of `gpt-4` and
`gpt-4-0613`, so OpenAI answered 400 "maximum context length is 8192 tokens ... 16384 in the
completion" and the pinned model fell back. Two fixes, both in chat-service: `applyWindowFit` (before
every provider call) lowers the cap to `window - prompt - 256` using `knownContextWindow`, and
`parseContextOverrunOutputRoom` teaches the ADR-125 retry that one form of the refusal (a completion
share above 0 and room left). That ceiling depends on the prompt, so it is retried but never learned
onto the model row. A prompt that alone overflows stays a plain error.

## Addendum: models the provider retired but still lists

OpenAI keeps listing retired models (`gpt-5-chat-latest`, `*-search-preview`,
`gpt-3.5-turbo-instruct`, `*-codex`, ...) in `/v1/models`; calling them answers 404
`model_not_found`, which chat-service showed as "Provider OPENAI returned 404" while the model
stayed ACTIVE and EXPOSED. Now: (1) chat-service classifies that answer as
`ProviderModelUnavailableException` (substitutable, translated message); (2) it reports each one to
connector-service, which retires a model after 3 reports in 7 days (`SUNSET` + `UNEXPOSED`, kept
across syncs); (3) the OpenAI sync records the known retired patterns as `SUNSET`; (4) migration
`20261002130000_retire_unavailable_openai_models` fixes existing rows on every database.
