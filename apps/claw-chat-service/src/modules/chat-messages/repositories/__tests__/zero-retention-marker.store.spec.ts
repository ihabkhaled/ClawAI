import { describe, expect, it, vi } from 'vitest';

import {
  ZERO_RETENTION_MARKER_TTL_SECONDS,
  ZERO_RETENTION_RUN_KEY_PREFIX,
  ZERO_RETENTION_TURN_KEY_PREFIX,
} from '../../constants/zero-retention.constants';
import type { ZeroRetentionRedisPort } from '../../types/zero-retention.types';
import { ZeroRetentionMarkerStore } from '../zero-retention-marker.store';

function build(): {
  store: ZeroRetentionMarkerStore;
  values: Map<string, string>;
  set: ReturnType<typeof vi.fn<ZeroRetentionRedisPort['set']>>;
} {
  const values = new Map<string, string>();
  const set = vi.fn<ZeroRetentionRedisPort['set']>(async (key, value) => {
    values.set(key, value);
  });
  const redis: ZeroRetentionRedisPort = {
    get: async (key) => values.get(key) ?? null,
    set,
  };
  return { store: new ZeroRetentionMarkerStore(redis), values, set };
}

describe('ZeroRetentionMarkerStore', () => {
  it('marks a chat turn with a TTL and a constant value, never content', async () => {
    const { store, set } = build();

    await store.markTurn('msg-1');
    expect(set).toHaveBeenCalledWith(
      `${ZERO_RETENTION_TURN_KEY_PREFIX}msg-1`,
      '1',
      ZERO_RETENTION_MARKER_TTL_SECONDS,
    );
    await expect(store.isTurnMarked('msg-1')).resolves.toBe(true);
    await expect(store.isTurnMarked('msg-2')).resolves.toBe(false);
  });

  it('keeps run marks apart from turn marks', async () => {
    const { store, set } = build();

    await store.markRun('run-1');
    expect(set).toHaveBeenCalledWith(
      `${ZERO_RETENTION_RUN_KEY_PREFIX}run-1`,
      '1',
      ZERO_RETENTION_MARKER_TTL_SECONDS,
    );
    await expect(store.isRunMarked('run-1')).resolves.toBe(true);
    await expect(store.isTurnMarked('run-1')).resolves.toBe(false);
  });
});
