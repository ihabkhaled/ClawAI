import { Controller, Logger, MessageEvent, Param, Sse } from "@nestjs/common";
import { filter, map, Observable, Subject } from "rxjs";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser } from "../../../common/types";
import { StreamEventType } from "../../../common/enums";
import { type StreamEvent } from "../types/stream.types";

@Controller("chat-messages")
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);
  private readonly eventBus = new Subject<StreamEvent>();

  /** Called by ChatMessagesService when an assistant response is stored */
  emitCompletion(threadId: string, provider: string, model: string): void {
    this.eventBus.next({ threadId, type: StreamEventType.DONE, provider, model });
  }

  @Sse("stream/:threadId")
  stream(
    @Param("threadId") threadId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    this.logger.debug(`SSE connection opened for thread ${threadId}`);

    return this.eventBus.pipe(
      filter((event) => event.threadId === threadId),
      map((event): MessageEvent => ({
        data: JSON.stringify(event),
      })),
    );
  }
}
