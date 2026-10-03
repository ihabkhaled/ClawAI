import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { COMPOSER_CONTEXT_PACKS_MAX } from '@/constants/composer-context.constants';
import { useDraftContextPacks } from '@/hooks/chat/use-draft-context-packs';

vi.mock('@/hooks/context-packs/use-context-packs', () => ({
  useContextPacks: () => ({
    contextPacks: [
      { id: 'p1', name: 'Trips' },
      { id: 'p2', name: 'ClawAI' },
    ],
    isLoading: false,
  }),
}));

describe('useDraftContextPacks', () => {
  it('reports the held selection and the packs on offer', () => {
    const { result } = renderHook(() =>
      useDraftContextPacks({ selectedIds: ['p1'], onChange: vi.fn() }),
    );
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.packs).toHaveLength(2);
    expect(result.current.isSaving).toBe(false);
  });

  it('hands the toggled selection back to the caller, nothing is saved', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useDraftContextPacks({ selectedIds: ['p1'], onChange }));
    act(() => result.current.toggle('p2'));
    expect(onChange).toHaveBeenCalledWith(['p1', 'p2']);
    act(() => result.current.toggle('p1'));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('stops at the pack limit', () => {
    const full = Array.from({ length: COMPOSER_CONTEXT_PACKS_MAX }, (_, i) => `x${String(i)}`);
    const onChange = vi.fn();
    const { result } = renderHook(() => useDraftContextPacks({ selectedIds: full, onChange }));
    expect(result.current.atLimit).toBe(true);
    act(() => result.current.toggle('p2'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
