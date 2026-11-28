# ADR-228: Google is in every research run, through SerpAPI, inside a budget

Status: Accepted (2026-11-28) · Research engine · Builds on [ADR-210](adr-210-auto-search-runs-every-enabled-provider-in-parallel.md) (all-provider
search), [ADR-224](adr-224-evidence-store-multi-query-and-research-rounds.md) (multi-query, rounds, the cost rule) and
[ADR-225](adr-225-research-platform-registry.md).

## Context

The owner ordered that Google must always occur in any search, and that results are fetched from Google even 100s of pages
deep.

Google already reaches research through one door, the enabled and keyed `SERPAPI` search provider (`engine=google`), and it
answers fine in production. But it was reached too rarely and too shallowly:

- Google ran on the primary query of round 1 only. Expansion queries (other sub-questions, other languages and scripts)
  and every query of rounds 2+ run on "expansion providers" only (ADR-224's cost rule: no new paid search spend), so Google
  never saw a follow-up query or a query in another language.
- Only the first results page was read. Google no longer honours `num=100`; deeper results need SerpAPI's `start`
  parameter, 10 results per page, one paid SerpAPI search per page.
- The query language was never sent (`hl`), so a query in German or Arabic was answered with the account default interface
  language and country mix.

## Decision

1. **One door.** Google reaches the pipeline only through the `SERPAPI` provider. We do not scrape google.com, and we do not
   use Gemini "grounding with Google Search": its terms allow grounded results to be shown unchanged to the asking user
   only. They may not be cached, analysed or used to crawl, and this pipeline caches (Redis search cache, evidence
   store), analyses (fusion, content hash, council gap check) and crawls from search results. Grounded output is therefore
   never fed into it.
2. **A Google budget per run, by depth** (`RESEARCH_GOOGLE_BUDGETS`, beside the depth budgets; an absent depth is depth 0):

   | Depth | Google queries per run | Result pages of the primary query | Paid SerpAPI searches, round 1 | Follow-up round (>= 2) |
   | ----- | ---------------------- | --------------------------------- | ------------------------------ | ---------------------- |
   | 0     | 1                      | 1                                 | 1                              | 1                      |
   | 1     | 1                      | 1                                 | 1                              | 1                      |
   | 2     | 2                      | 1                                 | 2                              | 1                      |
   | 3     | 3                      | 2                                 | 4                              | 1                      |
   | 4     | 4                      | 3                                 | 6                              | 1                      |
   | 5     | 6                      | 5                                 | 10                             | 1                      |

   Searches in round 1 = queries + pages - 1 (page 1 is the primary call itself).

3. **What Google is asked.** Round 1: the primary query on every provider as before (ADR-210; SerpAPI answers page 1),
   the best expansion queries up to the budget, and pages 2..N of the primary (SerpAPI `start` = 10, 20, ...) in parallel,
   each bounded by the provider timeout. "Best" means a query in another script than the primary first (Arabic or Chinese
   finds pages an English query cannot), then the order given; script is read from Unicode letters, so two languages in one
   script are not told apart. A Google expansion runs on the expansion providers plus Google; every other query, and every
   platform site search, runs on expansion providers only. Follow-up rounds (>= 2): Google answers the round primary query,
   one call, so Google always occurs; no expansions, no pages. Every other paid provider keeps the cost rule exactly: the
   round-1 primary, once per turn.
4. **Admin override, DB-level, no new environment variable.** On the SERPAPI provider `publicConfig`:
   `googleMaxQueriesPerRun` (integer 0-20) and `googleMaxPages` (integer 1-10). A valid value replaces the table value as the
   cap for depths >= 3 and only caps it below depth 3, so a shallow turn never gets dearer than the default. Invalid values
   are ignored by the run and refused by the provider create/update DTOs. `0` queries switches Google off for research
   runs. `publicConfig.expansion` no longer applies to SERPAPI in research runs: the budget is its one control. The admin
   platform test and `POST /research/search` are unchanged.
5. **`hl`.** `filters.language` (only when it matches `^[a-z]{2,3}$`) is sent as SerpAPI `hl`; `zh` and `he` go as `zh-cn`
   and `iw`, the codes SerpAPI lists for them.
6. **Cache and metering.** The Redis search cache key carries the page (`|start=<n>`) and the language (`|lang=<code>`,
   which is the `hl`), so pages and languages never collide. A real SerpAPI call records one `WEB_SEARCH` unit; a cache hit
   records none.
7. **Failures and the breaker.** A failed page is one bundle warning; a skipped (breaker open) or empty page is silent;
   no page fails the run. An open breaker skips Google like any provider; a budget-added Google call that would be the only
   provider asked is not made while the breaker is open, so a failing paid API is not hit once per page.
8. **Fusion.** The primary and its pages are one rank list: a URL on several pages counts once, at its first rank, and a
   page ranks continue below the ranks above it (page 2 starts at rank 11), so deep pages add recall without drowning the
   other queries.
9. **Observability.** One log line per search run: `google: queries=<n> pages=<n> results=<n> depth=<d> round=<r>`. Counts
   only, never a query.

## Consequences

- **Cost.** Every Google query and every page is one paid SerpAPI search. At the defaults a depth-3 turn (the deepest chat
  sends today, three rounds) costs 4 + 1 + 1 = 6 SerpAPI searches where it cost 1; a depth-5 round costs up to 10. The
  override can raise a depth >= 3 run to at most 29 by arithmetic (20 queries + 10 pages - 1), in practice 22 (13 queries
  from the 12-query wire cap, plus 9 extra pages). `WEB_SEARCH` has no plan limit today, so nothing is refused or charged to
  users: the cost is the operator SerpAPI plan. Set `googleMaxQueriesPerRun` and `googleMaxPages` low, or `0`, to cut it.
- **Time.** All Google calls run in parallel with the rest of the search phase and are bounded by the provider timeout
  (AUTO ceiling 20 s), so the search phase does not get longer. `fetchTopN` at depth 4 and 5 stays 16 and 20: the fetch
  phase is capped at 30 s for 6 pages at a time, chat grants a whole run 60 s (36 s of it for fetching), and chat clamps
  depth to 3 until per-plan budgets (B8), so there is no measured room for 20 and 24.
- **Burst.** A depth-5 round can send up to 10 SerpAPI requests at once. If the SerpAPI plan rate-limits bursts, three
  consecutive failures open the breaker for 30 s; lower `googleMaxPages` then.
- **Not verified live.** SerpAPI is mocked in every test (it is paid). An `hl` code SerpAPI does not list would fail that
  query; the two known differences are aliased. Read the first production runs through the `google:` log line.
- **Page 1 still goes through the ADR-210 merge**, which keeps the best `maxResults` across all providers, so some of
  Google positions 4-10 can be cut while pages 2+ are kept whole. Raising `maxResults` for deep runs would close it.
- Compare, Consensus, Escalation and the labs still reach research through their own path (rule 59 gap, ADR-224): they do
  not send depth or rounds, so they get Google as today (the primary, page 1).

## Alternatives rejected

- Scraping google.com: against Google terms and fragile. Gemini grounding: its terms (above) forbid what the pipeline does
  with results. Raising `num`: Google ignores it. Running every expansion on Google: cost grows with the length of the
  question with no cap, so the budget picks the best few.
