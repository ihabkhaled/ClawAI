import { NotFoundException } from '@nestjs/common';

import { LiveSourceKind } from '../../../../generated/prisma';
import { HLS_PLAYLIST_MAX_BYTES } from '../../constants/sources.constants';
import { decodeHlsProxyTarget, hlsProxyPath } from '../../utilities/hls-proxy-url.utility';
import { HlsProxyService } from '../hls-proxy.service';

async function bodyText(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk as Buffer));
  return Buffer.concat(chunks).toString('utf8');
}

describe('HlsProxyService', () => {
  const hlsStream = {
    id: 'st1',
    sourceKind: LiveSourceKind.HLS,
    sourceUrl: 'https://cdn.example.com/live/index.m3u8',
    declaredHost: 'cdn.example.com',
  };
  const prisma = {
    liveViewerSession: { findFirst: vi.fn() },
    liveStream: { findUnique: vi.fn() },
  };
  const fetcher = { fetchObject: vi.fn() };
  const fixtures = { readFile: vi.fn() };
  const service = new HlsProxyService(prisma as never, fetcher as never, fixtures as never);

  beforeEach(() => {
    vi.clearAllMocks();
    prisma.liveViewerSession.findFirst.mockResolvedValue({ id: 'sess' });
    prisma.liveStream.findUnique.mockResolvedValue(hlsStream);
  });

  it('returns 404 without a non-DETACHED session of the caller', async () => {
    prisma.liveViewerSession.findFirst.mockResolvedValueOnce(null);
    await expect(service.file('st1', 'u1', 'index.m3u8')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.liveViewerSession.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { streamId: 'st1', userId: 'u1', state: { not: 'DETACHED' } },
      }),
    );
    expect(fetcher.fetchObject).not.toHaveBeenCalled();
  });

  it('serves the entry playlist rewritten to the proxy, fetched with the host pin', async () => {
    fetcher.fetchObject.mockResolvedValueOnce({
      contentType: 'application/vnd.apple.mpegurl',
      body: Buffer.from('#EXTM3U\n#EXTINF:4,\nseg1.ts\n'),
      url: new URL(hlsStream.sourceUrl),
    });
    const reply = await service.file('st1', 'u1', 'index.m3u8');
    expect(fetcher.fetchObject).toHaveBeenCalledWith(
      new URL(hlsStream.sourceUrl),
      'cdn.example.com',
      HLS_PLAYLIST_MAX_BYTES,
    );
    expect(reply.contentType).toBe('application/vnd.apple.mpegurl');
    const text = await bodyText(reply.body);
    const line = text.split('\n')[2] ?? '';
    expect(decodeHlsProxyTarget(/u=(.+)$/u.exec(line)?.[1])?.href).toBe(
      'https://cdn.example.com/live/seg1.ts',
    );
  });

  it('refuses a playlist pointing at another host', async () => {
    fetcher.fetchObject.mockResolvedValueOnce({
      contentType: 'application/x-mpegurl',
      body: Buffer.from('#EXTM3U\nhttps://evil.example/seg.ts\n'),
      url: new URL(hlsStream.sourceUrl),
    });
    await expect(service.file('st1', 'u1', 'index.m3u8')).rejects.toThrow('LIVE_UPSTREAM_FAILED');
  });

  it('passes a segment through with an allowlisted content type', async () => {
    fetcher.fetchObject.mockResolvedValueOnce({
      contentType: 'video/mp2t',
      body: Buffer.from('TS'),
      url: new URL('https://cdn.example.com/live/seg1.ts'),
    });
    const encoded = hlsProxyPath('st1', 'https://cdn.example.com/live/seg1.ts').split('u=')[1];
    const reply = await service.proxied('st1', 'u1', encoded);
    expect(reply.contentType).toBe('video/mp2t');
    expect(await bodyText(reply.body)).toBe('TS');
    expect(fetcher.fetchObject.mock.calls[0]?.[2]).toBe(20 * 1024 * 1024);
  });

  it('refuses a disallowed segment content type', async () => {
    fetcher.fetchObject.mockResolvedValueOnce({
      contentType: 'text/html',
      body: Buffer.from('<html>'),
      url: new URL('https://cdn.example.com/x.ts'),
    });
    const encoded = hlsProxyPath('st1', 'https://cdn.example.com/x.ts').split('u=')[1];
    await expect(service.proxied('st1', 'u1', encoded)).rejects.toThrow(
      'LIVE_UPSTREAM_CONTENT_TYPE',
    );
  });

  it('never proxies a target on another host (not an open proxy)', async () => {
    const encoded = hlsProxyPath('st1', 'https://169.254.169.254/latest').split('u=')[1];
    await expect(service.proxied('st1', 'u1', encoded)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.proxied('st1', 'u1', 'garbage!')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fetcher.fetchObject).not.toHaveBeenCalled();
  });

  it('only serves the entry file by name for HLS streams', async () => {
    await expect(service.file('st1', 'u1', 'seg1.ts')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('serves fixture files from the broadcaster', async () => {
    prisma.liveStream.findUnique.mockResolvedValue({
      id: 'fx',
      sourceKind: LiveSourceKind.FIXTURE,
      sourceUrl: 'fixture:live-demo',
      declaredHost: null,
    });
    fixtures.readFile.mockResolvedValueOnce(Buffer.from('#EXTM3U'));
    const playlist = await service.file('fx', 'u1', 'index.m3u8');
    expect(fixtures.readFile).toHaveBeenCalledWith('live-demo', 'index.m3u8');
    expect(playlist.contentType).toBe('application/vnd.apple.mpegurl');
    fixtures.readFile.mockResolvedValueOnce(Buffer.from('TS'));
    expect((await service.file('fx', 'u1', 'seg3.ts')).contentType).toBe('video/mp2t');
  });

  it('never serves YouTube streams', async () => {
    prisma.liveStream.findUnique.mockResolvedValue({
      id: 'yt',
      sourceKind: LiveSourceKind.YOUTUBE,
    });
    await expect(service.file('yt', 'u1', 'index.m3u8')).rejects.toBeInstanceOf(NotFoundException);
  });
});
