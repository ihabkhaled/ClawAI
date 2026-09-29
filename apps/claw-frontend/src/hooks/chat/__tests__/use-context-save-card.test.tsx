import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useContextSaveCard } from '@/hooks/chat/use-context-save-card';
import { useMemoryDeepLink } from '@/hooks/memory/use-memory-deep-link';

const mockChoose = vi.fn();
const mockGetMemory = vi.fn();
let mockParams = new URLSearchParams();

vi.mock('@/repositories/chat/chat.repository', () => ({
  chatRepository: { chooseContextSavePack: (...args: unknown[]) => mockChoose(...args) },
}));
vi.mock('@/repositories/memory/memory.repository', () => ({
  memoryRepository: { getMemory: (...args: unknown[]) => mockGetMemory(...args) },
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => mockParams }));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utilities', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, showToast: { success: vi.fn(), apiError: vi.fn() } };
});

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return createElement(QueryClientProvider, { client }, children);
}

describe('useContextSaveCard (ADR-133)', () => {
  it('sends the picked pack for this answer', async () => {
    mockChoose.mockResolvedValue({ status: 'SAVED' });
    const { result } = renderHook(() => useContextSaveCard('a-1', 't-1'), { wrapper });

    act(() => result.current.choosePack('p1'));

    await waitFor(() => expect(mockChoose).toHaveBeenCalledWith('a-1', { packId: 'p1' }));
  });

  it('asks for a new pack', async () => {
    mockChoose.mockResolvedValue({ status: 'SAVED' });
    const { result } = renderHook(() => useContextSaveCard('a-1', 't-1'), { wrapper });

    act(() => result.current.chooseNewPack());

    await waitFor(() => expect(mockChoose).toHaveBeenCalledWith('a-1', { newPack: true }));
  });
});

describe('useMemoryDeepLink (ADR-133)', () => {
  it('opens the linked memory in the editor once', async () => {
    mockParams = new URLSearchParams('memoryId=mem-1');
    mockGetMemory.mockResolvedValue({ id: 'mem-1' });
    const onOpen = vi.fn();

    const { rerender } = renderHook(() => useMemoryDeepLink(onOpen), { wrapper });
    await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ id: 'mem-1' }));
    rerender();

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(mockGetMemory).toHaveBeenCalledWith('mem-1');
  });

  it('does nothing without a memory link', () => {
    mockParams = new URLSearchParams();
    mockGetMemory.mockReset();

    renderHook(() => useMemoryDeepLink(vi.fn()), { wrapper });

    expect(mockGetMemory).not.toHaveBeenCalled();
  });
});
