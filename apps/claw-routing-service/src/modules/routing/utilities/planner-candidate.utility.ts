import { type PlannerCandidate } from '../../intelligence/types/ai-route-plan.types';
import { type RouterModelRegistryRecord } from '../../router-models/types/router-model-registry.types';

/**
 * Turns a registry row into what the route planner is asked to reason about.
 *
 * The planner's prompt asks it to weigh cost, tier, latency, privacy and
 * domain strength. It used to receive none of them: buildPlannerCandidates
 * emitted the already-selected model plus its fallbacks with every capability
 * field blank, so the "AI router" was choosing between one and three unlabelled
 * entries — effectively rubber-stamping a decision the deterministic router had
 * already made. Every field below already existed in RouterModelRegistry; none
 * of it was reaching the model that needed it.
 *
 * `requiresCredit` is derived from `isLocal`: a local model costs the user
 * nothing to run, which is the single most useful thing the planner can know
 * when two candidates are otherwise close.
 */
export function toPlannerCandidate(
  record: RouterModelRegistryRecord,
  inFlightCount: number,
): PlannerCandidate {
  return {
    provider: record.provider,
    model: record.modelKey,
    displayName: record.displayName,
    isAvailable: true,
    isRouterOnly: record.isRouterOnly,
    isExecutionModel: record.isExecutionCapable,
    supportsTools: record.supportsTools,
    supportsVision: record.supportsVision,
    supportsLongContext: record.supportsLongContext,
    qualityTier: record.qualityTier,
    costClass: record.costClass,
    latencyClass: record.latencyClass,
    privacyClass: record.privacySupport,
    domainStrengths: record.domainTags.map((tag) => String(tag)),
    weakDomains: record.notRecommendedFor.map((tag) => String(tag)),
    requiresCredit: !record.isLocal,
    // Prisma Decimal columns arrive as strings so no precision is lost on the
    // way out of the database; the planner only needs them to compare.
    inputCostPer1M: parseCost(record.inputCostPer1M),
    outputCostPer1M: parseCost(record.outputCostPer1M),
    contextWindowTokens: record.contextWindowTokens,
    inFlightCount,
  };
}

function parseCost(value: string | null): number | null {
  if (value === null) {
    return null;
  }
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * The deterministic router's own pick and its fallbacks come FIRST.
 *
 * The candidate list is truncated before it reaches the prompt, so ordering
 * decides what the planner is even allowed to consider. Losing the
 * deterministic choice to a cap would make the AI plan strictly worse than the
 * routing it is supposed to improve on.
 */
export function orderCandidatesForPrompt(
  candidates: PlannerCandidate[],
  preferredKeys: ReadonlySet<string>,
  limit: number,
): PlannerCandidate[] {
  const preferred: PlannerCandidate[] = [];
  const rest: PlannerCandidate[] = [];
  for (const candidate of candidates) {
    const key = `${candidate.provider}::${candidate.model}`;
    if (preferredKeys.has(key)) {
      preferred.push(candidate);
    } else {
      rest.push(candidate);
    }
  }
  return [...preferred, ...rest].slice(0, limit);
}
