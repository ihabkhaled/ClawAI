# ADR-118 — Orchestration lanes share the grounding signal, not just the evidence text

## Status

Accepted

## Context

A user asked Consensus mode (and separately, normal chat) to crawl
`claw-ai.co`'s homepage and name the highest-priced plan. Within the **same**
Consensus run:

- `grok-4.7` honestly reported "No verified prices from claw-ai.co… Highest
  plan: unknown."
- `kimi-k3` (Ollama) produced a fully fabricated, confidently formatted
  answer — a three-tier Ultra/Pro/Basic table with invented prices
  ($200-250/month) and fake citation URLs (`/pricing`, `/features`, `/ultra`
  — none of them real), with **zero `[n]` citation markers**.
- `kimi-k2.7-code` said "I can't access live websites," then invented the
  same fabricated numbers anyway.
- The consensus synthesis step **copied kimi-k3's fabrication verbatim** as
  the "consensus" answer, giving no weight to the lane that had honestly
  reported no evidence.
- A separate normal-chat run with the same question, same evidence pipeline,
  produced an honest, correctly cited answer.

The single-chat path (`ContextAssemblyManager`) already had two defences
against exactly this failure, added and measured over 2026-09-10/11
(rule 41 §§5, 11): a capability statement that fires on `researchRequested`
rather than on evidence existing, and `RESEARCH_GROUNDING_REMINDER` —
appended to the **final user turn**, not just the system message, because a
2026-09-11 measurement showed a small model still refuses/confabulates with
evidence sitting in the system prompt if the reminder is not repeated where
the model is actually looking.

**Neither defence reached compare, consensus or escalation.** Those three
modes never call `ContextAssemblyManager.assemble()` with a research option —
they call `ChatContextGatewayManager.build()` for the base context, then
merge `ResearchEnricherManager`'s evidence into `context.systemPrompt` as raw
prose (`injectResearchIntoContext` / two copies of `applyResearchToContext`,
one per manager). That merge never touched
`researchRequested`/`researchEvidence`/`researchWarnings`, so
`ContextAssemblyManager.hasResearchGrounding()` — the gate that both the
capability wording and the final-user-turn reminder depend on inside
`buildChatMessages`/`buildGeminiChatMessages`/`buildPromptString`, which
every provider call for every mode already goes through — evaluated to
`false` for every orchestration lane, every time, regardless of how much real
evidence had just been folded into the system prompt. The exact insufficient
shape rule 41 §11 measured and fixed for single chat — evidence in the
system message with no proximity reminder — was consensus and compare's only
shape, unconditionally.

Separately, `ResearchEnricherManager.buildEvidenceBlock` (the evidence-block
builder every orchestration mode shares: compare, consensus, escalation,
repair, decompose, best-of-n, verify, pipeline, cost-ensemble, role-pack)
never carried an explicit "do not invent" instruction when evidence WAS
present — only `RESEARCH_ENRICHER_EMPTY_RESULTS_BLOCK` (the zero-results
case) said so. `ContextAssemblyManager.formatResearchBlock` had the identical
gap: "do not invent" only fired in its own empty-evidence branch.

Third, `ConsensusExecutionManager`'s synthesis step (`buildSynthesisResult`,
`buildHeuristicSynthesis`) picked its fallback "best" answer by
`content.length` alone. A fabricated pricing table is reliably longer than an
honest "no verified prices found," so length-as-quality-proxy rewarded the
fabrication by construction whenever evidence existed and the LLM synthesizer
itself was unreachable or returned unusable JSON.

## Decision

1. **One shared merge function, and it carries a grounding flag.**
   `injectResearchEvidenceIntoContext` (`utilities/research-prompt.utility.ts`)
   replaces the three near-identical `applyResearchToContext` /
   `injectResearchIntoContext` copies in `ConsensusExecutionManager`,
   `EscalationChainManager` and `ParallelExecutionManager`. It prepends
   evidence to `systemPrompt` exactly as before, and additionally sets
   `AssembledContext.researchGroundingInjected = true` whenever evidence was
   non-empty.

2. **`hasResearchGrounding` recognises the new flag**, alongside the existing
   `researchRequested`/`researchEvidence`/`researchWarnings` triggers. This
   flag is deliberately **not** added to the trigger that calls
   `formatResearchBlock` (the structured-citation system block): that block
   would render `researchEvidence.length === 0` and print a second,
   contradictory "NO usable web evidence" block directly beneath the
   enricher's own prose evidence. `researchGroundingInjected` exists solely
   to make the final-user-turn reminder fire — the one piece of the
   single-chat defence that has no equivalent already living in the
   orchestration evidence block.

   The practical effect: every compare, consensus and escalation lane now
   gets `RESEARCH_GROUNDING_REMINDER` appended to its last user turn whenever
   the enricher actually injected evidence, through the exact code path
   (`ContextAssemblyManager.buildChatMessages` /
   `buildGeminiChatMessages` / `buildPromptString`) every provider call in
   every mode already goes through — no new call site, no per-mode copy.

3. **`RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION`** (new shared constant,
   `constants/research-grounding.constants.ts`) is now emitted in BOTH
   evidence-block builders' always-present preamble — `formatResearchBlock`
   (single chat) and `buildEvidenceBlock` (every orchestration mode) — not
   only their empty-evidence branches. One string, one place, so the two
   builders cannot drift apart the way they already had.

4. **Consensus synthesis stops treating every lane as equally trustworthy.**
   `ConsensusExecutionManager` now threads a `hasResearchEvidence` boolean
   (derived from whether the enricher actually returned non-empty evidence
   for this run) through `synthesize` → `runOllamaSynthesis` /
   `buildHeuristicSynthesis` / `buildSynthesisResult`:
   - The LLM synthesis prompt gets one additional instruction, added only
     when this run had web evidence: prefer lanes that cite `[n]` evidence
     over uncited, confident-sounding answers, and flag disagreement rather
     than silently pick one.
   - The fallback "best response" picker (`selectBestResponse`) now prefers
     the response with the most `[n]` citation markers
     (`countCitationMarkers`, a plain `/\[\d+\]/g` count) over the longest
     response, **but only when this run had research evidence**. When no
     lane cites anything, or the run had no web evidence at all, it falls
     back to the pre-existing longest-content heuristic unchanged — this is
     deliberately not a general disagreement-detection system, and ordinary
     non-web prompts are untouched.

## Consequences

- Compare, consensus and escalation lanes now receive the identical
  proximity-reminder defence single chat has had since 2026-09-11, through
  the same shared code path, with zero new per-mode logic to keep in sync.
- The seven remaining orchestration managers that pass raw prompt strings
  (`prependResearchEvidence` callers: answer-repair, task-decomposition,
  best-of-n, cost-ensemble, verifier, pipeline, role-pack) get the stronger
  "do not invent" wording automatically, because it lives in the one shared
  `buildEvidenceBlock`. They do NOT get the final-user-turn reminder — they
  never construct an `AssembledContext`/provider-message turn at all, only a
  flat prompt string sent straight to `ollama-service /generate`. Deferred:
  giving those seven a raw-string equivalent of the reminder is a separate,
  larger change (it would mean restructuring how each one builds its prompt)
  and out of scope for this bounded fix.
- Consensus's fabrication-guard is a one-instruction, citation-counting
  heuristic, not a disagreement-detection system. It does not fact-check
  content; it only stops the synthesis step from rewarding length over
  citation when a run had evidence. A model could still cite `[n]` next to a
  fabricated number — this fix narrows the specific laundering behaviour
  observed (uncited invention beating honest "unknown"), it does not
  eliminate hallucination.
- Three duplicate `applyResearchToContext`/`injectResearchIntoContext`
  methods are gone; any future evidence-merge fix lands once.

## Alternatives considered

- **Route compare/consensus/escalation through
  `ContextAssemblyManager.assemble()`'s own research option instead of
  `ResearchEnricherManager`.** Rejected: that path runs a different research
  workflow (single evidence run keyed to `ResearchMode`, structured
  citations) than the orchestration enricher (search + optional per-URL
  fetch, prose evidence block, its own provider-choice plumbing per rule 41
  §9). Unifying the two pipelines is a much larger change than this bug
  needed; the grounding flag gets the specific proven defence to the
  orchestration lanes without touching which pipeline they run.
- **A full disagreement-detection / fact-checking synthesis system.**
  Rejected as over-engineering for this report: the observed failure was
  narrower (length rewarding invention over an honest "no evidence"), and a
  bounded citation-count preference addresses it without a new subsystem.
- **Always fire `formatResearchBlock` for orchestration lanes too.**
  Rejected: it renders `context.researchEvidence`, which orchestration lanes
  never populate (their evidence is already prose in `systemPrompt`), so it
  would print a second, contradictory "NO usable web evidence" block
  directly under real evidence.

## References

- `apps/claw-chat-service/src/modules/chat-messages/utilities/research-prompt.utility.ts`
- `apps/claw-chat-service/src/modules/chat-messages/managers/context-assembly.manager.ts`
  (`hasResearchGrounding`, `formatResearchBlock`)
- `apps/claw-chat-service/src/modules/chat-messages/managers/research-enricher.manager.ts`
  (`buildEvidenceBlock`)
- `apps/claw-chat-service/src/modules/chat-messages/managers/consensus-execution.manager.ts`
  (`selectBestResponse`, `countCitationMarkers`, `buildSynthesisPrompt`)
- `apps/claw-chat-service/src/modules/chat-messages/constants/research-grounding.constants.ts`
- `apps/claw-chat-service/src/modules/chat-messages/types/context.types.ts`
  (`AssembledContext.researchGroundingInjected`)
- [rule 41 — Web Evidence Truthfulness](../../rules/41-web-evidence-truthfulness.md), §§5 and 11
  (the two single-chat defences this ADR extends to orchestration)
- [ADR-116](adr-116-comparative-judge-for-compare.md) — the last time Compare's
  per-lane-vs-shared distinction was the actual bug
