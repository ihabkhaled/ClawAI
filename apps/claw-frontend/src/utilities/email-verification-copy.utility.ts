import { EmailVerificationOutcome } from '@/enums/email-verification-outcome.enum';
import type { EmailVerificationCopyKeys } from '@/types';

const COPY_BY_OUTCOME: Record<EmailVerificationOutcome, EmailVerificationCopyKeys> = {
  [EmailVerificationOutcome.Pending]: {
    titleKey: 'auth.verifyEmailPendingTitle',
    bodyKey: 'auth.verifyEmailPendingBody',
  },
  [EmailVerificationOutcome.Verified]: {
    titleKey: 'auth.verifyEmailVerifiedTitle',
    bodyKey: 'auth.verifyEmailVerifiedBody',
  },
  [EmailVerificationOutcome.AlreadyHandled]: {
    titleKey: 'auth.verifyEmailAlreadyActiveTitle',
    bodyKey: 'auth.verifyEmailAlreadyActiveBody',
  },
  [EmailVerificationOutcome.Failed]: {
    titleKey: 'auth.verifyEmailFailedTitle',
    bodyKey: 'auth.verifyEmailFailedBody',
  },
};

/** Maps a verification outcome to the copy the page shows. */
export function resolveEmailVerificationCopyKeys(
  outcome: EmailVerificationOutcome,
): EmailVerificationCopyKeys {
  return COPY_BY_OUTCOME[outcome];
}
