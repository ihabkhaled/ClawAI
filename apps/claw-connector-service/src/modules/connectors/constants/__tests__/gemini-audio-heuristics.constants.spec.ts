import { isGeminiAudioCapableModel } from '../gemini-audio-heuristics.constants';

describe('isGeminiAudioCapableModel', () => {
  it('marks the stable numbered flash/pro family as audio-capable', () => {
    expect(isGeminiAudioCapableModel('models/gemini-2.5-flash')).toBe(true);
    expect(isGeminiAudioCapableModel('gemini-2.5-flash')).toBe(true);
    expect(isGeminiAudioCapableModel('models/gemini-2.5-pro')).toBe(true);
    expect(isGeminiAudioCapableModel('models/gemini-3.6-flash')).toBe(true);
    expect(isGeminiAudioCapableModel('models/gemini-2.0-flash-lite')).toBe(true);
  });

  // The exact live bug this guards: connector-service marked this model
  // supportsAudio: true, TRANSCRIPTION_PROVIDER_PRIORITY picked it first,
  // and Gemini refused it — "Audio input modality is not enabled for
  // models/antigravity-preview-05-2026" (400 INVALID_ARGUMENT).
  it('does not mark antigravity-preview as audio-capable', () => {
    expect(isGeminiAudioCapableModel('models/antigravity-preview-05-2026')).toBe(false);
  });

  it('fails closed for the whole class of preview/experimental Gemini models, not just this one', () => {
    expect(isGeminiAudioCapableModel('models/gemini-2.5-flash-preview')).toBe(false);
    expect(isGeminiAudioCapableModel('models/gemini-exp-1206')).toBe(false);
    expect(isGeminiAudioCapableModel('models/gemini-2.0-flash-thinking-exp')).toBe(false);
    expect(isGeminiAudioCapableModel('models/gemini-live-2.5-flash-preview')).toBe(false);
  });

  it('fails closed for non-gemini product lines', () => {
    expect(isGeminiAudioCapableModel('models/gemma-3-27b')).toBe(false);
    expect(isGeminiAudioCapableModel('models/imagen-4.0-generate')).toBe(false);
    expect(isGeminiAudioCapableModel('models/text-embedding-004')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isGeminiAudioCapableModel('Models/Gemini-2.5-Flash')).toBe(true);
    expect(isGeminiAudioCapableModel('MODELS/ANTIGRAVITY-PREVIEW-05-2026')).toBe(false);
  });
});
