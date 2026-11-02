/** Response of `POST /files/transcribe-text`. */
export interface TranscribeReadResult {
  text: string;
  /** Length of the media in seconds; 0 when it could not be measured (audio only). */
  durationSeconds: number;
  /** The provider that answered (GEMINI, OPENAI or LOCAL). */
  provider: string;
  model?: string;
  /** True when the transcript was cut at the character limit. */
  truncated: boolean;
}

/** The audio the provider walk will be asked to read, and what is known about it. */
export interface ReadAudio {
  base64: string;
  mimeType: string;
  sizeBytes: number;
  /** Measured seconds, or undefined (the hold then falls back to the byte estimate). */
  seconds: number | undefined;
}

/** What kind of media the file name and mime type say it is. */
export type TranscribeReadMediaKind = 'audio' | 'video';

export interface TranscribeReadClassification {
  kind: TranscribeReadMediaKind;
  /** The mime type sent to the provider (audio only; a video's track is audio/mpeg). */
  mimeType: string;
}
