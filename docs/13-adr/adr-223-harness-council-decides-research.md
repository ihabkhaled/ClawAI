# ADR-223: A council of models decides whether and how deep a turn researches

Status: Accepted (2026-11-27) · Owner decision: the default members and an admin page to change them.

## Context

One small model decided, per turn, whether ClawAI researches the web (`RESEARCH_GATE`: `gpt-oss:120b`, then
`gemma4:31b`, 64 tokens, 6 s) and another wrote the research plan (`gpt-oss:20b` in development). The owner asked for
"a harness decided by several smarter models with bigger context that give opinions to each other". Measured on
production with one Arabic question about a recent CEO resignation, four large Ollama Cloud models answered in
0.8-6.5 s; one of them named the wrong CEO, the largest named the right one. A single small model is a single point of
error.

## Decision

- A new assistant-model role, `HARNESS_COUNCIL` (routing-service), holds the council members; admins change them on
  Smart router → Assistant models, like every other role. Default members (seeded once, Ollama Cloud, 10 s, 700
  tokens): `beam`, `deepseek-v4.1-flash`, `mimo-v2.6-flash`, `minimax-m3.1-flash`.
- chat-service's `HarnessCouncilService` asks ALL enabled members IN PARALLEL (same model call as the research gate:
  JSON mode, thinking off, the message fenced as data) for `needsWeb`, `depth` 0-5, `languages` and `subQuestions`.
- It decides **as soon as one side holds a strict majority of the members asked**; slower members cannot change it.
  A tie researches. Depth = upper median of the winning side; languages ranked by how many named them; sub-questions
  interleaved across members, duplicates dropped. Replies in a code fence or cut off mid-object still count.
- `ResearchGateService.needsWeb` asks the council first; `plan` runs the council and the planner side by side and
  `applyCouncilToPlan` lets the majority decide whether to research (a planner "answer" becomes a search led by the
  first sub-question), and how deep (a page-budget floor per depth). A user's own link and a plain order to search are
  never overruled. No council configured, routing unreachable or no member answering → the old single-model chain.

## Consequences

- Better research decisions in any language at about the latency of the old gate (decided at 1.5-3.6 s locally: the
  three fast members usually agree before the largest one finishes).
- Four model calls per turn instead of one. They are Ollama Cloud calls the platform absorbs (owner default), not
  metered to the user.
- The council's languages and sub-questions are produced now but only the first sub-question is used (as the search
  query). Multi-query, multilingual rounds use them in the research engine's next batches
  (`docs/implementation/autonomous-research-engine-plan.md`).
- Emptying the council role is not "off": the seed refills an empty role on the next boot. Disable members instead.
- Orchestration surfaces (Compare, Consensus, labs) still decide research from markers (rule 59 known gap); they move
  to the council with the research engine's orchestrator.
