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
    'https://www.twitch.tv/videos/123456',
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
