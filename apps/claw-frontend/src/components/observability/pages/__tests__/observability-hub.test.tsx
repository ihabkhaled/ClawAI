import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ObservabilityHub } from '@/components/observability/pages/observability-hub';
import { useObservabilityOverview } from '@/hooks/observability/use-observability-overview';
import { useObservabilityPreview } from '@/hooks/observability/use-observability-preview';

import { obsOverview, obsRow, scopeContext, userObsRow } from './pages-fixtures';
import { renderInScope } from './pages-test-utils';

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined
        ? key
        : `${key}|${Object.entries(params)
            .map(([name, value]) => `${name}=${String(value)}`)
            .join(',')}`,
    locale: 'en',
    dir: 'ltr',
  }),
}));
vi.mock('@/hooks/observability/use-observability-overview');
vi.mock('@/hooks/observability/use-observability-preview');
vi.mock('@/hooks/observability/use-service-status', () => ({ useServiceStatus: () => ({}) }));
vi.mock('@/components/observability/service-status-section', () => ({
  ServiceStatusSection: () => <div data-testid="service-status" />,
}));

const mockOverview = vi.mocked(useObservabilityOverview);
const mockPreview = vi.mocked(useObservabilityPreview);

function overviewState(overrides = {}) {
  return {
    top: 10,
    setTop: vi.fn(),
    overview: obsOverview(),
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockOverview.mockReturnValue(overviewState());
  mockPreview.mockImplementation((kind) => ({
    rows: kind === 'users' ? [userObsRow()] : [obsRow()],
    total: kind === 'users' ? 1204 : 8,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }));
});

describe('ObservabilityHub', () => {
  it('shows service status, the headline cards, the charts and the health card', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(screen.getByTestId('service-status')).toBeInTheDocument();
    expect(screen.getByTestId('kpi-grid')).toBeInTheDocument();
    expect(screen.getByTestId('overview-charts')).toBeInTheDocument();
    expect(screen.getByTestId('health-card')).toBeInTheDocument();
  });

  it('compares every headline number with the previous period', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    const grid = screen.getByTestId('kpi-grid');
    expect(
      within(grid).getByText('observabilityPages.vsPrevious|change=+20.0%'),
    ).toBeInTheDocument();
    expect(
      within(grid).getByText('observabilityPages.vsPrevious|change=-3.9%'),
    ).toBeInTheDocument();
    expect(within(grid).getAllByText('observabilityPages.vsPrevious|change=-').length).toBe(1);
    expect(within(grid).getAllByText('observabilityPages.change_up')).toHaveLength(2);
    expect(within(grid).getByText('observabilityPages.change_down')).toBeInTheDocument();
  });

  it('shows a dash, not 0, for an average token count the server could not compute', () => {
    const overview = obsOverview();
    mockOverview.mockReturnValue(
      overviewState({
        overview: {
          ...overview,
          totals: {
            ...overview.totals,
            derived: { ...overview.totals.derived, avgInputTokens: null, avgOutputTokens: 7 },
          },
        },
      }),
    );
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(
      screen.getByText('observabilityPages.cardCostPerRequestHint|input=-,output=7'),
    ).toBeInTheDocument();
  });

  it('says the new sign-ups figure ignores the filters', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(screen.getByText('observabilityPages.cardNewSignupsHint')).toBeInTheDocument();
    expect(screen.getByText('observabilityPages.cardNewSignups')).toBeInTheDocument();
  });

  it('states both periods it compares', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(
      screen.getByText(
        /rangeSummary\|from=2026-10-01 00:00,to=2026-10-08 00:00,previousFrom=2026-09-24 00:00/u,
      ),
    ).toBeInTheDocument();
  });

  it('previews users, models, providers and plans, each with "View all N" and the real total', () => {
    renderInScope(<ObservabilityHub />, scopeContext('period=30d&provider=GEMINI'));
    const links = screen.getAllByRole('link', { name: /observabilityPages\.viewAll/u });
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/observability/users?period=30d&provider=GEMINI',
      '/observability/models?period=30d&provider=GEMINI',
      '/observability/providers?period=30d&provider=GEMINI',
      '/observability/plans?period=30d&provider=GEMINI',
    ]);
    expect(links[0]).toHaveTextContent(`(${(1204).toLocaleString()})`);
    expect(links[1]).toHaveTextContent('(8)');
  });

  it('shows no count on "View all" until the total is known, never a made-up (0)', () => {
    mockPreview.mockImplementation(() => ({
      rows: null,
      total: null,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    }));
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    const links = screen.getAllByRole('link', { name: /observabilityPages\.viewAll/u });
    expect(links).toHaveLength(4);
    for (const link of links) {
      expect(link).toHaveTextContent(/^observabilityPages\.viewAll$/u);
    }
  });

  it('asks every preview for the chosen size, not a hardcoded five', () => {
    mockOverview.mockReturnValue(overviewState({ top: 25 }));
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(mockPreview).toHaveBeenCalledWith('users', 25);
    expect(mockPreview).toHaveBeenCalledWith('models', 25);
    expect(mockPreview).toHaveBeenCalledWith('providers', 25);
    expect(mockPreview).toHaveBeenCalledWith('plans', 25);
  });

  it('lets the operator pick the preview size', () => {
    const state = overviewState({ top: 10 });
    mockOverview.mockReturnValue(state);
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(screen.getByRole('button', { name: '10' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: '50' }));
    expect(state.setTop).toHaveBeenCalledWith(50);
    for (const size of ['5', '10', '25', '50']) {
      expect(screen.getByRole('button', { name: size })).toBeInTheDocument();
    }
  });

  it('opens a user from a preview through the URL writer', () => {
    const value = scopeContext('period=7d');
    renderInScope(<ObservabilityHub />, value);
    fireEvent.click(screen.getByRole('button', { name: /openUser/u }));
    expect(value.openUser).toHaveBeenCalledWith('user-1');
  });

  it('shows the empty state, not zero-filled cards, when the period has no usage', () => {
    mockOverview.mockReturnValue(
      overviewState({
        overview: obsOverview({
          totals: {
            ...obsOverview().totals,
            metrics: { ...obsOverview().totals.metrics, requests: 0 },
          },
        }),
      }),
    );
    renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    expect(screen.queryByTestId('kpi-grid')).not.toBeInTheDocument();
    expect(screen.getByText('usageAnalytics.empty')).toBeInTheDocument();
  });

  it('shows an error with a retry that refetches, and a loading state', () => {
    const refetch = vi.fn();
    mockOverview.mockReturnValue(overviewState({ overview: null, isError: true, refetch }));
    const { rerender } = renderInScope(<ObservabilityHub />, scopeContext('period=7d'));
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();

    mockOverview.mockReturnValue(overviewState({ overview: null, isLoading: true }));
    rerender(<ObservabilityHub />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});
