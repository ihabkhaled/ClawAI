import { describe, expect, it } from 'vitest';

import { EmailVerificationOutcome, EmailVerificationTone } from '@/enums';
import {
  resolveEmailVerificationPanelCopy,
  resolveEmailVerificationTone,
} from '@/utilities/email-verification-copy.utility';

const OUTCOMES = Object.values(EmailVerificationOutcome);

describe('resolveEmailVerificationPanelCopy', () => {
  it('gives every outcome a title, body, detail and a primary action', () => {
    for (const outcome of OUTCOMES) {
      const copy = resolveEmailVerificationPanelCopy(outcome);
      expect(copy.titleKey.startsWith('auth.')).toBe(true);
      expect(copy.bodyKey.startsWith('auth.')).toBe(true);
      expect(copy.detailKey.startsWith('auth.')).toBe(true);
      expect(copy.primaryActionKey.startsWith('auth.')).toBe(true);
    }
  });

  // The point of the redesign: the outcomes where "sign in" is NOT the answer
  // must offer something else. An expired link used to tell the reader to
  // request a new one, from a page with nowhere to do it.
  it('offers a second route out of the two outcomes sign-in cannot fix', () => {
    expect(
      resolveEmailVerificationPanelCopy(EmailVerificationOutcome.Failed).secondaryActionKey,
    ).not.toBeNull();
    expect(
      resolveEmailVerificationPanelCopy(EmailVerificationOutcome.AlreadyHandled).secondaryActionKey,
    ).not.toBeNull();
  });

  it('does not clutter the success and waiting states with a second action', () => {
    expect(
      resolveEmailVerificationPanelCopy(EmailVerificationOutcome.Verified).secondaryActionKey,
    ).toBeNull();
    expect(
      resolveEmailVerificationPanelCopy(EmailVerificationOutcome.Pending).secondaryActionKey,
    ).toBeNull();
  });

  it('keeps the pending copy reachable — it used to be dead', () => {
    const copy = resolveEmailVerificationPanelCopy(EmailVerificationOutcome.Pending);
    expect(copy.titleKey).toBe('auth.verifyEmailPendingTitle');
  });
});

describe('resolveEmailVerificationTone', () => {
  it('colours success green and a dead link red', () => {
    expect(resolveEmailVerificationTone(EmailVerificationOutcome.Verified)).toBe(
      EmailVerificationTone.Success,
    );
    expect(resolveEmailVerificationTone(EmailVerificationOutcome.Failed)).toBe(
      EmailVerificationTone.Failure,
    );
  });

  // An already-used link usually means the account is fine. Green would
  // congratulate someone who may still be locked out; red would alarm someone
  // with nothing wrong.
  it('refuses to call an already-used link either a success or a failure', () => {
    expect(resolveEmailVerificationTone(EmailVerificationOutcome.AlreadyHandled)).toBe(
      EmailVerificationTone.Neutral,
    );
  });

  it('covers every outcome', () => {
    for (const outcome of OUTCOMES) {
      expect(Object.values(EmailVerificationTone)).toContain(resolveEmailVerificationTone(outcome));
    }
  });
});
