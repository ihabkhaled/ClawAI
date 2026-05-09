import type { AutoSuggestJobType } from '../types/auto-suggest.types';

export const AUTO_SUGGEST_LOCK_NAMESPACE_PREFIX = 'workspace.auto_suggest';
export const AUTO_SUGGEST_STALE_PR_AGE_DAYS = 7;
export const AUTO_SUGGEST_RECENT_TICKET_LOOKBACK_DAYS = 7;
export const AUTO_SUGGEST_CANDIDATE_BATCH_SIZE = 50;

export const AUTO_SUGGEST_SUPPORTED_JOB_TYPES: ReadonlyArray<AutoSuggestJobType> = [
  'JIRA_TICKET_SUMMARY',
  'GITHUB_STALE_PR',
  'INBOX_REPLY',
  'MEETING_NOTES_SCAN',
];

// Stream 23.2/23.3 — meeting-notes scanner thresholds
export const MEETING_NOTES_SCAN_LOOKBACK_HOURS = 6;
export const MEETING_NOTES_TRANSCRIPT_WINDOW_HOURS = 1;
export const MEETING_NOTES_TRANSCRIPT_KEYWORDS = ['transcript', 'notes', 'recording', 'meeting'];

// Stream 12.2 — Gmail INBOX_REPLY collector
export const INBOX_REPLY_REPLY_KEYWORDS = ['re:', 'reply', 'replied'];
// Treat a Gmail message as "needs-reply" when its richMetadata.needsReply === true
// OR when the subject does NOT start with "re:" (i.e. a fresh inbound, not a thread reply).
export const INBOX_REPLY_NEEDS_ATTENTION_KEY = 'needsReply';
