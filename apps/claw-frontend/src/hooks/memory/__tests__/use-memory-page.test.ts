import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MemoryFilterValue, MemoryScope, MemorySource, MemorySensitivity } from '@/enums';

import { useMemoryPage } from '../use-memory-page';

// Capture the filters object handed to useMemories so we can assert that the
// "ALL" sentinel is mapped OUT (never sent to the API as an empty string).
const useMemoriesMock = vi.fn();

vi.mock('../use-memories', () => ({
  useMemories: (filters: unknown) => {
    useMemoriesMock(filters);
    return { memories: [], isLoading: false, isError: false, error: null };
  },
}));
vi.mock('../use-memory-suggestions', () => ({
  useMemorySuggestions: () => ({ suggestions: [], isLoading: false }),
}));
vi.mock('../use-memory-audit', () => ({
  useMemoryAuditAll: () => ({ entries: [], isLoading: false }),
}));
vi.mock('../use-memory-preferences', () => ({
  useMemoryPreferences: () => ({ preferences: null }),
}));
vi.mock('../use-create-memory', () => ({
  useCreateMemory: () => ({ createMemory: vi.fn(), isPending: false }),
}));
vi.mock('../use-update-memory', () => ({
  useUpdateMemory: () => ({ updateMemory: vi.fn(), isPending: false }),
}));
vi.mock('../use-delete-memory', () => ({
  useDeleteMemory: () => ({ deleteMemory: vi.fn(), isPending: false }),
}));
vi.mock('../use-toggle-memory', () => ({
  useToggleMemory: () => ({ toggleMemory: vi.fn(), isPending: false }),
}));
vi.mock('../use-approve-memory-suggestion', () => ({
  useApproveMemorySuggestion: () => ({ mutate: vi.fn(), isPending: false }),
}));
vi.mock('../use-reject-memory-suggestion', () => ({
  useRejectMemorySuggestion: () => ({ mutate: vi.fn(), isPending: false }),
}));

const lastFilters = (): Record<string, unknown> =>
  useMemoriesMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;

describe('useMemoryPage filters', () => {
  beforeEach(() => {
    useMemoriesMock.mockClear();
  });

  it('defaults all four filters to the ALL sentinel', () => {
    const { result } = renderHook(() => useMemoryPage());
    expect(result.current.filterType).toBe(MemoryFilterValue.ALL);
    expect(result.current.filterScope).toBe(MemoryFilterValue.ALL);
    expect(result.current.filterSource).toBe(MemoryFilterValue.ALL);
    expect(result.current.filterSensitivity).toBe(MemoryFilterValue.ALL);
  });

  it('sends NO scope/source/sensitivity/type keys to the API while filters are ALL', () => {
    renderHook(() => useMemoryPage());
    const filters = lastFilters();
    expect(filters).not.toHaveProperty('scope');
    expect(filters).not.toHaveProperty('source');
    expect(filters).not.toHaveProperty('sensitivity');
    expect(filters).not.toHaveProperty('type');
    // critical: never an empty string
    expect(Object.values(filters)).not.toContain('');
  });

  it('includes a real scope once selected, and drops it again when reset to ALL', () => {
    const { result } = renderHook(() => useMemoryPage());

    act(() => result.current.setFilterScope(MemoryScope.WORKSPACE));
    expect(lastFilters()['scope']).toBe(MemoryScope.WORKSPACE);

    act(() => result.current.setFilterScope(MemoryFilterValue.ALL));
    expect(lastFilters()).not.toHaveProperty('scope');
  });

  it('maps source and sensitivity the same way', () => {
    const { result } = renderHook(() => useMemoryPage());

    act(() => result.current.setFilterSource(MemorySource.AI_EXTRACTED));
    act(() => result.current.setFilterSensitivity(MemorySensitivity.SENSITIVE));
    expect(lastFilters()['source']).toBe(MemorySource.AI_EXTRACTED);
    expect(lastFilters()['sensitivity']).toBe(MemorySensitivity.SENSITIVE);

    act(() => result.current.setFilterSource(MemoryFilterValue.ALL));
    act(() => result.current.setFilterSensitivity(MemoryFilterValue.ALL));
    expect(lastFilters()).not.toHaveProperty('source');
    expect(lastFilters()).not.toHaveProperty('sensitivity');
  });
});
