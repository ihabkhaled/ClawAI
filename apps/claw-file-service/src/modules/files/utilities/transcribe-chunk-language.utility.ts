import {
  TRANSCRIBE_CHUNK_LANGUAGE_TAG,
  TRANSCRIBE_CHUNK_NUMBERS_ONLY,
  TRANSCRIBE_CHUNK_SOUND_TAG,
} from '../constants/transcribe-chunk.constants';
import { TRANSCRIPTION_REFUSAL_WHITESPACE } from '../constants/transcription.constants';

/**
 * Splits the `[[lang:xx]]` tag off a chunk transcript. The first tag names the language (lower
 * case); every tag is removed so it can never reach a caption. No tag → `language: null`.
 */
export function splitChunkLanguageTag(raw: string): { text: string; language: string | null } {
  let language: string | null = null;
  const text = raw
    .replace(TRANSCRIBE_CHUNK_LANGUAGE_TAG, (_tag: string, code: string) => {
      language ??= code.toLowerCase();
      return ' ';
    })
    .replace(TRANSCRIPTION_REFUSAL_WHITESPACE, ' ')
    .trim();
  return { text, language };
}

/** True when a chunk answer holds no words at all: clock stamps, digits or only "[Music]"-style tags. */
export function isNonSpeechChunk(text: string): boolean {
  return (
    TRANSCRIBE_CHUNK_NUMBERS_ONLY.test(text) ||
    text.replace(TRANSCRIBE_CHUNK_SOUND_TAG, '').trim() === ''
  );
}
