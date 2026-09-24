import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { MILLISECONDS_PER_TRIAL_DAY } from '@/constants/trial-status.constants';
import { TrialBannerDismissalChoice } from '@/enums/trial-banner-dismissal.enum';
import { useTrialBannerDismissal } from '@/hooks/layout/use-trial-banner-dismissal';

const authState = { user: { id: 'user-a' } as { id: string } | null };

vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: typeof authState) => unknown) => selector(authState),
}));

describe('useTrialBannerDismissal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-24T12:00:00.000Z'));
    authState.user = { id: 'user-a' };
  });

  afterEach(() => {
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it('hides forever for this user and not for another user', () => {
    const { result } = renderHook(() => useTrialBannerDismissal(20));
    expect(result.current.isSuppressed).toBe(false);

    act(() => result.current.dismiss(TrialBannerDismissalChoice.HIDE_FOREVER));
    expect(result.current.isSuppressed).toBe(true);

    authState.user = { id: 'user-b' };
    const other = renderHook(() => useTrialBannerDismissal(20));
    expect(other.result.current.isSuppressed).toBe(false);
  });

  it('brings the banner back once a 1-day snooze expires', () => {
    const { result, rerender } = renderHook(() => useTrialBannerDismissal(20));
    act(() => result.current.dismiss(TrialBannerDismissalChoice.REMIND_IN_ONE_DAY));
    expect(result.current.isSuppressed).toBe(true);

    vi.setSystemTime(Date.now() + MILLISECONDS_PER_TRIAL_DAY);
    rerender();
    expect(result.current.isSuppressed).toBe(false);
  });

  it('reappears near trial end even while snoozed', () => {
    const { result, rerender } = renderHook(({ days }) => useTrialBannerDismissal(days), {
      initialProps: { days: 5 },
    });
    act(() => result.current.dismiss(TrialBannerDismissalChoice.REMIND_IN_SEVEN_DAYS));
    expect(result.current.isSuppressed).toBe(true);

    rerender({ days: 3 });
    expect(result.current.isSuppressed).toBe(false);
  });

  it('never suppresses a banner that is not dismissible', () => {
    const { result } = renderHook(() => useTrialBannerDismissal(null));
    act(() => result.current.dismiss(TrialBannerDismissalChoice.HIDE_FOREVER));
    expect(result.current.isSuppressed).toBe(false);
  });

  it('does nothing without a signed-in user', () => {
    authState.user = null;
    const { result } = renderHook(() => useTrialBannerDismissal(20));
    act(() => result.current.dismiss(TrialBannerDismissalChoice.HIDE_FOREVER));
    expect(result.current.isSuppressed).toBe(false);
    expect(window.localStorage.length).toBe(0);
  });
});
