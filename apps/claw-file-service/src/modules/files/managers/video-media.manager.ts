import { Injectable, Logger } from '@nestjs/common';
import { VideoProcessingFailureReason } from '@claw/shared-types';
import { type File } from '../../../generated/prisma';
import { MediaProcessStatus } from '../../../common/enums';
import { MediaSourceUnreadableError } from '../../../common/errors';
import { readFile } from '../../../common/utilities';
import {
  createMediaTempDir,
  mediaTempPath,
  readMediaTempFile,
  removeMediaTempDir,
  writeMediaTempFile,
} from '../../../common/utilities/media-process.utility';
import {
  extractAudioTrack,
  extractVideoFrame,
  probeMediaFile,
} from '../adapters/media-tool.adapter';
import {
  MEDIA_TEMP_INPUT_NAME,
  VIDEO_AUDIO_TEMP_NAME,
  VIDEO_FRAME_TEMP_EXTENSION,
  VIDEO_FRAME_TEMP_PREFIX,
  VIDEO_THUMBNAIL_MAX_BYTES,
  VIDEO_THUMBNAIL_MAX_WIDTH,
  VIDEO_THUMBNAIL_POSITION_PERCENT,
  VIDEO_THUMBNAIL_TEMP_NAME,
} from '../constants/video-processing.constants';
import { MAX_TRANSCRIBABLE_AUDIO_BYTES } from '../constants/transcription.constants';
import {
  type MediaProcessResult,
  type MediaWorkspace,
  type VideoProbeOutcome,
} from '../types/video-processing.types';
import { parseProbeOutput } from '../utilities/video-probe.utility';

/**
 * Everything ffmpeg does to a video, inside one per-job temp dir (batch 7).
 *
 * `withWorkspace` is the only way in: it makes a random `os.tmpdir()` dir,
 * copies the stored bytes to a FIXED name inside it (so the user's filename
 * never becomes an argument), runs the work, and removes the dir in `finally`
 * — on success, on failure and on a throw. Nothing this manager produces is
 * written anywhere else; the thumbnail and frames come back as buffers.
 */
@Injectable()
export class VideoMediaManager {
  private readonly logger = new Logger(VideoMediaManager.name);

  async withWorkspace<T>(file: File, work: (workspace: MediaWorkspace) => Promise<T>): Promise<T> {
    const dir = await createMediaTempDir();
    try {
      const inputPath = await writeMediaTempFile(dir, MEDIA_TEMP_INPUT_NAME, this.readSource(file));
      return await work({ dir, inputPath });
    } finally {
      await removeMediaTempDir(dir);
      this.logger.debug(`withWorkspace: fileId=${file.id} temp dir removed`);
    }
  }

  /** ffprobe → facts, or the reason there are none. Never throws. */
  async probe(workspace: MediaWorkspace): Promise<VideoProbeOutcome> {
    const result = await probeMediaFile(workspace.inputPath);
    const failure = this.classifyProbeFailure(result);
    if (failure !== null) {
      this.logger.warn(`probe: failed reason=${failure} stderr=${result.stderr.slice(0, 200)}`);
      return { ok: false, reason: failure, detail: result.stderr.slice(0, 200) };
    }
    const summary = parseProbeOutput(result.stdout.toString('utf8'));
    if (summary === null) {
      this.logger.warn('probe: ffprobe output did not parse — treating as a corrupt container');
      return {
        ok: false,
        reason: VideoProcessingFailureReason.CORRUPT_CONTAINER,
        detail: 'unparseable probe output',
      };
    }
    this.logger.log(
      `probe: durationMs=${String(summary.durationMs)} ${String(summary.width)}x${String(summary.height)} video=${String(summary.videoCodec)} audio=${String(summary.audioCodec)} container=${String(summary.container)}`,
    );
    return { ok: true, summary };
  }

  /** One small JPEG ~10% into the clip, or null (a thumbnail is never fatal). */
  async extractThumbnail(workspace: MediaWorkspace, durationMs: number): Promise<Buffer | null> {
    const at = Math.floor((durationMs * VIDEO_THUMBNAIL_POSITION_PERCENT) / 100);
    return this.extractJpeg(
      workspace,
      VIDEO_THUMBNAIL_TEMP_NAME,
      at,
      VIDEO_THUMBNAIL_MAX_WIDTH,
      VIDEO_THUMBNAIL_MAX_BYTES,
    );
  }

  /** One JPEG frame at `timestampMs`, or null when ffmpeg failed or it is over `maxBytes`. */
  async extractFrame(
    workspace: MediaWorkspace,
    timestampMs: number,
    maxWidth: number,
    maxBytes: number,
  ): Promise<Buffer | null> {
    const name = `${VIDEO_FRAME_TEMP_PREFIX}${String(Math.floor(timestampMs))}${VIDEO_FRAME_TEMP_EXTENSION}`;
    return this.extractJpeg(workspace, name, timestampMs, maxWidth, maxBytes);
  }

  /** The first audio track as 16 kHz mono MP3, or null when it could not be pulled out. */
  async extractAudio(workspace: MediaWorkspace, durationMs: number): Promise<Buffer | null> {
    const outputPath = mediaTempPath(workspace.dir, VIDEO_AUDIO_TEMP_NAME);
    const result = await extractAudioTrack(
      workspace.inputPath,
      outputPath,
      Math.ceil(durationMs / 1000),
    );
    if (!this.succeeded(result)) {
      this.logger.warn(
        `extractAudio: status=${result.status} exit=${String(result.exitCode)} stderr=${result.stderr.slice(0, 200)}`,
      );
      return null;
    }
    const audio = await readMediaTempFile(outputPath, MAX_TRANSCRIBABLE_AUDIO_BYTES);
    this.logger.log(`extractAudio: derived track bytes=${String(audio?.length ?? 0)}`);
    return audio;
  }

  private async extractJpeg(
    workspace: MediaWorkspace,
    name: string,
    timestampMs: number,
    maxWidth: number,
    maxBytes: number,
  ): Promise<Buffer | null> {
    const outputPath = mediaTempPath(workspace.dir, name);
    const result = await extractVideoFrame(workspace.inputPath, outputPath, timestampMs, maxWidth);
    if (!this.succeeded(result)) {
      this.logger.warn(
        `extractJpeg: at=${String(timestampMs)}ms status=${result.status} exit=${String(result.exitCode)}`,
      );
      return null;
    }
    return readMediaTempFile(outputPath, maxBytes);
  }

  private succeeded(result: MediaProcessResult): boolean {
    return result.status === MediaProcessStatus.EXITED && result.exitCode === 0;
  }

  private classifyProbeFailure(result: MediaProcessResult): VideoProcessingFailureReason | null {
    if (result.status === MediaProcessStatus.SPAWN_FAILED) {
      return VideoProcessingFailureReason.TOOL_UNAVAILABLE;
    }
    if (result.status === MediaProcessStatus.TIMED_OUT) {
      return VideoProcessingFailureReason.PROBE_TIMEOUT;
    }
    return this.succeeded(result) ? null : VideoProcessingFailureReason.CORRUPT_CONTAINER;
  }

  /**
   * The uploaded bytes. `files.content` is base64 of the original upload (rule
   * 42 item 1); the on-disk copy is the fallback for a row stored without it.
   */
  private readSource(file: File): Buffer {
    if (typeof file.content === 'string' && file.content.length > 0) {
      return Buffer.from(file.content, 'base64');
    }
    try {
      return readFile(file.storagePath);
    } catch (error: unknown) {
      throw new MediaSourceUnreadableError(error instanceof Error ? error.message : 'unreadable');
    }
  }
}
