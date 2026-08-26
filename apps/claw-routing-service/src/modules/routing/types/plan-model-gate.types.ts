import { type RoutingDecisionResult } from './routing.types';

export type PlanModelGateOutcome = 'unrestricted' | 'allowed' | 'promoted' | 'unsatisfiable';

export type PlanModelGateResult = {
  decision: RoutingDecisionResult;
  // 'allowed' = primary already allowed; 'promoted' = a fallback was promoted;
  // 'unsatisfiable' = plan allows none of the candidates.
  outcome: PlanModelGateOutcome;
  // How many candidates the plan removed from this decision — the primary if it
  // was off-plan, plus every filtered fallback. Reported so an operator can see
  // that AUTO is choosing from a narrowed set; a plan that silently strips most
  // of the chain looks identical to a plan that strips none of it otherwise.
  excludedCandidates: number;
};
