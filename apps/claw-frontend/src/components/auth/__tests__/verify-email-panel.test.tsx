import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VerifyEmailPanel } from '@/components/auth/verify-email-panel';
import { EmailVerificationOutcome } from '@/enums';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { en } from '@/lib/i18n/locales/en';

const state = { outcome: EmailVerificationOutcome.Pending };

vi.mock('@/hooks/auth/use-verify-email-page', () => ({
  useVerifyEmailPage: () => ({
    outcome: state.outcome,
    t: (key: string): string => {
      const section = key.slice('auth.'.length) as keyof typeof en.auth;
      return en.auth[section];
    },
  }),
}));

function renderPanel(outcome: EmailVerificationOutcome): void {
  state.outcome = outcome;
  render(
    <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
      <VerifyEmailPanel />
    </LocaleProvider>,
  );
}

describe('VerifyEmailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('waits without offering actions while the link is still being checked', () => {
    renderPanel(EmailVerificationOutcome.Pending);
    expect(screen.getByText(en.auth.verifyEmailPendingTitle)).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('confirms success and points at sign-in', () => {
    renderPanel(EmailVerificationOutcome.Verified);
    expect(screen.getByText(en.auth.verifyEmailVerifiedTitle)).toBeInTheDocument();
    expect(screen.getByText(en.auth.verifyEmailVerifiedDetail)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.auth.verifyEmailVerifiedAction })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  // The gap the redesign closed: an expired link used to tell the reader to
  // request a new one, from a page with nowhere to do it.
  it('gives a dead link a second route out', () => {
    renderPanel(EmailVerificationOutcome.Failed);
    expect(screen.getByText(en.auth.verifyEmailFailedDetail)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: en.auth.verifyEmailFailedSecondary })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  it('sends an already-used link towards a password reset, not a new account', () => {
    renderPanel(EmailVerificationOutcome.AlreadyHandled);
    expect(
      screen.getByRole('link', { name: en.auth.verifyEmailAlreadyActiveSecondary }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('marks the waiting state as busy for assistive technology', () => {
    renderPanel(EmailVerificationOutcome.Pending);
    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
  });
});
