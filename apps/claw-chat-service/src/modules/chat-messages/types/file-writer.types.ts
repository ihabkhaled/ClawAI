/** One FILE_WRITER candidate as routing-service serves it. */
export interface FileWriterCandidate {
  provider: string;
  modelAlias: string;
  timeoutMs: number;
  maxTokens: number;
}

/** A candidate in chat-service's provider vocabulary. */
export interface FileContentCandidate {
  provider: string;
  model: string;
}

/** How a file's writer list is shaped for one request (F6, ADR-119). */
export interface FileContentCandidateOptions {
  /** The model the user picked; it writes first. Manual mode only. */
  preferred?: FileContentCandidate;
  /** LOCAL_ONLY / PRIVACY_FIRST: hosted writers are not allowed. */
  localOnly?: boolean;
}

export interface CachedFileWriterCandidates {
  candidates: readonly FileWriterCandidate[];
  expiresAt: number;
}

/** A file format named in a request, and whether it was named as the target ("as a pdf"). */
export type FormatMention = { format: string; index: number; targeted: boolean };
