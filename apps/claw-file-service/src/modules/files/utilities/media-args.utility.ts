import {
  MEDIA_FORMAT_WHITELIST,
  MEDIA_PROTOCOL_WHITELIST,
  VIDEO_AUDIO_BITRATE,
  VIDEO_AUDIO_CHANNELS,
  VIDEO_AUDIO_CODEC,
  VIDEO_AUDIO_FORMAT,
  VIDEO_AUDIO_SAMPLE_RATE,
  VIDEO_JPEG_QUALITY,
  VIDEO_MAX_DURATION_MS,
} from '../constants/video-processing.constants';

// Argument ARRAYS for ffprobe / ffmpeg (multimodal batch 7). Pure, so the
// security properties are unit-tested without a binary:
//  - every input is preceded by the protocol AND format whitelists;
//  - the only paths are the ones the caller built inside its temp dir;
//  - the only other variable parts are integers this file formats itself.

/** The guard that precedes EVERY `-i`: no network protocol, no playlist demuxer. */
export function inputGuardArgs(): string[] {
  return [
    '-protocol_whitelist',
    MEDIA_PROTOCOL_WHITELIST,
    '-format_whitelist',
    MEDIA_FORMAT_WHITELIST,
  ];
}

/** `ffmpeg`-only preamble. ffprobe has no `-nostdin`; its stdin is `ignore` instead. */
function ffmpegPreamble(): string[] {
  return ['-nostdin', '-hide_banner', '-loglevel', 'error'];
}

/**
 * Milliseconds → ffmpeg seconds with a fixed three-decimal fraction
 * (`12345` → `12.345`). Clamped to [0, the global duration cap] and floored,
 * so a NaN or a negative can never become an argument.
 */
export function formatSeekSeconds(timestampMs: number): string {
  const safe = Number.isFinite(timestampMs)
    ? Math.min(VIDEO_MAX_DURATION_MS, Math.max(0, Math.floor(timestampMs)))
    : 0;
  return `${String(Math.floor(safe / 1000))}.${String(safe % 1000).padStart(3, '0')}`;
}

/** `ffprobe` → JSON of the container and every stream. */
export function buildProbeArgs(inputPath: string): string[] {
  return [
    '-hide_banner',
    '-v',
    'error',
    ...inputGuardArgs(),
    '-print_format',
    'json',
    '-show_format',
    '-show_streams',
    '-i',
    inputPath,
  ];
}

/** First audio stream → 16 kHz mono 32 kbps MP3, capped at `maxSeconds`. */
export function buildAudioExtractArgs(
  inputPath: string,
  outputPath: string,
  maxSeconds: number,
): string[] {
  return [
    ...ffmpegPreamble(),
    ...inputGuardArgs(),
    '-i',
    inputPath,
    '-map',
    '0:a:0',
    '-vn',
    '-sn',
    '-dn',
    '-ac',
    VIDEO_AUDIO_CHANNELS,
    '-ar',
    VIDEO_AUDIO_SAMPLE_RATE,
    '-c:a',
    VIDEO_AUDIO_CODEC,
    '-b:a',
    VIDEO_AUDIO_BITRATE,
    '-t',
    String(Math.max(1, Math.ceil(maxSeconds))),
    '-f',
    VIDEO_AUDIO_FORMAT,
    '-y',
    outputPath,
  ];
}

/**
 * One JPEG at `timestampMs`, scaled to at most `maxWidth` wide (height even,
 * aspect kept). `-ss` BEFORE `-i` is an input seek: fast, keyframe-accurate.
 */
export function buildFrameArgs(
  inputPath: string,
  outputPath: string,
  timestampMs: number,
  maxWidth: number,
): string[] {
  const width = String(Math.max(16, Math.floor(maxWidth)));
  return [
    ...ffmpegPreamble(),
    ...inputGuardArgs(),
    '-ss',
    formatSeekSeconds(timestampMs),
    '-i',
    inputPath,
    '-map',
    '0:v:0',
    '-frames:v',
    '1',
    '-an',
    '-sn',
    '-dn',
    '-vf',
    `scale='min(${width},iw)':-2`,
    '-q:v',
    VIDEO_JPEG_QUALITY,
    '-f',
    'image2',
    '-c:v',
    'mjpeg',
    '-y',
    outputPath,
  ];
}
