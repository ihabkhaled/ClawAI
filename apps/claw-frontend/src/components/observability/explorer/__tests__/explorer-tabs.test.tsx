import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ConsumptionTab } from '@/components/observability/explorer/consumption-tab';
import { FailuresTab } from '@/components/observability/explorer/failures-tab';
import { ModelsTab } from '@/components/observability/explorer/models-tab';
import { OverviewTab } from '@/components/observability/explorer/overview-tab';
import { TracingTab } from '@/components/observability/explorer/tracing-tab';
import { UsersTab } from '@/components/observability/explorer/users-tab';
import { TracingDimension } from '@/enums/tracing-dimension.enum';
import { UsageLeaderboardDimension } from '@/enums/usage-leaderboard-dimension.enum';
import { useObservabilityFailures } from '@/hooks/observability/use-observability-failures';
import { useObservabilityTracing } from '@/hooks/observability/use-observability-tracing';
import { useUsageExplorerUsers } from '@/hooks/observability/use-usage-explorer-users';
import { useUsageLeaderboard } from '@/hooks/observability/use-usage-leaderboard';
import { useUsageTimeseries } from '@/hooks/observability/use-usage-timeseries';

import { FULL_EMAIL, groupRow, metrics, scope, tStub as t, userRow } from './explorer-fixtures';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));
vi.mock('@/hooks/observability/use-usage-explorer-users');
vi.mock('@/hooks/observability/use-usage-leaderboard');
vi.mock('@/hooks/observability/use-usage-timeseries');
vi.mock('@/hooks/observability/use-observability-failures');
vi.mock('@/hooks/observability/use-observability-tracing');
vi.mock('@/hooks/observability/use-service-status', () => ({
  useServiceStatus: () => ({}),
}));
vi.mock('@/components/observability/service-status-section', () => ({
  ServiceStatusSection: () => <div data-testid="service-status" />,
}));

const mockUsers = vi.mocked(useUsageExplorerUsers);
const mockLeaderboard = vi.mocked(useUsageLeaderboard);
const mockTimeseries = vi.mocked(useUsageTimeseries);
const mockFailures = vi.mocked(useObservabilityFailures);
const mockTracing = vi.mocked(useObservabilityTracing);

const noop = vi.fn();

function controls(overrides = {}) {
  return {
    searchDraft: '',
    search: '',
    sort: 'lastSeen',
    order: 'desc' as const,
    setSearchDraft: vi.fn(),
    toggleSort: vi.fn(),
    ...overrides,
  };
}

function pager(overrides = {}) {
  return {
    cursor: undefined,
    pageNumber: 1,
    hasPrevious: false,
    goNext: vi.fn(),
    goPrevious: vi.fn(),
    ...overrides,
  };
}

function usersState(overrides = {}) {
  return {
    controls: controls(),
    pager: pager(),
    page: {
      from: 'a',
      to: 'b',
      generatedAt: 'c',
      sort: 'lastSeen',
      order: 'desc' as const,
      limit: 10,
      items: [userRow()],
      nextCursor: 'c2',
      matchedUsers: 7,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: noop,
    ...overrides,
  };
}

function leaderboardState(rows = [groupRow()], overrides = {}) {
  return {
    controls: controls({ sort: 'cost' }),
    pager: pager(),
    page: {
      from: 'a',
      to: 'b',
      generatedAt: 'c',
      sort: 'cost',
      order: 'desc' as const,
      limit: 10,
      items: rows,
      nextCursor: null,
      dimension: UsageLeaderboardDimension.Provider,
    },
    isLoading: false,
    isFetching: false,
    isError: false,
    refetch: noop,
    ...overrides,
  };
}

function timeseriesState(overrides = {}) {
  return {
    data: {
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-08T00:00:00.000Z',
      generatedAt: 'x',
      grain: 'DAY' as const,
      totals: metrics(),
      series: [
        { ...metrics(), bucketStart: '2026-10-05T00:00:00.000Z' },
        { ...metrics({ requests: 4 }), bucketStart: '2026-10-06T00:00:00.000Z' },
      ],
    },
    isLoading: false,
    isError: false,
    refetch: noop,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UsersTab', () => {
  it('lists users with the full email, the matched count and opens a user', () => {
    mockUsers.mockReturnValue(usersState());
    const onOpenUser = vi.fn();
    render(<UsersTab scope={scope()} onOpenUser={onOpenUser} t={t} />);
    expect(screen.getByText(FULL_EMAIL)).toBeInTheDocument();
    expect(screen.getByText(/observabilityExplorer.matchedUsers\|count=7/u)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(onOpenUser).toHaveBeenCalledWith('user-1');
  });

  it('sends the typed search to the hook', () => {
    const state = usersState();
    mockUsers.mockReturnValue(state);
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    fireEvent.change(screen.getByLabelText('observabilityExplorer.usersSearch'), {
      target: { value: 'jane' },
    });
    expect(state.controls.setSearchDraft).toHaveBeenCalledWith('jane');
  });

  it('pages forward with the server cursor and back again', () => {
    const state = usersState({ pager: pager({ hasPrevious: true, pageNumber: 2 }) });
    mockUsers.mockReturnValue(state);
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'pagination.next' }));
    expect(state.pager.goNext).toHaveBeenCalledWith('c2');
    fireEvent.click(screen.getByRole('button', { name: 'pagination.previous' }));
    expect(state.pager.goPrevious).toHaveBeenCalled();
  });

  it('disables next on the last page and previous on the first', () => {
    mockUsers.mockReturnValue(
      usersState({
        page: { ...usersState().page, nextCursor: null },
      }),
    );
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    expect(screen.getByRole('button', { name: 'pagination.next' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'pagination.previous' })).toBeDisabled();
  });

  it('shows the loading state', () => {
    mockUsers.mockReturnValue(usersState({ isLoading: true, page: null }));
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the error state with a retry that refetches', () => {
    const refetch = vi.fn();
    mockUsers.mockReturnValue(usersState({ isError: true, page: null, refetch }));
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    expect(screen.getByText('usageAnalytics.errorTitle')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state when nobody matches', () => {
    mockUsers.mockReturnValue(
      usersState({ page: { ...usersState().page, items: [], nextCursor: null, matchedUsers: 0 } }),
    );
    render(<UsersTab scope={scope()} onOpenUser={noop} t={t} />);
    expect(screen.getByText('usageAnalytics.empty')).toBeInTheDocument();
  });
});

describe('OverviewTab', () => {
  it('shows service status, the headline cards, and opens a top user', () => {
    mockTimeseries.mockReturnValue(timeseriesState());
    mockLeaderboard.mockReturnValue(
      leaderboardState([groupRow({ key: 'user-1', userId: 'user-1', email: FULL_EMAIL })]),
    );
    const onOpenUser = vi.fn();
    render(<OverviewTab scope={scope()} onOpenUser={onOpenUser} t={t} />);
    expect(screen.getByTestId('service-status')).toBeInTheDocument();
    expect(screen.getByTestId('metric-cards')).toBeInTheDocument();
    expect(screen.getByTestId('area-line-chart')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(onOpenUser).toHaveBeenCalledWith('user-1');
  });

  it('shows the empty state when the period has no usage', () => {
    mockTimeseries.mockReturnValue(
      timeseriesState({
        data: { ...timeseriesState().data, totals: metrics({ requests: 0 }), series: [] },
      }),
    );
    mockLeaderboard.mockReturnValue(leaderboardState([]));
    render(<OverviewTab scope={scope()} onOpenUser={noop} t={t} />);
    expect(screen.getAllByText('usageAnalytics.empty').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('metric-cards')).not.toBeInTheDocument();
  });

  it('shows an error with retry when the timeseries fails', () => {
    const refetch = vi.fn();
    mockTimeseries.mockReturnValue(timeseriesState({ data: null, isError: true, refetch }));
    mockLeaderboard.mockReturnValue(leaderboardState([]));
    render(<OverviewTab scope={scope()} onOpenUser={noop} t={t} />);
    fireEvent.click(screen.getAllByRole('button', { name: 'common.retry' })[0] as HTMLElement);
    expect(refetch).toHaveBeenCalled();
  });
});

describe('ConsumptionTab', () => {
  it('draws tokens, cost and billing charts and the workflow table', () => {
    mockTimeseries.mockReturnValue(timeseriesState());
    mockLeaderboard.mockReturnValue(leaderboardState([groupRow({ key: 'UNKNOWN' })]));
    render(<ConsumptionTab scope={scope()} t={t} />);
    expect(screen.getByTestId('stacked-bar-chart')).toBeInTheDocument();
    expect(screen.getByTestId('donut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('group-table')).toBeInTheDocument();
    expect(screen.getAllByText('observabilityExplorer.workflowUnknown').length).toBeGreaterThan(0);
  });

  it('warns that a partial cost understates spend', () => {
    const base = timeseriesState().data;
    mockTimeseries.mockReturnValue(
      timeseriesState({
        data: { ...base, totals: metrics({ cost: { ...metrics().cost, partial: true } }) },
      }),
    );
    mockLeaderboard.mockReturnValue(leaderboardState([]));
    render(<ConsumptionTab scope={scope()} t={t} />);
    expect(screen.getAllByText('observabilityExplorer.costPartial').length).toBeGreaterThan(0);
  });
});

describe('ModelsTab', () => {
  it('renders the provider and model tables, each with its own search', () => {
    mockLeaderboard.mockReturnValue(leaderboardState());
    render(<ModelsTab scope={scope()} t={t} />);
    expect(screen.getByText('observabilityExplorer.headingProviders')).toBeInTheDocument();
    expect(screen.getByText('usageAnalytics.modelsAllHeading')).toBeInTheDocument();
    expect(screen.getAllByTestId('group-table')).toHaveLength(2);
    expect(screen.getAllByLabelText('observabilityExplorer.searchLabel')).toHaveLength(2);
  });
});

function failuresState(overrides = {}) {
  return {
    controls: controls({ sort: 'count' }),
    includeSync: false,
    setIncludeSync: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    clamped: false,
    data: {
      from: 'a',
      to: 'b',
      hours: 24,
      includeSync: false,
      totals: { failures: 12, syncNoise: 30 },
      groups: {
        items: [
          {
            action: 'PROVIDER_ERROR',
            source: 'chat-service',
            severity: 'HIGH',
            isSyncNoise: false,
            count: 12,
            lastSeenAt: '2026-10-05T11:30:00.000Z',
          },
        ],
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      },
      bySource: [{ key: 'chat-service', label: 'chat-service', count: 12 }],
      topProviders: [{ key: 'GEMINI', label: 'Gemini', count: 7 }],
      topModels: [],
    },
    isLoading: false,
    isError: false,
    refetch: noop,
    ...overrides,
  };
}

describe('FailuresTab', () => {
  it('states the window it really shows, the totals, and the hidden sync noise', () => {
    mockFailures.mockReturnValue(failuresState());
    render(<FailuresTab scope={scope()} t={t} />);
    expect(screen.getByText(/observabilityExplorer.failuresWindow\|hours=24/u)).toBeInTheDocument();
    expect(screen.getByText(/failuresTotal\|count=12/u)).toBeInTheDocument();
    expect(screen.getByText(/failuresSyncHidden\|count=30/u)).toBeInTheDocument();
    expect(screen.getByText('PROVIDER_ERROR')).toBeInTheDocument();
    expect(screen.getByText('Gemini')).toBeInTheDocument();
  });

  it('says when the period was longer than this view can show', () => {
    mockFailures.mockReturnValue(failuresState({ clamped: true }));
    render(<FailuresTab scope={scope()} t={t} />);
    expect(screen.getByText(/observabilityExplorer.windowClamped/u)).toBeInTheDocument();
  });

  it('turns workspace-sync events on from the checkbox', () => {
    const state = failuresState();
    mockFailures.mockReturnValue(state);
    render(<FailuresTab scope={scope()} t={t} />);
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'observabilityExplorer.failuresIncludeSync' }),
    );
    expect(state.setIncludeSync).toHaveBeenCalledWith(true);
  });

  it('pages and searches', () => {
    const state = failuresState();
    mockFailures.mockReturnValue(state);
    render(<FailuresTab scope={scope()} t={t} />);
    fireEvent.click(screen.getByTestId('pagination-next'));
    expect(state.setPage).toHaveBeenCalledWith(3);
    fireEvent.change(screen.getByLabelText('observabilityExplorer.failuresSearch'), {
      target: { value: 'PROVIDER' },
    });
    expect(state.controls.setSearchDraft).toHaveBeenCalledWith('PROVIDER');
  });

  it('sorts by last seen from the header', () => {
    const state = failuresState();
    mockFailures.mockReturnValue(state);
    render(<FailuresTab scope={scope()} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.colLastSeen' }));
    expect(state.controls.toggleSort).toHaveBeenCalledWith('lastSeen');
  });

  it('shows loading, error and empty states', () => {
    mockFailures.mockReturnValue(failuresState({ isLoading: true, data: null }));
    const { rerender } = render(<FailuresTab scope={scope()} t={t} />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    mockFailures.mockReturnValue(failuresState({ isError: true, data: null }));
    rerender(<FailuresTab scope={scope()} t={t} />);
    expect(screen.getByText('usageAnalytics.errorTitle')).toBeInTheDocument();

    const empty = failuresState();
    mockFailures.mockReturnValue(
      failuresState({
        data: {
          ...empty.data,
          groups: { ...empty.data.groups, items: [], total: 0, totalPages: 0 },
        },
      }),
    );
    rerender(<FailuresTab scope={scope()} t={t} />);
    expect(screen.getAllByText('usageAnalytics.empty').length).toBeGreaterThan(0);
  });
});

function tracingState(overrides = {}) {
  return {
    controls: controls({ sort: 'requests' }),
    dimension: TracingDimension.Provider,
    setDimension: vi.fn(),
    page: 1,
    setPage: vi.fn(),
    clamped: false,
    data: {
      from: 'a',
      to: 'b',
      hours: 168,
      dimension: TracingDimension.Provider,
      overall: { requests: 100, measuredRequests: 90, p50LatencyMs: 800, p95LatencyMs: 2400 },
      rows: {
        items: [
          {
            key: 'GEMINI',
            label: 'Gemini',
            provider: 'GEMINI',
            model: null,
            requests: 60,
            measuredRequests: 55,
            avgLatencyMs: 900,
            p50LatencyMs: 800,
            p95LatencyMs: 2400,
            totalTokens: 12345,
            providerReportedRequests: 50,
            estimatedRequests: 10,
            failureEvents: null,
            errorRate: null,
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
      signals: [{ action: 'PROVIDER_FALLBACK', count: 4 }],
    },
    isLoading: false,
    isError: false,
    refetch: noop,
    ...overrides,
  };
}

describe('TracingTab', () => {
  it('shows latency percentiles, a dash for a missing error rate and the approximation note', () => {
    mockTracing.mockReturnValue(tracingState());
    render(<TracingTab scope={scope()} t={t} />);
    expect(screen.getByText('Gemini')).toBeInTheDocument();
    expect(screen.getAllByText('2,400 ms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('-').length).toBeGreaterThan(0);
    expect(screen.getByText('observabilityExplorer.tracingErrorRateNote')).toBeInTheDocument();
    expect(screen.getByText('PROVIDER_FALLBACK')).toBeInTheDocument();
  });

  it('switches the grouping', () => {
    const state = tracingState();
    mockTracing.mockReturnValue(state);
    render(<TracingTab scope={scope()} t={t} />);
    expect(
      screen.getByRole('button', { name: 'observabilityExplorer.tracingByProvider' }),
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.tracingByModel' }));
    expect(state.setDimension).toHaveBeenCalledWith(TracingDimension.Model);
  });

  it('sorts by p95 and searches', () => {
    const state = tracingState();
    mockTracing.mockReturnValue(state);
    render(<TracingTab scope={scope()} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'observabilityExplorer.colP95' }));
    expect(state.controls.toggleSort).toHaveBeenCalledWith('p95');
    fireEvent.change(screen.getByLabelText('observabilityExplorer.searchLabel'), {
      target: { value: 'gem' },
    });
    expect(state.controls.setSearchDraft).toHaveBeenCalledWith('gem');
  });

  it('shows the no-signals message and the error state', () => {
    const base = tracingState();
    mockTracing.mockReturnValue(tracingState({ data: { ...base.data, signals: [] } }));
    const { rerender } = render(<TracingTab scope={scope()} t={t} />);
    expect(screen.getByText('observabilityExplorer.tracingSignalsEmpty')).toBeInTheDocument();

    mockTracing.mockReturnValue(tracingState({ data: null, isError: true }));
    rerender(<TracingTab scope={scope()} t={t} />);
    expect(screen.getByText('usageAnalytics.errorTitle')).toBeInTheDocument();
  });
});
