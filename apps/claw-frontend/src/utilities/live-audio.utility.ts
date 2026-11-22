import {
  LIVE_MS_PER_SECOND,
  LIVE_WAV_HEADER_BYTES,
  LIVE_WAV_MIME_TYPE,
} from '@/constants/live.constants';
import type { LiveAudioChunker, LiveAudioChunkerOptions } from '@/types/live.types';

/**
 * Downsamples mono float samples by averaging each output sample's input window (a box filter, so
 * content above the new Nyquist is damped instead of folding back as noise). Works for non-integer
 * ratios such as 44.1 kHz → 16 kHz. A rate at or below the target is returned as a copy.
 */
export function downsampleLiveAudio(
  input: Float32Array,
  inputRate: number,
  outputRate: number,
): Float32Array {
  if (inputRate <= outputRate) {
    return input.slice();
  }
  const ratio = inputRate / outputRate;
  const outputLength = Math.floor(input.length / ratio);
  const output = new Float32Array(outputLength);
  for (let index = 0; index < outputLength; index += 1) {
    const start = Math.floor(index * ratio);
    const end = Math.min(input.length, Math.max(start + 1, Math.floor((index + 1) * ratio)));
    let sum = 0;
    for (let cursor = start; cursor < end; cursor += 1) {
      sum += input[cursor] ?? 0;
    }
    output[index] = sum / (end - start);
  }
  return output;
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let index = 0; index < text.length; index += 1) {
    view.setUint8(offset + index, text.charCodeAt(index));
  }
}

/** A 16-bit PCM mono WAV (44-byte RIFF header + little-endian samples, clamped to [-1, 1]). */
export function encodeLivePcm16Wav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(LIVE_WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index] ?? 0));
    view.setInt16(
      LIVE_WAV_HEADER_BYTES + index * 2,
      sample < 0 ? sample * 0x8000 : sample * 0x7fff,
      true,
    );
  }
  return buffer;
}

/**
 * Collects worklet frames at the context rate and emits one WAV chunk every `chunkSeconds`. Chunk
 * start times run back to back from the first frame, so the server's timeline has no gaps or overlaps.
 * A partial chunk is dropped on reset (the server refuses chunks under one second anyway).
 */
export function createLiveAudioChunker(options: LiveAudioChunkerOptions): LiveAudioChunker {
  const samplesPerChunk = Math.round(options.inputRate * options.chunkSeconds);
  let frames: Float32Array[] = [];
  let buffered = 0;
  let chunkStartAt: number | null = null;

  const emit = (): void => {
    const joined = new Float32Array(buffered);
    let offset = 0;
    for (const frame of frames) {
      joined.set(frame, offset);
      offset += frame.length;
    }
    const chunk = joined.subarray(0, samplesPerChunk);
    const rest = joined.slice(samplesPerChunk);
    const startAt = chunkStartAt ?? options.now();
    const pcm = downsampleLiveAudio(chunk, options.inputRate, options.outputRate);
    const wav = new Blob([encodeLivePcm16Wav(pcm, options.outputRate)], {
      type: LIVE_WAV_MIME_TYPE,
    });
    frames = rest.length > 0 ? [rest] : [];
    buffered = rest.length;
    chunkStartAt = startAt + options.chunkSeconds * LIVE_MS_PER_SECOND;
    options.onChunk({ wav, startAt });
  };

  return {
    push: (frame: Float32Array): void => {
      if (frame.length === 0) {
        return;
      }
      if (chunkStartAt === null) {
        chunkStartAt = options.now() - (frame.length / options.inputRate) * LIVE_MS_PER_SECOND;
      }
      frames.push(frame);
      buffered += frame.length;
      while (buffered >= samplesPerChunk) {
        emit();
      }
    },
    reset: (): void => {
      frames = [];
      buffered = 0;
      chunkStartAt = null;
    },
  };
}
