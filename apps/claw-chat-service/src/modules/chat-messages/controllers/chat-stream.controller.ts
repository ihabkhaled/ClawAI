import {
  Controller,
  Logger,
  MessageEvent,
  Param,
  ParseBoolPipe,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { from, map, Observable, switchMap } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { SkipLogging } from '../../../app/decorators/skip-logging.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ChatStreamService } from '../services/chat-stream.service';
import { StreamControlService } from '../services/stream-control.service';
import { type CancelStreamResult } from '../types/stream.types';

@Controller('chat-messages')
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);

  constructor(
    private readonly chatStreamService: ChatStreamService,
    private readonly streamControl: StreamControlService,
  ) {}

  @Sse('stream/:threadId')
  @SkipLogging()
  @SkipThrottle()
  stream(
    @Param('threadId') threadId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('replay', new ParseBoolPipe({ optional: true })) replay?: boolean,
  ): Observable<MessageEvent> {
    this.logger.debug(`SSE connection opened for thread ${threadId} by user ${user.id}`);
    // Ownership is asserted before any event is replayed/streamed, so a user
    // can never subscribe to another user's thread. A rejection errors the
    // observable, closing the SSE connection.
    return from(this.streamControl.assertOwnership(threadId, user.id)).pipe(
      switchMap(() => this.chatStreamService.streamEvents(threadId, replay)),
      map((event): MessageEvent => ({ data: JSON.stringify(event) })),
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
