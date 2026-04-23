import { Controller, Logger, MessageEvent, Param, Sse } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { concat, filter, from, map, Observable } from 'rxjs';
import { CurrentUser } from '../../../app/decorators/current-user.decorator';
import { SkipLogging } from '../../../app/decorators/skip-logging.decorator';
import { type AuthenticatedUser } from '../../../common/types';
import { ChatStreamService } from '../services/chat-stream.service';

@Controller('chat-messages')
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);

  constructor(private readonly chatStreamService: ChatStreamService) {}

  @Sse('stream/:threadId')
  @SkipLogging()
  @SkipThrottle()
  stream(
    @Param('threadId') threadId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    this.logger.debug(`SSE connection opened for thread ${threadId}`);

    const replayEvents = from(this.chatStreamService.getRecentEvents(threadId));
    const liveEvents = this.chatStreamService.eventBus.pipe(
      filter((event) => event.threadId === threadId),
    );

    return concat(replayEvents, liveEvents).pipe(
      map(
        (event): MessageEvent => ({
          data: JSON.stringify(event),
        }),
      ),
    );
  }
}
