import {
  parseBigoUrl,
  parseBilibiliUrl,
  parseChzzkUrl,
  parseDiscordUrl,
  parseInstagramUrl,
  parseLinkedinUrl,
  parseNimoUrl,
  parseRumbleUrl,
  parseSoopUrl,
  parseTelegramUrl,
  parseTiktokUrl,
} from '../link-platform-url.utility';

const url = (value: string): URL => new URL(value);
const CHZZK_ID = '0123456789abcdef0123456789abcdef';

describe('LINK_ONLY platform parsers', () => {
  it.each([
    [
      parseTiktokUrl,
      'https://www.tiktok.com/@some.user/live',
      'some.user',
      'https://www.tiktok.com/@some.user/live',
    ],
    [
      parseTiktokUrl,
      'https://tiktok.com/@Some_User',
      'some_user',
      'https://www.tiktok.com/@some_user/live',
    ],
    [
      parseInstagramUrl,
      'https://www.instagram.com/nasa/live',
      'nasa',
      'https://www.instagram.com/nasa/live/',
    ],
    [
      parseInstagramUrl,
      'https://instagram.com/NASA/',
      'nasa',
      'https://www.instagram.com/nasa/live/',
    ],
    [
      parseRumbleUrl,
      'https://rumble.com/v4abcd-some-live-show.html',
      'v4abcd',
      'https://rumble.com/v4abcd-some-live-show.html',
    ],
    [
      parseRumbleUrl,
      'https://rumble.com/c/SomeChannel/live',
      'c:SomeChannel',
      'https://rumble.com/c/SomeChannel/live',
    ],
    [parseBigoUrl, 'https://www.bigo.tv/123456789', '123456789', 'https://www.bigo.tv/123456789'],
    [parseBigoUrl, 'https://www.bigo.tv/en/abc_123', 'abc_123', 'https://www.bigo.tv/abc_123'],
    [parseBigoUrl, 'https://bigo.tv/zh-Hans/abc_123', 'abc_123', 'https://www.bigo.tv/abc_123'],
    [
      parseLinkedinUrl,
      'https://www.linkedin.com/events/my-event-7123456789/',
      'events/my-event-7123456789',
      'https://www.linkedin.com/events/my-event-7123456789/',
    ],
    [
      parseLinkedinUrl,
      'https://www.linkedin.com/video/live/urn:li:ugcPost:7123/',
      'video/live/urn%3Ali%3AugcPost%3A7123',
      'https://www.linkedin.com/video/live/urn%3Ali%3AugcPost%3A7123/',
    ],
    [
      parseLinkedinUrl,
      'https://linkedin.com/feed/update/urn:li:activity:7123',
      'feed/update/urn%3Ali%3Aactivity%3A7123',
      'https://www.linkedin.com/feed/update/urn%3Ali%3Aactivity%3A7123/',
    ],
    [
      parseTelegramUrl,
      'https://t.me/durov_channel?livestream',
      'durov_channel',
      'https://t.me/durov_channel?livestream',
    ],
    [
      parseTelegramUrl,
      'https://t.me/Durov_Channel?videochat=abc',
      'durov_channel',
      'https://t.me/durov_channel?videochat',
    ],
    [
      parseTelegramUrl,
      'https://telegram.me/durov_channel?voicechat',
      'durov_channel',
      'https://t.me/durov_channel?voicechat',
    ],
    [
      parseBilibiliUrl,
      'https://live.bilibili.com/21452505',
      '21452505',
      'https://live.bilibili.com/21452505',
    ],
    [
      parseChzzkUrl,
      `https://chzzk.naver.com/live/${CHZZK_ID}`,
      CHZZK_ID,
      `https://chzzk.naver.com/live/${CHZZK_ID}`,
    ],
    [
      parseChzzkUrl,
      `https://chzzk.naver.com/${CHZZK_ID}`,
      CHZZK_ID,
      `https://chzzk.naver.com/live/${CHZZK_ID}`,
    ],
    [
      parseSoopUrl,
      'https://www.sooplive.co.kr/streamer1',
      'streamer1',
      'https://play.sooplive.co.kr/streamer1',
    ],
    [
      parseSoopUrl,
      'https://play.sooplive.co.kr/streamer1/281234567',
      'streamer1',
      'https://play.sooplive.co.kr/streamer1',
    ],
    [
      parseSoopUrl,
      'https://play.afreecatv.com/Streamer1/281234567',
      'streamer1',
      'https://play.sooplive.co.kr/streamer1',
    ],
    [
      parseSoopUrl,
      'https://bj.afreecatv.com/streamer1',
      'streamer1',
      'https://play.sooplive.co.kr/streamer1',
    ],
    [parseNimoUrl, 'https://www.nimo.tv/Some-User', 'some-user', 'https://www.nimo.tv/some-user'],
  ])('%o accepts %s', (parse, value, id, watchUrl) => {
    expect(parse(url(value))).toEqual({ id, watchUrl, embedUrl: null, chatEmbedUrl: null });
  });

  it.each([
    [parseTiktokUrl, 'https://www.tiktok.com/@someone/video/123'],
    [parseTiktokUrl, 'https://www.tiktok.com/someone'],
    [parseTiktokUrl, 'https://www.tiktok.com/@a'],
    [parseInstagramUrl, 'https://www.instagram.com/reel/DgGWAcIBZ9M/extra'],
    [parseTiktokUrl, 'https://vt.tiktok.com/'],
    [parseTiktokUrl, 'https://vt.tiktok.com/ZSsYongoV/extra'],
    [parseInstagramUrl, 'https://www.instagram.com/reel/abc/'],
    [parseInstagramUrl, 'https://www.instagram.com/nasa/tagged'],
    [parseInstagramUrl, 'https://www.instagram.com/'],
    [parseRumbleUrl, 'https://rumble.com/v4abcd'],
    [parseRumbleUrl, 'https://rumble.com/c/SomeChannel'],
    [parseRumbleUrl, 'https://rumble.com/user/SomeChannel/live'],
    [parseBigoUrl, 'https://www.bigo.tv/'],
    [parseBigoUrl, 'https://www.bigo.tv/english/abc/def'],
    [parseLinkedinUrl, 'https://www.linkedin.com/in/someone'],
    [parseLinkedinUrl, 'https://www.linkedin.com/events/'],
    [parseLinkedinUrl, 'https://www.linkedin.com/video/other/123'],
    [parseTelegramUrl, 'https://t.me/durov_channel'],
    [parseTelegramUrl, 'https://t.me/durov_channel/123?livestream'],
    [parseTelegramUrl, 'https://t.me/abc?livestream'],
    [parseBilibiliUrl, 'https://live.bilibili.com/'],
    [parseBilibiliUrl, 'https://live.bilibili.com/abc'],
    [parseBilibiliUrl, 'https://www.bilibili.com/21452505'],
    [parseChzzkUrl, 'https://chzzk.naver.com/live/notahexid'],
    [parseChzzkUrl, `https://chzzk.naver.com/live/${CHZZK_ID}/extra`],
    [parseSoopUrl, 'https://play.sooplive.co.kr/'],
    [parseSoopUrl, 'https://play.sooplive.co.kr/streamer1/notanumber'],
    [parseSoopUrl, 'https://play.sooplive.co.kr/ab'],
    [parseNimoUrl, 'https://www.nimo.tv/lives'],
    [parseNimoUrl, 'https://www.nimo.tv/a/b'],
    [parseNimoUrl, 'https://www.nimo.tv/'],
  ])('%o rejects %s', (parse, value) => {
    expect(parse(url(value))).toBeNull();
  });

  it('every parser ignores a different host', () => {
    const other = url('https://example.com/someone/live');
    for (const parse of [
      parseTiktokUrl,
      parseInstagramUrl,
      parseRumbleUrl,
      parseBigoUrl,
      parseLinkedinUrl,
      parseTelegramUrl,
      parseBilibiliUrl,
      parseChzzkUrl,
      parseSoopUrl,
      parseNimoUrl,
      parseDiscordUrl,
    ]) {
      expect(parse(other)).toBeNull();
    }
  });
});

describe('parseDiscordUrl', () => {
  it.each([
    'https://discord.com/channels/123/456',
    'https://discord.gg/abcdef',
    'https://www.discordapp.com/invite/abc',
  ])('matches %s so it can be refused', (value) => {
    expect(parseDiscordUrl(url(value))).not.toBeNull();
  });

  it('accepts recorded TikTok videos and share links, with the official embed for a video id', () => {
    expect(parseTiktokUrl(url('https://vt.tiktok.com/ZSsYongoV/'))).toEqual({
      id: 'short:ZSsYongoV',
      watchUrl: 'https://vt.tiktok.com/ZSsYongoV/',
      embedUrl: null,
      chatEmbedUrl: null,
      portrait: true,
    });
    expect(parseTiktokUrl(url('https://www.tiktok.com/t/ZTabc123/'))?.id).toBe('short:ZTabc123');
    expect(
      parseTiktokUrl(url('https://www.tiktok.com/@Some.User/video/7708131026584734996?lang=en')),
    ).toEqual({
      id: 'video:7708131026584734996',
      watchUrl: 'https://www.tiktok.com/@some.user/video/7708131026584734996',
      embedUrl: 'https://www.tiktok.com/embed/v2/7708131026584734996',
      chatEmbedUrl: null,
      portrait: true,
    });
  });

  it.each(['reel', 'reels', 'p', 'tv'])('accepts a recorded Instagram /%s/ link', (kind) => {
    const canonical = kind === 'reels' ? 'reel' : kind;
    expect(parseInstagramUrl(url(`https://www.instagram.com/${kind}/DgGWAcIBZ9M/?igsh=x`))).toEqual(
      {
        id: 'media:DgGWAcIBZ9M',
        watchUrl: `https://www.instagram.com/${canonical}/DgGWAcIBZ9M/`,
        embedUrl: `https://www.instagram.com/${canonical}/DgGWAcIBZ9M/embed`,
        chatEmbedUrl: null,
        portrait: canonical === 'reel',
      },
    );
  });
});
