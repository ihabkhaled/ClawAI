'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS } from '@/constants/email-change.constants';
import { EmailChangeStage } from '@/enums';
import type { UseEmailChangeCooldownReturn } from '@/types';

export function useEmailChangeCooldown(
  rehydratedStage: EmailChangeStage | null,
): UseEmailChangeCooldownReturn {
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const rehydrated = useRef(false);

  const startResendCooldown = useCallback(() => {
    setResendCooldownSeconds(EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS);
  }, []);

  useEffect(() => {
    if (resendCooldownSeconds <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setResendCooldownSeconds((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldownSeconds]);

  // A rehydrated pending request carries no record of when its last code was
  // sent, so the cooldown restarts once to stop an immediate resend burst.
  useEffect(() => {
    if (rehydrated.current || rehydratedStage !== EmailChangeStage.OldEmailPending) {
      return;
    }

    rehydrated.current = true;
    startResendCooldown();
  }, [rehydratedStage, startResendCooldown]);

  return {
    resendCooldownSeconds,
    startResendCooldown,
  };
}
