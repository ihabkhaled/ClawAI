/* eslint-disable security/detect-non-literal-fs-filename -- temp dirs created by the spec itself */
import { existsSync, mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { runBoundedProcess } = vi.hoisted(() => ({ runBoundedProcess: vi.fn() }));
vi.mock('../../../../common/utilities/process.utility', () => ({ runBoundedProcess }));

import { LiveMode, LiveSourceKind } from '../../../../generated/prisma';
import { AUDIO_CHUNK_BYTES } from '../../constants/processing.constants';
import { HlsChunkSource } from '../hls-chunk-source';

const PDT = Date.parse('2026-11-22T10:00:00.000Z');

function playlist(first: number, count: number, endList = false): string {
  const lines = ['#EXTM3U', `#EXT-X-MEDIA-SEQUENCE:${String(first)}`];
  for (let index = 0; index < count; index += 1) {
    const sequence = first + index;
    lines.push(
      `#EXT-X-PROGRAM-DATE-TIME:${new Date(PDT + sequence * 4000).toISOString()}`,
      '#EXTINF:4.0,',
      `seg${String(sequence)}.ts`,
    );
  }
  if (endList) lines.push('#EXT-X-ENDLIST');
  return lines.join('\n');
}

/** 4 s of 16 kHz mono s16le PCM. */
const fourSeconds = { exitCode: 0, stdout: Buffer.alloc(4 * 16000 * 2, 1), stderrTail: '' };

describe('HlsChunkSource', () => {
  const fetcher = { fetchObject: vi.fn() };
  const fixtures = { touch: vi.fn(), readFile: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    runBoundedProcess.mockResolvedValue(fourSeconds);
  });

  function fixtureSource(): HlsChunkSource {
    const context = {
      lease: { runId: 'r', generation: 1 },
      streamId: 's',
      mode: LiveMode.AUDIO,
      sourceKind: LiveSourceKind.FIXTURE,
      sourceUrl: 'fixture:live-demo',
      declaredHost: null,
      startedAt: new Date(),
    };
    return new HlsChunkSource(
      context,
      fetcher as never,
      fixtures as never,
      mkdtempSync(join(tmpdir(), 'chunk-spec-')),
    );
  }

  it('starts at the live edge, then takes only new segments, cutting 6 s chunks in media time', async () => {
    const source = fixtureSource();
    fixtures.readFile.mockImplementation(async (_name: string, file: string) =>
      file === 'index.m3u8' ? Buffer.from(playlist(10, 5)) : Buffer.from('TS'),
    );
    const first = await source.poll();
    expect(fixtures.readFile).toHaveBeenCalledWith('live-demo', 'seg14.ts');
    expect(fixtures.readFile).not.toHaveBeenCalledWith('live-demo', 'seg10.ts');
    expect(first.chunks).toHaveLength(0);
    expect(first.latestSegmentFile).not.toBeNull();

    fixtures.readFile.mockImplementation(async (_name: string, file: string) =>
      file === 'index.m3u8' ? Buffer.from(playlist(11, 5)) : Buffer.from('TS'),
    );
    const second = await source.poll();
    expect(second.chunks).toHaveLength(1);
    expect(second.chunks[0]?.startAt).toBe(PDT + 14 * 4000);
    expect(second.chunks[0]?.endAt).toBe(PDT + 14 * 4000 + 6000);
    expect(second.chunks[0]?.wav.length).toBe(44 + AUDIO_CHUNK_BYTES);
    const decodeArgs = runBoundedProcess.mock.calls[0]?.[1] as string[];
    expect(decodeArgs).toEqual(
      expect.arrayContaining([
        '-protocol_whitelist',
        'file',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-f',
        's16le',
      ]),
    );
    expect(fixtures.touch).toHaveBeenCalledWith('live-demo');
    await source.dispose();
  });

  it('restarts the buffer on a media-time discontinuity and flushes at ENDLIST', async () => {
    const source = fixtureSource();
    source.append(Buffer.alloc(16000 * 2 * 4), 1000);
    source.append(Buffer.alloc(16000 * 2 * 4), 60_000);
    expect(source.cut(false)).toHaveLength(0);
    const flushed = source.cut(true);
    expect(flushed).toHaveLength(1);
    expect(flushed[0]).toMatchObject({ startAt: 60_000, endAt: 64_000 });
    expect(source.cut(true)).toHaveLength(0);
  });

  it('reports ended once the ENDLIST playlist is consumed', async () => {
    const source = fixtureSource();
    fixtures.readFile.mockImplementation(async (_name: string, file: string) =>
      file === 'index.m3u8' ? Buffer.from(playlist(0, 2, true)) : Buffer.from('TS'),
    );
    const poll = await source.poll();
    expect(poll.ended).toBe(true);
    expect(poll.chunks).toHaveLength(1);
  });

  it('fetches HLS through the pinned fetcher, picks the lightest variant and keeps two temp files', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'chunk-spec-'));
    const source = new HlsChunkSource(
      {
        lease: { runId: 'r', generation: 1 },
        streamId: 's',
        mode: LiveMode.AUDIO,
        sourceKind: LiveSourceKind.HLS,
        sourceUrl: 'https://cdn.example.com/live/master.m3u8',
        declaredHost: 'cdn.example.com',
        startedAt: new Date(),
      },
      fetcher as never,
      fixtures as never,
      directory,
    );
    let mediaFirst = 0;
    fetcher.fetchObject.mockImplementation(async (url: URL) => {
      if (url.pathname.endsWith('master.m3u8')) {
        return {
          body: Buffer.from(
            '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=3000000\nhi.m3u8\n#EXT-X-STREAM-INF:BANDWIDTH=500000\nlo.m3u8\n',
          ),
        };
      }
      if (url.pathname.endsWith('lo.m3u8')) {
        mediaFirst += 1;
        return { body: Buffer.from(playlist(mediaFirst, 3)) };
      }
      return { body: Buffer.from('TS') };
    });
    await source.poll();
    await source.poll();
    await source.poll();
    const urls = fetcher.fetchObject.mock.calls.map((call) => (call[0] as URL).href);
    expect(urls).toContain('https://cdn.example.com/live/lo.m3u8');
    expect(urls).not.toContain('https://cdn.example.com/live/hi.m3u8');
    expect(fetcher.fetchObject.mock.calls.every((call) => call[1] === 'cdn.example.com')).toBe(
      true,
    );
    expect(readdirSync(directory)).toHaveLength(2);
    await source.dispose();
    expect(existsSync(directory)).toBe(false);
  });

  it('treats an undecodable segment as empty audio', async () => {
    runBoundedProcess.mockRejectedValue(new Error('PROCESS_TIMEOUT'));
    const source = fixtureSource();
    fixtures.readFile.mockImplementation(async (_name: string, file: string) =>
      file === 'index.m3u8' ? Buffer.from(playlist(0, 1)) : Buffer.from('TS'),
    );
    await expect(source.poll()).resolves.toMatchObject({ chunks: [], ended: false });
  });

  describe('server pull', () => {
    const suffixes = ['ttvnw.net'];
    function pulledSource(resolvePlaylist: () => Promise<URL | null>): HlsChunkSource {
      const context = {
        lease: { runId: 'r', generation: 1 },
        streamId: 's',
        mode: LiveMode.AUDIO,
        sourceKind: LiveSourceKind.PLATFORM,
        sourceUrl: 'https://www.twitch.tv/xqc',
        declaredHost: 'www.twitch.tv',
        startedAt: new Date(),
      };
      return new HlsChunkSource(
        context,
        fetcher as never,
        fixtures as never,
        mkdtempSync(join(tmpdir(), 'chunk-spec-')),
        { hostSuffixes: suffixes, resolvePlaylist },
      );
    }

    afterEach(() => vi.useRealTimers());

    it('fails the poll (no fetch) when the stream resolves to nothing, e.g. offline', async () => {
      const source = pulledSource(() => Promise.resolve(null));
      await expect(source.poll()).rejects.toThrow('LIVE_SERVER_PULL_UNAVAILABLE');
      expect(fetcher.fetchObject).not.toHaveBeenCalled();
      await source.dispose();
    });

    it('fetches on the suffix pin, and re-resolves the token after a failure only past the throttle', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(PDT);
      const first = new URL('https://usher.ttvnw.net/hls/xqc.m3u8?token=1');
      const second = new URL('https://usher.ttvnw.net/hls/xqc.m3u8?token=2');
      const resolvePlaylist = vi
        .fn<() => Promise<URL | null>>()
        .mockResolvedValueOnce(first)
        .mockResolvedValueOnce(second);
      const source = pulledSource(resolvePlaylist);
      fetcher.fetchObject.mockImplementation((url: URL) =>
        url.pathname.endsWith('.ts')
          ? Promise.resolve({ body: Buffer.from('ts') })
          : Promise.resolve({ body: Buffer.from(playlist(10, 3)) }),
      );
      await source.poll();
      expect(fetcher.fetchObject).toHaveBeenCalledWith(first, suffixes, expect.any(Number));

      // A failure inside the throttle window keeps the token (a blip is not an expiry).
      fetcher.fetchObject.mockRejectedValueOnce(new Error('LIVE_UPSTREAM_FAILED'));
      await expect(source.poll()).rejects.toThrow('LIVE_UPSTREAM_FAILED');
      expect(resolvePlaylist).toHaveBeenCalledTimes(1);

      // Past the throttle, a failure drops the token; the next poll resolves a fresh one.
      vi.setSystemTime(PDT + 31_000);
      fetcher.fetchObject.mockRejectedValueOnce(new Error('LIVE_UPSTREAM_FAILED'));
      await expect(source.poll()).rejects.toThrow('LIVE_UPSTREAM_FAILED');
      await source.poll();
      expect(resolvePlaylist).toHaveBeenCalledTimes(2);
      expect(fetcher.fetchObject).toHaveBeenCalledWith(second, suffixes, expect.any(Number));
      await source.dispose();
    });
  });
});
