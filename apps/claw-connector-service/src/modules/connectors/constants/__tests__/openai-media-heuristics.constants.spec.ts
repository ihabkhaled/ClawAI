import {
  isOpenAiAudioInputModel,
  isOpenAiVisionCapableModel,
  resolveOpenAiAudioFlags,
} from '../openai-media-heuristics.constants';

describe('isOpenAiVisionCapableModel', () => {
  it.each([
    'gpt-4o',
    'gpt-4o-2024-08-06',
    'gpt-4o-mini',
    'gpt-4o-mini-2024-07-18',
    'chatgpt-4o-latest',
    'gpt-4.1',
    'gpt-4.1-mini',
    'gpt-4.1-nano',
    'gpt-4.5-preview',
    'gpt-4-turbo',
    'gpt-4-turbo-2024-04-09',
    'gpt-4-vision-preview',
    'gpt-5',
    'gpt-5-mini',
    'gpt-5-nano',
    'gpt-5-chat-latest',
    'gpt-5.1',
    'gpt-5.1-codex',
    'o1',
    'o1-2024-12-17',
    'o1-pro',
    'o3',
    'o3-2025-04-16',
    'o3-pro',
    'o3-deep-research',
    'o4-mini',
    'o4-mini-2025-04-16',
    'GPT-5',
  ])('accepts known vision model %s', (id) => {
    expect(isOpenAiVisionCapableModel(id)).toBe(true);
  });

  it.each([
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-instruct',
    'gpt-4',
    'gpt-4-0613',
    'gpt-4-turbo-preview',
    'gpt-4-0125-preview',
    'o1-mini',
    'o1-preview',
    'o3-mini',
    'gpt-4o-audio-preview',
    'gpt-4o-mini-audio-preview',
    'gpt-4o-realtime-preview',
    'gpt-4o-mini-realtime-preview',
    'gpt-4o-search-preview',
    'gpt-4o-mini-search-preview',
    'gpt-4o-transcribe',
    'gpt-4o-mini-transcribe',
    'gpt-4o-mini-tts',
    'gpt-5-search-api',
    'gpt-image-1',
    'gpt-audio',
  ])('rejects known non-vision model %s', (id) => {
    expect(isOpenAiVisionCapableModel(id)).toBe(false);
  });

  it.each(['gpt-6', 'o5', 'o4', 'o2-mini', 'chatgpt-5-latest', 'gpt', 'whisper-1', ''])(
    'fails closed for unknown id %s',
    (id) => {
      expect(isOpenAiVisionCapableModel(id)).toBe(false);
    },
  );
});

describe('isOpenAiAudioInputModel', () => {
  it.each([
    'gpt-4o-audio-preview',
    'gpt-4o-mini-audio-preview',
    'gpt-4o-transcribe',
    'gpt-4o-mini-transcribe',
  ])('accepts audio-input model %s', (id) => {
    expect(isOpenAiAudioInputModel(id)).toBe(true);
  });

  it.each(['gpt-5', 'gpt-4o', 'o3', 'gpt-4o-mini-tts', 'gpt-4o-realtime-preview'])(
    'rejects %s',
    (id) => {
      expect(isOpenAiAudioInputModel(id)).toBe(false);
    },
  );
});

describe('resolveOpenAiAudioFlags', () => {
  it('flags only audio-input rows when the listing has one', () => {
    const result = resolveOpenAiAudioFlags(['gpt-5', 'gpt-4o-transcribe', 'o3']);
    expect(result.usedProviderFallback).toBe(false);
    expect(result.flags.get('gpt-5')).toBe(false);
    expect(result.flags.get('gpt-4o-transcribe')).toBe(true);
    expect(result.flags.get('o3')).toBe(false);
  });

  // Keeps file-service's transcription fallback alive: it needs ONE OpenAI row
  // flagged audio to know OpenAI is configured, then calls whisper-1 itself.
  it('falls back to the provider-level rule when the listing has no audio model', () => {
    const result = resolveOpenAiAudioFlags(['gpt-5', 'o3']);
    expect(result.usedProviderFallback).toBe(true);
    expect([...result.flags.values()]).toEqual([true, true]);
  });

  it('reports no fallback for an empty listing', () => {
    const result = resolveOpenAiAudioFlags([]);
    expect(result.usedProviderFallback).toBe(false);
    expect(result.flags.size).toBe(0);
  });
});
