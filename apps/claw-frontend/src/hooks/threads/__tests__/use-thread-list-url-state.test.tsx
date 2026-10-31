import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadListNavigateMode } from '@/enums/thread-list-navigate-mode.enum';
import { ThreadListStatus } from '@/enums/thread-list-status.enum';

import { useThreadListUrlState } from '../use-thread-list-url-state';

const push = vi.fn();
const replace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => '/threads',
  useSearchParams: () => new URLSearchParams(search),
}));

describe('useThreadListUrlState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    search = '';
  });

  it('reads the address as state', () => {
    search = 'q=ai&status=READY&page=2';
    const { result } = renderHook(() => useThreadListUrlState());
    expect(result.current.state).toEqual({ q: 'ai', status: ThreadListStatus.READY, page: 2 });
  });

  it('push adds a history entry, replace does not', () => {
    const { result } = renderHook(() => useThreadListUrlState());
    const next = { q: 'x', status: ThreadListStatus.FAILED, page: 2 };

    act(() => result.current.navigate(next, ThreadListNavigateMode.PUSH));
    act(() => result.current.navigate({ ...next, page: 1 }, ThreadListNavigateMode.REPLACE));

    expect(push).toHaveBeenCalledWith('/threads?q=x&status=FAILED&page=2', { scroll: false });
    expect(replace).toHaveBeenCalledWith('/threads?q=x&status=FAILED', { scroll: false });
  });

  it('goes to the bare path for the default state', () => {
    const { result } = renderHook(() => useThreadListUrlState());
    act(() =>
      result.current.navigate(
        { q: '', status: ThreadListStatus.ALL, page: 1 },
        ThreadListNavigateMode.PUSH,
      ),
    );
    expect(push).toHaveBeenCalledWith('/threads', { scroll: false });
  });
});
