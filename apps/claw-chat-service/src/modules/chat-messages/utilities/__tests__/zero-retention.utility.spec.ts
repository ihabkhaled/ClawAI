import { describe, expect, it } from 'vitest';

import { ZERO_RETENTION_KEPT_METADATA_KEYS } from '../../constants/zero-retention.constants';
import {
  isZeroRetentionHeaderOn,
  redactZeroRetentionMetadata,
  zeroRetentionErrorName,
} from '../zero-retention.utility';

describe('isZeroRetentionHeaderOn', () => {
  it('is on only for the exact value the coding agent sends', () => {
    expect(isZeroRetentionHeaderOn('1')).toBe(true);
    expect(isZeroRetentionHeaderOn(' 1 ')).toBe(true);
    expect(isZeroRetentionHeaderOn(['0', '1'])).toBe(true);
  });

  it('is off when absent or any other value', () => {
    expect(isZeroRetentionHeaderOn(undefined)).toBe(false);
    expect(isZeroRetentionHeaderOn('')).toBe(false);
    expect(isZeroRetentionHeaderOn('true')).toBe(false);
    expect(isZeroRetentionHeaderOn('0')).toBe(false);
    expect(isZeroRetentionHeaderOn([])).toBe(false);
  });
});

describe('redactZeroRetentionMetadata', () => {
  it('keeps identifiers and error codes and drops everything that can carry text', () => {
    const redacted = redactZeroRetentionMetadata({
      runtimeV2: { runId: 'run-1', generation: 'gen-1' },
      sourceMessageId: 'msg-1',
      error: true,
      errorCode: 'PROVIDER_REQUEST_FAILED',
      reasoning: 'secret chain of thought',
      narration: [{ kind: 'AI_THINKING' }],
      fileIds: ['file-1'],
    });

    expect(redacted).toEqual({
      runtimeV2: { runId: 'run-1', generation: 'gen-1' },
      sourceMessageId: 'msg-1',
      error: true,
      errorCode: 'PROVIDER_REQUEST_FAILED',
      zeroRetention: true,
    });
    expect(
      Object.keys(redacted).every(
        (key) => key === 'zeroRetention' || ZERO_RETENTION_KEPT_METADATA_KEYS.includes(key),
      ),
    ).toBe(true);
  });

  it('marks rows whose metadata was null, an array or a scalar', () => {
    expect(redactZeroRetentionMetadata(null)).toEqual({ zeroRetention: true });
    expect(redactZeroRetentionMetadata(['x'])).toEqual({ zeroRetention: true });
    expect(redactZeroRetentionMetadata('text')).toEqual({ zeroRetention: true });
    expect(redactZeroRetentionMetadata({ sourceMessageId: null })).toEqual({ zeroRetention: true });
  });
});

describe('zeroRetentionErrorName', () => {
  it('reports the class name only, never the message', () => {
    expect(zeroRetentionErrorName(new TypeError('prompt text leaked here'))).toBe('TypeError');
    expect(zeroRetentionErrorName('prompt text')).toBe('unknown error');
  });
});
