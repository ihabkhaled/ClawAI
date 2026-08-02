import { HttpStatus, Injectable } from '@nestjs/common';
import { from, type Observable } from 'rxjs';

import { BusinessException } from '../../../common/errors';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import { RUNTIME_V2_POLL_MS } from '../constants/runtime-v2-stream.constants';
import {
  type RuntimeEventDto,
  type RuntimeStreamQueryDto,
  runtimeStreamQuerySchema,
} from '../dto/runtime-v2.dto';
import { RuntimeV2Store } from '../repositories/runtime-v2.store';
import type { RuntimeV2RawStreamQuery } from '../types/runtime-v2-stream.types';
import { ChatStreamService } from './chat-stream.service';

@Injectable()
export class RuntimeV2StreamService {
  constructor(
    private readonly store: RuntimeV2Store,
    private readonly chatStream: ChatStreamService,
  ) {}

  selectEvents(
    ownerId: string,
    threadId: string,
    query: RuntimeV2RawStreamQuery,
    expiresAtEpochSeconds?: number,
  ): Observable<unknown> {
    if (query['protocol'] === 'v2') {
      const runtimeQuery = runtimeStreamQuerySchema.parse(query);
      return this.stream(ownerId, threadId, runtimeQuery, expiresAtEpochSeconds);
    }
    return this.chatStream.streamEvents(threadId, this.legacyReplay(query['replay']));
  }

  private stream(
    ownerId: string,
    threadId: string,
    query: RuntimeStreamQueryDto,
    expiresAtEpochSeconds?: number,
  ): Observable<RuntimeEventDto> {
    return from(this.read(ownerId, threadId, query, expiresAtEpochSeconds));
  }

  private legacyReplay(value: string | undefined): boolean {
    if (value === undefined || value === 'true') return true;
    if (value === 'false') return false;
    throw new BusinessException(
      'replay must be a boolean',
      'INVALID_STREAM_REPLAY',
      HttpStatus.BAD_REQUEST,
    );
  }

  private async *read(
    ownerId: string,
    threadId: string,
    query: RuntimeStreamQueryDto,
    expiresAtEpochSeconds?: number,
  ): AsyncGenerator<RuntimeEventDto> {
    const binding = await this.store.resolveBinding({
      ownerId,
      threadId,
      runId: query.runId,
      generation: query.generation,
      ttlSeconds: RUNTIME_V2_ACTIVE_TTL_SECONDS,
    });
    let cursor = query.after;
    for (;;) {
      if (this.leaseExpired(expiresAtEpochSeconds)) return;
      const page = await this.store.readEvents({ ...binding, after: cursor });
      for (const event of page.events) {
        cursor = event.sequence;
        yield event;
      }
      if (page.terminal) return;
      await this.waitForNextPoll(expiresAtEpochSeconds);
    }
  }

  private leaseExpired(expiresAtEpochSeconds: number | undefined): boolean {
    return expiresAtEpochSeconds !== undefined && Date.now() >= expiresAtEpochSeconds * 1_000;
  }

  private waitForNextPoll(expiresAtEpochSeconds: number | undefined): Promise<void> {
    const untilExpiry =
      expiresAtEpochSeconds === undefined
        ? RUNTIME_V2_POLL_MS
        : Math.max(0, expiresAtEpochSeconds * 1_000 - Date.now());
    return new Promise((resolve) => setTimeout(resolve, Math.min(RUNTIME_V2_POLL_MS, untilExpiry)));
  }
}
