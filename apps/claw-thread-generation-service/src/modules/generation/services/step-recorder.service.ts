import { Injectable, Logger } from '@nestjs/common';

import { GenerationStepsRepository } from '../repositories/generation-steps.repository';
import type { StepRecordInput } from '../types/step-recorder.types';
import type { CandidateHealth } from '../types/healing.types';
import { toStepRow } from '../utilities/step-row.utility';

/** Writes the owner-visible step log. Recording must never break a generation. */
@Injectable()
export class StepRecorder {
  private readonly logger = new Logger(StepRecorder.name);

  constructor(private readonly steps: GenerationStepsRepository) {}

  /** Recent success and failure counts per model; throws when the log cannot be read. */
  recentModelHealth(since: Date): Promise<Map<string, CandidateHealth>> {
    return this.steps.recentModelHealth(since);
  }

  /** Models that failed this role for their own reasons in this job; throws when unreadable. */
  modelSpecificFailures(jobId: string, roleId: string): Promise<Set<string>> {
    return this.steps.modelSpecificFailures(jobId, roleId);
  }

  async record(jobId: string, input: StepRecordInput): Promise<void> {
    try {
      const stored = await this.steps.append(jobId, toStepRow(input));
      if (!stored) this.logger.warn('Generation step skipped after sequence contention');
    } catch {
      this.logger.warn('Generation step could not be recorded');
    }
  }
}
