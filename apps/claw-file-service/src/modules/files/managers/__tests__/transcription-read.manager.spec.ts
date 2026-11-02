// Stateless BILLED media read (POST /files/transcribe-text).
//
// Runs the REAL TranscriptionReadManager, TranscriptionManager,
// TranscriptionMeterManager and PaygMeter. Stubbed: `fetch` (the auth-service
// credit wire), the provider adapters, ffprobe/ffmpeg (VideoMediaManager) and
// the plan limit. So the asserted reserve / finalize / release bodies are what
// auth-service would receive: surface, requestId and units.

import { HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { PaygMeter, REQUIRE_PERMISSIONS_KEY } from '@claw/shared-entitlements';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { PaygSurface, Permission, VideoProcessingFailureReason } from '@claw/shared-types';
import { TranscriptionManager } from '../transcription.manager';
import { TranscriptionMeterManager } from '../transcription-meter.manager';
import { TranscriptionReadManager } from '../transcription-read.manager';
import { VideoMediaManager } from '../video-media.manager';
import { VideoPlanLimitManager } from '../video-plan-limit.manager';
import { FileMediaMetricsService } from '../../../metrics/services/file-media-metrics.service';
import { FilesRepository } from '../../repositories/files.repository';
import { TranscriptionCapabilityClient } from '../../clients/transcription-capability.client';
import { FilesController } from '../../controllers/files.controller';
import { TranscriptionReadService } from '../../services/transcription-read.service';
import { TranscribeReadErrorCode, VideoPlanDecision } from '../../../../common/enums';
import { TranscribeReadException } from '../../../../common/errors';
import { transcribeWithGemini } from '../../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../../adapters/openai-transcription.adapter';
import { probeAudioSeconds } from '../../utilities/audio-duration.utility';
import { MAX_TRANSCRIBABLE_AUDIO_BYTES } from '../../constants/transcription.constants';
import { TRANSCRIBE_READ_MAX_TEXT_CHARS } from '../../constants/transcribe-read.constants';
import { classifyReadMedia } from '../../utilities/transcribe-read-media.utility';
import { transcribeTextSchema } from '../../dto/transcribe-text.dto';

vi.mock('../../adapters/gemini-transcription.adapter', () => ({ transcribeWithGemini: vi.fn() }));
vi.mock('../../adapters/openai-transcription.adapter', () => ({ transcribeWithOpenAi: vi.fn() }));
vi.mock('../../utilities/audio-duration.utility', () => ({ probeAudioSeconds: vi.fn() }));

const mockedProbe = vi.mocked(probeAudioSeconds);
const mockedGemini = vi.mocked(transcribeWithGemini);
const mockedOpenAi = vi.mocked(transcribeWithOpenAi);

const USER = 'user-1';
const GEMINI = { provider: 'GEMINI', model: 'gemini-2.5-flash' };
const OPENAI = { provider: 'OPENAI', model: 'gpt-4o-audio' };
const LOCAL = { provider: 'LOCAL', model: 'whisper-local' };
const AUDIO_B64 = Buffer.from('fake-audio-bytes').toString('base64');

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const heldReply = (maxOutputTokens: number, clamped = false): unknown => ({
  metered: true,
  reservationId: 'res-1',
  maxOutputTokens,
  clamped,
  heldMicroUsd: 300,
  availableAfterMicroUsd: 9_700,
});

type Summary = {
  hasVideo: boolean;
  durationMs: number;
  width: number;
  height: number;
  fps: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  hasAudio: boolean;
  container: string | null;
};
const summary = (overrides: Partial<Summary> = {}): Summary => ({
  hasVideo: true,
  durationMs: 60_000,
  width: 1280,
  height: 720,
  fps: 30,
  videoCodec: 'h264',
  audioCodec: 'aac',
  hasAudio: true,
  container: 'mov,mp4',
  ...overrides,
});

interface WireCall {
  path: string;
  body: Record<string, unknown>;
}
interface Harness {
  reader: TranscriptionReadManager;
  service: TranscriptionReadService;
  capability: { findCapableModels: Mock; fetchConnectorConfig: Mock };
  media: {
    withBufferWorkspace: Mock;
    probe: Mock;
    extractAudio: Mock;
    measurePeakVolume: Mock;
  };
  planLimit: { check: Mock };
  wire: () => WireCall[];
}

const buildHarness = async (
  candidates: { provider: string; model: string }[],
  reserveReply: () => Promise<Response> = () => Promise.resolve(jsonResponse(200, heldReply(900))),
): Promise<Harness> => {
  const capability = {
    findCapableModels: vi.fn().mockResolvedValue(candidates),
    fetchConnectorConfig: vi.fn().mockResolvedValue({ apiKey: 'k', baseUrl: null }),
  };
  const media = {
    withBufferWorkspace: vi.fn((_bytes: Buffer, work: (w: unknown) => Promise<unknown>) =>
      work({ dir: '/tmp/x', inputPath: '/tmp/x/input' }),
    ),
    probe: vi.fn().mockResolvedValue({ ok: true, summary: summary() }),
    extractAudio: vi.fn().mockResolvedValue(Buffer.from('mp3-track')),
    measurePeakVolume: vi.fn().mockResolvedValue(-20),
  };
  const planLimit = {
    check: vi.fn().mockResolvedValue({ decision: VideoPlanDecision.ALLOWED, limitSeconds: null }),
  };
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>((url) =>
    url.endsWith('/reserve') ? reserveReply() : Promise.resolve(jsonResponse(200, {})),
  );
  vi.stubGlobal('fetch', fetchMock);
  const moduleRef = await Test.createTestingModule({
    providers: [
      TranscriptionManager,
      TranscriptionMeterManager,
      TranscriptionReadManager,
      TranscriptionReadService,
      FileMediaMetricsService,
      { provide: FilesRepository, useValue: {} },
      { provide: RabbitMQService, useValue: { publish: vi.fn(), subscribe: vi.fn() } },
      { provide: TranscriptionCapabilityClient, useValue: capability },
      { provide: VideoMediaManager, useValue: media },
      { provide: VideoPlanLimitManager, useValue: planLimit },
      {
        provide: PaygMeter,
        useValue: new PaygMeter({
          authServiceUrl: 'http://auth-service:4001',
          interServiceToken: 'test-inter-service-token-000000000000',
          exemptProviders: [],
        }),
      },
    ],
  }).compile();
  return {
    reader: moduleRef.get(TranscriptionReadManager),
    service: moduleRef.get(TranscriptionReadService),
    capability,
    media,
    planLimit,
    wire: (): WireCall[] =>
      fetchMock.mock.calls.map(([url, init]) => ({
        path: url.slice(url.lastIndexOf('/') + 1),
        body: JSON.parse(String(init.body)) as Record<string, unknown>,
      })),
  };
};

/** Plain audio bytes: the container holds no video stream, so the audio path runs. */
const buildAudioHarness = async (...args: Parameters<typeof buildHarness>): Promise<Harness> => {
  const harness = await buildHarness(...args);
  harness.media.probe.mockResolvedValue({
    ok: true,
    summary: summary({ hasVideo: false, videoCodec: null }),
  });
  return harness;
};

const refusal = async (promise: Promise<unknown>): Promise<TranscribeReadException> => {
  const error = await promise.then(
    () => null,
    (caught: unknown) => caught,
  );
  expect(error).toBeInstanceOf(TranscribeReadException);
  return error as TranscribeReadException;
};
const paths = (h: Harness): string[] => h.wire().map((c) => c.path);
const audioDto = { fileName: 'memo.mp3', contentBase64: AUDIO_B64 };
const videoDto = { fileName: 'clip.mp4', contentBase64: AUDIO_B64 };

describe('TranscriptionReadManager (POST /files/transcribe-text)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProbe.mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('auth and routing', () => {
    it('the route sits under FILES_USE and the service refuses a request with no user (401)', async () => {
      expect(new Reflector().get(REQUIRE_PERMISSIONS_KEY, FilesController)).toEqual([
        Permission.FILES_USE,
      ]);
      const h = await buildHarness([GEMINI]);
      await expect(h.service.transcribeText(undefined, audioDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      await expect(h.service.transcribeText('', audioDto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(h.wire()).toEqual([]);
    });

    it('the DTO is strict and requires fileName + contentBase64', () => {
      expect(transcribeTextSchema.safeParse({ contentBase64: 'AAAA' }).success).toBe(false);
      expect(transcribeTextSchema.safeParse({ ...audioDto, extra: 1 }).success).toBe(false);
      expect(transcribeTextSchema.safeParse({ ...audioDto, mimeType: 'audio/mpeg' }).success).toBe(
        true,
      );
    });
  });

  describe('media classification and limits', () => {
    it('classifies by extension; .webm is audio only with an audio mime type', () => {
      expect(classifyReadMedia('a.MP3')?.kind).toBe('audio');
      expect(classifyReadMedia('a.m4a')?.mimeType).toBe('audio/mp4');
      expect(classifyReadMedia('a.mkv')?.kind).toBe('video');
      expect(classifyReadMedia('a.webm')?.kind).toBe('video');
      expect(classifyReadMedia('a.webm', 'video/webm')?.kind).toBe('video');
      expect(classifyReadMedia('a.webm', 'audio/webm;codecs=opus')?.kind).toBe('audio');
      expect(classifyReadMedia('a.txt')).toBeNull();
      expect(classifyReadMedia('a.mp3', 'text/plain')).toBeNull();
      expect(classifyReadMedia('noextension')).toBeNull();
    });

    it('an unsupported type is a 422 with its code and spends nothing', async () => {
      const h = await buildHarness([GEMINI]);
      const error = await refusal(
        h.reader.read(USER, { fileName: 'notes.pdf', contentBase64: AUDIO_B64 }),
      );
      expect(error.code).toBe(TranscribeReadErrorCode.UNSUPPORTED_MEDIA_TYPE);
      expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(h.wire()).toEqual([]);
    });

    it('audio over 12 MB is a 413 with its code and spends nothing', async () => {
      const h = await buildHarness([GEMINI]);
      const big = Buffer.alloc(MAX_TRANSCRIBABLE_AUDIO_BYTES + 1).toString('base64');
      const error = await refusal(
        h.reader.read(USER, { fileName: 'long.wav', contentBase64: big }),
      );
      expect(error.code).toBe(TranscribeReadErrorCode.AUDIO_TOO_LARGE);
      expect(error.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
      expect(h.wire()).toEqual([]);
    });

    it('empty bytes are a 400', async () => {
      const h = await buildHarness([GEMINI]);
      const error = await refusal(h.reader.read(USER, { fileName: 'a.mp3', contentBase64: '=' }));
      expect(error.code).toBe(TranscribeReadErrorCode.EMPTY_MEDIA);
      expect(error.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });
  });

  describe('billing', () => {
    it('audio via Gemini: reserve on TRANSCRIPTION_READ with the read request id, granted ceiling, finalize on usage', async () => {
      mockedProbe.mockResolvedValue(10);
      mockedGemini.mockResolvedValue({
        text: ' hello world ',
        usage: {
          promptTokens: 400,
          completionTokens: 20,
          cachedPromptTokens: 0,
          reasoningTokens: 0,
        },
      });
      const h = await buildAudioHarness([GEMINI]);

      const result = await h.service.transcribeText(USER, audioDto);

      expect(result).toEqual({
        text: 'hello world',
        durationSeconds: 10,
        provider: 'GEMINI',
        model: 'gemini-2.5-flash',
        truncated: false,
      });
      const [reserve, finalize, ...rest] = h.wire();
      expect(rest).toEqual([]);
      expect(reserve?.path).toBe('reserve');
      expect(reserve?.body).toMatchObject({
        userId: USER,
        surface: PaygSurface.TRANSCRIPTION_READ,
        provider: 'GEMINI',
      });
      expect(String(reserve?.body.requestId)).toMatch(
        /^transcription-read:user-1:[0-9a-f-]{36}:GEMINI$/,
      );
      expect(finalize?.path).toBe('finalize');
      expect(finalize?.body).toMatchObject({ reservationId: 'res-1' });
      // The GRANTED ceiling (900), not the requested one (rule 37 item 2 / 20).
      expect(mockedGemini).toHaveBeenCalledWith(
        expect.any(String),
        'k',
        AUDIO_B64,
        'audio/mpeg',
        'gemini-2.5-flash',
        900,
      );
    });

    it('a provider failure releases the hold and is a 502 (never finalized)', async () => {
      mockedGemini.mockRejectedValue(Object.assign(new Error('boom'), { code: 'ECONNRESET' }));
      const h = await buildAudioHarness([GEMINI]);

      const error = await refusal(h.reader.read(USER, audioDto));

      expect(error.code).toBe(TranscribeReadErrorCode.FAILED);
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(paths(h)).toEqual(['reserve', 'release']);
    });

    it('an empty provider answer releases the hold and is a 502', async () => {
      mockedGemini.mockResolvedValue({ text: '   ' });
      const h = await buildAudioHarness([GEMINI]);

      const error = await refusal(h.reader.read(USER, audioDto));

      expect(error.code).toBe(TranscribeReadErrorCode.FAILED);
      expect(paths(h)).not.toContain('finalize');
      expect(paths(h).filter((p) => p === 'release').length).toBe(
        paths(h).filter((p) => p === 'reserve').length,
      );
    });

    it('falls through to the free LOCAL container last, and OpenAI is settled on seconds', async () => {
      mockedProbe.mockResolvedValue(5);
      mockedGemini.mockRejectedValue(
        Object.assign(new Error('bad modality'), {
          response: {
            status: 400,
            data: { error: { message: 'Audio input modality is not enabled for models/x' } },
          },
        }),
      );
      mockedOpenAi.mockResolvedValue({ text: 'local words', durationSeconds: 4.2 });
      const h = await buildAudioHarness([GEMINI, LOCAL]);

      const result = await h.service.transcribeText(USER, audioDto);

      expect(result.provider).toBe('LOCAL');
      const finalize = h.wire().find((c) => c.path === 'finalize');
      expect(finalize?.body).toMatchObject({ audioSeconds: 5 });
    });

    it('a refused credit check is a 402 with no provider call', async () => {
      const h = await buildAudioHarness([GEMINI], () =>
        Promise.resolve(jsonResponse(402, { errorCode: 'INSUFFICIENT_CREDIT', message: 'no' })),
      );

      const error = await refusal(h.reader.read(USER, audioDto));

      expect(error.code).toBe(TranscribeReadErrorCode.INSUFFICIENT_CREDIT);
      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(mockedGemini).not.toHaveBeenCalled();
    });

    it('a clamped hold is a 402 and the hold goes back', async () => {
      const h = await buildAudioHarness([GEMINI], () =>
        Promise.resolve(jsonResponse(200, heldReply(10, true))),
      );

      const error = await refusal(h.reader.read(USER, audioDto));

      expect(error.getStatus()).toBe(HttpStatus.PAYMENT_REQUIRED);
      expect(paths(h)).toEqual(['reserve', 'release']);
      expect(mockedGemini).not.toHaveBeenCalled();
    });

    it('no capable connector is a 503', async () => {
      const h = await buildAudioHarness([]);
      const error = await refusal(h.reader.read(USER, audioDto));
      expect(error.code).toBe(TranscribeReadErrorCode.UNAVAILABLE);
      expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('a transcript over the character limit is cut and flagged truncated', async () => {
      mockedGemini.mockResolvedValue({ text: 'a'.repeat(TRANSCRIBE_READ_MAX_TEXT_CHARS + 10) });
      const h = await buildAudioHarness([GEMINI]);
      const result = await h.reader.read(USER, audioDto);
      expect(result.truncated).toBe(true);
      expect(result.text.startsWith('a'.repeat(100))).toBe(true);
    });
  });

  describe('a video renamed as audio', () => {
    it('is read as video and meets the plan gate (video disabled is a 422)', async () => {
      const h = await buildHarness([GEMINI]);
      h.planLimit.check.mockResolvedValue({
        decision: VideoPlanDecision.DISABLED,
        limitSeconds: 0,
      });
      const error = await refusal(h.reader.read(USER, audioDto));
      expect(error.code).toBe(TranscribeReadErrorCode.VIDEO_DISABLED_FOR_PLAN);
      expect(h.wire()).toEqual([]);
    });

    it('audio with cover art (an mjpeg picture) stays on the audio path', async () => {
      mockedOpenAi.mockResolvedValue({ text: 'spoken words' });
      const h = await buildHarness([OPENAI]);
      h.media.probe.mockResolvedValue({
        ok: true,
        summary: summary({ videoCodec: 'mjpeg', container: 'mp3' }),
      });
      await h.reader.read(USER, audioDto);
      expect(h.planLimit.check).not.toHaveBeenCalled();
      expect(h.media.extractAudio).not.toHaveBeenCalled();
    });

    it('audio-only bytes (no video stream) skip the plan gate', async () => {
      mockedOpenAi.mockResolvedValue({ text: 'spoken words' });
      const h = await buildHarness([OPENAI]);
      h.media.probe.mockResolvedValue({
        ok: true,
        summary: summary({ hasVideo: false, videoCodec: null, container: 'mov,mp4' }),
      });
      await h.reader.read(USER, audioDto);
      expect(h.planLimit.check).not.toHaveBeenCalled();
    });

    it('a probe failure leaves the bytes on the audio path (fails open)', async () => {
      mockedOpenAi.mockResolvedValue({ text: 'spoken words' });
      const h = await buildHarness([OPENAI]);
      h.media.probe.mockRejectedValue(new Error('ffprobe down'));
      await h.reader.read(USER, audioDto);
      expect(h.planLimit.check).not.toHaveBeenCalled();
    });
  });

  describe('video (audio track only)', () => {
    it('extracts the track, holds on the measured seconds and never extracts frames', async () => {
      mockedOpenAi.mockResolvedValue({ text: 'spoken words' });
      const h = await buildHarness([OPENAI]);

      const result = await h.reader.read(USER, videoDto);

      expect(result).toMatchObject({
        text: 'spoken words',
        durationSeconds: 60,
        provider: 'OPENAI',
      });
      expect(h.wire()[0]?.body).toMatchObject({
        surface: PaygSurface.TRANSCRIPTION_READ,
        audioSeconds: 60,
      });
      expect(h.media.extractAudio).toHaveBeenCalledTimes(1);
      expect(Object.keys(h.media)).not.toContain('extractFrame');
    });

    it('over the 1800 s global cap is a 422 and nothing is held', async () => {
      const h = await buildHarness([GEMINI]);
      h.media.probe.mockResolvedValue({ ok: true, summary: summary({ durationMs: 1_801_000 }) });
      const error = await refusal(h.reader.read(USER, videoDto));
      expect(error.code).toBe(TranscribeReadErrorCode.MEDIA_TOO_LONG);
      expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
      expect(h.wire()).toEqual([]);
    });

    it('over the plan maxVideoSeconds is a 422 naming the limit', async () => {
      const h = await buildHarness([GEMINI]);
      h.planLimit.check.mockResolvedValue({
        decision: VideoPlanDecision.TOO_LONG,
        limitSeconds: 30,
      });
      const error = await refusal(h.reader.read(USER, videoDto));
      expect(error.code).toBe(TranscribeReadErrorCode.MEDIA_TOO_LONG);
      expect(error.message).toContain('30');
      expect(h.wire()).toEqual([]);
    });

    it('plan limit 0 (video disabled) is a 422', async () => {
      const h = await buildHarness([GEMINI]);
      h.planLimit.check.mockResolvedValue({
        decision: VideoPlanDecision.DISABLED,
        limitSeconds: 0,
      });
      const error = await refusal(h.reader.read(USER, videoDto));
      expect(error.code).toBe(TranscribeReadErrorCode.VIDEO_DISABLED_FOR_PLAN);
      expect(h.wire()).toEqual([]);
    });

    it('plan limit null (unlimited) is capped at 1800 s, and allowed below it', async () => {
      mockedGemini.mockResolvedValue({ text: 'ok' });
      const h = await buildHarness([GEMINI]);
      h.media.probe.mockResolvedValue({ ok: true, summary: summary({ durationMs: 1_800_000 }) });
      await expect(h.reader.read(USER, videoDto)).resolves.toMatchObject({ durationSeconds: 1800 });
    });

    it('an unreadable plan fails closed (503)', async () => {
      const h = await buildHarness([GEMINI]);
      h.planLimit.check.mockResolvedValue({
        decision: VideoPlanDecision.ENTITLEMENTS_UNAVAILABLE,
        limitSeconds: null,
      });
      const error = await refusal(h.reader.read(USER, videoDto));
      expect(error.code).toBe(TranscribeReadErrorCode.ENTITLEMENTS_UNAVAILABLE);
      expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    });

    it('a silent track, a missing track and a corrupt container spend nothing', async () => {
      const h = await buildHarness([GEMINI]);

      h.media.measurePeakVolume.mockResolvedValue(-91);
      expect((await refusal(h.reader.read(USER, videoDto))).code).toBe(
        TranscribeReadErrorCode.NO_SPEECH,
      );

      h.media.measurePeakVolume.mockResolvedValue(-20);
      h.media.probe.mockResolvedValue({ ok: true, summary: summary({ hasAudio: false }) });
      expect((await refusal(h.reader.read(USER, videoDto))).code).toBe(
        TranscribeReadErrorCode.NO_AUDIO_TRACK,
      );

      h.media.probe.mockResolvedValue({
        ok: false,
        reason: VideoProcessingFailureReason.CORRUPT_CONTAINER,
        detail: 'x',
      });
      expect((await refusal(h.reader.read(USER, videoDto))).code).toBe(
        TranscribeReadErrorCode.MEDIA_UNREADABLE,
      );

      h.media.probe.mockResolvedValue({
        ok: false,
        reason: VideoProcessingFailureReason.TOOL_UNAVAILABLE,
        detail: 'x',
      });
      expect((await refusal(h.reader.read(USER, videoDto))).getStatus()).toBe(
        HttpStatus.SERVICE_UNAVAILABLE,
      );
      expect(h.wire()).toEqual([]);
    });
  });
});
