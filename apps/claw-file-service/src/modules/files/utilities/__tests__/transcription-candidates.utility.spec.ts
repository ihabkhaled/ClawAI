import { describe, expect, it } from 'vitest';
import {
  isStableTranscriptionModel,
  selectTranscriptionCandidates,
} from '../transcription-candidates.utility';
import { type TranscriptionSnapshotEntry } from '../../types/transcription.types';

const gemini = (modelKey: string, exposure = 'UNEXPOSED'): TranscriptionSnapshotEntry => ({
  provider: 'GEMINI',
  modelKey,
  modalitiesIn: ['TEXT', 'AUDIO'],
  exposure,
});

const openai = (modelKey: string, exposure = 'UNEXPOSED'): TranscriptionSnapshotEntry => ({
  provider: 'OPENAI',
  modelKey,
  modalitiesIn: ['TEXT', 'AUDIO'],
  exposure,
});

// A 19-row sample of the 63 GEMINI rows prod's connector DB flagged
// supports_audio=true on 2026-09-25 (every row was), in the DB's own
// alphabetical order. The first one is the model every voice note was sent
// to, and Gemini refused it with a 400.
const PROD_GEMINI_AUDIO_ROWS: TranscriptionSnapshotEntry[] = [
  gemini('models/antigravity-preview-05-2026'),
  gemini('models/antigravity-preview-09-2026'),
  gemini('models/aqa'),
  gemini('models/deep-research-preview-04-2026'),
  gemini('models/gemini-2.5-computer-use-preview-10-2025'),
  gemini('models/gemini-2.5-flash', 'EXPOSED'),
  gemini('models/gemini-2.5-flash-image', 'EXPOSED'),
  gemini('models/gemini-2.5-flash-lite', 'EXPOSED'),
  gemini('models/gemini-2.5-flash-native-audio-latest'),
  gemini('models/gemini-2.5-flash-preview-tts'),
  gemini('models/gemini-2.5-pro', 'EXPOSED'),
  gemini('models/gemini-3.1-flash-lite', 'EXPOSED'),
  gemini('models/gemini-3.1-flash-live-preview'),
  gemini('models/gemini-embedding-001'),
  gemini('models/gemma-4-31b-it', 'EXPOSED'),
  gemini('models/imagen-4.0-generate-001'),
  gemini('models/lyria-3-pro-preview'),
  gemini('models/nano-banana-pro-preview', 'EXPOSED'),
  gemini('models/veo-3.1-generate-preview', 'EXPOSED'),
];

describe('isStableTranscriptionModel', () => {
  it.each([
    'models/antigravity-preview-05-2026',
    'models/antigravity-latest',
    'models/gemini-3.1-pro-preview',
    'models/gemini-2.0-flash-exp',
    'models/gemini-2.5-flash-preview-tts',
    'models/gemini-3.1-flash-live-preview',
    'models/gemini-2.5-flash-native-audio-latest',
    'models/imagen-4.0-generate-001',
    'models/veo-3.1-generate-preview',
    'models/lyria-3.5',
    'models/gemini-embedding-001',
    'models/gemini-2.5-flash-image',
    'models/gemma-4-31b-it',
    'models/aqa',
    'models/deep-research-preview-04-2026',
    'models/gemini-2.5-computer-use-preview-10-2025',
    'models/nano-banana-pro-preview',
  ])('treats %s as not a transcription model', (modelKey) => {
    expect(isStableTranscriptionModel(modelKey)).toBe(false);
  });

  it.each([
    'models/gemini-2.5-flash',
    'models/gemini-2.5-flash-lite',
    'gemini-2.5-pro',
    'models/gemini-3.1-flash-lite',
    'gpt-4o-audio',
  ])('treats %s as a stable model', (modelKey) => {
    expect(isStableTranscriptionModel(modelKey)).toBe(true);
  });
});

describe('selectTranscriptionCandidates', () => {
  it('never puts the antigravity preview first, given the exact prod rows', () => {
    const candidates = selectTranscriptionCandidates([
      ...PROD_GEMINI_AUDIO_ROWS,
      openai('chatgpt-image-latest', 'EXPOSED'),
    ]);

    expect(candidates).toEqual([
      { provider: 'GEMINI', model: 'models/gemini-2.5-flash-lite' },
      { provider: 'GEMINI', model: 'models/gemini-3.1-flash-lite' },
      { provider: 'OPENAI', model: 'chatgpt-image-latest' },
    ]);
  });

  it('ranks flash-lite before flash before pro within a provider', () => {
    const candidates = selectTranscriptionCandidates([
      gemini('models/gemini-2.5-pro'),
      gemini('models/gemini-2.5-flash'),
      gemini('models/gemini-2.5-flash-lite'),
    ]);

    expect(candidates.map((candidate) => candidate.model)).toEqual([
      'models/gemini-2.5-flash-lite',
      'models/gemini-2.5-flash',
    ]);
  });

  it('prefers an EXPOSED row over an unexposed one of the same rank', () => {
    const candidates = selectTranscriptionCandidates([
      gemini('models/gemini-2.5-flash'),
      gemini('models/gemini-3.5-flash', 'EXPOSED'),
    ]);

    expect(candidates.at(0)?.model).toBe('models/gemini-3.5-flash');
  });

  it('keeps GEMINI ahead of OPENAI regardless of snapshot order', () => {
    const candidates = selectTranscriptionCandidates([
      openai('gpt-4o-audio'),
      gemini('models/gemini-2.5-flash'),
    ]);

    expect(candidates.map((candidate) => candidate.provider)).toEqual(['GEMINI', 'OPENAI']);
  });

  it('offers OPENAI once: its transcription model is fixed, so a second row adds nothing', () => {
    const candidates = selectTranscriptionCandidates([
      openai('gpt-4o-audio'),
      openai('gpt-4o-mini-transcribe'),
    ]);

    expect(candidates).toEqual([{ provider: 'OPENAI', model: 'gpt-4o-audio' }]);
  });

  it('drops preview/unknown models whenever any stable candidate exists', () => {
    const candidates = selectTranscriptionCandidates([
      gemini('models/antigravity-preview-05-2026'),
      openai('gpt-4o-audio'),
    ]);

    expect(candidates).toEqual([{ provider: 'OPENAI', model: 'gpt-4o-audio' }]);
  });

  it('falls back to a preview model only when nothing stable is configured at all', () => {
    const candidates = selectTranscriptionCandidates([
      gemini('models/imagen-4.0-generate-001'),
      gemini('models/gemini-3.1-pro-preview'),
    ]);

    expect(candidates).toEqual([
      { provider: 'GEMINI', model: 'models/gemini-3.1-pro-preview' },
      { provider: 'GEMINI', model: 'models/imagen-4.0-generate-001' },
    ]);
  });

  it('ignores rows without audio and providers without an adapter', () => {
    const candidates = selectTranscriptionCandidates([
      { provider: 'GEMINI', modelKey: 'models/gemini-2.5-flash', modalitiesIn: ['TEXT'] },
      { provider: 'ANTHROPIC', modelKey: 'claude-audio', modalitiesIn: ['AUDIO'] },
    ]);

    expect(candidates).toEqual([]);
  });

  it('reads the raw supportsAudio flag as well as the AUDIO modality', () => {
    const candidates = selectTranscriptionCandidates([
      { provider: 'GEMINI', modelKey: 'gemini-2.5-flash', supportsAudio: true },
    ]);

    expect(candidates).toEqual([{ provider: 'GEMINI', model: 'gemini-2.5-flash' }]);
  });
});
