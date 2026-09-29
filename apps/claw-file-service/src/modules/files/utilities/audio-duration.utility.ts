import { Logger } from '@nestjs/common';
import { MediaProcessStatus } from '../../../common/enums';
import {
  createMediaTempDir,
  removeMediaTempDir,
  writeMediaTempFile,
} from '../../../common/utilities/media-process.utility';
import { probeMediaFile } from '../adapters/media-tool.adapter';
import { AUDIO_PROBE_TEMP_NAME } from '../constants/transcription.constants';
import { AUDIO_PROBE_FORMAT_WHITELIST } from '../constants/video-processing.constants';
import { type MediaProcessResult } from '../types/video-processing.types';
import { parseProbeOutput } from './video-probe.utility';

const logger = new Logger('AudioDurationUtility');

/**
 * Whole-second duration from an ffprobe result, rounded UP (providers bill by
 * the second), or undefined when ffprobe failed or reported no length.
 */
export function audioSecondsFromProbe(result: MediaProcessResult): number | undefined {
  if (result.status !== MediaProcessStatus.EXITED || result.exitCode !== 0) {
    return undefined;
  }
  const summary = parseProbeOutput(result.stdout.toString('utf8'));
  return summary !== null && summary.durationMs > 0
    ? Math.ceil(summary.durationMs / 1000)
    : undefined;
}

/**
 * Measures an audio upload's length with ffprobe, in a private temp dir that is
 * removed in `finally`. gpt-4o-*-transcribe returns no `duration`, so this is
 * the number the PAYG hold and settle use. Never throws: undefined means "not
 * measured" and the caller keeps its byte-derived estimate (never $0).
 */
export async function probeAudioSeconds(base64: string): Promise<number | undefined> {
  let dir: string | null = null;
  try {
    dir = await createMediaTempDir();
    const inputPath = await writeMediaTempFile(
      dir,
      AUDIO_PROBE_TEMP_NAME,
      Buffer.from(base64, 'base64'),
    );
    return audioSecondsFromProbe(
      await probeMediaFile(inputPath, undefined, AUDIO_PROBE_FORMAT_WHITELIST),
    );
  } catch (error: unknown) {
    logger.warn(
      `probeAudioSeconds: probe failed — ${error instanceof Error ? error.message : 'unknown error'}`,
    );
    return undefined;
  } finally {
    if (dir !== null) {
      await removeMediaTempDir(dir);
    }
  }
}
