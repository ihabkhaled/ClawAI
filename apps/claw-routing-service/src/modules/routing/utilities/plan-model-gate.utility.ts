import { type RoutingDecisionResult } from '../types/routing.types';
import { type PlanModelGateResult } from '../types/plan-model-gate.types';

// Filters a routing decision against a plan's allowed "provider/model" keys.
// Empty allowedModels = no restriction (allow-all), preserving the v1 hot path.
// If the primary is forbidden but an allowed fallback exists, promote the first
// allowed fallback to primary. If the plan allows none of the candidates, the
// decision is returned unchanged with outcome 'unsatisfiable' (chat-service
// blocks execution as the hard backstop).
export function applyPlanModelGate(
  decision: RoutingDecisionResult,
  allowedModels: string[],
): PlanModelGateResult {
  if (allowedModels.length === 0) {
    return { decision, outcome: 'unrestricted' };
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
