import { Controller, Logger, Param, Sse, MessageEvent } from "@nestjs/common";
import { Observable, Subject, filter, map } from "rxjs";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser } from "../../../common/types";

type StreamEvent = {
  threadId: string;
  type: "chunk" | "done" | "error";
  content?: string;
  provider?: string;
  model?: string;
};

@Controller("chat-messages")
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);
  private readonly eventBus = new Subject<StreamEvent>();

  /** Called by ChatMessagesService when an assistant response is stored */
  emitCompletion(threadId: string, provider: string, model: string): void {
    this.eventBus.next({ threadId, type: "done", provider, model });
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
