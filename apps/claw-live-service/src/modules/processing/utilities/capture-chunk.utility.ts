import {
  LIVE_CAPTURE_ENTRY_HEADER_BYTES,
  LIVE_CAPTURE_QUEUE_KEY_PREFIX,
} from '../constants/processing.constants';
import type { AudioChunk } from '../types/processing.types';

/** One tab-audio chunk as a Redis list entry: 16-byte media-time header + the WAV bytes. */
export function encodeCaptureChunk(chunk: AudioChunk): Buffer {
  const header = Buffer.alloc(LIVE_CAPTURE_ENTRY_HEADER_BYTES);
  header.writeBigInt64BE(BigInt(chunk.startAt), 0);
  header.writeBigInt64BE(BigInt(chunk.endAt), 8);
  return Buffer.concat([header, chunk.wav]);
}

/** The chunk back from a list entry; null for an entry too short to carry a header and audio. */
export function decodeCaptureChunk(entry: Buffer): AudioChunk | null {
  if (entry.length <= LIVE_CAPTURE_ENTRY_HEADER_BYTES) return null;
  const startAt = Number(entry.readBigInt64BE(0));
  const endAt = Number(entry.readBigInt64BE(8));
  return endAt <= startAt
    ? null
    : { wav: entry.subarray(LIVE_CAPTURE_ENTRY_HEADER_BYTES), startAt, endAt };
}

/** The Redis list key of a run's tab-audio queue. */
export function captureQueueKey(runId: string): string {
  return `${LIVE_CAPTURE_QUEUE_KEY_PREFIX}${runId}`;
}
