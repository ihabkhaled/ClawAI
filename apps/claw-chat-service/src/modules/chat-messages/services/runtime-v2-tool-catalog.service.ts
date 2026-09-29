import { Injectable } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors';
import { ChatThreadsRepository } from '../../chat-threads/repositories/chat-threads.repository';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import type { RuntimeDeferredToolLoadDto } from '../dto/runtime-v2-deferred-tools.dto';
import { RuntimeV2ToolCatalogStore } from '../repositories/runtime-v2-tool-catalog.store';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { RuntimeV2DeferredLoadAck } from '../types/runtime-v2-deferred-tools.types';
import { deferredToolField } from '../utilities/runtime-v2-deferred-tools.utility';

/**
 * Loads deferred tool definitions into a running run's catalog (F028).
 *
 * Authorised exactly like every other run command: the caller must own the
 * thread, and the run is resolved by owner, thread, run and generation, so a
 * load can only ever reach the caller's own run.
 */
@Injectable()
export class RuntimeV2ToolCatalogService {
  constructor(
    private readonly threads: ChatThreadsRepository,
    private readonly store: RuntimeV2Store,
    private readonly catalog: RuntimeV2ToolCatalogStore,
  ) {}

  async load(
    ownerId: string,
    threadId: string,
    runId: string,
    command: RuntimeDeferredToolLoadDto,
  ): Promise<RuntimeV2DeferredLoadAck> {
    const thread = await this.threads.findById(threadId);
    if (thread?.userId !== ownerId) {
      throw new EntityNotFoundException('ChatThread', threadId);
    }
    const binding = await this.store.resolveBinding({
      ownerId,
      threadId,
      runId,
      generation: command.generation,
      ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
    });
    const catalog = await this.catalog.load(binding, command.definitions);
    const requested = new Set(command.definitions.map(deferredToolField));
    return {
      runId,
      catalogVersion: catalog.catalogVersion,
      effectiveCatalogHash: catalog.effectiveCatalogHash,
      loaded: catalog.definitions
        .filter((definition) => requested.has(deferredToolField(definition)))
        .map((definition) => ({ name: definition.name, version: definition.version })),
    };
  }
}
