import {
  HttpException,
  HttpStatus,
  Injectable,
  type MessageEvent,
  NotFoundException,
} from '@nestjs/common';
import type { ThreadGenerationProgress } from '@claw/shared-types';
import { Observable, type Subscriber } from 'rxjs';

import {
  PROGRESS_STREAM_BACKPRESSURE_RETRY_MS,
  PROGRESS_STREAM_HEARTBEAT_MS,
  PROGRESS_STREAM_MAX_LIFETIME_MS,
  PROGRESS_STREAM_MAX_PER_PUBLICATION,
  PROGRESS_STREAM_MAX_PER_USER,
  PROGRESS_STREAM_TOO_MANY_MESSAGE,
} from '../constants/generation-progress-stream.constants';
import { PUBLICATION_NOT_FOUND_MESSAGE } from '../constants/publication-generation-owner.constants';
import type {
  GenerationProgressSnapshot,
  GenerationProgressStreamContext,
  GenerationProgressStreamPayload,
  GenerationProgressWatcherEvent,
} from '../types/generation-progress-stream.types';
import { isTerminalProgress } from '../utilities/generation-progress-snapshot.utility';
import { GenerationProgressWatcher } from './generation-progress-watcher';
import { PublicationGenerationOwnerService } from './publication-generation-owner.service';
import { ThreadsGenerationClient } from './threads-generation.client';

/**
 * Owner-only push channel for one publication's generation progress (ADR-201).
 *
 * Ownership is resolved before anything is sent (a stranger and an unknown id both get the same
 * 404). Open streams share one upstream watcher per job, so the generation service sees one
 * reader per running job, not one per tab. Caps, the heartbeat, the lifetime and the clean-up
 * on disconnect are all local to this replica; another replica holds its own, equal, caps.
 */
@Injectable()
export class GenerationProgressStreamService {
  private readonly watchers = new Map<string, GenerationProgressWatcher>();
  private readonly perUser = new Map<string, number>();
  private readonly perPublication = new Map<string, number>();

  constructor(
    private readonly owner: PublicationGenerationOwnerService,
    private readonly generation: ThreadsGenerationClient,
  ) {}

  /** Number of live upstream watchers; exposed for tests and diagnostics. */
  get watcherCount(): number {
    return this.watchers.size;
  }

  async open(
    publicationId: string,
    ownerId: string,
    lastEventId: string | undefined,
    isBackedUp: () => boolean = () => false,
  ): Promise<Observable<MessageEvent>> {
    const jobId = await this.owner.getOwnedJobId(publicationId, ownerId);
    this.assertRoom(publicationId, ownerId);
    const watcher = await this.watcherFor(publicationId, ownerId, jobId);
    return new Observable<MessageEvent>((subscriber) =>
      this.serve(subscriber, watcher, { publicationId, ownerId, lastEventId, isBackedUp }),
    );
  }

  private hasRoom(publicationId: string, ownerId: string): boolean {
    return (
      (this.perUser.get(ownerId) ?? 0) < PROGRESS_STREAM_MAX_PER_USER &&
      (this.perPublication.get(publicationId) ?? 0) < PROGRESS_STREAM_MAX_PER_PUBLICATION
    );
  }

  private assertRoom(publicationId: string, ownerId: string): void {
    if (!this.hasRoom(publicationId, ownerId)) {
      throw new HttpException(PROGRESS_STREAM_TOO_MANY_MESSAGE, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  private async watcherFor(
    publicationId: string,
    ownerId: string,
    jobId: string,
  ): Promise<GenerationProgressWatcher> {
    const key = `${ownerId}:${publicationId}:${jobId}`;
    const existing = this.watchers.get(key);
    if (existing && !existing.isStopped) {
      return existing;
    }
    const read = (): Promise<ThreadGenerationProgress> =>
      this.readProgress(publicationId, jobId, ownerId);
    const first = await read();
    const raced = this.watchers.get(key);
    if (raced && !raced.isStopped) {
      return raced;
    }
    const created = new GenerationProgressWatcher(
      read,
      () => {
        if (this.watchers.get(key) === created) {
          this.watchers.delete(key);
        }
      },
      first,
    );
    if (!created.isStopped) {
      this.watchers.set(key, created);
    }
    return created;
  }

  private async readProgress(
    publicationId: string,
    jobId: string,
    ownerId: string,
  ): Promise<ThreadGenerationProgress> {
    try {
      return { publicationId, ...(await this.generation.getProgress(jobId, ownerId)) };
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(PUBLICATION_NOT_FOUND_MESSAGE);
      }
      throw error;
    }
  }

  private serve(
    subscriber: Subscriber<MessageEvent>,
    watcher: GenerationProgressWatcher,
    context: GenerationProgressStreamContext,
  ): () => void {
    const { publicationId, ownerId } = context;
    if (!this.hasRoom(publicationId, ownerId)) {
      this.sendPayload(subscriber, { type: 'error', code: 'TOO_MANY_STREAMS' });
      subscriber.complete();
      return () => {};
    }
    this.bump(this.perUser, ownerId, 1);
    this.bump(this.perPublication, publicationId, 1);

    const connection = this.createConnection(subscriber, context);
    const unsubscribe = this.attachWatcher(watcher, context.lastEventId, connection);
    const stopTimers = this.startTimers(connection);

    return () => {
      stopTimers();
      connection.clearFlush();
      unsubscribe?.();
      this.bump(this.perUser, ownerId, -1);
      this.bump(this.perPublication, publicationId, -1);
    };
  }

  private createConnection(
    subscriber: Subscriber<MessageEvent>,
    context: GenerationProgressStreamContext,
  ): GenerationProgressConnection {
    return new GenerationProgressConnection(
      (payload, id) => this.sendPayload(subscriber, payload, id),
      subscriber,
      context,
    );
  }

  /** Sends the current snapshot (unless the client already holds it) and subscribes to further events. */
  private attachWatcher(
    watcher: GenerationProgressWatcher,
    lastEventId: string | undefined,
    connection: GenerationProgressConnection,
  ): (() => void) | undefined {
    const current = watcher.current;
    // Last-Event-ID names the snapshot the client already holds: a resume sends nothing twice.
    if (current.id !== lastEventId) {
      connection.sendSnapshot(current);
    }
    if (isTerminalProgress(current.progress)) {
      connection.finish({ type: 'terminal' });
      return undefined;
    }
    if (watcher.isStopped) {
      connection.finish({ type: 'reconnect' });
      return undefined;
    }
    return watcher.subscribe((event) => this.handleEvent(event, connection));
  }

  private handleEvent(
    event: GenerationProgressWatcherEvent,
    connection: GenerationProgressConnection,
  ): void {
    if (event.kind === 'snapshot') {
      connection.sendSnapshot(event.snapshot);
      if (event.terminal) {
        connection.sendTerminalSnapshot(event.snapshot);
        connection.finish({ type: 'terminal' });
      }
    } else if (event.kind === 'gone') {
      connection.finish({ type: 'gone' });
    } else {
      connection.finish({ type: 'error', code: 'UPSTREAM_UNAVAILABLE' });
    }
  }

  /** Heartbeat and maximum lifetime; returns the function that stops both. */
  private startTimers(connection: GenerationProgressConnection): () => void {
    const heartbeat = setInterval(() => connection.heartbeat(), PROGRESS_STREAM_HEARTBEAT_MS);
    const lifetime = setTimeout(
      () => connection.finish({ type: 'reconnect' }),
      PROGRESS_STREAM_MAX_LIFETIME_MS,
    );
    heartbeat.unref();
    lifetime.unref();
    return () => {
      clearInterval(heartbeat);
      clearTimeout(lifetime);
    };
  }

  private sendPayload(
    subscriber: Subscriber<MessageEvent>,
    payload: GenerationProgressStreamPayload,
    id?: string,
  ): void {
    if (subscriber.closed) {
      return;
    }
    subscriber.next({ data: JSON.stringify(payload), ...(id === undefined ? {} : { id }) });
  }

  private bump(counts: Map<string, number>, key: string, delta: number): void {
    const next = (counts.get(key) ?? 0) + delta;
    if (next <= 0) {
      counts.delete(key);
    } else {
      counts.set(key, next);
    }
  }
}

/**
 * Per-connection send state: the newest snapshot id, a held snapshot for a backed-up reader and
 * its retry timer. Every frame carries the newest snapshot id, so the client's Last-Event-ID is
 * never a bare counter.
 */
class GenerationProgressConnection {
  private pending: GenerationProgressSnapshot | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private lastId: string | undefined;

  constructor(
    private readonly send: (payload: GenerationProgressStreamPayload, id?: string) => void,
    private readonly subscriber: Subscriber<MessageEvent>,
    private readonly context: GenerationProgressStreamContext,
  ) {
    this.lastId = context.lastEventId;
  }

  sendSnapshot(snapshot: GenerationProgressSnapshot): void {
    if (this.context.isBackedUp()) {
      // A slow reader gets only the newest full snapshot, later: every snapshot is complete.
      this.pending = snapshot;
      this.flushTimer ??= setTimeout(() => this.flush(), PROGRESS_STREAM_BACKPRESSURE_RETRY_MS);
      return;
    }
    this.sendNow(snapshot);
  }

  /** The newest snapshot is sent even to a backed-up reader before the stream ends. */
  sendTerminalSnapshot(snapshot: GenerationProgressSnapshot): void {
    if (this.pending !== undefined) {
      this.sendNow(snapshot);
    }
  }

  finish(payload: GenerationProgressStreamPayload): void {
    this.send(payload, this.lastId);
    this.subscriber.complete();
  }

  heartbeat(): void {
    this.send({ type: 'heartbeat' }, this.lastId);
  }

  clearFlush(): void {
    if (this.flushTimer !== undefined) {
      clearTimeout(this.flushTimer);
    }
  }

  private sendNow(snapshot: GenerationProgressSnapshot): void {
    this.pending = undefined;
    this.lastId = snapshot.id;
    this.send({ type: 'progress', progress: snapshot.progress }, snapshot.id);
  }

  private flush(): void {
    this.flushTimer = undefined;
    if (this.pending !== undefined) {
      this.sendSnapshot(this.pending);
    }
  }
}
