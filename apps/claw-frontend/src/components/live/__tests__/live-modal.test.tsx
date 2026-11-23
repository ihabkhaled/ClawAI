import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LiveModal } from '@/components/live/live-modal';
import { LIVE_EMPTY_PLAYBACK } from '@/constants/live.constants';
import { LiveCaptureState, LiveFeedTab, LiveMode, LiveStatusCode } from '@/enums/live.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';
import type { LiveEmbedView, UseLiveModalResult } from '@/types/live.types';

const mocks = vi.hoisted(() => ({ modal: null as unknown }));

vi.mock('@/hooks/live/use-live-modal', () => ({ useLiveModal: () => mocks.modal }));

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

const TIKTOK: LiveEmbedView = {
  playerUrl: null,
  chatUrl: null,
  watchUrl: 'https://www.tiktok.com/@a/live',
  platformName: 'TikTok',
};

function serverPullModal(embed: LiveEmbedView): UseLiveModalResult {
  return {
    t,
    locale: 'en',
    session: { sessionId: 's1' },
    sessionError: null,
    isCreating: false,
    isPlayerOnly: false,
    isLinkOnly: false,
    isCapture: false,
    isServerPull: true,
    isPlayerLinkOut: embed.playerUrl === null,
    embed,
    capture: { source: null, state: LiveCaptureState.IDLE, error: null, isCapturing: false },
    hlsSrc: null,
    player: { snapshot: LIVE_EMPTY_PLAYBACK },
    status: LiveStatusCode.ANALYZING,
    showCreditsPanel: false,
    usage: null,
    isReconnecting: false,
    isLost: false,
    caption: null,
    captions: [],
    captionTranslations: {},
    cards: [],
    highlights: [],
    isBehindLive: false,
    tab: LiveFeedTab.FEED,
    setTab: () => undefined,
    controlsOpen: false,
    toggleControls: () => undefined,
  } as unknown as UseLiveModalResult;
}

const INPUT = {
  url: 'https://www.tiktok.com/@a/live',
  language: 'en',
  mode: LiveMode.AUDIO,
  attestRights: false,
};

describe('LiveModal', () => {
  it('SERVER_PULL without an embeddable player: link-out, server line and feed, no capture', () => {
    mocks.modal = serverPullModal(TIKTOK);
    render(<LiveModal input={INPUT} onClose={() => undefined} />);

    expect(screen.getByTestId('live-link-only-player')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch on TikTok' })).toHaveAttribute(
      'href',
      TIKTOK.watchUrl,
    );
    expect(screen.getByTestId('live-server-pull')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Smart Feed' })).toBeInTheDocument();
    expect(screen.queryByTitle(/live stream$/u)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Analyze/u })).not.toBeInTheDocument();
    expect(screen.queryByTestId('live-link-only-panel')).not.toBeInTheDocument();
    expect(screen.queryByText(t('live.modal.playerError'))).not.toBeInTheDocument();
  });
});
