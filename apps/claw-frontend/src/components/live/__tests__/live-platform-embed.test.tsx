import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveChatPanel } from '@/components/live/live-chat-panel';
import { LiveNoAiPanel } from '@/components/live/live-no-ai-panel';
import { LivePlayer } from '@/components/live/live-player';
import { LiveSidePanel } from '@/components/live/live-side-panel';
import { LIVE_EMPTY_PLAYBACK } from '@/constants/live.constants';
import { LiveFeedTab, LiveStatusCode } from '@/enums/live.enum';
import { ResolvedTheme } from '@/enums/theme.enum';
import { LIVE_TRANSLATIONS } from '@/lib/i18n/locales/live-translations';
import type { LiveEmbedView, UseLiveModalResult, UseLivePlayerResult } from '@/types/live.types';

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

const PLAYER: UseLivePlayerResult = {
  videoRef: { current: null },
  snapshot: LIVE_EMPTY_PLAYBACK,
  hasPlayerError: false,
  readSnapshot: () => LIVE_EMPTY_PLAYBACK,
  seekTo: () => undefined,
  jumpToLive: () => undefined,
};

const TWITCH: LiveEmbedView = {
  playerUrl: 'https://player.twitch.tv/?channel=shroud&autoplay=true&parent=claw.local',
  chatUrl: 'https://www.twitch.tv/embed/shroud/chat?darkpopout&parent=claw.local',
  chatColorScheme: ResolvedTheme.DARK,
  watchUrl: 'https://www.twitch.tv/shroud',
  platformName: 'Twitch',
};

const TIKTOK: LiveEmbedView = {
  playerUrl: null,
  chatUrl: null,
  chatColorScheme: ResolvedTheme.DARK,
  watchUrl: 'https://www.tiktok.com/@a/live',
  platformName: 'TikTok',
};

function modal(embed: LiveEmbedView, tab = LiveFeedTab.FEED): UseLiveModalResult {
  return {
    t,
    locale: 'en',
    embed,
    isPlayerOnly: false,
    tab,
    setTab: () => undefined,
    cards: [],
    highlights: [],
    captions: [],
    captionTranslations: {},
    cardTranslations: {},
    status: LiveStatusCode.ANALYZING,
  } as unknown as UseLiveModalResult;
}

describe('LivePlayer', () => {
  it('frames the allowlisted platform embed with a Watch on link', () => {
    render(
      <LivePlayer
        embed={TWITCH}
        isLinkOnly={false}
        hlsSrc={null}
        player={PLAYER}
        caption={null}
        t={t}
      />,
    );
    const frame = screen.getByTitle('Twitch live stream');
    expect(frame).toHaveAttribute('src', TWITCH.playerUrl);
    const link = screen.getByRole('link', { name: 'Watch on Twitch' });
    expect(link).toHaveAttribute('href', TWITCH.watchUrl);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows an error, never an iframe, when the embed was refused by the allowlist', () => {
    const { container } = render(
      <LivePlayer
        embed={{ ...TWITCH, playerUrl: null }}
        isLinkOnly={false}
        hlsSrc={null}
        player={PLAYER}
        caption={null}
        t={t}
      />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent(t('live.modal.playerError'));
  });

  it('LINK_ONLY: names the platform and offers Watch on <Platform> in a new tab', () => {
    const { container } = render(
      <LivePlayer embed={TIKTOK} isLinkOnly hlsSrc={null} player={PLAYER} caption={null} t={t} />,
    );
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByTestId('live-link-only-player')).toHaveTextContent('TikTok');
    const link = screen.getByRole('link', { name: 'Watch on TikTok' });
    expect(link).toHaveAttribute('href', TIKTOK.watchUrl);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

describe('LiveNoAiPanel', () => {
  it('LINK_ONLY: explains the platform has no embeddable player and links its chat', () => {
    render(<LiveNoAiPanel embed={TIKTOK} isLinkOnly t={t} />);
    expect(screen.getByTestId('live-link-only-panel')).toHaveTextContent(
      'This platform has no embeddable player. Open the stream on TikTok to watch it.',
    );
    expect(screen.getByRole('link', { name: 'Open chat on TikTok' })).toHaveAttribute(
      'href',
      TIKTOK.watchUrl,
    );
  });
});

describe('LiveSidePanel chat', () => {
  it('adds a Live chat tab when the platform offers a chat embed', () => {
    render(<LiveSidePanel modal={modal(TWITCH, LiveFeedTab.CHAT)} />);
    expect(screen.getByRole('tab', { name: 'Live chat' })).toBeInTheDocument();
    expect(screen.getByTitle('Twitch live chat')).toHaveAttribute('src', TWITCH.chatUrl);
  });

  it('shows an Open chat on link instead when there is no chat embed', () => {
    const facebook: LiveEmbedView = {
      playerUrl: 'https://www.facebook.com/plugins/video.php?href=x',
      chatUrl: null,
      chatColorScheme: ResolvedTheme.DARK,
      watchUrl: 'https://www.facebook.com/page/videos/1',
      platformName: 'Facebook',
    };
    render(<LiveSidePanel modal={modal(facebook)} />);
    expect(screen.queryByRole('tab', { name: 'Live chat' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Open chat on Facebook' })).toHaveAttribute(
      'href',
      facebook.watchUrl,
    );
  });
});

describe('LiveChatPanel', () => {
  it('keeps the Open chat on link under the frame as the fallback for a refused frame', () => {
    render(<LiveChatPanel embed={TWITCH} t={t} />);
    expect(screen.getByTitle('Twitch live chat')).toHaveAttribute('src', TWITCH.chatUrl);
    expect(screen.getByRole('link', { name: 'Open chat on Twitch' })).toHaveAttribute(
      'href',
      TWITCH.watchUrl,
    );
  });

  it('shows the link and a message when there is no chat URL', () => {
    const { container } = render(<LiveChatPanel embed={{ ...TWITCH, chatUrl: null }} t={t} />);
    expect(container.querySelector('iframe')).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('The chat could not be shown here.');
    expect(screen.getByRole('link', { name: 'Open chat on Twitch' })).toBeInTheDocument();
  });
});
