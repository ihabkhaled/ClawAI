import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BanDurationUnit, PasswordSetMode } from '@/enums';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { showToast } from '@/utilities';

import { useAdminUserSecurityMutations } from '../use-admin-user-security-mutations';

vi.mock('@/repositories/audit/audit.repository');
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), apiError: vi.fn() },
  logger: { info: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

describe('useAdminUserSecurityMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bans and reports success so the dialog can close', async () => {
    vi.mocked(auditRepository.banUser).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminUserSecurityMutations(), { wrapper });
    let ok = false;
    await act(async () => {
      ok = await result.current.onBan('u1', { unit: BanDurationUnit.LIFETIME, reason: 'abuse' });
    });
    expect(ok).toBe(true);
    expect(auditRepository.banUser).toHaveBeenCalledWith('u1', {
      unit: BanDurationUnit.LIFETIME,
      reason: 'abuse',
    });
    expect(showToast.success).toHaveBeenCalled();
  });

  it('reports a refused ban as false and shows the translated API error', async () => {
    vi.mocked(auditRepository.banUser).mockRejectedValue(new Error('SUPER_ADMIN_IMMUTABLE'));
    const { result } = renderHook(() => useAdminUserSecurityMutations(), { wrapper });
    let ok = true;
    await act(async () => {
      ok = await result.current.onBan('u1', { unit: BanDurationUnit.LIFETIME, reason: 'x' });
    });
    expect(ok).toBe(false);
    expect(showToast.apiError).toHaveBeenCalled();
  });

  it('unbans with a success toast', async () => {
    vi.mocked(auditRepository.unbanUser).mockResolvedValue(undefined);
    const { result } = renderHook(() => useAdminUserSecurityMutations(), { wrapper });
    act(() => {
      result.current.onUnban('u1');
    });
    await waitFor(() => expect(showToast.success).toHaveBeenCalled());
    expect(auditRepository.unbanUser).toHaveBeenCalledWith('u1');
  });

  it('returns the generated password to the caller only', async () => {
    vi.mocked(auditRepository.setUserPassword).mockResolvedValue({
      generatedPassword: 'Secret-1!',
    });
    const { result } = renderHook(() => useAdminUserSecurityMutations(), { wrapper });
    let reply: unknown = null;
    await act(async () => {
      reply = await result.current.onSetPassword('u1', { mode: PasswordSetMode.GENERATE });
    });
    expect(reply).toEqual({ generatedPassword: 'Secret-1!' });
    expect(JSON.stringify(vi.mocked(showToast.success).mock.calls)).not.toContain('Secret-1!');
  });

  it('returns null when setting the password is refused', async () => {
    vi.mocked(auditRepository.setUserPassword).mockRejectedValue(new Error('WEAK_PASSWORD'));
    const { result } = renderHook(() => useAdminUserSecurityMutations(), { wrapper });
    let reply: unknown = 'unset';
    await act(async () => {
      reply = await result.current.onSetPassword('u1', {
        mode: PasswordSetMode.MANUAL,
        password: 'weak',
      });
    });
    expect(reply).toBeNull();
    expect(showToast.apiError).toHaveBeenCalled();
  });
});
