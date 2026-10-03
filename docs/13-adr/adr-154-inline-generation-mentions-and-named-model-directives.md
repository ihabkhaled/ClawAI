# ADR-154 - Inline generation mentions are text; a named model gets the prompt without the directive

**Status:** Accepted - **Date:** 2026-10-03 - **Owner direction:** chat, 2026-10-03

## Context

A user pasted "Say also talk to models with audio/video, create files, pdf, docx ... create
videos, create images" as extra context for a LinkedIn post. The router read "create images"
and generated an image; another detector wrote a text file. The same user also asked that
"use nano banana to ..." send the request to that model, but the directive words stayed in
the prompt the model received, and an unusable named model (Grok) fell back silently to gpt-4.

## Decision

1. **A generation verb mentioned in prose is not a request.** `generationRequestText`
   (`packages/shared-utilities/src/generation-request/generation-mention.utility.ts`) drops
   supplement openers ("say also"), ability cues ("our app can create"), verb lists, the topic
   of a writing task and bullets under them, for en/ar/fr/es/de plus common verbs elsewhere.
   Image, file and video detection all read it, so a keyword hit is only a candidate. No
   extra paid model call; ambiguous hits fall back to a text answer.
2. **A named model gets a clean prompt.** Routing carries the prompt without the directive
   as `namedModelPrompt` on `message.routed`; chat-service swaps it into the final user turn
   (chat, image, file and video paths). The stored message is unchanged.
3. **An unusable named model is announced.** `namedModelNotice` (`NOT_CONFIGURED`,
   `NOT_IN_PLAN`, `CONNECTOR_DOWN`, `NO_FITTING_MODEL`) makes the answer open with one sentence.
4. **Saving needs material.** `guardSaveVerdict` drops a pack or memory save whose text is only
   the command; the model writes the material and points at the Save buttons.

## Consequences

- Rule 57 items 19-20 and rule 51 items 20-21 carry the checks; tests hold the LinkedIn paste
  and 25+ cases in five languages.
- A new generation keyword table must read `generationRequestText`, never the raw prompt.
- Trade-off: a genuine request phrased as a feature list ("create an image of a cat" inside a
  bullet) can be missed; the user can pick the image model or rephrase.
