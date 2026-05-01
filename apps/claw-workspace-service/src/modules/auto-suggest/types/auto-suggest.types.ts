import type { WorkspaceProvider } from '../../../common/enums/workspace-provider.enum';
import type { AutoSuggestRunStatus } from '../../../generated/prisma';

export type AutoSuggestJobType =
  | 'JIRA_TICKET_SUMMARY'
  | 'GITHUB_STALE_PR'
  | 'INBOX_REPLY'
  | 'MEETING_NOTES_SCAN';

export type CandidateSuggestion = {
  userId: string;
  connectorId: string | null;
  provider: WorkspaceProvider | null;
  actionKind: string;
  draftPayload: Record<string, unknown>;
  sourceObjectId: string;
  generatedBy?: Record<string, unknown>;
};

export type AutoSuggestRunInput = {
  jobType: AutoSuggestJobType;
};

export type AutoSuggestRunResult = {
  runId: string;
  jobType: AutoSuggestJobType;
  status: AutoSuggestRunStatus;
  candidateCount: number;
  suggestionsCreated: number;
  durationMs: number;
};

export type CreateAutoSuggestRunInput = {
  jobType: AutoSuggestJobType;
};

export type CompleteAutoSuggestRunInput = {
  id: string;
  status: AutoSuggestRunStatus;
  candidateCount: number;
  suggestionsCreated: number;
  durationMs: number;
  errorMessage: string | null;
};
