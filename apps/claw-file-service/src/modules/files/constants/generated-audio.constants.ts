import { MAX_FILE_SIZE } from '../types/files.types';

/**
 * Audio a sibling service synthesised for its owner (multimodal batch 9, "Read
 * aloud"). Only the two containers the TTS providers return: OpenAI tts-1 MP3
 * and the WAV chat-service wraps around Gemini's PCM.
 */
export const GENERATED_AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav'] as const;

/** Base64 of the largest file the service stores (4 chars per 3 bytes, padded). */
export const GENERATED_AUDIO_MAX_BASE64_LENGTH = Math.ceil(MAX_FILE_SIZE / 3) * 4;

/** The text that was spoken, kept as the file's extracted text. */
export const GENERATED_AUDIO_TRANSCRIPT_MAX_LENGTH = 20_000;

export const GENERATED_AUDIO_FILENAME_MAX_LENGTH = 200;
