import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PromptLibraryView } from '@/enums/prompt-library.enum';
import { usePromptLibraryController } from '@/hooks/prompt-library/use-prompt-library-controller';
import type { PromptTemplate } from '@/types';

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockMarkUsed = vi.fn();

vi.mock('@/repositories/prompt-templates/prompt-templates.repository', () => ({
  promptTemplatesRepository: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    markUsed: (...args: unknown[]) => mockMarkUsed(...args),
  },
}));
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utilities/toast.utility', () => ({
  showToast: { success: vi.fn(), apiError: vi.fn() },
}));

const PLAIN: PromptTemplate = {
  id: 'p1',
  title: 'Plain',
  body: 'Summarise this',
  tags: ['work'],
  isFavorite: false,
  usageCount: 0,
  lastUsedAt: null,
  variables: [],
};
const WITH_VARS: PromptTemplate = {
  ...PLAIN,
  id: 'p2',
  title: 'Vars',
  body: 'Translate to {{lang}}',
  tags: ['lang'],
  variables: ['lang'],
};

function setup(onInsert = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }): ReactElement =>
    React.createElement(QueryClientProvider, { client }, children);
  const hook = renderHook(() => usePromptLibraryController({ onInsert, disabled: false }), {
    wrapper,
  });
  return { ...hook, onInsert, invalidate };
}

describe('usePromptLibraryController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: [PLAIN, WITH_VARS], nextCursor: null });
    mockMarkUsed.mockResolvedValue(PLAIN);
    mockCreate.mockResolvedValue(PLAIN);
    mockUpdate.mockResolvedValue(PLAIN);
    mockRemove.mockResolvedValue(undefined);
  });

  it('does not fetch until the dialog opens, then lists templates and tags', async () => {
    const { result } = setup();
    expect(mockList).not.toHaveBeenCalled();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));
    expect(result.current.availableTags).toEqual(['lang', 'work']);
  });

  it('inserts a template without variables directly and marks it used', async () => {
    const { result, onInsert } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));
    act(() => result.current.onChoose(PLAIN));
    expect(onInsert).toHaveBeenCalledWith('Summarise this');
    await waitFor(() => expect(mockMarkUsed.mock.calls[0]?.[0]).toBe('p1'));
    expect(result.current.isOpen).toBe(false);
  });

  it('goes to the fill step for variables, then inserts the filled text', async () => {
    const { result, onInsert } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));
    act(() => result.current.onChoose(WITH_VARS));
    expect(result.current.view).toBe(PromptLibraryView.Fill);
    expect(onInsert).not.toHaveBeenCalled();
    act(() => result.current.onSubmitFill({ lang: 'French' }));
    expect(onInsert).toHaveBeenCalledWith('Translate to French');
    await waitFor(() => expect(mockMarkUsed.mock.calls[0]?.[0]).toBe('p2'));
  });

  it('creates a template with parsed tags and invalidates the list key prefix', async () => {
    const { result, invalidate } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));
    act(() => result.current.onStartCreate());
    expect(result.current.view).toBe(PromptLibraryView.Form);
    act(() => result.current.onSave({ title: ' T ', body: 'B', tags: 'A, a, b' }));
    await waitFor(() =>
      expect(mockCreate.mock.calls[0]?.[0]).toEqual({ title: 'T', body: 'B', tags: ['a', 'b'] }),
    );
    await waitFor(() => expect(result.current.view).toBe(PromptLibraryView.List));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['promptTemplates'] });
  });

  it('toggles favourite and confirms delete in-dialog', async () => {
    const { result } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.templates).toHaveLength(2));
    act(() => result.current.onToggleFavorite(PLAIN));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith('p1', { isFavorite: true }));
    act(() => result.current.onRequestDelete('p1'));
    expect(result.current.pendingDeleteId).toBe('p1');
    act(() => result.current.onConfirmDelete('p1'));
    await waitFor(() => expect(mockRemove.mock.calls[0]?.[0]).toBe('p1'));
    await waitFor(() => expect(result.current.pendingDeleteId).toBeNull());
  });

  it('keeps every known tag chip after a tag filter narrows the list', async () => {
    const { result } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.availableTags).toEqual(['lang', 'work']));
    mockList.mockResolvedValue({ items: [PLAIN], nextCursor: null });
    act(() => result.current.onFiltersChange({ q: '', tag: 'work', favoriteOnly: false }));
    await waitFor(() => expect(result.current.templates).toHaveLength(1));
    expect(result.current.availableTags).toEqual(['lang', 'work']);
  });

  it('flags the near-limit state from 190 saved prompts', async () => {
    const many = Array.from({ length: 190 }, (_unused, index) => ({ ...PLAIN, id: `p${index}` }));
    mockList.mockResolvedValue({ items: many, nextCursor: null });
    const { result } = setup();
    act(() => result.current.onOpenChange(true));
    await waitFor(() => expect(result.current.isNearLimit).toBe(true));
    expect(result.current.savedCount).toBe(190);
  });
});
