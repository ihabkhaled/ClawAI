import { LivePlatform } from '../../../../generated/prisma';
import { VIDEO_PLATFORM_HOSTS } from '../../constants/video-platforms.constants';
import { resolvePlatformUrl } from '../platform-registry.utility';

const resolve = (value: string) => resolvePlatformUrl(new URL(value));

describe('host-matched video platforms (ADR-221 batch 6)', () => {
  it('lists 60 platforms, none repeated, no host shared', () => {
    expect(VIDEO_PLATFORM_HOSTS).toHaveLength(60);
    const hosts = VIDEO_PLATFORM_HOSTS.flatMap((row) => row.hosts);
    expect(new Set(hosts).size).toBe(hosts.length);
    expect(new Set(VIDEO_PLATFORM_HOSTS.map((row) => row.platform)).size).toBe(60);
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

  it.each([
    ['https://live.vkvideo.ru/lebwa', LivePlatform.VK_PLAY_LIVE],
    ['https://garr.tv/videos/watch/683360e8-c738-4527-a22b-d1e01c3d522b', LivePlatform.PEERTUBE],
    ['https://steamcommunity.com/broadcast/watch/76561198843011284', LivePlatform.STEAM],
    ['https://goodgame.ru/IKS_Slon', LivePlatform.GOODGAME],
    ['https://www.younow.com/mony1246', LivePlatform.YOUNOW],
    ['https://www.raiplay.it/dirette/rainews24', LivePlatform.RAIPLAY],
    ['https://www.raiplaysound.it/radio2', LivePlatform.RAIPLAY_SOUND],
    ['https://www.bfmtv.com/en-direct/', LivePlatform.BFMTV],
    ['https://www.cbsnews.com/live/', LivePlatform.CBS_NEWS],
    ['https://www.lrt.lt/mediateka/tiesiogiai/lrt-televizija', LivePlatform.LRT],
    ['https://www.france.tv/franceinfo/direct.html', LivePlatform.FRANCE_TV],
    ['https://roya.tv/live-stream/1', LivePlatform.ROYA],
    ['https://matchtv.ru/on-air', LivePlatform.MATCH_TV],
    ['https://www.rtvcplay.co/en-vivo/canal-institucional', LivePlatform.RTVC_PLAY],
    ['https://tunein.com/radio/BBC-World-Service-s24948/', LivePlatform.TUNEIN],
    ['https://krakow1.webcamera.pl/', LivePlatform.WEBCAMERA_PL],
    ['https://www.ted.com/talks/dan_dennett_on_our_consciousness', LivePlatform.TED],
    ['https://soundcloud.com/ethmusic/lostin-powers-she-so-heavy', LivePlatform.SOUNDCLOUD],
    ['https://youtube-dl.bandcamp.com/track/youtube-dl-test-song', LivePlatform.BANDCAMP],
    ['https://archive.org/details/Cops1922', LivePlatform.ARCHIVE_ORG],
    ['https://9gag.com/gag/ae5Ag7B', LivePlatform.NINEGAG],
    ['https://www.pinterest.com/pin/664281013778109217/', LivePlatform.PINTEREST],
    ['https://www.bitchute.com/video/UGlrF9o9b-Q/', LivePlatform.BITCHUTE],
    [
      'https://drive.google.com/file/d/0ByeS4oOUV-49Zzh4R1J6R09zazQ/edit',
      LivePlatform.GOOGLE_DRIVE,
    ],
    ['https://www.loom.com/share/43d05f362f734614a2e81b4694a3a523', LivePlatform.LOOM],
    ['https://www.spreaker.com/episode/12534508', LivePlatform.SPREAKER],
    ['https://medal.tv/games/valorant/clips/jTBFnLKdLy15K', LivePlatform.MEDAL],
    ['https://webtv.un.org/en/asset/k1s/k1sqylvtss', LivePlatform.UN_WEB_TV],
    ['https://www.zhihu.com/zvideo/1342930761977176064', LivePlatform.ZHIHU],
    [
      'https://edition.cnn.com/2026/11/23/business/video/nvidia-employee-hugs-jensen',
      LivePlatform.CNN,
    ],
    ['https://www.flickr.com/photos/forestwander-nature-pictures/5645318632', LivePlatform.FLICKR],
    ['https://www.acfun.cn/v/ac35457073', LivePlatform.ACFUN],
    ['https://imgur.com/A61SaA1', LivePlatform.IMGUR],
  ])('round 2: %s → %s', (value, platform) => {
    expect(resolve(value)?.definition.platform).toBe(platform);
  });

  it('keeps the query params Apple Podcasts, VidLii and Dropbox need, and matches only real subdomains', () => {
    expect(
      resolve(
        'https://podcasts.apple.com/us/podcast/207-whitney-webb/id1135137367?i=1000482637777&uo=4',
      )?.match.watchUrl,
    ).toBe('https://podcasts.apple.com/us/podcast/207-whitney-webb/id1135137367?i=1000482637777');
    expect(resolve('https://www.vidlii.com/watch?v=tJluaH4BJ3v')?.match.watchUrl).toBe(
      'https://www.vidlii.com/watch?v=tJluaH4BJ3v',
    );
    expect(resolve('https://evilbandcamp.com/track/x')).toBeNull();
    expect(resolve('https://bandcamp.com.evil.example/track/x')).toBeNull();
  });

  it('rewrites the VK live listing and the GoodGame channel page to the readable forms', () => {
    expect(resolve('https://vkvideo.ru/live-203987402_456239479')?.match.watchUrl).toBe(
      'https://vkvideo.ru/video-203987402_456239479',
    );
    expect(resolve('https://goodgame.ru/channel/IKS_Slon/')?.match.watchUrl).toBe(
      'https://goodgame.ru/IKS_Slon',
    );
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
