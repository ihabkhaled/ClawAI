import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { buildInterServiceAuthHeader, httpRequest } from '../../../common/utilities';
import {
  VIDEO_FRAMES_FETCH_TIMEOUT_MS,
  VIDEO_FRAMES_PATH,
} from '../constants/video-delivery.constants';
import type { VideoFrameImage, VideoFramesFetchResult } from '../types/video-delivery.types';
import { toVideoFrames } from '../utilities/video-frames-wire.utility';

/**
 * file-service's `POST /internal/files/:id/video-frames` (multimodal batch 7),
 * read by chat-service in batch 8. Service token; the owner is named in the
 * body and checked by file-service (404 for anyone else).
 *
 * Never throws into the turn: a timeout, a non-2xx answer or a malformed body
 * comes back as `{ ok: false, reason }`, and the lane goes on with the
 * transcript only and an honest note. The reason is a short, content-free
 * string for the log — never a frame, never the transcript.
 */
@Injectable()
export class VideoFramesClient {
  private readonly logger = new Logger(VideoFramesClient.name);

  async fetchFrames(
    fileId: string,
    userId: string,
    timestampsMs: readonly number[],
  ): Promise<VideoFramesFetchResult> {
    const started = Date.now();
    try {
      const response = await httpRequest<unknown>({
        url: `${AppConfig.get().FILE_SERVICE_URL}${VIDEO_FRAMES_PATH.replace('{FILE_ID}', encodeURIComponent(fileId))}`,
        method: 'POST',
        headers: { Authorization: buildInterServiceAuthHeader() },
        body: { userId, timestampsMs: [...timestampsMs] },
        timeoutMs: VIDEO_FRAMES_FETCH_TIMEOUT_MS,
      });
      if (!response.ok) {
        return this.failed(fileId, `status_${String(response.status)}`, started);
      }
      const frames: VideoFrameImage[] | null = toVideoFrames(response.data);
      return frames === null || frames.length === 0
        ? this.failed(fileId, 'malformed_or_empty', started)
        : { ok: true, frames, latencyMs: Date.now() - started };
    } catch (error: unknown) {
      return this.failed(fileId, error instanceof Error ? error.name : 'error', started);
    }
  }

  private failed(fileId: string, reason: string, started: number): VideoFramesFetchResult {
    this.logger.warn(`fetchFrames: fileId=${fileId} unavailable (${reason}) — transcript only`);
    return { ok: false, reason, latencyMs: Date.now() - started };
  }
}
