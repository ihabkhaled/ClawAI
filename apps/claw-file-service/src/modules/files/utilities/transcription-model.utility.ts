import {
  OPENAI_JSON_ONLY_TRANSCRIPTION_MODELS,
  OPENAI_RESPONSE_FORMAT_JSON,
  OPENAI_RESPONSE_FORMAT_VERBOSE_JSON,
  OPENAI_TRANSCRIPTION_PLAIN_MODEL,
  OPENAI_TRANSCRIPTION_SEGMENTS_MODEL,
} from '../constants/transcription.constants';

/**
 * The OpenAI transcription model for a request. Segments (a video's timestamped
 * transcript) need whisper-1's `verbose_json`; plain audio uses the cheaper
 * gpt-4o-mini-transcribe.
 */
export function openAiTranscriptionModel(needsSegments: boolean): string {
  return needsSegments ? OPENAI_TRANSCRIPTION_SEGMENTS_MODEL : OPENAI_TRANSCRIPTION_PLAIN_MODEL;
}

/** `json` for the gpt-4o transcription models (they reject verbose_json), else `verbose_json`. */
export function openAiResponseFormat(model: string): string {
  return OPENAI_JSON_ONLY_TRANSCRIPTION_MODELS.includes(model)
    ? OPENAI_RESPONSE_FORMAT_JSON
    : OPENAI_RESPONSE_FORMAT_VERBOSE_JSON;
}
