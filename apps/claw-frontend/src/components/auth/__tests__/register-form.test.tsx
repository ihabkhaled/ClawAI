import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RegisterForm } from '@/components/auth/register-form';
import { Locale } from '@/enums/locale.enum';
import { LocaleProvider } from '@/lib/i18n';
import { ar } from '@/lib/i18n/locales/ar';
import { en } from '@/lib/i18n/locales/en';
import { ApiClientError } from '@/services/shared/api-client';
import type { TranslationDictionary } from '@/types/i18n.types';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  state: { isError: false, error: null as unknown },
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastApiError: vi.fn(),
  copy: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/en/register',
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/hooks/auth/use-register', () => ({
  useRegister: () => ({
    register: mocks.register,
    isPending: false,
    isError: mocks.state.isError,
    error: mocks.state.error,
  }),
}));

vi.mock('@/hooks/common/use-detected-country', () => ({
  useDetectedCountry: () => null,
}));

vi.mock('@/utilities/toast.utility', () => ({
  showToast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    apiError: mocks.toastApiError,
  },
}));

vi.mock('@/utilities/clipboard.utility', () => ({
  copyTextToClipboard: (text: string) => mocks.copy(text),
}));

function renderForm(locale: Locale = Locale.EN, dictionary: TranslationDictionary = en): void {
  render(
    <LocaleProvider initialLocale={locale} initialDictionary={dictionary}>
      <RegisterForm />
    </LocaleProvider>,
  );
}

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = { isError: false, error: null };
    mocks.copy.mockResolvedValue(true);
  });

  // The production screenshot: a toast AND an inline box, both carrying the
  // backend's "An unexpected server error occurred". Now exactly one alert,
  // in the user's words, and nothing from the backend.
  it('shows one actionable alert for an unknown 5xx, with the copyable reference', async () => {
    mocks.state = {
      isError: true,
      error: new ApiClientError({
        message: 'An unexpected server error occurred. Please try again later.',
        status: 500,
        requestId: 'req-abc-123',
      }),
    };
    renderForm();

    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByText(en.auth.signup.unknownTitle)).toBeInTheDocument();
    expect(screen.getByText(en.auth.signup.unknownDescription)).toBeInTheDocument();
    expect(screen.queryByText(/unexpected server error/i)).not.toBeInTheDocument();
    expect(screen.queryByText(en.auth.registerFailed)).not.toBeInTheDocument();
    expect(screen.getByText('Reference: req-abc-123')).toBeInTheDocument();
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.toastApiError).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: en.auth.signup.copyRequestId }));
    await waitFor(() => expect(mocks.copy).toHaveBeenCalledWith('req-abc-123'));
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith({ title: en.auth.signup.requestIdCopied }),
    );
  });

  it('offers sign-in and password reset for a taken address, without a reference', () => {
    mocks.state = {
      isError: true,
      error: new ApiClientError({
        message: 'User with this email already exists',
        status: 409,
        code: 'DUPLICATE_ENTITY',
        requestId: 'req-1',
      }),
    };
    renderForm();

    expect(screen.getByText(en.auth.signup.emailTakenTitle)).toBeInTheDocument();
    const alert = screen.getByRole('alert');
    expect(within(alert).getByRole('link', { name: en.auth.signup.actionSignIn })).toHaveAttribute(
      'href',
      '/login',
    );
    expect(
      within(alert).getByRole('link', { name: en.auth.signup.actionResetPassword }),
    ).toHaveAttribute('href', '/forgot-password');
    expect(screen.queryByText(/req-1/)).not.toBeInTheDocument();
  });

  it('renders server field errors translated, next to the field', async () => {
    mocks.state = {
      isError: true,
      error: new ApiClientError({
        message: 'Validation failed',
        status: 400,
        code: 'VALIDATION_FAILED',
        errors: { email: ['EMAIL_INVALID'] },
      }),
    };
    renderForm();

    expect(await screen.findByText(en.auth.signup.emailInvalid)).toBeInTheDocument();
    expect(screen.getByLabelText(en.auth.email)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(en.auth.signup.invalidDetailsTitle)).toBeInTheDocument();
  });

  it('catches format problems before submit, translated, and never calls the API', async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText(en.auth.firstName), { target: { value: 'Ada' } });
    fireEvent.change(screen.getByLabelText(en.auth.lastName), { target: { value: 'L' } });
    fireEvent.change(screen.getByLabelText(en.auth.email), { target: { value: 'not-an-email' } });
    fireEvent.change(screen.getByLabelText(en.auth.password), { target: { value: 'weakpass' } });
    fireEvent.change(screen.getByLabelText(en.auth.confirmPassword), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: en.auth.registerButton }));

    expect(await screen.findByText(en.auth.signup.emailInvalid)).toBeInTheDocument();
    expect(screen.getByText(en.auth.signup.passwordNeedsUppercase)).toBeInTheDocument();
    expect(screen.getByText(en.auth.signup.passwordsDoNotMatch)).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the password rules live', () => {
    renderForm();
    expect(screen.getByText(en.auth.signup.passwordRulesTitle)).toBeInTheDocument();
    expect(screen.getAllByText(en.auth.signup.ruleNotMet)).toHaveLength(4);

    fireEvent.change(screen.getByLabelText(en.auth.password), { target: { value: 'Abcdefg1' } });

    expect(screen.getAllByText(en.auth.signup.ruleMet)).toHaveLength(4);
  });

  it('explains the failure in Arabic for an Arabic reader', () => {
    mocks.state = {
      isError: true,
      error: new ApiClientError({ message: 'x', status: 429, code: 'RATE_LIMITED' }),
    };
    renderForm(Locale.AR, ar);
    expect(screen.getByText(ar.auth.signup.rateLimitedTitle)).toBeInTheDocument();
    expect(screen.getByText(ar.auth.signup.rateLimitedDescription)).toBeInTheDocument();
  });
});
