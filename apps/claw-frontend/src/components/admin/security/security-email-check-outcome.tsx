'use client';

import { EMAIL_CHECK_TONE_CLASS_NAMES } from '@/constants/admin-security-settings.constants';
import { cn } from '@/lib/utils';
import type { SecurityEmailCheckOutcomeProps } from '@/types/admin-security-settings.types';

/** The address check's answer: the domain the server read, then the verdict in plain words. */
export function SecurityEmailCheckOutcome({
  outcome,
  t,
}: SecurityEmailCheckOutcomeProps): React.ReactElement {
  return (
    <p
      className={cn('text-sm font-medium', EMAIL_CHECK_TONE_CLASS_NAMES[outcome.tone])}
      data-testid="security-email-check-outcome"
      data-tone={outcome.tone}
    >
      {outcome.domain === null ? null : (
        <span className="text-foreground me-2 font-mono break-all">{outcome.domain}</span>
      )}
      {t(outcome.messageKey)}
    </p>
  );
}
