import { LiveSourceErrorCode } from '../../../../common/enums/live-source-error-code.enum';
import { decodeHlsProxyTarget, hlsProxyPath } from '../hls-proxy-url.utility';
import { rewritePlaylist } from '../playlist-rewrite.utility';
import { normalizeSourceUrl, sourceUrlShapeError } from '../source-url.utility';
import {
  extractYoutubeChannelId,
  extractYoutubeId,
  isYoutubeHandleUrl,
} from '../youtube-url.utility';

describe('extractYoutubeId', () => {
  it.each([
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtube.com/watch?v=dQw4w9WgXcQ&t=3',
    'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/live/dQw4w9WgXcQ?si=x',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ',
    'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
  ])('extracts the id from %s', (url) => {
    expect(extractYoutubeId(new URL(url))).toBe('dQw4w9WgXcQ');
  });

  it.each([
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/channel/abc',
    'https://evil.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/',
  ])('returns null for %s', (url) => {
    expect(extractYoutubeId(new URL(url))).toBeNull();
  });
});

describe('source URL shape', () => {
  it('normalizes host case and drops the fragment', () => {
    expect(normalizeSourceUrl(new URL('https://CDN.Example.com/Live/a.m3u8?t=1#x'))).toBe(
      'https://cdn.example.com/Live/a.m3u8?t=1',
    );
  });

  it.each([
    ['http://cdn.example.com/a.m3u8', false],
    ['ftp://cdn.example.com/a.m3u8', true],
    ['https://user:pw@cdn.example.com/a.m3u8', false],
    ['https://cdn.example.com:8080/a.m3u8', false],
    ['https://127.0.0.1/a.m3u8', false],
    ['https://[::1]/a.m3u8', false],
    ['https://10.0.0.5/a.m3u8', false],
    ['https://169.254.169.254/a.m3u8', false],
    ['https://[::ffff:127.0.0.1]/a.m3u8', false],
  ])('refuses %s', (url, allowHttp) => {
    expect(sourceUrlShapeError(new URL(url), allowHttp)).toBe(LiveSourceErrorCode.SOURCE_UNSAFE);
  });

  it.each([
    ['https://cdn.example.com/a.m3u8', false],
    ['https://cdn.example.com:443/a.m3u8', false],
    ['https://cdn.example.com:8443/a.m3u8', false],
    ['http://cdn.example.com/a.m3u8', true],
    ['https://8.8.8.8/a.m3u8', false],
  ])('accepts %s', (url, allowHttp) => {
    expect(sourceUrlShapeError(new URL(url), allowHttp)).toBeNull();
  });
});

describe('HLS proxy URL', () => {
  it('round-trips an absolute URL through base64url', () => {
    const path = hlsProxyPath('s1', 'https://cdn.example.com/seg 1.ts?x=1');
    expect(path.startsWith('/api/v1/live/streams/s1/hls/p?u=')).toBe(true);
    expect(decodeHlsProxyTarget(path.split('u=')[1])?.href).toBe(
      'https://cdn.example.com/seg%201.ts?x=1',
    );
  });

  it('rejects junk', () => {
    expect(decodeHlsProxyTarget(undefined)).toBeNull();
    expect(decodeHlsProxyTarget('not base64!')).toBeNull();
    expect(decodeHlsProxyTarget(Buffer.from('nope').toString('base64url'))).toBeNull();
  });
});

describe('rewritePlaylist', () => {
  const base = new URL('https://cdn.example.com/live/index.m3u8');
  const decode = (line: string): string | undefined =>
    decodeHlsProxyTarget(/u=([A-Za-z0-9_-]+)/u.exec(line)?.[1])?.href;

  it('rewrites URI lines and URI attributes to the proxy, pinned to the host', () => {
    const text = [
      '#EXTM3U',
      '#EXT-X-KEY:METHOD=AES-128,URI="key.bin"',
      '#EXT-X-MAP:URI="/init.mp4"',
      '#EXTINF:4,',
      'seg1.ts',
      '',
      'https://cdn.example.com/abs/seg2.ts',
    ].join('\n');
    const result = rewritePlaylist(text, base, 's1', 'cdn.example.com');
    expect(result.rejected).toBe(0);
    const lines = result.text.split('\n');
    expect(decode(lines[1] ?? '')).toBe('https://cdn.example.com/live/key.bin');
    expect(decode(lines[2] ?? '')).toBe('https://cdn.example.com/init.mp4');
    expect(decode(lines[4] ?? '')).toBe('https://cdn.example.com/live/seg1.ts');
    expect(decode(lines[6] ?? '')).toBe('https://cdn.example.com/abs/seg2.ts');
    expect(result.text).not.toContain('https://cdn.example.com/live/seg1.ts');
  });

  it('counts URIs pointing at another host or scheme', () => {
    const text = [
      '#EXTM3U',
      'https://evil.example/seg.ts',
      'http://cdn.example.com/x.ts',
      '#EXT-X-KEY:URI="https://169.254.169.254/k"',
    ].join('\n');
    expect(rewritePlaylist(text, base, 's1', 'cdn.example.com').rejected).toBe(3);
  });
});

describe('YouTube channel and handle links', () => {
  it.each([
    'https://www.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live',
    'https://youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg',
    'https://m.youtube.com/channel/UCNye-wNBqNL5ZzHSJj3l8Bg/live?si=abc',
  ])('reads the channel id from %s', (url) => {
    expect(extractYoutubeChannelId(new URL(url))).toBe('UCNye-wNBqNL5ZzHSJj3l8Bg');
  });

  it.each([
    'https://www.youtube.com/channel/UCshort/live',
    'https://www.youtube.com/channel/XXNye-wNBqNL5ZzHSJj3l8Bg',
    'https://evil.example/channel/UCNye-wNBqNL5ZzHSJj3l8Bg',
  ])('rejects %s as a channel link', (url) => {
    expect(extractYoutubeChannelId(new URL(url))).toBeNull();
  });

  it.each([
    'https://www.youtube.com/@aljazeeraenglish/live',
    'https://www.youtube.com/@BBCNews',
    'https://www.youtube.com/c/SkyNews/live',
    'https://www.youtube.com/user/dwnews',
  ])('recognises %s as a handle link', (url) => {
    expect(isYoutubeHandleUrl(new URL(url))).toBe(true);
  });

  it('does not treat a watch link or another host as a handle link', () => {
    expect(isYoutubeHandleUrl(new URL('https://www.youtube.com/watch?v=dQw4w9WgXcQ'))).toBe(false);
    expect(isYoutubeHandleUrl(new URL('https://example.com/@someone'))).toBe(false);
  });
});
