import { NotFoundException } from '@nestjs/common';
import type { ThreadGenerationProgress } from '@claw/shared-types';

import {
  PROGRESS_STREAM_ERROR_BACKOFF_MAX_MS,
  PROGRESS_STREAM_ERROR_BACKOFF_MS,
  PROGRESS_STREAM_IDLE_AFTER_MS,
  PROGRESS_STREAM_MAX_UPSTREAM_FAILURES,
  PROGRESS_STREAM_POLL_FAST_MS,
  PROGRESS_STREAM_POLL_IDLE_MS,
} from '../constants/generation-progress-stream.constants';
import type {
  GenerationProgressSnapshot,
  GenerationProgressWatcherEvent,
} from '../types/generation-progress-stream.types';
import {
  isTerminalProgress,
  toProgressSnapshot,
} from '../utilities/generation-progress-snapshot.utility';

type Listener = (event: GenerationProgressWatcherEvent) => void;

/**
 * One upstream reader per watched job per replica. Any number of open tabs share it, so the load
 * on the generation service is bounded by the number of running jobs, never by open tabs. It only
 * emits when the snapshot changed, never overlaps two reads, and stops itself when the last
 * listener leaves, the job is terminal or the upstream keeps failing.
 */
export class GenerationProgressWatcher {
  private readonly listeners = new Set<Listener>();
  private latest: GenerationProgressSnapshot;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private failures = 0;
  private lastChangeAt = Date.now();

  constructor(
    private readonly read: () => Promise<ThreadGenerationProgress>,
    private readonly onStop: () => void,
    first: ThreadGenerationProgress,
  ) {
    this.latest = toProgressSnapshot(first);
    if (isTerminalProgress(first)) {
      this.stopped = true;
    } else {
      this.schedule(PROGRESS_STREAM_POLL_FAST_MS);
    }
  }

  get current(): GenerationProgressSnapshot {
    return this.latest;
  }

  get isStopped(): boolean {
    return this.stopped;
  }

  get size(): number {
    return this.listeners.size;
  }

  /** Returns the way to unsubscribe. The caller reads `current` for the opening snapshot. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.stop();
      }
    };
  }

  stop(): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    const wasStopped = this.stopped;
    this.stopped = true;
    if (!wasStopped) {
      this.onStop();
    }
  }

  private schedule(delayMs: number): void {
    this.timer = setTimeout(() => void this.tick(), delayMs);
    // A watcher must never keep the process alive on its own.
    this.timer.unref();
  }

  private async tick(): Promise<void> {
    this.timer = undefined;
    if (this.stopped) {
      return;
    }
    let next: ThreadGenerationProgress;
    try {
      next = await this.read();
    } catch (error: unknown) {
      this.onReadFailure(error);
      return;
    }
    if (this.stopped) {
      return;
    }
    this.failures = 0;
    const snapshot = toProgressSnapshot(next);
    const terminal = isTerminalProgress(next);
    if (snapshot.id !== this.latest.id) {
      this.latest = snapshot;
      this.lastChangeAt = Date.now();
      this.emit({ kind: 'snapshot', snapshot, terminal });
    }
    if (terminal) {
      this.stop();
      return;
    }
    const idle = Date.now() - this.lastChangeAt >= PROGRESS_STREAM_IDLE_AFTER_MS;
    this.schedule(idle ? PROGRESS_STREAM_POLL_IDLE_MS : PROGRESS_STREAM_POLL_FAST_MS);
  }

  private onReadFailure(error: unknown): void {
    if (this.stopped) {
      return;
    }
    if (error instanceof NotFoundException) {
      this.finish({ kind: 'gone' });
      return;
    }
    this.failures += 1;
    if (this.failures >= PROGRESS_STREAM_MAX_UPSTREAM_FAILURES) {
      this.finish({ kind: 'error' });
      return;
    }
    this.schedule(
      Math.min(
        PROGRESS_STREAM_ERROR_BACKOFF_MS * 2 ** (this.failures - 1),
        PROGRESS_STREAM_ERROR_BACKOFF_MAX_MS,
      ),
    );
  }

  private finish(event: GenerationProgressWatcherEvent): void {
    this.emit(event);
    this.stop();
  }

  private emit(event: GenerationProgressWatcherEvent): void {
    for (const listener of [...this.listeners]) {
      listener(event);
    }
  }
}
