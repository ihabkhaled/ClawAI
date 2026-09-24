# 41 — Web Evidence Truthfulness

## Purpose

The platform must never claim to have done something on the web that it did not
do, and must never stay silent about a web step that failed.

This rule exists because ClawAI shipped both failures at once, and they
compounded. A user pasted a URL and asked for a summary. The answer said "I
can't browse the web" — underneath a badge reading "Used 4 sources". Neither
half was a bug in the model. **The count came from the search, the refusal came
from the missing capability statement, and neither knew about the other.**

## Applies to

- `claw-research-service` — the run pipeline, the evidence bundle, the trace.
- `claw-chat-service` — the research block in the assembled prompt, the
  transcript emitted over SSE, the message metadata.
- Any frontend surface that reports what research did.

## Mandatory rules

1. **A URL the user wrote is OPENED, not searched for.** (Since 2026-09-19 that
   includes a link written without a scheme — `example.com/pricing` — via the
   shared detector; see [rule 50](50-agentic-research-loop-and-narration.md).) `detectUrlsInText`
   runs over the intent before the search step, and the resulting pages are
   fetched directly through `FetchService`. Until 2026-09-10 there was no such
   step anywhere: `summarize https://example.com/post` became a keyword query
   that happened to contain a URL, and the page was opened only if the search
   engine happened to return it. A run measured on 2026-09-10 returned Adobe,
   Facebook and Medium pages for that prompt and never opened the link.

2. **A page the user named outranks anything discovered.** The bundle sorts by
   confidence and then caps the list, so a pasted link scoring like a search hit
   can be trimmed out of the very bundle it was the point of. It takes
   `DIRECT_FETCH_CONFIDENCE`.

3. **Never open a page in a workflow the user did not choose.** `SEARCH_ONLY`
   was selected and priced as a run that does not fetch. A pasted link there
   produces a **warning naming the URL and saying it was not opened** — not a
   silent fetch, and not silence.

4. **Every failure becomes a warning, never silence.** A research run that
   failed cleanly used to produce zero evidence AND zero warnings. Downstream,
   the model is told browsing happened only when one of those is non-empty — so
   the moment the web broke was exactly the moment the model was told nothing
   and refused from its training prior. **The refusal was loudest precisely when
   research had failed**, which is when the user most needs the truth.

5. **The capability statement is triggered by REQUESTED, not by PRODUCED.**
   `AssembledContext.researchRequested` exists for this. When research ran and
   produced nothing, say the attempt was made and did not succeed. Silence is
   filled with a refusal; the capability line alone is filled with invention.

6. **Evidence carries provenance.** `researchToolsUsed` is printed into the
   prompt. Without it a model cannot distinguish a page it was handed from a
   search snippet ABOUT that page, and writes "according to the article" over a
   snippet it never read. `web_fetch:user_url` is called out separately, because
   "was MY page opened?" is the question a user pasting a link is really asking.

7. **A count of sources counts what was READ, not what was found.** Any number
   shown to a user must be derived from the items that actually produced
   content. "Used 4 sources" over four discovered links and zero fetched pages
   is a false statement about the platform's own behaviour.

8. **A panel that reports on the platform never guesses.** A count that was not
   measured is not shown. Messages written before a measurement existed fall
   back to a neutral wording rather than a retroactive claim, and a badge with
   no data is hidden rather than rendered as `0` — a zero reads as a
   measurement, which is exactly how "0 searches / 0 fetches" came to sit under
   "Used 4 sources" with all three numbers wrong.

9. **A provider the user picked is the provider that runs, and the transcript
   records the one that ANSWERED.** The choice was dropped in two independent
   places — the compare call site never read `dto.researchProviderId`, and
   `enrichForOrchestration` received it and did not pass it to `enrich` — while
   the transcript went on recording the request. The UI named a provider that
   never executed. Forward the id, and build the transcript from the run's
   reported `providerId`/`providerName`, falling back to the request only when
   the run reported none. A fallback is not a failure, but it is a different
   answer than the one asked for, so it becomes a warning.

10. **An INTENT is not a QUERY.** A search provider takes a query and 500
    characters is a real limit there; a user writes a prompt, routinely longer.
    Capping the intent at the query limit meant a long message 400'd the whole
    run, chat-service swallowed it to `null`, and no transcript and no warning
    were produced — **research was silently disabled by writing a long
    message**, which then triggered rule 4's refusal. Accept the intent whole,
    detect URLs from all of it, and clamp only the derived query, with a
    warning.

11. **Say it again where the model is looking.** A correct pipeline is not a
    correct answer. Measured 2026-09-11: a run with **eleven evidence items in
    the prompt**, the capability statement present and `web_fetch:user_url`
    among the tools, still produced "I am sorry, but I cannot access external
    websites" from `gemini-2.5-flash-lite`. Nothing was broken — the
    instruction sat in front of the memories and the whole conversation, and a
    small model attends to the end of the prompt, where a very strong training
    prior about having no internet access was the loudest thing left.

    `RESEARCH_GROUNDING_REMINDER` is therefore appended to the **final user
    turn** whenever evidence or a warning exists, on both the provider-message
    path and the single-string path. It is short, it is marked as not written
    by the user, it is never persisted, and it is never appended twice. With
    it, the same model on the same prompt answered from the page and cited it.

    The general form: **when a model must be told something, distance from the
    question is a bug.** Verify the behaviour, not the plumbing — `block=true`
    in the assemble log meant the evidence was there and the answer was still
    wrong.

12. **Never weaken the fetch security boundary to make more sites work.**
    Direct fetching adds a CALLER to `FetchService`, not a second path. The SSRF
    guard, the domain policy and the cache stay where they are. A page that the
    policy refuses produces a warning; it does not produce an exception to the
    policy.

    **A private address is reachable only when the operator named the host.**
    `HttpFetchAdapter` passed `allowPrivateHosts: true` unconditionally, reasoned
    as "self-hosted deployments may legitimately fetch internal resources". That
    was defensible while every URL came from a search provider and indefensible
    the moment a user's own URL reached the same code — it accepted
    `http://127.0.0.1:4001/…` and service names on the internal Docker network,
    fetched them, and put the body in a model's prompt. The gate is
    `RESEARCH_DOMAIN_ALLOWLIST`: deny-by-default, already exists, and grants one
    host rather than the whole private network.

    **Cloud metadata is refused even then.** It is checked before the
    private-host branch, so no configuration can unlock it.

    **Re-check the URL after redirects.** `fetch` follows them, so the
    pre-flight check proves nothing about where the body came from: a public
    page that 302s to `169.254.169.254` passes the first check and must fail the
    second.

    **Syntax is not the whole defence, and the gap is written down.** The guard
    does not resolve DNS, so a hostname an attacker controls can point at
    loopback. That is TD-031, not a secret.

13. **Head metadata read from a plain fetch is "not present in this markup",
    never "verified absent" — unless a headless render actually ran.**
    `extractHtml` (`common/utilities/html-extract.utility.ts`) reads
    canonical, hreflang, meta robots, Open Graph, Twitter card and JSON-LD
    straight out of the raw response bytes — no JavaScript execution. A page
    whose canonical tag, or an entire meta-tag block, is injected
    client-side will report `null`/empty here even though a browser would
    show it. `HtmlMetadata`'s own doc comment says this explicitly. A
    finding built from PLAIN-fetch data ("no canonical tag") is only true of
    the markup actually fetched; do not upgrade it to a claim about the live
    rendered page without a rendered-DOM fetch to back it.

    **Done 2026-09-12**: that rendered-DOM fetch now exists —
    `HeadlessFetchAdapter` (ADR-094), a `FetchService`-internal fallback for
    a plain fetch whose extracted text looks client-side rendered. A result
    with `renderedWithHeadlessBrowser: true` genuinely did run the page's own
    JavaScript before extraction, so absence in ITS metadata is a stronger
    claim than absence in a plain fetch's — check the flag before deciding
    which sentence a finding is allowed to make.

    Every request the rendered page makes is checked against the SAME
    anti-SSRF guard the plain path uses (`assertSafeOutboundUrl`, shared via
    `isHostExplicitlyAllowlisted`) — a rendered page's own JavaScript can
    issue a subrequest a plain GET never could, so the boundary from item 12
    has to hold for those too, not just the top-level URL.

14. **An orchestration lane (compare, consensus, escalation) gets the SAME
    grounding defences a single chat turn gets, not a weaker copy of them.**
    Those three modes never call `ContextAssemblyManager.assemble()` with a
    research option; they merge `ResearchEnricherManager`'s evidence into
    `context.systemPrompt` as raw prose through the one shared
    `injectResearchEvidenceIntoContext` (`utilities/research-prompt.utility.ts`
    — do not reintroduce a per-manager copy). That function sets
    `AssembledContext.researchGroundingInjected = true` whenever it merged
    real evidence, purely so `hasResearchGrounding()` still fires and item
    11's final-user-turn reminder still gets appended — without it, three
    modes silently ran with evidence sitting only in the system message,
    the exact shape item 11 measured as insufficient. It does **not** feed
    `formatResearchBlock`'s own trigger: that block renders
    `researchEvidence`, which orchestration lanes never populate, and would
    print a contradictory "NO usable web evidence" block over real prose
    evidence.

    `RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION`
    (`constants/research-grounding.constants.ts`) is the one "do not invent
    facts/numbers/prices/dates/URLs/citations not in the evidence" line
    both `ContextAssemblyManager.formatResearchBlock` (single chat) and
    `ResearchEnricherManager.buildEvidenceBlock` (every orchestration mode)
    emit in their always-present preamble, not only an empty-evidence
    branch. One constant, both builders — it drifted apart once already.

    Consensus's synthesis step must not silently launder a confident,
    zero-citation fabrication over a lane that honestly reported no
    evidence. `ConsensusExecutionManager.selectBestResponse` prefers the
    response with the most `[n]` citation markers over the longest response,
    but ONLY when this run actually had research evidence — an uncited run
    (no web question asked) keeps the plain longest-response fallback. See
    [ADR-118](../docs/13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md).

15. **The 7 lab modes (repair, decompose, best-of-n, cost-ensemble, verifier,
    pipeline, role-pack) get the same grounding defences too, through the
    same shared function as item 14 — not a raw-string equivalent of it.**
    All 7 route through `ChatContextGatewayManager.build()` +
    `ModeExecutionGatewayManager.run()` → `ChatExecutionManager.callProvider`,
    the identical chokepoint chat, compare, consensus and escalation use, so
    the turn-based message list (`buildChatMessages`/`buildGeminiChatMessages`)
    for a cloud provider — or `buildPromptString` for local Ollama, exactly as
    a normal chat turn on Ollama gets — already exists for these modes; there
    is no separate "flat orchestration prompt" shape left to give a
    raw-string reminder to.

    Each of the 7 calls `ResearchEnricherManager.enrichForOrchestration` and
    must pass the result to `ChatContextGatewayManager.build()` as
    `researchEvidenceInstruction`, never as `personaInstruction`. Only
    `researchEvidenceInstruction` is routed through
    `injectResearchEvidenceIntoContext` (item 14's function) inside `build()`,
    which sets `researchGroundingInjected`; `personaInstruction` is a plain
    concat with no grounding flag, reserved for mode-specific personas
    (a repair rubric, a planner instruction, a role-pack member's persona, a
    pipeline stage's instruction) that are layered on AFTER the evidence
    merge, via each manager's own local `withPersona` — those are additions
    to how the model should behave, not evidence it must not contradict, and
    do not set the flag. Passing research evidence through
    `personaInstruction` is the exact defect item 14 fixed for
    compare/consensus/escalation, reintroduced in a different call shape: the
    evidence text still reaches the model, but `hasResearchGrounding()`
    returns `false` and item 11's final-user-turn reminder silently never
    fires. See ADR-118's 2026-09-24 update.

## Prohibited patterns

- Passing a prompt containing a URL to a search engine and calling the result
  "the page".
- A capability statement conditional on evidence existing.
- Swallowing a research failure to `null` with no warning and no trace entry.
- A source count, badge or transcript field populated from search hits when it
  is labelled as pages read.
- Hardcoded zeros in a transcript that a user reads as a measurement.
- A second fetch path that bypasses `FetchService`.
- A per-manager copy of the evidence-into-systemPrompt merge instead of
  `injectResearchEvidenceIntoContext` — the last time this existed (three
  copies, none setting the grounding flag), the final-user-turn reminder
  silently never reached compare, consensus or escalation.
- Passing research evidence to `ChatContextGatewayManager.build()` as
  `personaInstruction` instead of `researchEvidenceInstruction` — the last
  time this existed (all 7 lab modes), the evidence text still reached the
  model but `researchGroundingInjected` was never set and the
  final-user-turn reminder silently never fired for any of them.
- A synthesis/judge step that treats a zero-citation lane as equally
  trustworthy as a cited one when the run had web evidence.

## Enforcement

| Mechanism            | What it checks                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test**        | `apps/claw-research-service/src/common/utilities/__tests__/url-detection.utility.spec.ts` — what counts as a fetchable URL, including every rejected scheme.                                                                                                                                                                                                                                |
| **Unit test**        | `apps/claw-research-service/src/modules/research/managers/__tests__/research.manager.spec.ts` — the pasted URL is fetched, outranks search, is never fetched twice, warns by name on failure, and is skipped in SEARCH_ONLY with a warning.                                                                                                                                                 |
| **Unit test**        | `apps/claw-chat-service/src/modules/chat-messages/__tests__/context-assembly.manager.spec.ts` — the capability statement appears for a requested-but-empty run, is absent when research was never requested, and names the tools that ran.                                                                                                                                                  |
| **Unit test**        | `apps/claw-research-service/src/common/utilities/__tests__/html-extract.utility.spec.ts` — canonical/hreflang/OG/Twitter/JSON-LD extraction, attribute-order independence, first-tag-wins on duplicates, empty metadata on a tagless page.                                                                                                                                                  |
| **Unit test**        | `apps/claw-research-service/src/modules/research/managers/__tests__/site-crawl.manager.spec.ts` — every crawl network call goes through the mocked `FetchService` (no second fetch path), a robots-disallowed page is skipped and warned about, one failed page does not abort the crawl, the page budget is enforced, feed discovery only fetches a feed the homepage actually advertised. |
| **Unit test**        | `apps/claw-research-service/src/common/utilities/__tests__/feed.utility.spec.ts` — RSS and Atom parsing, CDATA/entity decoding, an entry with no link is skipped, unrecognized XML returns `{kind:'unrecognized'}`.                                                                                                                                                                         |
| **Unit test**        | `apps/claw-research-service/src/modules/research/managers/__tests__/site-audit.manager.spec.ts` — every finding names its evidence item ids, a "missing X" finding is `HIGH` (not `CONFIRMED`) and carries a stated limitation, a fully clean page set produces zero findings.                                                                                                              |
| **Unit test**        | `apps/claw-chat-service/src/common/utilities/__tests__/research-intent-classifier.utility.spec.ts` — upgrades to SITE_CRAWL only with a URL plus crawl language present, never upgrades SEARCH_ONLY, matches the spec's own "plain fetch" regression case by NOT upgrading it.                                                                                                              |
| **Unit test**        | `apps/claw-research-service/src/modules/fetch/adapters/__tests__/headless-fetch.adapter.spec.ts` — extraction reuses `extractHtml`, the browser is shared across calls, a private-host URL is refused before a context opens, an in-page request to a private host or a blocked resource type is aborted, a public in-page request is allowed, the post-navigation final URL is re-checked. |
| **Unit test**        | `apps/claw-research-service/src/modules/fetch/services/__tests__/fetch.service.headless-fallback.spec.ts` — retries only a thin `text/html` result, never a non-HTML one, never when the feature flag is off, keeps the plain result when the render fails or comes back thinner still.                                                                                                     |
| **Unit test**        | `apps/claw-research-service/src/common/utilities/__tests__/url-safety.utility.spec.ts` — `isHostExplicitlyAllowlisted` (shared by both fetch adapters): exact match, wildcard suffix without matching the bare suffix, empty allowlist, unparseable URL.                                                                                                                                    |
| **Unit test**        | `apps/claw-chat-service/src/modules/chat-messages/utilities/__tests__/research-prompt.utility.spec.ts` — `injectResearchEvidenceIntoContext` sets `researchGroundingInjected` only when evidence is non-empty, no-ops (including the flag) on empty evidence, trims a blank existing system prompt before deciding whether to prepend.                                                      |
| **Unit test**        | `apps/claw-chat-service/src/modules/chat-messages/__tests__/context-assembly.manager.spec.ts` — `researchGroundingInjected` alone still appends the final-user-turn reminder, and does NOT also trigger a second "NO usable web evidence" block over real prose evidence already in `systemPrompt`.                                                                                         |
| **Unit test**        | `apps/claw-chat-service/src/__tests__/consensus-execution.manager.spec.ts` ("citation-aware grounding synthesis") — a short, cited answer beats a longer, zero-citation fabrication when the run had evidence; the plain longest-response fallback still applies when neither lane cites anything.                                                                                          |
| **Review checklist** | Rule 7 has no automatable form yet — the counts are assembled in several places. Read them against the bundle before shipping a change to any of them.                                                                                                                                                                                                                                      |

## Definition of done

- [ ] A pasted URL is fetched directly, and the trace shows `fetch.direct`.
- [ ] The tools that ran are named in the prompt.
- [ ] Every failed web step produces a warning that names what failed.
- [ ] No user-visible count is derived from a different quantity than its label.
- [ ] `FetchService` is still the only fetch path.

## See also

- [`docs/13-adr/adr-091-user-urls-are-opened-not-searched.md`](../docs/13-adr/adr-091-user-urls-are-opened-not-searched.md)
- [`docs/13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md`](../docs/13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md)
- [`docs/04-backend/service-guide-research.md`](../docs/04-backend/service-guide-research.md)
- [`docs/14-risk-debt/chat-pipeline-audit-2026-09.md`](../docs/14-risk-debt/chat-pipeline-audit-2026-09.md) — section E
- [`rules/19-logging-observability-and-redaction.md`](19-logging-observability-and-redaction.md)
