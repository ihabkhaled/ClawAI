import type { CompareJudgeFailureReason, CompareJudgeVerdictStatus } from '@/enums';

import type { TranslateFunction } from './i18n.types';

/**
 * One lane's place in Compare's comparative verdict (ADR-116), already mapped
 * back from the anonymous label the judge saw to the real lane.
 */
export type CompareJudgeLaneResult = {
  laneIndex: number;
  /** The anonymous label (A, B, C…) — the rationale refers to lanes by it. */
  label: string;
  provider: string;
  model: string;
  score: number;
  /** Competition rank: tied lanes share it (1, 1, 3). */
  rank: number;
  reason: string;
  truncated: boolean;
  criticSummary: string | null;
};

/**
 * The verdict of the ONE comparative judge call of a Compare run, as persisted
 * on every lane's assistant-message metadata under `compareJudge`.
 */
export type CompareJudgeVerdict = {
  status: CompareJudgeVerdictStatus;
  failureReason: CompareJudgeFailureReason | null;
  judgeModel: string;
  scale: { min: number; max: number };
  /** Best first. Empty unless `status` is RANKED. */
  lanes: CompareJudgeLaneResult[];
  /** Null on a tie for first and whenever nothing was ranked — never a default pick. */
  winnerLaneIndex: number | null;
  tiedLaneIndices: number[];
  rationale: string | null;
  truncated: boolean;
};

/** A ranking row ready to render. */
export type CompareRankingRow = CompareJudgeLaneResult & {
  isWinner: boolean;
  /** Integer 0-100 for the score bar. */
  scorePercent: number;
};

export type UseCompareJudgeRankingReturn = {
  rows: CompareRankingRow[];
  hasRanking: boolean;
  isTie: boolean;
  /** i18n key explaining a verdict with no ranking; null when there is a ranking. */
  noticeKey: string | null;
};

export type CompareJudgeRankingProps = {
  verdict: CompareJudgeVerdict;
  t: TranslateFunction;
};

/** The best lane of a run, and whether the comparative judge chose it. */
export type CompareBestResponse = {
  model: string | null;
  judged: boolean;
};
