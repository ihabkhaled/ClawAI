import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSecuritySignupPage from '@/app/(portal)/admin/security/sign-up/page';
import { Permission } from '@/enums';
import { EmailCheckTone } from '@/enums/email-check-tone.enum';
import { EmailDomainReason } from '@/enums/email-domain-reason.enum';
import { EmailDomainVerdict } from '@/enums/email-domain-verdict.enum';
import { SecurityKeySource } from '@/enums/security-key-source.enum';
import { SecuritySettingKey } from '@/enums/security-setting-key.enum';
import { ApiClientError } from '@/services/shared/api-client';
import type { SignupProtectionStatus } from '@/types/admin-security-settings.types';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  set: vi.fn(),
  getStatus: vi.fn(),
  checkEmail: vi.fn(),
  canEdit: true,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastApiError: vi.fn(),
}));

vi.mock('@/repositories/admin/system-settings.repository', () => ({
  systemSettingsRepository: { list: mocks.list, set: mocks.set },
}));
vi.mock('@/repositories/admin/signup-protection.repository', () => ({
  signupProtectionRepository: { getStatus: mocks.getStatus, checkEmail: mocks.checkEmail },
}));
vi.mock('@/hooks/auth/use-permissions', () => ({
  usePermissions: () => ({
    isAdmin: true,
    isSuperAdmin: false,
    can: (permission: Permission) =>
      permission === Permission.ADMIN_CREDIT_MANAGE ? mocks.canEdit : true,
    canAny: () => true,
  }),
}));
vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) =>
      params === undefined ? key : `${key}|${JSON.stringify(params)}`,
    locale: 'en',
  }),
}));
vi.mock('@/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  showToast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    apiError: mocks.toastApiError,
  },
}));

const STORED = [
  {
    key: SecuritySettingKey.TURNSTILE_SITE_KEY,
    value: '0x4AAA-site',
    updatedAt: '2026-11-27T00:00:00Z',
  },
  // Write-only: the server never returns the secret, only that one is stored.
  {
    key: SecuritySettingKey.TURNSTILE_SECRET_KEY,
    value: '',
    updatedAt: '2026-11-27T00:00:00Z',
    configured: true,
  },
  { key: SecuritySettingKey.POW_DIFFICULTY, value: '18', updatedAt: '2026-11-27T00:00:00Z' },
  {
    key: SecuritySettingKey.EMAIL_BLOCKED_DOMAINS,
    value: 'euploading.com',
    updatedAt: '2026-11-27T00:00:00Z',
  },
];

/** What GET /status answers for STORED: Turnstile keys saved here, reCAPTCHA not set anywhere. */
const STATUS_FOR_STORED: SignupProtectionStatus = {
  turnstile: {
    active: true,
    siteKey: '0x4AAA-site',
    siteKeySource: SecurityKeySource.SETTING,
    secretKeySource: SecurityKeySource.SETTING,
  },
  recaptcha: {
    active: false,
    siteKey: null,
    siteKeySource: SecurityKeySource.NONE,
    secretKeySource: SecurityKeySource.NONE,
  },
  builtInDisposableDomainCount: 10455,
};

/** Production: nothing saved on the page, both Turnstile keys from the server environment. */
const STATUS_FROM_ENVIRONMENT: SignupProtectionStatus = {
  turnstile: {
    active: true,
    siteKey: '0x4AAA-env',
    siteKeySource: SecurityKeySource.ENVIRONMENT,
    secretKeySource: SecurityKeySource.ENVIRONMENT,
  },
  recaptcha: {
    active: false,
    siteKey: '6Lc-env',
    siteKeySource: SecurityKeySource.ENVIRONMENT,
    secretKeySource: SecurityKeySource.NONE,
  },
  builtInDisposableDomainCount: 10455,
};

function renderPage(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <AdminSecuritySignupPage />
    </QueryClientProvider>,
  );
}

const field = (key: SecuritySettingKey): HTMLElement =>
  document.getElementById(`security-setting-${key}`) ?? document.body;

describe('/admin/security/sign-up', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canEdit = true;
    mocks.list.mockResolvedValue(STORED);
    mocks.getStatus.mockResolvedValue(STATUS_FOR_STORED);
    mocks.set.mockImplementation(async (key: string, value: string) => ({
      key,
      value,
      updatedAt: '',
    }));
  });

  it('never shows a stored secret: the box is empty and says it is configured', async () => {
    renderPage();
    const secret = await screen.findByTestId(
      `security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`,
    );
    expect(secret).toHaveValue('');
    expect(secret).toHaveAttribute('placeholder', 'adminSecurity.fields.secretConfigured');
    expect(secret).toHaveAttribute('autocomplete', 'new-password');
    expect(
      screen.getByTestId(`security-secret-${SecuritySettingKey.RECAPTCHA_SECRET_KEY}`),
    ).toHaveAttribute('placeholder', 'adminSecurity.fields.secretNotConfigured');
    expect(field(SecuritySettingKey.TURNSTILE_SITE_KEY)).toHaveValue('0x4AAA-site');
  });

  it('saves only what changed: a typed secret and a new difficulty, never the untouched secret', async () => {
    renderPage();
    await screen.findByTestId(`security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`);
    fireEvent.change(field(SecuritySettingKey.RECAPTCHA_SECRET_KEY), {
      target: { value: ' 6Lc-secret ' },
    });
    fireEvent.change(field(SecuritySettingKey.POW_DIFFICULTY), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminSecurity.save' }));

    await waitFor(() => expect(mocks.set).toHaveBeenCalledTimes(2));
    expect(mocks.set).toHaveBeenCalledWith(SecuritySettingKey.RECAPTCHA_SECRET_KEY, '6Lc-secret');
    expect(mocks.set).toHaveBeenCalledWith(SecuritySettingKey.POW_DIFFICULTY, '20');
    expect(mocks.set).not.toHaveBeenCalledWith(
      SecuritySettingKey.TURNSTILE_SECRET_KEY,
      expect.anything(),
    );
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith({ title: 'adminSecurity.saved' }),
    );
  });

  it('normalises a domain list before saving it', async () => {
    renderPage();
    await screen.findByTestId(`security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`);
    fireEvent.change(field(SecuritySettingKey.EMAIL_BLOCKED_DOMAINS), {
      target: { value: 'euploading.com, UberIP.com,\n@guerrillamail.com, uberip.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminSecurity.save' }));
    await waitFor(() =>
      expect(mocks.set).toHaveBeenCalledWith(
        SecuritySettingKey.EMAIL_BLOCKED_DOMAINS,
        'euploading.com,uberip.com,guerrillamail.com',
      ),
    );
  });

  it('refuses a difficulty outside 12..24 and sends nothing', async () => {
    renderPage();
    await screen.findByTestId(`security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`);
    fireEvent.change(field(SecuritySettingKey.POW_DIFFICULTY), { target: { value: '30' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminSecurity.save' }));
    expect(
      await screen.findByText('adminSecurity.errors.integerRange|{"min":12,"max":24}'),
    ).toBeInTheDocument();
    expect(mocks.set).not.toHaveBeenCalled();
    expect(mocks.toastError).toHaveBeenCalledWith({ title: 'adminSecurity.invalid' });
  });

  it('says which save failed when the server refuses one key', async () => {
    mocks.set.mockRejectedValueOnce(new Error('400'));
    renderPage();
    await screen.findByTestId(`security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`);
    fireEvent.change(field(SecuritySettingKey.SIGNUP_MAX_PER_10_MIN), { target: { value: '50' } });
    fireEvent.click(screen.getByRole('button', { name: 'adminSecurity.save' }));
    await waitFor(() =>
      expect(mocks.toastError).toHaveBeenCalledWith({ title: 'adminSecurity.saveFailed' }),
    );
  });

  it('is read-only without the permission the settings PUT enforces', async () => {
    mocks.canEdit = false;
    renderPage();
    expect(await screen.findByTestId('security-read-only')).toBeInTheDocument();
    expect(field(SecuritySettingKey.POW_DIFFICULTY)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'adminSecurity.save' })).toBeDisabled();
  });

  it('shows an error state with retry when the settings cannot be read', async () => {
    mocks.list.mockRejectedValue(new Error('500'));
    renderPage();
    expect(await screen.findByText('adminSecurity.loadFailed')).toBeInTheDocument();
    mocks.list.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'common.retry' }));
    expect(await screen.findByTestId(`security-group-POW`)).toBeInTheDocument();
  });
});

const placeholderOf = (key: SecuritySettingKey): string | null =>
  field(key).getAttribute('placeholder');

const checkButton = (): HTMLElement =>
  screen.getByRole('button', { name: /adminSecurity\.emailCheck\.(submit|checking)/u });

async function checkAddress(value: string): Promise<void> {
  const input = await screen.findByLabelText('adminSecurity.emailCheck.label');
  fireEvent.change(input, { target: { value } });
  fireEvent.click(checkButton());
}

describe('/admin/security/sign-up: what is in force', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canEdit = true;
    mocks.list.mockResolvedValue([]);
    mocks.getStatus.mockResolvedValue(STATUS_FROM_ENVIRONMENT);
    mocks.set.mockImplementation(async (key: string, value: string) => ({
      key,
      value,
      updatedAt: '',
    }));
  });

  it('shows On and the server keys when nothing is saved on the page', async () => {
    renderPage();
    const turnstile = await screen.findByTestId('security-status-TURNSTILE');
    expect(turnstile).toHaveAttribute('data-active', 'true');
    expect(within(turnstile).getByText('adminSecurity.status.on')).toBeInTheDocument();
    expect(
      within(turnstile).getByText(
        'adminSecurity.status.keySources|{"siteKey":"adminSecurity.status.sourceEnvironment","secretKey":"adminSecurity.status.sourceEnvironment"}',
      ),
    ).toBeInTheDocument();
    expect(within(turnstile).getByText('adminSecurity.status.overrideNote')).toBeInTheDocument();
    expect(field(SecuritySettingKey.TURNSTILE_SITE_KEY)).toHaveValue('');
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SITE_KEY)).toBe(
      'adminSecurity.fields.siteKeyFromServer|{"value":"0x4AAA-env"}',
    );
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretFromServer',
    );
  });

  it('shows Off when only one key resolves, naming where each comes from', async () => {
    renderPage();
    const recaptcha = await screen.findByTestId('security-status-RECAPTCHA');
    expect(recaptcha).toHaveAttribute('data-active', 'false');
    expect(within(recaptcha).getByText('adminSecurity.status.off')).toBeInTheDocument();
    expect(
      within(recaptcha).getByText(
        'adminSecurity.status.keySources|{"siteKey":"adminSecurity.status.sourceEnvironment","secretKey":"adminSecurity.status.sourceNone"}',
      ),
    ).toBeInTheDocument();
    expect(placeholderOf(SecuritySettingKey.RECAPTCHA_SITE_KEY)).toBe(
      'adminSecurity.fields.siteKeyFromServer|{"value":"6Lc-env"}',
    );
    expect(placeholderOf(SecuritySettingKey.RECAPTCHA_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretNotConfigured',
    );
  });

  it('says a key saved on this page is saved here, and shows no server key over it', async () => {
    mocks.list.mockResolvedValue(STORED);
    mocks.getStatus.mockResolvedValue(STATUS_FOR_STORED);
    renderPage();
    const turnstile = await screen.findByTestId('security-status-TURNSTILE');
    expect(
      within(turnstile).getByText(
        'adminSecurity.status.keySources|{"siteKey":"adminSecurity.status.sourceSetting","secretKey":"adminSecurity.status.sourceSetting"}',
      ),
    ).toBeInTheDocument();
    expect(field(SecuritySettingKey.TURNSTILE_SITE_KEY)).toHaveValue('0x4AAA-site');
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SITE_KEY)).toBeNull();
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretConfigured',
    );
    expect(placeholderOf(SecuritySettingKey.RECAPTCHA_SITE_KEY)).toBeNull();
  });

  it('falls back to the settings rows when the status cannot be loaded', async () => {
    mocks.list.mockResolvedValue(STORED);
    mocks.getStatus.mockRejectedValue(new Error('502'));
    renderPage();
    expect(await screen.findByTestId('security-status-unavailable')).toHaveTextContent(
      'adminSecurity.status.loadFailed',
    );
    expect(screen.queryByTestId('security-status-TURNSTILE')).not.toBeInTheDocument();
    expect(screen.queryByTestId('security-built-in-count')).not.toBeInTheDocument();
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretConfigured',
    );
    expect(placeholderOf(SecuritySettingKey.RECAPTCHA_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretNotConfigured',
    );
  });

  it('says the built-in throwaway list is always on, with its size', async () => {
    renderPage();
    expect(await screen.findByTestId('security-built-in-count')).toHaveTextContent(
      'adminSecurity.emailCheck.builtInCount|{"count":"10,455"}',
    );
  });

  it('refreshes the status and the last address check after a save', async () => {
    mocks.checkEmail.mockResolvedValue({
      domain: 'spam.example',
      verdict: EmailDomainVerdict.ALLOWED,
      reason: EmailDomainReason.MAIL_SERVER_FOUND,
    });
    renderPage();
    await screen.findByTestId('security-status-TURNSTILE');
    await checkAddress('spam.example');
    await waitFor(() => expect(mocks.checkEmail).toHaveBeenCalledTimes(1));
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    fireEvent.change(field(SecuritySettingKey.EMAIL_BLOCKED_DOMAINS), {
      target: { value: 'spam.example' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'adminSecurity.save' }));
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.checkEmail).toHaveBeenCalledTimes(2));
  });
});

describe('/admin/security/sign-up: check an address', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canEdit = true;
    mocks.list.mockResolvedValue(STORED);
    mocks.getStatus.mockResolvedValue(STATUS_FOR_STORED);
  });

  it.each([
    [
      EmailDomainVerdict.DISPOSABLE,
      EmailDomainReason.BUILT_IN_LIST,
      'adminSecurity.emailCheck.builtInList',
      EmailCheckTone.BLOCKED,
    ],
    [
      EmailDomainVerdict.DISPOSABLE,
      EmailDomainReason.ADMIN_BLOCKED,
      'adminSecurity.emailCheck.adminBlocked',
      EmailCheckTone.BLOCKED,
    ],
    [
      EmailDomainVerdict.ALLOWED,
      EmailDomainReason.ADMIN_ALLOWED,
      'adminSecurity.emailCheck.adminAllowed',
      EmailCheckTone.ALLOWED,
    ],
    [
      EmailDomainVerdict.UNDELIVERABLE,
      EmailDomainReason.NO_MAIL_SERVER,
      'adminSecurity.emailCheck.noMailServer',
      EmailCheckTone.BLOCKED,
    ],
    [
      EmailDomainVerdict.ALLOWED,
      EmailDomainReason.MAIL_SERVER_FOUND,
      'adminSecurity.emailCheck.mailServerFound',
      EmailCheckTone.ALLOWED,
    ],
    [
      EmailDomainVerdict.ALLOWED,
      EmailDomainReason.MAIL_CHECK_INCONCLUSIVE,
      'adminSecurity.emailCheck.mailCheckInconclusive',
      EmailCheckTone.ALLOWED,
    ],
  ])('%s / %s reads %s', async (verdict, reason, messageKey, tone) => {
    mocks.checkEmail.mockResolvedValue({ domain: 'mailinator.com', verdict, reason });
    renderPage();
    await checkAddress('  someone@Mailinator.com ');
    const outcome = await screen.findByTestId('security-email-check-outcome');
    expect(mocks.checkEmail).toHaveBeenCalledWith('someone@Mailinator.com');
    expect(outcome).toHaveTextContent(`mailinator.com${messageKey}`);
    expect(outcome).toHaveAttribute('data-tone', tone);
  });

  it('falls back to the verdict for a reason this page does not know yet', async () => {
    mocks.checkEmail.mockResolvedValue({
      domain: 'new.example',
      verdict: EmailDomainVerdict.DISPOSABLE,
      reason: 'SOMETHING_NEW',
    });
    renderPage();
    await checkAddress('new.example');
    expect(await screen.findByTestId('security-email-check-outcome')).toHaveTextContent(
      'new.exampleadminSecurity.emailCheck.blocked',
    );
  });

  it('says the value is not an address or a domain on a 400', async () => {
    mocks.checkEmail.mockRejectedValue(
      new ApiClientError({ message: 'Validation failed', status: 400, code: 'VALIDATION_FAILED' }),
    );
    renderPage();
    await checkAddress('not an address');
    const outcome = await screen.findByTestId('security-email-check-outcome');
    expect(outcome).toHaveTextContent('adminSecurity.emailCheck.invalid');
    expect(outcome).toHaveAttribute('data-tone', EmailCheckTone.ERROR);
    expect(mocks.checkEmail).toHaveBeenCalledTimes(1);
  });

  it('shows a generic message when the check fails for another reason', async () => {
    mocks.checkEmail.mockRejectedValue(new ApiClientError({ message: 'boom', status: 500 }));
    renderPage();
    await checkAddress('mailinator.com');
    expect(await screen.findByTestId('security-email-check-outcome')).toHaveTextContent(
      'adminSecurity.emailCheck.failed',
    );
  });

  it('is disabled while empty and busy while checking', async () => {
    let answer: (value: unknown) => void = () => undefined;
    mocks.checkEmail.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    renderPage();
    await screen.findByLabelText('adminSecurity.emailCheck.label');
    expect(checkButton()).toBeDisabled();
    await checkAddress('mailinator.com');
    await waitFor(() =>
      expect(checkButton()).toHaveAccessibleName('adminSecurity.emailCheck.checking'),
    );
    expect(checkButton()).toBeDisabled();
    answer({
      domain: 'mailinator.com',
      verdict: EmailDomainVerdict.DISPOSABLE,
      reason: EmailDomainReason.BUILT_IN_LIST,
    });
    expect(await screen.findByTestId('security-email-check-outcome')).toHaveTextContent(
      'adminSecurity.emailCheck.builtInList',
    );
    expect(checkButton()).toHaveAccessibleName('adminSecurity.emailCheck.submit');
  });

  it('asks the server again when the same value is checked again', async () => {
    mocks.checkEmail.mockResolvedValue({
      domain: 'mailinator.com',
      verdict: EmailDomainVerdict.DISPOSABLE,
      reason: EmailDomainReason.BUILT_IN_LIST,
    });
    renderPage();
    await checkAddress('mailinator.com');
    await screen.findByTestId('security-email-check-outcome');
    await waitFor(() => expect(checkButton()).toBeEnabled());
    fireEvent.click(checkButton());
    await waitFor(() => expect(mocks.checkEmail).toHaveBeenCalledTimes(2));
  });

  it('works for a read-only viewer, and checking saves nothing', async () => {
    mocks.canEdit = false;
    mocks.checkEmail.mockResolvedValue({
      domain: 'mailinator.com',
      verdict: EmailDomainVerdict.DISPOSABLE,
      reason: EmailDomainReason.BUILT_IN_LIST,
    });
    renderPage();
    await checkAddress('mailinator.com');
    expect(await screen.findByTestId('security-email-check-outcome')).toBeInTheDocument();
    expect(mocks.set).not.toHaveBeenCalled();
  });
});

const removeButtonOf = (key: SecuritySettingKey): HTMLElement | null =>
  screen.queryByTestId(`security-remove-secret-${key}`);

/** What GET /status answers once the saved Turnstile secret is gone and the server's takes over. */
const STATUS_AFTER_REMOVAL: SignupProtectionStatus = {
  ...STATUS_FOR_STORED,
  turnstile: { ...STATUS_FOR_STORED.turnstile, secretKeySource: SecurityKeySource.ENVIRONMENT },
};

describe('/admin/security/sign-up: remove a saved secret', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.canEdit = true;
    mocks.list.mockResolvedValue(STORED);
    mocks.getStatus.mockResolvedValue(STATUS_FOR_STORED);
    mocks.set.mockImplementation(async (key: string, value: string) => ({
      key,
      value,
      updatedAt: '',
    }));
  });

  it('is offered only for a secret saved on this page', async () => {
    renderPage();
    expect(
      await screen.findByTestId(
        `security-remove-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`,
      ),
    ).toHaveTextContent('adminSecurity.removeSecret.action');
    expect(removeButtonOf(SecuritySettingKey.RECAPTCHA_SECRET_KEY)).not.toBeInTheDocument();
    expect(screen.getAllByText('adminSecurity.removeSecret.action')).toHaveLength(1);
  });

  it('is not offered when no secret is saved here, even with server keys in force', async () => {
    mocks.list.mockResolvedValue([]);
    mocks.getStatus.mockResolvedValue(STATUS_FROM_ENVIRONMENT);
    renderPage();
    await screen.findByTestId('security-status-TURNSTILE');
    expect(screen.queryByText('adminSecurity.removeSecret.action')).not.toBeInTheDocument();
  });

  it('is not offered to a read-only viewer', async () => {
    mocks.canEdit = false;
    renderPage();
    await screen.findByTestId('security-read-only');
    expect(
      screen.getByTestId(`security-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`),
    ).toHaveAttribute('data-configured', 'true');
    expect(screen.queryByText('adminSecurity.removeSecret.action')).not.toBeInTheDocument();
  });

  it('sends an empty value for that key only, says what is in force now, and reloads', async () => {
    mocks.checkEmail.mockResolvedValue({
      domain: 'spam.example',
      verdict: EmailDomainVerdict.ALLOWED,
      reason: EmailDomainReason.MAIL_SERVER_FOUND,
    });
    renderPage();
    await screen.findByTestId('security-status-TURNSTILE');
    await checkAddress('spam.example');
    await waitFor(() => expect(mocks.checkEmail).toHaveBeenCalledTimes(1));
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    // What the server answers after the PUT: no saved secret row, the server's key in force.
    mocks.list.mockResolvedValue(
      STORED.filter((row) => row.key !== SecuritySettingKey.TURNSTILE_SECRET_KEY),
    );
    mocks.getStatus.mockResolvedValue(STATUS_AFTER_REMOVAL);

    fireEvent.click(
      screen.getByTestId(`security-remove-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`),
    );

    await waitFor(() => expect(mocks.set).toHaveBeenCalledTimes(1));
    expect(mocks.set).toHaveBeenCalledWith(SecuritySettingKey.TURNSTILE_SECRET_KEY, '');
    await waitFor(() =>
      expect(mocks.toastSuccess).toHaveBeenCalledWith({
        title: 'adminSecurity.removeSecret.removed',
        description: 'adminSecurity.removeSecret.removedDetail',
      }),
    );
    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.getStatus).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mocks.checkEmail).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(removeButtonOf(SecuritySettingKey.TURNSTILE_SECRET_KEY)).not.toBeInTheDocument(),
    );
    expect(placeholderOf(SecuritySettingKey.TURNSTILE_SECRET_KEY)).toBe(
      'adminSecurity.fields.secretFromServer',
    );
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.toastApiError).not.toHaveBeenCalled();
  });

  it('shows an error toast, reloads nothing and keeps the button when the server refuses', async () => {
    const refusal = new ApiClientError({ message: 'Forbidden', status: 403 });
    mocks.set.mockRejectedValueOnce(refusal);
    renderPage();
    const button = await screen.findByTestId(
      `security-remove-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`,
    );
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.toastApiError).toHaveBeenCalledWith(
        refusal,
        'adminSecurity.removeSecret.failed',
        { translate: expect.any(Function) },
      ),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
    expect(mocks.list).toHaveBeenCalledTimes(1);
    expect(mocks.getStatus).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('is disabled while the request runs and asks no browser confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm');
    let answer: (value: unknown) => void = () => undefined;
    mocks.set.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    renderPage();
    const button = await screen.findByTestId(
      `security-remove-secret-${SecuritySettingKey.TURNSTILE_SECRET_KEY}`,
    );
    fireEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    expect(button).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(button);
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(confirmSpy).not.toHaveBeenCalled();
    answer({ key: SecuritySettingKey.TURNSTILE_SECRET_KEY, value: '', updatedAt: '' });
    await waitFor(() => expect(mocks.toastSuccess).toHaveBeenCalledTimes(1));
    confirmSpy.mockRestore();
  });
});
