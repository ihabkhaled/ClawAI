import { type RoutingDecisionResult } from './routing.types';

export type PlanModelGateOutcome = 'unrestricted' | 'allowed' | 'promoted' | 'unsatisfiable';

export type PlanModelGateResult = {
  decision: RoutingDecisionResult;
  // 'allowed' = primary already allowed; 'promoted' = a fallback was promoted;
  // 'unsatisfiable' = plan allows none of the candidates.
  outcome: PlanModelGateOutcome;
};
