import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useArchiveSelection } from '@/hooks/files/use-archive-selection';

describe('useArchiveSelection', () => {
  it('picking a file inside an archive replaces a whole-archive selection, never both', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectedFileIds }: { selectedFileIds: string[] }) =>
        useArchiveSelection({ selectedFileIds, onChange }),
      { initialProps: { selectedFileIds: ['zip-1'] } },
    );

    act(() => {
      result.current.onToggle('child-1', true, ['zip-1']);
    });

    expect(onChange).toHaveBeenLastCalledWith(['child-1']);
    rerender({ selectedFileIds: ['child-1'] });
    expect(result.current.selectedMemberCount('zip-1')).toBe(1);
  });

  it('picking the whole archive replaces every member already picked from it', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ selectedFileIds }: { selectedFileIds: string[] }) =>
        useArchiveSelection({ selectedFileIds, onChange }),
      { initialProps: { selectedFileIds: ['child-1'] } },
    );

    act(() => {
      result.current.onToggle('child-1', true, ['zip-1']);
    });
    rerender({ selectedFileIds: ['child-1'] });

    act(() => {
      result.current.onToggle('zip-1', true, []);
    });

    expect(onChange).toHaveBeenLastCalledWith(['zip-1']);
  });

  it('isSelected reads directly off the caller-owned selectedFileIds', () => {
    const { result } = renderHook(() =>
      useArchiveSelection({ selectedFileIds: ['a', 'b'], onChange: vi.fn() }),
    );
    expect(result.current.isSelected('a')).toBe(true);
    expect(result.current.isSelected('z')).toBe(false);
  });
});
