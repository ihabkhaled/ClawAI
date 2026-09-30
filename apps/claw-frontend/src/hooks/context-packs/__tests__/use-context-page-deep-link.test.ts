import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useContextPage } from '@/hooks/context-packs/use-context-page';

let mockParams = new URLSearchParams();

vi.mock('next/navigation', () => ({ useSearchParams: () => mockParams }));
vi.mock('../use-context-packs', () => ({
  useContextPacks: () => ({ contextPacks: [], isLoading: false, isError: false, error: null }),
}));
vi.mock('../use-create-context-pack', () => ({
  useCreateContextPack: () => ({ createContextPack: vi.fn(), isPending: false }),
}));
vi.mock('../use-context-pack-detail', () => ({
  useContextPackDetail: () => ({
    contextPack: null,
    isLoading: false,
    addItem: vi.fn(),
    removeItem: vi.fn(),
    isAddingItem: false,
    isRemovingItem: false,
  }),
}));

describe('useContextPage deep link (ADR-134)', () => {
  it("opens the pack named by /context?packId=… — the chat's saved card", () => {
    mockParams = new URLSearchParams('packId=pack-1');

    const { result } = renderHook(() => useContextPage());

    expect(result.current.selectedPackId).toBe('pack-1');
  });

  it('opens the list when there is no link', () => {
    mockParams = new URLSearchParams();

    const { result } = renderHook(() => useContextPage());

    expect(result.current.selectedPackId).toBeNull();
  });
});
