import { parseYtdlpStreamLine, streamHostSuffix } from '../server-pull-url.utility';

describe('server pull URL helpers', () => {
  it('reduces a CDN host to its registrable domain', () => {
    expect(streamHostSuffix(new URL('https://manifest.googlevideo.com/x'))).toBe('googlevideo.com');
    expect(streamHostSuffix(new URL('https://fa7.euc13.playlist.live-video.net/p'))).toBe(
      'live-video.net',
    );
    expect(streamHostSuffix(new URL('https://cdn.live.example.co.kr/p'))).toBe('example.co.kr');
    expect(streamHostSuffix(new URL('https://example.io/p'))).toBe('example.io');
  });

  it('accepts only an https HLS line from yt-dlp', () => {
    expect(parseYtdlpStreamLine('m3u8_native https://a.b.com/x.m3u8\n')?.href).toBe(
      'https://a.b.com/x.m3u8',
    );
    expect(parseYtdlpStreamLine('m3u8 https://a.b.com/x')).not.toBeNull();
    expect(parseYtdlpStreamLine('https https://a.b.com/x.mp4')).toBeNull();
    expect(parseYtdlpStreamLine('m3u8 http://a.b.com/x.m3u8')).toBeNull();
    expect(parseYtdlpStreamLine('m3u8 not-a-url')).toBeNull();
    expect(parseYtdlpStreamLine('')).toBeNull();
  });
});
