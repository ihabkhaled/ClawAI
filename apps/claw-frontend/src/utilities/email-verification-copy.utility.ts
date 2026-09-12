import { EmailVerificationOutcome } from '@/enums/email-verification-outcome.enum';
import { EmailVerificationTone } from '@/enums/email-verification-tone.enum';
import type { EmailVerificationCopyKeys, EmailVerificationPanelCopy } from '@/types';

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

/**
 * The fuller copy the verification page actually renders.
 *
 * The original title+body pair was the whole page: a heading, one sentence, and
 * a button. That is enough to state an outcome and not enough to act on one —
 * somebody whose link had expired was told "It may have expired. Sign in and
 * request a new one", with no way to request one from that page. `detailKey`
 * carries what happens next, and `secondaryActionKey` is the second route out
 * for the outcomes where the primary button is not the right answer.
 */
const PANEL_COPY_BY_OUTCOME: Record<EmailVerificationOutcome, EmailVerificationPanelCopy> = {
  [EmailVerificationOutcome.Pending]: {
    titleKey: 'auth.verifyEmailPendingTitle',
    bodyKey: 'auth.verifyEmailPendingBody',
    detailKey: 'auth.verifyEmailPendingDetail',
    primaryActionKey: 'auth.signInLink',
    secondaryActionKey: null,
  },
  [EmailVerificationOutcome.Verified]: {
    titleKey: 'auth.verifyEmailVerifiedTitle',
    bodyKey: 'auth.verifyEmailVerifiedBody',
    detailKey: 'auth.verifyEmailVerifiedDetail',
    primaryActionKey: 'auth.verifyEmailVerifiedAction',
    secondaryActionKey: null,
  },
  [EmailVerificationOutcome.AlreadyHandled]: {
    titleKey: 'auth.verifyEmailAlreadyActiveTitle',
    bodyKey: 'auth.verifyEmailAlreadyActiveBody',
    detailKey: 'auth.verifyEmailAlreadyActiveDetail',
    primaryActionKey: 'auth.verifyEmailVerifiedAction',
    // A used link and an activated account look identical from here, so the
    // page offers the password-reset route as well: if the account IS active
    // and the password is the thing they have lost, that is the real fix.
    secondaryActionKey: 'auth.verifyEmailAlreadyActiveSecondary',
  },
  [EmailVerificationOutcome.Failed]: {
    titleKey: 'auth.verifyEmailFailedTitle',
    bodyKey: 'auth.verifyEmailFailedBody',
    detailKey: 'auth.verifyEmailFailedDetail',
    primaryActionKey: 'auth.verifyEmailVerifiedAction',
    secondaryActionKey: 'auth.verifyEmailFailedSecondary',
  },
};

/** Maps a verification outcome to the copy the page shows. */
export function resolveEmailVerificationCopyKeys(
  outcome: EmailVerificationOutcome,
): EmailVerificationCopyKeys {
  return COPY_BY_OUTCOME[outcome];
}

/** Maps a verification outcome to the full panel copy, including next steps. */
export function resolveEmailVerificationPanelCopy(
  outcome: EmailVerificationOutcome,
): EmailVerificationPanelCopy {
  return PANEL_COPY_BY_OUTCOME[outcome];
}

const TONE_BY_OUTCOME: Record<EmailVerificationOutcome, EmailVerificationTone> = {
  [EmailVerificationOutcome.Pending]: EmailVerificationTone.Pending,
  [EmailVerificationOutcome.Verified]: EmailVerificationTone.Success,
  // Neither green nor red: a link that was already used often means the
  // account is perfectly fine, so this state must not congratulate OR alarm.
  [EmailVerificationOutcome.AlreadyHandled]: EmailVerificationTone.Neutral,
  [EmailVerificationOutcome.Failed]: EmailVerificationTone.Failure,
};

/** The visual register one outcome is shown in. */
export function resolveEmailVerificationTone(
  outcome: EmailVerificationOutcome,
): EmailVerificationTone {
  return TONE_BY_OUTCOME[outcome];
}
