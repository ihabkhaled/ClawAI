/**
 * The backend's progressive "Read aloud" job state for one reply
 * (`GET|POST /chat-messages/:id/speech`, chat-service `SpeechJobStatus`).
 */
export enum MessageSpeechJobStatus {
  NONE = 'NONE',
  GENERATING = 'GENERATING',
  READY = 'READY',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}
