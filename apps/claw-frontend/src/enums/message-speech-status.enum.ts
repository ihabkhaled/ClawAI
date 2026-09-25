/**
 * Where one reply's "Read aloud" control is. PLAYING means the player is open
 * with audio ready — pressing the button again closes it (stop).
 */
export enum MessageSpeechStatus {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR',
}
