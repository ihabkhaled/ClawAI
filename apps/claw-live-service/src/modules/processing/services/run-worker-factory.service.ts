import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Injectable } from '@nestjs/common';

import { LiveSourceKind } from '../../../generated/prisma';
import { FixtureBroadcasterService } from '../../sources/services/fixture-broadcaster.service';
import { HlsFetcherService } from '../../sources/services/hls-fetcher.service';
import { WORKER_TEMP_PREFIX } from '../constants/processing.constants';
import { RunLifecycleManager } from '../managers/run-lifecycle.manager';
import { SummaryManager } from '../managers/summary.manager';
import { TranscriptManager } from '../managers/transcript.manager';
import { TranslationManager } from '../managers/translation.manager';
import { VisionManager } from '../managers/vision.manager';
import { ProcessingRunRepository } from '../repositories/processing-run.repository';
import type { ClaimedRunRow } from '../types/processing.types';
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
  ) {}

  /** Null when the run vanished or its source can never be processed (YOUTUBE). */
  async create(claim: ClaimedRunRow): Promise<RunWorker | null> {
    const run = await this.runs.findRunWithStream(claim.id);
    if (!run || run.stream.sourceKind === LiveSourceKind.YOUTUBE) return null;
    const context = {
      lease: { runId: run.id, generation: claim.generation },
      streamId: run.streamId,
      mode: run.mode,
      sourceKind: run.stream.sourceKind,
      sourceUrl: run.stream.sourceUrl,
      declaredHost: run.stream.declaredHost,
      startedAt: run.startedAt,
    };
    const directory = await mkdtemp(join(tmpdir(), WORKER_TEMP_PREFIX));
    const source = new HlsChunkSource(context, this.fetcher, this.fixtures, directory);
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
}
