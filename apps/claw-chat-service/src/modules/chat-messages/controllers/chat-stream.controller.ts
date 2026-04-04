import { Controller, Param, Sse, MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import { CurrentUser } from "../../../app/decorators/current-user.decorator";
import { type AuthenticatedUser } from "../../../common/types";

@Controller("chat-messages")
export class ChatStreamController {
  @Sse("stream/:threadId")
  stream(
    @Param("threadId") _threadId: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      subscriber.next({
        data: JSON.stringify({
          type: "info",
          content: "Streaming not yet connected to providers",
        }),
      });
      subscriber.complete();
    });
  }
}
