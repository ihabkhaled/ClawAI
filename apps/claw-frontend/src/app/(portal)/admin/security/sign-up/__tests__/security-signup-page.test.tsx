import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminSecuritySignupPage from '@/app/(portal)/admin/security/sign-up/page';
import { Permission } from '@/enums';
import { SecuritySettingKey } from '@/enums/security-setting-key.enum';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  set: vi.fn(),
  canEdit: true,
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/repositories/admin/system-settings.repository', () => ({
  systemSettingsRepository: { list: mocks.list, set: mocks.set },
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
  }),
}));
vi.mock('@/utilities', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  showToast: { success: mocks.toastSuccess, error: mocks.toastError, apiError: vi.fn() },
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
