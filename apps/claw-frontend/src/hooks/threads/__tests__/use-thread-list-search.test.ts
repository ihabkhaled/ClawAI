import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useThreadListSearch } from '../use-thread-list-search';

describe('useThreadListSearch', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('commits once, 300 ms after the last keystroke', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useThreadListSearch('', commit));

    act(() => result.current.setValue('lo'));
    act(() => void vi.advanceTimersByTime(200));
    act(() => result.current.setValue('local'));
    act(() => void vi.advanceTimersByTime(299));
    expect(commit).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));

    expect(commit).toHaveBeenCalledTimes(1);
    expect(commit).toHaveBeenCalledWith('local');
    expect(result.current.value).toBe('local');
  });

  it('does not commit the text the address already has', () => {
    const commit = vi.fn();
    renderHook(() => useThreadListSearch('same', commit));
    act(() => void vi.advanceTimersByTime(1000));
    expect(commit).not.toHaveBeenCalled();
  });

  it('clear empties the box and commits at once', () => {
    const commit = vi.fn();
    const { result } = renderHook(() => useThreadListSearch('abc', commit));

    act(() => result.current.clear());

    expect(result.current.value).toBe('');
    expect(commit).toHaveBeenCalledWith('');
    act(() => void vi.advanceTimersByTime(1000));
    expect(commit).toHaveBeenCalledTimes(1);
  });

  it('follows the address when it changes from outside (Back button)', () => {
    const commit = vi.fn();
    const { result, rerender } = renderHook(({ url }) => useThreadListSearch(url, commit), {
      initialProps: { url: 'one' },
    });

    rerender({ url: 'two' });

    expect(result.current.value).toBe('two');
    act(() => void vi.advanceTimersByTime(1000));
    expect(commit).not.toHaveBeenCalled();
  });
});
