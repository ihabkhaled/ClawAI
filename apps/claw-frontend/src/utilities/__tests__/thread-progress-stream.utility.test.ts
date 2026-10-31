import { describe, expect, it } from 'vitest';

import { makeProgress } from '@/components/threads/__tests__/thread-progress.fixture';

import {
  isStaleThreadProgress,
  isThreadProgressStreamRefusal,
  parseThreadProgressStreamMessage,
  threadProgressStreamUrl,
} from '../thread-progress-stream.utility';

describe('thread progress stream utility', () => {
  it('builds the stream url with an encoded id', () => {
    expect(threadProgressStreamUrl('/api/v1', 'a/b')).toBe(
      '/api/v1/thread-publications/a%2Fb/generation-progress/stream',
    );
  });

  it('parses known messages and drops everything else', () => {
    const progress = makeProgress();
    expect(
      parseThreadProgressStreamMessage(JSON.stringify({ type: 'progress', progress })),
    ).toEqual({
      type: 'progress',
      progress,
    });
    expect(parseThreadProgressStreamMessage('{"type":"terminal"}')).toEqual({ type: 'terminal' });
    expect(parseThreadProgressStreamMessage('{"type":"error","code":"X"}')).toEqual({
      type: 'error',
      code: 'X',
    });
    expect(parseThreadProgressStreamMessage('{"type":"error"}')).toEqual({
      type: 'error',
      code: 'UNKNOWN',
    });
    expect(parseThreadProgressStreamMessage('{"type":"progress","progress":{}}')).toBeNull();
    expect(parseThreadProgressStreamMessage('{"type":"nope"}')).toBeNull();
    expect(parseThreadProgressStreamMessage('[]')).toBeNull();
    expect(parseThreadProgressStreamMessage('null')).toBeNull();
    expect(parseThreadProgressStreamMessage('oops')).toBeNull();
  });

  describe('isStaleThreadProgress', () => {
    const base = makeProgress({ updatedAt: '2026-10-13T10:05:00.000Z' });

    it('is never stale against nothing or another job', () => {
      expect(isStaleThreadProgress(undefined, base)).toBe(false);
      expect(
        isStaleThreadProgress(base, { ...base, jobId: 'job-2', updatedAt: '2020-01-01' }),
      ).toBe(false);
    });

    it('is stale when older, fresh when newer', () => {
      expect(isStaleThreadProgress(base, { ...base, updatedAt: '2026-10-13T10:04:00.000Z' })).toBe(
        true,
      );
      expect(isStaleThreadProgress(base, { ...base, updatedAt: '2026-10-13T10:06:00.000Z' })).toBe(
        false,
      );
    });

    it('at the same time, fewer steps are stale and an identical snapshot is not', () => {
      const withStep = { ...base, steps: [...base.steps, { ...base.steps[0]!, seq: 99 }] };
      expect(isStaleThreadProgress(withStep, base)).toBe(true);
      expect(isStaleThreadProgress(base, withStep)).toBe(false);
      expect(isStaleThreadProgress(base, base)).toBe(false);
    });
  });

  it('treats only 403 and 404 as a refusal', () => {
    expect(isThreadProgressStreamRefusal(new Error('SSE connection failed: 404'))).toBe(true);
    expect(isThreadProgressStreamRefusal(new Error('SSE connection failed: 403'))).toBe(true);
    expect(isThreadProgressStreamRefusal(new Error('SSE connection failed: 401'))).toBe(false);
    expect(isThreadProgressStreamRefusal(new Error('SSE connection failed: 503'))).toBe(false);
    expect(isThreadProgressStreamRefusal('x')).toBe(false);
  });
});
