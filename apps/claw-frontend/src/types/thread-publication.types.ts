import type { ThreadPublicationType } from '@claw/shared-types';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { FormEvent } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import type { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';
import type { ThreadRevisionField } from '@/enums/thread-revision-field.enum';
import type { ModelSelection } from '@/types/component.types';
import type { ThreadExportFile } from '@/types/thread-export.types';
import type { ThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

export type OwnedThreadPublication = {
  id: string;
  status: ThreadPublicationStatus;
  title: string | null;
  slug: string;
  updatedAt: string;
};

export type ThreadGenerationState = {
  publicationId: string;
  publicationStatus: string;
  jobId: string;
  status: string;
  stage: string;
  round: number;
  safeErrorCode: string | null;
  draft: {
    markdown: string;
    citations: Array<{ evidenceId: string; url: string }>;
    judgeScore: number;
    criticScore: number;
  } | null;
};

export type ThreadRevisionReviewState = {
  revisionId: string;
  status: string;
  ready: boolean;
  reasons: string[];
};

export type ThreadRevisionRequestResult = {
  revisionId: string;
  status: string;
  reviewJobId: string | null;
  reasons: string[];
};

export type ThreadPublicationExport = {
  format: ThreadPublicationExportFormat;
  content: string | { title: string; markdown: string; citations: Array<{ url: string }> };
};

export type ThreadPublicationChangeRequest = {
  id: string;
  suggestion: string;
  status: ThreadPublicationChangeRequestStatus;
  ownerResponse: string | null;
  acceptedRevisionId: string | null;
  createdAt: string;
};

export type ResolveThreadPublicationChangeRequest =
  | { status: ThreadPublicationChangeRequestStatus.Rejected; ownerResponse?: string }
  | {
      status: ThreadPublicationChangeRequestStatus.Accepted;
      ownerResponse?: string;
      revision: ThreadRevisionRequest;
    };

export type ThreadPublicationChangeRequestResolution = {
  resolved: true;
  edit: ThreadRevisionRequestResult | null;
};

export type PublicThreadPublication = {
  slug: string;
  title: string;
  contentLocale: Locale;
  publicationType: ThreadPublicationType;
  content: { markdown: string; citations: Array<{ url: string }> };
  publishedAt: string;
  viewCount: number;
  readerCount: number;
};

export type PublicThreadComment = {
  id: string;
  content: string;
  createdAt: string;
};

export type ThreadReactionSummary = {
  likes: number;
  dislikes: number;
  viewerReaction: ThreadPublicationReaction | null;
};

export type ThreadReportReason = ThreadPublicationReportReason;

export type ThreadPublicAction =
  | { kind: ThreadPublicationCommunityAction.Comment; content: string }
  | { kind: ThreadPublicationCommunityAction.ChangeRequest; suggestion: string }
  | {
      kind: ThreadPublicationCommunityAction.Report;
      commentId?: string;
      reason: ThreadReportReason;
      details?: string;
    }
  | { kind: ThreadPublicationCommunityAction.Reaction; value: ThreadPublicationReaction | null };

export type ThreadCommunityActionState = {
  comment: string;
  suggestion: string;
  reportTarget: string | null;
  reportReason: ThreadReportReason;
  reportDetails: string;
  isSubmitting: boolean;
  actionComplete: boolean;
  actionFailed: boolean;
  setComment: (value: string) => void;
  setSuggestion: (value: string) => void;
  setReportTarget: (value: string | null) => void;
  setReportReason: (value: ThreadReportReason) => void;
  setReportDetails: (value: string) => void;
  submitComment: () => void;
  submitChangeRequest: () => void;
  submitReport: () => void;
  setReaction: (value: ThreadPublicationReaction | null) => void;
};

export type ThreadPublicPageController = {
  shareUrl: string | null;
  buildExportFile: (format: ThreadPublicationExportFormat) => Promise<ThreadExportFile>;
  publication: PublicThreadPublication | undefined;
  comments: PublicThreadComment[];
  reactions: ThreadReactionSummary | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  isNotFound: boolean;
  isError: boolean;
  communityLoading: boolean;
  communityError: boolean;
  loginHref: string;
  actions: ThreadCommunityActionState;
};

export type ThreadCommunityPanelProps = {
  comments: PublicThreadComment[];
  reactions: ThreadReactionSummary | undefined;
  isAuthenticated: boolean;
  communityLoading: boolean;
  communityError: boolean;
  loginHref: string;
  actions: ThreadCommunityActionState;
};

export type ThreadPublicArticleProps = {
  publication: PublicThreadPublication;
  truncatedLabel: string;
  citationsLabel: string;
  publishedLabel: string;
  viewsLabel: string;
};

export type ThreadPublicPageViewProps = {
  state: ThreadPublicPageController;
};

export type ThreadPublicReportFormProps = {
  commentId: string;
  actions: ThreadCommunityActionState;
};

export type ThreadPublicQueries = {
  publication: UseQueryResult<PublicThreadPublication>;
  comments: UseQueryResult<PublicThreadComment[]>;
  reactions: UseQueryResult<ThreadReactionSummary>;
};

export type ThreadPublicMutation = UseMutationResult<
  ThreadReactionSummary | null,
  Error,
  ThreadPublicAction
>;

export type ThreadChangeRequestsProps = {
  publicationId: string;
  revisionSource: NonNullable<ThreadGenerationState['draft']> | null;
  onRevisionStarted: (revisionId: string) => void;
};

export type ThreadGenerationFormOptions = {
  /** Set when the form opens from a chat: the source chat is then not a choice. */
  fixedSourceThreadId?: string;
  defaultTopic?: string;
  onStarted: (publicationId: string) => void;
};

export type ThreadGenerationFormController = {
  threads: Array<{ id: string; title: string | null }>;
  isLoadingThreads: boolean;
  isLoadingModels: boolean;
  availableModels: ModelSelection[];
  fixedSourceThreadId: string | null;
  sourceThreadId: string;
  setSourceThreadId: (value: string) => void;
  topic: string;
  setTopic: (value: string) => void;
  publicationType: ThreadPublicationType;
  setPublicationType: (value: ThreadPublicationType) => void;
  contentLocale: Locale;
  setContentLocale: (value: Locale) => void;
  spendCapUsd: string;
  setSpendCapUsd: (value: string) => void;
  selectedModels: ModelSelection[];
  changeModel: (index: number, selected: ModelSelection) => void;
  hasAcknowledgedPublic: boolean;
  setHasAcknowledgedPublic: (value: boolean) => void;
  hasError: boolean;
  /** The plan or role does not include Thread generation (403). */
  isPlanBlocked: boolean;
  isStarting: boolean;
  submit: (event: FormEvent<HTMLFormElement>) => void;
};

export type ThreadPublicationDetailController = {
  publicationId: string;
  selectedPublication: OwnedThreadPublication | undefined;
  generation: UseQueryResult<ThreadGenerationState>;
  revisionReview: UseQueryResult<ThreadRevisionReviewState>;
  cancel: UseMutationResult<{ publicationId: string; status: string }, Error, void>;
  publish: UseMutationResult<void, Error, void>;
  editRevision: UseMutationResult<ThreadRevisionRequestResult, Error, void>;
  unpublish: UseMutationResult<void, Error, void>;
  buildExportFile: (format: ThreadPublicationExportFormat) => Promise<ThreadExportFile>;
  publicUrl: string | null;
  editingRevision: boolean;
  setEditingRevision: (value: boolean) => void;
  revisionMarkdown: string;
  revisionCapUsd: string;
  activeRevisionId: string;
  hasDraft: boolean;
  generationFailed: boolean;
  generationCancelled: boolean;
  publicationReady: boolean;
  revisionIsTerminal: boolean;
  revisionReviewMessage: string;
  startEditing: () => void;
  changeRevisionField: (field: ThreadRevisionField, value: string) => void;
  startRevisionFromChangeRequest: (revisionId: string) => void;
};

export type ThreadModelPickerProps = {
  id: string;
  label: string;
  value: ModelSelection;
  onChange: (selection: ModelSelection) => void;
};

export type ThreadCreateDialogBodyProps = {
  threadId?: string;
  threadTitle?: string;
  onClose: () => void;
};

export type ThreadCreateDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Set when opened from a chat; the list page leaves it out and the owner picks a chat. */
  threadId?: string;
  threadTitle?: string;
};
