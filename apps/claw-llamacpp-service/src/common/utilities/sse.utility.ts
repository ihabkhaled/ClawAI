import { Logger } from '@nestjs/common';
import { Subject } from 'rxjs';
import { type SseEvent } from '../types/sse-event.type';

const logger = new Logger('SseBus');

export class SseChannel<T> {
  private readonly subject = new Subject<SseEvent<T>>();
  private lastEvent: SseEvent<T> | null = null;
  private closed = false;

  publish(event: SseEvent<T>): void {
    if (this.closed) {
      logger.warn(`publish: dropping event "${event.event}" — channel already closed`);
      return;
    }
    this.lastEvent = event;
    this.subject.next(event);
  }

  asObservable(): Subject<SseEvent<T>> {
    return this.subject;
  }

  getLast(): SseEvent<T> | null {
    return this.lastEvent;
  }

  isClosed(): boolean {
    return this.closed;
  }

  close(): void {
    if (this.closed) {
      return;
    }
    this.closed = true;
    this.subject.complete();
  }
}
