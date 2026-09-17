import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { AssistantModelRole } from '../../../generated/prisma';
import {
  ASSISTANT_MODEL_SEED_ENTRIES,
  ASSISTANT_MODEL_SEED_NAME,
} from '../constants/assistant-model-seed.constants';
import { AssistantModelRepository } from '../repositories/assistant-model.repository';
import type {
  AssistantModelCandidate,
  AssistantModelInput,
  AssistantModelRecord,
} from '../types/assistant-model.types';

/**
 * Owns the models that do jobs beside routing — today, the research gate.
 *
 * They are configuration rows rather than environment variables so an operator
 * can change them from the admin page without a deploy, and so the model they
 * name can be checked against the real catalog. A model in an env var cannot be
 * validated against anything.
 */
@Injectable()
export class AssistantModelService implements OnModuleInit {
  private readonly logger = new Logger(AssistantModelService.name);

  constructor(private readonly repository: AssistantModelRepository) {}

  async onModuleInit(): Promise<void> {
    const seeded = await this.repository.seedOnce(ASSISTANT_MODEL_SEED_ENTRIES);
    this.logger.log(
      seeded
        ? `seed: ${ASSISTANT_MODEL_SEED_NAME} applied`
        : `seed: ${ASSISTANT_MODEL_SEED_NAME} already configured; leaving it alone`,
    );
  }

  async listByRole(role: AssistantModelRole): Promise<AssistantModelRecord[]> {
    return this.repository.findByRole(role);
  }

  /**
   * What a caller needs to place the call, in order, disabled rows removed.
   *
   * Filtered here rather than by the caller so that "disabled" means the same
   * thing everywhere: a candidate an operator has switched off is not tried.
   */
  async listCandidates(role: AssistantModelRole): Promise<AssistantModelCandidate[]> {
    const records = await this.repository.findByRole(role);
    return records
      .filter((record) => record.enabled)
      .map((record) => ({
        provider: record.provider,
        modelAlias: record.modelAlias,
        timeoutMs: record.timeoutMs,
        maxTokens: record.maxTokens,
      }));
  }

  async replaceRole(
    role: AssistantModelRole,
    entries: readonly AssistantModelInput[],
  ): Promise<AssistantModelRecord[]> {
    await this.repository.replaceRole(role, entries);
    return this.repository.findByRole(role);
  }
}
