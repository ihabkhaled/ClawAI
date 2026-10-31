import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionState } from '@/enums/session-state.enum';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import { apiClient } from '@/services/shared/api-client';

vi.mock('@/services/shared/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

describe('userSessionsRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.get).mockResolvedValue({ data: 'g', status: 200 });
    vi.mocked(apiClient.post).mockResolvedValue({ data: 'p', status: 200 });
    vi.mocked(apiClient.delete).mockResolvedValue({ data: 'd', status: 200 });
  });

  it('lists with paging and omits the state when every state is wanted', async () => {
    await userSessionsRepository.list('u1', null, 2, 10);
    expect(apiClient.get).toHaveBeenCalledWith('/users/u1/sessions', { page: '2', pageSize: '10' });
    await userSessionsRepository.list('u1', SessionState.EXPIRED, 1, 20);
    expect(apiClient.get).toHaveBeenLastCalledWith('/users/u1/sessions', {
      page: '1',
      pageSize: '20',
      state: 'EXPIRED',
    });
  });

  it('sends the current-session confirm only when asked', async () => {
    await userSessionsRepository.terminateOne('u1', 'f1', false);
    expect(apiClient.post).toHaveBeenLastCalledWith('/users/u1/sessions/f1/terminate', {});
    await userSessionsRepository.terminateOne('u1', 'f1', true);
    expect(apiClient.post).toHaveBeenLastCalledWith('/users/u1/sessions/f1/terminate', {
      confirmCurrent: true,
    });
    await userSessionsRepository.terminateAll('u1', true);
    expect(apiClient.post).toHaveBeenLastCalledWith('/users/u1/sessions/terminate-all', {
      confirmCurrent: true,
    });
  });

  it('clears one log or all finished logs with DELETE', async () => {
    await userSessionsRepository.clearOne('u1', 'f1');
    expect(apiClient.delete).toHaveBeenLastCalledWith('/users/u1/sessions/f1/log');
    await userSessionsRepository.clearInactive('u1');
    expect(apiClient.delete).toHaveBeenLastCalledWith('/users/u1/sessions/logs');
  });

  it('runs the two steps of a system-wide action against the guarded endpoints', async () => {
    await userSessionsRepository.globalChallenge(SessionGlobalAction.TERMINATE_ALL, 'pw');
    expect(apiClient.post).toHaveBeenLastCalledWith('/auth/session-security/challenge', {
      action: 'TERMINATE_ALL',
      password: 'pw',
    });
    await userSessionsRepository.globalTerminateAll('tok', 'TERMINATE ALL');
    expect(apiClient.post).toHaveBeenLastCalledWith('/auth/session-security/terminate-all', {
      token: 'tok',
      phrase: 'TERMINATE ALL',
      keepCurrentSession: true,
    });
    await userSessionsRepository.globalClearLogs('tok', 'CLEAR ALL LOGS');
    expect(apiClient.post).toHaveBeenLastCalledWith('/auth/session-security/clear-logs', {
      token: 'tok',
      phrase: 'CLEAR ALL LOGS',
    });
  });
});
