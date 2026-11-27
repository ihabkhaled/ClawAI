import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BotCheckAction } from '@/enums/bot-check-action.enum';
import { BotCheckStatus } from '@/enums/bot-check-status.enum';
import { useBotCheck } from '@/hooks/auth/use-bot-check';

const mocks = vi.hoisted(() => ({
  session: {
    setContainer: vi.fn(),
    prepare: vi.fn(),
    collect: vi.fn(),
    markRequired: vi.fn(),
    isRequired: vi.fn(() => false),
    dispose: vi.fn(),
  },
  createSession: vi.fn(),
  getConfig: vi.fn(),
}));

vi.mock('@/services/auth/bot-check.service', () => ({
  botCheckService: { createSession: mocks.createSession },
}));
vi.mock('@/repositories/auth/bot-check.repository', () => ({
  botCheckRepository: { getConfig: mocks.getConfig },
}));

function wrapper({ children }: { children: ReactNode }): React.ReactElement {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe('useBotCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSession.mockReturnValue(mocks.session);
    mocks.session.collect.mockResolvedValue({ pow: { token: 't', nonce: '1' } });
    mocks.getConfig.mockResolvedValue({
      pow: { enabled: true, difficulty: 12 },
      turnstile: null,
      recaptcha: null,
    });
  });

  it('sign-up warms the checks up as soon as the form mounts', () => {
    renderHook(() => useBotCheck(BotCheckAction.REGISTER, true), { wrapper });
    expect(mocks.createSession).toHaveBeenCalledWith(
      BotCheckAction.REGISTER,
      true,
      expect.any(Function),
      expect.any(Function),
    );
    expect(mocks.session.prepare).toHaveBeenCalledTimes(1);
  });

  it('sign-in starts nothing until it is asked to collect', async () => {
    const { result } = renderHook(() => useBotCheck(BotCheckAction.LOGIN, false), { wrapper });
    expect(mocks.session.prepare).not.toHaveBeenCalled();
    await expect(result.current.collect()).resolves.toEqual({ pow: { token: 't', nonce: '1' } });
  });

  it('reads the config through the query cache and reports status changes', async () => {
    const { result } = renderHook(() => useBotCheck(BotCheckAction.REGISTER, true), { wrapper });
    const [, , onStatusChange, loadConfig] = mocks.createSession.mock.calls[0] ?? [];
    await expect((loadConfig as () => Promise<unknown>)()).resolves.toMatchObject({
      pow: { enabled: true },
    });
    act(() => (onStatusChange as (status: BotCheckStatus) => void)(BotCheckStatus.CHECKING));
    expect(result.current.isChecking).toBe(true);
  });

  it('hands the Turnstile container to the session and disposes it on unmount', () => {
    const { result, unmount } = renderHook(() => useBotCheck(BotCheckAction.REGISTER, true), {
      wrapper,
    });
    const container = document.createElement('div');
    act(() => result.current.setTurnstileContainer(container));
    expect(mocks.session.setContainer).toHaveBeenLastCalledWith(container);
    unmount();
    expect(mocks.session.dispose).toHaveBeenCalled();
  });
});
