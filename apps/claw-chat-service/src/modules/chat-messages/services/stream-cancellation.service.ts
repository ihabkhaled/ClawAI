import { Injectable, Logger } from '@nestjs/common';

// Registry of in-flight stream runs keyed by threadId. Holds the AbortController
// whose signal is wired into the streaming HTTP read, so a cancel request can
// abort the provider connection immediately and free server/provider resources.
@Injectable()
export class StreamCancellationService {
  private readonly logger = new Logger(StreamCancellationService.name);
  private readonly controllers = new Map<string, AbortController>();

  register(key: string): AbortController {
    const existing = this.controllers.get(key);
    if (existing !== undefined) {
      existing.abort();
    }
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.logger.debug(`register: stream run registered key=${key}`);
    return controller;
  }

  cancel(key: string): boolean {
    const controller = this.controllers.get(key);
    if (controller === undefined) {
      this.logger.debug(`cancel: no active stream run for key=${key}`);
      return false;
    }
    controller.abort();
    this.controllers.delete(key);
    this.logger.log(`cancel: aborted stream run key=${key}`);
    return true;
  }

  release(key: string): void {
    if (this.controllers.delete(key)) {
      this.logger.debug(`release: stream run released key=${key}`);
    }
  }

  isActive(key: string): boolean {
    return this.controllers.has(key);
  }
}
