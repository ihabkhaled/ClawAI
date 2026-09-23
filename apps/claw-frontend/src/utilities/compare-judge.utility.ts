import {
  COMPARE_JUDGE_FAILURE_REASONS,
  COMPARE_JUDGE_FALLBACK_NOTICE_KEY,
  COMPARE_JUDGE_NOTICE_KEYS,
  COMPARE_JUDGE_VERDICT_STATUSES,
} from '@/constants';
import { type CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '@/enums';
import type {
  CompareBestResponse,
  CompareJudgeLaneResult,
  CompareJudgeVerdict,
  CompareRankingRow,
  ParallelModelResponse,
} from '@/types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function readLane(value: unknown): CompareJudgeLaneResult | null {
  const lane = asRecord(value);
  const laneIndex = asNumber(lane?.['laneIndex']);
  const score = asNumber(lane?.['score']);
  const rank = asNumber(lane?.['rank']);
  const model = asString(lane?.['model']);
  if (lane === null || laneIndex === null || score === null || rank === null || model === null) {
    return null;
  }
  return {
    laneIndex,
    label: asString(lane['label']) ?? '',
    provider: asString(lane['provider']) ?? '',
    model,
    score,
    rank,
    reason: asString(lane['reason']) ?? '',
    truncated: lane['truncated'] === true,
    criticSummary: asString(lane['criticSummary']),
  };
}

/**
 * Reads the comparative verdict chat-service stores on each compare lane under
 * `metadata.compareJudge`, validating it field by field. Anything malformed is
 * null rather than a half-read verdict — a partly parsed ranking is how a
 * wrong winner would get a trophy.
 */
export function readCompareJudgeVerdict(
  metadata: Record<string, unknown> | null,
): CompareJudgeVerdict | null {
  const raw = asRecord(metadata?.['compareJudge']);
  const status = asString(raw?.['status']);
  if (raw === null || status === null || !COMPARE_JUDGE_VERDICT_STATUSES.has(status)) {
    return null;
  }
  const reason = asString(raw['failureReason']);
  const scale = asRecord(raw['scale']);
  const lanes = Array.isArray(raw['lanes']) ? raw['lanes'].map(readLane) : [];
  if (lanes.some((lane) => lane === null)) {
    return null;
  }
  return {
    status: status as CompareJudgeVerdictStatus,
    failureReason:
      reason !== null && COMPARE_JUDGE_FAILURE_REASONS.has(reason)
        ? (reason as CompareJudgeFailureReason)
        : null,
    judgeModel: asString(raw['judgeModel']) ?? '',
    scale: { min: asNumber(scale?.['min']) ?? 0, max: asNumber(scale?.['max']) ?? 10 },
    lanes: lanes.filter((lane): lane is CompareJudgeLaneResult => lane !== null),
    winnerLaneIndex: asNumber(raw['winnerLaneIndex']),
    tiedLaneIndices: Array.isArray(raw['tiedLaneIndices'])
      ? raw['tiedLaneIndices'].filter((index): index is number => typeof index === 'number')
      : [],
    rationale: asString(raw['rationale']),
    truncated: raw['truncated'] === true,
  };
}

/** The lane index chat-service stamped on a compare lane, or null. */
export function readCompareLaneIndex(metadata: Record<string, unknown> | null): number | null {
  return asNumber(metadata?.['compareLaneIndex']);
}

/** The run's verdict — every lane carries the same one, so the first found wins. */
export function getCompareJudgeVerdict(
  responses: ParallelModelResponse[],
): CompareJudgeVerdict | null {
  return responses.find((response) => response.compareJudge)?.compareJudge ?? null;
}

/** This lane's place in the ranking, or null when it was not ranked. */
export function getLaneRanking(response: ParallelModelResponse): CompareJudgeLaneResult | null {
  const verdict = response.compareJudge;
  const laneIndex = response.compareLaneIndex;
  if (!verdict || laneIndex === null || laneIndex === undefined) {
    return null;
  }
  return verdict.lanes.find((lane) => lane.laneIndex === laneIndex) ?? null;
}

/** Rows for the ranking panel, best first, with the bar width precomputed. */
export function buildCompareRankingRows(verdict: CompareJudgeVerdict): CompareRankingRow[] {
  const span = Math.max(1, verdict.scale.max - verdict.scale.min);
  return verdict.lanes.map((lane) => ({
    ...lane,
    isWinner: lane.laneIndex === verdict.winnerLaneIndex,
    scorePercent: Math.min(
      100,
      Math.max(0, Math.round(((lane.score - verdict.scale.min) / span) * 100)),
    ),
  }));
}

/** i18n key for a verdict with no ranking; null when there is one. */
export function getCompareJudgeNoticeKey(verdict: CompareJudgeVerdict): string | null {
  if (verdict.status === CompareJudgeVerdictStatus.RANKED && verdict.lanes.length > 0) {
    return null;
  }
  return verdict.failureReason === null
    ? COMPARE_JUDGE_FALLBACK_NOTICE_KEY
    : COMPARE_JUDGE_NOTICE_KEYS[verdict.failureReason];
}

/**
 * The "best response" of a run.
 *
 * When the judge was on, only its winner qualifies — a tie, a failed parse or a
 * skipped judge means no best at all, never the length-and-latency heuristic
 * standing in for a verdict the judge did not give. With the judge off the
 * heuristic is all there is, and the card says "best" on that basis as before.
 */
export function resolveBestResponse(
  responses: ParallelModelResponse[],
  heuristicBest: string | null,
): CompareBestResponse {
  const verdict = getCompareJudgeVerdict(responses);
  if (verdict === null) {
    return { model: heuristicBest, judged: false };
  }
  const winner = verdict.lanes.find((lane) => lane.laneIndex === verdict.winnerLaneIndex);
  return { model: winner?.model ?? null, judged: true };
}
