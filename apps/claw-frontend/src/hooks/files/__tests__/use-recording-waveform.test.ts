import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useRecordingWaveform } from '@/hooks/files/use-recording-waveform';

class MockAnalyserNode {
  fftSize = 0;
  frequencyBinCount = 64;
  getByteFrequencyData = vi.fn();
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  closed = false;
  constructor() {
    MockAudioContext.instances.push(this);
  }
  createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
  createAnalyser = vi.fn(() => new MockAnalyserNode());
  close = vi.fn(async () => {
    this.closed = true;
  });
}

function streamWithAudioTrack(): MediaStream {
  return { getAudioTracks: () => [{}] } as unknown as MediaStream;
}

describe('useRecordingWaveform', () => {
  beforeEach(() => {
    MockAudioContext.instances = [];
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = MockAudioContext;
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'AudioContext');
  });

  it('returns a flat array of zeros when there is no stream', () => {
    const { result } = renderHook(() => useRecordingWaveform(null, 8));
    expect(result.current).toHaveLength(8);
    expect(result.current.every((level) => level === 0)).toBe(true);
  });

  it('opens exactly one AudioContext for a stream with an audio track', () => {
    renderHook(() => useRecordingWaveform(streamWithAudioTrack(), 8));
    expect(MockAudioContext.instances).toHaveLength(1);
  });

  it('closes the AudioContext on unmount — the same track-release guarantee as useMediaRecorder', () => {
    const { unmount } = renderHook(() => useRecordingWaveform(streamWithAudioTrack(), 8));
    const context = MockAudioContext.instances[0];
    expect(context?.closed).toBe(false);

    unmount();

    expect(context?.closed).toBe(true);
  });

  it('closes the previous AudioContext and opens a new one when the stream changes', () => {
    const { rerender } = renderHook(({ stream }) => useRecordingWaveform(stream, 8), {
      initialProps: { stream: streamWithAudioTrack() },
    });
    const first = MockAudioContext.instances[0];

    rerender({ stream: streamWithAudioTrack() });

    expect(first?.closed).toBe(true);
    expect(MockAudioContext.instances).toHaveLength(2);
  });

  it('closes the AudioContext when the stream goes to null (recording stopped)', () => {
    const { rerender } = renderHook(
      ({ stream }: { stream: MediaStream | null }) => useRecordingWaveform(stream, 8),
      { initialProps: { stream: streamWithAudioTrack() as MediaStream | null } },
    );
    const context = MockAudioContext.instances[0];

    rerender({ stream: null });

    expect(context?.closed).toBe(true);
  });

  it('degrades to flat bars without throwing when there is no AudioContext at all', () => {
    Reflect.deleteProperty(globalThis as unknown as Record<string, unknown>, 'AudioContext');
    const { result } = renderHook(() => useRecordingWaveform(streamWithAudioTrack(), 8));
    expect(result.current).toHaveLength(8);
  });
});
