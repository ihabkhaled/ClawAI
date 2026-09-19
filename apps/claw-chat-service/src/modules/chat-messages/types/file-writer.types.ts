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

export interface CachedFileWriterCandidates {
  candidates: readonly FileWriterCandidate[];
  expiresAt: number;
}

/** A file format named in a request, and whether it was named as the target ("as a pdf"). */
export type FormatMention = { format: string; index: number; targeted: boolean };
