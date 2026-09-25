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
import {
  MAX_TRANSCRIBABLE_AUDIO_BYTES,
  TRANSCRIPTION_NO_CAPABLE_CONNECTOR_MESSAGE,
  TRANSCRIPTION_TOO_LARGE_MESSAGE,
} from '../../constants/transcription.constants';

vi.mock('../../adapters/gemini-transcription.adapter', () => ({
  transcribeWithGemini: vi.fn(),
}));
vi.mock('../../adapters/openai-transcription.adapter', () => ({
  transcribeWithOpenAi: vi.fn(),
}));
vi.mock('../../../../common/utilities', () => ({
  readFile: vi.fn(() => Buffer.from('on-disk-audio')),
}));

const mockedGemini = transcribeWithGemini as Mock;
const mockedOpenAi = transcribeWithOpenAi as Mock;

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
    mockedGemini.mockRejectedValue(new Error('429 rate limited'));
    const harness = buildHarness(buildFile());

    await harness.manager.handleJob({ fileId: 'file-1', userId: 'user-1' });

    expect(harness.filesRepository.saveExtractionResult).toHaveBeenCalledWith('file-1', {
      extractedText: AUDIO_PLACEHOLDER,
      extractionError: 'Audio transcription failed: 429 rate limited',
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
      expect(publishedPatterns(harness.rabbit)).not.toContain(
        EventPattern.FILE_TRANSCRIBE_COMPLETED,
      );
    });

    it('does NOT fall through on an ordinary provider error — only on a modality rejection', async () => {
      mockedGemini.mockRejectedValue(new Error('429 rate limited'));
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
});
