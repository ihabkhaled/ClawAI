# ADR-224: Evidence store, multi-query research and research rounds

Status: Accepted (2026-11-28) · Research engine batches B1+B2
([plan](../implementation/autonomous-research-engine-plan.md)) · Builds on
[ADR-223](adr-223-harness-council-decides-research.md) (council), ADR-210 (all-provider search), ADR-211 (parallel
fetch batches).

## Context

A research turn ran ONE search query and fetched up to eight hits, whatever the question. The council (ADR-223)
already produced a depth level, languages and up to six sub-questions per turn, but only the first sub-question was
used, and its page budget (`maxPages`) was read by site crawls only, so a council "depth 3" changed nothing about a
search. Evidence lived only as JSON on `ResearchRun.bundle`: no per-source provenance, nothing a follow-up in the same
thread could reuse, and fetched web text reached the answering model unfenced while tool, file and cross-thread
content was already fenced as untrusted.

## Decision

1. **Web evidence is untrusted data.** Every fetched source a model reads (the research block on every chat surface,
   search-first, the `web_search` / `web_fetch` / `get_crawled_page` tool results, the planner's crawl summary and the
   gap check's evidence) is wrapped in `<web_source n=".." url=".." trust="untrusted">` after hostile characters
   are stripped and any closing tag is defanged; the system text says such blocks are data, never instructions.
   `[n]` numbering and stored citations are unchanged.
2. **Evidence store.** research-service records one `ResearchSource` row per evidence item (url, canonical key,
   host, title, excerpt ≤ 12,000 chars, sha256 content hash, query, round, how it was discovered, provider, fetch
   status, dates, score). `ResearchRun.threadId` links a run to its chat thread. Rows older than 30 days are deleted
   hourly.
3. **Thread memory.** A run with a `threadId` reuses this thread's last 24 h of sources: a page already read is not
   fetched again, and up to three earlier sources that clearly match the new question are offered again.
4. **Depth sizes the run.** `depth` 0-5 selects a budget (total queries 1/2/4/6/10/14; hits fetched
   8/8/8/12/16/20). chat-service clamps depth to 3 until per-plan depth config lands (B8); a plan without a council
   verdict searches at depth 1, which reads as many pages as before.
5. **Query expansion without new spend.** The first round's primary query keeps ADR-210's all-provider search. The
   council's other sub-questions, and every query of rounds 2+, run in parallel on expansion providers only
   (`OLLAMA_WEB`, `SEARXNG` by default; `publicConfig.expansion` overrides), so a paid provider sees one call per turn. Hits merge by canonical URL with reciprocal-rank fusion; each item keeps the
   query that found it. Identical page text (syndicated copies) is dropped by content hash.
6. **Search cache.** Merged all-provider and expansion results are cached in Redis for 10 minutes (key = hash of
   normalised query, providers and size). A hit calls no provider and records no `WEB_SEARCH` unit.
7. **Rounds.** After the first search at depth ≥ 2, the gate's model chain is asked what is still missing; its
   queries run as the next round (pages already read are excluded). Depth 2 allows 2 rounds, depth 3 allows 3. A
   round starts only while 20 s of a 60 s research budget remain (measured: a round takes 10-25 s; a third round
   started with 8 s left ran research to 56 s). Research ends on "done", no new queries, a round that added nothing,
   the round cap, the budget, or the user's Stop; evidence already gathered is kept. A Stop during research also
   stops the answer that follows: research leaves a 20 s Redis marker the answer's registration consumes, because the
   answer may run on another replica.
8. **Real counters.** `bundle.stats` (round, queries run, languages, providers used, results, pages read, duplicates
   removed, reused from thread, cached searches) feeds the narration's numbers.

## Consequences

- Deeper turns read more pages and run more queries; paid providers still see one call per turn (round 1's primary
  query), so search spend is unchanged by expansion and rounds. Fetch volume grows with depth and is bounded by the 30 s phase
  deadline and the 96,000-char evidence budget.
- Old callers (threads-service) send none of the new fields and get today's behaviour.
- The evidence store grows by roughly the number of evidence items per research turn; 30-day retention bounds it.
- Claims, entities and timelines (the rest of the evidence graph) arrive with validation in B5.
- Compare, Consensus, Escalation and the labs still decide AUTO research from markers through their own research
  path (rule 59 known gap): they get the fence, not the council plan or rounds, until the orchestrator serves them (B7).
- Measured locally (2026-11-28): a depth-3 phone comparison ran 3 rounds (6 + 4 + 2 queries, 48 + 28 + 10 results,
  32 pages) and answered with 50 citations; a repeated depth-3 run in the same thread came back in 67 ms (4 cached
  searches, 11 pages reused).
