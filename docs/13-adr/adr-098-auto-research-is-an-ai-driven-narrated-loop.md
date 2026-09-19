# ADR-098 — AUTO research is an AI-driven, narrated loop that runs after the request returns

**Status:** Accepted · **Date:** 2026-09-19 · **Services:** chat-service, research-service, routing-service, frontend

## Context

AUTO research was a yes/no gate followed by one research run, all inside
`POST /chat-messages`. Measured problems, all live on claw.local:

- A link written without a scheme (`example.com/pricing`) was invisible: five
  separate regexes across two services required `http(s)://`.
- `POST /research/runs` is gated `ADMIN_SYSTEM_VIEW`; chat forwarded the user's
  token, so every non-admin got a 403 that chat swallowed to "no evidence".
  Research only ever worked for admins — which is who tested it.
- A plain URL never crawled a site unless the message literally said "crawl";
  `example.com` redirecting to `www.` dropped every sitemap page.
- Nothing the user saw survived a refresh: the progress panel lived in React
  state, the Redis replay was capped and wiped mid-turn.
- Research ran inside the POST, under nginx's 60 s limit and a 30 s client
  timeout, so a real crawl could not finish.

## Decision

1. **One URL detector** (`@claw/shared-utilities` `detectUrlsInText`) for both
   services. Bare domains are accepted on a curated TLD allow-list; suffixes
   that double as identifiers or file extensions (`user.id`, `this.app`,
   `main.py`, `README.md`) need a path or `www.`. Detection is not a safety
   check — the fetch guard still refuses private hosts by name (rule 41 §12).
2. **A planner decides HOW to use the web**: answer / crawl / search /
   crawl-then-search, the URLs, a model-written search query and a page budget.
   After a crawl it is asked again, with what was read, whether a search is
   still needed. Candidates are the admin's ordered assistant models; an
   unusable reply moves to the NEXT model (the old gate ended the walk on one
   bad reply). A URL the user wrote is always opened (rule 41 §1), whatever the
   model says. The answer is still written by the user's own selected model.
3. **Research runs after the POST returns.** The user row is stored and
   returned at once; plan → crawl → re-plan → search runs in the background and
   `message.created` is published in `finally`, so a failed step still reaches
   the answering model and the UI never waits forever.
4. **Chat calls research over an internal service-token route**
   (`/api/v1/internal/research/runs`, not proxied by nginx) naming the user.
   The user route stays admin-only: research-service records usage but does not
   enforce the plan, so widening it would let any user skip chat's paid gate.
5. **The plan gate is checked FIRST** for AUTO — before the URL shortcut. AUTO
   skips the `PLAN_FEATURE_DISABLED` 403 an explicit mode raises, so this is the
   only thing keeping a plan without research (crawl included) off the web.
6. **Every step is narrated and stored.** `NarrationService` appends each line
   to a per-thread Redis list AND streams it (`narration` SSE frame); the list
   is copied onto the answer as `metadata.narration` when it is stored. Crawl
   ticks reach every replica, so the append is a Lua `SET NX` + `RPUSH`: exactly
   one replica logs and streams each tick. The frontend renders one
   `NarrationLog` from two sources — live frames, then the stored copy.

## Consequences

- The POST returns in tens of milliseconds regardless of research.
- Crawls may read up to `CRAWL_MAX_PAGES_CEILING` (200) pages, ranked by overlap
  with the question; the evidence cap grows with the crawl so fetched pages are
  not discarded. Sitemap pages come first; when they cannot fill the budget the
  crawler follows same-site links breadth-first for up to `CRAWL_MAX_LINK_DEPTH`
  (3) hops. Before 2026-09-19 it was 40 pages and one hop, so a site without a
  big sitemap stopped at its homepage links. Live: docs.nestjs.com gave 91
  pages, every page reachable by links, with no fetch failures.
- A big crawl is fitted to the ANSWERING model at context assembly
  (`fitEvidenceToBudget`, 60% of the model's input window): all snippets shrink
  evenly first, then the lowest-ranked pages are dropped and the model is told
  how many. It fits against the whole window, never `tokenBudget`. That field
  is what history may spend AFTER the evidence is counted, and a 91-page crawl
  drove it to 0 in the first live run.
- The planner writes a `thinking` field (plan and re-plan), stored as
  `ai_thought` narration. The AI's reasoning therefore survives a refresh as
  its own words, not only as an "AI is thinking" line. The answering model's
  reasoning was already stored as `metadata.reasoning`.
- A crawl then search produces ONE merged bundle, crawl first (the page the
  user named outranks anything discovered).
- Known gap: a brief blank between the live log closing (on `done`) and the
  stored copy arriving with the refetched message.
- Known gap: decision calls go through ollama-service `/generate` for every
  candidate provider and are not PAYG-metered (pre-existing, unchanged).

## See also

[rules/50](../../rules/50-agentic-research-loop-and-narration.md) ·
[rules/41](../../rules/41-web-evidence-truthfulness.md) ·
[skills/verify-the-research-loop-live.md](../../skills/verify-the-research-loop-live.md)
