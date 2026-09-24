# Runbook: A Chat Mode Returns Fabricated Web Facts

## Symptoms

- A model states specific web facts (prices, dates, URLs) with confidence but
  zero `[n]` citation markers, and the facts do not match the real page.
- The same question, run through Compare/Consensus, produces wildly
  different answers across lanes in the same run — one lane honestly says
  "no evidence found," another invents a detailed, confident answer.
- Consensus's synthesized "final answer" matches the fabricated lane
  verbatim, not the honest one.
- A model says "I can't access live websites" and then answers with
  specific numbers anyway.
- Reported live 2026-09-23: Consensus asked to crawl `claw-ai.co`'s pricing
  page. `grok-4.7` correctly reported no evidence; `kimi-k3` (Ollama)
  fabricated a 3-tier pricing table with fake URLs and zero citations;
  `kimi-k2.7-code` claimed it could not browse, then invented the same fake
  numbers; the synthesis step copied the fabrication verbatim. See
  [ADR-118](../13-adr/adr-118-orchestration-lanes-share-grounding-not-just-evidence.md)
  for the fix that shipped from this report.

## First questions

1. **Which mode?** Normal chat, compare, consensus, escalation, or one of the
   7 raw-prompt orchestration managers (repair, decompose, best-of-n,
   cost-ensemble, verify, pipeline, role-pack)? The grounding defences differ
   by mode — see rule 41 §14.
2. **Did research actually run, and did it find anything?** Read the
   `assemble:` log line
   (`ContextAssemblyManager.assemble`) for single chat, or the
   `enrichForOrchestration`/`enrich` debug logs
   (`ResearchEnricherManager`) for every other mode. A run with genuinely
   zero usable evidence is a DIFFERENT bug (research-service down, robots
   disallowed, query malformed) from a run that had real evidence and the
   model ignored it — diagnose which one you have before changing anything.

## Diagnosis steps

### 1. Confirm whether evidence actually reached the prompt

For single chat, the `assemble:` log line
(`context-assembly.manager.ts`) prints
`research evidence=N warnings=M requested=BOOL tools=[...] block=BOOL`.
`block=false` means the model was told nothing about the web at all — that
is a research-pipeline bug, not a grounding bug.

For compare/consensus/escalation, evidence never reaches
`researchEvidence` — it is prose merged straight into `systemPrompt` by
`injectResearchEvidenceIntoContext`
(`utilities/research-prompt.utility.ts`). Check the enricher's own logs
(`enrich: mode=X sources=N`) and, if you have the raw request, whether
`context.systemPrompt` actually contains a
`## Web research evidence (mode: ...)` block. If it does not, this is a
research-pipeline bug (see the research-service runbooks), not a grounding
bug.

### 2. If evidence reached the prompt, check whether grounding fired

`ContextAssemblyManager.hasResearchGrounding` gates two things: the
capability statement and (more importantly for a small/local model) the
final-user-turn reminder (`RESEARCH_GROUNDING_REMINDER`). It fires on
`researchRequested || researchEvidence.length > 0 || researchWarnings.length

> 0 || researchGroundingInjected === true`.

- Single chat sets `researchRequested` itself inside `assemble()`.
- Compare/consensus/escalation set `researchGroundingInjected` inside
  `injectResearchEvidenceIntoContext` — **only if the evidence string was
  non-empty**. If the enricher returned evidence but this flag is somehow
  `false`/missing on the context reaching `ChatExecutionManager.callProvider`,
  something is stripping it between the manager and the provider call — check
  for a spread (`{ ...context, ... }`) elsewhere in the chain that drops the
  field.
- The 7 lab modes (repair, decompose, best-of-n, cost-ensemble, verifier,
  pipeline, role-pack — since ADR-118's 2026-09-24 update) set it the same
  way, indirectly: they must pass `researchEvidenceInstruction` (never
  `personaInstruction`) to `ChatContextGatewayManager.build()`, which calls
  `injectResearchEvidenceIntoContext` internally. If evidence exists but the
  reminder is missing on one of these 7, check that specific manager's
  `chatContextGateway.build()` call for a `personaInstruction:
enrichment.systemPrompt` regression — that field type-checks and compiles
  fine but silently drops the grounding flag, exactly the bug this whole ADR
  is about. The grep-based regression test
  `managers/__tests__/lab-modes-research-grounding.spec.ts` exists to catch
  this before it reaches a live run.

### 3. Check the evidence-block wording itself

Both evidence-block builders — `ContextAssemblyManager.formatResearchBlock`
(single chat) and `ResearchEnricherManager.buildEvidenceBlock` (every
orchestration mode) — must include
`RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION`
(`constants/research-grounding.constants.ts`) in their always-present
preamble, not only an empty-evidence branch. If one of them has drifted
(someone edited the wording in one place and not the other), that is the
exact defect ADR-118 exists to prevent — fix the shared constant, not one
call site.

### 4. If Consensus specifically laundered a fabrication into the synthesis

Read `ConsensusExecutionManager.selectBestResponse` /
`countCitationMarkers`. The fallback picker (used both when the LLM
synthesizer's JSON is unusable and on the full heuristic path when
Ollama is unreachable) prefers the response with the most `[n]` markers over
the longest response, but **only when `hasResearchEvidence` is true** for
that run. If a fabrication still won:

- Confirm `hasResearchEvidence` (derived from
  `enrichment.systemPrompt.length > 0` in `executeInBackground`) was actually
  `true` for this run — if the enricher returned no evidence, the citation
  preference correctly does not apply, and this is really diagnosis step 1's
  bug (research found nothing) compounded by every lane confabulating with
  no material at all.
- Check whether the LLM synthesis call itself succeeded
  (`runOllamaSynthesis`) and returned a `finalAnswer` field: if so, the
  synthesis was written by an LLM reading the added grounding-rule
  instruction in `buildSynthesisPrompt`, not by `selectBestResponse` — a
  synthesizer model can still choose to trust an uncited answer despite the
  instruction. That is the residual risk stated in ADR-118 Consequences
  (this is a bounded heuristic fix, not fact-checking).

## Fix

Do not patch a single call site. Every fix in this area belongs in exactly
one of three shared places, per rule 41 §14:

| Symptom                                                            | Fix location                                                                    |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Reminder never reaches an orchestration lane's last user turn      | `injectResearchEvidenceIntoContext` (`utilities/research-prompt.utility.ts`)    |
| "Do not invent" wording missing/weak in one evidence-block builder | `RESEARCH_GROUNDING_NO_INVENT_INSTRUCTION` (`research-grounding.constants.ts`)  |
| Consensus synthesis prefers a longer, uncited answer               | `ConsensusExecutionManager.selectBestResponse` / `buildSynthesisPrompt`         |
| Research genuinely found nothing (not a grounding bug)             | See research-service runbooks; check `robots.txt`, provider config, rate limits |

Never add a fourth per-manager copy of the evidence merge. `escalation-chain`,
`consensus-execution` and `parallel-execution` (compare) all call the same
`injectResearchEvidenceIntoContext` — a fifth orchestration mode that needs
this in the future calls it too, it does not grow its own copy.

## Verifying the fix

1. Unit: `context-assembly.manager.spec.ts` — the "orchestration lanes...
   that inject evidence as prose" describe block.
2. Unit: `research-prompt.utility.spec.ts` — the merge + flag behavior in
   isolation.
3. Unit: `consensus-execution.manager.spec.ts` — the "citation-aware
   grounding synthesis (fabrication guard)" describe block.
4. Live (when claw.local's research providers are configured): reproduce the
   original report — Consensus mode, "crawl and check `<a real page you
control>` and tell me the highest price" — and read the raw request each
   lane received (`context.systemPrompt`) to confirm every lane got
   identical evidence AND the reminder on its last user turn.

## Prevention

- Any new orchestration mode that shows the model web evidence goes through
  `injectResearchEvidenceIntoContext`, never a bespoke merge.
- Any wording change to "how the model should treat evidence" goes in
  `research-grounding.constants.ts`, referenced by both builders — never
  copy-pasted.
- A synthesis/judge step that combines multiple lanes' answers must know
  which lanes were actually grounded before picking a "best" one by a proxy
  like length.
