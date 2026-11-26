import { render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { LiveSourceNotice } from '@/components/live/live-source-notice';
import { LiveCapability, LivePlatform, LiveSourceKind } from '@/enums/live.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';
import type { LiveSourceResolution } from '@/types/live.types';

/** The real English dictionary with {placeholders}, so a wrong key shows as a raw key. */
function t(key: string, params?: Record<string, string | number>): string {
  let node: unknown = { live: LIVE_TRANSLATIONS.en };
  for (const part of key.split('.')) {
    node =
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[part]
        : undefined;
  }
  if (typeof node !== 'string') {
    return key;
  }
  return node.replaceAll(/\{(\w+)\}/gu, (_match, name: string) => String(params?.[name] ?? ''));
}

const TWITCH: LiveSourceResolution = {
  sourceKind: LiveSourceKind.PLATFORM,
  capability: LiveCapability.SERVER_PULL,
  embedUrl: 'https://player.twitch.tv/?channel=shroud',
  reasonCode: 'SERVER_PULL_AVAILABLE',
  platform: LivePlatform.TWITCH,
  chatEmbedUrl: null,
  watchUrl: 'https://www.twitch.tv/shroud',
  embedNeedsParent: true,
  chatNeedsEmbedDomain: false,
};

function renderNotice(resolution: LiveSourceResolution): void {
  render(
    <LiveSourceNotice
      resolution={resolution}
      attestRights={false}
      onAttestChange={() => undefined}
      t={t}
    />,
  );
}

describe('LiveSourceNotice', () => {
  it('SERVER_PULL: says AI runs on ClawAI servers and works on phones', () => {
    renderNotice(TWITCH);
    const notice = screen.getByTestId('live-server-pull-notice');
    expect(notice).toHaveTextContent('AI runs on ClawAI servers');
    expect(notice).toHaveTextContent('Works on any device, including phones.');
    expect(notice).toHaveTextContent('Platform: Twitch');
  });

  it('RECORDED: says the server plays the video along from the start, on any device', () => {
    renderNotice({
      ...TWITCH,
      capability: LiveCapability.RECORDED,
      reasonCode: 'RECORDED_VIDEO',
      platform: LivePlatform.DAILYMOTION,
    });
    const notice = screen.getByTestId('live-recorded-notice');
    expect(notice).toHaveTextContent('Recorded video: AI plays along');
    expect(notice).toHaveTextContent('plays the video from the start');
    expect(notice).toHaveTextContent('Platform: Dailymotion');
  });

  it('LINK_ONLY after a failed server read: says ClawAI could not read it, never offers the device', () => {
    renderNotice({
      ...TWITCH,
      capability: LiveCapability.LINK_ONLY,
      reasonCode: 'SERVER_PULL_UNAVAILABLE',
      platform: LivePlatform.YOUTUBE,
    });
    const notice = screen.getByTestId('live-link-only-notice');
    expect(notice).toHaveTextContent('ClawAI could not read this YouTube link right now');
    expect(notice).not.toHaveTextContent('device');
  });

  it('BROWSER_CAPTURE after a failed server pull: explains the device audio fallback', () => {
    renderNotice({
      ...TWITCH,
      capability: LiveCapability.BROWSER_CAPTURE,
      reasonCode: 'SERVER_PULL_UNAVAILABLE',
    });
    expect(screen.getByTestId('live-capture-notice')).toHaveTextContent(
      'ClawAI could not read this stream directly, so AI uses your device’s audio.',
    );
  });

  it('BROWSER_CAPTURE with any other reason: no fallback line', () => {
    renderNotice({ ...TWITCH, capability: LiveCapability.BROWSER_CAPTURE, reasonCode: null });
    expect(screen.getByTestId('live-capture-notice')).not.toHaveTextContent(
      'could not read this stream directly',
    );
  });
});

describe('LiveSourceNotice capture wording by device', () => {
  const CAPTURE = { ...TWITCH, capability: LiveCapability.BROWSER_CAPTURE, reasonCode: null };
  const TAB_LINE = 'press “Analyze with my browser”';
  const MIC_LINE =
    'AI listens through your microphone while the Twitch stream plays. Keep its sound on.';

  function stubMediaDevices(devices: Record<string, unknown> | undefined): void {
    Object.defineProperty(navigator, 'mediaDevices', { value: devices, configurable: true });
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    stubMediaDevices(undefined);
  });

  it('a phone (microphone only) gets the microphone line', () => {
    vi.stubGlobal('AudioWorkletNode', class {});
    stubMediaDevices({ getUserMedia: vi.fn() });
    renderNotice(CAPTURE);
    const notice = screen.getByTestId('live-capture-notice');
    expect(notice).toHaveTextContent(MIC_LINE);
    expect(notice).not.toHaveTextContent(TAB_LINE);
  });

  it('a desktop (tab audio) keeps the tab line', () => {
    vi.stubGlobal('AudioWorkletNode', class {});
    stubMediaDevices({ getDisplayMedia: vi.fn(), getUserMedia: vi.fn() });
    renderNotice(CAPTURE);
    expect(screen.getByTestId('live-capture-notice')).toHaveTextContent(TAB_LINE);
  });

  it('the server render always uses the tab line (support is read only in the browser)', () => {
    vi.stubGlobal('AudioWorkletNode', class {});
    stubMediaDevices({ getUserMedia: vi.fn() });
    const html = renderToString(
      <LiveSourceNotice
        resolution={CAPTURE}
        attestRights={false}
        onAttestChange={() => undefined}
        t={t}
      />,
    );
    expect(html).toContain('Analyze with my browser');
    expect(html).not.toContain('listens through your microphone');
  });
});
