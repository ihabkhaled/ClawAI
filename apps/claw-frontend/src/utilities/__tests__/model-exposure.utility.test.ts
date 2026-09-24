import { describe, expect, it } from 'vitest';

import { MODEL_EXPOSURE_BATCH_SIZE } from '@/constants';

import { chunkModelKeys } from '../model-exposure.utility';

describe('chunkModelKeys', () => {
  it('returns nothing for an empty selection', () => {
    expect(chunkModelKeys([])).toEqual([]);
  });

  it('returns a single batch when the selection fits under the cap', () => {
    const keys = Array.from({ length: 5 }, (_, i) => `model-${String(i)}`);

    expect(chunkModelKeys(keys)).toEqual([keys]);
  });

  it('splits a selection larger than the cap into batches at the boundary', () => {
    const keys = Array.from(
      { length: MODEL_EXPOSURE_BATCH_SIZE + 1 },
      (_, i) => `model-${String(i)}`,
    );

    const batches = chunkModelKeys(keys);

    expect(batches).toHaveLength(2);
    expect(batches[0]).toHaveLength(MODEL_EXPOSURE_BATCH_SIZE);
    expect(batches[1]).toEqual(['model-200']);
  });

  it('handles the exact reported failure: 447 selected models', () => {
    const keys = Array.from({ length: 447 }, (_, i) => `openrouter/model-${String(i)}`);

    const batches = chunkModelKeys(keys);

    expect(batches.map((b) => b.length)).toEqual([200, 200, 47]);
    expect(batches.flat()).toEqual(keys);
  });
});
