import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LIVE_EMPTY_PLAYBACK } from '@/constants/live.constants';
import {
  LiveCapability,
  LiveCaptureState,
  LiveMode,
  LiveSessionState,
  LiveSourceKind,
  LiveStatusCode,
} from '@/enums/live.enum';
import { useLiveModal } from '@/hooks/live/use-live-modal';
import type { LiveSession } from '@/types/live.types';

const mocks = vi.hoisted(() => ({
  session: null as unknown,
  capture: vi.fn(),
  playback: vi.fn(),
  wallClock: vi.fn(),
  playerUrl: null as string | null,
}));

vi.mock('@/lib/i18n', () => ({
  useTranslation: () => ({ t: (key: string) => key, locale: 'en' }),
}));
vi.mock('@/hooks/live/use-live-session', () => ({
  useLiveSession: () => ({ session: mocks.session, isCreating: false, error: null }),
}));
vi.mock('@/hooks/live/use-live-embed', () => ({
  useLiveEmbed: () => ({
    playerUrl: mocks.playerUrl,
    chatUrl: null,
    watchUrl: null,
    platformName: null,
  }),
}));
vi.mock('@/hooks/live/use-live-stream', () => ({
  useLiveStream: () => ({
    feed: {
      captions: [],
      captionTranslations: {},
      cardTranslations: {},
      cards: [],
      highlights: [],
      status: LiveStatusCode.ANALYZING,
      usage: null,
    },
    setStatus: vi.fn(),
    setUsage: vi.fn(),
    isReconnecting: false,
    isLost: false,
  }),
}));
vi.mock('@/hooks/live/use-live-capture', () => ({
  useLiveCapture: (options: unknown) => {
    mocks.capture(options);
    return { source: null, state: LiveCaptureState.IDLE, error: null, isCapturing: false };
  },
}));
vi.mock('@/hooks/live/use-live-modal-playback', () => ({
  useLiveModalPlayback: (...args: unknown[]) => {
    mocks.playback(...args);
    return {
      player: { snapshot: { ...LIVE_EMPTY_PLAYBACK, isPaused: true } },
      heartbeatError: false,
    };
  },
}));
vi.mock('@/hooks/live/use-live-wall-clock', () => ({
  useLiveWallClock: (enabled: boolean) => {
    mocks.wallClock(enabled);
    return enabled ? 1_700_000_000_000 : 0;
  },
}));
vi.mock('@/hooks/live/use-live-usage', () => ({ useLiveUsage: () => ({ usage: null }) }));

function session(capability: LiveCapability): LiveSession {
  return {
    sessionId: 's1',
    runId: 'r1',
    streamId: 'st1',
    sourceKind: LiveSourceKind.PLATFORM,
    capability,
    embedUrl: 'https://player.twitch.tv/?channel=shroud',
    playbackUrl: null,
    state: LiveSessionState.ACTIVE,
    usage: {} as LiveSession['usage'],
    closeToken: 'tok',
    platform: null,
    chatEmbedUrl: null,
    watchUrl: 'https://www.twitch.tv/shroud',
    embedNeedsParent: true,
    chatNeedsEmbedDomain: false,
  };
}

const INPUT = {
  url: 'https://www.twitch.tv/shroud',
  language: 'en',
  mode: LiveMode.AUDIO,
  attestRights: false,
};

describe('useLiveModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.playerUrl = 'https://player.twitch.tv/?channel=shroud&parent=claw.local';
  });

  it('SERVER_PULL: wall-clock reveal, no capture, never paused, heartbeats as always playing', () => {
    mocks.session = session(LiveCapability.SERVER_PULL);
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isServerPull).toBe(true);
    expect(result.current.isCapture).toBe(false);
    expect(result.current.isPlayerOnly).toBe(false);
    expect(result.current.status).toBe(LiveStatusCode.ANALYZING);
    expect(mocks.wallClock).toHaveBeenLastCalledWith(true);
    expect(mocks.capture).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    const playbackArgs = mocks.playback.mock.lastCall ?? [];
    expect(playbackArgs[2]).toBe(true);
    expect(playbackArgs[5]).toEqual({ isCapture: true, isCapturing: true });
    expect(result.current.isPlayerLinkOut).toBe(false);
  });

  it('SERVER_PULL with no embeddable player: link-out player, feed and AI still on', () => {
    mocks.session = { ...session(LiveCapability.SERVER_PULL), embedUrl: null };
    mocks.playerUrl = null;
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isPlayerLinkOut).toBe(true);
    expect(result.current.isLinkOnly).toBe(false);
    expect(result.current.isPlayerOnly).toBe(false);
    expect(result.current.isServerPull).toBe(true);
    expect(mocks.capture).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    expect(mocks.playback.mock.lastCall?.[2]).toBe(true);
  });

  it('RECORDED: read by the server like a live stream, a link-out when the platform has no player', () => {
    mocks.session = { ...session(LiveCapability.RECORDED), embedUrl: null };
    mocks.playerUrl = null;
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isServerPull).toBe(true);
    expect(result.current.isCapture).toBe(false);
    expect(result.current.isPlayerOnly).toBe(false);
    expect(result.current.isPlayerLinkOut).toBe(true);
    expect(mocks.capture).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: false }));
    expect(mocks.playback.mock.lastCall?.[2]).toBe(true);
  });

  it('a one-click summary reveals the whole report at once, with times as offsets', () => {
    mocks.session = {
      ...session(LiveCapability.RECORDED),
      summary: true,
      mediaStartAt: 1_000_000,
    };
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isSummary).toBe(true);
    expect(result.current.clockOrigin).toBe(1_000_000);
    expect(result.current.isServerPull).toBe(true);
  });

  it('LINK_ONLY: link-out player and no AI', () => {
    mocks.session = session(LiveCapability.LINK_ONLY);
    mocks.playerUrl = null;
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isPlayerLinkOut).toBe(true);
    expect(result.current.isPlayerOnly).toBe(true);
  });

  it('BROWSER_CAPTURE: capture on, reads as paused until the viewer shares audio', () => {
    mocks.session = session(LiveCapability.BROWSER_CAPTURE);
    const { result } = renderHook(() => useLiveModal(INPUT));

    expect(result.current.isServerPull).toBe(false);
    expect(result.current.isCapture).toBe(true);
    expect(result.current.status).toBe(LiveStatusCode.PAUSED);
    expect(mocks.capture).toHaveBeenLastCalledWith(expect.objectContaining({ enabled: true }));
    expect(mocks.playback.mock.lastCall?.[5]).toEqual({ isCapture: true, isCapturing: false });
  });
});
