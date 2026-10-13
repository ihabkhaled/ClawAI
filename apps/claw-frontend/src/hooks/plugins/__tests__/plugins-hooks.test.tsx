import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { pluginsRepository } from '@/repositories/plugins/plugins.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import { ApiClientError } from '@/services/shared/api-client';

import { usePluginCatalog } from '../use-plugin-catalog';
import { usePluginDetail } from '../use-plugin-detail';
import { usePluginsPage } from '../use-plugins-page';
import { usePluginsUrl } from '../use-plugins-url';

const navigation = vi.hoisted(() => ({
  locale: 'en',
  search: '',
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  usePathname: () => '/plugins',
  useRouter: () => ({ replace: navigation.replace }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: navigation.locale, dir: 'ltr' }),
}));
vi.mock('@/repositories/plugins/plugins.repository', () => ({
  pluginsRepository: { listCatalog: vi.fn(), getCatalogEntry: vi.fn() },
}));

const listCatalog = vi.mocked(pluginsRepository.listCatalog);
const getCatalogEntry = vi.mocked(pluginsRepository.getCatalogEntry);

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const ITEM = {
  slug: 'web-fetch',
  name: 'Web fetch',
  summary: 's',
  publisher: 'ClawAI',
  category: 'search',
  iconKey: 'globe',
  source: 'FIRST_PARTY',
  version: '1.0.0',
  toolCount: 1,
  maxRisk: 'READ',
  installCount: 0,
  installed: false,
} as never;

describe('usePluginsUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.search = '';
  });

  it('reads the filters from the URL', () => {
    navigation.search = 'q=fetch&category=search';
    const { result } = renderHook(() => usePluginsUrl());
    expect(result.current.filters).toEqual({ q: 'fetch', category: 'search' });
  });

  it('replaces the URL with the new category and drops it when cleared', () => {
    navigation.search = 'q=fetch';
    const { result } = renderHook(() => usePluginsUrl());
    act(() => result.current.setCategory('dev'));
    expect(navigation.replace).toHaveBeenLastCalledWith('/plugins?q=fetch&category=dev', {
      scroll: false,
    });
    act(() => result.current.clearFilters());
    expect(navigation.replace).toHaveBeenLastCalledWith('/plugins', { scroll: false });
  });

  it('writes the search text', () => {
    const { result } = renderHook(() => usePluginsUrl());
    act(() => result.current.setQuery('abc'));
    expect(navigation.replace).toHaveBeenLastCalledWith('/plugins?q=abc', { scroll: false });
  });
});

describe('usePluginCatalog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('omits empty filters and follows the cursor', async () => {
    listCatalog
      .mockResolvedValueOnce({ items: [ITEM], nextCursor: 'c2' })
      .mockResolvedValueOnce({ items: [], nextCursor: null });
    const { result } = renderHook(() => usePluginCatalog({ q: '', category: '' }), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(listCatalog).toHaveBeenCalledWith({
      locale: 'en',
      q: undefined,
      category: undefined,
      cursor: undefined,
      limit: 24,
    });
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(listCatalog).toHaveBeenLastCalledWith(expect.objectContaining({ cursor: 'c2' }));
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });

  it('sends the filters that are set', async () => {
    listCatalog.mockResolvedValue({ items: [], nextCursor: null });
    renderHook(() => usePluginCatalog({ q: 'x', category: 'dev' }), { wrapper });
    await waitFor(() => expect(listCatalog).toHaveBeenCalled());
    expect(listCatalog).toHaveBeenCalledWith(expect.objectContaining({ q: 'x', category: 'dev' }));
  });
});

describe('locale in plugin queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.locale = 'fr';
  });
  afterEach(() => {
    navigation.locale = 'en';
  });

  it('sends the app locale with the catalog list', async () => {
    listCatalog.mockResolvedValue({ items: [], nextCursor: null });
    renderHook(() => usePluginCatalog({ q: '', category: '' }), { wrapper });
    await waitFor(() => expect(listCatalog).toHaveBeenCalled());
    expect(listCatalog).toHaveBeenCalledWith(expect.objectContaining({ locale: 'fr' }));
  });

  it('sends the app locale with the entry', async () => {
    getCatalogEntry.mockResolvedValue({ slug: 'web-fetch' } as never);
    renderHook(() => usePluginDetail('web-fetch'), { wrapper });
    await waitFor(() => expect(getCatalogEntry).toHaveBeenCalledWith('web-fetch', 'fr'));
  });

  it('keys both queries by locale', () => {
    expect(queryKeys.plugins.catalog({ q: '', category: '' }, 'fr')).toContain('fr');
    expect(queryKeys.plugins.detail('x', 'fr')).toContain('fr');
    expect(queryKeys.plugins.detail('x', 'fr')).not.toEqual(queryKeys.plugins.detail('x', 'en'));
  });
});

describe('usePluginsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigation.search = '';
  });

  it('flattens the pages and exposes load more and retry', async () => {
    listCatalog.mockResolvedValueOnce({ items: [ITEM], nextCursor: 'c2' }).mockResolvedValueOnce({
      items: [{ ...(ITEM as object), slug: 'weather' } as never],
      nextCursor: null,
    });
    const { result } = renderHook(() => usePluginsPage(), { wrapper });
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(true);
    act(() => result.current.loadMore());
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    act(() => result.current.retry());
    await waitFor(() => expect(listCatalog.mock.calls.length).toBeGreaterThan(2));
  });

  it('clears the draft and the URL filters together', async () => {
    navigation.search = 'q=abc&category=dev';
    listCatalog.mockResolvedValue({ items: [], nextCursor: null });
    const { result } = renderHook(() => usePluginsPage(), { wrapper });
    expect(result.current.searchDraft).toBe('abc');
    act(() => result.current.clearFilters());
    expect(result.current.searchDraft).toBe('');
    expect(navigation.replace).toHaveBeenLastCalledWith('/plugins', { scroll: false });
  });
});

describe('usePluginDetail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns the entry', async () => {
    getCatalogEntry.mockResolvedValue({ slug: 'web-fetch' } as never);
    const { result } = renderHook(() => usePluginDetail('web-fetch'), { wrapper });
    await waitFor(() => expect(result.current.plugin).toBeDefined());
    expect(result.current.isNotFound).toBe(false);
    expect(result.current.isError).toBe(false);
  });

  it('reports a 404 as not found, not as an error, and does not retry it', async () => {
    getCatalogEntry.mockRejectedValue(new ApiClientError({ message: 'nope', status: 404 }));
    const { result } = renderHook(() => usePluginDetail('missing'), { wrapper });
    await waitFor(() => expect(result.current.isNotFound).toBe(true));
    expect(result.current.isError).toBe(false);
    expect(getCatalogEntry).toHaveBeenCalledTimes(1);
  });

  it('reports other failures as an error and can retry', async () => {
    getCatalogEntry.mockRejectedValue(new ApiClientError({ message: 'boom', status: 500 }));
    const { result } = renderHook(() => usePluginDetail('web-fetch'), { wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 6000 });
    expect(result.current.isNotFound).toBe(false);
    const calls = getCatalogEntry.mock.calls.length;
    act(() => result.current.retry());
    await waitFor(() => expect(getCatalogEntry.mock.calls.length).toBeGreaterThan(calls));
  });
});
