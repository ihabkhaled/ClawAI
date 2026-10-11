import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SEARCH_DEBOUNCE_MS } from '@/constants/observability-explorer.constants';
import { useListControls } from '@/hooks/observability/use-list-controls';

describe('useListControls', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces the search so typing fires one query when it pauses', () => {
    const { result } = renderHook(() => useListControls('cost'));
    act(() => {
      result.current.setSearchDraft('ja');
    });
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 50);
      result.current.setSearchDraft(' jane ');
    });
    expect(result.current.search).toBe('');
    act(() => {
      vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);
    });
    expect(result.current.search).toBe('jane');
    expect(result.current.searchDraft).toBe(' jane ');
  });

  it('toggles the order on the active column and starts descending on a new one', () => {
    const { result } = renderHook(() => useListControls('cost', 'desc'));
    act(() => {
      result.current.toggleSort('cost');
    });
    expect(result.current.order).toBe('asc');
    act(() => {
      result.current.toggleSort('tokens');
    });
    expect(result.current.sort).toBe('tokens');
    expect(result.current.order).toBe('desc');
  });
});
