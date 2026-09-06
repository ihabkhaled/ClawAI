import type {
  AdminUserPlanOverview,
  AdminUserSubscriptionSnapshot,
  AdminUserSubscriptionStatistics,
} from '@claw/shared-types';
import {
  AdminUserTrialState,
  BillingInterval,
  InvoiceStatus,
  SubscriptionStatus,
} from '@claw/shared-types';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UserSubscriptionDialog } from '@/components/admin/user-statistics/user-subscription-dialog';
import { useAdminUserSubscription } from '@/hooks/admin/use-admin-user-subscription';
import type { AdminUser } from '@/types/audit.types';

vi.mock('@/hooks/admin/use-admin-user-subscription');
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' }),
}));

const mockUseAdminUserSubscription = vi.mocked(useAdminUserSubscription);
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

function makePlanOverview(overrides: Partial<AdminUserPlanOverview> = {}): AdminUserPlanOverview {
  return {
    userId: 'u1',
    generatedAt: '2026-09-06T12:00:00.000Z',
    plan: null,
    assignment: null,
    trial: null,
    ...overrides,
  };
}

function makeStatistics(
  overrides: Partial<AdminUserSubscriptionStatistics> = {},
): AdminUserSubscriptionStatistics {
  return {
    userId: 'u1',
    generatedAt: '2026-09-06T12:00:00.000Z',
    subscription: null,
    periodLengthMonths: null,
    nextRenewalAt: null,
    monthsPaid: 0,
    totalPaidMinor: [],
    subscriptionHistory: [],
    recentInvoices: [],
    ...overrides,
  };
}

function makeSubscription(
  overrides: Partial<AdminUserSubscriptionSnapshot> = {},
): AdminUserSubscriptionSnapshot {
  return {
    id: 'sub-1',
    planId: 'plan-1',
    planSlug: 'pro',
    status: SubscriptionStatus.ACTIVE,
    billingInterval: BillingInterval.MONTHLY,
    currency: 'USD',
    amountMinor: 1_500,
    currentPeriodStart: '2026-09-01T00:00:00.000Z',
    currentPeriodEnd: '2026-10-01T00:00:00.000Z',
    cancelAtPeriodEnd: false,
    cancelledAt: null,
    pastDueAt: null,
    gracePeriodEndsAt: null,
    entitlementValidUntil: '2026-10-01T00:00:00.000Z',
    scheduledPlanSlug: null,
    scheduledEffectiveAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function mockState(overrides: Partial<ReturnType<typeof useAdminUserSubscription>> = {}): void {
  mockUseAdminUserSubscription.mockReturnValue({
    planOverview: null,
    subscriptionStatistics: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
    ...overrides,
  });
}

describe('UserSubscriptionDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing and never queries while closed with no user', () => {
    mockState();
    render(<UserSubscriptionDialog open={false} user={null} onClose={vi.fn()} t={t} />);

    expect(screen.queryByText('admin.userSubscriptionDialogTitle')).not.toBeInTheDocument();
    expect(mockUseAdminUserSubscription).not.toHaveBeenCalled();
  });

  it('shows the loading state', () => {
    mockState({ isLoading: true });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionLoading')).toBeInTheDocument();
  });

  it('shows the error state with a retry', () => {
    mockState({ isError: true });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionErrorTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.retry' })).toBeInTheDocument();
  });

  // Half an answer is worse than none: the plan half loading while the money
  // half failed would read as "this user has never paid".
  it('treats either half failing as one error rather than rendering the other half', () => {
    mockState({ isError: true, planOverview: makePlanOverview() });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionErrorTitle')).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionPlanHeading')).not.toBeInTheDocument();
  });

  // A free user is a normal state, not a failure.
  it('reports a free account as having no subscription rather than as an error', () => {
    mockState({ planOverview: makePlanOverview(), subscriptionStatistics: makeStatistics() });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionNoneTitle')).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionErrorTitle')).not.toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionNoHistoryTitle')).toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionNoInvoicesTitle')).toBeInTheDocument();
  });

  // The load-bearing one: `nextRenewalAt` is null whenever the account will NOT
  // be charged again. `currentPeriodEnd` still has a value there, so publishing
  // it would tell an operator a churned customer is about to pay again.
  it('renders "will not renew" for a null next renewal, never a blank or the period end', () => {
    mockState({
      planOverview: makePlanOverview(),
      subscriptionStatistics: makeStatistics({
        subscription: makeSubscription({
          status: SubscriptionStatus.CANCEL_AT_PERIOD_END,
          cancelAtPeriodEnd: true,
        }),
        periodLengthMonths: 1,
        nextRenewalAt: null,
      }),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionWillNotRenew')).toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionWillNotRenewDescription')).toBeInTheDocument();
  });

  it('renders the real renewal date when the account will be charged again', () => {
    mockState({
      planOverview: makePlanOverview(),
      subscriptionStatistics: makeStatistics({
        subscription: makeSubscription(),
        periodLengthMonths: 1,
        nextRenewalAt: '2026-10-01T00:00:00.000Z',
      }),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.queryByText('admin.userSubscriptionWillNotRenew')).not.toBeInTheDocument();
    expect(
      screen.getByText(new Date('2026-10-01T00:00:00.000Z').toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it('renders plan name, trial days remaining, months paid and period length', () => {
    mockState({
      planOverview: makePlanOverview({
        plan: { id: 'p1', slug: 'pro', name: 'Pro', isTrial: false, trialDurationDays: null },
        assignment: {
          status: 'ACTIVE',
          grantType: 'PAID_SUBSCRIPTION',
          grantReason: null,
          startsAt: '2026-05-01T00:00:00.000Z',
          endsAt: null,
          entitlementValidUntil: null,
          sourceSubscriptionId: 'sub-1',
        },
        trial: {
          startedAt: '2026-04-01T00:00:00.000Z',
          expiresAt: '2026-09-20T00:00:00.000Z',
          daysRemaining: 14,
          state: AdminUserTrialState.ACTIVE,
          isExpired: false,
        },
      }),
      subscriptionStatistics: makeStatistics({
        subscription: makeSubscription(),
        periodLengthMonths: 3,
        nextRenewalAt: '2026-12-01T00:00:00.000Z',
        monthsPaid: 7,
        totalPaidMinor: [
          { currency: 'USD', amountMinor: 10_500 },
          { currency: 'EGP', amountMinor: 250_000 },
        ],
      }),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionPeriodLengthValue')).toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionTrialDaysRemaining')).toBeInTheDocument();
    expect(screen.getByText('admin.userSubscriptionNeverExpires')).toBeInTheDocument();

    // Never summed across currencies — one blended total means nothing.
    expect(screen.getByText(/\$105\.00/u)).toBeInTheDocument();
  });

  it('marks an ended trial as expired instead of reporting zero days left', () => {
    mockState({
      planOverview: makePlanOverview({
        trial: {
          startedAt: '2026-04-01T00:00:00.000Z',
          expiresAt: '2026-05-01T00:00:00.000Z',
          daysRemaining: 0,
          state: AdminUserTrialState.EXPIRED,
          isExpired: true,
        },
      }),
      subscriptionStatistics: makeStatistics(),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionTrialExpired')).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionTrialDaysRemaining')).not.toBeInTheDocument();
  });

  it('renders subscription and invoice history when present', () => {
    mockState({
      planOverview: makePlanOverview(),
      subscriptionStatistics: makeStatistics({
        subscription: makeSubscription(),
        periodLengthMonths: 1,
        subscriptionHistory: [
          {
            id: 'sub-old',
            planSlug: 'starter',
            status: SubscriptionStatus.CANCELLED,
            billingInterval: BillingInterval.YEARLY,
            amountMinor: 9_900,
            currency: 'USD',
            createdAt: '2025-01-01T00:00:00.000Z',
            currentPeriodStart: '2025-01-01T00:00:00.000Z',
            currentPeriodEnd: '2026-01-01T00:00:00.000Z',
            cancelledAt: '2025-06-01T00:00:00.000Z',
          },
        ],
        recentInvoices: [
          {
            id: 'inv-1',
            number: 'CLAW-00000003',
            status: InvoiceStatus.PAID,
            currency: 'USD',
            totalMinor: 1_500,
            amountPaidMinor: 1_500,
            periodStart: '2026-09-01T00:00:00.000Z',
            periodEnd: '2026-10-01T00:00:00.000Z',
            issuedAt: '2026-09-01T00:00:00.000Z',
            paidAt: '2026-09-01T00:00:00.000Z',
          },
        ],
      }),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('starter')).toBeInTheDocument();
    expect(screen.getByText('CLAW-00000003')).toBeInTheDocument();
    expect(screen.getByText(InvoiceStatus.PAID)).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionNoHistoryTitle')).not.toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionNoInvoicesTitle')).not.toBeInTheDocument();
  });

  it('queries the user the dialog was opened on', () => {
    mockState({ planOverview: makePlanOverview(), subscriptionStatistics: makeStatistics() });
    render(
      <UserSubscriptionDialog open user={makeUser({ id: 'other-user' })} onClose={vi.fn()} t={t} />,
    );

    expect(mockUseAdminUserSubscription).toHaveBeenCalledWith('other-user');
  });

  it('does not render a second close button of its own', () => {
    mockState({ planOverview: makePlanOverview(), subscriptionStatistics: makeStatistics() });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1);
  });
  // ── Reported 2026-09-06 ───────────────────────────────────────────────────
  // An operator granted magdy.abass the Pro plan for a year. The panel kept
  // reporting "Free trial — 23 days left" beside the grant, because the trial
  // redemption it reads outlives the assignment that created it and goes on
  // counting down. Two separate lies in one panel: a live trial that had been
  // replaced, and "an ordinary free account" describing a granted Pro user.
  it('does not report a live countdown for a trial an admin grant replaced', () => {
    mockState({
      planOverview: makePlanOverview({
        plan: { id: 'p1', slug: 'pro', name: 'Pro', isTrial: false, trialDurationDays: null },
        assignment: {
          status: 'ACTIVE',
          grantType: 'ADMIN_GRANT',
          grantReason: 'for free',
          startsAt: '2026-09-06T14:04:37.000Z',
          endsAt: null,
          entitlementValidUntil: '2027-09-06T14:04:37.000Z',
          sourceSubscriptionId: null,
        },
        trial: {
          startedAt: '2026-08-30T11:15:03.000Z',
          expiresAt: '2026-09-29T11:14:53.000Z',
          daysRemaining: 23,
          isExpired: false,
          state: AdminUserTrialState.SUPERSEDED,
        },
      }),
      subscriptionStatistics: makeStatistics(),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionTrialSuperseded')).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionTrialDaysRemaining')).not.toBeInTheDocument();
  });

  it('does not call an admin-granted account an ordinary free account', () => {
    mockState({
      planOverview: makePlanOverview({
        assignment: {
          status: 'ACTIVE',
          grantType: 'ADMIN_GRANT',
          grantReason: 'for free',
          startsAt: '2026-09-06T14:04:37.000Z',
          endsAt: null,
          entitlementValidUntil: '2027-09-06T14:04:37.000Z',
          sourceSubscriptionId: null,
        },
      }),
      // No subscription: an admin grant never creates one, and never will.
      subscriptionStatistics: makeStatistics(),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionGrantedNoneDescription')).toBeInTheDocument();
    expect(screen.queryByText('admin.userSubscriptionNoneDescription')).not.toBeInTheDocument();
  });

  it('still calls a genuinely free account a free account', () => {
    mockState({
      planOverview: makePlanOverview({
        assignment: {
          status: 'ACTIVE',
          grantType: 'FREE_DEFAULT',
          grantReason: null,
          startsAt: '2026-08-30T11:15:03.000Z',
          endsAt: null,
          entitlementValidUntil: null,
          sourceSubscriptionId: null,
        },
      }),
      subscriptionStatistics: makeStatistics(),
    });
    render(<UserSubscriptionDialog open user={makeUser()} onClose={vi.fn()} t={t} />);

    expect(screen.getByText('admin.userSubscriptionNoneDescription')).toBeInTheDocument();
    expect(
      screen.queryByText('admin.userSubscriptionGrantedNoneDescription'),
    ).not.toBeInTheDocument();
  });
});
