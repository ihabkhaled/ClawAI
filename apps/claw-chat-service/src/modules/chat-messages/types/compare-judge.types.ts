import type { TokenUsageSource } from '@claw/shared-types';

import type {
  CompareJudgeFailureReason,
  CompareJudgeVerdictStatus,
} from '../../../common/enums';
import type { AssembledContext } from './context.types';
import type { FileDeliveryEntry } from './file-delivery.types';
import type { ParallelCriticConfig } from './parallel.types';

/** One completed Compare lane, as the comparative judge receives it. */
export type CompareJudgeLaneInput = {
  /** Position of the lane in the run's response list — the key everything unshuffles to. */
  laneIndex: number;
  provider: string;
  model: string;
  content: string;
  /** Which attachments this lane could and could not see, so it is not blamed for a missing one. */
  attachmentDelivery?: FileDeliveryEntry[];
};

/**
 * The order the judge saw the lanes in.
 *
 * Deterministic for a run id, and recorded on the verdict, so the mapping from
 * "candidate B" back to a lane is reproducible after the fact rather than a
 * value that only ever existed in memory.
 */
export type CompareJudgeShuffle = {
  seed: string;
  /** `order[i]` is the lane index the judge saw under `labels[i]`. */
  order: number[];
  labels: string[];
};

/** Answers after fair truncation to the judge's window. */
export type FairTruncationResult = {
  texts: string[];
  truncated: boolean[];
  /** The one cap every shortened answer was cut to; null when nothing was shortened. */
  capChars: number | null;
};

/** Critic output for one lane, reduced to what the comparative prompt shows. */
export type CompareLaneCritique = {
  laneIndex: number;
  notes: string[];
  summary: string | null;
};

export type CompareJudgePromptInput = {
  labels: string[];
  texts: string[];
  truncated: boolean[];
  capChars: number | null;
  /** Aligned with `labels`: the critic notes for the lane shown under that label. */
  criticNotes: Array<string[] | null>;
  /** Aligned with `labels`: filenames that lane could not receive. */
  missingFiles: string[][];
};

export type ParsedCompareJudgeScore = {
  label: string;
  score: number;
  reason: string;
};

/** The judge's JSON after the schema and every cross-field invariant passed. */
export type ParsedCompareJudgeOutput = {
  ranking: string[];
  scores: ParsedCompareJudgeScore[];
  rationale: string;
};

/** One lane's place in a ranked verdict, already unshuffled back to the lane. */
export type CompareJudgeLaneResult = {
  laneIndex: number;
  /** The anonymous label the judge knew this lane by — the rationale refers to it. */
  label: string;
  provider: string;
  model: string;
  score: number;
  /** Competition rank: tied lanes share a rank and the next rank is skipped (1, 1, 3). */
  rank: number;
  reason: string;
  truncated: boolean;
  criticSummary: string | null;
};

export type CompareJudgeUsage = {
  inputTokens: number;
  outputTokens: number;
  estimated: boolean;
  source: TokenUsageSource;
};

export type CompareJudgeScale = {
  min: number;
  max: number;
};

/**
 * The verdict of the one comparative judge call, persisted on every lane of the
 * run so whichever lane a client reads, it gets the same ranking.
 */
export type CompareJudgeVerdict = {
  version: number;
  status: CompareJudgeVerdictStatus;
  failureReason: CompareJudgeFailureReason | null;
  /** `provider/model` of the judge. */
  judgeModel: string;
  scale: CompareJudgeScale;
  /** Best first. Empty unless `status` is RANKED. */
  lanes: CompareJudgeLaneResult[];
  /** Null on a tie for first place, and whenever nothing was ranked. Never a default pick. */
  winnerLaneIndex: number | null;
  /** The lanes sharing first place when there is a tie; empty otherwise. */
  tiedLaneIndices: number[];
  rationale: string | null;
  shuffle: CompareJudgeShuffle | null;
  /** True when at least one answer was shortened to fit the judge's window. */
  truncated: boolean;
  latencyMs: number;
  usage: CompareJudgeUsage | null;
  judgedAt: string;
};

export type CompareJudgeRequest = {
  userId: string;
  threadId: string;
  /** The compare run id (`parallelGroupId`). Seeds the shuffle and keys the hold. */
  runId: string;
  /** The raw judge selection: `PROVIDER:model`, a local tag, `AUTO`, or null. */
  judgeModel: string | null;
  critic: ParallelCriticConfig;
  fileIds?: string[];
  /**
   * The system prompt the lanes were given, research evidence included. Shown
   * to the judge as data about the task, never as orders to it.
   */
  instructions: string | null;
  /** The context the lanes ran with — the per-lane critic reviews against it. */
  laneContext: AssembledContext;
  lanes: CompareJudgeLaneInput[];
};

export type CompareJudgeTarget = {
  provider: string;
  model: string;
};

export type CompareJudgeUnrankedInput = {
  status: CompareJudgeVerdictStatus;
  failureReason: CompareJudgeFailureReason;
  judgeModel: string;
  shuffle: CompareJudgeShuffle | null;
  truncated: boolean;
  latencyMs: number;
  usage: CompareJudgeUsage | null;
};

export type CompareJudgeRankedInput = {
  parsed: ParsedCompareJudgeOutput;
  shuffle: CompareJudgeShuffle;
  lanes: CompareJudgeLaneInput[];
  truncatedByLabel: boolean[];
  critiques: CompareLaneCritique[];
  judgeModel: string;
  latencyMs: number;
  usage: CompareJudgeUsage | null;
};
