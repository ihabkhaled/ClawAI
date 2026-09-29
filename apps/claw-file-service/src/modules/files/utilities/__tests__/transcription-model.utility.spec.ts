import { describe, expect, it } from 'vitest';
import { openAiResponseFormat, openAiTranscriptionModel } from '../transcription-model.utility';

describe('openAiTranscriptionModel', () => {
  it('uses gpt-4o-mini-transcribe for plain audio', () => {
    expect(openAiTranscriptionModel(false)).toBe('gpt-4o-mini-transcribe');
  });

  it('keeps whisper-1 where segments are needed', () => {
    expect(openAiTranscriptionModel(true)).toBe('whisper-1');
  });
});

describe('openAiResponseFormat', () => {
  it.each([
    ['gpt-4o-mini-transcribe', 'json'],
    ['gpt-4o-transcribe', 'json'],
    ['whisper-1', 'verbose_json'],
  ])('%s -> %s', (model, format) => {
    expect(openAiResponseFormat(model)).toBe(format);
  });
});
