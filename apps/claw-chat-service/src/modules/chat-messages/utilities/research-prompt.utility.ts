// Shared helper for the 7 orchestration managers that pass raw prompt strings
// to ollama-service /generate (answer-repair, task-decomposition, best-of-n,
// cost-ensemble, verifier, pipeline, role-pack). Each manager calls
// ResearchEnricherManager.enrichForOrchestration once and prepends the
// resulting evidence block (already formatted with a Markdown header by
// `buildEvidenceBlock` in the enricher) to whatever prompt it would otherwise
// have used.
//
// A no-evidence prompt (empty `evidence`) is the safe no-op path so callers
// can unconditionally call this helper without any if-guards.

import { type AssembledContext } from '../types/context.types';

export function prependResearchEvidence(prompt: string, evidence: string): string {
  return evidence.length === 0 ? prompt : `${evidence}\n\n${prompt}`;
}

// Sibling helper for the 3 orchestration managers that pass a whole
// `AssembledContext` to `ChatExecutionManager` instead of a raw prompt string
// (compare/parallel, consensus, escalation). Each manager calls
// `ResearchEnricherManager.enrich` / `enrichForOrchestration` ONCE before its
// lane fan-out and merges the resulting evidence into `context.systemPrompt`
// through this one function, so every lane of every one of those three modes
// gets the identical merge behaviour and the identical grounding signal.
//
// Previously each manager carried its own byte-identical copy of this six-line
// merge and NONE of them set `researchGroundingInjected`, so
// `ContextAssemblyManager.hasResearchGrounding` never fired for these three
// modes and the final-user-turn reminder (`withResearchGrounding`) that
// `formatResearchBlock`'s own history required for small local models was
// silently skipped on every orchestration lane. See the field's doc comment
// in `context.types.ts`.
export function injectResearchEvidenceIntoContext(
  context: AssembledContext,
  evidence: string,
): AssembledContext {
  if (evidence.length === 0) {
    return context;
  }
  const trimmedPrompt = (context.systemPrompt ?? '').trim();
  const nextSystemPrompt = trimmedPrompt.length > 0 ? `${evidence}\n\n${trimmedPrompt}` : evidence;
  return { ...context, systemPrompt: nextSystemPrompt, researchGroundingInjected: true };
}
