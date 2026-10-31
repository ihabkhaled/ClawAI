import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SessionGlobalAction } from '@/enums/session-global-action.enum';
import { SessionGlobalStep } from '@/enums/session-global-step.enum';
import { userSessionsRepository } from '@/repositories/admin/user-sessions.repository';
import { showToast } from '@/utilities';

import { useGlobalSessionGuard } from '../use-global-session-guard';

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

const TOKEN = 'one-time-token-0123456789abcdef0123456789';

async function reachConfirm(
  result: { current: ReturnType<typeof useGlobalSessionGuard> },
  action = SessionGlobalAction.TERMINATE_ALL,
): Promise<void> {
  act(() => result.current.start(action));
  act(() => result.current.setPassword('my-own-password'));
  await act(async () => {
    await result.current.submitPassword();
  });
}

describe('useGlobalSessionGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userSessionsRepository.globalChallenge).mockResolvedValue({
      token: TOKEN,
      expiresInSeconds: 60,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts closed and opens the password step for the chosen action', () => {
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    expect(result.current.step).toBe(SessionGlobalStep.CLOSED);

    act(() => result.current.start(SessionGlobalAction.CLEAR_ALL_LOGS));

    expect(result.current.step).toBe(SessionGlobalStep.PASSWORD);
    expect(result.current.expectedPhrase).toBe('CLEAR ALL LOGS');
  });

  it('exchanges the password for a token, moves to the phrase step and wipes the password', async () => {
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });

    await reachConfirm(result);

    expect(userSessionsRepository.globalChallenge).toHaveBeenCalledWith(
      SessionGlobalAction.TERMINATE_ALL,
      'my-own-password',
    );
    expect(result.current.step).toBe(SessionGlobalStep.CONFIRM);
    expect(result.current.password).toBe('');
  });

  it('a wrong password stays on step one, clears the field and never reaches step two', async () => {
    vi.mocked(userSessionsRepository.globalChallenge).mockRejectedValue(new Error('bad'));
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });

    await reachConfirm(result);

    expect(result.current.step).toBe(SessionGlobalStep.PASSWORD);
    expect(result.current.password).toBe('');
    expect(showToast.apiError).toHaveBeenCalled();
  });

  it('does not call the server with an empty password', async () => {
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    act(() => result.current.start(SessionGlobalAction.TERMINATE_ALL));

    await act(async () => {
      await result.current.submitPassword();
    });

    expect(userSessionsRepository.globalChallenge).not.toHaveBeenCalled();
  });

  it('refuses to confirm until the phrase matches exactly', async () => {
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result);
    act(() => result.current.setPhrase('terminate all'));
    expect(result.current.isPhraseValid).toBe(false);

    await act(async () => {
      await result.current.submitConfirm();
    });

    expect(userSessionsRepository.globalTerminateAll).not.toHaveBeenCalled();
    expect(result.current.step).toBe(SessionGlobalStep.CONFIRM);
  });

  it('sends the token and phrase for terminate-all, then closes and reports success', async () => {
    vi.mocked(userSessionsRepository.globalTerminateAll).mockResolvedValue({
      terminatedFamilies: 0,
      terminatedRows: 7,
    });
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result);
    act(() => result.current.setPhrase('TERMINATE ALL'));

    await act(async () => {
      await result.current.submitConfirm();
    });

    expect(userSessionsRepository.globalTerminateAll).toHaveBeenCalledWith(TOKEN, 'TERMINATE ALL');
    expect(result.current.step).toBe(SessionGlobalStep.CLOSED);
    expect(result.current.lastResult).toEqual({ terminatedFamilies: 0, terminatedRows: 7 });
    expect(showToast.success).toHaveBeenCalled();
  });

  it('uses its own endpoint and phrase for clearing all logs', async () => {
    vi.mocked(userSessionsRepository.globalClearLogs).mockResolvedValue({ families: 2, rows: 5 });
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result, SessionGlobalAction.CLEAR_ALL_LOGS);
    act(() => result.current.setPhrase('CLEAR ALL LOGS'));

    await act(async () => {
      await result.current.submitConfirm();
    });

    expect(userSessionsRepository.globalClearLogs).toHaveBeenCalledWith(TOKEN, 'CLEAR ALL LOGS');
    expect(userSessionsRepository.globalTerminateAll).not.toHaveBeenCalled();
  });

  it('a refused token sends the admin back to the password step', async () => {
    vi.mocked(userSessionsRepository.globalTerminateAll).mockRejectedValue(
      Object.assign(new Error('x'), { code: 'GLOBAL_TOKEN_INVALID' }),
    );
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result);
    act(() => result.current.setPhrase('TERMINATE ALL'));

    await act(async () => {
      await result.current.submitConfirm();
    });

    expect(result.current.step).toBe(SessionGlobalStep.PASSWORD);
    expect(result.current.phrase).toBe('');
  });

  it('cancel drops everything, and the dropped token cannot be sent', async () => {
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result);
    act(() => result.current.setPhrase('TERMINATE ALL'));

    act(() => result.current.cancel());
    await act(async () => {
      await result.current.submitConfirm();
    });

    expect(result.current.step).toBe(SessionGlobalStep.CLOSED);
    expect(result.current.phrase).toBe('');
    expect(userSessionsRepository.globalTerminateAll).not.toHaveBeenCalled();
  });

  it('the confirmation lapses before the server token does and asks for the password again', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGlobalSessionGuard(), { wrapper });
    await reachConfirm(result);
    expect(result.current.step).toBe(SessionGlobalStep.CONFIRM);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(56_000);
    });

    expect(result.current.step).toBe(SessionGlobalStep.PASSWORD);
    expect(showToast.error).toHaveBeenCalled();
  });
});
