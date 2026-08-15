import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { from, type Observable } from 'rxjs';

import { BusinessException } from '../../../common/errors';
import { RUNTIME_V2_ACTIVE_TTL_SECONDS } from '../constants/runtime-v2-run.constants';
import {
  RUNTIME_V2_POLL_FAILURE_TOLERANCE,
  RUNTIME_V2_POLL_MS,
} from '../constants/runtime-v2-stream.constants';
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
  private readonly logger = new Logger(RuntimeV2StreamService.name);

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
    let consecutiveFailures = 0;
    for (;;) {
      if (this.leaseExpired(expiresAtEpochSeconds)) return;
      let page;
      try {
        page = await this.store.readEvents({ ...binding, after: cursor });
      } catch (error) {
        // A poll is idempotent: it re-reads from the same cursor, so a failed
        // one can simply be repeated without losing or duplicating an event.
        // Letting it escape ended the whole stream, and the client renders that
        // as RUNTIME_STATE_UNAVAILABLE — a run that is still executing looks
        // dead. Seen while the agent ran `git commit`: one poll reported
        // `Connection is closed` while Redis answered PING and the service had
        // not restarted, and the run's work was lost. Only a sustained outage
        // should end the stream.
        consecutiveFailures += 1;
        if (consecutiveFailures > RUNTIME_V2_POLL_FAILURE_TOLERANCE) throw error;
        this.logger.warn(
          `Runtime V2 stream poll failed (${String(consecutiveFailures)}/${String(
            RUNTIME_V2_POLL_FAILURE_TOLERANCE,
          )}), retrying`,
        );
        await this.waitForNextPoll(expiresAtEpochSeconds);
        continue;
      }
      consecutiveFailures = 0;
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
