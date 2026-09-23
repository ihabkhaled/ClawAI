import { describe, expect, it } from 'vitest';

import {
  computeBackoffMs,
  computeChunkCount,
  computeChunkRange,
  computeUploadProgress,
  formatUploadDuration,
  formatUploadSpeed,
  shouldChunkUpload,
} from '@/utilities/chunked-upload.utility';

describe('shouldChunkUpload', () => {
  it('chunks a file above the threshold and single-shots one at or below it', () => {
    expect(shouldChunkUpload(5_000_000, 4_000_000)).toBe(true);
    expect(shouldChunkUpload(4_000_000, 4_000_000)).toBe(false);
    expect(shouldChunkUpload(100, 4_000_000)).toBe(false);
  });
});

describe('computeChunkCount / computeChunkRange', () => {
  it('splits a file evenly and covers every byte exactly once', () => {
    const sizeBytes = 10_000_000;
    const chunkBytes = 2_000_000;
    const totalChunks = computeChunkCount(sizeBytes, chunkBytes);
    expect(totalChunks).toBe(5);

    let coveredBytes = 0;
    for (let index = 0; index < totalChunks; index += 1) {
      const { start, end } = computeChunkRange(index, sizeBytes, chunkBytes);
      expect(start).toBe(coveredBytes);
      coveredBytes = end;
    }
    expect(coveredBytes).toBe(sizeBytes);
  });

  it('gives an uneven remainder its own shorter last chunk', () => {
    const totalChunks = computeChunkCount(10_000_001, 2_000_000);
    expect(totalChunks).toBe(6);
    const last = computeChunkRange(5, 10_000_001, 2_000_000);
    expect(last.end - last.start).toBe(1);
  });

  it('a zero-byte file still gets exactly one chunk', () => {
    expect(computeChunkCount(0, 2_000_000)).toBe(1);
  });
});

describe('computeBackoffMs', () => {
  it('doubles per attempt and is capped', () => {
    expect(computeBackoffMs(1, 500, 8000)).toBe(500);
    expect(computeBackoffMs(2, 500, 8000)).toBe(1000);
    expect(computeBackoffMs(3, 500, 8000)).toBe(2000);
    expect(computeBackoffMs(10, 500, 8000)).toBe(8000);
  });
});

describe('computeUploadProgress', () => {
  it('computes percent, speed, and ETA from raw byte/time counters', () => {
    const snapshot = computeUploadProgress({
      bytesUploaded: 5_000_000,
      totalBytes: 10_000_000,
      elapsedMs: 5000,
    });
    expect(snapshot.percent).toBe(50);
    expect(snapshot.bytesPerSecond).toBeCloseTo(1_000_000, 0);
    expect(snapshot.etaSeconds).toBeCloseTo(5, 0);
  });

  it('reports a null ETA before any time has elapsed — nothing to estimate from yet', () => {
    const snapshot = computeUploadProgress({ bytesUploaded: 0, totalBytes: 1000, elapsedMs: 0 });
    expect(snapshot.etaSeconds).toBeNull();
    expect(snapshot.percent).toBe(0);
  });

  it('clamps percent at 100 and never reports negative remaining bytes', () => {
    const snapshot = computeUploadProgress({
      bytesUploaded: 12_000_000,
      totalBytes: 10_000_000,
      elapsedMs: 1000,
    });
    expect(snapshot.percent).toBe(100);
    expect(snapshot.bytesUploaded).toBe(10_000_000);
  });
});

describe('formatUploadSpeed / formatUploadDuration', () => {
  it('formats speed in B/s, KB/s, MB/s by magnitude', () => {
    expect(formatUploadSpeed(500)).toBe('500 B/s');
    expect(formatUploadSpeed(2048)).toBe('2 KB/s');
    expect(formatUploadSpeed(5 * 1024 * 1024)).toBe('5.0 MB/s');
  });

  it('formats a duration as m:ss', () => {
    expect(formatUploadDuration(5)).toBe('0:05');
    expect(formatUploadDuration(65)).toBe('1:05');
    expect(formatUploadDuration(0)).toBe('0:00');
  });
});
