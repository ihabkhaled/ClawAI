import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';

import { LiveCapability, type LivePlatform } from '../../../generated/prisma';
import { LIVE_REDIS_CLIENT } from '../../../infrastructure/redis/constants/redis.constants';
import { FixtureBroadcasterService } from '../../sources/services/fixture-broadcaster.service';
import { HlsFetcherService } from '../../sources/services/hls-fetcher.service';
import { ServerPullResolverService } from '../../sources/services/server-pull-resolver.service';
import { resolvePlatformUrl } from '../../sources/utilities/platform-registry.utility';
import { NO_RUN_CAPABILITIES, WORKER_TEMP_PREFIX } from '../constants/processing.constants';
import { RunLifecycleManager } from '../managers/run-lifecycle.manager';
import { SummaryManager } from '../managers/summary.manager';
import { TranscriptManager } from '../managers/transcript.manager';
import { TranslationManager } from '../managers/translation.manager';
import { VisionManager } from '../managers/vision.manager';
import { ProcessingRunRepository } from '../repositories/processing-run.repository';
import type {
  ClaimedRunRow,
  RunChunkSource,
  ServerPullSource,
  WorkerContext,
} from '../types/processing.types';
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
    private readonly serverPull: ServerPullResolverService,
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
    const source = await this.source(context, run.stream.capability, run.stream.platform);
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

  /**
   * BROWSER_CAPTURE reads the viewer's tab-audio queue; SERVER_PULL pulls the platform's public
   * playlist (resolved by the worker, token refreshed on failure); everything else pulls HLS.
   */
  private async source(
    context: WorkerContext,
    capability: LiveCapability,
    platform: LivePlatform | null,
  ): Promise<RunChunkSource> {
    if (capability === LiveCapability.BROWSER_CAPTURE) {
      return new CaptureChunkSource(this.redis, context.lease.runId);
    }
    const pull =
      capability === LiveCapability.SERVER_PULL ? this.serverPullSource(context, platform) : null;
    const directory = await mkdtemp(join(tmpdir(), WORKER_TEMP_PREFIX));
    return new HlsChunkSource(context, this.fetcher, this.fixtures, directory, pull);
  }

  /** The stream's watch URL re-parsed into its platform match (id and canonical watch URL). */
  private serverPullSource(
    context: WorkerContext,
    platform: LivePlatform | null,
  ): ServerPullSource {
    const match = resolvePlatformUrl(new URL(context.sourceUrl))?.match ?? null;
    if (match === null || !this.serverPull.supports(platform)) {
      throw new Error('LIVE_SERVER_PULL_UNSUPPORTED');
    }
    return { resolve: (fresh) => this.serverPull.resolve(platform, match, fresh) };
  }
}
