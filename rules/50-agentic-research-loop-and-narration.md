# Rule 50 — The research loop: plan first, open what the user named, narrate everything

**Applies to**: chat-service's AUTO research path (`ResearchOrchestratorManager`,
`ResearchGateService.plan`; its candidate walk also serves `askPlanner` for the chat save classifier, ADR-134, so a planner outage downgrades saves to the keyword path too), `NarrationService`, research-service's crawl, and
the frontend `NarrationLog`.

**Related**: [ADR-098](../docs/13-adr/adr-098-auto-research-is-an-ai-driven-narrated-loop.md) ·
[rules/41](41-web-evidence-truthfulness.md) · [rules/49](49-qa-team-discipline-and-test-evidence.md) ·
[skills/verify-the-research-loop-live.md](../skills/verify-the-research-loop-live.md)

---

## Mandatory

1. **One URL detector.** Anything that asks "does this text contain a link?"
   calls `detectUrlsInText` from `@claw/shared-utilities` (chat-service via
   `detectPromptUrls`). A second regex is how chat and research came to disagree
   about whether `example.com/pricing` was a URL. Never add a TLD to
   `BARE_HOST_TLDS` that is also an everyday identifier or file extension —
   those go in `BARE_HOST_TLDS_NEEDING_PATH`.
2. **Plan gate first.** In `runAutoResearch`, `hasResearchAccess` runs before
   the planner and before any URL shortcut. Crawl and research are both behind
   the plan's research unlock.
3. **A link the user wrote is opened** — unless the site refused it.
   `parseResearchPlan` overrules a planner that says "answer" or "search" when
   the user wrote a URL; do not relax this to trust the model. What "opened"
   means is bounded by research-service's fetch invariants (ADR-121): robots.txt
   is honoured on every fetch (a Disallow is a 403 `FETCH_ROBOTS_DISALLOWED`,
   and the failure is narrated as `RESEARCH_FAILED`, never retried another way; a
   step that read zero items is a failure even when the run object exists);
   401/451 stop the escalation chain; a captcha is never solved; every attempt
   is bounded (≤6 strategies, ≤60 s) and every redirect hop is SSRF-checked
   before it is requested. An archived copy is always labelled as one.
4. **An unusable planner reply returns `null`**, so the next configured model is
   tried. Never default a bad reply to an action — that ends the fallback walk.
5. **Research never runs inside the POST.** It runs after the response, and
   `publishMessageCreated` is in `finally`. Removing the `finally` leaves the UI
   waiting for an answer that never comes when research throws.
6. **Chat → research uses the internal route with the service token.** Never
   forward the user's bearer to `/research/runs` (admin-only) and never widen
   that route: research-service does not enforce the plan. The one user-token
   crawl surface is `/research/crawl/runs` ([ADR-150](../docs/13-adr/adr-150-runtime-crawl-for-authenticated-clients.md)),
   which enforces the plan itself in `ResearchAccessGuard` before anything else.
7. **Persist meaningful research milestones through `NarrationService.append`**,
   never by emitting a frame directly — append stores them after refresh. A tick
   every replica receives passes a `dedupeKey`.
   **Page-by-page `crawl_progress` remains live-only.** Do not append every page
   to the persisted “How I worked on this” narration; the crawl summary records
   the final count. This keeps large crawls from turning one answer into hundreds
   of saved narration steps while preserving live progress.
8. **Narration tells the truth.** Counts are what was READ (rule 41 §7); a
   failed step is `RESEARCH_FAILED`, never silence; the planner prompt requires
   its sentence to describe exactly the chosen action (a small model once
   copied an example sentence promising a search it never ran).

8a. **A down gate still obeys a plain order to search.** When no classifier or planner
answers, `isExplicitWebRequest` (a lookup verb AND a web word, or "google it") turns
`needsWeb` to yes and `plan` to a search of the user's own words. It is a backstop for
an outage, never a second detector: a model verdict, yes or no, always wins. Without it
the model answers "I cannot search the internet" to "please search internet for X".

8b. **A council decides first** ([ADR-223](../docs/13-adr/adr-223-harness-council-decides-research.md)). When the admin's
`HARNESS_COUNCIL` role has members, they are asked in parallel and the majority decides `needsWeb` and the depth;
`plan` keeps the planner's query and URLs but follows the majority. A user's link and a plain order to search are never
overruled. The single-model gate is the fallback, never removed.

8c. **Depth sizes the run; rounds fill the gaps** ([ADR-224](../docs/13-adr/adr-224-evidence-store-multi-query-and-research-rounds.md)).
The council's depth (clamped to `RESEARCH_MAX_DEPTH`, 3) picks research-service's budget: queries 1/2/4/6 and pages
8/8/8/12 for depth 0-3; its other sub-questions, and every query of rounds 2+, run on expansion providers only, so a
paid search provider still sees one call per turn, except Google (SerpAPI), which runs every research run within its
per-depth budget ([ADR-228](../docs/13-adr/adr-228-google-in-every-research.md)). At depth ≥ 2 a gap check (the gate's model chain, evidence fenced as data) may start another round
with new queries, never re-reading a URL of this turn: at most `depth` rounds, and a round starts only while 20 s of
the 60 s research budget remain. Done, no new query, a round that read nothing new, or the user's Stop ends research;
a Stop during research also stops the answer that follows (`StreamCancellationService.carryStop`, through Redis
because the answer may run on another replica). Every round is narrated with real counters from `bundle.stats`, and
only a round that will run gets a round number. The gap check writes its text in the user's language.

8e. **Research plans from the whole chat, never from the message alone** ([ADR-226](../docs/13-adr/adr-226-every-turn-sees-the-users-whole-context.md)).
The planner and the council read the conversation and the user's memories (fenced as data); every query is
self-contained ("search again" is never a query). A text lookup (lyrics, a quote, an error message) searches the exact
words first, always researches (models invent lyrics), and a near-identical line in the evidence is a match.

8f. **A promised search is finished** ([ADR-227](../docs/13-adr/adr-227-a-promised-search-is-finished-not-stored.md)).
A reply that only says it will search, or asks for a web tool normal chat did not offer, is never stored as the
answer: the promise becomes its own message, the search runs once when the user and the plan allow it, and the model
answers again. The page keeps waiting until that answer. Pinned by `search-continuation-turn.spec.ts`.

8d. **Platforms are searched through the registry, never by a new fetch path** ([ADR-225](../docs/13-adr/adr-225-research-platform-registry.md)).
Official free APIs on a host allow-list, or `site:` through expansion providers: public pages only, no login, CAPTCHA or
paywall bypass, no caption or private endpoint a robots.txt disallows. A new platform is a registry row; a new API kind
is an adapter with its host on the allow-list and a parser test.

9. **Say how a page was read, from what was measured.** A page an escalated fetch tier
   served is narrated (`PAGE_READ`, built by `pageReadNarrations` from `EvidenceItem.fetch`),
   on every research path. Kind and outcome only: no URL, status, body or error text. A cache
   hit has no provenance and gets no claim (ADR-121 addendum 2).

10. **The planner's `render` hint is an ordering hint, nothing more.** It is model-judged
    (the prompt says so; no keyword list), validated to `js`/`stealth`, and only reorders tiers
    that are already enabled and eligible, AFTER the pinned honest tiers: `OFFICIAL_API` and
    `HTTP_PLAIN` always run first, so no evasion-class tier (TLS impersonation, FlareSolverr,
    a browser) can run before the plain fetch was tried and did not serve. It is model output
    and prompt-injection reachable. It never skips robots, SSRF or the refusal stops
    (ADR-121 addendum 3). Do not use it to enable a tier or lift a bound.

11. **No second fetch path for tools.** The chat `web_fetch` tool reads pages through
    research-service's internal fetch route (robots, SSRF, escalation tiers apply) and never
    falls back to a hosted fetch (ADR-121 addendum 4).

## Prohibited

- A URL regex outside `url-detection.utility.ts`.
- Forwarding a user token to research-service from chat.
- Awaiting the research loop inside `createMessage` before returning.
- Rendering the live log and the stored log with different components.
- A second fetch path in research-service, or a strategy that bypasses the
  robots gate, the escalation policy or `followRedirectsSafely` (ADR-121).
- Solving a captcha, retrying after 401/451, or using FlareSolverr for anything
  but a JS interstitial on a robots-allowed URL.
- Sending a private, token-bearing or signed-in-only URL to a third-party
  reader or archive.

## Enforcement

| Mechanism | What it checks                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit      | `packages/shared-utilities/src/url-detection/__tests__/url-detection.utility.spec.ts` — bare domains, and every false-positive class (files, properties, versions, emails)    |
| Unit      | `research-plan.utility.spec.ts` — null on unusable replies, user URLs never dropped, bounds                                                                                   |
| Unit      | `research-gate.service.spec.ts` — the walk moves on after a bad reply; outage still crawls the user's link                                                                    |
| Unit      | `research-orchestrator.manager.spec.ts` — crawl → back to AI → search only when asked; failures narrated                                                                      |
| Unit      | `research-orchestrator-rounds.manager.spec.ts` — rounds stop on done / no new query / nothing new / cap / budget / Stop; Stop carried to the answer; query budget per depth   |
| Unit      | `research-gap-check.utility.spec.ts` + `research-request.utility.spec.ts` — gap-check replies (fenced, truncated, junk); request fields sent only when set                    |
| Unit      | research-service `platform-adapters.spec.ts` + `research-platform.service.spec.ts` + `keyword-query.utility.spec.ts` — allow-listed hosts only, parsers, admin rules          |
| Unit      | `stream-cancellation.service.spec.ts` — a carried Stop starts the next run aborted, once; a replaced run is never carried                                                     |
| Unit      | research-service `research-engine.spec.ts` + `search-engine-cache.spec.ts` — depth budgets, expansion only on expansion providers, fusion, cache hit = no unit, thread memory |
| Live      | `scripts/qa-lab/research-eval/` — 336-case, 26-language decision and citation evaluation (README there)                                                                       |
| Unit      | `context-assembly-evidence-fit.spec.ts` — a 150-page crawl fits a 16k model, dropped pages are announced, history budget stays above 0                                        |
| Unit      | `site-crawl.manager.spec.ts` — link hops fill a large budget on a site with no sitemap; ceiling 200                                                                           |
| Unit      | `auto-research-resolution.spec.ts` — plan gate before everything, including a URL                                                                                             |
| Unit      | `research-progress-bridge.service.spec.ts` — one dedupe key per tick across replicas                                                                                          |
| Unit      | `research-client.utility.spec.ts` — internal route, service token, no user bearer                                                                                             |
| Unit      | `research-fetch-provenance.utility.spec.ts` + `evidence-builder.spec.ts` (`fetchProvenanceOf`) — provenance is kind/outcome only, capped, absent on cache hits                |
| Unit      | `escalation-policy.utility.spec.ts` — refusals stop, captcha/429/404 go archive-only, FlareSolverr only after a JS challenge                                                  |
| Unit      | `fetch-strategy-orchestrator.service.spec.ts` — attempt ceiling, wall clock, thin fallback, `fetch.served` line has no query string                                           |
| Unit      | `fetch.service.escalation.spec.ts` + `robots-policy.service.spec.ts` — robots Disallow refuses before any strategy; RFC 9309 wildcards                                        |
| Live      | [skills/verify-the-research-loop-live.md](../skills/verify-the-research-loop-live.md) · [skills/add-a-fetch-strategy.md](../skills/add-a-fetch-strategy.md) (live tier proof) |
