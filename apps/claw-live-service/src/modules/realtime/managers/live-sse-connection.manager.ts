import type { Logger } from '@nestjs/common';
import type { Response } from 'express';

import { LiveSessionState } from '../../../generated/prisma';
import {
  LIVE_SSE_HEADERS,
  LIVE_SSE_HEARTBEAT_MS,
  LIVE_SSE_SESSION_REFRESH_MS,
} from '../constants/live-sse.constants';
import type { LiveSseSessionRepository } from '../repositories/live-sse-session.repository';
import type { RedisLiveEventBus } from '../services/redis-live-event-bus.service';
import type {
  LiveEventEnvelope,
  LiveEventUnsubscribe,
  ParsedLastEventId,
} from '../types/live-event-bus.types';
import type { LiveSseSessionView } from '../types/live-sse.types';
import { describeError } from '../utilities/live-error.utility';
import {
  eventSessionId,
  eventSessionState,
  formatSseFrame,
  shouldDeliver,
} from '../utilities/live-event-filter.utility';

/**
 * One open SSE stream for one viewer session. Not injectable: built per
 * connection by LiveSseManager.
 *
 * Order on attach: subscribe first and buffer, then replay from the list, then
 * flush the buffer skipping anything the replay already sent, so a frame
 * published between the two steps is neither lost nor sent twice.
 */
export class LiveSseConnection {
  private unsubscribe: LiveEventUnsubscribe | undefined;
  private heartbeatTimer: NodeJS.Timeout | undefined;
  private refreshTimer: NodeJS.Timeout | undefined;
  private closed = false;
  private replaying = false;
  private buffered: LiveEventEnvelope[] = [];
  private lastSeq = 0;

  constructor(
    private readonly bus: RedisLiveEventBus,
    private readonly sessions: LiveSseSessionRepository,
    private readonly response: Response,
    private view: LiveSseSessionView,
    private readonly logger: Logger,
  ) {}

  get isClosed(): boolean {
    return this.closed;
  }

  async start(lastEventId: ParsedLastEventId | null): Promise<void> {
    this.response.writeHead(200, LIVE_SSE_HEADERS);
    this.response.write(': connected\n\n');
    if (this.view.state === LiveSessionState.DETACHED) {
      this.close();
      return;
    }
    await this.attach(lastEventId);
    this.heartbeatTimer = setInterval(() => {
      this.write(': heartbeat\n\n');
    }, LIVE_SSE_HEARTBEAT_MS);
    this.heartbeatTimer.unref();
    this.refreshTimer = setInterval(() => {
      void this.refresh();
    }, LIVE_SSE_SESSION_REFRESH_MS);
    this.refreshTimer.unref();
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.heartbeatTimer);
    clearInterval(this.refreshTimer);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.response.end();
  }

  /** Re-reads the session: state, language and run can change while the stream is open. */
  async refresh(): Promise<void> {
    if (this.closed) return;
    let next: LiveSseSessionView | null;
    try {
      next = await this.sessions.findOwned(this.view.sessionId, this.view.userId);
    } catch (error: unknown) {
      this.logger.warn(
        `sse refresh failed sessionId=${this.view.sessionId} error=${describeError(error)}`,
      );
      return;
    }
    if (!next || next.state === LiveSessionState.DETACHED) {
      this.close();
      return;
    }
    const runChanged = next.runId !== this.view.runId;
    this.view = next;
    if (runChanged) {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      this.lastSeq = 0;
      await this.attach(null);
    }
  }

  private async attach(lastEventId: ParsedLastEventId | null): Promise<void> {
    const runId = this.view.runId;
    if (runId === null) return;
    this.replaying = true;
    this.buffered = [];
    this.unsubscribe = await this.bus.subscribe(runId, (event) => {
      this.onLive(event);
    });
    const afterSeq = lastEventId?.runId === runId ? lastEventId.seq : 0;
    this.lastSeq = afterSeq;
    const frames = await this.bus.replay(runId, afterSeq);
    for (const frame of frames) this.deliver(frame);
    this.replaying = false;
    const pending = this.buffered;
    this.buffered = [];
    for (const frame of pending) this.onLive(frame);
  }

  private onLive(event: LiveEventEnvelope): void {
    if (this.replaying) {
      this.buffered.push(event);
      return;
    }
    // Live session-scoped status frames update the gate immediately; the
    // periodic refresh is the backstop. Replayed ones never do (they are old).
    if (eventSessionId(event) === this.view.sessionId) {
      const state = eventSessionState(event);
      if (state !== null && Object.values<string>(LiveSessionState).includes(state)) {
        this.view = { ...this.view, state: state as LiveSessionState };
      }
    }
    this.deliver(event);
    if (this.view.state === LiveSessionState.DETACHED) this.close();
  }

  private deliver(event: LiveEventEnvelope): void {
    if (this.closed || event.runId !== this.view.runId || event.seq <= this.lastSeq) return;
    this.lastSeq = event.seq;
    if (shouldDeliver(event, this.view)) this.write(formatSseFrame(event));
  }

  private write(chunk: string): void {
    if (this.closed) return;
    this.response.write(chunk);
  }
}
