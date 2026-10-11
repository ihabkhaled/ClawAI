import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserConsumptionDialog } from '@/components/observability/explorer/user-consumption-dialog';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { useUserConsumption } from '@/hooks/observability/use-user-consumption';

import {
  detail,
  filtersState,
  FULL_EMAIL,
  requestRow,
  scope,
  tStub as t,
} from './explorer-fixtures';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/observability/use-user-consumption');

const mockHook = vi.mocked(useUserConsumption);
const noop = vi.fn();

function state(overrides = {}) {
  return {
    filters: filtersState(),
    controls: {
      searchDraft: '',
      search: '',
      sort: 'time',
      order: 'desc' as const,
      setSearchDraft: vi.fn(),
      toggleSort: vi.fn(),
    },
    pager: {
      cursor: undefined,
      pageNumber: 1,
      hasPrevious: false,
      goNext: vi.fn(),
      goPrevious: vi.fn(),
    },
    detail: detail(),
    requests: {
      from: 'a',
      to: 'b',
      generatedAt: 'c',
      sort: 'time',
      order: 'desc' as const,
      limit: 10,
      items: [requestRow({ id: 'r-1', model: 'model-from-list' })],
      nextCursor: 'next-1',
    },
    isLoading: false,
    isError: false,
    isRequestsLoading: false,
    isRequestsFetching: false,
    isRequestsError: false,
    refetch: noop,
    ...overrides,
  };
}

function open(userId: string | null = 'user-1', onClose = vi.fn()) {
  return render(
    <UserConsumptionDialog userId={userId} initialScope={scope()} onClose={onClose} t={t} />,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UserConsumptionDialog', () => {
  it('renders nothing while no user is open and does not query', () => {
    mockHook.mockReturnValue(state());
    open(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mockHook).not.toHaveBeenCalled();
  });

  it('opens for the chosen user and queries THAT user from the page scope', () => {
    mockHook.mockReturnValue(state());
    open('user-1');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockHook).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ buildParams: expect.any(Function) }),
    );
  });

  it('shows the full email, the totals, the breakdowns and the heaviest requests', () => {
    mockHook.mockReturnValue(state());
    open();
    expect(screen.getByText(FULL_EMAIL, { exact: false })).toBeInTheDocument();
    expect(screen.getByTestId('metric-cards')).toBeInTheDocument();
    expect(screen.getByText('usageAnalytics.modelsHeading')).toBeInTheDocument();
    expect(screen.getByText('observabilityExplorer.headingProviders')).toBeInTheDocument();
    expect(screen.getByText('usageAnalytics.workflowsHeading')).toBeInTheDocument();
    expect(screen.getByText('observabilityExplorer.headingHeaviest')).toBeInTheDocument();
    expect(screen.getByTestId('stacked-bar-chart')).toBeInTheDocument();
    // The unknown-workflow row reads Unknown.
    expect(screen.getAllByText('observabilityExplorer.workflowUnknown').length).toBeGreaterThan(0);
  });

  it('lists the user requests, searches them and pages with the server cursor', () => {
    const current = state();
    mockHook.mockReturnValue(current);
    open();
    expect(screen.getByText('model-from-list')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('observabilityExplorer.requestsSearch'), {
      target: { value: 'gemini' },
    });
    expect(current.controls.setSearchDraft).toHaveBeenCalledWith('gemini');
    fireEvent.click(screen.getByRole('button', { name: 'pagination.next' }));
    expect(current.pager.goNext).toHaveBeenCalledWith('next-1');
  });

  it('sorts requests from the table header', () => {
    const current = state();
    mockHook.mockReturnValue(current);
    open();
    const sortButtons = screen.getAllByRole('button', { name: 'usageAnalytics.colCost' });
    fireEvent.click(sortButtons[sortButtons.length - 1] as HTMLElement);
    expect(current.controls.toggleSort).toHaveBeenCalledWith('cost');
  });

  it('shows a loading state, then an error with retry', () => {
    mockHook.mockReturnValue(state({ isLoading: true, detail: null }));
    const { rerender } = open();
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);

    const refetch = vi.fn();
    mockHook.mockReturnValue(state({ isError: true, detail: null, refetch }));
    rerender(<UserConsumptionDialog userId="user-1" initialScope={scope()} onClose={noop} t={t} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'common.retry' })[0] as HTMLElement);
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state when the user has no requests in the period', () => {
    mockHook.mockReturnValue(
      state({
        requests: {
          from: 'a',
          to: 'b',
          generatedAt: 'c',
          sort: 'time',
          order: 'desc',
          limit: 10,
          items: [],
          nextCursor: null,
        },
      }),
    );
    open();
    expect(screen.getAllByText('usageAnalytics.empty').length).toBeGreaterThan(0);
  });

  it('closes on Escape', () => {
    mockHook.mockReturnValue(state());
    const onClose = vi.fn();
    open('user-1', onClose);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('keeps its own period: a preset click goes to the dialog filters, not the page', () => {
    const current = state();
    mockHook.mockReturnValue(current);
    open();
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.presetMonth' }));
    expect(current.filters.setPreset).toHaveBeenCalledWith(UsageRangePreset.Month);
  });
});
