import { vi } from 'vitest';

import { AppConfig } from '../../../../app/config/app.config';
import { SpeechProvider } from '../../../../common/enums';
import { SpeechProviderError } from '../../../../common/errors';
import { httpPostBinary, httpRequest } from '../../../../common/utilities';
import { SpeechConnectorClient } from '../speech-connector.client';
import { SpeechFileStoreClient } from '../speech-file-store.client';
import { SpeechProviderClient } from '../speech-provider.client';
import { TtsVoiceCandidatesClient } from '../tts-voice-candidates.client';

// Multimodal batch 9 — the four "Read aloud" clients against mocked HTTP.

vi.mock('../../../../common/utilities', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../common/utilities')>()),
  httpRequest: vi.fn(),
  httpPostBinary: vi.fn(),
}));
const request = vi.mocked(httpRequest);
const postBinary = vi.mocked(httpPostBinary);

const GEMINI = {
  provider: SpeechProvider.GEMINI,
  model: 'gemini-2.5-flash-preview-tts',
  timeoutMs: 60_000,
  maxTokens: 16_384,
};
const OPENAI = { provider: SpeechProvider.OPENAI, model: 'tts-1', timeoutMs: 60_000, maxTokens: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(AppConfig, 'get').mockReturnValue({
    ROUTING_SERVICE_URL: 'http://routing.test',
    CONNECTOR_SERVICE_URL: 'http://connector.test',
    FILE_SERVICE_URL: 'http://file.test',
    INTER_SERVICE_AUTH_TOKEN: 't'.repeat(40),
  } as never);
});

describe('SpeechProviderClient', () => {
  it('Gemini: sends AUDIO modality with the granted ceiling, wraps PCM in WAV, reads usage', async () => {
    const pcm = Buffer.from([1, 2, 3, 4]);
    request.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/L16;codec=pcm;rate=24000',
                    data: pcm.toString('base64'),
                  },
                },
              ],
            },
          },
        ],
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 300 },
      },
    } as never);

    const audio = await new SpeechProviderClient().synthesize({
      candidate: GEMINI,
      text: 'Hello.',
      apiKey: 'g-key',
      maxOutputTokens: 777,
    });

    expect(audio.mimeType).toBe('audio/wav');
    expect(audio.bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(audio.bytes.readUInt32LE(24)).toBe(24_000);
    expect(audio.bytes.subarray(44)).toEqual(pcm);
    expect(audio.usage).toEqual({ promptTokens: 12, completionTokens: 300 });
    const call = request.mock.calls[0]?.[0];
    expect(call?.url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    );
    expect(call?.headers).toEqual({ 'x-goog-api-key': 'g-key' });
    expect(call?.body).toMatchObject({
      contents: [{ parts: [{ text: 'Hello.' }] }],
      generationConfig: { responseModalities: ['AUDIO'], maxOutputTokens: 777 },
    });
  });

  it('Gemini: a non-2xx answer is a SpeechProviderError carrying the status', async () => {
    request.mockResolvedValue({
      ok: false,
      status: 400,
      data: { error: { message: 'x' } },
    } as never);
    const error: unknown = await new SpeechProviderClient()
      .synthesize({ candidate: GEMINI, text: 'Hi.', apiKey: 'k', maxOutputTokens: 10 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SpeechProviderError);
    expect((error as SpeechProviderError).status).toBe(400);
    expect((error as SpeechProviderError).timedOut).toBe(false);
  });

  it('OpenAI: posts to /audio/speech and returns the MP3 bytes with no usage', async () => {
    postBinary.mockResolvedValue({ ok: true, status: 200, body: Buffer.from('ID3mp3') });
    const audio = await new SpeechProviderClient().synthesize({
      candidate: OPENAI,
      text: 'Hello.',
      apiKey: 'o-key',
      maxOutputTokens: 1,
    });
    expect(audio).toEqual({ bytes: Buffer.from('ID3mp3'), mimeType: 'audio/mpeg', usage: null });
    expect(postBinary).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.openai.com/v1/audio/speech',
        headers: { Authorization: 'Bearer o-key' },
        body: { model: 'tts-1', input: 'Hello.', voice: 'alloy', response_format: 'mp3' },
      }),
    );
  });

  it('OpenAI: a deadline becomes a timed-out SpeechProviderError', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    postBinary.mockRejectedValue(abort);
    const error: unknown = await new SpeechProviderClient()
      .synthesize({ candidate: OPENAI, text: 'Hi.', apiKey: 'k', maxOutputTokens: 1 })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SpeechProviderError);
    expect((error as SpeechProviderError).timedOut).toBe(true);
  });

  it('OpenAI: an error status or empty body never passes as audio', async () => {
    postBinary.mockResolvedValue({ ok: false, status: 429, body: Buffer.from('{"error":{}}') });
    await expect(
      new SpeechProviderClient().synthesize({
        candidate: OPENAI,
        text: 'Hi.',
        apiKey: 'k',
        maxOutputTokens: 1,
      }),
    ).rejects.toMatchObject({ status: 429 });
    postBinary.mockResolvedValue({ ok: true, status: 200, body: Buffer.alloc(0) });
    await expect(
      new SpeechProviderClient().synthesize({
        candidate: OPENAI,
        text: 'Hi.',
        apiKey: 'k',
        maxOutputTokens: 1,
      }),
    ).rejects.toBeInstanceOf(SpeechProviderError);
  });
});

describe('TtsVoiceCandidatesClient', () => {
  const LIST = [
    { provider: 'GEMINI', modelAlias: 'gemini-2.5-flash-preview-tts', timeoutMs: 1, maxTokens: 1 },
  ];

  it('reads the TTS_VOICE role with the service token and caches it for a minute', async () => {
    request.mockResolvedValue({ ok: true, status: 200, data: LIST } as never);
    const client = new TtsVoiceCandidatesClient();
    let now = 0;
    await expect(client.resolve(() => now)).resolves.toEqual(LIST);
    now = 30_000;
    await client.resolve(() => now);
    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://routing.test/api/v1/internal/assistant-models/TTS_VOICE/candidates',
        headers: { Authorization: `Service ${'t'.repeat(40)}` },
      }),
    );
  });

  it('keeps the last list through an outage and is empty when never reached', async () => {
    const client = new TtsVoiceCandidatesClient();
    let now = 0;
    request.mockResolvedValueOnce({ ok: true, status: 200, data: LIST } as never);
    await client.resolve(() => now);
    now = 120_000;
    request.mockRejectedValueOnce(new Error('fetch failed'));
    await expect(client.resolve(() => now)).resolves.toEqual(LIST);
    request.mockRejectedValue(new Error('fetch failed'));
    await expect(new TtsVoiceCandidatesClient().resolve()).resolves.toEqual([]);
  });
});

describe('SpeechConnectorClient', () => {
  it('returns a trimmed key, or null for a blank, missing or failed answer', async () => {
    const client = new SpeechConnectorClient();
    request.mockResolvedValueOnce({ ok: true, status: 200, data: { apiKey: ' k1 ' } } as never);
    await expect(client.resolveApiKey(SpeechProvider.OPENAI)).resolves.toBe('k1');
    request.mockResolvedValueOnce({ ok: true, status: 200, data: { apiKey: '  ' } } as never);
    await expect(client.resolveApiKey(SpeechProvider.OPENAI)).resolves.toBeNull();
    request.mockResolvedValueOnce({ ok: false, status: 404, data: {} } as never);
    await expect(client.resolveApiKey(SpeechProvider.OPENAI)).resolves.toBeNull();
    request.mockRejectedValueOnce(new Error('down'));
    await expect(client.resolveApiKey(SpeechProvider.OPENAI)).resolves.toBeNull();
  });

  it('caches only the configured yes/no, never the key, for a minute', async () => {
    const client = new SpeechConnectorClient();
    request.mockResolvedValue({ ok: true, status: 200, data: { apiKey: 'k' } } as never);
    let now = 0;
    await expect(client.isConfigured(SpeechProvider.GEMINI, () => now)).resolves.toBe(true);
    now = 30_000;
    await client.isConfigured(SpeechProvider.GEMINI, () => now);
    expect(request).toHaveBeenCalledTimes(1);
    await client.resolveApiKey(SpeechProvider.GEMINI);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe('SpeechFileStoreClient', () => {
  it('stores base64 audio for the named owner and returns the file id', async () => {
    request.mockResolvedValue({ ok: true, status: 201, data: { fileId: 'f1' } } as never);
    await expect(
      new SpeechFileStoreClient().store({
        userId: 'u1',
        filename: 'reply-m1.wav',
        mimeType: 'audio/wav',
        bytes: Buffer.from('RIFF'),
        transcript: 'Hi.',
      }),
    ).resolves.toBe('f1');
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://file.test/api/v1/internal/files/store-generated-audio',
        method: 'POST',
        body: {
          userId: 'u1',
          filename: 'reply-m1.wav',
          mimeType: 'audio/wav',
          base64Data: Buffer.from('RIFF').toString('base64'),
          transcript: 'Hi.',
        },
      }),
    );
  });

  it('a refused store is a 502 TTS_FAILED', async () => {
    request.mockResolvedValue({ ok: false, status: 400, data: {} } as never);
    await expect(
      new SpeechFileStoreClient().store({
        userId: 'u1',
        filename: 'x.wav',
        mimeType: 'audio/wav',
        bytes: Buffer.from('x'),
        transcript: '',
      }),
    ).rejects.toMatchObject({ status: 502 });
  });

  it('exists: true on 200, false on 404, null when file-service cannot say', async () => {
    const client = new SpeechFileStoreClient();
    request.mockResolvedValueOnce({ ok: true, status: 200, data: {} } as never);
    await expect(client.exists('f1', 'u1')).resolves.toBe(true);
    request.mockResolvedValueOnce({ ok: false, status: 404, data: {} } as never);
    await expect(client.exists('f1', 'u1')).resolves.toBe(false);
    request.mockResolvedValueOnce({ ok: false, status: 500, data: {} } as never);
    await expect(client.exists('f1', 'u1')).resolves.toBeNull();
    request.mockRejectedValueOnce(new Error('down'));
    await expect(client.exists('f1', 'u1')).resolves.toBeNull();
    expect(request.mock.calls[0]?.[0].url).toBe(
      'http://file.test/api/v1/internal/files/f1/ingestion-state?userId=u1',
    );
  });
});
