# Change - web_fetch through the escalation chain, tier state in the admin UI (batch 3 of 3)

## Before

The chat `web_fetch` tool called Ollama Cloud's hosted fetch: no robots.txt, no sidecars, no
SSRF checks of ours. The UI could not show whether a sidecar was off or simply not needed.

## Change

- research-service: `POST /internal/research/fetch` (service token) -> `fetchPageForTool`.
- chat-service: `web_fetch` calls it (`executeResearchWebFetch`); refusals fail the call, no hosted fallback.
- frontend: "Page readers" card (Available / Off per tier) on the Research providers page;
  4 new `narration.*` keys in 13 locales.
- Also: the render hint now never runs an evasion tier before plain (separate fix commit).

## Knowledge delta

ADR-121 addendum 4, rule 50 item 11, both service `CLAUDE.md` files, generated `.ai/**`.

## Not in this change

Per-sidecar _health_ (up/down) is already on the status page via health-service; this adds
_enabled_ state to the admin UI only. `web_search` stays hosted.
