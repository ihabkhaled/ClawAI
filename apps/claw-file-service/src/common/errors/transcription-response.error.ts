import { type TranscriptionResponseIssue } from '../enums/transcription-response-issue.enum';

/**
 * A provider call that SUCCEEDED at the transport level (HTTP 200) but carried
 * no usable transcript. Its own class so the candidate walk classifies it by
 * `issue` instead of string-matching a message, and so a content-policy block
 * is never reported to the user as "empty transcript". The message never
 * contains transcript text — only the provider's finish/block reason.
 */
export class TranscriptionResponseError extends Error {
  readonly issue: TranscriptionResponseIssue;

  constructor(issue: TranscriptionResponseIssue, message: string) {
    super(message);
    this.name = 'TranscriptionResponseError';
    this.issue = issue;
  }
}
