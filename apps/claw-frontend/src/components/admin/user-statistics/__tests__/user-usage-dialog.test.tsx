import type { AdminUsageTokenWindow, AdminUserUsageStatistics } from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserUsageDialog } from '@/components/admin/user-statistics/user-usage-dialog';
import { useAdminUserUsage } from '@/hooks/admin/use-admin-user-usage';
import type { AdminUser } from '@/types/audit.types';

vi.mock('@/hooks/admin/use-admin-user-usage');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

const mockUseAdminUserUsage = vi.mocked(useAdminUserUsage);
const t = (key: string): string => key;

function makeUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u1',
    email: 'alice@example.com',
    username: 'alice',
    role: 'OPERATOR',
    status: 'ACTIVE',
    createdAt: '2026-05-01T00:00:00.000Z',
    activePlanId: null,
    isSuperAdmin: false,
    emailVerifiedAt: null,
    firstName: null,
    lastName: null,
    ...overrides,
  };
}

function makeWindow(overrides: Partial<AdminUsageTokenWindow> = {}): AdminUsageTokenWindow {
  return {
    periodKey: '2026-09-06',
    fromDate: '2026-09-06',
    throughDate: '2026-09-06',
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    requestCount: 0,
    ...overrides,
  };
}

function makeStatistics(
  overrides: Partial<AdminUserUsageStatistics> = {},
): AdminUserUsageStatistics {
  return {
    userId: 'u1',
    generatedAt: '2026-09-06T12:00:00.000Z',
    tokens: { day: makeWindow(), week: makeWindow(), month: makeWindow() },
    creditsByMonth: [],
    ...overrides,
  };
}

function mockState(overrides: Partial<ReturnType<typeof useAdminUserUsage>> = {}): void {
  mockUseAdminUserUsage.mockReturnValue({
    statistics: null,
    hasTokenUsage: false,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe('UserUsageDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing and never queries while closed with no user', () => {
    mockState();
    render(<UserUsageDialog open={false} user={null} onClose={vi.fn()} t={t} />);

    expect(screen.queryByText('admin.userUsageDialogTitle')).not.toBeInTheDocument();
    expect(mockUseAdminUserUsage).not.toHaveBeenCalled();
  });

  it('shows the loading state', () => {
    mockState({ isLoading: true });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userUsageLoading')).toBeInTheDocument();
  });

  it('shows the error state with a retry instead of an empty panel', () => {
    mockState({ isError: true });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userUsageErrorTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument();
  });

  // The state a reviewer will actually see on this environment: the credit
  // ledger holds no CONSUMPTION rows at all, so `creditsByMonth` is empty. It
  // must say so rather than showing a spinner or a fabricated zero row.
  it('states that no credit consumption is recorded rather than inventing a zero row', () => {
    mockState({ statistics: makeStatistics() });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userUsageNoCreditsTitle')).toBeInTheDocument();
    expect(screen.queryByText('admin.userUsageCreditsMonth')).not.toBeInTheDocument();
  });

  it('says no tokens were recorded when every window reads zero', () => {
    mockState({ statistics: makeStatistics(), hasTokenUsage: false });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userUsageNoTokensRecorded')).toBeInTheDocument();
  });

  it('renders all three token windows and the credit months when populated', () => {
    mockState({
      hasTokenUsage: true,
      statistics: makeStatistics({
        tokens: {
          day: makeWindow({ inputTokens: 10, outputTokens: 5, totalTokens: 15, requestCount: 2 }),
          week: makeWindow({ totalTokens: 4321, periodKey: '2026-W36' }),
          month: makeWindow({ totalTokens: 98765, periodKey: '2026-09' }),
        },
        creditsByMonth: [
          { monthKey: '2026-09', consumedMicroUsd: '2500000', entryCount: 3 },
          { monthKey: '2026-08', consumedMicroUsd: '125', entryCount: 1 },
        ],
      }),
    });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userUsageWindowDay')).toBeInTheDocument();
    expect(screen.getByText('admin.userUsageWindowWeek')).toBeInTheDocument();
    expect(screen.getByText('admin.userUsageWindowMonth')).toBeInTheDocument();
    expect(screen.queryByText('admin.userUsageNoTokensRecorded')).not.toBeInTheDocument();
    expect(screen.getByText('4,321')).toBeInTheDocument();
    expect(screen.getByText('98,765')).toBeInTheDocument();

    // Micro-USD arrives as a decimal STRING and is moved through BigInt, never
    // parsed into a float: 125 micro-USD is $0.000125, not $0.00 and not 125.
    expect(screen.getByText('USD 2.500000')).toBeInTheDocument();
    expect(screen.getByText('USD 0.000125')).toBeInTheDocument();
    expect(screen.queryByText('admin.userUsageNoCreditsTitle')).not.toBeInTheDocument();
  });

  it('queries the user the dialog was opened on', () => {
    mockState({ statistics: makeStatistics() });
    render(<UserUsageDialog open user={makeUser({ id: 'other-user' })} onClose={vi.fn()} t={t} />);

    expect(mockUseAdminUserUsage).toHaveBeenCalledWith('other-user');
  });

  // Rule 31: DialogContent already renders the one close control.
  it('does not render a second close button of its own', () => {
    mockState({ statistics: makeStatistics() });
    render(<UserUsageDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });
});
