import { describe, expect, it } from 'vitest';

import { LiveCapability, LivePlatform } from '@/enums/live.enum';
import type { LivePlatformFields } from '@/types/live.types';
import {
  allowlistedLiveUrl,
  appendLiveQueryParam,
  buildLiveChatEmbedUrl,
  buildLiveEmbedView,
  buildLivePlayerEmbedUrl,
  livePlatformName,
  safeLiveWatchUrl,
} from '@/utilities/live-embed.utility';

const BASE: LivePlatformFields & { embedUrl: string | null; capability: LiveCapability } = {
  platform: LivePlatform.TWITCH,
  embedUrl: 'https://player.twitch.tv/?channel=shroud&autoplay=true',
  chatEmbedUrl: 'https://www.twitch.tv/embed/shroud/chat?darkpopout',
  watchUrl: 'https://www.twitch.tv/shroud',
  embedNeedsParent: true,
  chatNeedsEmbedDomain: false,
  capability: LiveCapability.BROWSER_CAPTURE,
};

describe('allowlistedLiveUrl', () => {
  const allow = ['https://player.kick.com'];

  it('keeps an https URL whose origin is allowlisted', () => {
    expect(allowlistedLiveUrl('https://player.kick.com/xqc?autoplay=true', allow)).toBe(
      'https://player.kick.com/xqc?autoplay=true',
    );
  });

  it.each([
    'https://evil.example/player',
    'http://player.kick.com/xqc',
    'https://player.kick.com.evil.example/xqc',
    'javascript:alert(1)',
    'not a url',
    '',
    null,
    undefined,
  ])('refuses %s', (url) => {
    expect(allowlistedLiveUrl(url, allow)).toBeNull();
  });
});

describe('appendLiveQueryParam', () => {
  it('appends with & or ? and encodes the value, keeping flag-only params', () => {
    expect(appendLiveQueryParam('https://a.test/x?darkpopout', 'parent', 'claw.local')).toBe(
      'https://a.test/x?darkpopout&parent=claw.local',
    );
    expect(appendLiveQueryParam('https://a.test/x', 'p', 'a b')).toBe('https://a.test/x?p=a%20b');
  });
});

describe('buildLivePlayerEmbedUrl', () => {
  it('adds parent=<hostname> for Twitch', () => {
    expect(buildLivePlayerEmbedUrl(BASE.embedUrl, true, 'claw.local')).toBe(
      'https://player.twitch.tv/?channel=shroud&autoplay=true&parent=claw.local',
    );
  });

  it('leaves the YouTube nocookie embed exactly as the server sent it', () => {
    const url = 'https://www.youtube-nocookie.com/embed/abc?autoplay=1&playsinline=1';
    expect(buildLivePlayerEmbedUrl(url, false, 'claw.local')).toBe(url);
  });

  it('refuses a player origin outside the allowlist (www.youtube.com is a chat host only)', () => {
    expect(buildLivePlayerEmbedUrl('https://www.youtube.com/embed/abc', false, 'x')).toBeNull();
    expect(buildLivePlayerEmbedUrl('https://evil.example/embed', true, 'x')).toBeNull();
  });
});

describe('buildLiveChatEmbedUrl', () => {
  it('adds parent for Twitch chat', () => {
    expect(buildLiveChatEmbedUrl(BASE, 'claw.local')).toBe(
      'https://www.twitch.tv/embed/shroud/chat?darkpopout&parent=claw.local',
    );
  });

  it('adds embed_domain for YouTube live chat', () => {
    expect(
      buildLiveChatEmbedUrl(
        {
          chatEmbedUrl: 'https://www.youtube.com/live_chat?v=abc',
          embedNeedsParent: false,
          chatNeedsEmbedDomain: true,
        },
        'clawai.example',
      ),
    ).toBe('https://www.youtube.com/live_chat?v=abc&embed_domain=clawai.example');
  });

  it('keeps Kick chat as is and refuses a chat host outside the allowlist', () => {
    const kick = {
      chatEmbedUrl: 'https://kick.com/popout/xqc/chat',
      embedNeedsParent: false,
      chatNeedsEmbedDomain: false,
    };
    expect(buildLiveChatEmbedUrl(kick, 'claw.local')).toBe('https://kick.com/popout/xqc/chat');
    expect(
      buildLiveChatEmbedUrl({ ...kick, chatEmbedUrl: 'https://player.kick.com/xqc' }, 'claw.local'),
    ).toBeNull();
    expect(buildLiveChatEmbedUrl({ ...kick, chatEmbedUrl: null }, 'claw.local')).toBeNull();
  });
});

describe('safeLiveWatchUrl and livePlatformName', () => {
  it('allows only https pages', () => {
    expect(safeLiveWatchUrl('https://www.tiktok.com/@a/live')).toBe(
      'https://www.tiktok.com/@a/live',
    );
    expect(safeLiveWatchUrl('javascript:alert(1)')).toBeNull();
    expect(safeLiveWatchUrl('http://t.me/x')).toBeNull();
  });

  it('names a platform by its brand and returns null without one', () => {
    expect(livePlatformName(LivePlatform.BIGO)).toBe('BIGO LIVE');
    expect(livePlatformName(null)).toBeNull();
    expect(livePlatformName(undefined)).toBeNull();
  });
});

describe('buildLiveEmbedView', () => {
  it('builds player, chat and watch links for an embeddable platform', () => {
    expect(buildLiveEmbedView(BASE, 'claw.local')).toEqual({
      playerUrl: 'https://player.twitch.tv/?channel=shroud&autoplay=true&parent=claw.local',
      chatUrl: 'https://www.twitch.tv/embed/shroud/chat?darkpopout&parent=claw.local',
      watchUrl: 'https://www.twitch.tv/shroud',
      platformName: 'Twitch',
    });
  });

  it('has no player for a link-only platform, only its watch page', () => {
    const view = buildLiveEmbedView(
      {
        ...BASE,
        platform: LivePlatform.TIKTOK,
        capability: LiveCapability.LINK_ONLY,
        embedUrl: null,
        chatEmbedUrl: null,
        watchUrl: 'https://www.tiktok.com/@a/live',
        embedNeedsParent: false,
      },
      'claw.local',
    );
    expect(view).toEqual({
      playerUrl: null,
      chatUrl: null,
      watchUrl: 'https://www.tiktok.com/@a/live',
      platformName: 'TikTok',
    });
  });

  it('gives an HLS source (no platform) no watch link', () => {
    const view = buildLiveEmbedView(
      {
        ...BASE,
        platform: null,
        embedUrl: null,
        chatEmbedUrl: null,
        watchUrl: 'https://example.com/live.m3u8',
        capability: LiveCapability.AUDIO,
      },
      'claw.local',
    );
    expect(view.watchUrl).toBeNull();
    expect(view.platformName).toBeNull();
  });
});
