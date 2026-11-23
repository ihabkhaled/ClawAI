import { parseTwitchPlaybackToken } from '../twitch-playback-token.utility';

const reply = (value: unknown, signature: unknown = 'sig'): string =>
  JSON.stringify({ data: { streamPlaybackAccessToken: { value, signature } } });

describe('parseTwitchPlaybackToken', () => {
  it('reads the token and signature of an allowed stream', () => {
    const value = JSON.stringify({ authorization: { forbidden: false, reason: '' } });
    expect(parseTwitchPlaybackToken(reply(value))).toEqual({ value, signature: 'sig' });
  });

  it('honours a forbidden token (geo-block, sub-only) instead of working around it', () => {
    const value = JSON.stringify({ authorization: { forbidden: true, reason: 'geoblock' } });
    expect(parseTwitchPlaybackToken(reply(value))).toBeNull();
  });

  it('returns null for a missing, empty or non-JSON reply', () => {
    expect(parseTwitchPlaybackToken('not json')).toBeNull();
    expect(
      parseTwitchPlaybackToken(JSON.stringify({ data: { streamPlaybackAccessToken: null } })),
    ).toBeNull();
    expect(parseTwitchPlaybackToken(reply('', 'sig'))).toBeNull();
    expect(parseTwitchPlaybackToken(reply('{}', 42))).toBeNull();
    expect(parseTwitchPlaybackToken(JSON.stringify([1, 2]))).toBeNull();
  });
});
