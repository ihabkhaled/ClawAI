# Change - show which fetch tier read each page (batch 1 of 3)

## Before

research-service's escalation chain (ADR-121: plain, TLS, headless, Crawl4AI, FlareSolverr,
Firecrawl, reader, archive) recorded `servedBy` and the attempt trail, and both stopped there.
Chat narration, the progress frames, the stored message and the UI never said how a page was read.

## Change

- research-service: `FetchResult.attempts` (kind + outcome only) and `EvidenceItem.fetch`.
- chat-service: `PAGE_READ` narration per page an escalated tier served (all research paths,
  rule 59), strategies in the research-completed frame and stored progress summary.
- frontend: `PAGE_READ` line in `NarrationLog`, "Read via" chip per source in `EvidenceViewer`;
  `narration.pageRead*` / `narration.strategy*` in 13 locales.

## Knowledge delta

ADR-121 addendum 2, rule 50 item 9, `context/chat-surface-parity-map.md`, both service
`CLAUDE.md` files, `skills/verify-the-research-loop-live.md`, generated `.ai/**`.

## Not in this batch

Planner `render` hint (batch 2); chat `web_fetch` through the chain and per-sidecar enabled
state in the UI (batch 3); `runtime-crawl` page rows (needs a migration).
