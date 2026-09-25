// Multimodal batch 4 — PAYG metering of audio transcription.
//
// Runs the REAL TranscriptionManager, TranscriptionMeterManager and PaygMeter;
// only `fetch` (the auth-service credit wire) and the provider adapters are
// stubbed. So what is asserted is the exact reserve / finalize / release body
// auth-service would receive — surface, requestId, units — not a mock's view.

import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { PaygMeter } from '@claw/shared-entitlements';
import { RabbitMQService } from '@claw/shared-rabbitmq';
import { BillingErrorCode, EventPattern, PaygSurface } from '@claw/shared-types';
import { TranscriptionManager } from '../transcription.manager';
import { TranscriptionMeterManager } from '../transcription-meter.manager';
import { FilesRepository } from '../../repositories/files.repository';
import { TranscriptionCapabilityClient } from '../../clients/transcription-capability.client';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { transcribeWithGemini } from '../../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../../adapters/openai-transcription.adapter';
import {
  TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
} from '../../constants/transcription-payg.constants';

vi.mock('../../adapters/gemini-transcription.adapter', () => ({
  transcribeWithGemini: vi.fn(),
}));
vi.mock('../../adapters/openai-transcription.adapter', () => ({
  transcribeWithOpenAi: vi.fn(),
}));

const mockedGemini = vi.mocked(transcribeWithGemini);
const mockedOpenAi = vi.mocked(transcribeWithOpenAi);

const AUDIO_PLACEHOLDER = '[Audio file: memo.webm]';
// 2,048 bytes at the 1,000 B/s floor → a worst case of ceil(2.048) = 3 s.
const SIZE_BYTES = 2048;
const RESERVED_SECONDS = 3;

const GEMINI = { provider: 'GEMINI', model: 'gemini-2.5-flash' };
const OPENAI = { provider: 'OPENAI', model: 'gpt-4o-audio' };

const buildFile = (overrides: Partial<File> = {}): File => ({
  id: 'file-1',
  userId: 'uploader-1',
  filename: 'memo.webm',
  mimeType: 'audio/webm',
  sizeBytes: SIZE_BYTES,
  storagePath: '/data/uploads/memo.webm',
  content: Buffer.from('fake-audio').toString('base64'),
  extractedText: AUDIO_PLACEHOLDER,
  extractionError: null,
  ingestionStatus: FileIngestionStatus.COMPLETED,
  retentionExpiresAt: null,
  parentFileId: null,
  archivePath: null,
  isExtracted: false,
  extractionMetadata: null,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  ...overrides,
});

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

interface WireCall {
  path: string;
  body: Record<string, unknown>;
}

interface Harness {
  manager: TranscriptionManager;
  files: { findById: Mock; saveExtractionResult: Mock };
  rabbit: { publish: Mock; subscribe: Mock };
  capability: { findCapableModels: Mock; fetchConnectorConfig: Mock };
  fetchMock: Mock;
  wire: () => WireCall[];
}

const buildHarness = async (
  file: File,
  candidates: { provider: string; model: string }[],
  reserveReply: () => Promise<Response>,
): Promise<Harness> => {
  const files = {
    findById: vi.fn().mockResolvedValue(file),
    saveExtractionResult: vi.fn().mockResolvedValue(file),
  };
  const rabbit = {
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };
  const capability = {
    findCapableModels: vi.fn().mockResolvedValue(candidates),
    fetchConnectorConfig: vi.fn().mockResolvedValue({ apiKey: 'k', baseUrl: null }),
  };
  const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>((url) =>
    url.endsWith('/reserve') ? reserveReply() : Promise.resolve(jsonResponse(200, {})),
  );
  vi.stubGlobal('fetch', fetchMock);

  const moduleRef = await Test.createTestingModule({
    providers: [
      TranscriptionManager,
      TranscriptionMeterManager,
      { provide: FilesRepository, useValue: files },
      { provide: RabbitMQService, useValue: rabbit },
      { provide: TranscriptionCapabilityClient, useValue: capability },
      {
        provide: PaygMeter,
        useValue: new PaygMeter({
          authServiceUrl: 'http://auth-service:4001',
          interServiceToken: 'test-inter-service-token-000000000000',
          // Nothing exempt: the auth REPLY decides metering in these tests.
          exemptProviders: [],
        }),
      },
    ],
  }).compile();

  const wire = (): WireCall[] =>
    fetchMock.mock.calls.map(([url, init]) => ({
      path: url.slice(url.lastIndexOf('/') + 1),
      body: JSON.parse(String(init.body)) as Record<string, unknown>,
    }));

  return {
    manager: moduleRef.get(TranscriptionManager),
    files,
    rabbit,
    capability,
    fetchMock,
    wire,
  };
};

const failedPayload = (h: Harness): Record<string, unknown> => {
  const call = h.rabbit.publish.mock.calls.find(
    (entry) => entry[0] === EventPattern.FILE_TRANSCRIBE_FAILED,
  );
  expect(call).toBeDefined();
  return (call?.[1] ?? {}) as Record<string, unknown>;
};

const paths = (h: Harness): string[] => h.wire().map((c) => c.path);

describe('TranscriptionManager — PAYG metering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('OpenAI: reserves expected seconds on TRANSCRIPTION and finalizes on the measured duration', async () => {
    mockedOpenAi.mockResolvedValue({ text: 'hello there', durationSeconds: 1.4 });
    const h = await buildHarness(buildFile(), [OPENAI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    const [reserve, finalize, ...rest] = h.wire();
    expect(rest).toEqual([]);
    expect(reserve?.path).toBe('reserve');
    expect(reserve?.body).toMatchObject({
      userId: 'uploader-1',
      requestId: 'transcription:file-1:OPENAI',
      provider: 'OPENAI',
      model: 'whisper-1',
      surface: PaygSurface.TRANSCRIPTION,
      promptTokens: 0,
      requestedMaxOutputTokens: 1,
      audioSeconds: RESERVED_SECONDS,
    });
    expect(finalize?.path).toBe('finalize');
    // 1.4 s measured → 2 whole seconds; zero tokens, the unit carries the charge.
    expect(finalize?.body).toMatchObject({
      reservationId: 'res-1',
      audioSeconds: 2,
      usage: { promptTokens: 0, completionTokens: 0, cachedPromptTokens: 0, reasoningTokens: 0 },
    });
    expect(h.files.saveExtractionResult).toHaveBeenCalledWith(
      'file-1',
      expect.objectContaining({ extractedText: 'hello there', extractionError: null }),
    );
  });

  it('OpenAI: settles on the reserved seconds when verbose_json omits the duration', async () => {
    mockedOpenAi.mockResolvedValue({ text: 'hello there' });
    const h = await buildHarness(buildFile(), [OPENAI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(h.wire()[1]?.body).toMatchObject({ audioSeconds: RESERVED_SECONDS });
  });

  it('Gemini: sends the GRANTED ceiling and finalizes on usageMetadata tokens', async () => {
    mockedGemini.mockResolvedValue({
      text: 'gemini words',
      usage: {
        promptTokens: 110,
        completionTokens: 40,
        cachedPromptTokens: 0,
        reasoningTokens: 12,
      },
    });
    // Asked for 3*8+1024 = 1,048; auth granted 700.
    const h = await buildHarness(buildFile(), [GEMINI], () =>
      Promise.resolve(jsonResponse(200, heldReply(700))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(h.wire()[0]?.body).toMatchObject({
      requestId: 'transcription:file-1:GEMINI',
      surface: PaygSurface.TRANSCRIPTION,
      promptTokens: RESERVED_SECONDS * 32 + 128,
      requestedMaxOutputTokens: 1_048,
    });
    expect(h.wire()[0]?.body).not.toHaveProperty('audioSeconds');
    expect(mockedGemini).toHaveBeenCalledWith(
      expect.any(String),
      'k',
      expect.any(String),
      'audio/webm',
      'gemini-2.5-flash',
      700,
    );
    expect(h.wire()[1]).toEqual({
      path: 'finalize',
      body: expect.objectContaining({
        reservationId: 'res-1',
        usage: {
          promptTokens: 110,
          completionTokens: 40,
          cachedPromptTokens: 0,
          reasoningTokens: 12,
        },
      }),
    });
  });

  it('provider throw → exactly one release, no finalize, FAILED recorded', async () => {
    mockedGemini.mockRejectedValue(new Error('500 upstream'));
    const h = await buildHarness(buildFile(), [GEMINI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1_048))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(paths(h)).toEqual(['reserve', 'release']);
    expect(h.wire()[1]?.body).toEqual({ reservationId: 'res-1', reason: 'PROVIDER_ERROR' });
    expect(failedPayload(h).reasonCode).toBe('PROVIDER_ERROR');
    expect(h.files.saveExtractionResult).toHaveBeenCalledWith(
      'file-1',
      expect.objectContaining({ extractedText: AUDIO_PLACEHOLDER }),
    );
  });

  it('a provider timeout releases with reason TIMEOUT', async () => {
    mockedGemini.mockRejectedValue(Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }));
    const h = await buildHarness(buildFile(), [GEMINI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1_048))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(h.wire()[1]?.body).toEqual({ reservationId: 'res-1', reason: 'TIMEOUT' });
  });

  it('an empty transcript releases the hold instead of charging for silence', async () => {
    mockedGemini.mockResolvedValue({ text: '  ' });
    const h = await buildHarness(buildFile(), [GEMINI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1_048))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(paths(h)).toEqual(['reserve', 'release']);
    expect(failedPayload(h).reasonCode).toBe('EMPTY_TRANSCRIPT');
  });

  it('modality fall-through takes a SECOND hold under a distinct requestId, the first released', async () => {
    const rejection = Object.assign(new Error('Request failed with status code 400'), {
      response: {
        status: 400,
        data: { error: { message: 'Audio input modality is not enabled for models/x' } },
      },
    });
    mockedGemini.mockRejectedValue(rejection);
    mockedOpenAi.mockResolvedValue({ text: 'fallback words', durationSeconds: 2 });
    let n = 0;
    const h = await buildHarness(buildFile(), [GEMINI, OPENAI], () => {
      n += 1;
      return Promise.resolve(
        jsonResponse(200, { ...(heldReply(1_048) as object), reservationId: `res-${String(n)}` }),
      );
    });

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(paths(h)).toEqual(['reserve', 'release', 'reserve', 'finalize']);
    const [firstReserve, release, secondReserve, finalize] = h.wire();
    expect(firstReserve?.body.requestId).toBe('transcription:file-1:GEMINI');
    expect(secondReserve?.body.requestId).toBe('transcription:file-1:OPENAI');
    expect(release?.body.reservationId).toBe('res-1');
    expect(finalize?.body).toMatchObject({ reservationId: 'res-2', audioSeconds: 2 });
  });

  it('402 → no provider call, no fall-through, FAILED with INSUFFICIENT_CREDIT', async () => {
    const h = await buildHarness(buildFile(), [GEMINI, OPENAI], () =>
      Promise.resolve(
        jsonResponse(402, {
          errorCode: BillingErrorCode.PAYG_CREDIT_EXHAUSTED,
          availableMicroUsd: 0,
        }),
      ),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedOpenAi).not.toHaveBeenCalled();
    expect(paths(h)).toEqual(['reserve']);
    const failed = failedPayload(h);
    expect(failed.reasonCode).toBe('INSUFFICIENT_CREDIT');
    expect(failed.reason).toBe(TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE);
    expect(h.files.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: AUDIO_PLACEHOLDER,
      extractionError: TRANSCRIPTION_INSUFFICIENT_CREDIT_MESSAGE,
      status: FileIngestionStatus.COMPLETED,
    });
  });

  it('meter unreachable → fails closed with CREDIT_CHECK_UNAVAILABLE, no provider call', async () => {
    const h = await buildHarness(buildFile(), [GEMINI, OPENAI], () =>
      Promise.reject(new Error('ECONNREFUSED')),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedOpenAi).not.toHaveBeenCalled();
    const failed = failedPayload(h);
    expect(failed.reasonCode).toBe('CREDIT_CHECK_UNAVAILABLE');
    expect(failed.reason).toBe(TRANSCRIPTION_CREDIT_CHECK_UNAVAILABLE_MESSAGE);
  });

  it('an unpriced model is a check that could not run, not an empty wallet', async () => {
    const h = await buildHarness(buildFile(), [OPENAI], () =>
      Promise.resolve(jsonResponse(402, { errorCode: BillingErrorCode.PAYG_MODEL_UNPRICED })),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(mockedOpenAi).not.toHaveBeenCalled();
    expect(failedPayload(h).reasonCode).toBe('CREDIT_CHECK_UNAVAILABLE');
  });

  it('a clamped hold is released and refused — never a transcript cut off mid-clip', async () => {
    const h = await buildHarness(buildFile(), [GEMINI, OPENAI], () =>
      Promise.resolve(jsonResponse(200, heldReply(200, true))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(mockedGemini).not.toHaveBeenCalled();
    expect(mockedOpenAi).not.toHaveBeenCalled();
    expect(paths(h)).toEqual(['reserve', 'release']);
    expect(h.wire()[1]?.body).toEqual({ reservationId: 'res-1', reason: 'CANCELLED' });
    expect(failedPayload(h).reasonCode).toBe('INSUFFICIENT_CREDIT');
  });

  it('unmetered (exempt / admin / kill switch) → provider called, nothing to settle', async () => {
    mockedGemini.mockResolvedValue({ text: 'free words' });
    const h = await buildHarness(buildFile(), [GEMINI], () =>
      Promise.resolve(jsonResponse(200, { metered: false, reason: 'ADMIN_BYPASS' })),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(mockedGemini).toHaveBeenCalledTimes(1);
    expect(paths(h)).toEqual(['reserve']);
    expect(h.files.saveExtractionResult).toHaveBeenCalledWith(
      'file-1',
      expect.objectContaining({ extractedText: 'free words' }),
    );
  });

  it('a redelivered job whose file already has a transcript takes no hold', async () => {
    const h = await buildHarness(
      buildFile({ extractedText: 'An earlier transcript.' }),
      [GEMINI],
      () => Promise.resolve(jsonResponse(200, heldReply(1_048))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    expect(h.fetchMock).not.toHaveBeenCalled();
    expect(mockedGemini).not.toHaveBeenCalled();
  });

  it('never logs a balance (rule 37 item 4)', async () => {
    const lines: string[] = [];
    const capture = (message: unknown): void => {
      lines.push(String(message));
    };
    vi.spyOn(Logger.prototype, 'log').mockImplementation(capture);
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(capture);
    mockedOpenAi.mockResolvedValue({ text: 'hello', durationSeconds: 1 });
    const h = await buildHarness(buildFile(), [OPENAI], () =>
      Promise.resolve(jsonResponse(200, heldReply(1))),
    );

    await h.manager.handleJob({ fileId: 'file-1', userId: 'uploader-1' });

    const meterLines = lines.filter((line) => line.includes('surface=TRANSCRIPTION'));
    expect(meterLines.length).toBeGreaterThan(0);
    for (const line of meterLines) {
      expect(line).not.toMatch(/9700|9_700|available|heldMicro/i);
      expect(line).toContain('reservationId=res-1');
    }
  });
});
