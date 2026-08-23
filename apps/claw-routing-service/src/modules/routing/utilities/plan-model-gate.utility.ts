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
): PlanModelGateResult {
  if (unrestricted) {
    return { decision, outcome: 'unrestricted' };
  }
  if (allowedModels.length === 0) {
    // A restricted plan with nothing on its list authorizes nothing.
    return { decision, outcome: 'unsatisfiable' };
  }
  const allowed = new Set(allowedModels);
  const isAllowed = (provider: string, model: string): boolean =>
    allowed.has(`${provider}/${model}`);
  const filteredChain = (decision.fallbackChain ?? []).filter((e) =>
    isAllowed(e.provider, e.model),
  );

  if (isAllowed(decision.selectedProvider, decision.selectedModel)) {
    return { decision: { ...decision, fallbackChain: filteredChain }, outcome: 'allowed' };
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
    };
  }

  return { decision, outcome: 'unsatisfiable' };
}
