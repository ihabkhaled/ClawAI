import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { LiveCapability } from '../../../generated/prisma';
import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import { FixtureBroadcasterService } from '../../sources/services/fixture-broadcaster.service';
import { HlsFetcherService } from '../../sources/services/hls-fetcher.service';
import { NO_RUN_CAPABILITIES, WORKER_TEMP_PREFIX } from '../constants/processing.constants';
import { RunLifecycleManager } from '../managers/run-lifecycle.manager';
import { SummaryManager } from '../managers/summary.manager';
import { TranscriptManager } from '../managers/transcript.manager';
import { TranslationManager } from '../managers/translation.manager';
import { VisionManager } from '../managers/vision.manager';
import { ProcessingRunRepository } from '../repositories/processing-run.repository';
import type { ClaimedRunRow, RunChunkSource, WorkerContext } from '../types/processing.types';
import { CaptureChunkSource } from '../workers/capture-chunk-source';
import { HlsChunkSource } from '../workers/hls-chunk-source';
import { RunWorker } from '../workers/run-worker';
import { FencedRunWriter } from './fenced-run-writer.service';

/** Builds a RunWorker for a freshly claimed run (lease = id + bumped generation). */
@Injectable()
export class RunWorkerFactory {
  constructor(
    private readonly runs: ProcessingRunRepository,
    private readonly writer: FencedRunWriter,
    private readonly lifecycle: RunLifecycleManager,
    private readonly transcripts: TranscriptManager,
    private readonly summaries: SummaryManager,
    private readonly translations: TranslationManager,
    private readonly vision: VisionManager,
    private readonly fetcher: HlsFetcherService,
    private readonly fixtures: FixtureBroadcasterService,
    @Inject(LIVE_REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  /** Null when the run vanished or its source can never be processed (PLAYER_ONLY, LINK_ONLY). */
  async create(claim: ClaimedRunRow): Promise<RunWorker | null> {
    const run = await this.runs.findRunWithStream(claim.id);
    if (!run || NO_RUN_CAPABILITIES.includes(run.stream.capability)) return null;
    const context: WorkerContext = {
      lease: { runId: run.id, generation: claim.generation },
      streamId: run.streamId,
      mode: run.mode,
      sourceKind: run.stream.sourceKind,
      sourceUrl: run.stream.sourceUrl,
      declaredHost: run.stream.declaredHost,
      startedAt: run.startedAt,
    };
    const source = await this.source(context, run.stream.capability);
    return new RunWorker(
      {
        writer: this.writer,
        lifecycle: this.lifecycle,
        transcripts: this.transcripts,
        summaries: this.summaries,
        translations: this.translations,
        vision: this.vision,
      },
      context,
      source,
    );
  }

  /** BROWSER_CAPTURE reads the viewer's tab-audio queue; everything else pulls HLS. */
  private async source(
    context: WorkerContext,
    capability: LiveCapability,
  ): Promise<RunChunkSource> {
    if (capability === LiveCapability.BROWSER_CAPTURE) {
      return new CaptureChunkSource(this.redis, context.lease.runId);
    }
    const directory = await mkdtemp(join(tmpdir(), WORKER_TEMP_PREFIX));
    return new HlsChunkSource(context, this.fetcher, this.fixtures, directory);
  }
}
