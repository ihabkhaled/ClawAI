import type { AdminUsageAnalytics } from '@claw/shared-types';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsageAnalyticsFilters } from '@/components/observability/usage-analytics/usage-analytics-filters';
import { UsageAnalyticsSection } from '@/components/observability/usage-analytics/usage-analytics-section';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { useUsageAnalytics } from '@/hooks/observability/use-usage-analytics';
import type {
  UsageFilterState,
  UseUsageAnalyticsReturn,
} from '@/types/admin-usage-analytics.types';

vi.mock('@/hooks/observability/use-usage-analytics');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

const mockHook = vi.mocked(useUsageAnalytics);
const t = (key: string): string => key;

const TOTALS = {
  requests: 4,
  inputTokens: 100,
  outputTokens: 50,
  weightedTokens: 150,
  costMicroUsd: '2500000',
};

const ANALYTICS: AdminUsageAnalytics = {
  from: '2026-10-05T00:00:00.000Z',
  to: '2026-10-05T12:00:00.000Z',
  generatedAt: '2026-10-05T12:00:00.000Z',
  grain: 'HOUR',
  userId: null,
  totals: TOTALS,
  today: { ...TOTALS, costMicroUsd: '1500000' },
  activeUsers: 2,
  series: [{ ...TOTALS, bucketStart: '2026-10-05T11:00:00.000Z' }],
  models: [
    {
      ...TOTALS,
      provider: 'GEMINI',
      model: 'gemini-x',
      creditRequests: 0,
      freeAllowanceRequests: 0,
    },
  ],
  topUsers: [{ ...TOTALS, userId: 'u1', maskedEmail: 'ja***@example.com' }],
  tools: [{ tool: 'WEB_SEARCH', count: 3 }],
  workflows: [{ workflow: 'CHAT', requests: 4 }],
  limit: 10,
};

function filterState(overrides: Partial<UsageFilterState> = {}): UsageFilterState {
  return {
    draft: { preset: UsageRangePreset.Hours, hours: 24, customFrom: '', customTo: '' },
    userIdDraft: '',
    issue: null,
    setPreset: vi.fn(),
    setHours: vi.fn(),
    setCustomFrom: vi.fn(),
    setCustomTo: vi.fn(),
    setUserIdDraft: vi.fn(),
    apply: vi.fn(),
    clearUser: vi.fn(),
    ...overrides,
  };
}

function hookState(overrides: Partial<UseUsageAnalyticsReturn> = {}): UseUsageAnalyticsReturn {
  return {
    ...filterState(),
    canView: true,
    applied: { preset: UsageRangePreset.Today, hours: 24, customFrom: '', customTo: '' },
    appliedUserId: '',
    analytics: ANALYTICS,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  };
}

describe('UsageAnalyticsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing for an actor without ADMIN_USAGE_VIEW', () => {
    mockHook.mockReturnValue(hookState({ canView: false, analytics: null }));
    const { container } = render(<UsageAnalyticsSection />);
    expect(container.innerHTML).toBe('');
  });

  it('shows USD today, the models, top users and top tools', () => {
    mockHook.mockReturnValue(hookState());
    render(<UsageAnalyticsSection />);
    expect(screen.getByText('USD 1.500000')).toBeTruthy();
    expect(screen.getByText('gemini-x')).toBeTruthy();
    expect(screen.getByText('ja***@example.com')).toBeTruthy();
    expect(screen.getByText('usageAnalytics.tools.WEB_SEARCH')).toBeTruthy();
  });

  it('hides the top-users card when the view is filtered to one user', () => {
    mockHook.mockReturnValue(
      hookState({ analytics: { ...ANALYTICS, userId: 'u1', topUsers: [] } }),
    );
    render(<UsageAnalyticsSection />);
    expect(screen.queryByText('usageAnalytics.topUsersHeading')).toBeNull();
  });

  it('offers a retry when the query failed', () => {
    const refetch = vi.fn();
    mockHook.mockReturnValue(hookState({ isError: true, analytics: null, refetch }));
    render(<UsageAnalyticsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe('UsageAnalyticsFilters', () => {
  it('disables Apply and announces the problem while the draft is invalid', () => {
    render(
      <UsageAnalyticsFilters state={filterState({ issue: 'usageAnalytics.errorHours' })} t={t} />,
    );
    expect(
      (screen.getByRole('button', { name: 'usageAnalytics.apply' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('usageAnalytics.errorHours');
  });

  it('shows date inputs for a custom period and hours for the hours preset', () => {
    const { rerender } = render(<UsageAnalyticsFilters state={filterState()} t={t} />);
    expect(screen.getByLabelText('usageAnalytics.hoursLabel')).toBeTruthy();
    rerender(
      <UsageAnalyticsFilters
        state={filterState({
          draft: { preset: UsageRangePreset.Custom, hours: 24, customFrom: '', customTo: '' },
        })}
        t={t}
      />,
    );
    expect(screen.getByLabelText('usageAnalytics.fromLabel')).toBeTruthy();
    expect(screen.getByLabelText('usageAnalytics.toLabel')).toBeTruthy();
  });

  it('submits through Apply and clears a typed user', () => {
    const state = filterState({ userIdDraft: 'u1' });
    render(<UsageAnalyticsFilters state={state} t={t} />);
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.apply' }));
    expect(state.apply).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'usageAnalytics.clearUser' }));
    expect(state.clearUser).toHaveBeenCalled();
  });
});
