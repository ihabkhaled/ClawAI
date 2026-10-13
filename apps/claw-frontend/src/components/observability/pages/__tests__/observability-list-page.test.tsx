import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { tStub as t } from '@/components/observability/explorer/__tests__/explorer-fixtures';
import { ObservabilityListPage } from '@/components/observability/pages/observability-list-page';
import { useObservabilityList } from '@/hooks/observability/use-observability-list';
import { useUsersCsvExport } from '@/hooks/observability/use-users-csv-export';

import { FULL_EMAIL, obsPage, scopeContext, userObsRow } from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/observability/use-observability-list');
vi.mock('@/hooks/observability/use-users-csv-export');

const mockList = vi.mocked(useObservabilityList);
const mockExport = vi.mocked(useUsersCsvExport);

function controls(overrides = {}) {
  return {
    searchDraft: '',
    search: '',
    sort: 'lastSeen',
    order: 'desc' as const,
    limit: 20,
    page: 1,
    setSearchDraft: vi.fn(),
    toggleSort: vi.fn(),
    setLimit: vi.fn(),
    setPage: vi.fn(),
    goToFirstPage: vi.fn(),
    ...overrides,
  };
}

function listState(overrides = {}) {
  return {
    controls: controls(),
    result: obsPage([userObsRow()], { total: 61, pageCount: 4, page: 2, limit: 20 }),
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

function exportState(overrides = {}) {
  return {
    exportCsv: vi.fn(() => Promise.resolve()),
    isExporting: false,
    isError: false,
    truncated: false,
    ...overrides,
  };
}

function renderUsers(props: { kind?: 'users' | 'providers' } = {}) {
  return renderInScope(
    <ObservabilityListPage
      kind={props.kind ?? 'users'}
      title="Users"
      searchLabel="Search users"
      note="Every user"
      t={t}
    />,
    scopeContext('period=7d'),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockExport.mockReturnValue(exportState());
});

describe('ObservabilityListPage', () => {
  it('lists ALL matching users with the full count, not a top-N', () => {
    mockList.mockReturnValue(listState());
    renderUsers();
    expect(screen.getByText(FULL_EMAIL)).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.matched|count=61')).toBeInTheDocument();
    expect(screen.getByTestId('pagination-summary')).toHaveTextContent('pagination.showing');
  });

  it('opens a user from the name', () => {
    mockList.mockReturnValue(listState());
    const value = scopeContext('period=7d');
    renderInScope(
      <ObservabilityListPage
        kind="users"
        title="Users"
        searchLabel="Search users"
        note="n"
        t={t}
      />,
      value,
    );
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(value.openUser).toHaveBeenCalledWith('user-1');
  });

  it('sends the typed search to the URL controls', () => {
    const state = listState();
    mockList.mockReturnValue(state);
    renderUsers();
    fireEvent.change(screen.getByLabelText('Search users'), { target: { value: 'jane' } });
    expect(state.controls.setSearchDraft).toHaveBeenCalledWith('jane');
  });

  it('sorts by a clicked column and announces the active sort', () => {
    const state = listState({ controls: controls({ sort: 'cost', order: 'asc' }) });
    mockList.mockReturnValue(state);
    renderUsers();
    expect(screen.getByRole('columnheader', { name: 'usageAnalytics.colCost' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.colRequests' }));
    expect(state.controls.toggleSort).toHaveBeenCalledWith('requests');
  });

  it('pages with real page numbers and changes the page size', () => {
    const state = listState();
    mockList.mockReturnValue(state);
    renderUsers();
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(state.controls.setPage).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByTestId('pagination-previous'));
    expect(state.controls.setPage).toHaveBeenCalledWith(1);
  });

  it('exports the users as a CSV and shows it is working', () => {
    mockList.mockReturnValue(listState());
    const exporter = exportState();
    mockExport.mockReturnValue(exporter);
    renderUsers();
    fireEvent.click(screen.getByRole('button', { name: 'observabilityPages.exportCsv' }));
    expect(exporter.exportCsv).toHaveBeenCalled();
  });

  it('disables the export while it runs, and says when it failed or hit its cap', () => {
    mockList.mockReturnValue(listState());
    mockExport.mockReturnValue(exportState({ isExporting: true, isError: true, truncated: true }));
    renderUsers();
    expect(screen.getByRole('button', { name: 'observabilityPages.exporting' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('observabilityPages.exportFailed');
    expect(screen.getByRole('status')).toHaveTextContent('observabilityPages.exportTruncated');
  });

  it('exports with the search that is applied', () => {
    mockList.mockReturnValue(listState({ controls: controls({ search: 'jane' }) }));
    renderUsers();
    expect(mockExport).toHaveBeenCalledWith(
      { search: 'jane', sort: 'lastSeen', order: 'desc' },
      expect.any(Function),
    );
  });

  it('offers no export on a list that is not users', () => {
    mockList.mockReturnValue(listState({ result: obsPage([]) }));
    renderUsers({ kind: 'providers' });
    expect(
      screen.queryByRole('button', { name: 'observabilityPages.exportCsv' }),
    ).not.toBeInTheDocument();
  });

  it('shows loading, error with retry, and empty', () => {
    mockList.mockReturnValue(listState({ isLoading: true, result: null }));
    const { rerender } = renderUsers();
    expect(screen.getByRole('status')).toBeInTheDocument();

    const refetch = vi.fn();
    mockList.mockReturnValue(listState({ isError: true, result: null, refetch }));
    rerender(
      <ObservabilityListPage
        kind="users"
        title="Users"
        searchLabel="Search users"
        note="n"
        t={t}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();

    mockList.mockReturnValue(listState({ result: obsPage([]) }));
    rerender(
      <ObservabilityListPage
        kind="users"
        title="Users"
        searchLabel="Search users"
        note="n"
        t={t}
      />,
    );
    expect(screen.getByText('usageAnalytics.empty')).toBeInTheDocument();
  });

  it('keeps the pager and a way back to page 1 when the page is past the end', () => {
    const state = listState({
      controls: controls({ page: 7 }),
      result: obsPage([], { total: 61, pageCount: 4, page: 4, limit: 20 }),
    });
    mockList.mockReturnValue(state);
    renderUsers();
    expect(screen.getByText('observabilityPages.pastEndNote')).toBeInTheDocument();
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.queryByTestId('entity-table-users')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'observabilityPages.backToFirstPage' }));
    expect(state.controls.goToFirstPage).toHaveBeenCalledTimes(1);
  });

  it('shows the plain empty state, and no pager, for an empty first page', () => {
    mockList.mockReturnValue(listState({ result: obsPage([], { total: 0, pageCount: 0 }) }));
    renderUsers();
    expect(screen.getByText('usageAnalytics.empty')).toBeInTheDocument();
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
    expect(screen.queryByText('observabilityPages.pastEndNote')).not.toBeInTheDocument();
  });

  it('keeps the first column while the rest scroll sideways', () => {
    mockList.mockReturnValue(listState());
    renderUsers();
    const table = screen.getByTestId('entity-table-users');
    expect(table.className).toContain('overflow-x-auto');
    const firstHeader = within(table).getAllByRole('columnheader')[0];
    expect(firstHeader?.className).toContain('sticky');
    expect(firstHeader?.className).toContain('start-0');
  });
});
