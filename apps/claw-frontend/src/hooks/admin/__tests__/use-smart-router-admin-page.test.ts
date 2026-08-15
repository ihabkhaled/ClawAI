import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSmartRouterAdminPage } from '@/hooks/admin/use-smart-router-admin-page';

const mockList = vi.fn();
const mockGetById = vi.fn();
const mockUpdateEntries = vi.fn();
const mockCreateDraft = vi.fn();
const mockPublish = vi.fn();
const mockSetEnabled = vi.fn();

vi.mock('@/repositories/admin/smart-router-admin.repository', () => ({
  smartRouterAdminRepository: {
    list: (...args: unknown[]) => mockList(...args),
    getById: (...args: unknown[]) => mockGetById(...args),
    updateEntries: (...args: unknown[]) => mockUpdateEntries(...args),
    createDraft: (...args: unknown[]) => mockCreateDraft(...args),
    publish: (...args: unknown[]) => mockPublish(...args),
    setEnabled: (...args: unknown[]) => mockSetEnabled(...args),
  },
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

function makeWrapper(): (props: { children: ReactNode }) => ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

const draftEntry = {
  id: 'rev-draft',
  revision: 2,
  status: 'DRAFT',
  entries: [
    { id: 'e1', order: 1, modelAlias: 'claude', provider: 'ANTHROPIC' },
    { id: 'e2', order: 2, modelAlias: 'gpt', provider: 'OPENAI' },
  ],
};

describe('useSmartRouterAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockImplementation(({ status }: { status?: string }) => {
      if (status === 'PUBLISHED') {
        return Promise.resolve({
          data: [{ id: 'rev-published', revision: 1, status: 'PUBLISHED' }],
          meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
        });
      }
      if (status === 'DRAFT') {
        return Promise.resolve({
          data: [{ id: 'rev-draft', revision: 2, status: 'DRAFT' }],
          meta: { total: 1, page: 1, limit: 1, totalPages: 1 },
        });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } });
    });
    mockGetById.mockImplementation((id: string) =>
      Promise.resolve(id === 'rev-draft' ? draftEntry : { id, revision: 1, entries: [] }),
    );
  });

  it('resolves the Chain tab target to the draft when one exists', async () => {
    const { result } = renderHook(() => useSmartRouterAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chain.configuration?.id).toBe('rev-draft'));
    expect(result.current.chain.isDraft).toBe(true);
  });

  it('removing an entry PATCHes the remaining entries for the draft id', async () => {
    mockUpdateEntries.mockResolvedValue(draftEntry);
    const { result } = renderHook(() => useSmartRouterAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chain.configuration?.id).toBe('rev-draft'));

    act(() => result.current.chain.onRemove('e1'));

    await waitFor(() =>
      expect(mockUpdateEntries).toHaveBeenCalledWith(
        'rev-draft',
        expect.objectContaining({
          entries: [expect.objectContaining({ modelAlias: 'gpt' })],
        }),
      ),
    );
  });

  it('selecting a revision switches to the revision-detail tab', async () => {
    const { result } = renderHook(() => useSmartRouterAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.activeTab).toBe('overview'));

    act(() => result.current.revisions.onSelectRevision('rev-draft'));

    expect(result.current.activeTab).toBe('revision-detail');
    expect(result.current.revisions.selectedRevisionId).toBe('rev-draft');
  });

  it('toggling enabled calls setEnabled for the global scope', async () => {
    mockSetEnabled.mockResolvedValue({ id: 'rev-published', enabled: false });
    const { result } = renderHook(() => useSmartRouterAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.overview.published?.id).toBe('rev-published'));

    act(() => result.current.overview.onToggleEnabled(false));

    await waitFor(() => expect(mockSetEnabled).toHaveBeenCalledWith('GLOBAL', false));
  });

  it('compare diff is null until both revisions are selected', async () => {
    const { result } = renderHook(() => useSmartRouterAdminPage(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.chain.configuration).not.toBeNull());
    expect(result.current.compare.diff).toBeNull();

    act(() => {
      result.current.compare.onFromChange('rev-published');
      result.current.compare.onToChange('rev-draft');
    });

    await waitFor(() => expect(result.current.compare.diff).not.toBeNull());
    expect(result.current.compare.diff?.entries.length).toBeGreaterThan(0);
  });
});
