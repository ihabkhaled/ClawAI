import { Injectable, Logger } from '@nestjs/common';

import { GenerationStepsRepository } from '../repositories/generation-steps.repository';
import type { StepRecordInput } from '../types/step-recorder.types';
import { toExcerpt } from '../utilities/redact-excerpt.utility';

/** Writes the owner-visible step log. Recording must never break a generation. */
@Injectable()
export class StepRecorder {
  private readonly logger = new Logger(StepRecorder.name);

  constructor(private readonly steps: GenerationStepsRepository) {}

  async record(jobId: string, input: StepRecordInput): Promise<void> {
    try {
      const stored = await this.steps.append(jobId, {
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
        excerpt: toExcerpt(input.rawExcerpt),
      });
      if (!stored) this.logger.warn('Generation step skipped after sequence contention');
    } catch {
      this.logger.warn('Generation step could not be recorded');
    }
  }
}
