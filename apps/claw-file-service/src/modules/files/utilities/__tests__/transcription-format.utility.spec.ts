import {
  audioFilenameForMimeType,
  normalizeBaseUrl,
  stripGeminiModelsPrefix,
  toGeminiNativeBaseUrl,
} from '../transcription-format.utility';

describe('toGeminiNativeBaseUrl', () => {
  it('strips the OpenAI-compatibility suffix', () => {
    expect(toGeminiNativeBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai')).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });

  it('leaves a base URL with no compat suffix alone', () => {
    expect(toGeminiNativeBaseUrl('https://generativelanguage.googleapis.com/v1beta')).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });

  it('trims trailing slashes before checking the suffix', () => {
    expect(toGeminiNativeBaseUrl('https://generativelanguage.googleapis.com/v1beta/openai/')).toBe(
      'https://generativelanguage.googleapis.com/v1beta',
    );
  });
});

describe('audioFilenameForMimeType', () => {
  it('builds a filename from the mime subtype', () => {
    expect(audioFilenameForMimeType('audio/mpeg')).toBe('audio.mpeg');
  });

  it('drops codec parameters', () => {
    expect(audioFilenameForMimeType('audio/webm;codecs=opus')).toBe('audio.webm');
  });

  it('falls back to mp3 for a subtype with no alphanumerics', () => {
    expect(audioFilenameForMimeType('audio/')).toBe('audio.mp3');
  });
});

describe('normalizeBaseUrl', () => {
  it('trims trailing slashes', () => {
    expect(normalizeBaseUrl('https://api.example.com///')).toBe('https://api.example.com');
  });
});

// Regression (live QA, 2026-09-23): connector-service's Gemini model catalog
// keys carry a `models/` prefix (`models/gemini-2.5-flash`,
// `models/antigravity-preview-05-2026`), the same string
// TranscriptionCapabilityClient hands to the Gemini adapter. The adapter's URL
// already has a literal `/models/` segment, so the unstripped key produced
// `/models/models%2Fantigravity-preview-05-2026:generateContent` — Gemini's
// REST API 400s on it every time, so every transcription failed with no
// exception path that ever mentioned why. Repro'd live: uploaded a real WAV,
// watched `httpPost` fail with "status code 400" and the double-prefixed URL
// in the debug log.
describe('stripGeminiModelsPrefix', () => {
  it('removes exactly one leading "models/" segment', () => {
    expect(stripGeminiModelsPrefix('models/antigravity-preview-05-2026')).toBe(
      'antigravity-preview-05-2026',
    );
  });

  it('leaves a model key with no prefix untouched', () => {
    expect(stripGeminiModelsPrefix('gemini-2.5-flash')).toBe('gemini-2.5-flash');
  });

  it('strips only the first occurrence, not a "models/" that appears later', () => {
    expect(stripGeminiModelsPrefix('models/weird/models/name')).toBe('weird/models/name');
  });
});
