import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  modelObsRow,
  obsDetail,
  obsOverview,
  obsPage,
  scopeContext,
  userObsRow,
} from '@/components/observability/pages/__tests__/pages-fixtures';
import { useEntityAuditLatency } from '@/hooks/observability/use-entity-audit-latency';
import { useObservabilityEntityDetail } from '@/hooks/observability/use-observability-entity-detail';
import { useObservabilityFilterOptions } from '@/hooks/observability/use-observability-filter-options';
import { useObservabilityHealth } from '@/hooks/observability/use-observability-health';
import { useObservabilityList } from '@/hooks/observability/use-observability-list';
import { useObservabilityOverview } from '@/hooks/observability/use-observability-overview';
import { useObservabilityPreview } from '@/hooks/observability/use-observability-preview';
import { ObservabilityScopeContext } from '@/hooks/observability/use-observability-scope';
import { useUrlListControls } from '@/hooks/observability/use-url-list-controls';
import { useUsersCsvExport } from '@/hooks/observability/use-users-csv-export';
import type { ObservabilityPagesContextValue } from '@/types/observability-pages.types';

const mockGetList = vi.fn();
const mockGetOverview = vi.fn();
const mockGetHealth = vi.fn();
const mockGetFilterOptions = vi.fn();
const mockGetProviderDetail = vi.fn();
const mockGetModelDetail = vi.fn();
const mockGetTracing = vi.fn();
const mockExportUsers = vi.fn();
const EXPORT_VIEW = { search: '', sort: 'lastSeen', order: 'desc' as const };
const INVALID_RANGE = 'period=custom';

vi.mock('@/repositories/admin/observability-explorer.repository', () => ({
  observabilityExplorerRepository: {
    getList: (...args: unknown[]) => mockGetList(...args),
    getOverview: (...args: unknown[]) => mockGetOverview(...args),
    getHealth: (...args: unknown[]) => mockGetHealth(...args),
    getFilterOptions: (...args: unknown[]) => mockGetFilterOptions(...args),
    getProviderDetail: (...args: unknown[]) => mockGetProviderDetail(...args),
    getModelDetail: (...args: unknown[]) => mockGetModelDetail(...args),
    getTracing: (...args: unknown[]) => mockGetTracing(...args),
    exportUsers: (...args: unknown[]) => mockExportUsers(...args),
  },
}));

function wrapperFor(value: ObservabilityPagesContextValue) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    return (
      <QueryClientProvider client={client}>
        <ObservabilityScopeContext.Provider value={value}>
          {children}
        </ObservabilityScopeContext.Provider>
      </QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetList.mockResolvedValue(obsPage([userObsRow()], { total: 61, pageCount: 4 }));
});

describe('useUrlListControls', () => {
  it('reads search, sort, order, page and size from the URL', () => {
    const value = scopeContext('period=7d&q=jane&sort=requests&order=asc&page=3&limit=50');
    const { result } = renderHook(() => useUrlListControls('cost', 'desc'), {
      wrapper: wrapperFor(value),
    });
    expect(result.current).toMatchObject({
      search: 'jane',
      searchDraft: 'jane',
      sort: 'requests',
      order: 'asc',
      page: 3,
      limit: 50,
    });
  });

  it('uses the defaults, and ignores a sort column the page does not offer', () => {
    const value = scopeContext('sort=hacked&limit=7&page=-2');
    const { result } = renderHook(() => useUrlListControls('cost', 'desc', ['cost', 'requests']), {
      wrapper: wrapperFor(value),
    });
    expect(result.current).toMatchObject({ sort: 'cost', order: 'desc', page: 1, limit: 20 });
  });

  it('flips the order of the current sort and starts a new one descending, back on page 1', () => {
    const value = scopeContext('sort=cost&order=desc&page=3');
    const { result } = renderHook(() => useUrlListControls('cost', 'desc'), {
      wrapper: wrapperFor(value),
    });
    act(() => {
      result.current.toggleSort('cost');
    });
    expect(value.setParams).toHaveBeenLastCalledWith(
      { sort: 'cost', order: 'asc', page: null },
      { keepPage: true },
    );
    act(() => {
      result.current.toggleSort('requests');
    });
    expect(value.setParams).toHaveBeenLastCalledWith(
      { sort: 'requests', order: 'desc', page: null },
      { keepPage: true },
    );
  });

  it('sets the page, and resets it when the size changes', () => {
    const value = scopeContext('period=7d');
    const { result } = renderHook(() => useUrlListControls('cost'), { wrapper: wrapperFor(value) });
    act(() => {
      result.current.setPage(4);
    });
    expect(value.setParams).toHaveBeenLastCalledWith({ page: '4' }, { keepPage: true });
    act(() => {
      result.current.setPage(1);
    });
    expect(value.setParams).toHaveBeenLastCalledWith({ page: null }, { keepPage: true });
    act(() => {
      result.current.setLimit(50);
    });
    expect(value.setParams).toHaveBeenLastCalledWith(
      { limit: '50', page: null },
      { keepPage: true },
    );
  });

  it('writes the search to the URL only after typing pauses', () => {
    vi.useFakeTimers();
    const value = scopeContext('period=7d');
    const { result } = renderHook(() => useUrlListControls('cost'), { wrapper: wrapperFor(value) });
    act(() => {
      result.current.setSearchDraft('ja');
      result.current.setSearchDraft('jane ');
    });
    expect(value.setParams).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(value.setParams).toHaveBeenCalledTimes(1);
    expect(value.setParams).toHaveBeenCalledWith({ q: 'jane', page: null }, { keepPage: true });
    vi.useRealTimers();
  });

  it('follows the URL when the search is reset from outside', () => {
    let value = scopeContext('q=jane');
    const { result, rerender } = renderHook(() => useUrlListControls('cost'), {
      wrapper: function Wrapper({ children }: { children: ReactNode }): ReactElement {
        const client = new QueryClient();
        return (
          <QueryClientProvider client={client}>
            <ObservabilityScopeContext.Provider value={value}>
              {children}
            </ObservabilityScopeContext.Provider>
          </QueryClientProvider>
        );
      },
    });
    expect(result.current.searchDraft).toBe('jane');
    value = scopeContext('period=7d');
    rerender();
    expect(result.current.searchDraft).toBe('');
  });
});

describe('useObservabilityList', () => {
  it('asks for the page, size, sort and search of the URL, with the period and filters', async () => {
    const value = scopeContext(
      'period=30d&provider=GEMINI&q=jane&sort=requests&order=asc&page=2&limit=50',
    );
    const { result } = renderHook(() => useObservabilityList('users'), {
      wrapper: wrapperFor(value),
    });
    await waitFor(() => {
      expect(result.current.result?.items).toHaveLength(1);
    });
    expect(mockGetList).toHaveBeenCalledWith(
      'users',
      { days: '30', provider: 'GEMINI' },
      { search: 'jane', sort: 'requests', order: 'asc', limit: 50, page: 2 },
    );
    expect(result.current.result?.total).toBe(61);
  });

  it('sorts providers by cost by default and users by last seen', async () => {
    const value = scopeContext('period=7d');
    renderHook(() => useObservabilityList('providers'), { wrapper: wrapperFor(value) });
    renderHook(() => useObservabilityList('users'), { wrapper: wrapperFor(value) });
    await waitFor(() => {
      expect(mockGetList).toHaveBeenCalledTimes(2);
    });
    expect(mockGetList).toHaveBeenCalledWith(
      'providers',
      { days: '7' },
      expect.objectContaining({ sort: 'cost', order: 'desc', limit: 20, page: 1 }),
    );
    expect(mockGetList).toHaveBeenCalledWith(
      'users',
      { days: '7' },
      expect.objectContaining({ sort: 'lastSeen' }),
    );
  });

  it('reports a failed load', async () => {
    mockGetList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useObservabilityList('models'), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('useObservabilityOverview', () => {
  it('loads the overview for the period and reads the chosen preview size', async () => {
    mockGetOverview.mockResolvedValue(obsOverview());
    const value = scopeContext('period=7d&top=25');
    const { result } = renderHook(() => useObservabilityOverview(), {
      wrapper: wrapperFor(value),
    });
    await waitFor(() => {
      expect(result.current.overview).not.toBeNull();
    });
    expect(mockGetOverview).toHaveBeenCalledWith({ days: '7' });
    expect(result.current.top).toBe(25);
    act(() => {
      result.current.setTop(50);
    });
    expect(value.setParams).toHaveBeenCalledWith({ top: '50' }, { keepPage: true });
  });

  it('defaults to 10 and ignores a preview size that is not offered', () => {
    mockGetOverview.mockResolvedValue(obsOverview());
    const { result } = renderHook(() => useObservabilityOverview(), {
      wrapper: wrapperFor(scopeContext('top=3')),
    });
    expect(result.current.top).toBe(10);
  });
});

describe('useObservabilityPreview', () => {
  it('asks for the first page of the chosen size, by cost, and keeps the total', async () => {
    mockGetList.mockResolvedValue(obsPage([modelObsRow()], { total: 83 }));
    const { result } = renderHook(() => useObservabilityPreview('models', 25), {
      wrapper: wrapperFor(scopeContext('period=7d')),
    });
    await waitFor(() => {
      expect(result.current.rows).toHaveLength(1);
    });
    expect(mockGetList).toHaveBeenCalledWith(
      'models',
      { days: '7' },
      { sort: 'cost', order: 'desc', limit: 25, page: 1 },
    );
    expect(result.current.total).toBe(83);
  });
});

describe('useObservabilityEntityDetail', () => {
  it('loads a provider by its code', async () => {
    mockGetProviderDetail.mockResolvedValue(obsDetail());
    const { result } = renderHook(() => useObservabilityEntityDetail('GEMINI', null), {
      wrapper: wrapperFor(scopeContext('period=30d')),
    });
    await waitFor(() => {
      expect(result.current.detail).not.toBeNull();
    });
    expect(mockGetProviderDetail).toHaveBeenCalledWith('GEMINI', { days: '30' });
  });

  it('loads a model by provider and id', async () => {
    mockGetModelDetail.mockResolvedValue(obsDetail());
    const { result } = renderHook(() => useObservabilityEntityDetail('OPENAI', 'ft:gpt-4o/mini'), {
      wrapper: wrapperFor(scopeContext('period=30d')),
    });
    await waitFor(() => {
      expect(result.current.detail).not.toBeNull();
    });
    expect(mockGetModelDetail).toHaveBeenCalledWith('OPENAI', 'ft:gpt-4o/mini', { days: '30' });
  });

  it('does not ask when the model in the URL is empty', () => {
    renderHook(() => useObservabilityEntityDetail('OPENAI', ''), {
      wrapper: wrapperFor(scopeContext()),
    });
    expect(mockGetModelDetail).not.toHaveBeenCalled();
  });
});

describe('useObservabilityFilterOptions', () => {
  it('asks for the range alone, so choosing one provider keeps the others in the list', async () => {
    mockGetFilterOptions.mockResolvedValue({
      providers: [{ value: 'GEMINI', label: 'Gemini' }],
      models: ['m'],
      workflows: ['CHAT'],
      plans: [{ value: 'NONE', label: 'No plan' }],
    });
    const value = scopeContext('period=7d&provider=GEMINI');
    const { result } = renderHook(() => useObservabilityFilterOptions(value.scope, true), {
      wrapper: wrapperFor(value),
    });
    await waitFor(() => {
      expect(result.current.models).toEqual(['m']);
    });
    expect(mockGetFilterOptions).toHaveBeenCalledWith({ days: '7' });
  });

  it('stays empty and quiet when disabled', () => {
    const value = scopeContext();
    const { result } = renderHook(() => useObservabilityFilterOptions(value.scope, false), {
      wrapper: wrapperFor(value),
    });
    expect(result.current.plans).toEqual([]);
    expect(mockGetFilterOptions).not.toHaveBeenCalled();
  });
});

describe('useEntityAuditLatency', () => {
  const tracing = {
    overall: { requests: 1, measuredRequests: 1, p50LatencyMs: 1, p95LatencyMs: 2 },
    rows: {
      items: [
        { key: 'a', provider: 'OTHER', model: 'x', p95LatencyMs: 1 },
        { key: 'b', provider: 'GEMINI', model: 'gemini-x', p95LatencyMs: 9 },
      ],
    },
  };

  it('looks a provider up by name in the audit tracing and picks the matching row', async () => {
    mockGetTracing.mockResolvedValue(tracing);
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', null), {
      wrapper: wrapperFor(scopeContext('period=7d')),
    });
    await waitFor(() => {
      expect(result.current.match).not.toBeNull();
    });
    expect(result.current.match?.key).toBe('b');
    expect(mockGetTracing).toHaveBeenCalledWith(
      expect.objectContaining({ hours: 168, dimension: 'provider', search: 'GEMINI' }),
    );
    expect(result.current.clamped).toBe(false);
  });

  it('looks a model up by id and flags a period longer than the audit keeps', async () => {
    mockGetTracing.mockResolvedValue(tracing);
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', 'gemini-x'), {
      wrapper: wrapperFor(scopeContext('period=90d')),
    });
    await waitFor(() => {
      expect(result.current.match?.key).toBe('b');
    });
    expect(mockGetTracing).toHaveBeenCalledWith(
      expect.objectContaining({ hours: 720, dimension: 'model', search: 'gemini-x' }),
    );
    expect(result.current.clamped).toBe(true);
  });

  it('has no match when the audit service knows nothing about it', async () => {
    mockGetTracing.mockResolvedValue({ ...tracing, rows: { items: [] } });
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', null), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.match).toBeNull();
  });
});

describe('useUsersCsvExport', () => {
  it('downloads the users of the current view as a CSV', async () => {
    mockExportUsers.mockResolvedValue({ items: [userObsRow()], truncated: true });
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);

    const { result } = renderHook(
      () => useUsersCsvExport({ search: 'jane', sort: 'requests', order: 'asc' }, (key) => key),
      { wrapper: wrapperFor(scopeContext('period=30d&plan=NONE')) },
    );
    await act(async () => {
      await result.current.exportCsv();
    });

    expect(mockExportUsers).toHaveBeenCalledWith(
      { days: '30', plan: 'NONE' },
      { search: 'jane', sort: 'requests', order: 'asc' },
    );
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    expect(result.current.truncated).toBe(true);
    expect(result.current.isError).toBe(false);
    click.mockRestore();
  });

  it('reports a failed export and clears it on the next try', async () => {
    mockExportUsers.mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(() => useUsersCsvExport(EXPORT_VIEW, (key) => key), {
      wrapper: wrapperFor(scopeContext()),
    });
    await act(async () => {
      await result.current.exportCsv();
    });
    expect(result.current.isError).toBe(true);
    expect(result.current.isExporting).toBe(false);
  });
});

describe('useObservabilityHealth', () => {
  it('loads the hold health for the period and filters', async () => {
    mockGetHealth.mockResolvedValue({ overall: {}, byProvider: [] });
    const { result } = renderHook(() => useObservabilityHealth(), {
      wrapper: wrapperFor(scopeContext('period=30d&plan=NONE')),
    });
    await waitFor(() => {
      expect(result.current.report).not.toBeNull();
    });
    expect(mockGetHealth).toHaveBeenCalledWith({ days: '30', plan: 'NONE' });
  });

  it('reports a failed load', async () => {
    mockGetHealth.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useObservabilityHealth(), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});

describe('an invalid range is never sent', () => {
  it('does not ask for the list, a preview, the overview, the health report or a detail', () => {
    const wrapper = wrapperFor(scopeContext(INVALID_RANGE));
    renderHook(() => useObservabilityList('users'), { wrapper });
    renderHook(() => useObservabilityPreview('models', 10), { wrapper });
    renderHook(() => useObservabilityOverview(), { wrapper });
    renderHook(() => useObservabilityHealth(), { wrapper });
    renderHook(() => useObservabilityEntityDetail('GEMINI', null), { wrapper });
    renderHook(() => useObservabilityEntityDetail('GEMINI', 'gemini-x'), { wrapper });
    renderHook(() => useEntityAuditLatency('GEMINI', null), { wrapper });
    expect(mockGetList).not.toHaveBeenCalled();
    expect(mockGetOverview).not.toHaveBeenCalled();
    expect(mockGetHealth).not.toHaveBeenCalled();
    expect(mockGetProviderDetail).not.toHaveBeenCalled();
    expect(mockGetModelDetail).not.toHaveBeenCalled();
    expect(mockGetTracing).not.toHaveBeenCalled();
  });

  it('does not ask for the filter options', () => {
    const value = scopeContext(INVALID_RANGE);
    renderHook(() => useObservabilityFilterOptions(value.scope, true), {
      wrapper: wrapperFor(value),
    });
    expect(mockGetFilterOptions).not.toHaveBeenCalled();
  });

  it('does not export', async () => {
    const { result } = renderHook(() => useUsersCsvExport(EXPORT_VIEW, (key) => key), {
      wrapper: wrapperFor(scopeContext(INVALID_RANGE)),
    });
    await act(async () => {
      await result.current.exportCsv();
    });
    expect(mockExportUsers).not.toHaveBeenCalled();
    expect(result.current.isExporting).toBe(false);
  });

  it('asks as soon as the range is valid', async () => {
    mockGetHealth.mockResolvedValue({ overall: {}, byProvider: [] });
    const { result } = renderHook(() => useObservabilityHealth(), {
      wrapper: wrapperFor(scopeContext('period=custom&from=2026-09-01&to=2026-09-30')),
    });
    await waitFor(() => {
      expect(result.current.report).not.toBeNull();
    });
    expect(mockGetHealth).toHaveBeenCalledTimes(1);
  });
});

function stubDownload() {
  Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:csv'), revokeObjectURL: vi.fn() });
  return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
}

function changingScopeWrapper(read: () => ObservabilityPagesContextValue) {
  return function Wrapper({ children }: { children: ReactNode }): ReactElement {
    const client = new QueryClient();
    return (
      <QueryClientProvider client={client}>
        <ObservabilityScopeContext.Provider value={read()}>
          {children}
        </ObservabilityScopeContext.Provider>
      </QueryClientProvider>
    );
  };
}

describe('useUsersCsvExport notices', () => {
  it('clears the truncated notice when the next export starts', async () => {
    const click = stubDownload();
    mockExportUsers.mockResolvedValueOnce({ items: [userObsRow()], truncated: true });
    const { result } = renderHook(() => useUsersCsvExport(EXPORT_VIEW, (key) => key), {
      wrapper: wrapperFor(scopeContext('period=30d')),
    });
    await act(async () => {
      await result.current.exportCsv();
    });
    expect(result.current.truncated).toBe(true);

    let release: (value: unknown) => void = () => undefined;
    mockExportUsers.mockReturnValueOnce(
      new Promise((resolve) => {
        release = resolve;
      }),
    );
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.exportCsv();
    });
    expect(result.current.truncated).toBe(false);
    await act(async () => {
      release({ items: [userObsRow()], truncated: false });
      await pending;
    });
    expect(result.current.truncated).toBe(false);
    click.mockRestore();
  });

  it('clears the truncated notice when the period or filters change', async () => {
    const click = stubDownload();
    mockExportUsers.mockResolvedValue({ items: [userObsRow()], truncated: true });
    let value = scopeContext('period=30d');
    const { result, rerender } = renderHook(() => useUsersCsvExport(EXPORT_VIEW, (key) => key), {
      wrapper: changingScopeWrapper(() => value),
    });
    await act(async () => {
      await result.current.exportCsv();
    });
    expect(result.current.truncated).toBe(true);
    value = scopeContext('period=30d&provider=GEMINI');
    rerender();
    expect(result.current.truncated).toBe(false);
    click.mockRestore();
  });

  it('exports in the order the table shows', async () => {
    const click = stubDownload();
    mockExportUsers.mockResolvedValue({ items: [], truncated: false });
    const { result } = renderHook(
      () => useUsersCsvExport({ search: '', sort: 'cost', order: 'asc' }, (key) => key),
      { wrapper: wrapperFor(scopeContext('period=7d')) },
    );
    await act(async () => {
      await result.current.exportCsv();
    });
    expect(mockExportUsers).toHaveBeenCalledWith(
      { days: '7' },
      { search: '', sort: 'cost', order: 'asc' },
    );
    click.mockRestore();
  });
});

describe('useEntityAuditLatency matching', () => {
  const row = (key: string, provider: string | null, model: string | null) => ({
    key,
    provider,
    model,
    p95LatencyMs: 1,
  });

  it('shows nothing when the audit service has other entities only', async () => {
    mockGetTracing.mockResolvedValue({
      overall: null,
      rows: { items: [row('x', 'OPENAI', null)] },
    });
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', null), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.match).toBeNull();
  });

  it('matches a model by provider AND id, never the same id under another provider', async () => {
    mockGetTracing.mockResolvedValue({
      overall: null,
      rows: {
        items: [row('other', 'OPENAI', 'shared-id'), row('mine', 'GEMINI', 'shared-id')],
      },
    });
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', 'shared-id'), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.match).not.toBeNull();
    });
    expect(result.current.match?.key).toBe('mine');
  });

  it('has no match for a model when only another provider carries that id', async () => {
    mockGetTracing.mockResolvedValue({
      overall: null,
      rows: { items: [row('other', 'OPENAI', 'shared-id')] },
    });
    const { result } = renderHook(() => useEntityAuditLatency('GEMINI', 'shared-id'), {
      wrapper: wrapperFor(scopeContext()),
    });
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.match).toBeNull();
  });
});

describe('useUrlListControls search draft', () => {
  it('keeps what the user typed when an older echo of its own write arrives late', () => {
    vi.useFakeTimers();
    let value = scopeContext('period=7d');
    const { result, rerender } = renderHook(() => useUrlListControls('cost'), {
      wrapper: changingScopeWrapper(() => value),
    });
    act(() => {
      result.current.setSearchDraft('a');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    act(() => {
      result.current.setSearchDraft('ab');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(value.setParams).toHaveBeenCalledTimes(2);
    // The URL catches up with the FIRST write while "ab" is already typed.
    value = scopeContext('q=a');
    rerender();
    expect(result.current.searchDraft).toBe('ab');
    value = scopeContext('q=ab');
    rerender();
    expect(result.current.searchDraft).toBe('ab');
    vi.useRealTimers();
  });

  it('still follows the URL when something else changes it', () => {
    vi.useFakeTimers();
    let value = scopeContext('period=7d');
    const { result, rerender } = renderHook(() => useUrlListControls('cost'), {
      wrapper: changingScopeWrapper(() => value),
    });
    act(() => {
      result.current.setSearchDraft('a');
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });
    value = scopeContext('q=zed');
    rerender();
    expect(result.current.searchDraft).toBe('zed');
    vi.useRealTimers();
  });

  it('goes back to the first page', () => {
    const value = scopeContext('page=5');
    const { result } = renderHook(() => useUrlListControls('cost'), { wrapper: wrapperFor(value) });
    act(() => {
      result.current.goToFirstPage();
    });
    expect(value.setParams).toHaveBeenLastCalledWith({ page: null }, { keepPage: true });
  });
});
