import { Logger } from '@nestjs/common';

import { LiveChunkOutcome } from '../../../common/enums/live-chunk-outcome.enum';
import { LiveRunEndReason } from '../../../common/enums/live-run-end-reason.enum';
import { LiveStatusCode } from '../../../common/enums/live-status-code.enum';
import { LiveRunStatus } from '../../../generated/prisma';
import {
  WORKER_DELAYED_AFTER_MS,
  WORKER_MAX_POLL_FAILURES,
  WORKER_POLL_MS,
} from '../constants/processing.constants';
import { LeaseLostError } from '../errors/processing.errors';
import type { RunWorkerDeps } from '../types/run-worker.types';
import type {
  AudioChunk,
  ChunkPoll,
  RunChunkSource,
  RunMemory,
  WorkerContext,
} from '../types/processing.types';
import { createRunMemory } from '../utilities/run-memory.utility';

/**
 * One claimed run's loop (section 4): renew the lease (fenced) → poll the source →
 * transcribe each chunk → DELAYED/ACTIVE → background summary, translation, vision and
 * snapshot (single-flight) → repeat. STOPPING → STOPPED; source end → FINAL card +
 * ENDED. A LeaseLostError at any point means another worker owns the run: exit silently.
 * A restarted worker starts at the Live Edge with fresh memory; nothing is back-filled.
 * The source is either the HLS/fixture puller or, for BROWSER_CAPTURE runs, the queue of
 * the viewer's tab-audio chunks (no fetch, no ffmpeg input); everything after is the same.
 */
export class RunWorker {
  private readonly logger = new Logger(RunWorker.name);
  private readonly memory: RunMemory = createRunMemory(Date.now());
  private stopped = false;
  private status: LiveRunStatus = LiveRunStatus.PENDING;
  private lastProgressWallAt = Date.now();
  private pollFailures = 0;
  private background: Promise<void> | null = null;

  constructor(
    private readonly deps: RunWorkerDeps,
    private readonly context: WorkerContext,
    private readonly source: RunChunkSource,
  ) {}

  get runId(): string {
    return this.context.lease.runId;
  }

  /** Asks the loop to exit at its next boundary (shutdown). */
  stop(): void {
    this.stopped = true;
  }

  async run(): Promise<void> {
    try {
      await this.deps.lifecycle.activate(this.context);
      while (!this.stopped) {
        if (await this.iterate()) return;
        await new Promise((done) => setTimeout(done, WORKER_POLL_MS));
      }
    } catch (error: unknown) {
      await this.onError(error);
    } finally {
      await this.background?.catch(() => {});
      this.deps.translations.dropRun(this.runId);
      await this.source.dispose();
    }
  }

  /** One loop pass; true when the run is over. */
  async iterate(): Promise<boolean> {
    this.status = await this.deps.writer.renew(this.context.lease);
    if (this.status === LiveRunStatus.STOPPING) {
      await this.finish(LiveRunStatus.STOPPED, LiveRunEndReason.NO_VIEWERS);
      return true;
    }
    const poll = await this.pollSource();
    for (const chunk of poll.chunks) await this.processChunk(chunk);
    if (poll.mediaSeconds !== undefined && poll.chunks.length > 0) {
      await this.deps.writer.recordMediaProgress(this.context.lease, poll.mediaSeconds);
    }
    await this.updateDelay();
    if (poll.ended) {
      await this.background?.catch(() => {});
      await this.deps.translations.flushCaptions(this.context, true);
      await this.summarizeTheRest(poll.latestSegmentFile);
      await this.deps.summaries.summarizeFinal(this.context, this.memory);
      await this.writeReport();
      await this.finish(LiveRunStatus.ENDED, LiveRunEndReason.SOURCE_ENDED);
      return true;
    }
    this.kickBackground(poll.latestSegmentFile);
    return false;
  }

  private async pollSource(): Promise<ChunkPoll> {
    try {
      const poll = await this.source.poll();
      this.pollFailures = 0;
      return poll;
    } catch (error: unknown) {
      if (error instanceof LeaseLostError) throw error;
      this.pollFailures += 1;
      // The reason only (a fetcher message names the host, never a signed query string).
      const reason = error instanceof Error ? error.message.slice(0, 160) : 'unknown';
      this.logger.warn(`run ${this.runId} poll failed (${String(this.pollFailures)}): ${reason}`);
      if (this.pollFailures >= WORKER_MAX_POLL_FAILURES) throw new Error('LIVE_SOURCE_UNREACHABLE');
      return { chunks: [], ended: false, latestSegmentFile: null };
    }
  }

  private async processChunk(chunk: AudioChunk): Promise<void> {
    const result = await this.deps.transcripts.handleChunk(this.context, this.memory, chunk);
    if (result.outcome !== LiveChunkOutcome.GAP) this.lastProgressWallAt = Date.now();
    if (result.line) this.deps.translations.enqueueCaption(this.runId, result.line);
  }

  private async updateDelay(): Promise<void> {
    const stale = Date.now() - this.lastProgressWallAt > WORKER_DELAYED_AFTER_MS;
    if (stale && this.status === LiveRunStatus.ACTIVE) {
      await this.deps.lifecycle.setStatus(
        this.context,
        LiveRunStatus.DELAYED,
        LiveStatusCode.DELAYED,
      );
      this.status = LiveRunStatus.DELAYED;
    } else if (!stale && this.status === LiveRunStatus.DELAYED) {
      await this.deps.lifecycle.setStatus(
        this.context,
        LiveRunStatus.ACTIVE,
        LiveStatusCode.ANALYZING,
      );
      this.status = LiveRunStatus.ACTIVE;
    }
  }

  private kickBackground(segmentFile: string | null): void {
    if (this.background) return;
    this.background = this.runBackground(segmentFile)
      .catch((error: unknown) => {
        if (error instanceof LeaseLostError) this.stopped = true;
        else this.logger.warn(`run ${this.runId}: background step failed`);
      })
      .finally(() => {
        this.background = null;
      });
  }

  private async runBackground(segmentFile: string | null): Promise<void> {
    await this.deps.translations.flushCaptions(this.context);
    // summarize translates each changed card before publishing it.
    if (this.deps.summaries.shouldSummarize(this.memory))
      await this.deps.summaries.summarize(this.context, this.memory);
    await this.deps.vision.maybeSample(this.context, this.memory, segmentFile);
    await this.deps.summaries.maybeSnapshot(this.context, this.memory);
  }

  /**
   * At the end, what was never summarized gets its summary card (and the last frame its visual
   * note) before the final summary, which is built from those cards. A short video (one 30 s
   * summary piece, a 20 s reel) used to end with no card and so no report at all (2026-11-25).
   */
  private async summarizeTheRest(segmentFile: string | null): Promise<void> {
    if (this.memory.pendingFirst !== null) {
      await this.deps.summaries.summarize(this.context, this.memory);
    }
    await this.deps.vision.maybeSample(this.context, this.memory, segmentFile);
  }

  /** The detailed video report (summary runs only); a failure never keeps the run from ending. */
  private async writeReport(): Promise<void> {
    try {
      await this.deps.reports.writeReport(this.context, this.memory);
    } catch (error: unknown) {
      if (error instanceof LeaseLostError) throw error;
      this.logger.warn(`run ${this.runId}: video report failed`);
    }
  }

  private async finish(status: LiveRunStatus, reason: LiveRunEndReason): Promise<void> {
    await this.deps.lifecycle.finish(this.context, status, reason, this.memory.processedMs);
  }

  private async onError(error: unknown): Promise<void> {
    if (error instanceof LeaseLostError) {
      this.logger.log(`run ${this.runId}: lease lost, worker exits`);
      return;
    }
    const code = error instanceof Error ? error.message.slice(0, 60) : 'UNKNOWN';
    this.logger.warn(`run ${this.runId}: worker failed (${code})`);
    await this.finish(LiveRunStatus.FAILED, LiveRunEndReason.FAILED).catch(() => {});
  }
}
