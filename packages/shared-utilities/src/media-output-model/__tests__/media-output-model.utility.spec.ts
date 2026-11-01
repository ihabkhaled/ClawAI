import { describe, expect, it } from 'vitest';

import {
  classifyMediaOutputModel,
  hasMediaModalityOut,
  isMediaOutputModel,
  isPricedMediaModel,
  modalitiesOutForModel,
} from '../media-output-model.utility';

describe('classifyMediaOutputModel', () => {
  it.each([
    ['GEMINI', 'gemini-3-pro-image-preview', 'IMAGE'],
    ['GEMINI', 'models/gemini-2.5-flash-image', 'IMAGE'],
    ['GEMINI', 'nano-banana-pro-preview', 'IMAGE'],
    ['GEMINI', 'imagen-4.0-generate-001', 'IMAGE'],
    ['OPENAI', 'chatgpt-image-latest', 'IMAGE'],
    ['OPENAI', 'gpt-image-1', 'IMAGE'],
    ['GROK', 'grok-imagine-image', 'IMAGE'],
    ['GROK', 'grok-imagine-image-quality', 'IMAGE'],
    ['GROK', 'grok-imagine-image-2.0', 'IMAGE'],
    ['GEMINI', 'veo-3.1-fast-generate-preview', 'VIDEO'],
    ['GROK', 'grok-imagine-video', 'VIDEO'],
    ['GROK', 'grok-imagine-video-1.5', 'VIDEO'],
    ['GEMINI', 'gemini-2.5-flash-preview-tts', 'AUDIO'],
    ['OPENAI', 'gpt-4o-mini-tts', 'AUDIO'],
    ['OPENAI', 'gpt-4o-mini-tts-2025-12-15', 'AUDIO'],
    ['GEMINI', 'gemini-2.5-flash-native-audio-preview', 'AUDIO'],
    ['GEMINI', 'lyria-realtime', 'AUDIO'],
  ])('%s %s is %s', (connector, model, kind) => {
    expect(classifyMediaOutputModel(model, connector)?.kind).toBe(kind);
    expect(classifyMediaOutputModel(model)?.kind).toBe(kind);
  });

  it('tells speech from music', () => {
    expect(classifyMediaOutputModel('gpt-4o-mini-tts')?.audioKind).toBe('SPEECH');
    expect(classifyMediaOutputModel('lyria-3')?.audioKind).toBe('MUSIC');
  });

  it.each([
    'gpt-4o',
    'gemini-2.5-pro',
    'grok-3',
    'whisper-1',
    'gpt-4o-transcribe',
    'claude-opus-4',
  ])('%s stays a chat model', (model) => {
    expect(isMediaOutputModel(model)).toBe(false);
    expect(modalitiesOutForModel(model)).toEqual(['TEXT']);
  });

  it('maps to the registry modality', () => {
    expect(modalitiesOutForModel('veo-3.1-generate-preview', 'GEMINI')).toEqual(['VIDEO_OUTPUT']);
    expect(modalitiesOutForModel('gpt-4o-mini-tts')).toEqual(['AUDIO_OUTPUT']);
    expect(modalitiesOutForModel('gpt-image-1')).toEqual(['IMAGE_OUTPUT']);
  });

  it('flags stored media modalities', () => {
    expect(hasMediaModalityOut(['VIDEO_OUTPUT'])).toBe(true);
    expect(hasMediaModalityOut(['TEXT'])).toBe(false);
    expect(hasMediaModalityOut(undefined)).toBe(false);
  });
});

describe('isPricedMediaModel (production QA 2026-11-01 keys)', () => {
  it.each([
    ['GEMINI', 'models/veo-3.1-fast-generate-preview'],
    ['GEMINI', 'models/veo-3.1-generate-preview'],
    ['GEMINI', 'models/veo-3.1-lite-generate-preview'],
    ['OPENAI', 'chatgpt-image-latest'],
    ['OPENAI', 'gpt-4o-mini-tts-2025-03-20'],
    ['OPENAI', 'gpt-4o-mini-tts-2025-12-15'],
    ['gemini', 'models/lyria-3.5'],
  ])('%s %s is priced media', (provider, key) => {
    expect(isPricedMediaModel(provider, key)).toBe(true);
  });

  it.each([
    ['GEMINI', 'models/gemini-3.8-flash-tts'],
    ['GEMINI', 'models/gemini-3.8-flash-lite-tts'],
    ['GEMINI', 'models/lyria-realtime-exp'],
    ['OPENROUTER', 'google/lyria-3-clip-preview'],
    ['OPENAI', 'gpt-4o'],
  ])('%s %s stays hidden', (provider, key) => {
    expect(isPricedMediaModel(provider, key)).toBe(false);
  });
});
