import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { type File, FileIngestionStatus } from '../../../generated/prisma';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { FilesRepository } from '../repositories/files.repository';
import { VideoMediaManager } from '../managers/video-media.manager';
import { type VideoFramesDto, videoFramesMetadataSchema } from '../dto/video-frames.dto';
import {
  VIDEO_FRAME_CACHE_KEY_PREFIX,
  VIDEO_FRAME_CACHE_TTL_SECONDS,
  VIDEO_FRAME_END_GUARD_MS,
  VIDEO_FRAME_MAX_BYTES,
  VIDEO_FRAME_MAX_WIDTH,
  VIDEO_FRAME_MIME_TYPE,
  VIDEO_FRAMES_NOT_A_VIDEO_CODE,
  VIDEO_FRAMES_NOT_A_VIDEO_MESSAGE,
  VIDEO_FRAMES_NOT_READY_CODE,
  VIDEO_FRAMES_NOT_READY_MESSAGE,
  VIDEO_FRAMES_OUT_OF_RANGE_CODE,
  VIDEO_FRAMES_OUT_OF_RANGE_MESSAGE,
  VIDEO_FRAMES_RESPONSE_MAX_BYTES,
} from '../constants/video-processing.constants';
import { type VideoFrame } from '../types/video-processing.types';

/**
 * On-demand video frames for a sibling service (multimodal batch 7; chat
 * calls it in batch 8). Retention decision: frames are NEVER persisted — they
 * are extracted into a per-request temp dir that is removed before the
 * response, and cached in Redis for `VIDEO_FRAME_CACHE_TTL_SECONDS` keyed by
 * (file, timestamp). Only the one thumbnail lives on the row.
 *
 * Ownership: the caller names the user and the row must belong to them; any
 * other answer is a 404, never a 403, so an id cannot be probed for existence.
 */
@Injectable()
export class VideoFramesService {
  private readonly logger = new Logger(VideoFramesService.name);

  constructor(
    private readonly filesRepository: FilesRepository,
    private readonly redis: RedisService,
    private readonly videoMedia: VideoMediaManager,
  ) {}

  async getFrames(fileId: string, dto: VideoFramesDto): Promise<VideoFrame[]> {
    const file = await this.filesRepository.findById(fileId);
    if (file?.userId !== dto.userId) {
      throw new EntityNotFoundException('File', fileId);
    }
    const durationMs = this.readyDuration(file);
    if (dto.timestampsMs.some((timestampMs) => timestampMs > durationMs)) {
      throw new BusinessException(
        VIDEO_FRAMES_OUT_OF_RANGE_MESSAGE,
        VIDEO_FRAMES_OUT_OF_RANGE_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }
    const wanted = [...new Set(dto.timestampsMs)];
    const frames = await this.readCache(fileId, wanted);
    const missing = wanted.filter((timestampMs) => !frames.has(timestampMs));
    if (missing.length > 0) {
      const fresh = await this.extract(file, missing, durationMs);
      for (const [timestampMs, base64] of fresh) {
        frames.set(timestampMs, base64);
        await this.writeCache(fileId, timestampMs, base64);
      }
    }
    const response = this.assemble(wanted, frames);
    this.logger.log(
      `getFrames: fileId=${fileId} requested=${String(wanted.length)} cached=${String(wanted.length - missing.length)} returned=${String(response.length)}`,
    );
    return response;
  }

  /** The processed duration, or a refusal: not a video, or not (successfully) processed. */
  private readyDuration(file: File): number {
    if (!file.mimeType.startsWith('video/')) {
      throw new BusinessException(
        VIDEO_FRAMES_NOT_A_VIDEO_MESSAGE,
        VIDEO_FRAMES_NOT_A_VIDEO_CODE,
        HttpStatus.BAD_REQUEST,
      );
    }
    const metadata = videoFramesMetadataSchema.safeParse(file.extractionMetadata);
    const ready =
      file.ingestionStatus === FileIngestionStatus.COMPLETED &&
      metadata.success &&
      (metadata.data.media.failureReason ?? null) === null;
    if (!ready) {
      throw new BusinessException(
        VIDEO_FRAMES_NOT_READY_MESSAGE,
        VIDEO_FRAMES_NOT_READY_CODE,
        HttpStatus.CONFLICT,
      );
    }
    return metadata.data.media.durationMs;
  }

  /** One temp dir for every missing timestamp; removed before this returns. */
  private async extract(
    file: File,
    timestamps: number[],
    durationMs: number,
  ): Promise<Map<number, string>> {
    const seekCeiling = Math.max(0, durationMs - VIDEO_FRAME_END_GUARD_MS);
    return this.videoMedia.withWorkspace(file, async (workspace) => {
      const extracted = new Map<number, string>();
      for (const timestampMs of timestamps) {
        const frame = await this.videoMedia.extractFrame(
          workspace,
          Math.min(timestampMs, seekCeiling),
          VIDEO_FRAME_MAX_WIDTH,
          VIDEO_FRAME_MAX_BYTES,
        );
        if (frame !== null) {
          extracted.set(timestampMs, frame.toString('base64'));
        }
      }
      return extracted;
    });
  }

  /** Requested order, frames that exist, stopping at the response byte cap. */
  private assemble(wanted: number[], frames: Map<number, string>): VideoFrame[] {
    const response: VideoFrame[] = [];
    let total = 0;
    for (const timestampMs of wanted) {
      const base64 = frames.get(timestampMs);
      if (base64 === undefined) {
        continue;
      }
      if (total + base64.length > VIDEO_FRAMES_RESPONSE_MAX_BYTES) {
        this.logger.warn(`assemble: response cap reached — later frames omitted`);
        break;
      }
      total += base64.length;
      response.push({ timestampMs, mimeType: VIDEO_FRAME_MIME_TYPE, base64 });
    }
    return response;
  }

  private cacheKey(fileId: string, timestampMs: number): string {
    return `${VIDEO_FRAME_CACHE_KEY_PREFIX}:${fileId}:${String(timestampMs)}`;
  }

  /** A cache miss and a Redis outage look the same: extract. */
  private async readCache(fileId: string, timestamps: number[]): Promise<Map<number, string>> {
    const hits = new Map<number, string>();
    for (const timestampMs of timestamps) {
      try {
        const value = await this.redis.get(this.cacheKey(fileId, timestampMs));
        if (value !== null && value.length > 0) {
          hits.set(timestampMs, value);
        }
      } catch (error: unknown) {
        this.logger.warn(
          `readCache: redis unavailable — ${error instanceof Error ? error.message : 'unknown'}`,
        );
        return hits;
      }
    }
    return hits;
  }

  private async writeCache(fileId: string, timestampMs: number, base64: string): Promise<void> {
    try {
      await this.redis.set(
        this.cacheKey(fileId, timestampMs),
        base64,
        VIDEO_FRAME_CACHE_TTL_SECONDS,
      );
    } catch (error: unknown) {
      this.logger.warn(
        `writeCache: redis unavailable — ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
