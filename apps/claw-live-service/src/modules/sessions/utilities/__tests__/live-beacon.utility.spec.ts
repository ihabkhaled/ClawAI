import { Readable } from 'node:stream';

import { playbackPath, readBeaconToken } from '../live-beacon.utility';

function rawRequest(body: string, parsed: unknown = {}) {
  const stream = Readable.from([Buffer.from(body)]) as Readable & { body: unknown };
  stream.body = parsed;
  return stream as never;
}

describe('readBeaconToken', () => {
  it('reads a parsed JSON body', async () => {
    await expect(
      readBeaconToken({ body: { token: 'abc' }, readable: false } as never),
    ).resolves.toBe('abc');
  });

  it('reads a text/plain body holding the bare token', async () => {
    await expect(readBeaconToken(rawRequest('tok.mac'))).resolves.toBe('tok.mac');
  });

  it('reads a text/plain body holding JSON', async () => {
    await expect(readBeaconToken(rawRequest('{"token":"t1"}'))).resolves.toBe('t1');
  });

  it('returns null for an empty or malformed body', async () => {
    await expect(readBeaconToken(rawRequest(''))).resolves.toBeNull();
    await expect(readBeaconToken(rawRequest('{bad json'))).resolves.toBeNull();
  });

  it('refuses an oversized body', async () => {
    await expect(readBeaconToken(rawRequest('x'.repeat(5000)))).resolves.toBeNull();
  });
});

describe('playbackPath', () => {
  it('builds the proxy entry path', () => {
    expect(playbackPath('/api/v1/live/streams/', 'abc', '/hls/index.m3u8')).toBe(
      '/api/v1/live/streams/abc/hls/index.m3u8',
    );
  });
});
