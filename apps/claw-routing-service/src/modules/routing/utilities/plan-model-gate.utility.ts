import { type RoutingDecisionResult } from '../types/routing.types';
import { type PlanModelGateResult } from '../types/plan-model-gate.types';

// Filters a routing decision against a plan's allowed "provider/model" keys.
//
// An empty allowedModels array used to mean "no restriction". That is correct
// only for a plan in ALLOW_ALL mode, which sends an empty list deliberately as
// a fast path. For every other plan an empty list means the plan grants NO
// models — and those plans were being handed the entire catalogue, which is the
// exact inversion of what the operator configured. The mode decides now, not
// the emptiness.
//
// If the primary is forbidden but an allowed fallback exists, promote the first
// allowed fallback to primary. If the plan allows none of the candidates, the
// decision is returned unchanged with outcome 'unsatisfiable' (chat-service
// blocks execution as the hard backstop).
export function applyPlanModelGate(
  decision: RoutingDecisionResult,
  allowedModels: string[],
  unrestricted = false,
  allowedCostClasses?: string[],
  costClassOf?: (provider: string, model: string) => string | undefined,
): PlanModelGateResult {
  if (unrestricted) {
    return { decision, outcome: 'unrestricted', excludedCandidates: 0 };
  }
  const totalCandidates = 1 + (decision.fallbackChain ?? []).length;
  if (allowedModels.length === 0 && allowedCostClasses === undefined) {
    // A restricted plan with nothing on its list authorizes nothing.
    return { decision, outcome: 'unsatisfiable', excludedCandidates: totalCandidates };
  }
  const allowed = new Set(allowedModels);
  const classes = new Set(allowedCostClasses ?? []);
  const isAllowed = (provider: string, model: string): boolean => {
    if (allowedCostClasses !== undefined) {
      const costClass = costClassOf?.(provider, model);
      if (costClass === undefined || !classes.has(costClass)) return false;
    }
    if (allowed.has(`${provider}/${model}`)) return true;
    if (allowedCostClasses === undefined) return false;
    return true;
  };
  const filteredChain = (decision.fallbackChain ?? []).filter((e) =>
    isAllowed(e.provider, e.model),
  );

  const excludedFallbacks = (decision.fallbackChain ?? []).length - filteredChain.length;

  if (isAllowed(decision.selectedProvider, decision.selectedModel)) {
    return {
      decision: { ...decision, fallbackChain: filteredChain },
      outcome: 'allowed',
      excludedCandidates: excludedFallbacks,
    };
  }

  const promoted = filteredChain[0];
  if (promoted) {
    return {
      decision: {
        ...decision,
        selectedProvider: promoted.provider,
        selectedModel: promoted.model,
        fallbackChain: filteredChain.slice(1),
      },
      outcome: 'promoted',
      // The rejected primary counts as excluded alongside the filtered chain.
      excludedCandidates: excludedFallbacks + 1,
    };
  }

  return { decision, outcome: 'unsatisfiable', excludedCandidates: totalCandidates };
}
