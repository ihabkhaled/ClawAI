import type { GenerationStepsRepository } from '../repositories/generation-steps.repository';
import type { StepRecordInput } from '../types/step-recorder.types';

import { toExcerpt } from './redact-excerpt.utility';

/** The stored shape of one step-log row; optional inputs become explicit nulls. */
export function toStepRow(
  input: StepRecordInput,
): Parameters<GenerationStepsRepository['append']>[1] {
  return {
    stage: input.stage,
    round: input.round ?? 0,
    outcome: input.outcome,
    roleKind: input.roleKind,
    roleId: input.roleId ?? null,
    provider: input.provider ?? null,
    model: input.model ?? null,
    code: input.code ?? null,
    httpStatus: input.httpStatus ?? null,
    durationMs: input.durationMs ?? null,
    inputTokens: input.inputTokens ?? null,
    outputTokens: input.outputTokens ?? null,
    excerpt: toExcerpt(input.rawExcerpt, input.excerptMaxChars),
  };
}
