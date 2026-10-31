import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BanDurationUnit, PasswordSetMode } from '@/enums';
import { auditRepository } from '@/repositories/audit/audit.repository';
import { presenceRepository } from '@/repositories/presence/presence.repository';

const mockGet = vi.fn();
const mockPost = vi.fn();

vi.mock('@/services/shared/api-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

describe('admin user security calls (ADR-200)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bans through POST /users/:id/ban with the body as given', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    const body = { unit: BanDurationUnit.HOURS, amount: 6, reason: 'spam' };
    await auditRepository.banUser('u1', body);
    expect(mockPost).toHaveBeenCalledWith('/users/u1/ban', body);
  });

  it('unbans through POST /users/:id/unban', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await auditRepository.unbanUser('u1');
    expect(mockPost).toHaveBeenCalledWith('/users/u1/unban');
  });

  it('sets a password and hands back the generated one from the reply', async () => {
    mockPost.mockResolvedValueOnce({ data: { generatedPassword: 'abc' } });
    const result = await auditRepository.setUserPassword('u1', { mode: PasswordSetMode.GENERATE });
    expect(mockPost).toHaveBeenCalledWith('/users/u1/password', { mode: PasswordSetMode.GENERATE });
    expect(result).toEqual({ generatedPassword: 'abc' });
  });

  it('reads the presence counters', async () => {
    mockGet.mockResolvedValueOnce({ data: { onlineNow: 1, active24h: 2, bannedNow: 0 } });
    await expect(auditRepository.getPresenceSummary()).resolves.toEqual({
      onlineNow: 1,
      active24h: 2,
      bannedNow: 0,
    });
    expect(mockGet).toHaveBeenCalledWith('/users/presence-summary');
  });

  it('sends the heartbeat as an empty POST', async () => {
    mockPost.mockResolvedValueOnce({ data: undefined });
    await presenceRepository.sendHeartbeat();
    expect(mockPost).toHaveBeenCalledWith('/users/me/heartbeat');
  });

  it('passes the presence filter as a list query parameter', async () => {
    mockGet.mockResolvedValueOnce({ data: { data: [], meta: {} } });
    await auditRepository.getAdminUsers({ page: 1, limit: 20, presence: 'ONLINE' as never });
    expect(mockGet.mock.calls[0]?.[0]).toContain('presence=ONLINE');
  });
});
