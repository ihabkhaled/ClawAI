# ADR-091: A URL the user writes is opened, not searched for

- **Status**: Accepted
- **Date**: 2026-09-10
- **Deciders**: Platform / Backend
- **Related**: [rules/41](../../rules/41-web-evidence-truthfulness.md) ·
  [service-guide-research](../04-backend/service-guide-research.md) ·
  [audit section E](../14-risk-debt/chat-pipeline-audit-2026-09.md)

## Context

**ClawAI had no "read the URL the user pasted" capability.** Not a broken one —
no code path anywhere took a URL out of a prompt and fetched it.

That was not for want of a fetcher. `FetchService.fetchPage` is real, with an
SSRF guard, a domain policy, a cache and a structured result. `ScrapeService`
has article, docs, table and generic-HTML extractors. `POST /research/fetch` is
a live route. All of it was wired **exclusively downstream of a keyword
search**: every caller fed it URLs the search engine had returned.

So `summarize https://example.com/post` became a keyword query that happened to
contain a URL. Measured on 2026-09-10, that prompt returned an Adobe product
page, a Facebook group post and a Medium tutorial — and never opened the link.

Two further defects compounded it into the reported symptom, which was an answer
saying "I can't browse the web" underneath a badge reading "Used 4 sources":

- The prompt's capability statement was attached only when evidence or warnings
  existed. A run that failed cleanly produced neither, so the model was told
  nothing and refused from its training prior. **The refusal was loudest exactly
  when research had failed.**
- Evidence arrived with no provenance. `toolsUsed` was populated and streamed to
  the UI but never printed into the prompt, so the model could not tell a page
  it had been handed from a search snippet about that page.

## Options considered

**Give the model a fetch tool and let it decide.** Rejected. The main chat path
has no tool loop at all — the only one is Ollama-Cloud-specific — so this is a
large build, and it makes a product capability depend on whether a particular
model remembers it has a tool. A user who pastes a link has already decided.

**Detect the URL in chat-service and call `/research/fetch` from there.**
Rejected. It fixes one of two orchestration paths (compare and the nine
orchestration modes go through a different manager), and it puts a second fetch
caller outside the pipeline that owns tracing, usage recording and the evidence
bundle.

**Detect the URL inside the research run pipeline, before the search step.**
**Chosen.** One place, both paths, and `FetchService` gains a caller rather than
a rival.

**Auto-enable research when a prompt contains a URL.** **Deferred, deliberately.**
It is the obvious next question and it is not ours to answer: research is gated
by the `allowResearchMode` plan feature and the `RESEARCH_USE` permission, so
turning it on because a link appeared would change what a plan grants. Recorded
here so it is decided rather than drifted into.

## Decision

- `detectUrlsInText` runs over `dto.intent` at the start of a research run.
  Absolute `http`/`https` only; `javascript:`, `data:`, `file:` and `vbscript:`
  are rejected explicitly rather than by accident; trailing sentence punctuation
  is trimmed; at most `DIRECT_FETCH_MAX_URLS` (3) are opened.
- Those pages are fetched **before** the search step, through `FetchService`,
  and recorded as `web_fetch:user_url` with `fetch.direct` trace entries.
- They take `DIRECT_FETCH_CONFIDENCE` (1), so the bundle's confidence sort and
  item cap cannot discard the page the request was about.
- A URL already fetched directly is excluded from the post-search fetch, so no
  page is opened twice in one run.
- In a `SEARCH_ONLY` workflow nothing is fetched and a warning names the URLs
  that were not opened.
- `AssembledContext` gains `researchRequested` and `researchToolsUsed`. The
  research block is emitted whenever research was **requested**, and it names
  the tools that ran.

## Consequences

**Good.** The page a user names is the first thing the answer is grounded in.
A failed web step is now stated instead of being filled in by the model's prior.
The model can tell a fetched page from a snippet about it. Both orchestration
paths benefit, because the change is in the shared pipeline.

**Bad, and accepted.**

- **A run can now cost up to three extra fetches.** Bounded by
  `DIRECT_FETCH_MAX_URLS`, which equals `EVIDENCE_FETCH_TOP_N`, so a run that
  opens the user's links costs no more than one that opens the search engine's.
  A prompt full of links still pays for three.
- **Pasting a link in `SEARCH_ONLY` produces a warning rather than an answer
  from that page.** That is the honest behaviour for a mode the user chose, and
  it will read as a limitation. The alternative — quietly fetching — changes
  what a search-only run costs without asking.
- **A private or blocked URL now surfaces its failure to the user.** Previously
  it failed invisibly, because it was never attempted. More visible failure is
  the point, but it is more visible failure.
- **The prompt grew.** The tool line and the failure wording spend tokens on
  every research turn. They are short, and the thing they prevent is an answer
  that is wrong about its own sources.
- **Search still runs even when every URL was supplied.** A prompt is rarely
  only a link, and the surrounding question often needs search. A future
  refinement could skip search when the prompt is a bare URL plus a read verb;
  the verb list (`summarize`, `read`, `fetch`, `scrape`, `tldr`) already exists
  as dead scaffolding in routing-service.

## Revisit when

- The plan question above is answered and research can auto-enable on a link.
- A bare-URL prompt is common enough that skipping search is worth the branch.
- A second consumer needs URL detection, at which point it belongs in a shared
  package rather than in research-service's `common/`.
