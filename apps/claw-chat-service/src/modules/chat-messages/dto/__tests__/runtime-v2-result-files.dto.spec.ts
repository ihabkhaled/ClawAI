import { describe, expect, it } from 'vitest';

import { RUNTIME_V2_MAX_RESULT_FILE_IDS } from '../../constants/runtime-v2-result-files.constants';
import { toolResultSchema } from '../runtime-v2.dto';

// F030: the optional image files a Runtime V2 tool result may name.

const id = 'runtime_invocation_01';
const hash = `sha256:${'b'.repeat(64)}`;
const result = {
  schemaVersion: '2.0',
  invocationId: id,
  status: 'succeeded',
  structured: { observed: true },
  receipt: {
    schemaVersion: '2.0',
    receiptId: 'runtime_receipt_00001',
    invocationId: id,
    argumentHash: hash,
    resultHash: hash,
    startedAt: '2026-09-30T10:00:00.000Z',
    completedAt: '2026-09-30T10:00:01.000Z',
    durationMs: 1_000,
    outputBytes: 12,
    truncated: false,
    redactionApplied: false,
  },
  continuation: { action: 'final' },
};

describe('toolResultSchema fileIds', () => {
  it('stays valid without fileIds', () => {
    expect(toolResultSchema.safeParse(result).success).toBe(true);
  });

  it('accepts up to the cap of distinct ids', () => {
    const fileIds = Array.from(
      { length: RUNTIME_V2_MAX_RESULT_FILE_IDS },
      (_, i) => `file-${String(i)}`,
    );
    expect(toolResultSchema.safeParse({ ...result, fileIds }).success).toBe(true);
  });

  it('rejects more than the cap', () => {
    const fileIds = Array.from(
      { length: RUNTIME_V2_MAX_RESULT_FILE_IDS + 1 },
      (_, i) => `file-${String(i)}`,
    );
    expect(toolResultSchema.safeParse({ ...result, fileIds }).success).toBe(false);
  });

  it('rejects an empty list, an empty id, an over-long id and duplicates', () => {
    for (const fileIds of [[], [''], ['x'.repeat(201)], ['file-1', 'file-1']]) {
      expect(toolResultSchema.safeParse({ ...result, fileIds }).success).toBe(false);
    }
  });
});
