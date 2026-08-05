import { Controller, Logger, MessageEvent, Param, Post, Query, Sse } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  catchError,
  endWith,
  from,
  ignoreElements,
  interval,
  map,
  merge,
  Observable,
  of,
  share,
  switchMap,
  takeUntil,
} from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { SkipLogging } from '../../../app/decorators/skip-logging.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { StreamControlService } from '../services/stream-control.service';
import { type CancelStreamResult } from '../types/stream.types';
import { RuntimeV2StreamService } from '../services/runtime-v2-stream.service';
import { runtimeV2StreamErrorEvent } from '../utilities/runtime-v2-failure.utility';
import type { RuntimeV2RawStreamQuery } from '../types/runtime-v2-stream.types';

@Controller('chat-messages')
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);

  constructor(
    private readonly streamControl: StreamControlService,
    private readonly runtimeV2Stream: RuntimeV2StreamService,
  ) {}

  @Sse('stream/:threadId')
  @SkipLogging()
  @SkipThrottle()
  stream(
    @Param('threadId') threadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: RuntimeV2RawStreamQuery,
  ): Observable<MessageEvent> {
    this.logger.debug(`SSE connection opened for thread ${threadId} by user ${user.id}`);
    // Ownership is asserted before any event is replayed/streamed, so a user
    // can never subscribe to another user's thread. A rejection errors the
    // observable, closing the SSE connection.
    return from(this.streamControl.assertOwnership(threadId, user.id)).pipe(
      switchMap(() => {
        const events = this.runtimeV2Stream
          .selectEvents(user.id, threadId, query, user.expiresAtEpochSeconds)
          .pipe(share());
        const completed = events.pipe(ignoreElements(), endWith(null));
        const heartbeat = interval(15_000).pipe(
          map(() => ({ type: 'HEARTBEAT' })),
          takeUntil(completed),
        );
        return merge(events, heartbeat);
      }),
      map((event): MessageEvent => ({ data: JSON.stringify(event) })),
      // An errored SSE observable is otherwise serialized by Nest as the raw
      // error message on the data line, which no consumer can parse — the real
      // cause was replaced by a JSON parse failure and surfaced in the
      // extension as "stream returned an invalid event". Emitting a
      // well-formed terminal event keeps the failure readable and still ends
      // the stream.
      catchError((error: unknown) =>
        of<MessageEvent>({ data: JSON.stringify(runtimeV2StreamErrorEvent(error)) }),
      ),
    );
  }

  @Post('stream/:threadId/cancel')
  cancel(
    @Param('threadId') threadId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CancelStreamResult> {
    return this.streamControl.cancelStream(threadId, user.id);
  }
}
