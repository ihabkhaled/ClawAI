import {
  VIDEO_SILENCE_MAX_VOLUME_DB,
  VOLUME_DETECT_MAX_VOLUME_LABEL,
  VOLUME_DETECT_NEGATIVE_INFINITY,
  VOLUME_DETECT_UNIT_SUFFIX,
} from '../constants/video-processing.constants';

// Reads ffmpeg `volumedetect` output (stderr). Pure.

/**
 * The PEAK level `volumedetect` measured, in dBFS, or null when stderr carries
 * no parseable `max_volume:` line (the filter did not run, or its line fell
 * past the stderr cap). The LAST occurrence wins: it is the filter's summary.
 */
export function parseMaxVolumeDb(stderr: string): number | null {
  const at = stderr.lastIndexOf(VOLUME_DETECT_MAX_VOLUME_LABEL);
  if (at < 0) {
    return null;
  }
  // `max_volume: -91.0 dB` → the token between the label and ` dB`. Parsed by
  // hand (no regex): `-inf`, or a finite number.
  const rest = stderr.slice(at + VOLUME_DETECT_MAX_VOLUME_LABEL.length);
  const unit = rest.indexOf(VOLUME_DETECT_UNIT_SUFFIX);
  if (unit < 0) {
    return null;
  }
  const value = rest.slice(0, unit).trim();
  if (value === VOLUME_DETECT_NEGATIVE_INFINITY) {
    return Number.NEGATIVE_INFINITY;
  }
  const parsed = Number(value);
  return value.length === 0 || !Number.isFinite(parsed) ? null : parsed;
}

/** Below the silence threshold: no audible speech, so nothing to transcribe (or charge). */
export function isSilentPeak(maxVolumeDb: number): boolean {
  return maxVolumeDb < VIDEO_SILENCE_MAX_VOLUME_DB;
}
