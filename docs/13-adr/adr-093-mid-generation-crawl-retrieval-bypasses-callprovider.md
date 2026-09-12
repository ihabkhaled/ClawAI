# ADR-093: Mid-generation crawl retrieval bypasses the `callProvider` chokepoint

- **Status**: Accepted
- **Date**: 2026-09-12
- **Deciders**: Platform / Backend
- **Related**: [ADR-092](adr-092-site-crawl-reuses-fetchservice-no-new-fetch-path.md) ·
  [rules/28](../../rules/28-billing-integrity-and-api-contracts.md) ·
  [service-guide-chat](../04-backend/service-guide-chat.md)

## Context

A `SITE_CRAWL` run folds every crawled page's full content into the prompt up
front. On a real site this is a lot of text for one turn — auditing
simonwillison.net (20 pages, the crawl's own cap) produced a response the
model's own context window could not finish; the UI showed "Response
truncated... the context window was full." Dumping everything in up front is
also wasteful when the model only needed to look closely at two or three of
those twenty pages to answer the question actually asked.

The fix the spec called for is a retrieval tool: let the model ask for one
specific crawled page in full, instead of forcing every page into the initial
prompt whether the model ends up using it or not.

Investigating where to wire this in surfaced a much bigger finding than
"attach a tool definition." `runOllamaCloudToolLoop` — chat-service's only
real multi-turn agentic loop, complete with transcript, iteration cap, total
timeout, and a graceful wrap-up — had **zero production callers**. Every real
Ollama Cloud completion went through the single-shot `callCloudProvider`
path; the loop existed fully built and fully tested, entered only from test
files. Similarly, `ExecutionOptions.toolCatalog` (the generic Runtime V2
"native tool calling" transport) had never been populated by anything on the
ordinary chat path — `chat-messages.service.ts` never reads
`LlmResponse.toolCalls` at all, so a model that called a Runtime-V2-catalog
tool on this path today would just get an unanswered turn. Both were real,
tested scaffolding that a prompt-pack audit would have to call "present, not
wired."

## Decision

**Reuse `runOllamaCloudToolLoop`, wired in for the first time, for Ollama
Cloud only.** The loop already does everything a retrieval tool needs
(attach tools, dispatch a call, feed the result back, loop until the model
stops asking) and is already tested. Building a second, provider-agnostic
loop on top of the still-unused Runtime V2 transport would be a much larger
and riskier undertaking for the same feature; this ships the capability for
the one provider where the execution engine already exists, and leaves the
OpenAI/Anthropic native-tool-calling gap exactly where it was — a separate,
larger decision, not silently expanded by this one.

**`get_crawled_page` is resolved from memory, not the network.** The pages a
completed SITE_CRAWL run fetched are already sitting in
`metadata.research.bundle.items` on the triggering user message — the exact
field `synthesizeTranscriptFromBundle` already reads to build the FE
transcript. `ChatMessagesService.extractCrawlRetrieval` reads the same field
into a `CrawlRetrievalContext` and passes it into `execute()` as a new,
explicit fourth parameter — not a new field on the RabbitMQ `message.routed`
payload, because `runLlmAndStore` already has the data in scope at the exact
call site; there was no async boundary left to cross. Resolving a page this
way costs nothing further: research-service already metered the crawl that
produced it.

**The insertion point bypasses `callProvider` entirely, on purpose.**
`runOllamaCloudToolLoop`'s own doc comment states the constraint plainly:
"a caller must NOT reach this loop through `callProvider`/`streamCandidate` —
the chokepoint's hold would cover the same completions a second time." The
loop takes its own PAYG hold per turn (`<run>:turn:<n>`) and settles each one
against that turn's own usage; `callProvider` takes ONE hold before dispatch.
Going through both would bill the same completion twice. `invokeProviderWithProgress`
now checks — before the streaming decision, since Ollama Cloud is otherwise
streamable — whether the candidate is `OLLAMA_CONNECTOR_PROVIDER` with a
non-empty `crawlRetrieval`, and if so calls the new `runOllamaCloudRetrievalTurn`
directly. That method redoes the two things `callProvider`/`dispatchProvider`
would otherwise have done for it — `assertExposedForExecution` (the security
gate every candidate must pass) and `recordChokepointUsage` (the daily
token-allowance record every completion must leave) — and nothing else,
because the loop's own per-turn `reserveCredit`/`finalizeCredit` already
covers the money.

**Buffered with a heartbeat, not streamed.** Ollama Cloud is normally
streamable, but the agentic loop needs each turn's full response to see
`tool_calls`, which a token-by-token stream does not expose the same way.
This is not a new degraded UX: it is the exact same buffered-plus-heartbeat
path every non-streamable candidate (image/file generation, or a test
harness with no streaming executor wired) already uses.

**No behavior change for every workflow except SITE_CRAWL.**
`extractCrawlRetrieval` returns `undefined` unless the triggering message's
research `mode` was literally `'SITE_CRAWL'` — a search-only or
search-then-fetch run's items are already fully in the initial prompt, so
there is nothing further worth letting the model ask for, and `execute()`'s
new fourth parameter defaults to `undefined` everywhere else (compare, judge,
Runtime V2, every existing call site).

## Consequences

**Good.** A real, tested, production-wired mid-generation retrieval tool
exists for Ollama Cloud SITE_CRAWL turns, directly fixing the context-overflow
failure mode a live end-to-end test reproduced against simonwillison.net.
Billing correctness is provable per-call: a dedicated test asserts exactly
one `reserveCredit` call for an ordinary single-shot completion and exactly
two for a two-turn retrieval exchange — never one hold covering two
completions, never two holds covering one.

**Bad, and accepted.**

- **Ollama Cloud only.** OpenAI, Anthropic and Gemini candidates never see
  `get_crawled_page`, even when their turn has `crawlRetrieval` available —
  `tryRunCrawlRetrievalTurn` checks `OLLAMA_CONNECTOR_PROVIDER` explicitly.
  Extending this to other providers means building the loop equivalent for
  the Runtime V2 transport those providers already use for tool
  transport-only — real, separate, larger scope.
- **No streaming for a retrieval turn.** The heartbeat is honest ("still
  working"), not live token output — matching every other non-streamable
  path today, but a regression in liveliness relative to an ordinary Ollama
  Cloud answer.
- **One page per call, chosen by the model from a URL list in the tool's own
  description.** No search-within-page, no fuzzy URL matching — an
  off-by-one-character URL from the model is a lookup miss, reported back to
  the model as an error listing the exact available URLs so it can retry.

## Revisit when

- OpenAI/Anthropic native tool-calling gets a real multi-turn execution loop
  of its own — `get_crawled_page` becomes eligible for those dialects too.
- A retrieval turn needs live output badly enough to justify teaching
  `provider-stream-executor.manager.ts` to parse `tool_calls` out of a
  stream instead of requiring a buffered response.
- A crawl regularly produces enough pages that "one page per call, exact URL
  match" becomes the wrong shape — e.g. a fuzzy match or a
  search-within-crawled-pages tool instead of exact retrieval.
