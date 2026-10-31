import type { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { apiClient } from '@/services/shared/api-client';
import type {
  SessionClearResult,
  SessionGlobalChallengeResponse,
  SessionStateFilter,
  SessionTerminateResult,
  UserSessionsResponse,
} from '@/types/admin-sessions.types';

const USERS_BASE = '/users';
const GLOBAL_BASE = '/auth/session-security';

/** One call per endpoint (ADR-204). No token or password is ever kept by this module. */
export const userSessionsRepository = {
  async list(
    userId: string,
    state: SessionStateFilter,
    page: number,
    pageSize: number,
  ): Promise<UserSessionsResponse> {
    const params: Record<string, string> = { page: String(page), pageSize: String(pageSize) };
    if (state !== null) {
      params.state = state;
    }
    const response = await apiClient.get<UserSessionsResponse>(
      `${USERS_BASE}/${userId}/sessions`,
      params,
    );
    return response.data;
  },

  async terminateOne(
    userId: string,
    familyId: string,
    confirmCurrent: boolean,
  ): Promise<SessionTerminateResult> {
    const response = await apiClient.post<SessionTerminateResult>(
      `${USERS_BASE}/${userId}/sessions/${familyId}/terminate`,
      confirmCurrent ? { confirmCurrent: true } : {},
    );
    return response.data;
  },

  async terminateAll(userId: string, confirmCurrent: boolean): Promise<SessionTerminateResult> {
    const response = await apiClient.post<SessionTerminateResult>(
      `${USERS_BASE}/${userId}/sessions/terminate-all`,
      confirmCurrent ? { confirmCurrent: true } : {},
    );
    return response.data;
  },

  async clearOne(userId: string, familyId: string): Promise<SessionClearResult> {
    const response = await apiClient.delete<SessionClearResult>(
      `${USERS_BASE}/${userId}/sessions/${familyId}/log`,
    );
    return response.data;
  },

  async clearInactive(userId: string): Promise<SessionClearResult> {
    const response = await apiClient.delete<SessionClearResult>(
      `${USERS_BASE}/${userId}/sessions/logs`,
    );
    return response.data;
  },

  /** Step one of a system-wide action: prove your own password, get a one-time token. */
  async globalChallenge(
    action: SessionGlobalAction,
    password: string,
  ): Promise<SessionGlobalChallengeResponse> {
    const response = await apiClient.post<SessionGlobalChallengeResponse>(
      `${GLOBAL_BASE}/challenge`,
      { action, password },
    );
    return response.data;
  },

  async globalTerminateAll(token: string, phrase: string): Promise<SessionTerminateResult> {
    const response = await apiClient.post<SessionTerminateResult>(`${GLOBAL_BASE}/terminate-all`, {
      token,
      phrase,
      keepCurrentSession: true,
    });
    return response.data;
  },

  async globalClearLogs(token: string, phrase: string): Promise<SessionClearResult> {
    const response = await apiClient.post<SessionClearResult>(`${GLOBAL_BASE}/clear-logs`, {
      token,
      phrase,
    });
    return response.data;
  },
};
