# ADR-218: Turn intent is decided by a model, in any language

**Status:** Accepted

**Date:** 2026-11-22

Rules: [rule 67](../../rules/67-turn-intent-is-semantic-keywords-are-only-the-fallback.md), [rule 51](../../rules/51-router-candidates-and-model-window-fit.md), [rule 59](../../rules/59-chat-surfaces-are-one-pipeline.md). Guide: [routing engine](../03-architecture/routing-engine.md).

## Context

Whether a chat turn produces text, an image, a video, audio or a file was decided by keyword and regex lists, before any model saw the message:

- routing-service `handleAuto` ran `tryImageOrFileGeneration` (image keyword tables, `detectFileIntent`) ahead of the cloud router, and the MANUAL path (`detectExplicitModeArtifact`) used the same lists to take a turn away from a picked chat model;
- chat-service then re-routed again with prefix lists (`detectFileGenerationFollowUp`, `detectImageFollowUp`), the keyword video classifier and the media-tool word lists.

A read-only audit of 7 production accounts (1,470 messages, 2026-11-22) found the failures the owner reported: a pasted architecture brief starting "Regenerate please … combine your plan and this plan" became a `.txt` file; pasted TypeScript, even prefixed "don't generate file, just answer me", became a `.json` file; "can you re-write normally no in markdown" went to file generation; an Arabic marketing post became an image; "check this .txt file" matches the extension rule. A picked image model drew a picture of "Hi" and of "Do you know ClawAI?". Word lists cannot cover every language and cannot tell content that _mentions_ files from a request to _make_ one.

## Decision

1. **A model classifies every turn.** routing-service `TurnIntentManager` asks the admin-managed router chain (the same published configuration, adapters and coordinator as the cloud router) for `{intent, fileFormat, confidence}`, intent one of `TEXT`, `IMAGE_GENERATE`, `IMAGE_EDIT`, `VIDEO`, `AUDIO_SPEECH`, `AUDIO_MUSIC`, `FILE`. It sees the message (head and tail of a long one), the previous assistant turn's kind, the attachment types and the picked model's kind. Reading, checking, summarising, planning, researching and pasted content are `TEXT`. The prompt is language-agnostic.
2. **Keywords are only the fallback.** When the classifier is unavailable (chain disabled, timeout, malformed answer) the old keyword path runs unchanged and the intent is marked `HEURISTIC`; chat-service then keeps its legacy overrides.
3. **The intent travels with the decision.** `TurnIntentPayload` (`@claw/shared-types`) rides on `message.routed` as `turnIntent`. chat-service treats a `MODEL` intent as authoritative: a `TEXT` turn is never re-routed to a generator by a follow-up or media rule, and `FILE`/`IMAGE_*`/`VIDEO`/`AUDIO_*` need no trigger words. chat-service sends routing `previousTurnKind` so "regenerate" can mean "the same kind as last turn".
4. **A picked generation-only model does not answer a question with a picture.** Owner decision, 2026-11-22: when the picked model only makes images, videos or files and the turn is `TEXT`, a chat model answers and the message shows a notice (`intentPickOverridden` metadata). A picked chat model keeps the turn for `TEXT`.
5. **Metered like the router.** Owner decision, 2026-11-22: the classifier call is billed through the same PAYG path as router calls (local/included models stay free). Cost is about one ten-thousandth of a dollar per turn on Gemini Flash.

## Consequences

- One extra small model call per turn, bounded by a short deadline (falls back to keywords on timeout).
- Correct behaviour in any language and script without new word lists. The keyword tables stay as the degraded mode; they must not grow to fix a misroute the model path already decides (rule 67).
- Research workflow choice is still the research gate's model decision (unchanged).
- Reversible: disabling the router configuration returns the keyword behaviour.
- Open: measure classifier latency and disagreement with the old heuristics in production traces.
