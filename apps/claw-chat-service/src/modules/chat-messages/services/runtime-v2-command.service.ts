import { HttpStatus, Injectable } from '@nestjs/common';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { AttachmentInfoClient } from '../clients/attachment-info.client';
import {
  RUNTIME_V2_RESULT_FILE_MIME_PREFIX,
  RUNTIME_V2_RESULT_FILE_NOT_IMAGE_CODE,
  RUNTIME_V2_RESULT_FILE_NOT_IMAGE_MESSAGE,
  RUNTIME_V2_RESULT_FILE_UNAVAILABLE_CODE,
  RUNTIME_V2_RESULT_FILE_UNAVAILABLE_MESSAGE,
} from '../constants/runtime-v2-result-files.constants';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import type { RuntimeCancelDto, RuntimeResultDto, RuntimeSteeringDto } from '../dto/runtime-v2.dto';
import { RuntimeV2ToolCatalogStore } from '../repositories/runtime-v2-tool-catalog.store';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { RuntimeV2BoundInput, RuntimeV2MutationAck } from '../types/runtime-v2-store.types';
import { RuntimeV2LoopManager } from '../managers/runtime-v2-loop.manager';

@Injectable()
export class RuntimeV2CommandService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly store: RuntimeV2Store,
    private readonly loop: RuntimeV2LoopManager,
    private readonly catalog: RuntimeV2ToolCatalogStore,
    private readonly attachments: AttachmentInfoClient,
  ) {}

  async submitResult(
    ownerId: string,
    threadId: string,
    runId: string,
    command: RuntimeResultDto,
  ): Promise<RuntimeV2MutationAck> {
    const binding = await this.binding(ownerId, threadId, runId, command.generation);
    await this.assertResultFilesOwned(ownerId, command.result.fileIds);
    const acknowledgement = await this.store.submitResult({ ...binding, command });
    if (!acknowledgement.replayed && command.result.continuation.action === 'continue') {
      // The next turn sees every deferred tool loaded so far (F028).
      await this.loop.continueAfterResult(await this.catalog.effectiveBinding(binding), command);
    }
    if (
      !acknowledgement.replayed &&
      command.result.continuation.action !== 'continue' &&
      binding.claimId !== undefined
    ) {
      await this.store.terminalize({
        ...binding,
        claimId: binding.claimId,
        idempotencyKey: `${command.idempotencyKey}:terminal`,
        status:
          command.result.status === 'succeeded' && command.result.continuation.action === 'final'
            ? 'completed'
            : 'failed',
        completedAt: new Date().toISOString(),
      });
    }
    return acknowledgement;
  }

  async submitSteering(
    ownerId: string,
    threadId: string,
    runId: string,
    command: RuntimeSteeringDto,
  ): Promise<RuntimeV2MutationAck> {
    const binding = await this.binding(ownerId, threadId, runId, command.generation);
    return this.store.submitSteering({ ...binding, command });
  }

  async cancel(
    ownerId: string,
    threadId: string,
    runId: string,
    command: RuntimeCancelDto,
  ): Promise<RuntimeV2MutationAck> {
    const binding = await this.binding(ownerId, threadId, runId, command.generation);
    return this.store.cancel({ ...binding, command });
  }

  /**
   * Every file a tool result names must be an image this same account uploaded
   * (F030). file-service answers 404 for anyone else's file, so a client cannot
   * point the model at another user's upload by guessing an id. Checked before
   * the result is recorded, so a refused result leaves no trace in the run.
   */
  private async assertResultFilesOwned(
    ownerId: string,
    fileIds: readonly string[] | undefined,
  ): Promise<void> {
    if (fileIds === undefined) return;
    const mimeTypes = await Promise.all(
      fileIds.map(async (fileId) => (await this.attachments.mimeTypes([fileId], ownerId)).at(0)),
    );
    if (mimeTypes.includes(undefined)) {
      throw new BusinessException(
        RUNTIME_V2_RESULT_FILE_UNAVAILABLE_MESSAGE,
        RUNTIME_V2_RESULT_FILE_UNAVAILABLE_CODE,
        HttpStatus.NOT_FOUND,
      );
    }
    if (
      mimeTypes.some(
        (mimeType) => mimeType?.startsWith(RUNTIME_V2_RESULT_FILE_MIME_PREFIX) !== true,
      )
    ) {
      throw new BusinessException(
        RUNTIME_V2_RESULT_FILE_NOT_IMAGE_MESSAGE,
        RUNTIME_V2_RESULT_FILE_NOT_IMAGE_CODE,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
  }

  private async binding(
    ownerId: string,
    threadId: string,
    runId: string,
    generation: string,
  ): Promise<RuntimeV2BoundInput> {
    const thread = await this.threads.findById(threadId);
    if (thread?.userId !== ownerId) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    return this.store.resolveBinding({
      ownerId,
      threadId,
      runId,
      generation,
      ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
    });
  }
}
