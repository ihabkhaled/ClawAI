import { describe, expect, it } from 'vitest';

import { VIDEO_SILENCE_MAX_VOLUME_DB } from '../../constants/video-processing.constants';
import { isSilentPeak, parseMaxVolumeDb } from '../volume-detect.utility';

const STDERR = [
  "Input #0, mp3, from 'audio.mp3':",
  '  Duration: 00:00:12.00, start: 0.000000, bitrate: 32 kb/s',
  '[Parsed_volumedetect_0 @ 0x55d] n_samples: 192000',
  '[Parsed_volumedetect_0 @ 0x55d] mean_volume: -27.3 dB',
  '[Parsed_volumedetect_0 @ 0x55d] max_volume: -6.2 dB',
  '[Parsed_volumedetect_0 @ 0x55d] histogram_6db: 12',
].join('\n');

describe('parseMaxVolumeDb', () => {
  it('reads the peak level from volumedetect output', () => {
    expect(parseMaxVolumeDb(STDERR)).toBe(-6.2);
  });

  it('reads -inf as negative infinity (pure digital silence)', () => {
    expect(parseMaxVolumeDb('[Parsed_volumedetect_0 @ 0x1] max_volume: -inf dB')).toBe(
      Number.NEGATIVE_INFINITY,
    );
  });

  it('reads 0.0 dB (a clipped track) and positive-free integers', () => {
    expect(parseMaxVolumeDb('max_volume: 0.0 dB')).toBe(0);
    expect(parseMaxVolumeDb('max_volume: -91 dB')).toBe(-91);
  });

  it('uses the LAST max_volume line (the filter summary)', () => {
    expect(parseMaxVolumeDb('max_volume: -80.0 dB\nmax_volume: -12.0 dB')).toBe(-12);
  });

  it('returns null when there is no parseable line', () => {
    expect(parseMaxVolumeDb('')).toBeNull();
    expect(parseMaxVolumeDb('mean_volume: -20.0 dB')).toBeNull();
    expect(parseMaxVolumeDb('max_volume: garbage')).toBeNull();
    expect(parseMaxVolumeDb('max_volume:')).toBeNull();
  });
});

describe('isSilentPeak', () => {
  it('is silent strictly below the threshold, not at it', () => {
    expect(VIDEO_SILENCE_MAX_VOLUME_DB).toBe(-50);
    expect(isSilentPeak(-91)).toBe(true);
    expect(isSilentPeak(Number.NEGATIVE_INFINITY)).toBe(true);
    expect(isSilentPeak(-50.1)).toBe(true);
    expect(isSilentPeak(-50)).toBe(false);
    expect(isSilentPeak(-42)).toBe(false);
    expect(isSilentPeak(-3)).toBe(false);
  });
});
