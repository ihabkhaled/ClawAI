/**
 * The providers "Read aloud" (text-to-speech, multimodal batch 9) can call.
 * A TTS_VOICE candidate on any other provider is skipped: chat-service has no
 * speech adapter for it and would otherwise fail every request.
 */
export enum SpeechProvider {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
}
