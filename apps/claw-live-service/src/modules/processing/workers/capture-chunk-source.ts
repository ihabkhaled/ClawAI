import type Redis from 'ioredis';

import { LIVE_CAPTURE_POLL_BATCH } from '../constants/processing.constants';
import type { AudioChunk, ChunkPoll, RunChunkSource } from '../types/processing.types';
import { captureQueueKey, decodeCaptureChunk } from '../utilities/capture-chunk.utility';

/**
 * BROWSER_CAPTURE runs: pops the viewer's tab-audio chunks (already 16 kHz mono PCM16
 * WAV, stamped with media time by the audio route) from `live:capture:<runId>`. It never
 * fetches the source and never spawns ffmpeg. The stream "ends" only when the viewer
 * stops: the run goes DELAYED without chunks and STOPPING when the session detaches.
 */
export class CaptureChunkSource implements RunChunkSource {
  constructor(
    private readonly redis: Redis,
    private readonly runId: string,
  ) {}

  async poll(): Promise<ChunkPoll> {
    const entries = await this.redis.lpopBuffer(
      captureQueueKey(this.runId),
      LIVE_CAPTURE_POLL_BATCH,
    );
    const chunks = (entries ?? [])
      .map((entry) => decodeCaptureChunk(entry))
      .filter((chunk): chunk is AudioChunk => chunk !== null)
      .sort((a, b) => a.startAt - b.startAt);
    return { chunks, ended: false, latestSegmentFile: null };
  }

  /** Nothing local to clean; an undrained queue expires on its own TTL. */
  async dispose(): Promise<void> {
    await Promise.resolve();
  }
}
