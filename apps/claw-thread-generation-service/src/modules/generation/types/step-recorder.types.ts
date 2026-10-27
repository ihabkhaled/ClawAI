import type { ThreadGenerationStepOutcome, ThreadGenerationStepRoleKind } from '@claw/shared-types';

export type StepRecordInput = {
  stage: string;
  round?: number;
  outcome: ThreadGenerationStepOutcome;
  roleKind: ThreadGenerationStepRoleKind;
  roleId?: string | null;
  provider?: string | null;
  model?: string | null;
  code?: string | null;
  httpStatus?: number | null;
  durationMs?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  /** Raw model output; the recorder trims, redacts and bounds it. */
  rawExcerpt?: string | null;
  /** Longer than the default bound, for a step whose excerpt is the owner's main message. */
  excerptMaxChars?: number;
};

export type StepResponseOutcome = Pick<StepRecordInput, 'outcome' | 'code'>;

export type RoleStepInfo = { stage: string; roleKind: ThreadGenerationStepRoleKind };

export type StepRow = {
  seq: number;
  at: Date;
  stage: string;
  round: number;
  outcome: string;
  roleKind: string;
  roleId: string | null;
  provider: string | null;
  model: string | null;
  code: string | null;
  httpStatus: number | null;
  durationMs: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  excerpt: string | null;
};

export type StepAppendData = Omit<StepRow, 'seq' | 'at'>;

export type ParsedStepError = { code: string; httpStatus: number | null };
