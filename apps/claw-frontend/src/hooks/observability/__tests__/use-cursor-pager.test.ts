import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCursorPager } from '@/hooks/observability/use-cursor-pager';

describe('useCursorPager', () => {
  it('starts on page 1 with no cursor and nothing before it', () => {
    const { result } = renderHook(() => useCursorPager('a'));
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.pageNumber).toBe(1);
    expect(result.current.hasPrevious).toBe(false);
  });

  it('walks forward and back through cursors', () => {
    const { result } = renderHook(() => useCursorPager('a'));
    act(() => {
      result.current.goNext('c2');
    });
    act(() => {
      result.current.goNext('c3');
    });
    expect(result.current.cursor).toBe('c3');
    expect(result.current.pageNumber).toBe(3);
    act(() => {
      result.current.goPrevious();
    });
    expect(result.current.cursor).toBe('c2');
    expect(result.current.hasPrevious).toBe(true);
  });

  it('ignores a null next cursor (last page)', () => {
    const { result } = renderHook(() => useCursorPager('a'));
    act(() => {
      result.current.goNext(null);
    });
    expect(result.current.pageNumber).toBe(1);
  });

  it('returns to page 1 in the same render when the sort or search context changes', () => {
    const { result, rerender } = renderHook(({ key }) => useCursorPager(key), {
      initialProps: { key: 'a' },
    });
    act(() => {
      result.current.goNext('c2');
    });
    expect(result.current.cursor).toBe('c2');
    rerender({ key: 'b' });
    expect(result.current.cursor).toBeUndefined();
    expect(result.current.pageNumber).toBe(1);
  });
});
