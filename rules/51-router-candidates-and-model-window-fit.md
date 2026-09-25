# Rule 51 — Router candidates come from admin exposure; every prompt fits its model

**Why**: see [ADR-100](../docs/13-adr/adr-100-router-candidates-and-per-model-context-fit.md).
In production, AUTO answered with Gemini almost every time, the research
planner never ran, 156 of 175 catalog models had no context window, and an 8k
model was sent a 16.7k-token prompt.

## Rules

1. **Never filter router candidates on `ACTIVE` alone.** Candidates are the
   chat models an admin exposed, filtered by connector health and the user's
   plan. `ACTIVE` only decides the order.
2. **Never call ollama-service for a hosted model.** A provider of
   `OLLAMA_CLOUD` means ollama.com with the connector key. Production has no
   ollama-service.
3. **Never keep a second context-window table.** The only one is
   `knownContextWindow` in `@claw/shared-utilities`, and a provider-reported
   value always beats it.
4. **Every fixed-size prompt source gets a window share:** research, files,
   context packs and memories. A new source added to the prompt must get a
   share, and a case in `context-assembly-window-fit.spec.ts`.
5. **Never label a `length` stop "context window full"** unless the prompt
   actually filled the window. An output cap is the usual cause.

## Check it live

- **Router:** `docker logs claw-routing-service | grep resolveEligibleDeployments`
  should show `eligible=30 providers=` naming more than one provider.
- **Planner in production:** `grep "Ollama Cloud"` in the chat-service logs.
  There must be no `ollama-service ... fetch failed` from `ResearchGateService`.

## Added 2026-09-19 (ADR-103)

6. **Every AUTO answer names its router.** The cloud router sets
   `routerModel` from the attempt whose decision was used
   (`routerModelFromAttempts`). A new routing path that returns a decision
   without it hides who routed.
7. **Never hard-code a model that writes for the user.** File writers are the
   `FILE_WRITER` assistant role; the model that describes an image for a lane
   that cannot see is the `VISION_HELPER` role (ADR-120 batch 5). A new helper
   model gets a role, not a constant — runbook
   [`skills/add-a-helper-model-role.md`](../skills/add-a-helper-model-role.md).
8. **File intent needs a file word.** Change `detectFileIntent` only together
   with its case table (`file-intent.utility.spec.ts`), and add any new false
   positive to it first.

## Added 2026-09-25 (ADR-119)

9. **A file request is a file request in every routing mode.** File intent is
   checked before every non-AUTO mode handler (`detectExplicitModeFileRequest`),
   not only in `handleAuto`. Live, 0/52 explicit-model file requests made a
   file before this; each model pasted the content or said it "can't create
   files".
10. **A manual pick writes its own file.** The decision carries `fileWriter`
    (the user's provider/model) on `message.routed`; chat-service tries it
    before the `FILE_WRITER` list. LOCAL_ONLY / PRIVACY_FIRST allow local
    writers only — the `FILE_WRITER` list is hosted.
11. **Runtime V2 is never a file job.** `RoutingContext.runtimeV2` is set from
    the event; an agent's "create a README.md file" is a tool call.
12. **Intent words must not be ordinary words.** A format name that is also a
    common word or a formatting/coding request (`word`, `markdown`, `html`,
    `docs`, `json`) stays SOFT, and only office/data acronyms (pdf, docx,
    xlsx, xls, pptx, csv) count as a bare leading word. One token cannot be
    both the format and the verb ("zip codes"). Add a "stays in chat" case to
    `file-intent.utility.spec.ts` with every new word.

## Added 2026-09-25 (multimodal batch 8, ADR-120 addendum)

13. **AUTO ranks by modality fit; a transformable text-only model stays
    eligible.** chat-service sends the attachments' real mime types,
    `requiredModalities` and `transformableModalities` on `message.created`
    (never `attachmentMimeTypes: []` for a turn that has attachments). The
    cloud router's candidates are filtered by exposure, health and plan FIRST
    (items 1, 3 unchanged), then ordered DIRECT → TRANSFORMED; a DEGRADED model
    (misses an input chat cannot transform for this user) is offered only when
    nothing else survived, so AUTO never goes dark. No attachments → identical
    order. The decision carries `modalityFit:<fit>`; `routerModel` provenance
    (item 6) is untouched. A new modality gets a `RequiredModality` value, a
    `modalityFitOf` branch and a case in `modality-fit.utility.spec.ts`. Chat
    never overrides AUTO's pick for media any more — the ranking lives here.
    Video frames and frame descriptions are prompt sources under item 4: they
    spend the file share, framing reserved, native frames capped per window.

## Added 2026-09-25 (ADR-124 — output budget and provider-key credit)

14. **Never request a hosted model's maximum output by default.** With no
    thread / fast-path / quota cap, a hosted provider gets
    `computeDefaultMaxTokensForProvider` = min(ctx-derived, **16,384**); only
    local runtimes keep the ctx-derived default. Every new place that computes
    a default output cap calls that function — never
    `computeDefaultMaxTokens(pickDefaultCtxSizeForProvider(...))` directly.
    A cap is a window-fit input too: OpenRouter pre-authorizes
    `max_tokens × price`, so an oversized cap is refused outright.
15. **Fit the key, not only the window.** For a preset with `creditHeadroom`
    (OpenRouter), the chokepoint caps output at what the key can afford
    (`applyProviderCreditCap`) before the PAYG hold, and a 402 "can only afford
    N" is retried once at 90% of N. The final `max_tokens` is the minimum of
    every cap in the chain; none of them may widen another.

## Added 2026-09-25 (ADR-125 — every provider's output ceiling)

16. **Never send a model more `max_tokens` than it is known to accept, and
    learn what it did not say.** The model's ceiling lives on
    `connector_models` (`max_output_tokens` from the catalog sync,
    `learned_max_output_tokens` from refusals — only ever lowered) and reaches
    chat through the models-snapshot `maxOutputTokens`; the chokepoint
    pre-clamps with it (`applyModelOutputLimit`). A refusal that states a
    ceiling is retried once at it and recorded. A new provider's refusal
    wording gets a pattern in `PROVIDER_OUTPUT_LIMIT_PATTERNS` and a verbatim
    case in `provider-http-failure.utility.spec.ts`; a catalog that publishes
    an output limit gets read in `fromOpenAIEntry` (or its adapter).

## Added 2026-09-25 (pack §90 — an explicit image model is the user's choice)

17. **Never replace a picked image-output model with the "best" image
    provider.** MANUAL_MODEL `GROK/grok-imagine-image` routes to
    `IMAGE_GROK/grok-imagine-image`, not Gemini — the user is charged for what
    routing records. Only a picked CHAT model that asks for an image goes to the
    best image provider. Recognise image-output models with
    `@claw/shared-utilities` `resolveImageCapabilityProvider` only; routing and
    chat must never keep separate tables.
