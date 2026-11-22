import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  LiveCapability,
  LiveHeartbeatState,
  LiveSessionState,
  LiveSourceKind,
} from '@/enums/live.enum';
import type { LiveSession } from '@/types/live.types';
import {
  liveSessionHlsSrc,
  sendLiveCloseBeacon,
  toLiveCaptureHeartbeatInput,
  toLiveHeartbeatInput,
} from '@/utilities/live-session.utility';

const SESSION: LiveSession = {
  sessionId: 's1',
  runId: 'r1',
  streamId: 'st1',
  sourceKind: LiveSourceKind.HLS,
  capability: LiveCapability.AUDIO,
  embedUrl: null,
  playbackUrl: '/api/v1/live/streams/st1/hls/index.m3u8',
  state: LiveSessionState.CONNECTING,
  usage: {
    billedSeconds: 0,
    pendingSeconds: 0,
    spentMicroUsd: 0,
    paidApproved: false,
    spendingCapMicroUsd: null,
    month: {
      month: '2026-11',
      freeSecondsTotal: 1800,
      freeSecondsUsed: 0,
      paidMicroUsdPerMinute: 20_000,
      graceSeconds: 60,
      policyVersion: 1,
    },
  },
  closeToken: 'tok-123',
  platform: null,
  chatEmbedUrl: null,
  watchUrl: 'https://example.com/live.m3u8',
  embedNeedsParent: false,
  chatNeedsEmbedDomain: false,
};

describe('sendLiveCloseBeacon', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('posts { token } to the session close path (the field the server beacon reader takes)', async () => {
    const sendBeacon = vi.fn().mockReturnValue(true);
    vi.stubGlobal('navigator', { sendBeacon });
    expect(sendLiveCloseBeacon(SESSION)).toBe(true);
    const [url, body] = sendBeacon.mock.calls[0] as [string, Blob];
    expect(url).toMatch(/\/live\/sessions\/s1\/close$/u);
    expect(JSON.parse(await body.text())).toEqual({ token: 'tok-123' });
  });
});

describe('toLiveHeartbeatInput', () => {
  it('omits seekableFromAt when there is no seekable window, and sends it when there is', () => {
    expect(
      toLiveHeartbeatInput({
        playbackAt: 1000.4,
        isPaused: true,
        seekable: null,
        liveEdgeAt: null,
      }),
    ).toEqual({ state: LiveHeartbeatState.PAUSED, playbackAt: 1000, atLiveEdge: true });
    expect(
      toLiveHeartbeatInput({
        playbackAt: 5000,
        isPaused: false,
        seekable: { fromAt: 100.6, toAt: 5000 },
        liveEdgeAt: 5000,
      }),
    ).toMatchObject({ state: LiveHeartbeatState.PLAYING, seekableFromAt: 101 });
  });
});

describe('toLiveCaptureHeartbeatInput', () => {
  it('is now, at the live edge, PLAYING only while the tab audio is shared', () => {
    expect(toLiveCaptureHeartbeatInput(true, 1_700_000_000_000.4)).toEqual({
      state: LiveHeartbeatState.PLAYING,
      playbackAt: 1_700_000_000_000,
      atLiveEdge: true,
    });
    expect(toLiveCaptureHeartbeatInput(false, 5).state).toBe(LiveHeartbeatState.PAUSED);
  });
});

describe('liveSessionHlsSrc', () => {
  it('plays only HLS and fixture sources through the proxy', () => {
    expect(liveSessionHlsSrc(SESSION)).toContain('/live/streams/st1/hls/index.m3u8');
    expect(liveSessionHlsSrc({ ...SESSION, sourceKind: LiveSourceKind.YOUTUBE })).toBeNull();
    expect(liveSessionHlsSrc({ ...SESSION, sourceKind: LiveSourceKind.PLATFORM })).toBeNull();
    expect(liveSessionHlsSrc(null)).toBeNull();
  });
});
