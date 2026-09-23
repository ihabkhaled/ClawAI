'use client';

import { useEffect, useState } from 'react';

import { WAVEFORM_BAR_COUNT, WAVEFORM_FFT_SIZE } from '@/constants/recording-waveform.constants';
import type { WindowWithWebkitAudioContext } from '@/types';
import { computeBarLevels } from '@/utilities/recording-waveform.utility';

/**
 * Live bar levels (0..1, length `barCount`) for the recording waveform, read
 * from an AnalyserNode attached to `stream`'s audio track.
 *
 * Every exit path tears the AudioContext down: a new/null stream, or unmount.
 * An AudioContext left open is the same class of leak `useMediaRecorder`
 * guards against for the MediaStream itself, just a second device (the Web
 * Audio graph) that a full-screen recording surface newly introduces.
 *
 * Browsers with no AudioContext (or a construction that throws) leave the
 * bars at their floor value — the timer and stop/cancel controls still work;
 * only the visualization degrades.
 */
export function useRecordingWaveform(
  stream: MediaStream | null,
  barCount: number = WAVEFORM_BAR_COUNT,
): number[] {
  const [levels, setLevels] = useState<number[]>(() => new Array(barCount).fill(0) as number[]);

  useEffect(() => {
    if (stream === null || stream.getAudioTracks().length === 0) {
      setLevels(new Array(barCount).fill(0) as number[]);
      return undefined;
    }

    const AudioContextCtor =
      typeof window === 'undefined'
        ? undefined
        : (window.AudioContext ?? (window as WindowWithWebkitAudioContext).webkitAudioContext);
    if (AudioContextCtor === undefined) {
      return undefined;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let audioContext: AudioContext | null = null;

    try {
      audioContext = new AudioContextCtor();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = WAVEFORM_FFT_SIZE;
      source.connect(analyser);
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);

      const tick = (): void => {
        if (cancelled) {
          return;
        }
        analyser.getByteFrequencyData(frequencyData);
        setLevels(computeBarLevels(frequencyData, barCount));
        rafId = requestAnimationFrame(tick);
      };
      rafId = requestAnimationFrame(tick);
    } catch {
      // AnalyserNode unsupported or construction failed — bars stay at floor,
      // recording itself is unaffected.
      return undefined;
    }

    return (): void => {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      void audioContext?.close();
    };
  }, [stream, barCount]);

  return levels;
}
