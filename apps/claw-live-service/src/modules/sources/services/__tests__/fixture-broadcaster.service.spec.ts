/* eslint-disable security/detect-non-literal-fs-filename -- temp dirs created by the spec itself */
import { EventEmitter } from 'node:events';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { spawnProcess } = vi.hoisted(() => ({ spawnProcess: vi.fn() }));
vi.mock('../../../../common/utilities/process.utility', () => ({ spawnProcess }));

import { FixtureBroadcasterService } from '../fixture-broadcaster.service';

function fakeChild(): EventEmitter & { exitCode: number | null; kill: ReturnType<typeof vi.fn> } {
  const child = new EventEmitter() as EventEmitter & {
    exitCode: number | null;
    kill: ReturnType<typeof vi.fn>;
  };
  child.exitCode = null;
  child.kill = vi.fn(() => {
    child.exitCode = 137;
  });
  return child;
}

describe('FixtureBroadcasterService', () => {
  let service: FixtureBroadcasterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FixtureBroadcasterService();
  });

  afterEach(async () => service.onModuleDestroy());

  it('knows only allowlisted fixture names', () => {
    expect(service.isFixtureName('live-demo')).toBe(true);
    expect(service.isFixtureName('../etc')).toBe(false);
    expect(service.isFixtureName('constructor')).toBe(false);
  });

  it('starts ffmpeg lazily (no shell, local input only) and serves its files', async () => {
    spawnProcess.mockImplementation((_command: string, args: string[]) => {
      const playlist = args.at(-1) ?? '';
      writeFileSync(playlist, '#EXTM3U\n#EXTINF:4,\nseg0.ts\n');
      writeFileSync(join(playlist, '..', 'seg0.ts'), 'TS');
      return fakeChild();
    });
    const playlist = await service.playlistPath('live-demo');
    expect(playlist.endsWith('index.m3u8')).toBe(true);
    const args = spawnProcess.mock.calls[0]?.[1] as string[];
    expect(spawnProcess.mock.calls[0]?.[0]).toBe('ffmpeg');
    expect(args.slice(0, 5)).toEqual([
      '-hide_banner',
      '-loglevel',
      'error',
      '-protocol_whitelist',
      'file',
    ]);
    expect(args).toEqual(
      expect.arrayContaining(['-stream_loop', '-1', 'delete_segments+program_date_time']),
    );
    expect((await service.readFile('live-demo', 'seg0.ts')).toString()).toBe('TS');
    await service.ensure('live-demo');
    expect(spawnProcess).toHaveBeenCalledTimes(1);
  });

  it('refuses path traversal and unknown files', async () => {
    await expect(service.readFile('live-demo', '../../etc/passwd')).rejects.toThrow(
      'LIVE_STREAM_NOT_FOUND',
    );
    await expect(service.readFile('live-demo', 'index.m3u8.bak')).rejects.toThrow(
      'LIVE_STREAM_NOT_FOUND',
    );
    expect(spawnProcess).not.toHaveBeenCalled();
  });

  it('fails when ffmpeg exits before writing a playlist', async () => {
    spawnProcess.mockImplementation(() => {
      const child = fakeChild();
      child.exitCode = 1;
      return child;
    });
    await expect(service.ensure('live-demo')).rejects.toThrow('LIVE_FIXTURE_UNAVAILABLE');
  });

  it('stops idle broadcasts', async () => {
    const child = fakeChild();
    spawnProcess.mockImplementation((_command: string, args: string[]) => {
      writeFileSync(args.at(-1) ?? '', '#EXTM3U');
      return child;
    });
    await service.ensure('live-demo');
    service.touch('live-demo');
    await service.sweepIdle(Date.now() + 60_000);
    expect(child.kill).not.toHaveBeenCalled();
    await service.sweepIdle(Date.now() + 6 * 60_000);
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');
  });
});
