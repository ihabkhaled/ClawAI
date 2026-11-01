import { vi } from 'vitest';

import { AudioFailureCode } from '../../../../common/enums';
import {
  geminiLyriaClient,
  geminiSpeechClient,
  openAiSpeechClient,
} from '../../constants/audio-provider-clients.constants';

const http = vi.hoisted(() => ({ httpGet: vi.fn(), httpPost: vi.fn() }));

vi.mock('@common/utilities', () => http);

const gemini = {
  baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  apiKey: 'g-key',
};
const openai = { baseUrl: 'https://api.openai.com/v1/', apiKey: 'o-key' };

describe('OpenAI speech client', () => {
  beforeEach(() => vi.clearAllMocks());

  it('posts to /audio/speech with the bearer key and returns mp3 bytes', async () => {
    http.httpPost.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer);

    const result = await openAiSpeechClient.synthesize(openai, {
      model: 'tts-1',
      prompt: 'Hello',
      voice: 'alloy',
      format: 'mp3',
    });

    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.bytes.length).toBe(3);
    expect(result.usage).toBeNull();
    const [url, body, config] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe('https://api.openai.com/v1/audio/speech');
    expect(body).toEqual({
      model: 'tts-1',
      input: 'Hello',
      voice: 'alloy',
      response_format: 'mp3',
    });
    expect(config.headers).toEqual({ Authorization: 'Bearer o-key' });
    expect(config.responseType).toBe('arraybuffer');
  });

  it('asks for wav and reports audio/wav', async () => {
    http.httpPost.mockResolvedValue(Uint8Array.from([1]).buffer);

    const result = await openAiSpeechClient.synthesize(openai, {
      model: 'gpt-4o-mini-tts',
      prompt: 'Hi',
      voice: 'alloy',
      format: 'wav',
    });

    expect(result.mimeType).toBe('audio/wav');
    expect(http.httpPost.mock.calls[0]?.[1]).toMatchObject({ response_format: 'wav' });
  });

  it('refuses an empty file', async () => {
    http.httpPost.mockResolvedValue(new ArrayBuffer(0));

    await expect(
      openAiSpeechClient.synthesize(openai, {
        model: 'tts-1',
        prompt: 'x',
        voice: 'a',
        format: 'mp3',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.NO_AUDIO_RETURNED });
  });

  it('classifies a 401 as an auth failure and a 404 as a missing model', async () => {
    http.httpPost.mockRejectedValueOnce({ response: { status: 401, data: {} }, message: 'no' });
    await expect(
      openAiSpeechClient.synthesize(openai, {
        model: 'tts-1',
        prompt: 'x',
        voice: 'a',
        format: 'mp3',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.PROVIDER_AUTH_FAILED });

    http.httpPost.mockRejectedValueOnce({ response: { status: 404, data: {} }, message: 'no' });
    await expect(
      openAiSpeechClient.synthesize(openai, {
        model: 'tts-9',
        prompt: 'x',
        voice: 'a',
        format: 'mp3',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.MODEL_UNAVAILABLE });
  });
});

describe('Gemini speech client', () => {
  beforeEach(() => vi.clearAllMocks());

  const pcm = Buffer.alloc(48_000, 1); // 1 second at 24 kHz mono 16-bit

  it('calls generateContent with the AUDIO modality, wraps PCM in WAV and reports usage', async () => {
    http.httpPost.mockResolvedValue({
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
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 25 },
    });

    const result = await geminiSpeechClient.synthesize(gemini, {
      model: 'models/gemini-2.5-flash-preview-tts',
      prompt: 'Hello',
      voice: 'Kore',
      format: 'mp3',
      maxOutputTokens: 400,
    });

    const [url, body, config] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    );
    expect(body.generationConfig).toMatchObject({
      responseModalities: ['AUDIO'],
      maxOutputTokens: 400,
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
    });
    expect(config.headers).toEqual({ 'x-goog-api-key': 'g-key' });
    expect(result.mimeType).toBe('audio/wav');
    expect(result.bytes.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.bytes.length).toBe(48_044);
    expect(result.durationSeconds).toBe(1);
    expect(result.usage).toEqual({ promptTokens: 10, completionTokens: 25 });
  });

  it('reports a blocked prompt as a content rejection', async () => {
    http.httpPost.mockResolvedValue({ promptFeedback: { blockReason: 'SAFETY' } });

    await expect(
      geminiSpeechClient.synthesize(gemini, {
        model: 'm-tts',
        prompt: 'x',
        voice: 'Kore',
        format: 'wav',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.CONTENT_REJECTED });
  });

  it('reports a reply with no audio part', async () => {
    http.httpPost.mockResolvedValue({ candidates: [{ content: { parts: [{}] } }] });

    await expect(
      geminiSpeechClient.synthesize(gemini, {
        model: 'm-tts',
        prompt: 'x',
        voice: 'Kore',
        format: 'wav',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.NO_AUDIO_RETURNED });
  });
});

describe('Gemini Lyria client', () => {
  beforeEach(() => vi.clearAllMocks());

  const reply = (bytes: Buffer): unknown => ({
    steps: [
      { type: 'user_input', content: [] },
      {
        type: 'model_output',
        content: [
          { type: 'text', text: 'lyrics' },
          { type: 'audio', data: bytes.toString('base64') },
        ],
      },
    ],
  });

  it('posts to /interactions and returns an mp3 clip of 30 seconds', async () => {
    http.httpPost.mockResolvedValue(reply(Buffer.from('ID3-mp3-bytes')));

    const result = await geminiLyriaClient.synthesize(gemini, {
      model: 'lyria-3-clip-preview',
      prompt: 'Calm guitar',
      voice: '',
      format: 'mp3',
    });

    const [url, body] = http.httpPost.mock.calls[0] ?? [];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(body).toEqual({ model: 'lyria-3-clip-preview', input: 'Calm guitar' });
    expect(result.mimeType).toBe('audio/mpeg');
    expect(result.durationSeconds).toBe(30);
  });

  it('asks lyria-3.5 for wav and detects the RIFF container', async () => {
    http.httpPost.mockResolvedValue(reply(Buffer.from('RIFF....WAVEdata-bytes')));

    const result = await geminiLyriaClient.synthesize(gemini, {
      model: 'lyria-3.5',
      prompt: 'Epic',
      voice: '',
      format: 'wav',
    });

    expect(http.httpPost.mock.calls[0]?.[1]).toMatchObject({ response_format: { type: 'audio' } });
    expect(result.mimeType).toBe('audio/wav');
    expect(result.durationSeconds).toBeNull();
  });

  it('reports a reply with no audio block', async () => {
    http.httpPost.mockResolvedValue({
      steps: [{ type: 'model_output', content: [{ type: 'text', text: 'x' }] }],
    });

    await expect(
      geminiLyriaClient.synthesize(gemini, {
        model: 'lyria-3.5',
        prompt: 'x',
        voice: '',
        format: 'mp3',
      }),
    ).rejects.toMatchObject({ code: AudioFailureCode.NO_AUDIO_RETURNED });
  });
});
