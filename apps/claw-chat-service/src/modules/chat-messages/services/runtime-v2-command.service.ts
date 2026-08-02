import { Injectable } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import type { RuntimeCancelDto, RuntimeResultDto, RuntimeSteeringDto } from '../dto/runtime-v2.dto';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { RuntimeV2BoundInput, RuntimeV2MutationAck } from '../types/runtime-v2-store.types';
import { RuntimeV2LoopManager } from '../managers/runtime-v2-loop.manager';

@Injectable()
export class RuntimeV2CommandService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly store: RuntimeV2Store,
    private readonly loop: RuntimeV2LoopManager,
  ) {}

  async submitResult(
    ownerId: string,
    threadId: string,
    runId: string,
    command: RuntimeResultDto,
  ): Promise<RuntimeV2MutationAck> {
    const binding = await this.binding(ownerId, threadId, runId, command.generation);
    const acknowledgement = await this.store.submitResult({ ...binding, command });
    if (!acknowledgement.replayed && command.result.continuation.action === 'continue') {
      await this.loop.continueAfterResult(binding, command);
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
