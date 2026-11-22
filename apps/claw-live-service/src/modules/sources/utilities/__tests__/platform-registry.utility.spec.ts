import { LiveCapability, LivePlatform, LiveSourceKind } from '../../../../generated/prisma';
import { LIVE_PLATFORM_REGISTRY } from '../../constants/platform-registry.constants';
import { resolvePlatformUrl } from '../platform-registry.utility';

const resolve = (value: string) => resolvePlatformUrl(new URL(value));

describe('LIVE_PLATFORM_REGISTRY', () => {
  it('covers all 15 platforms', () => {
    const platforms = new Set(LIVE_PLATFORM_REGISTRY.map((row) => row.platform));
    expect([...platforms].sort()).toEqual(Object.values(LivePlatform).sort());
  });

  it('only YouTube rows use the YOUTUBE source kind; Discord alone is refused', () => {
    for (const row of LIVE_PLATFORM_REGISTRY) {
      expect(row.sourceKind === LiveSourceKind.YOUTUBE).toBe(row.platform === LivePlatform.YOUTUBE);
      expect(row.refusalCode !== null).toBe(row.platform === LivePlatform.DISCORD);
    }
  });
});

describe('resolvePlatformUrl', () => {
  it.each([
    [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      LivePlatform.YOUTUBE,
      LiveCapability.BROWSER_CAPTURE,
    ],
    [
      'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg',
      LivePlatform.YOUTUBE,
      LiveCapability.BROWSER_CAPTURE,
    ],
    ['https://www.twitch.tv/shroud', LivePlatform.TWITCH, LiveCapability.BROWSER_CAPTURE],
    ['https://kick.com/xqc', LivePlatform.KICK, LiveCapability.BROWSER_CAPTURE],
    ['https://fb.watch/abcd12/', LivePlatform.FACEBOOK, LiveCapability.BROWSER_CAPTURE],
    ['https://www.tiktok.com/@x_y/live', LivePlatform.TIKTOK, LiveCapability.LINK_ONLY],
    ['https://www.instagram.com/nasa/live', LivePlatform.INSTAGRAM, LiveCapability.LINK_ONLY],
    ['https://rumble.com/c/abc/live', LivePlatform.RUMBLE, LiveCapability.LINK_ONLY],
    ['https://www.bigo.tv/12345', LivePlatform.BIGO, LiveCapability.LINK_ONLY],
    ['https://www.linkedin.com/events/abc-1/', LivePlatform.LINKEDIN, LiveCapability.LINK_ONLY],
    ['https://t.me/channel_x?livestream', LivePlatform.TELEGRAM, LiveCapability.LINK_ONLY],
    ['https://live.bilibili.com/123', LivePlatform.BILIBILI, LiveCapability.LINK_ONLY],
    [
      'https://chzzk.naver.com/live/0123456789abcdef0123456789abcdef',
      LivePlatform.CHZZK,
      LiveCapability.LINK_ONLY,
    ],
    ['https://play.sooplive.co.kr/abc123', LivePlatform.SOOP, LiveCapability.LINK_ONLY],
    ['https://www.nimo.tv/someone', LivePlatform.NIMO, LiveCapability.LINK_ONLY],
    ['https://discord.gg/abc', LivePlatform.DISCORD, null],
  ])('%s → %s', (value, platform, capability) => {
    const result = resolve(value);
    expect(result?.definition.platform).toBe(platform);
    expect(result?.definition.capability).toBe(capability);
  });

  it('gives the YouTube video its chat (needing embed_domain) and the channel none', () => {
    const video = resolve('https://youtu.be/dQw4w9WgXcQ');
    expect(video?.match.chatEmbedUrl).toBe('https://www.youtube.com/live_chat?v=dQw4w9WgXcQ');
    expect(video?.definition.chatNeedsEmbedDomain).toBe(true);
    const channel = resolve('https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live');
    expect(channel?.match).toMatchObject({
      id: 'channel:UCNye-wNBqNL5ZzHSJj3l8Bg',
      chatEmbedUrl: null,
      embedUrl:
        'https://www.youtube-nocookie.com/embed/live_stream?channel=UCNye-wNBqNL5ZzHSJj3l8Bg&autoplay=1&playsinline=1',
    });
  });

  it.each([
    'https://www.youtube.com/@handle/live',
    'https://cdn.example.com/live/index.m3u8',
    'https://example.com/shroud',
  ])('leaves %s to the next resolver', (value) => {
    expect(resolve(value)).toBeNull();
  });

  it('tries rows in order and returns the first match', () => {
    const first = { ...LIVE_PLATFORM_REGISTRY[0]!, parse: vi.fn(() => null) };
    const second = {
      ...LIVE_PLATFORM_REGISTRY[2]!,
      parse: vi.fn(() => ({ id: 'a', watchUrl: 'https://a', embedUrl: null, chatEmbedUrl: null })),
    };
    const third = { ...LIVE_PLATFORM_REGISTRY[3]!, parse: vi.fn() };
    expect(resolvePlatformUrl(new URL('https://x'), [first, second, third])?.match.id).toBe('a');
    expect(third.parse).not.toHaveBeenCalled();
  });
});
