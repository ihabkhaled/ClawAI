import { WAVEFORM_MIN_BAR_LEVEL } from '@/constants/recording-waveform.constants';

/**
 * Downsamples an AnalyserNode frequency-data buffer into `barCount` levels in
 * [WAVEFORM_MIN_BAR_LEVEL, 1]. Pure so it is testable without a real
 * AudioContext: feed it a Uint8Array, read back bar heights.
 */
export function computeBarLevels(frequencyData: Uint8Array, barCount: number): number[] {
  if (barCount <= 0 || frequencyData.length === 0) {
    return [];
  }
  const groupSize = Math.max(1, Math.floor(frequencyData.length / barCount));
  const levels: number[] = [];
  for (let bar = 0; bar < barCount; bar += 1) {
    const start = bar * groupSize;
    const end = Math.min(start + groupSize, frequencyData.length);
    let sum = 0;
    let count = 0;
    for (let index = start; index < end; index += 1) {
      sum += frequencyData[index] ?? 0;
      count += 1;
    }
    const average = count > 0 ? sum / count / 255 : 0;
    levels.push(Math.max(WAVEFORM_MIN_BAR_LEVEL, Math.min(1, average)));
  }
  return levels;
}
