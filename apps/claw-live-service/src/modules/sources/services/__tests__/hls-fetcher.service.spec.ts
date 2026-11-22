const { pinnedGet } = vi.hoisted(() => ({ pinnedGet: vi.fn() }));
vi.mock('../../../../common/utilities/pinned-request.utility', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  pinnedGet,
}));

import { BadGatewayException } from '@nestjs/common';

import { PinnedRequestError } from '../../../../common/utilities/pinned-request.utility';
import { HlsFetcherService } from '../hls-fetcher.service';

describe('HlsFetcherService', () => {
  const guard = { assertSafe: vi.fn().mockResolvedValue(['93.184.216.34']) };
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
});
