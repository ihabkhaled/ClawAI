import {
  buildGeminiGenerationConfig,
  geminiResponseFailure,
  readGeminiResponse,
  supportsGeminiThinkingOff,
} from '../gemini-transcription-response.utility';
import { TranscriptionResponseIssue } from '../../../../common/enums';

describe('supportsGeminiThinkingOff', () => {
  it.each([
    ['gemini-2.5-flash', true],
    ['models/gemini-2.5-flash', true],
    ['gemini-2.5-flash-lite', true],
    ['models/GEMINI-2.5-FLASH-LITE', true],
    ['gemini-2.5-flash-preview-09-2025', true],
    ['gemini-2.5-pro', false],
    ['models/gemini-2.5-pro', false],
    ['gemini-2.0-flash', false],
    ['gemini-3-flash', false],
    ['whisper-1', false],
  ])('%s → %s', (model, expected) => {
    expect(supportsGeminiThinkingOff(model)).toBe(expected);
  });
});

describe('buildGeminiGenerationConfig', () => {
  it('always carries temperature 0 and merges the granted ceiling', () => {
    expect(buildGeminiGenerationConfig('gemini-2.5-pro', 900)).toEqual({
      temperature: 0,
      maxOutputTokens: 900,
    });
  });

  it('adds thinkingBudget 0 for a model that accepts it', () => {
    expect(buildGeminiGenerationConfig('models/gemini-2.5-flash')).toEqual({
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    });
  });
});

describe('readGeminiResponse + geminiResponseFailure', () => {
  it('reads only the FIRST candidate and trims the joined text', () => {
    const reading = readGeminiResponse({
      candidates: [
        { finishReason: 'STOP', content: { parts: [{ text: '  a' }, { text: 'b  ' }] } },
        { content: { parts: [{ text: 'other candidate' }] } },
      ],
    });
    expect(reading).toEqual({ text: 'ab', thoughtCharacters: 0, finishReason: 'STOP' });
    expect(geminiResponseFailure(reading)).toBeNull();
  });

  it('prefers a block over a truncation', () => {
    const failure = geminiResponseFailure({
      text: '',
      thoughtCharacters: 3,
      finishReason: 'MAX_TOKENS',
      blockReason: 'SAFETY',
    });
    expect(failure?.issue).toBe(TranscriptionResponseIssue.BLOCKED);
  });

  it('reports a truncation over a thought-only answer', () => {
    const failure = geminiResponseFailure({
      text: '',
      thoughtCharacters: 12,
      finishReason: 'MAX_TOKENS',
    });
    expect(failure?.issue).toBe(TranscriptionResponseIssue.TRUNCATED);
  });

  it('leaves a plain empty answer to the manager', () => {
    expect(geminiResponseFailure({ text: '', thoughtCharacters: 0 })).toBeNull();
  });
});
