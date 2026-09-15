import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { THIRD_PARTY_IDLE_TIMEOUT_MS } from '@/constants/third-party-defer.constants';

import { useIdleDeferred } from '../use-idle-deferred';

describe('useIdleDeferred', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('starts false so nothing third-party renders during hydration', () => {
    vi.stubGlobal('requestIdleCallback', undefined);
    const { result } = renderHook(() => useIdleDeferred());
    expect(result.current).toBe(false);
  });

  it('loads anyway on a browser with no requestIdleCallback', () => {
    // Safari. The timeout is the floor, not the fallback — the tag must never
    // be silently dropped.
    vi.stubGlobal('requestIdleCallback', undefined);
    const { result } = renderHook(() => useIdleDeferred());
    act(() => {
      vi.advanceTimersByTime(THIRD_PARTY_IDLE_TIMEOUT_MS);
    });
    expect(result.current).toBe(true);
  });

  it('loads as soon as the browser reports an idle slot', () => {
    let idleCallback: (() => void) | null = null;
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      idleCallback = callback;
      return 1;
    });
    vi.stubGlobal('cancelIdleCallback', vi.fn());
    const { result } = renderHook(() => useIdleDeferred());
    act(() => {
      idleCallback?.();
    });
    expect(result.current).toBe(true);
  });
});
