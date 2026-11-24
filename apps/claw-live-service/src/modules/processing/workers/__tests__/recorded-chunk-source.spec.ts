import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { runBoundedProcess } from '../../../../common/utilities/process.utility';
import { LiveMode } from '../../../../generated/prisma';
import type { WorkerContext } from '../../types/processing.types';
import { RecordedChunkSource } from '../recorded-chunk-source';

vi.mock('../../../../common/utilities/process.utility', () => ({ runBoundedProcess: vi.fn() }));

const run = vi.mocked(runBoundedProcess);
const reply = (stdout: string | Buffer) => ({
  exitCode: 0,
  stdout: Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout),
  stderrTail: '',
});
const RUN_STARTED_AT = 5_000_000;

describe('RecordedChunkSource', () => {
  let directory: string;
  let billable: boolean;
  const context = (mode: LiveMode) =>
    ({ mode, startedAt: new Date(RUN_STARTED_AT) }) as unknown as WorkerContext;
  const flush = () => new Promise((done) => setImmediate(done));
  const source = (mode: LiveMode, download: () => Promise<string | null>, summary = false) =>
    new RecordedChunkSource(context(mode), { download: vi.fn(download) } as never, directory, {
      watchUrl: 'https://vt.tiktok.com/ZSsYongoV/',
      summary,
      canAdvance: () => Promise.resolve(billable),
    });
  const ready = async (recorded: RecordedChunkSource) => {
    await recorded.poll();
    await flush();
  };

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'recorded-spec-'));
    billable = true;
    run.mockReset();
    // ffprobe → 74 s; every ffmpeg decode → a little PCM; a frame grab → exit 0.
    run.mockImplementation((binary, args) =>
      Promise.resolve(
        binary === 'ffprobe'
          ? reply('74.0\n')
          : reply(args.includes('pipe:1') ? Buffer.alloc(64) : ''),
      ),
    );
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(1_000_000);
  });

  afterEach(async () => {
    vi.useRealTimers();
    await rm(directory, { recursive: true, force: true });
  });

  it('play-along: empty while downloading, then only the chunks the clock reached, then ends', async () => {
    let finish: (file: string | null) => void = () => {};
    const recorded = source(LiveMode.AUDIO, () => new Promise((done) => (finish = done)));

    expect(await recorded.poll()).toEqual({ chunks: [], ended: false, latestSegmentFile: null });
    finish(join(directory, 'media.m4a'));
    await flush();
    const started = await recorded.poll();
    expect(started.chunks).toHaveLength(0);

    vi.setSystemTime(1_000_000 + 7_000);
    const first = await recorded.poll();
    expect(first.chunks.map((chunk) => [chunk.startAt, chunk.endAt])).toEqual([
      [1_000_000, 1_006_000],
    ]);
    expect(first.mediaSeconds).toBe(6);

    vi.setSystemTime(1_000_000 + 600_000);
    let last = await recorded.poll();
    while (!last.ended) last = await recorded.poll();
    expect(last.mediaSeconds).toBe(74);
    expect(last.latestSegmentFile).toBeNull();
  });

  it('play-along pauses while no viewer is billable and resumes where it stopped', async () => {
    const recorded = source(LiveMode.AUDIO, () => Promise.resolve(join(directory, 'a.m4a')));
    await ready(recorded);
    await recorded.poll();

    // The pause starts at the poll that sees it (polls run every 2 s).
    billable = false;
    vi.setSystemTime(1_000_000 + 1_000);
    expect((await recorded.poll()).chunks).toHaveLength(0);
    vi.setSystemTime(1_000_000 + 61_000);
    expect((await recorded.poll()).chunks).toHaveLength(0);

    billable = true;
    vi.setSystemTime(1_000_000 + 61_000);
    await recorded.poll();
    vi.setSystemTime(1_000_000 + 67_000);
    // 60 s waited for credits: the clock resumes at 7 s of media, so exactly one 6 s chunk is due.
    expect((await recorded.poll()).chunks).toHaveLength(1);
  });

  it('summary: 30 s pieces as fast as it can, on media time from the run start, with frames for vision', async () => {
    const recorded = source(
      LiveMode.AUDIO_VISION,
      () => Promise.resolve(join(directory, 'media.mkv')),
      true,
    );
    await ready(recorded);
    const first = await recorded.poll();
    expect(
      first.chunks.map((chunk) => [chunk.startAt - RUN_STARTED_AT, chunk.endAt - RUN_STARTED_AT]),
    ).toEqual([
      [0, 30_000],
      [30_000, 60_000],
    ]);
    expect(first.latestSegmentFile).toBe(join(directory, 'frame.jpg'));
    const rest = await recorded.poll();
    expect(rest.chunks.map((chunk) => chunk.endAt - chunk.startAt)).toEqual([14_000]);
    expect(rest).toMatchObject({ ended: true, mediaSeconds: 74 });
  });

  it('fails honestly when the download fails', async () => {
    const recorded = source(LiveMode.AUDIO, () => Promise.resolve(null));
    await ready(recorded);
    await expect(recorded.poll()).rejects.toThrow('LIVE_RECORDED_DOWNLOAD_FAILED');
  });
});
