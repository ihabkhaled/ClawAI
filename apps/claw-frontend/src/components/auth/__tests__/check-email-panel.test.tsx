import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { CheckEmailPanel } from '@/components/auth/check-email-panel';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { en } from '@/lib/i18n/locales/en';

const searchParams = { value: new URLSearchParams() };
const resendVerification = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams.value,
}));

vi.mock('@/repositories/auth/auth.repository', () => ({
  authRepository: {
    resendVerification: (email: string) => resendVerification(email),
  },
}));

function renderPanel(): void {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LocaleProvider initialLocale={Locale.EN} initialDictionary={en}>
        <CheckEmailPanel />
      </LocaleProvider>
    </QueryClientProvider>,
  );
}

describe('CheckEmailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParams.value = new URLSearchParams({ email: 'ada@example.com' });
    resendVerification.mockResolvedValue({ accepted: true, retryAfterSeconds: 60 });
  });

  // The single reason this screen replaced a redirect to /login: a user who
  // does not know their account is inactive reads a failed sign-in as a bug.
  it('states plainly that sign-in is blocked until the address is confirmed', () => {
    renderPanel();
    expect(screen.getByText(en.auth.checkEmailBlockedTitle)).toBeInTheDocument();
    expect(screen.getByText(en.auth.checkEmailBlockedBody)).toBeInTheDocument();
  });

  it('echoes the address the account was registered with', () => {
    renderPanel();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
  });

  it('shows all three steps and the troubleshooting list', () => {
    renderPanel();
    expect(screen.getByText(en.auth.checkEmailStep1Title)).toBeInTheDocument();
    expect(screen.getByText(en.auth.checkEmailStep2Title)).toBeInTheDocument();
    expect(screen.getByText(en.auth.checkEmailStep3Title)).toBeInTheDocument();
    expect(screen.getByText(en.auth.checkEmailNotArrivedSpam)).toBeInTheDocument();
  });

  it('resends to the address from the query string', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: en.auth.checkEmailResend }));
    // React Query schedules the mutation function, so the call is not
    // observable in the same tick as the click.
    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledWith('ada@example.com');
    });
  });

  // Without an address there is nothing to resend to, so the button would be a
  // dead control. The rest of the guidance is still worth showing.
  it('hides the resend control when no address was passed', () => {
    searchParams.value = new URLSearchParams();
    renderPanel();
    expect(screen.queryByRole('button', { name: en.auth.checkEmailResend })).toBeNull();
    expect(screen.getByText(en.auth.checkEmailSubtitleNoAddress)).toBeInTheDocument();
  });

  it('treats an empty email parameter exactly like a missing one', () => {
    searchParams.value = new URLSearchParams({ email: '' });
    renderPanel();
    expect(screen.queryByRole('button', { name: en.auth.checkEmailResend })).toBeNull();
  });

  it('always offers a route to sign-in and a route back to registration', () => {
    renderPanel();
    expect(screen.getByRole('link', { name: en.auth.checkEmailGoToLogin })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(screen.getByRole('link', { name: en.auth.checkEmailWrongAddress })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  // The visible countdown is a courtesy; the real limit is the server's. What
  // matters here is that a second click inside the window sends nothing.
  it('blocks a second resend while the server cooldown is running', async () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: en.auth.checkEmailResend }));
    await waitFor(() => {
      expect(resendVerification).toHaveBeenCalledTimes(1);
    });

    const cooling = await screen.findByRole('button', { name: /You can send again in/ });
    expect(cooling).toBeDisabled();
    fireEvent.click(cooling);
    expect(resendVerification).toHaveBeenCalledTimes(1);
  });

  it('takes the countdown length from the server, not a local constant', async () => {
    resendVerification.mockResolvedValue({ accepted: true, retryAfterSeconds: 17 });
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: en.auth.checkEmailResend }));

    expect(await screen.findByRole('button', { name: /17/ })).toBeInTheDocument();
  });
});
