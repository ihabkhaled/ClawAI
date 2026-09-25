/**
 * Why "Read aloud" (text-to-speech, multimodal batch 9) cannot run for a user
 * right now. chat-service answers `GET /chat-messages/speech/availability`
 * with one of these (or null when it can run); the frontend dims the control
 * and shows the matching localized reason instead of hiding it.
 */
export enum SpeechUnavailableReason {
  /** The user's plan does not include text-to-speech (`Plan.allowTextToSpeech`). */
  PLAN_DISABLED = 'PLAN_DISABLED',
  /** No enabled TTS_VOICE candidate whose provider has a configured connector. */
  NO_VOICE_CONFIGURED = 'NO_VOICE_CONFIGURED',
  /** Entitlements could not be read; fails closed until they can. */
  TEMPORARILY_UNAVAILABLE = 'TEMPORARILY_UNAVAILABLE',
}
