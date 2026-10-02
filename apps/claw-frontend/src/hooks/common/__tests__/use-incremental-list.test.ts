import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useIncrementalList } from '../use-incremental-list';

const items = Array.from({ length: 120 }, (_, i) => i);

describe('useIncrementalList', () => {
  it('shows one page, then more on demand', () => {
    const { result } = renderHook(() => useIncrementalList(items, 'k', 50));

    expect(result.current.shownCount).toBe(50);
    expect(result.current.totalCount).toBe(120);
    expect(result.current.hasMore).toBe(true);

    act(() => result.current.showMore());
    act(() => result.current.showMore());

    expect(result.current.shownCount).toBe(120);
    expect(result.current.hasMore).toBe(false);
  });

  it('returns to the first page when the reset key changes', () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: string }) => useIncrementalList(items, key, 50),
      { initialProps: { key: 'a' } },
    );
    act(() => result.current.showMore());
    expect(result.current.shownCount).toBe(100);

    rerender({ key: 'b' });

    expect(result.current.shownCount).toBe(50);
  });
});
