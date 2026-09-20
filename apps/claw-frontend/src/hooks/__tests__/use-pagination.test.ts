import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_PAGE_SIZE } from '@/constants/pagination.constants';
import { usePagination } from '@/hooks/use-pagination';

describe('usePagination', () => {
  it('starts on page 1 at the shared default size', () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(DEFAULT_PAGE_SIZE);
  });

  it('moves to a page', () => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.goToPage(7);
    });
    expect(result.current.page).toBe(7);
  });

  it('returns to page 1 when the page size changes', () => {
    // Page 7 of 40 at 10 rows is not page 7 of 8 at 50 rows. Keeping the
    // number would move the reader somewhere they did not ask to be, and on a
    // short list it lands them past the end on an empty page.
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.goToPage(7);
    });
    act(() => {
      result.current.setPageSize(50);
    });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });

  it.each([0, -4, Number.NaN])('clamps %s up to page 1', (value) => {
    const { result } = renderHook(() => usePagination());
    act(() => {
      result.current.goToPage(value);
    });
    expect(result.current.page).toBe(1);
  });

  it('resets to page 1 without changing the size, for a filter change', () => {
    const { result } = renderHook(() => usePagination({ initialPageSize: 50 }));
    act(() => {
      result.current.goToPage(4);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.page).toBe(1);
    expect(result.current.pageSize).toBe(50);
  });

  it('reports every change, including the automatic reset', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePagination({ onChange }));
    act(() => {
      result.current.goToPage(3);
    });
    act(() => {
      result.current.setPageSize(100);
    });
    expect(onChange).toHaveBeenNthCalledWith(1, 3, DEFAULT_PAGE_SIZE);
    expect(onChange).toHaveBeenNthCalledWith(2, 1, 100);
  });
});
