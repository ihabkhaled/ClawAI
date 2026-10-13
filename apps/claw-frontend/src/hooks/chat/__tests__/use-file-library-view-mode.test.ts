import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import { useFileLibraryViewMode } from '@/hooks/chat/use-file-library-view-mode';

describe('useFileLibraryViewMode', () => {
  afterEach(() => window.localStorage.clear());

  it('starts on grid, switches to list and remembers it for the next mount', () => {
    const { result, unmount } = renderHook(() => useFileLibraryViewMode());
    expect(result.current.viewMode).toBe(FileLibraryViewMode.Grid);

    act(() => result.current.setViewMode(FileLibraryViewMode.List));
    expect(result.current.viewMode).toBe(FileLibraryViewMode.List);
    unmount();

    const next = renderHook(() => useFileLibraryViewMode());
    expect(next.result.current.viewMode).toBe(FileLibraryViewMode.List);
  });
});
