import {
  LIVE_CAPTURE_CLOCK_SKEW_MS,
  LIVE_CAPTURE_MAX_DURATION_MS,
  LIVE_CAPTURE_MIN_DURATION_MS,
  LIVE_CAPTURE_START_PATTERN,
  WAV_BYTES_PER_SECOND,
  WAV_CHUNK_HEADER_BYTES,
  WAV_FMT_MIN_BYTES,
  WAV_FORMAT_PCM,
  WAV_REQUIRED_BITS,
  WAV_REQUIRED_CHANNELS,
  WAV_REQUIRED_SAMPLE_RATE,
  WAV_RIFF_HEADER_BYTES,
} from '../constants/live-capture.constants';
import type { CaptureWavInfo } from '../types/live-capture.types';

function isPcm16Mono16k(buffer: Buffer, offset: number, size: number): boolean {
  return (
    size >= WAV_FMT_MIN_BYTES &&
    buffer.readUInt16LE(offset) === WAV_FORMAT_PCM &&
    buffer.readUInt16LE(offset + 2) === WAV_REQUIRED_CHANNELS &&
    buffer.readUInt32LE(offset + 4) === WAV_REQUIRED_SAMPLE_RATE &&
    buffer.readUInt16LE(offset + 14) === WAV_REQUIRED_BITS
  );
}

function durationOf(dataBytes: number): CaptureWavInfo | null {
  if (dataBytes % 2 !== 0) return null;
  const durationMs = Math.round((dataBytes / WAV_BYTES_PER_SECOND) * 1000);
  const inRange =
    durationMs >= LIVE_CAPTURE_MIN_DURATION_MS && durationMs <= LIVE_CAPTURE_MAX_DURATION_MS;
  return inRange ? { durationMs } : null;
}

/**
 * Validates a tab-audio chunk: RIFF/WAVE, a PCM "fmt " chunk of 16 kHz mono 16-bit before
 * the "data" chunk, a data chunk that fits the buffer, and 1 to 8 s of audio. Null when invalid.
 */
export function parseCaptureWav(buffer: Buffer): CaptureWavInfo | null {
  if (buffer.length < WAV_RIFF_HEADER_BYTES + WAV_CHUNK_HEADER_BYTES) return null;
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  let offset = WAV_RIFF_HEADER_BYTES;
  let formatOk = false;
  while (offset + WAV_CHUNK_HEADER_BYTES <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const body = offset + WAV_CHUNK_HEADER_BYTES;
    if (body + size > buffer.length) return null;
    if (id === 'fmt ') formatOk = isPcm16Mono16k(buffer, body, size);
    if (id === 'data') return formatOk ? durationOf(size) : null;
    offset = body + size + (size % 2);
  }
  return null;
}

/** The X-Chunk-Start-At epoch ms when it is an integer within 2 min of `now`, else null. */
export function parseChunkStartAt(header: string | undefined, now: number): number | null {
  const value = header?.trim();
  if (value === undefined || !LIVE_CAPTURE_START_PATTERN.test(value)) return null;
  const startAt = Number(value);
  return Math.abs(startAt - now) <= LIVE_CAPTURE_CLOCK_SKEW_MS ? startAt : null;
}
