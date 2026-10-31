import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionState } from '@/enums/session-state.enum';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import type { UserSession } from '@/types/admin-sessions.types';
import { showToast } from '@/utilities';

import { useUserSessionActions } from '../use-user-session-actions';
import { useUserSessionsQuery } from '../use-user-sessions-query';

vi.mock('@/repositories/admin/user-sessions.repository');
vi.mock('@/lib/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock('@/utilities', () => ({
  showToast: { success: vi.fn(), apiError: vi.fn(), error: vi.fn() },
  logger: { info: vi.fn(), warn: vi.fn() },
}));

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client }, children);
}

const live = { familyId: 'fam-1', state: SessionState.ACTIVE, isCurrent: false } as UserSession;
const current = { ...live, familyId: 'fam-me', isCurrent: true } as UserSession;

describe('useUserSessionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userSessionsRepository.terminateOne).mockResolvedValue({
      terminatedFamilies: 1,
      terminatedRows: 1,
    });
    vi.mocked(userSessionsRepository.terminateAll).mockResolvedValue({
      terminatedFamilies: 2,
      terminatedRows: 3,
    });
    vi.mocked(userSessionsRepository.clearOne).mockResolvedValue({ families: 1, rows: 1 });
    vi.mocked(userSessionsRepository.clearInactive).mockResolvedValue({ families: 2, rows: 4 });
  });

  it('ends one login of someone else without the current-session confirm', async () => {
    const { result } = renderHook(() => useUserSessionActions('u1', false), { wrapper });
    let ok = false;
    await act(async () => {
      ok = await result.current.perform({ kind: 'terminate-one', session: live });
    });
    expect(ok).toBe(true);
    expect(userSessionsRepository.terminateOne).toHaveBeenCalledWith('u1', 'fam-1', false);
    expect(showToast.success).toHaveBeenCalled();
  });

  it('sends the explicit confirm when the login is the admin own current one', async () => {
    const { result } = renderHook(() => useUserSessionActions('me', true), { wrapper });
    await act(async () => {
      await result.current.perform({ kind: 'terminate-one', session: current });
    });
    expect(userSessionsRepository.terminateOne).toHaveBeenCalledWith('me', 'fam-me', true);
  });

  it('ending all of your own logins confirms; all of another user does not', async () => {
    const own = renderHook(() => useUserSessionActions('me', true), { wrapper });
    await act(async () => {
      await own.result.current.perform({ kind: 'terminate-all' });
    });
    expect(userSessionsRepository.terminateAll).toHaveBeenLastCalledWith('me', true);

    const other = renderHook(() => useUserSessionActions('u1', false), { wrapper });
    await act(async () => {
      await other.result.current.perform({ kind: 'terminate-all' });
    });
    expect(userSessionsRepository.terminateAll).toHaveBeenLastCalledWith('u1', false);
  });

  it('clears one log or all finished logs', async () => {
    const { result } = renderHook(() => useUserSessionActions('u1', false), { wrapper });
    await act(async () => {
      await result.current.perform({ kind: 'clear-one', session: live });
      await result.current.perform({ kind: 'clear-all' });
    });
    expect(userSessionsRepository.clearOne).toHaveBeenCalledWith('u1', 'fam-1');
    expect(userSessionsRepository.clearInactive).toHaveBeenCalledWith('u1');
  });

  it('reports a refusal as false and shows the translated error', async () => {
    vi.mocked(userSessionsRepository.clearOne).mockRejectedValue(new Error('SESSION_ACTIVE'));
    const { result } = renderHook(() => useUserSessionActions('u1', false), { wrapper });
    let ok = true;
    await act(async () => {
      ok = await result.current.perform({ kind: 'clear-one', session: live });
    });
    expect(ok).toBe(false);
    expect(showToast.apiError).toHaveBeenCalled();
  });
});

describe('useUserSessionsQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userSessionsRepository.list).mockResolvedValue({
      user: { id: 'u1', username: 'ann' },
      data: [],
      meta: { total: 45, page: 1, pageSize: 10, totalPages: 5 },
      summary: { active: 1, expired: 2, terminated: 3, total: 6 },
    });
  });

  it('loads page one of every state and exposes the summary', async () => {
    const { result } = renderHook(() => useUserSessionsQuery('u1', true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(userSessionsRepository.list).toHaveBeenCalledWith('u1', null, 1, 10);
    expect(result.current.response.summary.terminated).toBe(3);
  });

  it('changing the filter goes back to page one', async () => {
    const { result } = renderHook(() => useUserSessionsQuery('u1', true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(3));
    act(() => result.current.setStateFilter(SessionState.EXPIRED));
    await waitFor(() =>
      expect(userSessionsRepository.list).toHaveBeenLastCalledWith('u1', 'EXPIRED', 1, 10),
    );
    expect(result.current.page).toBe(1);
  });

  it('changing the page size goes back to page one', async () => {
    const { result } = renderHook(() => useUserSessionsQuery('u1', true), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.setPage(2));
    act(() => result.current.setPageSize(25));
    await waitFor(() =>
      expect(userSessionsRepository.list).toHaveBeenLastCalledWith('u1', null, 1, 25),
    );
  });

  it('does not call the API for a non-admin', () => {
    renderHook(() => useUserSessionsQuery('u1', false), { wrapper });
    expect(userSessionsRepository.list).not.toHaveBeenCalled();
  });
});
