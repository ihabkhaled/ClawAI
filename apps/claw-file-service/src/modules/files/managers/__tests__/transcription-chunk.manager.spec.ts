// ADR-221 — platform-paid chunk transcription (Live Intelligence).
//
// Runs the REAL TranscriptionManager walk with `platformPaid: true`; only the
// provider adapters, the ffprobe probe and the rate card are stubbed. The PAYG
// wire (`fetch`) is stubbed to FAIL the test if it is ever called: a chunk must
// never take a user wallet hold.

import { HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaygMeter } from '@claw/shared-entitlements';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { ModelCostClass, type ModelCostRates } from '@claw/shared-types';
import { TranscribeChunkErrorCode } from '../../../../common/enums';
import { TranscribeChunkException } from '../../../../common/errors';
import { FileMediaMetricsService } from '../../../metrics/services/file-media-metrics.service';
import { transcribeWithGemini } from '../../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../../adapters/openai-transcription.adapter';
import { TranscriptionCapabilityClient } from '../../clients/transcription-capability.client';
import { TranscriptionRateClient } from '../../clients/transcription-rate.client';
import { TRANSCRIBE_CHUNK_MAX_BYTES } from '../../constants/transcribe-chunk.constants';
import { type TranscribeChunkDto } from '../../dto/transcribe-chunk.dto';
import { FilesRepository } from '../../repositories/files.repository';
import { TranscriptionChunkService } from '../../services/transcription-chunk.service';
import { probeAudioSeconds } from '../../utilities/audio-duration.utility';
import { TranscriptionChunkManager } from '../transcription-chunk.manager';
import { TranscriptionManager } from '../transcription.manager';
import { TranscriptionMeterManager } from '../transcription-meter.manager';

vi.mock('../../adapters/gemini-transcription.adapter', () => ({
  transcribeWithGemini: vi.fn(),
}));
vi.mock('../../adapters/openai-transcription.adapter', () => ({
  transcribeWithOpenAi: vi.fn(),
}));
vi.mock('../../utilities/audio-duration.utility', () => ({
  probeAudioSeconds: vi.fn(),
}));

const mockedGemini = vi.mocked(transcribeWithGemini);
const mockedOpenAi = vi.mocked(transcribeWithOpenAi);
const mockedProbe = vi.mocked(probeAudioSeconds);

const GEMINI = { provider: 'GEMINI', model: 'gemini-2.5-flash' };
const OPENAI = { provider: 'OPENAI', model: 'gpt-4o-audio' };
const LOCAL = { provider: 'LOCAL', model: 'Systran/faster-whisper-small' };

const rates = (overrides: Partial<ModelCostRates> = {}): ModelCostRates => ({
  provider: 'GEMINI',
  model: 'gemini-2.5-flash',
  version: 1,
  currency: 'USD',
  inputPerMillionMicroUsd: 1_000_000,
  outputPerMillionMicroUsd: 2_000_000,
  cachedInputPerMillionMicroUsd: null,
  cacheWritePerMillionMicroUsd: null,
  reasoningPerMillionMicroUsd: null,
  imagePerUnitMicroUsd: null,
  audioPerUnitMicroUsd: null,
  videoPerUnitMicroUsd: null,
  toolCallPerUnitMicroUsd: null,
  searchCallPerUnitMicroUsd: null,
  ttsPerCharacterMicroUsd: null,
  costClass: ModelCostClass.CHEAP,
  isAdminOverride: false,
  effectiveFrom: '2026-01-01T00:00:00Z',
  lastVerifiedAt: null,
  source: 'SEED',
  ...overrides,
});

const dto = (overrides: Partial<TranscribeChunkDto> = {}): TranscribeChunkDto => ({
  contentBase64: Buffer.from('RIFF-fake-wav-bytes').toString('base64'),
  mimeType: 'audio/wav',
  requestId: 'live:run-1:7',
  ...overrides,
});

interface Harness {
  manager: TranscriptionChunkManager;
  service: TranscriptionChunkService;
  capability: { findCapableModels: ReturnType<typeof vi.fn> };
  rateClient: { findRates: ReturnType<typeof vi.fn> };
  fetchMock: ReturnType<typeof vi.fn>;
}

const buildHarness = async (
  candidates: { provider: string; model: string }[],
  rateCard: ModelCostRates | null = rates(),
): Promise<Harness> => {
  const capability = {
    findCapableModels: vi.fn().mockResolvedValue(candidates),
    fetchConnectorConfig: vi.fn().mockResolvedValue({ apiKey: 'k', baseUrl: null }),
  };
  const rateClient = { findRates: vi.fn().mockResolvedValue(rateCard) };
  const fetchMock = vi.fn(() => Promise.reject(new Error('PAYG wire must not be called')));
  vi.stubGlobal('fetch', fetchMock);
  const moduleRef = await Test.createTestingModule({
    providers: [
      TranscriptionManager,
      TranscriptionMeterManager,
      TranscriptionChunkManager,
      TranscriptionChunkService,
      FileMediaMetricsService,
      { provide: FilesRepository, useValue: {} },
      { provide: RabbitMQService, useValue: { publish: vi.fn(), subscribe: vi.fn() } },
      { provide: TranscriptionCapabilityClient, useValue: capability },
      { provide: TranscriptionRateClient, useValue: rateClient },
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
    manager: moduleRef.get(TranscriptionChunkManager),
    service: moduleRef.get(TranscriptionChunkService),
    capability,
    rateClient,
    fetchMock,
  };
};

const refusal = async (promise: Promise<unknown>): Promise<TranscribeChunkException> => {
  const caught: unknown = await promise.then(
    () => null,
    (error: unknown) => error,
  );
  expect(caught).toBeInstanceOf(TranscribeChunkException);
  return caught as TranscribeChunkException;
};

const modalityRejection = (): Error =>
  Object.assign(new Error('Request failed with status code 400'), {
    response: { status: 400, data: { error: { message: 'Audio input modality is not enabled' } } },
  });

describe('TranscriptionChunkManager (ADR-221 platform-paid chunk)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedProbe.mockResolvedValue(6);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transcribes with the first candidate, takes no wallet hold, and prices tokens', async () => {
    const harness = await buildHarness([GEMINI, OPENAI]);
    mockedGemini.mockResolvedValue({
      text: '  hello world  ',
      usage: { promptTokens: 300, completionTokens: 10, cachedPromptTokens: 0, reasoningTokens: 0 },
    });

    const result = await harness.service.transcribeChunk(dto());

    expect(result).toEqual({
      text: 'hello world',
      language: null,
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      durationSeconds: 6,
      // 300 * 1 + 10 * 2 = 320 micro-USD (per-million rates, rounded up).
      costMicroUsd: 320,
      costKnown: true,
      noSpeech: false,
    });
    expect(harness.fetchMock).not.toHaveBeenCalled();
    expect(mockedOpenAi).not.toHaveBeenCalled();
    // The output ceiling is the estimate a hold would have requested: 6 s * 8 + 1024.
    expect(mockedGemini.mock.calls[0]?.[5]).toBe(6 * 8 + 1024);
  });

  it('returns 200 noSpeech with empty text when the provider heard nothing', async () => {
    const harness = await buildHarness([GEMINI, OPENAI]);
    mockedGemini.mockResolvedValue({ text: '   ' });

    const result = await harness.manager.transcribe(dto());

    expect(result.noSpeech).toBe(true);
    expect(result.text).toBe('');
    // An empty answer is not retried, nor handed to the next paid provider.
    expect(mockedGemini).toHaveBeenCalledTimes(1);
    expect(mockedOpenAi).not.toHaveBeenCalled();
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('walks to the next candidate after a model rejection and prices OpenAI per second', async () => {
    const harness = await buildHarness(
      [GEMINI, OPENAI],
      rates({
        provider: 'OPENAI',
        inputPerMillionMicroUsd: null,
        outputPerMillionMicroUsd: null,
        audioPerUnitMicroUsd: 100,
      }),
    );
    mockedGemini.mockRejectedValue(modalityRejection());
    mockedOpenAi.mockResolvedValue({ text: 'bonjour', durationSeconds: 5.2, language: 'french' });

    const result = await harness.manager.transcribe(dto());

    expect(result.provider).toBe('OPENAI');
    expect(result.text).toBe('bonjour');
    expect(result.language).toBe('french');
    // measured 5.2 s → 6 s * 100 micro-USD.
    expect(result.costMicroUsd).toBe(600);
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('never returns a text-only model refusal as a caption: walks to the next model', async () => {
    const harness = await buildHarness(
      [GEMINI, OPENAI],
      rates({
        provider: 'OPENAI',
        inputPerMillionMicroUsd: null,
        outputPerMillionMicroUsd: null,
        audioPerUnitMicroUsd: 100,
      }),
    );
    // Seen live 2026-11-23 on a Kick stream.
    mockedGemini.mockResolvedValue({
      text: "I'm sorry, but I cannot process audio files. My capabilities are limited to text-based interactions.",
    });
    mockedOpenAi.mockResolvedValue({ text: 'the real words', durationSeconds: 6 });

    const result = await harness.manager.transcribe(dto());

    expect(result.provider).toBe('OPENAI');
    expect(result.text).toBe('the real words');
  });

  it('502 rather than a fake caption when the only model refuses', async () => {
    const harness = await buildHarness([GEMINI], rates());
    mockedGemini.mockResolvedValue({ text: 'As an AI language model, I cannot transcribe audio.' });

    await expect(harness.manager.transcribe(dto())).rejects.toMatchObject({
      code: 'TRANSCRIBE_CHUNK_FAILED',
    });
  });

  it('reports LOCAL as free without asking for a rate card', async () => {
    const harness = await buildHarness([LOCAL]);
    mockedOpenAi.mockResolvedValue({ text: 'local words' });

    const result = await harness.manager.transcribe(dto());

    expect(result).toMatchObject({ provider: 'LOCAL', costMicroUsd: 0, costKnown: true });
    expect(harness.rateClient.findRates).not.toHaveBeenCalled();
  });

  it('still returns the transcript when the rate card is unavailable (costKnown false)', async () => {
    const harness = await buildHarness([GEMINI], null);
    mockedGemini.mockResolvedValue({ text: 'words' });

    const result = await harness.manager.transcribe(dto());

    expect(result).toMatchObject({ text: 'words', costMicroUsd: 0, costKnown: false });
  });

  it('502 TRANSCRIBE_CHUNK_FAILED when every candidate fails', async () => {
    const harness = await buildHarness([GEMINI, OPENAI]);
    mockedGemini.mockRejectedValue(modalityRejection());
    mockedOpenAi.mockRejectedValue(modalityRejection());

    const error = await refusal(harness.manager.transcribe(dto()));

    expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
    expect(error.code).toBe(TranscribeChunkErrorCode.FAILED);
    expect(harness.fetchMock).not.toHaveBeenCalled();
  });

  it('503 TRANSCRIBE_CHUNK_UNAVAILABLE when no provider is configured', async () => {
    const harness = await buildHarness([]);

    const error = await refusal(harness.manager.transcribe(dto()));

    expect(error.getStatus()).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(error.code).toBe(TranscribeChunkErrorCode.UNAVAILABLE);
  });

  it('503 when the capability lookup throws', async () => {
    const harness = await buildHarness([GEMINI]);
    harness.capability.findCapableModels.mockRejectedValue(new Error('connector down'));

    const error = await refusal(harness.manager.transcribe(dto()));

    expect(error.code).toBe(TranscribeChunkErrorCode.UNAVAILABLE);
  });

  it('413 for a chunk over 2 MiB, before any provider call', async () => {
    const harness = await buildHarness([GEMINI]);
    const big = Buffer.alloc(TRANSCRIBE_CHUNK_MAX_BYTES + 1, 1).toString('base64');

    const error = await refusal(harness.manager.transcribe(dto({ contentBase64: big })));

    expect(error.getStatus()).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(error.code).toBe(TranscribeChunkErrorCode.TOO_LARGE);
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('422 for a chunk longer than 30 s', async () => {
    const harness = await buildHarness([GEMINI]);
    mockedProbe.mockResolvedValue(31);

    const error = await refusal(harness.manager.transcribe(dto()));

    expect(error.getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(error.code).toBe(TranscribeChunkErrorCode.TOO_LONG);
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('400 for base64 that decodes to nothing', async () => {
    const harness = await buildHarness([GEMINI]);

    const error = await refusal(harness.manager.transcribe(dto({ contentBase64: '====' })));

    expect(error.code).toBe(TranscribeChunkErrorCode.EMPTY_AUDIO);
  });
});
