import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { COMPOSER_CONTEXT_PACKS_MAX } from '@/constants/composer-context.constants';
import { useComposerContextPacks } from '@/hooks/chat/use-composer-context-packs';

const updateThread = vi.fn();
let thread: { contextPackIds: string[] } | null = { contextPackIds: ['p1'] };

vi.mock('@/hooks/chat/use-composer-thread', () => ({
  useComposerThread: () => thread,
}));
vi.mock('@/hooks/context-packs/use-context-packs', () => ({
  useContextPacks: () => ({
    contextPacks: [
      { id: 'p1', name: 'Trips' },
      { id: 'p2', name: 'ClawAI' },
    ],
    isLoading: false,
  }),
}));
vi.mock('@/hooks/chat/use-update-thread', () => ({
  useUpdateThread: () => ({ updateThread, isPending: false }),
}));

describe('useComposerContextPacks', () => {
  beforeEach(() => {
    updateThread.mockReset();
    thread = { contextPackIds: ['p1'] };
  });

  it('reads the attached packs from the thread', () => {
    const { result } = renderHook(() => useComposerContextPacks('t1'));

    expect(result.current.selectedIds).toEqual(['p1']);
    expect(result.current.selectedCount).toBe(1);
    expect(result.current.packs).toHaveLength(2);
  });

  it('saves a pick on the thread straight away and shows it at once', () => {
    const { result } = renderHook(() => useComposerContextPacks('t1'));

    act(() => result.current.toggle('p2'));

    expect(updateThread).toHaveBeenCalledWith(
      { id: 't1', data: { contextPackIds: ['p1', 'p2'] } },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
    expect(result.current.selectedIds).toEqual(['p1', 'p2']);
  });

  it('un-attaches a pack that is already attached', () => {
    const { result } = renderHook(() => useComposerContextPacks('t1'));

    act(() => result.current.toggle('p1'));

    expect(updateThread).toHaveBeenCalledWith(
      { id: 't1', data: { contextPackIds: [] } },
      expect.anything(),
    );
  });

  it('rolls the display back when the save fails', () => {
    const { result } = renderHook(() => useComposerContextPacks('t1'));
    act(() => result.current.toggle('p2'));

    act(() => {
      const options = updateThread.mock.calls[0]?.[1] as { onError: () => void };
      options.onError();
    });

    expect(result.current.selectedIds).toEqual(['p1']);
  });

  it('refuses a pick past the server cap', () => {
    thread = {
      contextPackIds: Array.from({ length: COMPOSER_CONTEXT_PACKS_MAX }, (_, i) => `x${String(i)}`),
    };
    const { result } = renderHook(() => useComposerContextPacks('t1'));

    act(() => result.current.toggle('p2'));

    expect(result.current.atLimit).toBe(true);
    expect(updateThread).not.toHaveBeenCalled();
  });

  it('treats a thread that has not loaded as nothing attached', () => {
    thread = null;
    const { result } = renderHook(() => useComposerContextPacks('t1'));

    expect(result.current.selectedIds).toEqual([]);
  });
});
