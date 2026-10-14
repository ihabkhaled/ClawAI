import {
  type ThreadFailureClass,
  type ThreadHealingCandidate,
  ThreadHealingStrategy,
} from '@claw/shared-types';

import { CandidateOrigin } from '../../../common/enums/candidate-origin.enum';
import {
  MAX_POOL_CANDIDATES_PER_ROLE,
  MIN_HEALTH_SAMPLES,
  PROVIDER_WIDE_CLASSES,
  HEALTH_RATE_SCALE as RATE_SCALE,
} from '../constants/healing.constants';
import type { CandidateHealth, CandidateQueueInput, QueuedCandidate } from '../types/healing.types';

export function candidateKey(ref: { provider: string; model: string }): string {
  return `${ref.provider}/${ref.model}`;
}

function successRate(health: CandidateHealth | undefined): number | null {
  if (!health) return null;
  const total = health.ok + health.failed;
  return total < MIN_HEALTH_SAMPLES ? null : Math.round((health.ok / total) * RATE_SCALE);
}

/**
 * Pool models ordered by how they did lately: a model with enough recent samples ranks by its
 * success rate, the rest keep the order the catalog gave (cheapest first) and sit after the
 * proven ones only when they are not known to fail. The sort is stable.
 */
function rankPool(
  pool: readonly ThreadHealingCandidate[],
  health: ReadonlyMap<string, CandidateHealth>,
): ThreadHealingCandidate[] {
  const scored = pool.map((candidate, index) => ({
    candidate,
    index,
    rate: successRate(health.get(candidateKey(candidate))),
  }));
  return scored
    .filter(({ rate }) => rate === null || rate > 0)
    .sort((a, b) => (b.rate ?? RATE_SCALE / 2) - (a.rate ?? RATE_SCALE / 2) || a.index - b.index)
    .map(({ candidate }) => candidate);
}

/**
 * Every model a role may try, in order: its own pick, the backups the owner chose, then (ADR-181)
 * the plan-allowed pool ranked by recent success, and last the safe default. A model that failed
 * this role for its own reasons in an earlier attempt of the job drops behind the backups. An
 * identical provider/model is listed once; a different model of the SAME provider is allowed.
 */
export function buildCandidateQueue(input: CandidateQueueInput): QueuedCandidate[] {
  const { role, healing, demoted } = input;
  const seen = new Set<string>();
  const queue: QueuedCandidate[] = [];
  const add = (ref: ThreadHealingCandidate, origin: CandidateOrigin): void => {
    const key = candidateKey(ref);
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ ...ref, origin });
  };
  const primary: ThreadHealingCandidate = { provider: role.provider, model: role.model };
  const team = role.fallbacks.filter(
    (fallback) => candidateKey(fallback) !== candidateKey(primary),
  );
  if (demoted.has(candidateKey(primary)) && team.length > 0) {
    for (const fallback of team) add(fallback, CandidateOrigin.TEAM);
    add(primary, CandidateOrigin.PRIMARY);
  } else {
    add(primary, CandidateOrigin.PRIMARY);
    for (const fallback of team) add(fallback, CandidateOrigin.TEAM);
  }
  const fits = (ref: ThreadHealingCandidate): boolean =>
    ref.windowTokens === undefined || ref.windowTokens >= input.neededTokens;
  const pool = rankPool(healing?.pool ?? [], input.health)
    .filter((ref) => fits(ref) && !demoted.has(candidateKey(ref)))
    .slice(0, MAX_POOL_CANDIDATES_PER_ROLE);
  for (const ref of pool) add(ref, CandidateOrigin.POOL);
  if (healing?.safeDefault && fits(healing.safeDefault)) {
    add(healing.safeDefault, CandidateOrigin.SAFE_DEFAULT);
  }
  return queue;
}

/**
 * After a failure of the whole provider (rate limit, outage, no credit, timeouts) another model of
 * the same provider would fail the same way, so those candidates move behind the others.
 */
export function orderAfterFailure(
  remaining: readonly QueuedCandidate[],
  failedProvider: string,
  failureClass: ThreadFailureClass,
): QueuedCandidate[] {
  if (!PROVIDER_WIDE_CLASSES.has(failureClass)) return [...remaining];
  const other = remaining.filter((candidate) => candidate.provider !== failedProvider);
  const same = remaining.filter((candidate) => candidate.provider === failedProvider);
  return [...other, ...same];
}

/** The strategy a swap to this candidate is recorded as in the step log. */
export function swapStrategy(origin: CandidateOrigin): ThreadHealingStrategy {
  switch (origin) {
    case CandidateOrigin.SAFE_DEFAULT:
      return ThreadHealingStrategy.SAFE_DEFAULT;
    case CandidateOrigin.POOL:
      return ThreadHealingStrategy.CROSS_PROVIDER;
    case CandidateOrigin.PRIMARY:
    case CandidateOrigin.TEAM:
      return ThreadHealingStrategy.TEAM_FALLBACK;
  }
}
