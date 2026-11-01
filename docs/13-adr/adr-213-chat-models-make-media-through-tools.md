# ADR-213: Chat models make media through tools

**Status:** Accepted

**Date:** 2026-11-01

Rules: [rule 28](../../rules/28-billing-integrity-and-api-contracts.md), [rule 42](../../rules/42-attachment-understanding.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md), [rule 66](../../rules/66-every-flagship-feature-ships-a-public-marketing-page.md). Builds on [ADR-120](adr-120-clawai-owns-multimodal-orchestration.md) (ClawAI, not the picked model, owns media), [ADR-122](adr-122-media-features-plan-gated-at-the-executing-service.md) (plan gate at the executing service), [ADR-137](adr-137-video-generation.md) and [ADR-139](adr-139-credit-unlocks-media-generation.md).

## Context

Until now media came from a router-side redirect: a message that looked like "draw me ..." was sent to an image model and the chat model never saw the result. A chat model such as Grok, GPT or Gemini that decided mid-answer to make a picture, a clip or a voice-over had no way to do it, and could not describe or build on what was made. Claude and other text-only models cannot generate media themselves; they can call tools.

## Decision

- **Three native tools**, `generate_image`, `generate_video`, `generate_audio` (`constants/media-tools.constants.ts`), offered to a tool-calling chat model. The chat model calls one; chat-service runs the media model through image-service, waits, and returns the result to the SAME chat model as the tool result. That model writes the final reply. The media card rides on the answer as `metadata.mediaGenerations`.
- **One chokepoint.** `ChatExecutionManager.callProvider` hands the turn to `MediaToolLoopManager` (`managers/media-tool-loop.manager.ts`). `utilities/media-gateway.utility.ts` is the only file that knows the image, video and audio service routes (`/api/v1/internal/images|videos|audio`); it never throws and reports a typed failure.
- **Bounded.** Up to 3 tool rounds, 2 calls per answer, 3 generations per user message across all Compare lanes (budget kept in memory, TTL 30 min). Polling is bounded per kind (image 2 s x 60, video 5 s x 72, audio 2 s x 45); Compare lanes wait half as long. A read that fails 3 times in a row ends the wait while the generation keeps going. Stop ends the wait for a single-lane turn.
- **Offered only when the turn asks for media** (`MEDIA_TOOL_CUE_WORDS`), so ordinary turns keep streaming. A media turn is not streamed, because a tool call needs the whole response.
- **A chat model may name a media model, but only a known one.** Anything else falls back to the default (`gemini-2.5-flash-image`, `veo-3.1-fast-generate-preview`, OpenAI speech). The prompt, voice and model hint are length-capped, and the tool result is fenced like a plugin result (`clawai-media`).
- **Surfaces.** Offered on normal chat and Compare lanes (including in-thread Compare), because only those two store paths carry the card. Not offered on Consensus, Escalation, Best-of-N, Decompose, Pipeline, Cost-Ensemble, Role Pack, Repair, Verify, the judge and the critic: they store only candidate text, several would pay N times for one media item, and the last four only rewrite or grade. These keep the router-side redirect. The exception list and how to close it live in [`context/chat-surface-parity-map.md`](../../context/chat-surface-parity-map.md) ("Media tools"); `media-tool-surfaces.spec.ts` guards it.
- **Fallback.** Models without tool calling, and providers outside the tool table, keep the router-side redirect (unchanged).
- **Money and plan gates do not move.** Each generation is gated and metered in image-service exactly as before (ADR-122, ADR-139, rule 28). The chat model's own tokens are metered as always.

## Consequences

- Any tool-calling chat model can make media; the product claim is "tools produce it for any chat model", not "every model generates media".
- Open: the audio card is not rendered in the thread yet (the answer carries the entry).
- Every chat surface is covered (2026-11-01, rule 59). Single-answer surfaces (chat, Compare) offer the tools on every call. Many-candidate surfaces (Consensus, Escalation, Best-of-N, Decompose, Pipeline, Cost-Ensemble, Role Pack, Verify) offer them only on the ONE call that produces the user-visible answer (`MediaFinalStepManager`), so N candidates never pay for the same media; the media rides on the final message. Repair keeps the media of the message it rewrites, and the judge and critic are never offered tools (a judge revision keeps the answer's media). The price: a media turn on a many-candidate surface costs one extra, metered model call. When the final answer comes from a model that cannot call tools (every lab runs on Ollama today), the final step generates the media directly from the user's request with the same plan gate, budget, fallback and Stop, so no lab is left without media; the media is linked to the saved final message. The only surface outside the loop is Threads publishing, which is a separate service.
- Stop cancels the wait and the job at the media service for single-lane chat and for the whole orchestrated turn (the thread's Stop key is held from the first candidate to the final step, so the endpoint answers `cancelled:true` and the saved message says it was stopped); candidate calls already in flight finish and are discarded; the 3-per-message budget is shared across the whole orchestration.
- A media turn answers later than a text turn (the wait is the price of letting the model see the result).
- Adding a provider is a data and adapter change, see [`skills/add-a-media-generation-provider.md`](../../skills/add-a-media-generation-provider.md).
