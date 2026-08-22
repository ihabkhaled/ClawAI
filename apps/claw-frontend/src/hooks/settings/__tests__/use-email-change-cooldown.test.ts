import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS } from '@/constants/email-change.constants';
import { EmailChangeStage } from '@/enums';

import { useEmailChangeCooldown } from '../use-email-change-cooldown';

describe('useEmailChangeCooldown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with a cooldown of 0 when the rehydrated stage is null', () => {
    const { result } = renderHook(() => useEmailChangeCooldown(null));
    expect(result.current.resendCooldownSeconds).toBe(0);
  });

  it('should set the cooldown to 60 seconds when startResendCooldown is called', () => {
    const { result } = renderHook(() => useEmailChangeCooldown(null));
    act(() => {
      result.current.startResendCooldown();
    });
    expect(result.current.resendCooldownSeconds).toBe(EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS);
  });

  it('should count down by 1 per second and stop at 0', () => {
    const { result } = renderHook(() => useEmailChangeCooldown(null));

    act(() => {
      result.current.startResendCooldown();
    });
    expect(result.current.resendCooldownSeconds).toBe(60);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(59);

    act(() => {
      vi.advanceTimersByTime(59 * 1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(0);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(0);
  });

  it('should automatically start the cooldown if the rehydrated stage is OldEmailPending', () => {
    const { result } = renderHook(() => useEmailChangeCooldown(EmailChangeStage.OldEmailPending));
    expect(result.current.resendCooldownSeconds).toBe(EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(59);
  });

  it('should not start the cooldown if the rehydrated stage is NewEmailPending', () => {
    const { result } = renderHook(() => useEmailChangeCooldown(EmailChangeStage.NewEmailPending));
    expect(result.current.resendCooldownSeconds).toBe(0);
  });

  it('should only start the cooldown automatically once, even on re-render', () => {
    const { result, rerender } = renderHook(
      ({ rehydratedStage }) => useEmailChangeCooldown(rehydratedStage),
      {
        initialProps: { rehydratedStage: EmailChangeStage.OldEmailPending },
      },
    );

    expect(result.current.resendCooldownSeconds).toBe(60);

    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(30);

    rerender({ rehydratedStage: EmailChangeStage.OldEmailPending });
    expect(result.current.resendCooldownSeconds).toBe(30);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.resendCooldownSeconds).toBe(29);
  });
});
