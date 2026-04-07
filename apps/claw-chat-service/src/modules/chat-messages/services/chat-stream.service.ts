import { Injectable, Logger } from "@nestjs/common";
import { Subject } from "rxjs";
import { type StreamEvent } from "../types/stream.types";
import { StreamEventType } from "../../../common/enums";

@Injectable()
export class ChatStreamService {
  private readonly logger = new Logger(ChatStreamService.name);
  readonly eventBus = new Subject<StreamEvent>();

  emitCompletion(threadId: string, provider: string, model: string): void {
    this.eventBus.next({ threadId, type: StreamEventType.DONE, provider, model });
    this.logger.debug(`Emitted completion for thread ${threadId}`);
  }
}
