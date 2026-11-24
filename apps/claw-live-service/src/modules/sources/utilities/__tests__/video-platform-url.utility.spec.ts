import { LivePlatform } from '../../../../generated/prisma';
import { VIDEO_PLATFORM_HOSTS } from '../../constants/video-platforms.constants';
import { resolvePlatformUrl } from '../platform-registry.utility';

const resolve = (value: string) => resolvePlatformUrl(new URL(value));

describe('host-matched video platforms (ADR-221 batch 6)', () => {
  it('lists 24 platforms, none repeated, no host shared', () => {
    expect(VIDEO_PLATFORM_HOSTS).toHaveLength(24);
    const hosts = VIDEO_PLATFORM_HOSTS.flatMap((row) => row.hosts);
    expect(new Set(hosts).size).toBe(hosts.length);
    expect(new Set(VIDEO_PLATFORM_HOSTS.map((row) => row.platform)).size).toBe(24);
  });

  it.each([
    ['https://www.dailymotion.com/video/x9abcd', LivePlatform.DAILYMOTION],
    ['https://x.com/someone/status/1234567890', LivePlatform.X],
    ['https://twitter.com/i/broadcasts/1ZkJzbdvLgRJv', LivePlatform.X],
    ['https://vimeo.com/76979871', LivePlatform.VIMEO],
    ['https://trovo.live/s/SomeUser', LivePlatform.TROVO],
    ['https://dlive.tv/someone', LivePlatform.DLIVE],
    ['https://www.huya.com/123456', LivePlatform.HUYA],
    ['https://www.douyu.com/9999', LivePlatform.DOUYU],
    ['https://www.douyin.com/video/7300000000000000000', LivePlatform.DOUYIN],
    ['https://twitcasting.tv/someone', LivePlatform.TWITCASTING],
    ['https://www.nicovideo.jp/watch/sm9', LivePlatform.NICONICO],
    ['https://picarto.tv/someone', LivePlatform.PICARTO],
    ['https://odysee.com/@channel:1/video-title:2', LivePlatform.ODYSEE],
    ['https://rutube.ru/video/abc123/', LivePlatform.RUTUBE],
    ['https://vkvideo.ru/video-1_2', LivePlatform.VK],
    ['https://ok.ru/video/123456', LivePlatform.OK],
    ['https://www.reddit.com/r/videos/comments/abc/title/', LivePlatform.REDDIT],
    ['https://streamable.com/moo', LivePlatform.STREAMABLE],
    ['https://tv.naver.com/v/123', LivePlatform.NAVER_TV],
    ['https://tv.kakao.com/v/123', LivePlatform.KAKAO_TV],
    ['https://video.weibo.com/show?fid=1034:4797', LivePlatform.WEIBO],
    ['https://www.showroom-live.com/r/room_name', LivePlatform.SHOWROOM],
    ['https://17.live/en/live/123', LivePlatform.LIVE17],
    ['https://www.mixcloud.com/someone/a-show/', LivePlatform.MIXCLOUD],
    ['https://bsky.app/profile/someone.bsky.social/post/3k', LivePlatform.BLUESKY],
  ])('%s → %s (LINK_ONLY until the server reads it)', (value, platform) => {
    const resolved = resolve(value);
    expect(resolved?.definition.platform).toBe(platform);
    expect(resolved?.definition.capability).toBe('LINK_ONLY');
    expect(resolved?.match.watchUrl.startsWith('https://')).toBe(true);
  });

  it('builds one id for www and bare hosts, drops tracking params, keeps the ones that identify a video', () => {
    const bare = resolve('https://dailymotion.com/video/x9abcd?playlist=x&utm_source=a');
    const www = resolve('https://www.dailymotion.com/video/x9abcd');
    expect(bare?.match.id).toBe(www?.match.id);
    expect(bare?.match.watchUrl).toBe('https://dailymotion.com/video/x9abcd');
    expect(resolve('https://video.weibo.com/show?fid=1034:4797&from=x')?.match.watchUrl).toBe(
      'https://video.weibo.com/show?fid=1034:4797',
    );
  });

  it('gives Dailymotion and Vimeo their official embeds, and no other platform one', () => {
    expect(resolve('https://dai.ly/x9abcd')?.match.embedUrl).toBe(
      'https://www.dailymotion.com/embed/video/x9abcd',
    );
    expect(resolve('https://vimeo.com/76979871')?.match.embedUrl).toBe(
      'https://player.vimeo.com/video/76979871',
    );
    expect(resolve('https://streamable.com/moo')?.match.embedUrl).toBeNull();
  });

  it.each([
    'https://www.dailymotion.com/',
    'https://streamable.com/%3Cscript%3E',
    'https://evil.example.com/video/x9abcd',
    'https://dailymotion.com.evil.example/video/x9abcd',
  ])('refuses %s', (value) => {
    expect(resolve(value)).toBeNull();
  });
});
