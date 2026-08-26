// Why a model may not be used. Ordered from the most fundamental fact about
// the deployment to the most specific fact about the caller, because that is
// the order the checks have to run in: a retired model is not usable by
// anyone, so asking whether a plan allows it would be answering the wrong
// question.
export enum ModelAuthorizationDenial {
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_RETIRED = 'MODEL_RETIRED',
  CONNECTOR_DISABLED = 'CONNECTOR_DISABLED',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  MODEL_NOT_EXPOSED = 'MODEL_NOT_EXPOSED',
  NO_ACTIVE_PLAN = 'NO_ACTIVE_PLAN',
  PROVIDER_NOT_IN_PLAN = 'PROVIDER_NOT_IN_PLAN',
  MODEL_NOT_IN_PLAN = 'MODEL_NOT_IN_PLAN',
}

// Everything the decision needs, and nothing about how it was learned.
export interface ModelAuthorizationFacts {
  exists: boolean;
  retired: boolean; // lifecycle REMOVED or SUNSET
  stale: boolean; // lifecycle DEPRECATED, or not seen in the latest sync
  connectorEnabled: boolean;
  exposed: boolean;
  hasActivePlan: boolean;
  providerAllowedByPlan: boolean;
  modelAllowedByPlan: boolean;
  unrestrictedPlan: boolean; // plan is in ALLOW_ALL mode
}

export type ModelAuthorizationResult =
  { allowed: true } | { allowed: false; reason: ModelAuthorizationDenial };

// The order of these checks is the contract, not an implementation detail.
// An operator reading a denial reason is told the FIRST thing that was wrong,
// and reordering these would change what users are told without changing what
// they are allowed to do. Exposure is checked before the plan on purpose — a
// model ClawAI does not offer is not a plan problem, and reporting it as one
// would send an administrator to the wrong screen.
export function authorizeModel(facts: ModelAuthorizationFacts): ModelAuthorizationResult {
  // The caller's standing comes first, and deliberately so. Someone with no
  // active plan may not use any model, so telling them WHICH model problem they
  // also have would hand an unentitled caller a probe into the inventory: ask
  // about a model, learn from the reason whether it exists, is retired, or is
  // merely unexposed. They get one answer, NO_ACTIVE_PLAN, for every model.
  if (!facts.hasActivePlan) {
    return { allowed: false, reason: ModelAuthorizationDenial.NO_ACTIVE_PLAN };
  }
  if (!facts.exists) {
    return { allowed: false, reason: ModelAuthorizationDenial.MODEL_NOT_FOUND };
  }
  if (facts.retired) {
    return { allowed: false, reason: ModelAuthorizationDenial.MODEL_RETIRED };
  }
  if (!facts.connectorEnabled) {
    return { allowed: false, reason: ModelAuthorizationDenial.CONNECTOR_DISABLED };
  }
  if (facts.stale) {
    return { allowed: false, reason: ModelAuthorizationDenial.MODEL_UNAVAILABLE };
  }
  if (!facts.exposed) {
    return { allowed: false, reason: ModelAuthorizationDenial.MODEL_NOT_EXPOSED };
  }
  if (!facts.providerAllowedByPlan) {
    return { allowed: false, reason: ModelAuthorizationDenial.PROVIDER_NOT_IN_PLAN };
  }
  if (facts.unrestrictedPlan) {
    return { allowed: true };
  }
  if (!facts.modelAllowedByPlan) {
    return { allowed: false, reason: ModelAuthorizationDenial.MODEL_NOT_IN_PLAN };
  }
  return { allowed: true };
}
