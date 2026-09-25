// B6b — transcription job unit tests.
//
// Every collaborator is mocked so the manager runs with no broker, database,
// filesystem or provider. The four behaviours under test are the ones that
// decide whether a user is told the truth about their audio file:
//   - a queued job transcribes, writes extractedText and publishes COMPLETED
//   - no capable connector → FAILED + extractionError, placeholder preserved
//   - a provider error → FAILED, the row never claims success
//   - an already-transcribed file is skipped

import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';
import { EventPattern } from '@claw/shared-types';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { TranscriptionManager } from '../transcription.manager';
import { type FilesRepository } from '../../repositories/files.repository';
import { type TranscriptionCapabilityClient } from '../../clients/transcription-capability.client';
import { TranscriptionMeterManager } from '../transcription-meter.manager';
import { PaygMeter } from '@claw/shared-entitlements';
import { type File, FileIngestionStatus } from '../../../../generated/prisma';
import { transcribeWithGemini } from '../../adapters/gemini-transcription.adapter';
import { transcribeWithOpenAi } from '../../adapters/openai-transcription.adapter';
import { TranscriptionResponseIssue } from '../../../../common/enums';
import { TranscriptionResponseError } from '../../../../common/errors';
import {
  MAX_TRANSCRIBABLE_AUDIO_BYTES,
  TRANSCRIPTION_CONTENT_BLOCKED_MESSAGE,
  TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR,
  TRANSCRIPTION_INCOMPLETE_MESSAGE,
  TRANSCRIPTION_MAX_PROVIDER_CALLS,
  TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
  TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE,
  TRANSCRIPTION_PROVIDER_BUSY_MESSAGE,
  TRANSCRIPTION_PROVIDER_FAILED_MESSAGE,
  TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE,
  TRANSCRIPTION_RATE_LIMIT_BACKOFF_MS,
  TRANSCRIPTION_TOO_LARGE_MESSAGE,
} from '../../constants/transcription.constants';
import { waitForTranscriptionBackoff } from '../../utilities/transcription-backoff.utility';

vi.mock('../../adapters/gemini-transcription.adapter', () => ({
  transcribeWithGemini: vi.fn(),
}));
vi.mock('../../adapters/openai-transcription.adapter', () => ({
  transcribeWithOpenAi: vi.fn(),
}));
vi.mock('../../utilities/transcription-backoff.utility', () => ({
  waitForTranscriptionBackoff: vi.fn(() => Promise.resolve()),
}));
vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => Buffer.from('on-disk-audio')),
}));

const mockedGemini = transcribeWithGemini as Mock;
const mockedOpenAi = transcribeWithOpenAi as Mock;
const mockedBackoff = waitForTranscriptionBackoff as Mock;

/** An axios error carrying a provider body, the shape `httpPost` re-throws. */
const providerError = (status: number, data: unknown): Error => {
  const error = new Error(`Request failed with status code ${String(status)}`) as Error & {
    response: { status: number; data: unknown };
  };
  error.response = { status, data };
  return error;
};

const AUDIO_PLACEHOLDER = '[Audio file: meeting.mp3]';

const buildFile = (overrides: Partial<File> = {}): File =>
  ({
    id: 'file-1',
    userId: 'user-1',
    filename: 'meeting.mp3',
    mimeType: 'audio/mpeg',
    sizeBytes: 2048,
    storagePath: '/data/uploads/meeting.mp3',
    content: Buffer.from('fake-audio-bytes').toString('base64'),
    extractedText: AUDIO_PLACEHOLDER,
    extractionError: null,
    ingestionStatus: FileIngestionStatus.COMPLETED,
    retentionExpiresAt: null,
    parentFileId: null,
    isExtracted: false,
    extractionMetadata: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }) as File;

interface Harness {
  manager: TranscriptionManager;
  filesRepository: { findById: Mock; saveExtractionResult: Mock };
  rabbit: { publish: Mock; publishConfirmed: Mock; subscribe: Mock };
  capability: { findCapableModels: Mock; fetchConnectorConfig: Mock };
  payg: PaygMeter;
}

const buildHarness = (file: File | null): Harness => {
  const filesRepository = {
    findById: vi.fn().mockResolvedValue(file),
    saveExtractionResult: vi.fn().mockResolvedValue(file),
  };
  const rabbit = {
    publish: vi.fn().mockResolvedValue(undefined),
    publishConfirmed: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  };
  const capability = {
    findCapableModels: vi
      .fn()
      .mockResolvedValue([{ provider: 'GEMINI', model: 'gemini-2.5-flash' }]),
    fetchConnectorConfig: vi.fn().mockResolvedValue({
      provider: 'GEMINI',
      apiKey: 'test-key',
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    }),
  };
  // A REAL PaygMeter whose network methods are stubbed: every provider is
  // treated as unmetered here (the metering behaviour has its own spec), so
  // these tests keep proving the transcription flow itself.
  const payg = new PaygMeter({
    authServiceUrl: 'http://auth-service:4001',
    interServiceToken: 'test-inter-service-token-000000000000',
  });
  vi.spyOn(payg, 'reserve').mockImplementation((input) =>
    Promise.resolve({
      metered: false,
      maxOutputTokens: input.requestedMaxOutputTokens,
      clamped: false,
      reservationId: null,
      heldMicroUsd: 0,
      availableAfterMicroUsd: 0,
      reason: 'NOT_PAYG',
    }),
  );
  const manager = new TranscriptionManager(
    filesRepository as unknown as FilesRepository,
    rabbit as unknown as RabbitMQService,
    capability as unknown as TranscriptionCapabilityClient,
    new TranscriptionMeterManager(payg),
  );
  return { manager, filesRepository, rabbit, capability, payg };
};

const publishedPatterns = (rabbit: Harness['rabbit']): string[] =>
  rabbit.publish.mock.calls.map((call) => String(call[0]));

const publishedPayload = (rabbit: Harness['rabbit'], pattern: string): Record<string, unknown> => {
  const call = rabbit.publish.mock.calls.find((entry) => entry[0] === pattern);
  expect(call).toBeDefined();
  return call?.[1] as Record<string, unknown>;
};

describe('TranscriptionManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to file.transcribe_requested at module init', async () => {
    const harness = buildHarness(buildFile());
    await harness.manager.onModuleInit();

    expect(harness.rabbit.subscribe).toHaveBeenCalledWith(
      EventPattern.FILE_TRANSCRIBE_REQUESTED,
      expect.any(Function),
    );
  });

  it('transcribes a queued job, writes extractedText and publishes COMPLETED', async () => {
    mockedGemini.mockResolvedValue({ text: 'Hello, this is the recording.' });
    const harness = buildHarness(buildFile());

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedGemini).toHaveBeenCalledWith(
      'https://generativelanguage.googleapis.com/v1beta/openai',
      'test-key',
      Buffer.from('fake-audio-bytes').toString('base64'),
      'audio/mpeg',
      'gemini-2.5-flash',
      expect.any(Number),
    );
    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: 'Hello, this is the recording.',
      extractionError: null,
      status: FileIngestionStatus.COMPLETED,
    });

    const payload = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED);
    expect(payload.provider).toBe('GEMINI');
    expect(payload.model).toBe('gemini-2.5-flash');
    expect(payload.characters).toBe('Hello, this is the recording.'.length);
    expect(typeof payload.durationMs).toBe('number');
    expect(publishedPatterns(harness.rabbit)).not.toContain(EventPattern.FILE_TRANSCRIBE_FAILED);
  });

  it('routes OPENAI through the whisper deployment, not the snapshot chat model', async () => {
    mockedOpenAi.mockResolvedValue({ text: 'openai transcript' });
    const harness = buildHarness(buildFile());
    harness.capability.findCapableModels.mockResolvedValue([
      { provider: 'OPENAI', model: 'gpt-4o-audio' },
    ]);
    harness.capability.fetchConnectorConfig.mockResolvedValue({
      provider: 'OPENAI',
      apiKey: 'openai-key',
      baseUrl: 'https://api.openai.com/v1',
    });

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedOpenAi).toHaveBeenCalledWith(
      'https://api.openai.com/v1',
      'openai-key',
      expect.any(String),
      'audio/mpeg',
      'whisper-1',
    );
    expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED).model).toBe(
      'whisper-1',
    );
  });

  it('refuses clearly when no capable connector is configured', async () => {
    const harness = buildHarness(buildFile());
    harness.capability.findCapableModels.mockResolvedValue([]);

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    // The placeholder survives: the row must not be given a lie in place of a
    // transcript, and must not be downgraded out of COMPLETED either.
    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: AUDIO_PLACEHOLDER,
      extractionError: TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
      status: FileIngestionStatus.COMPLETED,
    });

    const payload = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
    expect(payload.reasonCode).toBe('NO_CAPABLE_CONNECTOR');
    expect(payload.reason).toBe(TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE);
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(publishedPatterns(harness.rabbit)).not.toContain(EventPattern.FILE_TRANSCRIBE_COMPLETED);
  });

  it('refuses an oversized recording before spending anything on it', async () => {
    // The cost is the provider call, not the storage. The upload cap is 50MB of
    // bytes, and compressed speech is small enough that 50MB is hours of audio
    // — hours that would be transcribed and billed because one file was dropped
    // in. Nothing else in the pipeline objects, so this guard has to.
    const harness = buildHarness(buildFile({ sizeBytes: MAX_TRANSCRIBABLE_AUDIO_BYTES + 1 }));

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedGemini).not.toHaveBeenCalled();
    expect(harness.capability.fetchConnectorConfig).not.toHaveBeenCalled();

    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: AUDIO_PLACEHOLDER,
      extractionError: TRANSCRIPTION_TOO_LARGE_MESSAGE,
      status: FileIngestionStatus.COMPLETED,
    });

    const payload = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
    expect(payload.reasonCode).toBe('AUDIO_TOO_LARGE');
  });

  it('transcribes a recording that sits exactly on the ceiling', async () => {
    const harness = buildHarness(buildFile({ sizeBytes: MAX_TRANSCRIBABLE_AUDIO_BYTES }));

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedGemini).toHaveBeenCalled();
  });

  it('records a provider error without letting the row claim success', async () => {
    mockedGemini.mockRejectedValue(providerError(500, { error: { message: 'internal' } }));
    const harness = buildHarness(buildFile());

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    // The user reads this sentence through the model; the raw axios text
    // ("Request failed with status code 500") stays in the log.
    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: AUDIO_PLACEHOLDER,
      extractionError: TRANSCRIPTION_PROVIDER_FAILED_MESSAGE,
      status: FileIngestionStatus.COMPLETED,
    });
    const payload = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
    expect(payload.reasonCode).toBe('PROVIDER_ERROR');
    expect(payload.provider).toBe('GEMINI');
    expect(publishedPatterns(harness.rabbit)).not.toContain(EventPattern.FILE_TRANSCRIBE_COMPLETED);
  });

  it('treats an empty provider response as a failure, not a transcript', async () => {
    mockedGemini.mockResolvedValue({ text: '   ' });
    const harness = buildHarness(buildFile());

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED).reasonCode).toBe(
      'EMPTY_TRANSCRIPT',
    );
    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith(
      'file-1',
      expect.objectContaining({ extractedText: AUDIO_PLACEHOLDER }),
    );
  });

  it('skips a file that already carries a real transcript', async () => {
    const harness = buildHarness(
      buildFile({ extractedText: 'A transcript written on an earlier run.' }),
    );

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(harness.capability.findCapableModels).not.toHaveBeenCalled();
    expect(mockedGemini).not.toHaveBeenCalled();
    expect(harness.filesRepository.saveExtractionResult).not.toHaveBeenCalled();
    expect(harness.rabbit.publish).not.toHaveBeenCalled();
  });

  it('does not treat the audio placeholder as an existing transcript', async () => {
    mockedGemini.mockResolvedValue({ text: 'real words' });
    const harness = buildHarness(buildFile({ extractedText: AUDIO_PLACEHOLDER }));

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedGemini).toHaveBeenCalled();
  });

  it('publishes FAILED when the row has been deleted before the job ran', async () => {
    const harness = buildHarness(null);

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED).reasonCode).toBe(
      'FILE_NOT_FOUND',
    );
    expect(harness.filesRepository.saveExtractionResult).not.toHaveBeenCalled();
  });

  it('drops a malformed payload instead of throwing it back at the broker', async () => {
    const harness = buildHarness(buildFile());

    await expect(harness.manager.handleJob({ nope: true })).resolves.toBeUndefined();
    expect(harness.filesRepository.findById).not.toHaveBeenCalled();
  });

  it('falls back to the stored file when the row has no base64 content', async () => {
    mockedGemini.mockResolvedValue({ text: 'from disk' });
    const harness = buildHarness(buildFile({ content: null }));

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(mockedGemini).toHaveBeenCalledWith(
      expect.any(String),
      'test-key',
      Buffer.from('on-disk-audio').toString('base64'),
      'audio/mpeg',
      'gemini-2.5-flash',
      expect.any(Number),
    );
  });

  describe('provider fallback on an audio-modality rejection', () => {
    // Reproduces the live bug: the connector catalog marked
    // models/antigravity-preview-05-2026 supportsAudio: true, so it was
    // picked first, and Gemini answered with its real refusal.
    const geminiModalityRejection = () => {
      const error = new Error('Request failed with status code 400') as Error & {
        response: { status: number; data: unknown };
      };
      error.response = {
        status: 400,
        data: {
          error: {
            code: 400,
            message: 'Audio input modality is not enabled for models/antigravity-preview-05-2026',
            status: 'INVALID_ARGUMENT',
          },
        },
      };
      return error;
    };

    it('falls through to the next provider when the first rejects the audio modality', async () => {
      mockedGemini.mockRejectedValue(geminiModalityRejection());
      mockedOpenAi.mockResolvedValue({ text: 'transcribed by the fallback provider' });
      const harness = buildHarness(buildFile());
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/antigravity-preview-05-2026' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      expect(mockedGemini).toHaveBeenCalledWith(
        expect.any(String),
        'test-key',
        expect.any(String),
        'audio/mpeg',
        'models/antigravity-preview-05-2026',
        expect.any(Number),
      );
      expect(mockedOpenAi).toHaveBeenCalledWith(
        expect.any(String),
        'test-key',
        expect.any(String),
        'audio/mpeg',
        'whisper-1',
      );
      const completed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED);
      expect(completed.provider).toBe('OPENAI');
      expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
        extractedText: 'transcribed by the fallback provider',
        extractionError: null,
        status: FileIngestionStatus.COMPLETED,
      });
      expect(publishedPatterns(harness.rabbit)).not.toContain(EventPattern.FILE_TRANSCRIBE_FAILED);
    });

    it('records a real failure when every candidate rejects the audio modality', async () => {
      mockedGemini.mockRejectedValue(geminiModalityRejection());
      const harness = buildHarness(buildFile());
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/antigravity-preview-05-2026' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
      expect(failed.reasonCode).toBe('PROVIDER_ERROR');
      expect(failed.provider).toBe('GEMINI');
      expect(failed.reason).toBe(TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE);
      expect(publishedPatterns(harness.rabbit)).not.toContain(
        EventPattern.FILE_TRANSCRIBE_COMPLETED,
      );
    });

    it('does NOT fall through on a terminal provider error (5xx, network)', async () => {
      mockedGemini.mockRejectedValue(new Error('ECONNRESET'));
      mockedOpenAi.mockResolvedValue({ text: 'should never be called' });
      const harness = buildHarness(buildFile());
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'gemini-2.5-flash' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      expect(mockedOpenAi).not.toHaveBeenCalled();
      const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
      expect(failed.reasonCode).toBe('PROVIDER_ERROR');
      expect(failed.provider).toBe('GEMINI');
    });
  });

  // Prod 2026-09-25: the one GEMINI candidate was a preview model Gemini
  // refuses (400), the one OPENAI candidate hit a 429, and the user was told
  // "Request failed with status code 429". Every case below is bounded: at
  // most TRANSCRIPTION_MAX_PROVIDER_CALLS provider calls and one backoff.
  describe('bounded candidate walk', () => {
    const modalityRejection = (model: string): Error =>
      providerError(400, {
        error: {
          code: 400,
          message: `Audio input modality is not enabled for ${model}`,
          status: 'INVALID_ARGUMENT',
        },
      });
    const openAiQuotaExhausted = (): Error =>
      providerError(429, {
        error: {
          message: 'You exceeded your current quota, please check your plan and billing details.',
          type: 'insufficient_quota',
          code: 'insufficient_quota',
        },
      });
    const transientRateLimit = (): Error =>
      providerError(429, {
        error: {
          code: 429,
          message: 'Resource has been exhausted (e.g. check quota).',
          status: 'RESOURCE_EXHAUSTED',
        },
      });

    const reserveIds = (harness: Harness): string[] =>
      vi.mocked(harness.payg.reserve).mock.calls.map((call) => call[0].requestId);
    const releaseCount = (harness: Harness): number =>
      vi.mocked(harness.payg.release).mock.calls.length;
    const spyRelease = (harness: Harness): void => {
      vi.spyOn(harness.payg, 'release').mockResolvedValue(undefined);
    };

    it('tries a second model of the SAME provider after a modality rejection', async () => {
      mockedGemini
        .mockRejectedValueOnce(modalityRejection('models/gemini-3.1-flash-lite'))
        .mockResolvedValueOnce({ text: 'second gemini model heard it' });
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/gemini-3.1-flash-lite' },
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      expect(mockedGemini).toHaveBeenCalledTimes(2);
      expect(mockedGemini.mock.calls[1]?.[4]).toBe('models/gemini-2.5-flash');
      expect(mockedOpenAi).not.toHaveBeenCalled();
      expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED).model).toBe(
        'models/gemini-2.5-flash',
      );
      // One hold per real provider call, each under its own id; the refused
      // one went back.
      expect(reserveIds(harness)).toEqual([
        'transcription:file-1:GEMINI',
        'transcription:file-1:GEMINI:2',
      ]);
      expect(releaseCount(harness)).toBe(1);
    });

    it('replays prod: preview refused, OpenAI out of quota — one OpenAI call, a readable reason', async () => {
      mockedGemini.mockRejectedValue(modalityRejection('models/antigravity-preview-05-2026'));
      mockedOpenAi.mockRejectedValue(openAiQuotaExhausted());
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/antigravity-preview-05-2026' },
        { provider: 'OPENAI', model: 'chatgpt-image-latest' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      // insufficient_quota is not transient: no backoff, no second OpenAI call.
      expect(mockedOpenAi).toHaveBeenCalledTimes(1);
      expect(mockedBackoff).not.toHaveBeenCalled();
      const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
      expect(failed.reason).toBe(TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE);
      expect(String(failed.reason)).not.toContain('status code');
      expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
        extractedText: AUDIO_PLACEHOLDER,
        extractionError: TRANSCRIPTION_PROVIDER_UNAVAILABLE_MESSAGE,
        status: FileIngestionStatus.COMPLETED,
      });
      expect(reserveIds(harness)).toEqual([
        'transcription:file-1:GEMINI',
        'transcription:file-1:OPENAI',
      ]);
      expect(releaseCount(harness)).toBe(2);
    });

    it('retries a transient 429 once, after one short backoff, on the same model', async () => {
      mockedGemini
        .mockRejectedValueOnce(transientRateLimit())
        .mockResolvedValueOnce({ text: 'heard on the retry' });
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      expect(mockedBackoff).toHaveBeenCalledTimes(1);
      expect(mockedBackoff).toHaveBeenCalledWith(TRANSCRIPTION_RATE_LIMIT_BACKOFF_MS);
      expect(mockedGemini).toHaveBeenCalledTimes(2);
      expect(mockedGemini.mock.calls[1]?.[4]).toBe('models/gemini-2.5-flash-lite');
      expect(mockedOpenAi).not.toHaveBeenCalled();
      expect(publishedPatterns(harness.rabbit)).toContain(EventPattern.FILE_TRANSCRIBE_COMPLETED);
      expect(reserveIds(harness)).toEqual([
        'transcription:file-1:GEMINI',
        'transcription:file-1:GEMINI:2',
      ]);
    });

    it('moves to the next PROVIDER when the retry is rate-limited too, skipping the rest of that key', async () => {
      mockedGemini.mockRejectedValue(transientRateLimit());
      mockedOpenAi.mockResolvedValue({ text: 'the other provider heard it' });
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' },
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      // Same key, same limit: the second GEMINI model is not tried.
      expect(mockedGemini.mock.calls.map((call) => call[4])).toEqual([
        'models/gemini-2.5-flash-lite',
        'models/gemini-2.5-flash-lite',
      ]);
      expect(mockedOpenAi).toHaveBeenCalledTimes(1);
      expect(
        publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED).provider,
      ).toBe('OPENAI');
    });

    it('says "busy" — never the status code — when every provider is rate-limited', async () => {
      mockedGemini.mockRejectedValue(transientRateLimit());
      mockedOpenAi.mockRejectedValue(
        providerError(429, {
          error: { message: 'Rate limit reached for whisper-1', code: 'rate_limit_exceeded' },
        }),
      );
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue([
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ]);

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      // One backoff per job, not per provider.
      expect(mockedBackoff).toHaveBeenCalledTimes(1);
      expect(mockedGemini).toHaveBeenCalledTimes(2);
      expect(mockedOpenAi).toHaveBeenCalledTimes(1);
      const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
      expect(failed.reason).toBe(TRANSCRIPTION_PROVIDER_BUSY_MESSAGE);
      expect(failed.reasonCode).toBe('PROVIDER_ERROR');
      expect(releaseCount(harness)).toBe(3);
    });

    it('never makes more than TRANSCRIPTION_MAX_PROVIDER_CALLS calls, however many candidates', async () => {
      mockedGemini.mockImplementation(
        (_base: string, _key: string, _audio: string, _mime: string, model: string) =>
          Promise.reject(modalityRejection(model)),
      );
      const harness = buildHarness(buildFile());
      spyRelease(harness);
      harness.capability.findCapableModels.mockResolvedValue(
        ['a', 'b', 'c', 'd', 'e', 'f'].map((suffix) => ({
          provider: 'GEMINI',
          model: `models/gemini-2.5-flash-${suffix}`,
        })),
      );

      await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

      expect(mockedGemini).toHaveBeenCalledTimes(TRANSCRIPTION_MAX_PROVIDER_CALLS);
      expect(reserveIds(harness)).toHaveLength(TRANSCRIPTION_MAX_PROVIDER_CALLS);
      expect(releaseCount(harness)).toBe(TRANSCRIPTION_MAX_PROVIDER_CALLS);
      expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED).reason).toBe(
        TRANSCRIPTION_NO_USABLE_MODEL_MESSAGE,
      );
    });

    it("hands a video's derived track the same readable reason, not the raw 429", async () => {
      mockedGemini.mockRejectedValue(transientRateLimit());
      const harness = buildHarness(buildFile());
      spyRelease(harness);

      const outcome = await harness.manager.transcribeDerivedAudio({
        fileId: 'video-1',
        userId: 'user-1',
        audioBase64: 'YXVkaW8=',
        mimeType: 'audio/wav',
        sizeBytes: 1024,
        audioSeconds: 10,
        requestScope: 'video-audio',
        instruction: 'timestamped',
      });

      expect(outcome).toEqual({ status: 'FAILED', reason: TRANSCRIPTION_PROVIDER_BUSY_MESSAGE });
    });

    // Live 2026-09-25: Gemini 2.5 Flash answered 200 with 0 characters and the
    // video's audioStatus went TRANSCRIPTION_FAILED on the first try.
    describe('a 200 that is not a transcript', () => {
      const EMPTY_REASON = `Audio transcription failed: ${TRANSCRIPTION_EMPTY_TRANSCRIPT_ERROR}`;
      const responseError = (issue: TranscriptionResponseIssue): Error =>
        new TranscriptionResponseError(issue, `test ${issue}`);
      const twoGeminiThenOpenAi = [
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' },
        { provider: 'GEMINI', model: 'models/gemini-2.5-flash' },
        { provider: 'OPENAI', model: 'gpt-4o-audio' },
      ];

      it('retries an empty answer ONCE on the same model under a new request id, then walks on', async () => {
        mockedGemini
          .mockResolvedValueOnce({ text: '' })
          .mockResolvedValueOnce({ text: '   ' })
          .mockResolvedValueOnce({ text: 'the next model heard it' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi);

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini.mock.calls.map((call) => call[4])).toEqual([
          'models/gemini-2.5-flash-lite',
          'models/gemini-2.5-flash-lite',
          'models/gemini-2.5-flash',
        ]);
        expect(reserveIds(harness)).toEqual([
          'transcription:file-1:GEMINI',
          'transcription:file-1:GEMINI:2',
          'transcription:file-1:GEMINI:3',
        ]);
        // Both empty holds went back; the third was settled.
        expect(releaseCount(harness)).toBe(2);
        expect(mockedBackoff).not.toHaveBeenCalled();
        expect(mockedOpenAi).not.toHaveBeenCalled();
        expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_COMPLETED).model).toBe(
          'models/gemini-2.5-flash',
        );
      });

      it('takes the empty retry once per JOB, not once per model', async () => {
        mockedGemini.mockResolvedValue({ text: '' });
        mockedOpenAi.mockResolvedValue({ text: '' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi);

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        // lite, lite (the retry), flash, whisper: four calls, four released holds.
        expect(mockedGemini).toHaveBeenCalledTimes(3);
        expect(mockedOpenAi).toHaveBeenCalledTimes(1);
        expect(releaseCount(harness)).toBe(TRANSCRIPTION_MAX_PROVIDER_CALLS);
        const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
        expect(failed.reason).toBe(EMPTY_REASON);
        expect(failed.reasonCode).toBe('EMPTY_TRANSCRIPT');
      });

      it('stays within TRANSCRIPTION_MAX_PROVIDER_CALLS when every model answers empty', async () => {
        mockedGemini.mockResolvedValue({ text: '' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(
          ['a', 'b', 'c', 'd', 'e', 'f'].map((suffix) => ({
            provider: 'GEMINI',
            model: `models/gemini-2.5-flash-${suffix}`,
          })),
        );

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini).toHaveBeenCalledTimes(TRANSCRIPTION_MAX_PROVIDER_CALLS);
        expect(reserveIds(harness)).toHaveLength(TRANSCRIPTION_MAX_PROVIDER_CALLS);
        expect(new Set(reserveIds(harness)).size).toBe(TRANSCRIPTION_MAX_PROVIDER_CALLS);
        expect(releaseCount(harness)).toBe(TRANSCRIPTION_MAX_PROVIDER_CALLS);
        expect(publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED).reason).toBe(
          EMPTY_REASON,
        );
      });

      it('treats a reasoning-only answer like an empty one: same-model retry', async () => {
        mockedGemini
          .mockRejectedValueOnce(responseError(TranscriptionResponseIssue.THOUGHT_ONLY))
          .mockResolvedValueOnce({ text: 'heard on the retry' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi);

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini.mock.calls.map((call) => call[4])).toEqual([
          'models/gemini-2.5-flash-lite',
          'models/gemini-2.5-flash-lite',
        ]);
        expect(reserveIds(harness)).toEqual([
          'transcription:file-1:GEMINI',
          'transcription:file-1:GEMINI:2',
        ]);
        expect(releaseCount(harness)).toBe(1);
        expect(publishedPatterns(harness.rabbit)).toContain(EventPattern.FILE_TRANSCRIBE_COMPLETED);
      });

      it('moves a MAX_TOKENS cut-off to the NEXT model without a same-model retry', async () => {
        mockedGemini
          .mockRejectedValueOnce(responseError(TranscriptionResponseIssue.TRUNCATED))
          .mockResolvedValueOnce({ text: 'the bigger sibling finished it' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi);

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini.mock.calls.map((call) => call[4])).toEqual([
          'models/gemini-2.5-flash-lite',
          'models/gemini-2.5-flash',
        ]);
        expect(releaseCount(harness)).toBe(1);
        expect(publishedPatterns(harness.rabbit)).toContain(EventPattern.FILE_TRANSCRIBE_COMPLETED);
      });

      it('says "incomplete" — not "empty" — when every answer was cut off', async () => {
        mockedGemini.mockRejectedValue(responseError(TranscriptionResponseIssue.TRUNCATED));
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi.slice(0, 2));

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini).toHaveBeenCalledTimes(2);
        const failed = publishedPayload(harness.rabbit, EventPattern.FILE_TRANSCRIBE_FAILED);
        expect(failed.reason).toBe(TRANSCRIPTION_INCOMPLETE_MESSAGE);
        expect(failed.reasonCode).toBe('PROVIDER_ERROR');
      });

      it('stops on a SAFETY block with the precise reason, no second model or provider', async () => {
        mockedGemini.mockRejectedValue(responseError(TranscriptionResponseIssue.BLOCKED));
        mockedOpenAi.mockResolvedValue({ text: 'must never be called' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);
        harness.capability.findCapableModels.mockResolvedValue(twoGeminiThenOpenAi);

        await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

        expect(mockedGemini).toHaveBeenCalledTimes(1);
        expect(mockedOpenAi).not.toHaveBeenCalled();
        expect(releaseCount(harness)).toBe(1);
        expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
          extractedText: AUDIO_PLACEHOLDER,
          extractionError: TRANSCRIPTION_CONTENT_BLOCKED_MESSAGE,
          status: FileIngestionStatus.COMPLETED,
        });
      });

      it("hands a video's derived track the honest empty reason after the retry", async () => {
        mockedGemini.mockResolvedValue({ text: '' });
        const harness = buildHarness(buildFile());
        spyRelease(harness);

        const outcome = await harness.manager.transcribeDerivedAudio({
          fileId: 'video-1',
          userId: 'user-1',
          audioBase64: 'YXVkaW8=',
          mimeType: 'audio/wav',
          sizeBytes: 1024,
          audioSeconds: 10,
          requestScope: 'video-audio',
          instruction: 'timestamped',
        });

        expect(mockedGemini).toHaveBeenCalledTimes(2);
        expect(reserveIds(harness)).toEqual([
          'transcription:video-1:video-audio:GEMINI',
          'transcription:video-1:video-audio:GEMINI:2',
        ]);
        expect(outcome).toEqual({ status: 'FAILED', reason: EMPTY_REASON });
      });
    });
  });
});
