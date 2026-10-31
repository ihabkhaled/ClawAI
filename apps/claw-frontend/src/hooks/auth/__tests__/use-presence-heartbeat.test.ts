import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PRESENCE_HEARTBEAT_INTERVAL_MS } from '@/constants/admin-user-management.constants';
import { usePresenceHeartbeat } from '@/hooks/auth/use-presence-heartbeat';

const { sendHeartbeat, authState } = vi.hoisted(() => ({
  sendHeartbeat: vi.fn(),
  authState: { isAuthenticated: true },
}));

vi.mock('@/repositories/presence/presence.repository', () => ({
  presenceRepository: { sendHeartbeat },
}));
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: (selector: (state: { isAuthenticated: boolean }) => unknown) => selector(authState),
}));

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('usePresenceHeartbeat', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    sendHeartbeat.mockReset().mockResolvedValue(undefined);
    authState.isAuthenticated = true;
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pings at once, then once a minute while the tab is visible', () => {
    renderHook(() => usePresenceHeartbeat());
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS);
    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS * 3);
    expect(sendHeartbeat).toHaveBeenCalledTimes(5);
  });

  it('uses a 60 second interval', () => {
    expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBe(60_000);
  });

  it('does nothing when signed out', () => {
    authState.isAuthenticated = false;
    renderHook(() => usePresenceHeartbeat());
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS * 3);
    expect(sendHeartbeat).not.toHaveBeenCalled();
  });

  it('stops while the tab is hidden and resumes with a ping when it is shown again', () => {
    renderHook(() => usePresenceHeartbeat());
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    setVisibility('hidden');
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS * 5);
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS);
    expect(sendHeartbeat).toHaveBeenCalledTimes(3);
  });

  it('does not ping at all when mounted in a hidden tab', () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    renderHook(() => usePresenceHeartbeat());
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS * 2);
    expect(sendHeartbeat).not.toHaveBeenCalled();
  });

  it('swallows a failed ping: no throw, no retry loop', async () => {
    sendHeartbeat.mockRejectedValue(new Error('401'));
    renderHook(() => usePresenceHeartbeat());
    await vi.advanceTimersByTimeAsync(PRESENCE_HEARTBEAT_INTERVAL_MS);
    expect(sendHeartbeat).toHaveBeenCalledTimes(2);
  });

  it('stops pinging after unmount', () => {
    const { unmount } = renderHook(() => usePresenceHeartbeat());
    unmount();
    vi.advanceTimersByTime(PRESENCE_HEARTBEAT_INTERVAL_MS * 3);
    expect(sendHeartbeat).toHaveBeenCalledTimes(1);
  });
});
