import type { ResearchEvidence } from '../../research/research.client';
import type { StepRecordInput } from './step-recorder.types';

/** The stage, round and role kind every step of one research pass carries. */
export type ResearchStepBase = Pick<StepRecordInput, 'stage' | 'round' | 'roleKind'>;

/** A pass's step base, and whether each query must check the spend ceiling first. */
export type ResearchPassBase = ResearchStepBase & { checkBudget?: boolean };

/** One query of a research pass and what it returned; `evidence` is null when the call failed. */
export type ResearchQueryResult = {
  query: string;
  evidence: ResearchEvidence | null;
  itemCount: number;
  /** The error of a failed call, so a pass where every query failed can report the first one. */
  error?: unknown;
  /** True when the query was not sent because the job was over its spend ceiling. */
  skippedForSpend: boolean;
};

/** What the runner needs from the pipeline; replaced by fakes in specs. */
export type ResearchRunnerDeps = {
  run: (intent: string) => Promise<ResearchEvidence>;
  /** True when no further query may start (spend ceiling reached or no healing attempt left). */
  overBudget: () => Promise<boolean>;
  /** Throws when the job is cancelled or its time budget is spent. */
  throwIfCancelled: () => Promise<void>;
  /** Records one query's outcome in the step log. */
  record: (result: ResearchQueryResult, failed: boolean) => Promise<void>;
};
