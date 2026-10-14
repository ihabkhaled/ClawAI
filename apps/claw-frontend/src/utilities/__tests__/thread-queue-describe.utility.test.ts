import { describe, expect, it } from 'vitest';

import { describeThreadQueue } from '@/utilities/thread-generation-progress.utility';

describe('describeThreadQueue', () => {
  it('says next when nobody is ahead and counts the jobs ahead otherwise', () => {
    expect(describeThreadQueue({ state: 'WAITING_FOR_WORKER', ahead: 0, retryAt: null })).toEqual({
      key: 'chat.threadFixQueueNext',
    });
    expect(describeThreadQueue({ state: 'WAITING_FOR_WORKER', ahead: 7, retryAt: null })).toEqual({
      key: 'chat.threadFixQueueAhead',
      params: { count: 7 },
    });
  });

  it('has no line for a back-off, a missing queue or an older service', () => {
    expect(
      describeThreadQueue({ state: 'BACKOFF', ahead: 0, retryAt: '2026-10-14T12:00:00.000Z' }),
    ).toBeNull();
    expect(describeThreadQueue(null)).toBeNull();
    expect(describeThreadQueue(undefined)).toBeNull();
  });
});
