import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { sha256Hex } from '../hash.utility';
import { baseLanguage } from '../language.utility';
import { isIpLiteral, isPublicIpAddress, unbracketHost } from '../network-address.utility';
import { pinnedGet, pinnedLookup, PinnedRequestError } from '../pinned-request.utility';
import { introducesLinksOrMarkup } from '../plain-text.utility';
import { BoundedProcessError, runBoundedProcess } from '../process.utility';
import { tokenSetJaccard, wordTokens } from '../text-similarity.utility';

describe('network-address utility', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.9',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '::1',
    '[::1]',
    'fd00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '[::ffff:7f00:1]',
  ])('refuses %s', (address) => expect(isPublicIpAddress(address)).toBe(false));
  it.each(['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111'])('accepts %s', (address) =>
    expect(isPublicIpAddress(address)).toBe(true),
  );
  it('treats a host name as non-public and non-literal', () => {
    expect(isPublicIpAddress('example.com')).toBe(false);
    expect(isIpLiteral('example.com')).toBe(false);
    expect(isIpLiteral('[::1]')).toBe(true);
    expect(unbracketHost('[::1]')).toBe('::1');
  });
});

describe('plain-text utility', () => {
  it('flags links and markup the source does not contain', () => {
    expect(introducesLinksOrMarkup('see https://evil.example/x', 'hello')).toBe(true);
    expect(introducesLinksOrMarkup('visit www.evil.com', 'hello')).toBe(true);
    expect(introducesLinksOrMarkup('<script>x</script>', 'hello')).toBe(true);
    expect(introducesLinksOrMarkup('[click](x)', 'hello')).toBe(true);
    expect(introducesLinksOrMarkup('```code', 'hello')).toBe(true);
  });
  it('allows plain text and links already in the source', () => {
    expect(introducesLinksOrMarkup('The release ships Tuesday.', 'anything')).toBe(false);
    expect(
      introducesLinksOrMarkup('go to https://claw.ai/x', 'speaker said https://claw.ai/x'),
    ).toBe(false);
    expect(introducesLinksOrMarkup('again https://a.b/c and https://a.b/c', 'https://a.b/c')).toBe(
      false,
    );
  });
});

describe('language utility', () => {
  it.each([
    ['en', 'en'],
    ['pt-BR', 'pt'],
    ['English', 'en'],
    ['arabic', 'ar'],
    ['klingon', null],
    [null, null],
    ['', null],
  ])('%s → %s', (input, expected) => expect(baseLanguage(input)).toBe(expected));
});

describe('text similarity and hash', () => {
  it('computes token-set Jaccard', () => {
    expect(tokenSetJaccard('a b c', 'a b c')).toBe(1);
    expect(tokenSetJaccard('a b', 'c d')).toBe(0);
    expect(tokenSetJaccard('', '')).toBe(1);
    expect(tokenSetJaccard('Offline mode ships', 'offline MODE ships now')).toBeCloseTo(0.75);
    expect([...wordTokens('Héllo, wörld 42')]).toEqual(['héllo', 'wörld', '42']);
  });
  it('hashes deterministically', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });
});

describe('process utility', () => {
  it('runs a child without a shell and returns stdout', async () => {
    const result = await runBoundedProcess(process.execPath, ['-e', 'process.stdout.write("ok")'], {
      timeoutMs: 10_000,
      maxOutputBytes: 100,
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toBe('ok');
  });
  it('kills on oversized output and on timeout', async () => {
    await expect(
      runBoundedProcess(process.execPath, ['-e', 'process.stdout.write("x".repeat(5000))'], {
        timeoutMs: 10_000,
        maxOutputBytes: 10,
      }),
    ).rejects.toThrow('PROCESS_OUTPUT_TOO_LARGE');
    await expect(
      runBoundedProcess(process.execPath, ['-e', 'setTimeout(()=>{}, 5000)'], {
        timeoutMs: 100,
        maxOutputBytes: 10,
      }),
    ).rejects.toBeInstanceOf(BoundedProcessError);
  });
  it('rejects a missing binary', async () => {
    await expect(
      runBoundedProcess('definitely-not-a-binary-xyz', [], { timeoutMs: 5000, maxOutputBytes: 10 }),
    ).rejects.toThrow('PROCESS_SPAWN_FAILED');
  });
});

describe('pinned-request utility', () => {
  it('answers lookups only with the pinned addresses', () => {
    const lookup = pinnedLookup(['93.184.216.34']);
    const single = vi.fn();
    lookup('evil.example', {}, single);
    expect(single).toHaveBeenCalledWith(null, '93.184.216.34', 4);
    const all = vi.fn();
    lookup('evil.example', { all: true }, all);
    expect(all).toHaveBeenCalledWith(null, [{ address: '93.184.216.34', family: 4 }]);
    const none = vi.fn();
    pinnedLookup([])('x', {}, none);
    expect(none.mock.calls[0]?.[0]).toBeInstanceOf(Error);
  });

  it('connects to the pinned address whatever the host name, caps size, refuses redirects', async () => {
    const server = createServer((req, res) => {
      if (req.url === '/big') {
        res.writeHead(200, { 'content-type': 'video/mp2t' });
        res.end('x'.repeat(100));
      } else if (req.url === '/redirect') {
        res.writeHead(302, { location: 'http://169.254.169.254/' });
        res.end();
      } else {
        res.writeHead(200, { 'content-type': 'application/vnd.apple.mpegurl; charset=utf-8' });
        res.end(`#EXTM3U host=${req.headers.host ?? ''}`);
      }
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const ok = await pinnedGet(
        new URL(`http://stream.example:${port}/index.m3u8`),
        ['127.0.0.1'],
        { timeoutMs: 5000, maxBytes: 1000 },
      );
      expect(ok.contentType).toBe('application/vnd.apple.mpegurl');
      expect(ok.body.toString()).toBe(`#EXTM3U host=stream.example:${port}`);
      await expect(
        pinnedGet(new URL(`http://stream.example:${port}/big`), ['127.0.0.1'], {
          timeoutMs: 5000,
          maxBytes: 10,
        }),
      ).rejects.toMatchObject({ code: 'TOO_LARGE' });
      await expect(
        pinnedGet(new URL(`http://stream.example:${port}/redirect`), ['127.0.0.1'], {
          timeoutMs: 5000,
          maxBytes: 10,
        }),
      ).rejects.toBeInstanceOf(PinnedRequestError);
    } finally {
      server.close();
    }
  });
});
