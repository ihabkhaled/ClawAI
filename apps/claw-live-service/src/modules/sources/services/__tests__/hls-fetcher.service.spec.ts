const { pinnedGet } = vi.hoisted(() => ({ pinnedGet: vi.fn() }));
vi.mock('../../../../common/utilities/pinned-request.utility', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  pinnedGet,
}));

import { BadGatewayException } from '@nestjs/common';

import { PinnedRequestError } from '../../../../common/utilities/pinned-request.utility';
import { HlsFetcherService } from '../hls-fetcher.service';

describe('HlsFetcherService', () => {
  const guard = {
    assertSafe: vi.fn().mockResolvedValue(['93.184.216.34']),
    assertSafeOnSuffixes: vi.fn().mockResolvedValue(['142.250.1.1']),
  };
  const fetcher = new HlsFetcherService(guard as never);
  const url = new URL('https://cdn.example.com/a.m3u8');

  beforeEach(() => vi.clearAllMocks());

  it('guards, then connects only to the validated addresses', async () => {
    pinnedGet.mockResolvedValueOnce({
      status: 200,
      contentType: 'video/mp2t',
      body: Buffer.from('x'),
    });
    const result = await fetcher.fetchObject(url, 'cdn.example.com', 100);
    expect(guard.assertSafe).toHaveBeenCalledWith(url, 'cdn.example.com');
    expect(pinnedGet).toHaveBeenCalledWith(
      url,
      ['93.184.216.34'],
      expect.objectContaining({ maxBytes: 100 }),
    );
    expect(result).toEqual({ contentType: 'video/mp2t', body: Buffer.from('x'), url });
  });

  it('maps size and transport failures to 502 codes', async () => {
    pinnedGet.mockRejectedValueOnce(new PinnedRequestError('TOO_LARGE'));
    await expect(fetcher.fetchObject(url, 'cdn.example.com', 1)).rejects.toThrow(
      'LIVE_UPSTREAM_TOO_LARGE',
    );
    pinnedGet.mockRejectedValueOnce(new PinnedRequestError('FAILED'));
    await expect(fetcher.fetchObject(url, 'cdn.example.com', 1)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('never fetches when the guard refuses', async () => {
    guard.assertSafe.mockRejectedValueOnce(new Error('LIVE_SOURCE_UNSAFE'));
    await expect(fetcher.fetchObject(url, 'cdn.example.com', 1)).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
    expect(pinnedGet).not.toHaveBeenCalled();
  });

  it('follows a CDN redirect on the pinned suffixes and returns the final URL', async () => {
    const segment = new URL('https://rr2---sn-a.googlevideo.com/videoplayback/x');
    pinnedGet
      .mockRejectedValueOnce(
        new PinnedRequestError('REDIRECT', 'https://rr4---sn-b.googlevideo.com/videoplayback/x'),
      )
      .mockResolvedValueOnce({ status: 200, contentType: 'video/mp2t', body: Buffer.from('y') });
    const result = await fetcher.fetchObject(segment, ['googlevideo.com'], 100);
    expect(result.url.host).toBe('rr4---sn-b.googlevideo.com');
    expect(guard.assertSafeOnSuffixes).toHaveBeenCalledTimes(2);
    expect(guard.assertSafeOnSuffixes.mock.calls[1]?.[0].host).toBe('rr4---sn-b.googlevideo.com');
  });

  it('never follows a redirect for a declared host, off the suffixes, to http, or past the cap', async () => {
    pinnedGet.mockRejectedValueOnce(
      new PinnedRequestError('REDIRECT', 'https://cdn.example.com/b'),
    );
    await expect(fetcher.fetchObject(url, 'cdn.example.com', 1)).rejects.toThrow(
      'LIVE_UPSTREAM_FAILED',
    );
    guard.assertSafeOnSuffixes
      .mockResolvedValueOnce(['142.250.1.1'])
      .mockRejectedValueOnce(new Error('LIVE_SOURCE_UNSAFE'));
    pinnedGet.mockRejectedValueOnce(new PinnedRequestError('REDIRECT', 'https://evil.example/x'));
    await expect(fetcher.fetchObject(url, ['googlevideo.com'], 1)).rejects.toThrow(
      'LIVE_SOURCE_UNSAFE',
    );
    pinnedGet.mockRejectedValueOnce(
      new PinnedRequestError('REDIRECT', 'http://a.googlevideo.com/x'),
    );
    await expect(fetcher.fetchObject(url, ['googlevideo.com'], 1)).rejects.toThrow(
      'LIVE_UPSTREAM_FAILED',
    );
    pinnedGet.mockRejectedValue(new PinnedRequestError('REDIRECT', 'https://a.googlevideo.com/x'));
    await expect(fetcher.fetchObject(url, ['googlevideo.com'], 1)).rejects.toThrow(
      'LIVE_UPSTREAM_FAILED',
    );
    expect(pinnedGet.mock.calls.length).toBeLessThanOrEqual(1 + 1 + 1 + 4);
    pinnedGet.mockReset();
  });
});
