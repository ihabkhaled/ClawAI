import { Logger } from '@nestjs/common';
import { runMediaProcess } from '../../../common/utilities/media-process.utility';
import {
  FFMPEG_BINARY,
  FFPROBE_BINARY,
  MEDIA_AUDIO_EXTRACT_TIMEOUT_MS,
  MEDIA_FRAME_TIMEOUT_MS,
  MEDIA_PROBE_TIMEOUT_MS,
  MEDIA_STDERR_MAX_BYTES,
  MEDIA_STDOUT_MAX_BYTES,
} from '../constants/video-processing.constants';
import { type MediaProcessResult } from '../types/video-processing.types';
import {
  buildAudioExtractArgs,
  buildFrameArgs,
  buildProbeArgs,
} from '../utilities/media-args.utility';

const logger = new Logger('MediaToolAdapter');

/**
 * The ffprobe / ffmpeg adapter (multimodal batch 7, rules/13). Three
 * operations, each one bounded process with its own wall-clock budget. The
 * caller owns the temp dir: every path passed in here was built inside it.
 * ffmpeg writes its outputs to files there (never to stdout), so the stdout
 * cap only ever matters for ffprobe's JSON.
 */

/** ffprobe's JSON for the input. */
export const probeMediaFile = async (inputPath: string): Promise<MediaProcessResult> => {
  const result = await runMediaProcess({
    command: FFPROBE_BINARY,
    args: buildProbeArgs(inputPath),
    timeoutMs: MEDIA_PROBE_TIMEOUT_MS,
    maxStdoutBytes: MEDIA_STDOUT_MAX_BYTES,
    maxStderrBytes: MEDIA_STDERR_MAX_BYTES,
  });
  logger.debug(
    `probeMediaFile: status=${result.status} exit=${String(result.exitCode)} bytes=${String(result.stdout.length)}`,
  );
  return result;
};

/** The first audio stream, as 16 kHz mono MP3, written to `outputPath`. */
export const extractAudioTrack = async (
  inputPath: string,
  outputPath: string,
  maxSeconds: number,
): Promise<MediaProcessResult> => {
  const result = await runMediaProcess({
    command: FFMPEG_BINARY,
    args: buildAudioExtractArgs(inputPath, outputPath, maxSeconds),
    timeoutMs: MEDIA_AUDIO_EXTRACT_TIMEOUT_MS,
    maxStdoutBytes: MEDIA_STDOUT_MAX_BYTES,
    maxStderrBytes: MEDIA_STDERR_MAX_BYTES,
  });
  logger.debug(`extractAudioTrack: status=${result.status} exit=${String(result.exitCode)}`);
  return result;
};

/** One JPEG frame at `timestampMs`, at most `maxWidth` wide, written to `outputPath`. */
export const extractVideoFrame = async (
  inputPath: string,
  outputPath: string,
  timestampMs: number,
  maxWidth: number,
): Promise<MediaProcessResult> => {
  const result = await runMediaProcess({
    command: FFMPEG_BINARY,
    args: buildFrameArgs(inputPath, outputPath, timestampMs, maxWidth),
    timeoutMs: MEDIA_FRAME_TIMEOUT_MS,
    maxStdoutBytes: MEDIA_STDOUT_MAX_BYTES,
    maxStderrBytes: MEDIA_STDERR_MAX_BYTES,
  });
  logger.debug(
    `extractVideoFrame: at=${String(timestampMs)}ms status=${result.status} exit=${String(result.exitCode)}`,
  );
  return result;
};
