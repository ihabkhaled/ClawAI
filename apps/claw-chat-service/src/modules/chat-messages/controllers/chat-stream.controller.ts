import { Controller, Logger, MessageEvent, Param, Sse } from "@nestjs/common";
import { filter, map, Observable } from "rxjs";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser } from "../../../common/types";
import { ChatStreamService } from "../services/chat-stream.service";

@Controller("chat-messages")
export class ChatStreamController {
  private readonly logger = new Logger(ChatStreamController.name);

  constructor(private readonly chatStreamService: ChatStreamService) {}

  @Sse("stream/:threadId")
  stream(
    @Param("threadId") threadId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    this.logger.debug(`SSE connection opened for thread ${threadId}`);

    return this.chatStreamService.eventBus.pipe(
      filter((event) => event.threadId === threadId),
      map((event): MessageEvent => ({
        data: JSON.stringify(event),
      })),
    );
  }
}
