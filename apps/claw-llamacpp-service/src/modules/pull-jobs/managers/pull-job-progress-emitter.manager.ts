import { Injectable, Logger } from '@nestjs/common';
import { type Subject } from 'rxjs';
import { SseChannel } from '../../../common/utilities';
import { type SseEvent } from '../../../common/types';
import { type PullJobProgressEvent } from '../types/pull-job.types';

@Injectable()
export class PullJobProgressEmitterManager {
  private readonly logger = new Logger(PullJobProgressEmitterManager.name);
  private readonly channels = new Map<string, SseChannel<PullJobProgressEvent>>();

  emit(event: PullJobProgressEvent): void {
    const channel = this.getOrCreateChannel(event.jobId);
    channel.publish({ event: 'pull-progress', data: event });
    if (this.isTerminal(event)) {
      this.logger.log(`emit: ${event.jobId} terminal=${event.status}; closing channel`);
      channel.close();
    }
  }

  subscribe(jobId: string): Subject<SseEvent<PullJobProgressEvent>> {
    const channel = this.getOrCreateChannel(jobId);
    return channel.asObservable();
  }

  getLast(jobId: string): SseEvent<PullJobProgressEvent> | null {
    const channel = this.channels.get(jobId);
    return channel ? channel.getLast() : null;
  }

  closeChannel(jobId: string): void {
    const channel = this.channels.get(jobId);
    if (channel) {
      channel.close();
      this.channels.delete(jobId);
    }
  }

  private getOrCreateChannel(jobId: string): SseChannel<PullJobProgressEvent> {
    let channel = this.channels.get(jobId);
    if (!channel || channel.isClosed()) {
      channel = new SseChannel<PullJobProgressEvent>();
      this.channels.set(jobId, channel);
    }
    return channel;
  }

  private isTerminal(event: PullJobProgressEvent): boolean {
    return event.status === 'COMPLETED' || event.status === 'FAILED' || event.status === 'CANCELLED';
  }
}
