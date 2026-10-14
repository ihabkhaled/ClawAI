import type { ThreadPublicationType } from '@claw/shared-types';
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query';
import type { FormEvent, RefObject } from 'react';

import type { Locale } from '@/enums/locale.enum';
import type { ThreadPublicationChangeRequestStatus } from '@/enums/thread-publication-change-request-status.enum';
import type { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import type { ThreadPublicationExportFormat } from '@/enums/thread-publication-export-format.enum';
import type { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type { ThreadPublicationReportReason } from '@/enums/thread-publication-report-reason.enum';
import type { ThreadPublicationStatus } from '@/enums/thread-publication-status.enum';
import type { ThreadRevisionField } from '@/enums/thread-revision-field.enum';
import type { ThreadSafetyFindingKind } from '@/enums/thread-safety-finding-kind.enum';
import type { ModelSelection } from '@/types/component.types';
import type {
  ThreadAuthor,
  ThreadCommentNode,
  ThreadCommentsFeed,
} from '@/types/thread-community.types';
import type { ThreadExportFile } from '@/types/thread-export.types';
import type { ThreadErrorMessage } from '@/types/thread-generation-progress.types';
import type { ThreadModelAvailabilityIndex } from '@/types/thread-recommended-team.types';
import type { ThreadRevisionRequest } from '@/utilities/thread-revision-request.utility';

export type OwnedThreadPublication = {
  id: string;
  status: ThreadPublicationStatus;
  title: string | null;
  slug: string;
  updatedAt: string;
};

/** What the sensitive-details scan flagged in the newest text (secrets and cards are masked). */
export type ThreadSafetyBlock = {
  reasons: string[];
  findings: Array<{ reason: string; kind: ThreadSafetyFindingKind; excerpt: string }>;
};

export type ThreadSafetyBlockNoticeProps = { block: ThreadSafetyBlock };

export type ThreadGenerationState = {
  publicationId: string;
  publicationStatus: string;
  /** Owner-state flags from the Threads API; older responses omit them. */
  canPublish?: boolean;
  canRepublish?: boolean;
  /** Set when the newest revision was blocked by the scan; absent from older responses. */
  safetyBlock?: ThreadSafetyBlock | null;
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
  /** Who published it; null for a Thread published before names were shown. */
  owner?: ThreadAuthor | null;
};

export type PublicThreadComment = ThreadCommentNode;

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
  highlightedCommentId: string | null;
  hasMoreComments: boolean;
  isLoadingMoreComments: boolean;
  loadMoreComments: () => void;
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
  slug: string;
  comments: PublicThreadComment[];
  highlightedCommentId: string | null;
  hasMoreComments: boolean;
  isLoadingMoreComments: boolean;
  loadMoreComments: () => void;
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
  comments: ThreadCommentsFeed;
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
  isTopicLongEnough: boolean;
  isTopicTooShort: boolean;
  publicationType: ThreadPublicationType;
  setPublicationType: (value: ThreadPublicationType) => void;
  contentLocale: Locale;
  setContentLocale: (value: Locale) => void;
  spendCapUsd: string;
  setSpendCapUsd: (value: string) => void;
  selectedModels: ModelSelection[];
  changeModel: (index: number, selected: ModelSelection) => void;
  /** What the service says about each model for this account (empty when it could not be read). */
  modelAvailability: ThreadModelAvailabilityIndex;
  /** The caller's plan name, for the "not on your plan" sentence; empty when unknown. */
  planName: string;
  hasRecommendedTeam: boolean;
  /** True while all five seats are the recommended team. */
  isRecommendedSelected: boolean;
  resetToRecommended: () => void;
  hasAcknowledgedPublic: boolean;
  setHasAcknowledgedPublic: (value: boolean) => void;
  /** The request could not even be built (client-side validation). */
  hasError: boolean;
  /** What the service said when the start failed, other than a plan block. */
  startError: ThreadErrorMessage | null;
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
  /** Models that cannot work for this account are marked with their reason and cannot be chosen. */
  availability?: ThreadModelAvailabilityIndex;
  planName?: string;
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

/** The banner shown after Publish: where the Thread now lives. */
export type ThreadLiveBannerProps = {
  url: string;
};

/** The draft a reader suggestion would revise, or null while it is unavailable. */
export type ThreadChangesRevisionSource = ThreadChangeRequestsProps['revisionSource'];

/** The owner's answer to one reader suggestion. */
export type ThreadChangeRequestDecision = {
  requestId: string;
  status:
    ThreadPublicationChangeRequestStatus.Accepted | ThreadPublicationChangeRequestStatus.Rejected;
  ownerResponse: string;
};

/** What the owner has typed so far while answering reader suggestions. */
export type ThreadChangeRequestForm = {
  acceptingRequestId: string;
  revisionMarkdown: string;
  spendCapUsd: string;
  ownerResponses: Record<string, string>;
  /** The revised article differs from the draft it started from. */
  revisionChanged: boolean;
  setRevisionMarkdown: (value: string) => void;
  setSpendCapUsd: (value: string) => void;
  setOwnerResponse: (requestId: string, value: string) => void;
  beginAcceptance: (requestId: string) => void;
  cancelAcceptance: () => void;
  /** Clears what belongs to a request once it has been answered. */
  finishRequest: (requestId: string) => void;
};

export type ThreadChangeRequestsController = {
  requests: UseQueryResult<ThreadPublicationChangeRequest[]>;
  resolve: UseMutationResult<
    ThreadPublicationChangeRequestResolution,
    Error,
    ThreadChangeRequestDecision
  >;
  form: ThreadChangeRequestForm;
  beginAcceptance: (requestId: string) => void;
  cancelAcceptance: () => void;
};

/** What the decision mutation needs besides the decision itself. */
export type ThreadChangeRequestResolveInput = {
  publicationId: string;
  revisionSource: ThreadChangesRevisionSource;
  form: ThreadChangeRequestForm;
  onRevisionStarted: (revisionId: string) => void;
};

export type ThreadCommentValidation = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  isEmpty: boolean;
  handleSubmit: () => void;
  handleChange: (value: string) => void;
};
