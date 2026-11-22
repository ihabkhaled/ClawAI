import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_HEARTBEAT_INTERVAL_MS } from '@/constants/live.constants';
import { LiveHeartbeatState, LiveSessionState, LiveStatusCode } from '@/enums/live.enum';
import { useLiveHeartbeat } from '@/hooks/live/use-live-heartbeat';
import type { LiveHeartbeatInput, LiveSessionUsage } from '@/types/live.types';

const mockHeartbeat = vi.fn();

vi.mock('@/repositories/live/live.repository', () => ({
  liveRepository: { heartbeat: (...args: unknown[]) => mockHeartbeat(...args) },
}));

const INPUT: LiveHeartbeatInput = {
  state: LiveHeartbeatState.PLAYING,
  playbackAt: 1_700_000_000_000,
  atLiveEdge: true,
  seekableFromAt: 1_699_999_000_000,
};

/** The real `LiveSessionUsageView` block of a heartbeat response. */
const USAGE: LiveSessionUsage = {
  billedSeconds: 60,
  pendingSeconds: 10,
  spentMicroUsd: 0,
  paidApproved: false,
  spendingCapMicroUsd: null,
  month: {
    month: '2026-11',
    freeSecondsTotal: 1800,
    freeSecondsUsed: 60,
    paidMicroUsdPerMinute: 20_000,
    graceSeconds: 60,
    policyVersion: 1,
  },
};

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useLiveHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockHeartbeat.mockReset();
    mockHeartbeat.mockResolvedValue({
      state: LiveSessionState.ACTIVE,
      statusCode: LiveStatusCode.ANALYZING,
      usage: USAGE,
    });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends every 10 s while enabled and reports the server status code and usage', async () => {
    const onStatus = vi.fn();
    const onUsage = vi.fn();
    renderHook(
      () =>
        useLiveHeartbeat({
          sessionId: 's1',
          enabled: true,
          getSnapshot: () => INPUT,
          onStatus,
          onUsage,
        }),
      { wrapper },
    );
    expect(mockHeartbeat).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_HEARTBEAT_INTERVAL_MS);
    });
    expect(mockHeartbeat).toHaveBeenCalledWith('s1', INPUT);
    expect(onStatus).toHaveBeenCalledWith(LiveStatusCode.ANALYZING);
    expect(onUsage).toHaveBeenCalledWith(USAGE);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_HEARTBEAT_INTERVAL_MS);
    });
    expect(mockHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('sendNow sends immediately (play, pause, seek)', async () => {
    const { result } = renderHook(
      () =>
        useLiveHeartbeat({
          sessionId: 's1',
          enabled: true,
          getSnapshot: () => INPUT,
          onStatus: vi.fn(),
          onUsage: vi.fn(),
        }),
      { wrapper },
    );
    await act(async () => {
      result.current.sendNow();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(mockHeartbeat).toHaveBeenCalledTimes(1);
  });

  it('sends nothing when disabled (player-only source) or before the first frame', async () => {
    renderHook(
      () =>
        useLiveHeartbeat({
          sessionId: 's1',
          enabled: false,
          getSnapshot: () => INPUT,
          onStatus: vi.fn(),
          onUsage: vi.fn(),
        }),
      { wrapper },
    );
    renderHook(
      () =>
        useLiveHeartbeat({
          sessionId: 's2',
          enabled: true,
          getSnapshot: () => null,
          onStatus: vi.fn(),
          onUsage: vi.fn(),
        }),
      { wrapper },
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(LIVE_HEARTBEAT_INTERVAL_MS * 3);
    });
    expect(mockHeartbeat).not.toHaveBeenCalled();
  });

  it('surfaces a failed heartbeat instead of hiding it', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    mockHeartbeat.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(
      () =>
        useLiveHeartbeat({
          sessionId: 's1',
          enabled: true,
          getSnapshot: () => INPUT,
          onStatus: vi.fn(),
          onUsage: vi.fn(),
        }),
      { wrapper },
    );
    await act(async () => {
      result.current.sendNow();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.hasError).toBe(true);
  });
});
