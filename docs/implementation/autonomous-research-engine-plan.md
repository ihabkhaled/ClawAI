# Autonomous Research & Intelligence Engine — audit and plan

Status: IN PROGRESS (2026-11-28). Owner decisions in §8. Done: the harness council (§3, [ADR-223](../13-adr/adr-223-harness-council-decides-research.md));
B1 + B2 ([ADR-224](../13-adr/adr-224-evidence-store-multi-query-and-research-rounds.md): web-source fence, evidence
store, thread memory, depth budgets, query expansion, search cache, rounds with a gap check, Stop, real counters);
the evaluation golden set (`scripts/qa-lab/research-eval/`, 336 cases, 26 languages); B3
([ADR-225](../13-adr/adr-225-research-platform-registry.md): 36-platform registry with admin page, nine free official
APIs, site-scoped social/news search, the council picks source kinds). Owner-reported fixes ([ADR-226](../13-adr/adr-226-every-turn-sees-the-users-whole-context.md)):
research reads the whole chat and memories, exact-text lookups, near-identical matches, memory never filtered,
any-language matching. Next: B5 (source scoring, syndication, claim assessment with evidence statuses). Video research reads public watch pages only:
YouTube's robots.txt disallows `/api/` (captions), so autonomous research never fetches captions (§6). Source: the owner's brief "ClawAI — Advanced
Autonomous Research & Intelligence Engine" plus "a 3-model harness". Intake per
[rules/26](../../rules/26-prompt-pack-intake-protocol.md): audit first, plan second, deviations stated.

## 1. What exists today (audit verdicts, from code)

| Area                                | Verdict | Where it lives / the gap                                                                                                                                         |
| ----------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Research need detection             | done    | `ResearchGateService.needsWeb` (chat): a model call, keyword backstop only when no model answers (rule 50 §8a). One model, 64 tokens, 6 s.                       |
| Turn intent (text/image/file/video) | partial | `TurnIntentManager.classify` (routing), on the published router chain, keyword fallback.                                                                         |
| Research plan                       | partial | `research-plan.utility.ts`: action, urls, ONE query, maxPages. No entities, sub-questions, languages, platforms or depth level.                                  |
| Search providers                    | done    | research-service `search-adapter.factory.ts`: Ollama Web, Tavily, SearXNG, Exa, Firecrawl, Brave, SerpApi; run in parallel; breaker per process.                 |
| Query expansion                     | missing | One query per run (`research.manager.ts` `runSearch`).                                                                                                           |
| Multilingual retrieval              | missing | Brave pinned to `en`/`us`; no language detection; Wikipedia per-language only.                                                                                   |
| Iterative rounds                    | missing | `ResearchManager.run()` is one pass. Rounds exist only as the chat tool loop (model calls `web_search` again, up to 50 iterations).                              |
| Platform registry                   | missing | No research-side registry (live-service has a video-platform list for capture only).                                                                             |
| Social platforms                    | missing | Reached only when a search engine happens to return them.                                                                                                        |
| Academic / technical                | partial | Official-API fetch for Wikipedia, GitHub README, arXiv, Crossref, HN, for URLs already found. No discovery (OpenAlex, Semantic Scholar, PubMed, Stack Exchange). |
| Crawling                            | partial | `SiteCrawlManager`: one-site BFS, depth 3, ≤200 pages, robots, dedupe by URL. No cross-site frontier, no content-hash dedupe.                                    |
| Video / audio research              | missing | yt-dlp, captions and transcription exist in live-service and file-service; research never calls them.                                                            |
| Validation / fact-checking          | missing | `FindingConfidence` label without logic; no credibility, syndication or contradiction checks.                                                                    |
| Evidence / knowledge graph          | missing | Evidence only as JSON (`ResearchRun.bundle`); no claim, source, entity, timeline tables.                                                                         |
| Provenance                          | partial | `EvidenceItem`: url, title, dates, provider, fetch strategy. No author, language, content hash, round, discovery path.                                           |
| Citations                           | partial | Chat stores `[n]` title/url/snippet; Threads checks id→URL against the bundle only (no liveness, no quote check). Three citation-marker implementations.         |
| Research reuse across turns         | missing | `ResearchRun` has no thread id; only a 15-minute page cache.                                                                                                     |
| Context management                  | partial | Evidence fitted to 45 % of the window, lexical ranking, citations kept; no model rerank.                                                                         |
| Prompt-injection defence            | partial | Tool, file and cross-thread content fenced as untrusted; **web evidence is NOT fenced** (fix first).                                                             |
| Progress streaming                  | done    | Narration kinds and `crawl_progress` are real; no counters for queries, languages, platforms, rounds, claims.                                                    |
| Multi-model deliberation            | partial | Compare, Consensus, Escalation, Judge referee, best-of-n all on `ModeExecutionGatewayManager` (rule 59). No council for harness decisions.                       |
| Threads research                    | partial | One shared research pass per job; Judge/Critic may add one evidence-gap pass; authors do not research.                                                           |
| Cancellation                        | partial | Threads yes; chat research no.                                                                                                                                   |
| Cost tracking                       | partial | WEB_SEARCH / WEB_FETCH metered; no transcription, translation or per-research budget.                                                                            |
| Security (SSRF, size, private nets) | done    | `assertSafeOutboundUrl`, per-hop redirect checks, DNS guard, body limits.                                                                                        |
| Admin / observability               | partial | Provider CRUD and runs pages; breaker and failure counters in memory; no research cost or latency dashboards.                                                    |
| Evaluation dataset                  | missing | No golden set or research-quality harness.                                                                                                                       |

### The harness in production today

- AUTO model choice and turn intent: the published router chain, one model at a time — `gpt-oss:120b` →
  `gemma4:31b` → `gpt-oss:20b` → `qwen3.5:397b` (Ollama Cloud), 1.6 s per attempt. (`gemini-3.5-flash-lite` was the
  router before; it is superseded.)
- Research gate: `gpt-oss:120b` → `gemma4:31b`, 6 s, 64 tokens. One model decides.
- Vision helper: `gemini-2.5-flash` → `gpt-4.1-mini`.
- Semantic analyzer and AI route planner exist but are OFF (`ROUTING_SEMANTIC_ANALYZER_ENABLED=false`).

## 2. Target architecture (extends the existing seams; no parallel system)

```text
Chat / Compare / Judge / Threads ──► research gateway (chat, ADR-212)   Threads ──► research.client (TG)
              │                                    │
              ▼                                    ▼
   Harness council (routing): 3 models vote ─► Research plan (entities, sub-questions, languages,
   on need, depth level and plan; a merger       platforms, depth L0-L5, budgets)
   reconciles; one-model fallback on timeout         │
                                                     ▼
                            research-service ORCHESTRATOR (new round loop around ResearchManager)
              ┌──────────────┬───────────────┬───────────────┬──────────────────┐
              ▼              ▼               ▼               ▼                  ▼
       Query engine   Platform registry   Fetch/crawl     Media reader        Validation
       (expansion,    (engines, social    (frontier,      (captions, STT,     (source score,
       per language,  via site search,    hash dedupe,    timestamps via      syndication,
       dedupe, cache) academic APIs)      robots, budget) live/file seams)    contradictions)
                                                     │
                                                     ▼
                     Evidence store (Postgres, research-service): sessions, sources, claims,
                     claim↔evidence (supports/contradicts + status), entities, relations, timeline
                                                     │
                                                     ▼
          Evidence packets (claim-level, cited, fenced as untrusted) ─► answering models / Judge / Critic
          ▲                                                                       │
          └──────────────── request_research tool (model-requested rounds) ◄──────┘
```

Key contracts:

- **Research plan** (`ResearchPlanV2`): objective, entities, sub-questions, claims to verify, languages, platform
  categories, time window, depth level, query budget, stop conditions.
- **Platform adapter** (`PlatformAdapter`): `id`, category, access method (search-engine site scope / official API /
  RSS / crawl / media), languages, regions, content types, auth, rate limit, cost per call, enabled. Data-driven
  table + admin page; code adapters only for API-based platforms.
- **Evidence** (`ResearchSource`, `ResearchClaim`, `ClaimEvidence`, `ResearchEntity`, `EntityRelation`,
  `TimelineEvent`): every source carries url, platform, title, author, published / retrieved dates, language,
  excerpt, translation, media timestamps, content hash, query, round, parent source, retrieval status, score.
- **Evidence statuses**: VERIFIED, STRONGLY_SUPPORTED, PARTIALLY_SUPPORTED, DISPUTED, UNVERIFIED, CONTRADICTED,
  INSUFFICIENT_EVIDENCE, with an explanation, never a bare number.
- **Depth levels**: L0 answer, L1 1-5 queries, L2 5-25, L3 25-100, L4 100-300, L5 300-1,000+; admin-configurable
  budgets (queries, pages, media minutes, model tokens, money) per level and per plan.
- **Progress**: new narration kinds with real counters: queries run, platforms, languages, results, sources read,
  videos analysed, rounds, claims evaluated, duplicates removed; cancel keeps finished evidence.

## 3. Harness council (the "3 smarter models")

- The decisions that today take one model (research need, depth level, research plan, and optionally the AUTO model
  choice) are asked of THREE configured models in parallel. A deterministic merger combines them: majority for
  yes/no and level (ties go deeper), union-then-rank for sub-questions, languages and platforms; a fourth
  "synthesizer" call only when the three disagree materially.
- Admin-configured as assistant-model roles (`HARNESS_COUNCIL` ×3 + `HARNESS_SYNTHESIZER`), like `RESEARCH_GATE`
  today; any model in the catalog can be chosen.
- Hard deadline per decision (default 4 s for need/depth, 12 s for a deep plan); whatever answered by then decides;
  zero answers fall back to today's single-model gate. Verdict cached per message.
- Metered like routing calls today (`PaygSurface.ROUTING`), or platform-absorbed (§8 Q2).
- Answering models can ask for more research mid-answer through a `request_research` tool (extends the existing
  tool loop) with a per-turn budget, and Judge/Critic in Threads can reopen research up to N passes.

## 4. Delivery batches (each one shippable, behind flags, measured before the next)

| #   | Batch                                                                                                                                                                                                                                                    | Main seams                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| B1  | Foundations: evidence store (sessions, sources, claims tables), provenance fields, per-thread research reuse, web-evidence untrusted fence, search-result cache in Redis, breaker state in Redis                                                         | research-service prisma + `evidence-bundle.types.ts`, chat `research-gateway.utility.ts` |
| B2  | Orchestrator rounds + query expansion + depth L0-L3 + gap check + stop rules + real progress counters + chat cancel                                                                                                                                      | `ResearchManager.run()` wrapped by a round loop; narration kinds                         |
| B3  | Multilingual queries and retrieval + platform registry (table + admin) + academic/technical adapters (OpenAlex, Semantic Scholar, PubMed, Crossref, arXiv, Stack Exchange, HN Algolia, GitHub) + social via site-scoped search                           | `search-adapter.factory.ts`, new registry module                                         |
| B4  | Harness council for need / depth / plan + admin config + latency and cost guards                                                                                                                                                                         | routing assistant-model roles, `ResearchGateService`, `TurnIntentManager`                |
| B5  | Validation and fact-checking: source scoring, syndication clustering (content hash / simhash), contradiction queries, evidence statuses, claim graph and timelines, citation verification (URL + quote)                                                  | evidence store, Threads `validateCitations`                                              |
| B6  | Media research: captions first, speech-to-text fallback (budgeted), timestamps on claims; cross-site crawl frontier with priority and content-hash dedupe                                                                                                | live-service yt-dlp + file-service transcription seams, `SiteCrawlManager`               |
| B7  | Model-requested research everywhere (`request_research` tool), Threads authors research, Judge/Critic reopen research, shared workspace per job                                                                                                          | chat tool loop, TG `generation-pipeline.manager.ts`                                      |
| B8  | Admin and observability: research cost per user and per Thread, provider health and failure rates (Prometheus/Grafana), depth and budget config, L4-L5                                                                                                   | admin pages, metrics                                                                     |
| B9  | Evaluation and hardening: golden set (≥300 cases, ≥20 languages, topics incl. news, medical, legal, technical, social, historical), automated scorer (judge + citation checker), baseline vs new comparison, load and security tests, production rollout | `scripts/qa-lab/`, CI lane                                                               |

Every batch: unit + integration tests, a Playwright lane, manual API checks with log lines, the 15 QA lanes and a
QA evidence record (rules/60), local first, then production behind its flag.

## 5. Testing programme (what "hundreds of cases" means here)

- Golden set in `scripts/qa-lab/research-eval/`: explicit and implicit research requests in ≥20 languages (Arabic and
  Egyptian Arabic included), with expected research decision, depth, required source types and checkable facts.
- Automated runs against local and production: research-need accuracy, depth fit, source diversity, citation
  validity (URL live + quote present), contradiction discovery, latency and cost per case; baseline (today) vs new.
- Playwright: chat, Compare, Judge, Threads, admin pages; progress counters match server counts; cancel.
- Security: injected instructions inside fetched pages, SSRF and redirect traps, oversized documents, cache isolation.
- Load: concurrent research sessions against the worker pool and provider rate limits.

## 6. Deviations from the brief (policy wins, stated)

- "Hundreds of platforms": a registry that can hold hundreds, filled first with ~30 high-value sources; the rest are
  reached through site-scoped search. Platforms without a lawful free search API (X, Instagram, TikTok, Facebook)
  are read through search engines and public pages only — no login scraping, no CAPTCHA or paywall bypass.
- "1,000+ queries": L5 exists but is off by default and admin-enabled per plan, with a money budget.
- "Hundreds of languages": queries are model-generated in any language; quality is measured on a 20-language set,
  the rest is best-effort and labelled.
- The council never sits inside the request path without a deadline; on timeout the current single-model path
  answers, so no turn becomes slower than the cap.
- Video and audio: autonomous research reads only what a crawler may read (the public watch page: title, channel,
  description, chapters). Caption endpoints are robots-disallowed (YouTube `Disallow: /api/`), so captions and
  speech-to-text run only on media the user explicitly provides (the existing videos and attachment features), never on
  pages research found by itself.

## 7. Risks

Latency (council and rounds), cost (council ×3, L4-L5, transcription), provider rate limits and bans, search-API
spend, evidence-store growth (retention policy needed), and answer quality regressions — each batch ships behind a
flag with a measured before/after.

## 8. Owner decisions (2026-11-27)

1. **Council models**: four Ollama Cloud models by default — `beam` (Reflection Beam 1.0, 501B), `deepseek-v4.1-flash`,
   `mimo-v2.6-flash`, `minimax-m3.1-flash` — editable from the admin page (Smart router → Assistant models), so the
   owner can replace them later. Measured on production through the gate's own call (JSON mode, thinking off, one
   Arabic research question): deepseek 0.8 s, mimo 1.7 s (wraps JSON in a code fence), minimax 2.9 s (cut off at
   400 tokens; also named the wrong CEO), beam 6.5 s (named the right one). The parser strips fences, takes the first
   JSON object and allows longer answers; the deadline covers beam; the merge does not trust one member.
2. **Who pays** (owner did not choose; default, adjustable): the platform absorbs council and research calls within a
   per-plan monthly research budget.
3. **Search spend** (default): no new paid search provider until the owner adds keys; the monthly cap mechanism is
   built with the registry. Production has Ollama Web, SerpApi, Exa and Firecrawl active.
4. **Depth per plan** (default, adjustable per plan): Free up to L2, Starter L3, Plus/Pro L4, Team/Scale L5 with L5 off
   until an admin enables it.

## Open items after the 2026-11-28 batch

- Done (ADR-227): continue a turn when a model only announces a search; carry earlier files, video transcripts and
  earlier sources; tell a plan without research it cannot browse; today's date in every planning prompt.
- Do not let a planner invent a link to crawl (the user's own links only, unless the user names a site).
- Compare, Consensus, Escalation and the labs do not continue a promised search yet.
- Run the large multilingual decision set (2,415 cases built on 2026-11-28) and fix what it finds.
- Compare, Consensus and the labs still plan research from markers.
- Owner action: add an API key to the Ollama Web Search provider (local and production).
