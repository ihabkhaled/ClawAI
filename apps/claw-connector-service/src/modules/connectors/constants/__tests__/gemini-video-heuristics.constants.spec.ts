import { isGeminiVideoCapableModel } from '../gemini-video-heuristics.constants';

describe('isGeminiVideoCapableModel', () => {
  it.each([
    'gemini-2.5-flash',
    'models/gemini-2.5-flash',
    'models/gemini-2.5-pro',
    'models/gemini-2.0-flash',
    'models/gemini-2.0-flash-001',
    'models/gemini-2.0-flash-lite',
    'models/gemini-2.5-flash-lite',
    'models/gemini-2.5-flash-preview-09-2025',
    'models/gemini-3-pro-preview',
    'models/gemini-3-flash-preview',
    'models/gemini-3.1-pro',
    'Models/Gemini-2.5-Flash',
  ])('accepts %s', (id) => {
    expect(isGeminiVideoCapableModel(id)).toBe(true);
  });

  it.each([
    'models/gemini-2.5-flash-image',
    'models/gemini-2.5-flash-image-preview',
    'models/gemini-2.5-flash-preview-tts',
    'models/gemini-2.5-pro-preview-tts',
    'models/gemini-live-2.5-flash-preview',
    'models/gemini-2.5-flash-native-audio-preview-09-2025',
    'models/gemini-2.0-flash-thinking-exp',
    'models/gemini-2.0-flash-exp',
    'models/gemini-exp-1206',
    'models/gemini-2.5-computer-use-preview-10-2025',
    'models/gemini-1.5-pro',
    'models/gemini-1.5-flash',
    'models/gemini-flash-latest',
    'models/text-embedding-004',
    'models/gemini-embedding-001',
    'models/gemma-3-27b-it',
    'models/imagen-4.0-generate-001',
    'models/antigravity-preview-05-2026',
    'gemini',
    '',
  ])('rejects %s', (id) => {
    expect(isGeminiVideoCapableModel(id)).toBe(false);
  });
});
