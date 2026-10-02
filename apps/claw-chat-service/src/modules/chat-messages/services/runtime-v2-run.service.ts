import { HttpStatus, Injectable, Optional } from '@nestjs/common';
import { EventPattern } from '@claw/shared-types';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { randomBytes } from 'node:crypto';

import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { MessageRole, type Prisma } from '../../../generated/prisma';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import type { RuntimeStartDto } from '../dto/runtime-v2.dto';
import { ChatMessagesRepository } from '../repositories/chat-messages.repository';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { RuntimeV2RoutingSelection } from '../types/runtime-v2-routing.types';
import type { RuntimeV2BoundInput, RuntimeV2StartAck } from '../types/runtime-v2-store.types';
import { runtimeV2MessageMetadataSchema } from '../types/runtime-v2-run.types';
import { resolveRuntimeRouting } from '../utilities/runtime-v2-routing.utility';
import { RuntimeV2AccessService } from './runtime-v2-access.service';
import { ZeroRetentionService } from './zero-retention.service';

@Injectable()
export class RuntimeV2RunService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly messages: ChatMessagesRepository,
    private readonly access: RuntimeV2AccessService,
    private readonly store: RuntimeV2Store,
    private readonly rabbit: RabbitMQService,
    // Optional so hand-built specs keep their shape. Absent → the header is
    // ignored, exactly as before F055.
    @Optional() private readonly zeroRetention?: ZeroRetentionService,
  ) {}

  async start(
    ownerId: string,
    request: RuntimeStartDto,
    zeroRetention?: boolean,
  ): Promise<RuntimeV2StartAck> {
    const thread = await this.threads.findById(request.threadId);
    if (thread === null || thread.userId !== ownerId) {
      throw new EntityNotFoundException('ChatThread', request.threadId);
    }

    await this.access.reserveStart(ownerId, request);
    const messageId = `msg_${randomBytes(16).toString('hex')}`;
    let acknowledgement: RuntimeV2StartAck;
    try {
      acknowledgement = await this.store.start({
        ownerId,
        messageId,
        request,
        ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
      });
    } catch (error) {
      await this.releaseAdmission(ownerId, request.clientRequestId);
      throw error;
    }

    const binding = this.binding(ownerId, acknowledgement, request);
    const routing = resolveRuntimeRouting(request.provider, request.model);
    if (acknowledgement.replayed) {
      return this.completeReplay(ownerId, request, acknowledgement, routing);
    }

    try {
      // Marked before the prompt is stored or published, so however fast the
      // run ends, its terminal event finds the mark and purges it (F055).
      await this.markZeroRetention(zeroRetention, acknowledgement.runId);
      await this.messages.create({
        id: acknowledgement.messageId,
        threadId: request.threadId,
        role: MessageRole.USER,
        content: request.prompt,
        routingMode: routing.routingMode,
        ...(routing.provider === undefined ? {} : { provider: routing.provider }),
        ...(routing.model === undefined ? {} : { model: routing.model }),
        // `fileIds` is stored where every other surface already looks for
        // attachments: the context assembler reads `metadata.fileIds` off the
        // latest user message, so this is what makes an agent run see the
        // file the user dropped in.
        metadata: {
          ...this.runtimeMetadata(acknowledgement, request, false),
          ...this.attachmentMetadata(request),
        },
      });
    } catch (error) {
      await this.compensate(binding, false);
      throw error;
    }

    try {
      await this.publish(ownerId, request, acknowledgement, routing);
    } catch {
      await this.compensate(binding, true);
      throw new BusinessException(
        'Runtime start could not be published',
        'RUNTIME_START_PUBLISH_UNAVAILABLE',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    try {
      await this.markPublished(acknowledgement, request, this.attachmentMetadata(request));
    } catch {
      throw new BusinessException(
        'Runtime start publication state is uncertain',
        'RUNTIME_START_OUTCOME_UNCERTAIN',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return acknowledgement;
  }

  private async markZeroRetention(requested: boolean | undefined, runId: string): Promise<void> {
    if (requested !== true || this.zeroRetention === undefined) return;
    await this.zeroRetention.markRuntimeRun(runId);
  }

  /** Finishes a start the caller already made, publishing it if that step never landed. */
  private async completeReplay(
    ownerId: string,
    request: RuntimeStartDto,
    acknowledgement: RuntimeV2StartAck,
    routing: RuntimeV2RoutingSelection,
  ): Promise<RuntimeV2StartAck> {
    const existing = await this.messages.findById(acknowledgement.messageId);
    if (existing === null) {
      throw new BusinessException(
        'The earlier Runtime V2 start did not complete',
        'RUNTIME_START_INCOMPLETE',
        HttpStatus.CONFLICT,
      );
    }
    const metadata = runtimeV2MessageMetadataSchema.safeParse(existing.metadata);
    if (!metadata.success) {
      throw new BusinessException(
        'The earlier Runtime V2 start has invalid state',
        'RUNTIME_START_INCOMPLETE',
        HttpStatus.CONFLICT,
      );
    }
    if (metadata.data.runtimeV2.publicationState === 'pending') {
      await this.publish(ownerId, request, acknowledgement, routing);
      await this.markPublished(acknowledgement, request, this.storedMetadata(existing.metadata));
    }
    return acknowledgement;
  }

  private publish(
    ownerId: string,
    request: RuntimeStartDto,
    acknowledgement: RuntimeV2StartAck,
    routing: RuntimeV2RoutingSelection,
  ): Promise<void> {
    return this.rabbit.publishConfirmed(EventPattern.MESSAGE_CREATED, {
      messageId: acknowledgement.messageId,
      threadId: request.threadId,
      userId: ownerId,
      content: request.prompt,
      runtimeV2: true,
      routingMode: routing.routingMode,
      ...(routing.provider === undefined
        ? {}
        : {
            forcedProvider: routing.provider,
            forcedModel: routing.model,
            allowedModels: routing.allowedModels,
          }),
      timestamp: new Date().toISOString(),
    });
  }

  private runtimeMetadata(
    acknowledgement: RuntimeV2StartAck,
    request: RuntimeStartDto,
    confirmed: boolean,
  ): { runtimeV2: Record<string, string> } {
    return {
      runtimeV2: {
        runId: acknowledgement.runId,
        generation: acknowledgement.generation,
        clientRequestId: request.clientRequestId,
        publicationState: confirmed ? 'confirmed' : 'pending',
      },
    };
  }

  private attachmentMetadata(request: RuntimeStartDto): { fileIds?: string[] } {
    return request.fileIds === undefined || request.fileIds.length === 0
      ? {}
      : { fileIds: request.fileIds };
  }

  private storedMetadata(stored: unknown): Record<string, unknown> {
    return typeof stored === 'object' && stored !== null && !Array.isArray(stored)
      ? { ...stored }
      : {};
  }

  /**
   * `updateMetadata` REPLACES the whole object. Writing only `{ runtimeV2 }`
   * here wiped the `fileIds` stored at create time, so an image attached to a
   * run never reached the model. The mark is merged over `base`: the stored
   * metadata on a replay, or the attachments this request carried.
   */
  private markPublished(
    acknowledgement: RuntimeV2StartAck,
    request: RuntimeStartDto,
    base: Record<string, unknown>,
  ): Promise<void> {
    return this.messages.updateMetadata(acknowledgement.messageId, {
      ...base,
      ...this.runtimeMetadata(acknowledgement, request, true),
    } as Prisma.InputJsonObject);
  }

  private binding(
    ownerId: string,
    acknowledgement: RuntimeV2StartAck,
    request: RuntimeStartDto,
  ): RuntimeV2BoundInput {
    return {
      ownerId,
      threadId: request.threadId,
      messageId: acknowledgement.messageId,
      clientRequestId: request.clientRequestId,
      startIdempotencyKey: request.idempotencyKey,
      runId: acknowledgement.runId,
      generation: acknowledgement.generation,
      epochs: request.epochs,
      manifestHash: request.manifestHash,
      toolCatalogHash: request.toolCatalogHash,
      toolDefinitions: request.toolDefinitions,
      provider: request.provider,
      model: request.model,
      ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
    };
  }

  private async compensate(binding: RuntimeV2BoundInput, deleteMessage: boolean): Promise<void> {
    try {
      await this.store.cancel({
        ...binding,
        command: {
          generation: binding.generation,
          idempotencyKey: `cancel_${randomBytes(16).toString('hex')}`,
          epochs: binding.epochs,
          requestedAt: new Date().toISOString(),
        },
      });
      if (deleteMessage) await this.messages.deleteById(binding.messageId);
      await this.access.releaseStart(binding.ownerId, binding.clientRequestId);
    } catch {
      throw new BusinessException(
        'Runtime start compensation is uncertain',
        'RUNTIME_START_OUTCOME_UNCERTAIN',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private async releaseAdmission(ownerId: string, requestId: string): Promise<void> {
    try {
      await this.access.releaseStart(ownerId, requestId);
    } catch {
      throw new BusinessException(
        'Runtime admission release is uncertain',
        'RUNTIME_START_OUTCOME_UNCERTAIN',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
