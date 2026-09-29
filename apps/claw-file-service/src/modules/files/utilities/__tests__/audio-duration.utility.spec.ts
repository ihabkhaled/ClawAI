import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MediaProcessStatus } from '../../../../common/enums';
import { type MediaProcessResult } from '../../types/video-processing.types';

const probeMediaFile = vi.fn();
const createMediaTempDir = vi.fn();
const removeMediaTempDir = vi.fn();
const writeMediaTempFile = vi.fn();

vi.mock('../../adapters/media-tool.adapter', () => ({
  probeMediaFile: (...args: unknown[]) => probeMediaFile(...args),
}));
vi.mock('../../../../common/utilities/media-process.utility', () => ({
  createMediaTempDir: () => createMediaTempDir(),
  removeMediaTempDir: (dir: string) => removeMediaTempDir(dir),
  writeMediaTempFile: (...args: unknown[]) => writeMediaTempFile(...args),
}));

const { audioSecondsFromProbe, probeAudioSeconds } = await import('../audio-duration.utility');

const probeResult = (
  json: unknown,
  overrides: Partial<MediaProcessResult> = {},
): MediaProcessResult => ({
  status: MediaProcessStatus.EXITED,
  exitCode: 0,
  stdout: Buffer.from(typeof json === 'string' ? json : JSON.stringify(json)),
  stderr: '',
  ...overrides,
});

describe('audioSecondsFromProbe', () => {
  it('rounds the format duration up to whole seconds', () => {
    expect(audioSecondsFromProbe(probeResult({ streams: [], format: { duration: '12.01' } }))).toBe(
      13,
    );
  });

  it('is undefined for a failed probe, unparseable output or no duration', () => {
    expect(
      audioSecondsFromProbe(probeResult({ streams: [] }, { status: MediaProcessStatus.TIMED_OUT })),
    ).toBeUndefined();
    expect(audioSecondsFromProbe(probeResult({ streams: [] }, { exitCode: 1 }))).toBeUndefined();
    expect(audioSecondsFromProbe(probeResult('not json'))).toBeUndefined();
    expect(audioSecondsFromProbe(probeResult({ streams: [], format: {} }))).toBeUndefined();
  });
});

describe('probeAudioSeconds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createMediaTempDir.mockResolvedValue('/tmp/claw-x');
    writeMediaTempFile.mockResolvedValue('/tmp/claw-x/audio-probe');
    removeMediaTempDir.mockResolvedValue(undefined);
  });

  it('probes a temp copy and removes the temp dir', async () => {
    probeMediaFile.mockResolvedValue(probeResult({ streams: [], format: { duration: '41.2' } }));

    await expect(probeAudioSeconds('YXVkaW8=')).resolves.toBe(42);
    expect(probeMediaFile).toHaveBeenCalledWith('/tmp/claw-x/audio-probe');
    expect(removeMediaTempDir).toHaveBeenCalledWith('/tmp/claw-x');
  });

  it('never throws: a probe error is undefined and the temp dir is still removed', async () => {
    probeMediaFile.mockRejectedValue(new Error('spawn ENOENT'));

    await expect(probeAudioSeconds('YXVkaW8=')).resolves.toBeUndefined();
    expect(removeMediaTempDir).toHaveBeenCalledWith('/tmp/claw-x');
  });

  it('returns undefined without cleanup when the temp dir cannot be created', async () => {
    createMediaTempDir.mockRejectedValue(new Error('EACCES'));

    await expect(probeAudioSeconds('YXVkaW8=')).resolves.toBeUndefined();
    expect(removeMediaTempDir).not.toHaveBeenCalled();
  });
});
