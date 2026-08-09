import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrialStatus } from '@/enums/trial-status.enum';
import { useTrialStatusBanner } from '@/hooks/layout/use-trial-status-banner';
import type { UserEntitlements } from '@/types';

const mockUseEntitlements = vi.fn();

vi.mock('@/hooks/plans/use-entitlements', () => ({
  useEntitlements: () => mockUseEntitlements(),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    locale: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}:${JSON.stringify(params)}`,
  }),
}));

const entitlement = (plan: UserEntitlements['plan']): UserEntitlements =>
  ({ isAdmin: false, plan }) as UserEntitlements;

describe('useTrialStatusBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-09T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns active trial copy and upgrade route from backend trial state', () => {
    mockUseEntitlements.mockReturnValue({
      entitlements: entitlement({
        isTrial: true,
        trialEndsAt: '2026-08-11T00:00:00.000Z',
        isTrialExpired: false,
      } as UserEntitlements['plan']),
    });

    const { result } = renderHook(() => useTrialStatusBanner());

    expect(result.current.status).toBe(TrialStatus.ACTIVE);
    if (result.current.status !== TrialStatus.ACTIVE) {
      throw new Error('Expected active trial banner');
    }
    expect(result.current.body).toContain('"days":2');
    expect(result.current.upgradeHref).toBe('/billing');
  });

  it('returns expired state only when the backend marks the trial expired', () => {
    mockUseEntitlements.mockReturnValue({
      entitlements: entitlement({
        isTrial: true,
        trialEndsAt: '2026-08-09T00:00:00.000Z',
        isTrialExpired: true,
      } as UserEntitlements['plan']),
    });

    const { result } = renderHook(() => useTrialStatusBanner());
    expect(result.current.status).toBe(TrialStatus.EXPIRED);
    if (result.current.status !== TrialStatus.EXPIRED) {
      throw new Error('Expected expired trial banner');
    }
    expect(result.current.title).toBe('trialStatus.expiredTitle');
  });

  it('hides for non-trial paid plans and admin bypass', () => {
    mockUseEntitlements.mockReturnValue({ entitlements: entitlement(null) });
    const paid = renderHook(() => useTrialStatusBanner());
    expect(paid.result.current.status).toBe(TrialStatus.HIDDEN);

    mockUseEntitlements.mockReturnValue({
      entitlements: {
        ...entitlement({ isTrial: true, isTrialExpired: true } as UserEntitlements['plan']),
        isAdmin: true,
      },
    });
    const admin = renderHook(() => useTrialStatusBanner());
    expect(admin.result.current.status).toBe(TrialStatus.HIDDEN);
  });
});
