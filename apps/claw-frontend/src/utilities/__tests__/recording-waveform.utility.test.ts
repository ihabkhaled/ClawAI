import { describe, expect, it } from 'vitest';

import { WAVEFORM_MIN_BAR_LEVEL } from '@/constants/recording-waveform.constants';
import { computeBarLevels } from '@/utilities/recording-waveform.utility';

describe('computeBarLevels', () => {
  it('downsamples a frequency buffer into the requested number of bars', () => {
    const data = new Uint8Array(128).fill(255);
    const levels = computeBarLevels(data, 32);
    expect(levels).toHaveLength(32);
    // Max input -> every bar near 1.
    for (const level of levels) {
      expect(level).toBeCloseTo(1, 5);
    }
  });

  it('never lets a bar collapse fully to zero — silence still reads as "live", not "frozen"', () => {
    const data = new Uint8Array(128).fill(0);
    const levels = computeBarLevels(data, 16);
    for (const level of levels) {
      expect(level).toBe(WAVEFORM_MIN_BAR_LEVEL);
    }
  });

  it('clamps every level into [MIN, 1]', () => {
    const data = new Uint8Array([0, 64, 128, 192, 255, 30, 200]);
    const levels = computeBarLevels(data, 4);
    for (const level of levels) {
      expect(level).toBeGreaterThanOrEqual(WAVEFORM_MIN_BAR_LEVEL);
      expect(level).toBeLessThanOrEqual(1);
    }
  });

  it('returns an empty array for a zero bar count or empty buffer', () => {
    expect(computeBarLevels(new Uint8Array(8), 0)).toEqual([]);
    expect(computeBarLevels(new Uint8Array(0), 8)).toEqual([]);
  });
});
