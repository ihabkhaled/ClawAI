# Rule 67 — Turn intent is semantic; keywords are only the fallback

**Status:** STRICT. Owner order, 2026-11-22. Decision: [ADR-218](../docs/13-adr/adr-218-turn-intent-is-decided-by-a-model-in-any-language.md).

Users write in any of 1,000+ languages and paste whole documents. Whether a turn produces text, an image, a video, audio or a
file is decided by the model intent classifier (`TurnIntentManager` in routing-service), never first by a word list.

1. **No new keyword gate decides generation.** Do not add words, prefixes, regexes or extensions to the image, file, video,
   media-tool or follow-up lists to fix a misroute. Fix the classifier prompt or its inputs instead.
2. **A `MODEL` intent is authoritative everywhere.** routing-service and every chat surface in chat-service (rule 59) obey
   `turnIntent` when its source is `MODEL`: a `TEXT` turn is never re-routed to a generator.
3. **Keyword paths run only when the classifier did not answer** (`turnIntent` absent or `HEURISTIC`), and must keep their
   existing tests green as the degraded mode.
4. **Reading is not producing.** "Check / read / summarise / translate this file, image or video", pasted code and pasted
   documents are `TEXT`. A test with a real production message guards each case.
5. **A picked generation-only model gets a generation request, not a greeting.** A `TEXT` turn on such a pick is answered by a
   chat model with the `intentPickOverridden` notice.

Mechanism: the routing-manager and chat-messages specs named in ADR-218 (MODEL intent blocks every keyword override; null intent
keeps legacy behaviour).
