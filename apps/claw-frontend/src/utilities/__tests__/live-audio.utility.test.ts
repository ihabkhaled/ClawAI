import { describe, expect, it, vi } from 'vitest';

import type { LiveAudioChunkInput } from '@/types/live.types';
import {
  createLiveAudioChunker,
  downsampleLiveAudio,
  encodeLivePcm16Wav,
} from '@/utilities/live-audio.utility';

function ascii(view: DataView, offset: number, length: number): string {
  let text = '';
  for (let index = 0; index < length; index += 1) {
    text += String.fromCharCode(view.getUint8(offset + index));
  }
  return text;
}

describe('downsampleLiveAudio', () => {
  it('averages each window for an integer ratio (48 kHz → 16 kHz)', () => {
    const input = Float32Array.from([0, 0.3, 0.6, 1, 1, 1, -1, -1, -1]);
    const output = downsampleLiveAudio(input, 48_000, 16_000);
    expect(output.length).toBe(3);
    expect(output[0]).toBeCloseTo(0.3);
    expect(output[1]).toBeCloseTo(1);
    expect(output[2]).toBeCloseTo(-1);
  });

  it('produces the right sample count for a non-integer ratio (44.1 kHz → 16 kHz)', () => {
    const output = downsampleLiveAudio(new Float32Array(44_100).fill(0.5), 44_100, 16_000);
    expect(output.length).toBe(16_000);
    expect(output.every((sample) => Math.abs(sample - 0.5) < 1e-6)).toBe(true);
  });

  it('returns a copy when the rate is already at or below the target', () => {
    const input = Float32Array.from([0.1, 0.2]);
    const output = downsampleLiveAudio(input, 16_000, 16_000);
    expect(Array.from(output)).toEqual(Array.from(input));
    expect(output).not.toBe(input);
  });
});

describe('encodeLivePcm16Wav', () => {
  it('writes a 44-byte PCM16 mono header and one int16 per sample', () => {
    const samples = Float32Array.from([0, 1, -1, 2, -2, 0.5]);
    const buffer = encodeLivePcm16Wav(samples, 16_000);
    const view = new DataView(buffer);
    expect(buffer.byteLength).toBe(44 + samples.length * 2);
    expect(ascii(view, 0, 4)).toBe('RIFF');
    expect(view.getUint32(4, true)).toBe(36 + samples.length * 2);
    expect(ascii(view, 8, 4)).toBe('WAVE');
    expect(ascii(view, 12, 4)).toBe('fmt ');
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16_000);
    expect(view.getUint32(28, true)).toBe(32_000);
    expect(view.getUint16(32, true)).toBe(2);
    expect(view.getUint16(34, true)).toBe(16);
    expect(ascii(view, 36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
    const pcm = [0, 1, 2, 3, 4, 5].map((index) => view.getInt16(44 + index * 2, true));
    expect(pcm).toEqual([0, 32_767, -32_768, 32_767, -32_768, 16_383]);
  });
});

describe('createLiveAudioChunker', () => {
  it('emits back-to-back 6 s chunks of 16 kHz WAV with continuous start times', () => {
    const chunks: LiveAudioChunkInput[] = [];
    const now = vi.fn().mockReturnValue(100_000);
    const chunker = createLiveAudioChunker({
      inputRate: 48_000,
      outputRate: 16_000,
      chunkSeconds: 6,
      now,
      onChunk: (chunk) => chunks.push(chunk),
    });
    const frame = new Float32Array(48_000).fill(0.25);
    for (let second = 0; second < 13; second += 1) {
      chunker.push(frame);
    }
    expect(chunks).toHaveLength(2);
    // The first frame (1 s) had already played when it arrived: the chunk starts 1 s before `now`.
    expect(chunks[0]?.startAt).toBe(99_000);
    expect(chunks[1]?.startAt).toBe(105_000);
    const first = chunks[0];
    expect(first?.wav.type).toBe('audio/wav');
    expect(first?.wav.size).toBe(44 + 16_000 * 6 * 2);
  });

  it('drops a partial chunk on reset and restarts the clock', () => {
    const onChunk = vi.fn();
    const now = vi.fn().mockReturnValue(10_000);
    const chunker = createLiveAudioChunker({
      inputRate: 16_000,
      outputRate: 16_000,
      chunkSeconds: 6,
      now,
      onChunk,
    });
    chunker.push(new Float32Array(16_000 * 5));
    chunker.reset();
    now.mockReturnValue(50_000);
    chunker.push(new Float32Array(16_000 * 6));
    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk.mock.calls[0]?.[0].startAt).toBe(44_000);
  });
});
