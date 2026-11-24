import { parseFacebookUrl, parseKickUrl, parseTwitchUrl } from '../capture-platform-url.utility';

const url = (value: string): URL => new URL(value);

describe('parseTwitchUrl', () => {
  it.each([
    ['https://twitch.tv/shroud', 'shroud'],
    ['https://www.twitch.tv/Shroud', 'shroud'],
    ['https://m.twitch.tv/some_user_1', 'some_user_1'],
    ['https://www.twitch.tv/shroud/videos', 'shroud'],
  ])('accepts %s', (value, channel) => {
    expect(parseTwitchUrl(url(value))).toEqual({
      id: channel,
      watchUrl: `https://www.twitch.tv/${channel}`,
      embedUrl: `https://player.twitch.tv/?channel=${channel}&autoplay=true`,
      chatEmbedUrl: `https://www.twitch.tv/embed/${channel}/chat?darkpopout`,
    });
  });

  it.each([
    'https://www.twitch.tv/',
    'https://www.twitch.tv/videos/12345',
    'https://www.twitch.tv/directory/game/x',
    'https://www.twitch.tv/p/en/about',
    'https://www.twitch.tv/settings',
    'https://www.twitch.tv/ab',
    'https://www.twitch.tv/this_name_is_far_too_long_x',
    'https://www.twitch.tv/bad-name',
    'https://twitch.example.com/shroud',
  ])('rejects %s', (value) => {
    expect(parseTwitchUrl(url(value))).toBeNull();
  });
});

describe('parseKickUrl', () => {
  it.each([
    ['https://kick.com/xqc', 'xqc'],
    ['https://www.kick.com/Some-User_2', 'some-user_2'],
  ])('accepts %s', (value, user) => {
    expect(parseKickUrl(url(value))).toEqual({
      id: user,
      watchUrl: `https://kick.com/${user}`,
      embedUrl: `https://player.kick.com/${user}?autoplay=true`,
      chatEmbedUrl: `https://kick.com/popout/${user}/chat`,
    });
  });

  it.each([
    'https://kick.com/',
    'https://kick.com/categories/just-chatting',
    'https://kick.com/browse',
    'https://kick.com/video/abc',
    'https://kick.com/clips/abc',
    'https://kick.com/a',
    'https://kick.com/name.with.dots',
    'https://kick.example.com/xqc',
  ])('rejects %s', (value) => {
    expect(parseKickUrl(url(value))).toBeNull();
  });
});

describe('parseFacebookUrl', () => {
  const embed = (canonical: string): string =>
    `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonical)}&show_text=false&autoplay=true`;

  it('accepts a page video link', () => {
    const canonical = 'https://www.facebook.com/NASA/videos/123456789012';
    expect(parseFacebookUrl(url('https://m.facebook.com/NASA/videos/123456789012/'))).toEqual({
      id: '123456789012',
      watchUrl: canonical,
      embedUrl: embed(canonical),
      chatEmbedUrl: null,
    });
  });

  it.each([
    'https://www.facebook.com/watch/?v=123456789012',
    'https://facebook.com/watch?v=123456789012',
    'https://www.facebook.com/watch/live/?v=123456789012',
  ])('accepts the watch link %s', (value) => {
    const canonical = 'https://www.facebook.com/watch/?v=123456789012';
    expect(parseFacebookUrl(url(value))).toEqual({
      id: '123456789012',
      watchUrl: canonical,
      embedUrl: embed(canonical),
      chatEmbedUrl: null,
    });
  });

  it('accepts an fb.watch short link', () => {
    expect(parseFacebookUrl(url('https://fb.watch/aBc_12-x/'))).toMatchObject({
      id: 'fb.watch:aBc_12-x',
      watchUrl: 'https://fb.watch/aBc_12-x/',
      chatEmbedUrl: null,
    });
  });

  it.each([
    'https://www.facebook.com/NASA',
    'https://www.facebook.com/NASA/videos/notanid',
    'https://www.facebook.com/NASA/photos/123456789012',
    'https://www.facebook.com/watch/?v=abc',
    'https://www.facebook.com/watch/',
    'https://www.facebook.com/watch/other/?v=123456789012',
    'https://fb.watch/',
    'https://facebook.example.com/NASA/videos/123456789012',
  ])('rejects %s', (value) => {
    expect(parseFacebookUrl(url(value))).toBeNull();
  });
});

describe('parseFacebookUrl recorded links (2026-11-24)', () => {
  it.each([
    [
      'https://www.facebook.com/share/v/1DpSNW9BD1/',
      'share:v:1DpSNW9BD1',
      'https://www.facebook.com/share/v/1DpSNW9BD1/',
    ],
    [
      'https://www.facebook.com/share/r/19sjwesDYv',
      'share:r:19sjwesDYv',
      'https://www.facebook.com/share/r/19sjwesDYv/',
    ],
    [
      'https://m.facebook.com/reel/4620908104798158/?s=x',
      '4620908104798158',
      'https://www.facebook.com/reel/4620908104798158',
    ],
    [
      'https://www.facebook.com/cairo24/videos/some-title/1631584275384746/?rdid=x',
      '1631584275384746',
      'https://www.facebook.com/cairo24/videos/1631584275384746',
    ],
  ])('accepts %s', (value, id, watchUrl) => {
    expect(parseFacebookUrl(url(value))).toMatchObject({ id, watchUrl, chatEmbedUrl: null });
  });

  it.each([
    'https://www.facebook.com/share/x/1DpSNW9BD1/',
    'https://www.facebook.com/share/v/',
    'https://www.facebook.com/reel/notanid',
    'https://www.facebook.com/page/videos/a/b/c/123456789012',
  ])('refuses %s', (value) => {
    expect(parseFacebookUrl(url(value))).toBeNull();
  });
});

describe('recorded Twitch and Kick links (2026-11-24)', () => {
  it('reads a Twitch past broadcast with its own player', () => {
    expect(parseTwitchUrl(url('https://www.twitch.tv/videos/2300000000?t=1h'))).toEqual({
      id: 'video:2300000000',
      watchUrl: 'https://www.twitch.tv/videos/2300000000',
      embedUrl: 'https://player.twitch.tv/?video=v2300000000&autoplay=true',
      chatEmbedUrl: null,
    });
  });

  it.each([
    'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
    'https://www.twitch.tv/somechannel/clip/AwkwardHelplessSalamanderSwiftRage',
  ])('reads a Twitch clip %s', (value) => {
    expect(parseTwitchUrl(url(value))).toEqual({
      id: 'clip:AwkwardHelplessSalamanderSwiftRage',
      watchUrl: 'https://clips.twitch.tv/AwkwardHelplessSalamanderSwiftRage',
      embedUrl: null,
      chatEmbedUrl: null,
    });
  });

  it('reads a Kick past broadcast instead of mistaking it for the live channel', () => {
    expect(
      parseKickUrl(url('https://kick.com/XQC/videos/1b2c3d4e-0000-4a5b-8c9d-0123456789ab')),
    ).toEqual({
      id: 'video:1b2c3d4e-0000-4a5b-8c9d-0123456789ab',
      watchUrl: 'https://kick.com/xqc/videos/1b2c3d4e-0000-4a5b-8c9d-0123456789ab',
      embedUrl: null,
      chatEmbedUrl: null,
    });
  });

  it.each([
    'https://www.twitch.tv/videos/abc',
    'https://clips.twitch.tv/',
    'https://kick.com/xqc/videos/not-a-uuid',
  ])('refuses %s', (value) => {
    const parse = value.includes('kick') ? parseKickUrl : parseTwitchUrl;
    expect(parse(url(value))).toBeNull();
  });
});
