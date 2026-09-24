// Shared helper for every orchestration manager that already gathers web
// research evidence (via `ResearchEnricherManager.enrich` /
// `enrichForOrchestration`) and needs it folded into an `AssembledContext`:
// Compare/Parallel, Consensus and Escalation call this directly before their
// lane fan-out; the 7 lab modes (Repair, Decompose, Best-of-N, Verifier,
// Pipeline, Cost-Ensemble, Role Pack) reach it indirectly, by passing
// `researchEvidenceInstruction` to `ChatContextGatewayManager.build`, which
// calls this function itself. Either way every caller gets the identical
// merge behaviour and the identical grounding signal.
//
// Previously each manager carried its own byte-identical copy of this six-line
// merge (or, for the 7 lab modes, merged the evidence as a plain
// `personaInstruction`) and NONE of them set `researchGroundingInjected`, so
// `ContextAssemblyManager.hasResearchGrounding` never fired for these modes
// and the final-user-turn reminder (`withResearchGrounding`) that
// `formatResearchBlock`'s own history required for small local models was
// silently skipped on every orchestration lane. See the field's doc comment
// in `context.types.ts`.

import { type AssembledContext } from '../types/context.types';

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
